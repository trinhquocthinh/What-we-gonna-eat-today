import { and, eq, inArray } from 'drizzle-orm'
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
  sessionDecks,
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
  await db.delete(sessionDecks).where(eq(sessionDecks.sessionId, seed.sessionId))
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
        clientTimestamp: new Date(),
      },
    )
    const second = await recordInteraction(
      { selection: drizzleSelectionRepository },
      {
        sessionId: seed.sessionId,
        userId: seed.userId,
        groupDishId: seed.groupDishId,
        action: 'SWIPE_RIGHT',
        clientTimestamp: new Date(),
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

  it('TC-106 — bản đến sau có clientTimestamp CŨ hơn bị bỏ qua, giữ bản mới hơn', async () => {
    const seed = await seedActiveSessionWithDish()
    cleanupQueue.push(() => cleanup(seed))

    const newer = new Date('2026-08-19T10:00:05Z')
    const older = new Date('2026-08-19T10:00:00Z')

    // Request "mới hơn" tới server TRƯỚC (giả lập network jitter: request có
    // clientTimestamp SỚM hơn lại ĐẾN sau — đây chính là kịch bản TC-106).
    const first = await drizzleSelectionRepository.applyInteraction({
      sessionId: seed.sessionId,
      participantId: seed.participantId,
      groupDishId: seed.groupDishId,
      action: 'SWIPE_RIGHT',
      clientTimestamp: newer,
    })
    const second = await drizzleSelectionRepository.applyInteraction({
      sessionId: seed.sessionId,
      participantId: seed.participantId,
      groupDishId: seed.groupDishId,
      action: 'SWIPE_LEFT',
      clientTimestamp: older, // ĐẾN SAU nhưng Ý ĐỊNH cũ hơn
    })

    expect(first).toBe('SWIPE_RIGHT')
    expect(second).toBe('SWIPE_RIGHT') // ← KHÔNG phải 'SWIPE_LEFT' — bản cũ bị bỏ qua

    const db = getDb()
    const rows = await db
      .select()
      .from(interactions)
      .where(eq(interactions.groupDishId, seed.groupDishId))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.type).toBe('SWIPE_RIGHT') // DB thật giữ đúng bản mới hơn

    const events = await db
      .select()
      .from(interactionEvents)
      .where(eq(interactionEvents.groupDishId, seed.groupDishId))
    expect(events).toHaveLength(2) // cả hai request đều để lại vết audit, kể cả bản bị từ chối
  })

  it('request bình thường (không đụng độ): vẫn ghi và trả đúng type, không round-trip thừa', async () => {
    const seed = await seedActiveSessionWithDish()
    cleanupQueue.push(() => cleanup(seed))

    const result = await drizzleSelectionRepository.applyInteraction({
      sessionId: seed.sessionId,
      participantId: seed.participantId,
      groupDishId: seed.groupDishId,
      action: 'SWIPE_RIGHT',
      clientTimestamp: new Date(),
    })

    expect(result).toBe('SWIPE_RIGHT')
  })
})

describe('sessionDecks — materializeDeck / findMaterializedDeck (TC-041)', () => {
  it('TC-041 — materializeDeck rồi findMaterializedDeck: đọc lại đúng thứ tự đã lưu', async () => {
    const seed = await seedActiveSessionWithDish()
    cleanupQueue.push(() => cleanup(seed))

    const outcome = await drizzleSelectionRepository.materializeDeck(seed.sessionId, seed.userId, [
      'd3',
      'd1',
      'd2',
    ])
    expect(outcome.outcome).toBe('MATERIALIZED')

    const read = await drizzleSelectionRepository.findMaterializedDeck(seed.sessionId, seed.userId)
    expect(read).toEqual(['d3', 'd1', 'd2']) // đúng thứ tự đã ghi, không sắp lại
  })

  it('materialize hai lần cho cùng (session, user): lần hai ALREADY_MATERIALIZED, dữ liệu KHÔNG đổi', async () => {
    const seed = await seedActiveSessionWithDish()
    cleanupQueue.push(() => cleanup(seed))

    await drizzleSelectionRepository.materializeDeck(seed.sessionId, seed.userId, ['d1'])
    const second = await drizzleSelectionRepository.materializeDeck(seed.sessionId, seed.userId, [
      'd2',
    ])

    expect(second.outcome).toBe('ALREADY_MATERIALIZED')
    expect(
      await drizzleSelectionRepository.findMaterializedDeck(seed.sessionId, seed.userId),
    ).toEqual(['d1'])
  })

  it('findMaterializedDeck: chưa materialize trả null, KHÁC mảng rỗng', async () => {
    const seed = await seedActiveSessionWithDish()
    cleanupQueue.push(() => cleanup(seed))

    expect(
      await drizzleSelectionRepository.findMaterializedDeck(seed.sessionId, crypto.randomUUID()),
    ).toBeNull()
  })

  it('materialize mảng rỗng (TC-102, Group 0 món): đọc lại ra [] chứ không phải null', async () => {
    const seed = await seedActiveSessionWithDish()
    cleanupQueue.push(() => cleanup(seed))

    await drizzleSelectionRepository.materializeDeck(seed.sessionId, seed.userId, [])
    expect(
      await drizzleSelectionRepository.findMaterializedDeck(seed.sessionId, seed.userId),
    ).toEqual([])
  })
})

