import { eq, sql } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { getDb } from '@/shared/db/client'
import { groupInvites } from '@/shared/db/schema'

import type {
  ConsumeInviteInput,
  InviteLookup,
  InviteRepository,
  InviteSummary,
  NewInvite,
} from '../application/invite-repository'

async function create(input: NewInvite): Promise<InviteSummary> {
  const db = getDb()
  const id = uuidv7()

  await db.insert(groupInvites).values({
    id,
    groupId: input.groupId,
    tokenHash: input.tokenHash,
    expiresAt: input.expiresAt,
  })

  return { id, expiresAt: input.expiresAt }
}

async function findByTokenHash(tokenHash: string): Promise<InviteLookup | null> {
  const db = getDb()
  const rows = await db
    .select({
      id: groupInvites.id,
      groupId: groupInvites.groupId,
      expiresAt: groupInvites.expiresAt,
      usedAt: groupInvites.usedAt,
    })
    .from(groupInvites)
    .where(eq(groupInvites.tokenHash, tokenHash))
    .limit(1)

  return rows[0] ?? null
}

/**
 * TẠI SAO một câu SQL thô (CTE) thay vì `db.batch([...])` như group/dish:
 * batch của neon-http là "non-interactive" — không đọc được kết quả câu
 * trước để quyết định câu sau trong cùng một lượt gọi. Nhưng ở đây câu ghi
 * THỨ HAI (insert membership) phải phụ thuộc vào việc câu ghi ĐẦU (đánh dấu
 * token đã dùng) có thực sự đổi được hàng nào không — nếu một request khác
 * đã dùng token này 1ms trước, KHÔNG được tạo membership.
 *
 * Một câu SQL với CTE (`WITH ... UPDATE ... RETURNING ... INSERT ... SELECT
 * FROM cte`) giải quyết gọn: Postgres chạy CTE atomic trong nội bộ MỘT
 * statement — không cần `db.transaction()` (driver neon-http không hỗ trợ,
 * ném lỗi), không cần driver WebSocket. Nếu UPDATE không đổi hàng nào (do
 * `used_at IS NOT NULL` — đã bị dùng), CTE `consumed` rỗng, INSERT...SELECT
 * FROM rỗng không chạy, `rows.length === 0` ở kết quả cuối.
 *
 * Đây là lần đầu dự án dùng `db.execute(sql\`...\`)` — xem DEC-027.
 */
async function consumeAndAddMember(
  input: ConsumeInviteInput,
): Promise<{ readonly consumed: boolean }> {
  const db = getDb()
  const memberId = uuidv7()

  const result = await db.execute<{ id: string }>(sql`
    WITH consumed AS (
      UPDATE group_invites
      SET used_at = now(), used_by_user_id = ${input.userId}
      WHERE id = ${input.inviteId} AND used_at IS NULL
      RETURNING id
    )
    INSERT INTO group_members (id, group_id, user_id, is_admin)
    SELECT ${memberId}, ${input.groupId}, ${input.userId}, false
    FROM consumed
    RETURNING id
  `)

  return { consumed: result.rows.length > 0 }
}

export const drizzleInviteRepository: InviteRepository = {
  create,
  findByTokenHash,
  consumeAndAddMember,
}
