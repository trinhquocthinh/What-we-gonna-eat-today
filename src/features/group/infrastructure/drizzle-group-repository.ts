import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { getDb } from '@/shared/db/client'
import { groupMembers, groups } from '@/shared/db/schema'

import type {
  GroupListItem,
  GroupRepository,
  GroupSummary,
  NewGroupWithAdmin,
} from '../application/group-repository'
import type { MembershipRepository } from '../application/membership-repository'
import type { Membership } from '../domain/membership'

/**
 * `db.batch([...])` của driver neon-http LÀ một transaction Postgres thật —
 * `neon-http/session.js` gọi `client.transaction(builtQueries)` và Neon gửi kèm
 * header `Neon-Batch-Isolation-Level`. (Còn `db.transaction()` thì ném
 * "No transactions support in neon-http driver".)
 *
 * Batch là non-interactive: không đọc được id ở giữa. Vì vậy `groupId` sinh
 * tường minh ở đây thay vì dựa vào `$defaultFn` của schema.
 *
 * Kiểu của `batch` là tuple `Readonly<[U, ...U[]]>` — truyền literal array,
 * đừng build bằng `.map()`.
 */
async function createWithAdmin(input: NewGroupWithAdmin): Promise<GroupSummary> {
  const db = getDb()
  const groupId = uuidv7()

  await db.batch([
    db.insert(groups).values({ id: groupId, name: input.name, timezone: input.timezone }),
    db.insert(groupMembers).values({ groupId, userId: input.creatorUserId, isAdmin: true }),
  ])

  return { id: groupId, name: input.name, timezone: input.timezone }
}

async function listForUser(userId: string): Promise<GroupListItem[]> {
  const db = getDb()

  // `removed_at IS NULL` ở đây là câu hỏi "lấy dòng nào", không phải quyết định
  // phân quyền — phân quyền nằm ở `isActiveMembership`. Hai chỗ phải khớp nhau.
  const rows = await db
    .select({ id: groups.id, name: groups.name, timezone: groups.timezone })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(and(eq(groupMembers.userId, userId), isNull(groupMembers.removedAt)))
    .orderBy(desc(groupMembers.joinedAt))

  if (rows.length === 0) {
    return []
  }

  const counts = await db
    .select({ groupId: groupMembers.groupId, memberCount: count() })
    .from(groupMembers)
    .where(
      and(
        inArray(
          groupMembers.groupId,
          rows.map((row) => row.id),
        ),
        isNull(groupMembers.removedAt),
      ),
    )
    .groupBy(groupMembers.groupId)

  const countByGroupId = new Map(counts.map((row) => [row.groupId, row.memberCount]))

  return rows.map((row) => ({ ...row, memberCount: countByGroupId.get(row.id) ?? 0 }))
}

async function findById(groupId: string): Promise<GroupSummary | null> {
  const rows = await getDb()
    .select({ id: groups.id, name: groups.name, timezone: groups.timezone })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1)

  return rows[0] ?? null
}

/** KHÔNG lọc `removed_at`: guard cần phân biệt "chưa từng là member" với
 *  "đã bị gỡ" — xem `domain/membership.ts`. */
async function findMembership(groupId: string, userId: string): Promise<Membership | null> {
  const rows = await getDb()
    .select({ isAdmin: groupMembers.isAdmin, removedAt: groupMembers.removedAt })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1)

  return rows[0] ?? null
}

export const drizzleGroupRepository: GroupRepository = {
  createWithAdmin,
  listForUser,
  findById,
}

export const drizzleMembershipRepository: MembershipRepository = {
  findMembership,
}