describe('SPEC-014 — ranking methods (integration)', () => {
  it('findSessionForRanking: session ACTIVE trả đúng creatorUserId và decisionDate, session khác ACTIVE trả null', async () => {
    const seed = await seedActiveSessionWithDish()
    cleanupQueue.push(() => cleanup(seed))

    const active = await drizzleSelectionRepository.findSessionForRanking(seed.sessionId)
    expect(active).toEqual({ creatorUserId: seed.userId, decisionDate: '2026-08-17' })

    const notFound = await drizzleSelectionRepository.findSessionForRanking(crypto.randomUUID())
    expect(notFound).toBeNull()

    await getDb()
      .update(selectionSessions)
      .set({ state: 'FINALIZED' })
      .where(eq(selectionSessions.id, seed.sessionId))

    const finalized = await drizzleSelectionRepository.findSessionForRanking(seed.sessionId)
    expect(finalized).toBeNull()
  })

  it('countInteractionsByDish: đếm đúng SWIPE_RIGHT, SWIPE_LEFT, giữ món 0 tương tác, bỏ qua participant REMOVED', async () => {
    const seed = await seedActiveSessionWithDish()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    // Thêm món thứ 2 (chưa ai tương tác)
    const globalDish2Id = crypto.randomUUID()
    const groupDish2Id = crypto.randomUUID()
    await db.insert(globalDishes).values({
      id: globalDish2Id,
      name: 'Món 2 (untouched)',
      normalizedName: 'món 2',
      createdByUserId: seed.userId,
      createdFromGroupId: seed.groupId,
    })
    await db.insert(groupDishes).values({
      id: groupDish2Id,
      groupId: seed.groupId,
      globalDishId: globalDish2Id,
      state: 'ACTIVE',
    })

    // Thêm participant 2 (REMOVED)
    const user2Id = crypto.randomUUID()
    const participant2Id = crypto.randomUUID()
    await db.insert(users).values({
      id: user2Id,
      provider: 'test',
      providerSubject: `u2-${user2Id}`,
      email: `${user2Id}@test.local`,
      displayName: 'User 2',
    })
    await db.insert(participants).values({
      id: participant2Id,
      sessionId: seed.sessionId,
      userId: user2Id,
      state: 'REMOVED',
    })

    // Participant 1 (ACTIVE) vuốt phải món 1
    await db.insert(interactions).values({
      id: crypto.randomUUID(),
      sessionId: seed.sessionId,
      participantId: seed.participantId,
      groupDishId: seed.groupDishId,
      type: 'SWIPE_RIGHT',
    })

    // Participant 2 (REMOVED) vuốt phải món 1 (không được tính)
    await db.insert(interactions).values({
      id: crypto.randomUUID(),
      sessionId: seed.sessionId,
      participantId: participant2Id,
      groupDishId: seed.groupDishId,
      type: 'SWIPE_RIGHT',
    })

    const counts = await drizzleSelectionRepository.countInteractionsByDish(seed.sessionId)

    expect(counts).toHaveLength(2)

    const dish1Count = counts.find((c) => c.groupDishId === seed.groupDishId)
    expect(dish1Count).toBeDefined()
    expect(typeof dish1Count?.proposedCount).toBe('number')
    expect(dish1Count?.proposedCount).toBe(1) // chỉ tính participant ACTIVE, bỏ qua REMOVED
    expect(dish1Count?.rejectedCount).toBe(0)

    const dish2Count = counts.find((c) => c.groupDishId === groupDish2Id)
    expect(dish2Count).toBeDefined()
    expect(dish2Count?.proposedCount).toBe(0)
    expect(dish2Count?.rejectedCount).toBe(0)

    // Cleanup extra records
    await db.delete(interactions).where(eq(interactions.sessionId, seed.sessionId))
    await db.delete(groupDishes).where(eq(groupDishes.id, groupDish2Id))
    await db.delete(globalDishes).where(eq(globalDishes.id, globalDish2Id))
    await db.delete(participants).where(eq(participants.id, participant2Id))
    await db.delete(users).where(eq(users.id, user2Id))
  })

  it('listRankingParticipantUserIds: trả danh sách ACTIVE và COMPLETED, bỏ REMOVED', async () => {
    const seed = await seedActiveSessionWithDish()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    const user2Id = crypto.randomUUID()
    const participant2Id = crypto.randomUUID()
    const user3Id = crypto.randomUUID()
    const participant3Id = crypto.randomUUID()

    await db.insert(users).values([
      {
        id: user2Id,
        provider: 'test',
        providerSubject: `u2-${user2Id}`,
        email: `${user2Id}@test.local`,
        displayName: 'Completed User',
      },
      {
        id: user3Id,
        provider: 'test',
        providerSubject: `u3-${user3Id}`,
        email: `${user3Id}@test.local`,
        displayName: 'Removed User',
      },
    ])
    await db.insert(participants).values([
      { id: participant2Id, sessionId: seed.sessionId, userId: user2Id, state: 'COMPLETED' },
      { id: participant3Id, sessionId: seed.sessionId, userId: user3Id, state: 'REMOVED' },
    ])

    const userIds = await drizzleSelectionRepository.listRankingParticipantUserIds(seed.sessionId)

    expect(userIds).toContain(seed.userId)
    expect(userIds).toContain(user2Id)
    expect(userIds).not.toContain(user3Id)
    expect(userIds).toHaveLength(2)

    await db.delete(participants).where(eq(participants.sessionId, seed.sessionId))
    await db.delete(users).where(inArray(users.id, [user2Id, user3Id]))
  })
})
