import { and, eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { getDb } from '@/shared/db/client'
import {
  globalDishes,
  groupDishes,
  groupMembers,
  groups,
  interactionEvents,
  interactions,
  participants,
  selectionSessions,
  users,
} from '@/shared/db/schema'

import { recordInteraction } from '../application/record-interaction'
import { drizzleSelectionRepository } from './drizzle-selection-repository'

/** Seed tối thiểu: User + Group + Session ACTIVE + Participant + một Dish Active. */
async function seedActiveSessionWithDish() {
  const db = getDb()
  const userId = crypto.randomUUID()
  const groupId = crypto.randomUUID()
  const sessionId = crypto.randomUUID()
  const participantId = crypto.randomUUID()
  const globalDishId = crypto.randomUUID()
  const groupDishId = crypto.randomUUID()

  await db.insert(users).values({
    id: userId,
    provider: 'test',
    providerSubject: `integration-${userId}`,
    email: `${userId}@example.test`,
    displayName: 'Integration Test User',
  })
  await db.insert(groups).values({ id: groupId, name: 'Integration Test Group', timezone: 'UTC' })
  await db.insert(groupMembers).values({ groupId, userId, isAdmin: true })
  await db.insert(selectionSessions).values({
    id: sessionId,
    groupId,
    decisionDate: '2026-08-17',
    creatorUserId: userId,
    state: 'ACTIVE',
  })
  await db.insert(participants).values({ id: participantId, sessionId, userId, state: 'ACTIVE' })
  await db.insert(globalDishes).values({
    id: globalDishId,
    name: 'Món tích hợp',
    normalizedName: 'món tích hợp',
    createdByUserId: userId,
    createdFromGroupId: groupId,
  })
  await db.insert(groupDishes).values({ id: groupDishId, groupId, globalDishId, state: 'ACTIVE' })

  return { userId, groupId, sessionId, participantId, globalDishId, groupDishId }
}

async function cleanup(seed: Awaited<ReturnType<typeof seedActiveSessionWithDish>>) {
  const db = getDb()
  await db.delete(interactionEvents).where(eq(interactionEvents.sessionId, seed.sessionId))
  await db.delete(interactions).where(eq(interactions.sessionId, seed.sessionId))
  await db.delete(groupDishes).where(eq(groupDishes.id, seed.groupDishId))
  await db.delete(globalDishes).where(eq(globalDishes.id, seed.globalDishId))
  await db.delete(participants).where(eq(participants.sessionId, seed.sessionId))
  await db.delete(selectionSessions).where(eq(selectionSessions.id, seed.sessionId))
  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, seed.groupId), eq(groupMembers.userId, seed.userId)))
  await db.delete(groups).where(eq(groups.id, seed.groupId))
  await db.delete(users).where(eq(users.id, seed.userId))
}

const cleanupQueue: Array<() => Promise<void>> = []

afterEach(async () => {
  while (cleanupQueue.length > 0) {
    const fn = cleanupQueue.pop()
    if (fn !== undefined) await fn()
  }
})

describe('SPEC-012 — idempotent thật (TC-053)', () => {
  it('TC-053: SWIPE_RIGHT gửi hai lần liên tiếp thì effective vẫn SWIPE_RIGHT', async () => {
    const seed = await seedActiveSessionWithDish()
    cleanupQueue.push(() => cleanup(seed))

    const first = await recordInteraction(
      { selection: drizzleSelectionRepository },
      {
        sessionId: seed.sessionId,
        userId: seed.userId,
        groupDishId: seed.groupDishId,
        action: 'SWIPE_RIGHT',
      },
    )
    const second = await recordInteraction(
      { selection: drizzleSelectionRepository },
      {
        sessionId: seed.sessionId,
        userId: seed.userId,
        groupDishId: seed.groupDishId,
        action: 'SWIPE_RIGHT',
      },
    )

    expect(first.ok && first.value.effectiveInteraction).toBe('SWIPE_RIGHT')
    expect(second.ok && second.value.effectiveInteraction).toBe('SWIPE_RIGHT')

    // Đúng MỘT dòng effective — upsert không tạo bản trùng (unique constraint
    // session_id+participant_id+group_dish_id).
    const rows = await getDb()
      .select()
      .from(interactions)
      .where(eq(interactions.sessionId, seed.sessionId))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.type).toBe('SWIPE_RIGHT')
  })
})
