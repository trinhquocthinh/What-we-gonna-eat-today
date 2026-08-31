import { and, eq, inArray, sql } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { getDb } from '@/shared/db/client'
import {
  groupDishes,
  interactionEvents,
  interactions,
  participants,
  selectionSessions,
  userDishConstraints,
  userDishPreferences,
} from '@/shared/db/schema'

import type { PreferenceRepository } from '../application/preference-repository'
import type { PreferenceKind } from '../domain/explicit-preference'

/**
 * Tìm lượt vuốt đang sống của user này với món này, nếu có. `null` khi user
 * không ở trong phiên ACTIVE nào, hoặc nhóm không có món này, hoặc có mà
 * chưa vuốt — cả ba đều là trạng thái bình thường, không phải lỗi.
 *
 * Lưu ý v1.0: một User thuộc đúng một Group (DEC-004) và một Group có tối đa
 * một phiên ACTIVE mỗi ngày (BR-025), nên kết quả tối đa một dòng. Khi F43
 * multi-group vào, hàm này cần trả mảng hoặc xử lý nhiều nhóm.
 */
async function findActiveSwipeForGlobalDish(input: {
  userId: string
  globalDishId: string
}): Promise<{ sessionId: string; participantId: string; groupDishId: string } | null> {
  const db = getDb()
  const rows = await db
    .select({
      sessionId: selectionSessions.id,
      participantId: participants.id,
      groupDishId: groupDishes.id,
    })
    .from(participants)
    .innerJoin(
      selectionSessions,
      and(eq(selectionSessions.id, participants.sessionId), eq(selectionSessions.state, 'ACTIVE')),
    )
    .innerJoin(
      groupDishes,
      and(
        eq(groupDishes.groupId, selectionSessions.groupId),
        eq(groupDishes.globalDishId, input.globalDishId),
        eq(groupDishes.state, 'ACTIVE'),
      ),
    )
    .innerJoin(
      interactions,
      and(
        eq(interactions.sessionId, selectionSessions.id),
        eq(interactions.participantId, participants.id),
        eq(interactions.groupDishId, groupDishes.id),
      ),
    )
    .where(and(eq(participants.userId, input.userId), sql`${participants.state} <> 'REMOVED'`))
    .limit(1)

  return rows[0] ?? null
}

async function setConstraint(input: {
  userId: string
  globalDishId: string
  cannotEat: boolean
}): Promise<{ removedInteraction: boolean }> {
  const db = getDb()

  if (input.cannotEat) {
    const swipe = await findActiveSwipeForGlobalDish({
      userId: input.userId,
      globalDishId: input.globalDishId,
    })

    if (swipe !== null) {
      await db.batch([
        db
          .insert(userDishConstraints)
          .values({ userId: input.userId, globalDishId: input.globalDishId })
          .onConflictDoNothing(),
        db
          .delete(interactions)
          .where(
            and(
              eq(interactions.sessionId, swipe.sessionId),
              eq(interactions.participantId, swipe.participantId),
              eq(interactions.groupDishId, swipe.groupDishId),
            ),
          ),
        db.insert(interactionEvents).values({
          id: uuidv7(),
          sessionId: swipe.sessionId,
          participantId: swipe.participantId,
          groupDishId: swipe.groupDishId,
          action: 'CANNOT_EAT', // §1.5 — KHÔNG phải 'UNDO'
        }),
      ])
    } else {
      await db
        .insert(userDishConstraints)
        .values({ userId: input.userId, globalDishId: input.globalDishId })
        .onConflictDoNothing()
    }

    return { removedInteraction: swipe !== null }
  }

  // cannotEat === false (DEC-060, TC-115)
  await db
    .delete(userDishConstraints)
    .where(
      and(
        eq(userDishConstraints.userId, input.userId),
        eq(userDishConstraints.globalDishId, input.globalDishId),
      ),
    )

  return { removedInteraction: false }
}

async function setPreference(input: {
  userId: string
  globalDishId: string
  kind: PreferenceKind | null
}): Promise<void> {
  const db = getDb()

  if (input.kind === null) {
    // BR-037, TC-120: Neutral = không có dòng trong DB
    await db
      .delete(userDishPreferences)
      .where(
        and(
          eq(userDishPreferences.userId, input.userId),
          eq(userDishPreferences.globalDishId, input.globalDishId),
        ),
      )
    return
  }

  await db
    .insert(userDishPreferences)
    .values({
      userId: input.userId,
      globalDishId: input.globalDishId,
      kind: input.kind,
    })
    .onConflictDoUpdate({
      target: [userDishPreferences.userId, userDishPreferences.globalDishId],
      set: {
        kind: input.kind,
        updatedAt: sql`now()`,
      },
    })
}

async function findConstrainedGlobalDishIds(userId: string): Promise<ReadonlySet<string>> {
  const rows = await getDb()
    .select({ globalDishId: userDishConstraints.globalDishId })
    .from(userDishConstraints)
    .where(eq(userDishConstraints.userId, userId))

  return new Set(rows.map((row) => row.globalDishId))
}

async function findPreferencesByGlobalDish(
  userId: string,
  globalDishIds: readonly string[],
): Promise<Map<string, PreferenceKind>> {
  if (globalDishIds.length === 0) {
    return new Map()
  }

  const rows = await getDb()
    .select({
      globalDishId: userDishPreferences.globalDishId,
      kind: userDishPreferences.kind,
    })
    .from(userDishPreferences)
    .where(
      and(
        eq(userDishPreferences.userId, userId),
        inArray(userDishPreferences.globalDishId, [...globalDishIds]),
      ),
    )

  const map = new Map<string, PreferenceKind>()
  for (const row of rows) {
    map.set(row.globalDishId, row.kind)
  }
  return map
}

export const drizzlePreferenceRepository: PreferenceRepository = {
  setConstraint,
  setPreference,
  findConstrainedGlobalDishIds,
  findPreferencesByGlobalDish,
}
