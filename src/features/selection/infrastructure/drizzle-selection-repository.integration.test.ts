import { and, eq, inArray } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { getDb } from '@/shared/db/client'
import {
  globalDishes,
  groupDishes,
  groupDishTags,
  groupMembers,
  groups,
  interactionEvents,
  interactions,
  participants,
  selectionSessions,
  sessionDecks,
  userDishConstraints,
  userPreferenceSettings,
  users,
} from '@/shared/db/schema'

import { drizzleHistoryRepository } from '@/features/history/infrastructure/drizzle-history-repository'
import { drizzlePreferenceRepository } from '@/features/preference/infrastructure/drizzle-preference-repository'
import { listDeck } from '../application/list-deck'
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
  await db.delete(userDishConstraints).where(eq(userDishConstraints.userId, seed.userId))
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
    expect(Array.isArray(dish1Count?.systemTags)).toBe(true)

    const dish2Count = counts.find((c) => c.groupDishId === groupDish2Id)
    expect(dish2Count).toBeDefined()
    expect(dish2Count?.proposedCount).toBe(0)
    expect(dish2Count?.rejectedCount).toBe(0)
    expect(Array.isArray(dish2Count?.systemTags)).toBe(true)

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

describe('listEligibleDishCards — SPEC-024 (TC-113, TC-116)', () => {
  it('TC-113: Đánh dấu Cannot Eat một món → món biến khỏi deck ở lần dựng kế tiếp', async () => {
    const seed = await seedActiveSessionWithDish()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    // Chưa đặt Cannot Eat: món có trong listEligibleDishCards
    const before = await drizzleSelectionRepository.listEligibleDishCards(
      seed.sessionId,
      seed.participantId,
      seed.userId,
    )
    expect(before.some((d) => d.dishId === seed.groupDishId)).toBe(true)

    // Đặt Cannot Eat cho user
    await db.insert(userDishConstraints).values({
      userId: seed.userId,
      globalDishId: seed.globalDishId,
    })

    // Sau khi đặt Cannot Eat: món bị loại khỏi listEligibleDishCards của user này
    const after = await drizzleSelectionRepository.listEligibleDishCards(
      seed.sessionId,
      seed.participantId,
      seed.userId,
    )
    expect(after.some((d) => d.dishId === seed.groupDishId)).toBe(false)
  })

  it('TC-116: Cùng món ở hai Group khác nhau → Ràng buộc áp cho cả hai (gắn theo global_dishes.id)', async () => {
    const seed = await seedActiveSessionWithDish()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    // Tạo Group 2 và Session 2 cho cùng user và cùng globalDish
    const groupId2 = crypto.randomUUID()
    const sessionId2 = crypto.randomUUID()
    const participantIdGroup2 = crypto.randomUUID()
    const groupDishId2 = crypto.randomUUID()

    await db.insert(groups).values({ id: groupId2, name: 'Group 2', timezone: 'UTC' })
    await db.insert(groupMembers).values({ groupId: groupId2, userId: seed.userId, isAdmin: true })
    await db.insert(selectionSessions).values({
      id: sessionId2,
      groupId: groupId2,
      decisionDate: '2026-08-17',
      creatorUserId: seed.userId,
      state: 'ACTIVE',
    })
    await db.insert(participants).values({
      id: participantIdGroup2,
      sessionId: sessionId2,
      userId: seed.userId,
      state: 'ACTIVE',
    })
    await db.insert(groupDishes).values({
      id: groupDishId2,
      groupId: groupId2,
      globalDishId: seed.globalDishId,
      state: 'ACTIVE',
    })

    // Đặt Cannot Eat cho globalDish
    await db.insert(userDishConstraints).values({
      userId: seed.userId,
      globalDishId: seed.globalDishId,
    })

    // Khẳng định cả hai session đều loại món này khỏi deck
    const deck1 = await drizzleSelectionRepository.listEligibleDishCards(
      seed.sessionId,
      seed.participantId,
      seed.userId,
    )
    const deck2 = await drizzleSelectionRepository.listEligibleDishCards(
      sessionId2,
      participantIdGroup2,
      seed.userId,
    )

    expect(deck1.some((d) => d.dishId === seed.groupDishId)).toBe(false)
    expect(deck2.some((d) => d.dishId === groupDishId2)).toBe(false)

    // Dọn dữ liệu Group 2
    await db.delete(groupDishes).where(eq(groupDishes.id, groupDishId2))
    await db.delete(participants).where(eq(participants.sessionId, sessionId2))
    await db.delete(selectionSessions).where(eq(selectionSessions.id, sessionId2))
    await db.delete(groupMembers).where(eq(groupMembers.groupId, groupId2))
    await db.delete(groups).where(eq(groups.id, groupId2))
  })
})

async function seedActiveSessionWithMultipleDishes(count: number) {
  const db = getDb()
  const userId = crypto.randomUUID()
  const groupId = crypto.randomUUID()
  const sessionId = crypto.randomUUID()
  const participantId = crypto.randomUUID()
  const dishIds: { globalDishId: string; groupDishId: string }[] = []

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

  for (let i = 0; i < count; i += 1) {
    const globalDishId = crypto.randomUUID()
    const groupDishId = crypto.randomUUID()
    await db.insert(globalDishes).values({
      id: globalDishId,
      name: `Món tích hợp ${i}`,
      normalizedName: `mon tich hop ${i}`,
      createdByUserId: userId,
      createdFromGroupId: groupId,
    })
    await db.insert(groupDishes).values({ id: groupDishId, groupId, globalDishId, state: 'ACTIVE' })
    dishIds.push({ globalDishId, groupDishId })
  }

  return { userId, groupId, sessionId, participantId, dishIds }
}

async function cleanupMultiple(
  seed: Awaited<ReturnType<typeof seedActiveSessionWithMultipleDishes>>,
) {
  const db = getDb()
  await db.delete(sessionDecks).where(eq(sessionDecks.sessionId, seed.sessionId))
  for (const dish of seed.dishIds) {
    await db.delete(groupDishes).where(eq(groupDishes.id, dish.groupDishId))
    await db.delete(globalDishes).where(eq(globalDishes.id, dish.globalDishId))
  }
  await db.delete(participants).where(eq(participants.sessionId, seed.sessionId))
  await db.delete(selectionSessions).where(eq(selectionSessions.id, seed.sessionId))
  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, seed.groupId), eq(groupMembers.userId, seed.userId)))
  await db.delete(groups).where(eq(groups.id, seed.groupId))
  await db.delete(users).where(eq(users.id, seed.userId))
}

describe('E8-T4 — Ghim bất biến đóng băng deck (TC-129, TC-130)', () => {
  it('TC-129: Gọi listDeck hai lần liên tiếp -> Thứ tự giống hệt; session_decks có đúng một dòng', async () => {
    const seed = await seedActiveSessionWithMultipleDishes(5)
    cleanupQueue.push(() => cleanupMultiple(seed))

    const deps = {
      selection: drizzleSelectionRepository,
      history: drizzleHistoryRepository,
      preferences: drizzlePreferenceRepository,
    }

    const input = {
      sessionId: seed.sessionId,
      userId: seed.userId,
      cursor: 0,
      pageSize: 20,
      referenceDate: '2026-08-17',
    }

    const first = await listDeck(deps, input)
    const second = await listDeck(deps, input)

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (!first.ok || !second.ok) throw new Error('unreachable')

    expect(first.value.items.map((d) => d.dishId)).toEqual(second.value.items.map((d) => d.dishId))

    const db = getDb()
    const deckRows = await db
      .select()
      .from(sessionDecks)
      .where(and(eq(sessionDecks.sessionId, seed.sessionId), eq(sessionDecks.userId, seed.userId)))
    expect(deckRows).toHaveLength(1)
  })

  it('TC-130: Gọi listDeck, thêm món mới vào nhóm, gọi lại -> Món mới không xuất hiện; thứ tự cũ không đổi', async () => {
    const seed = await seedActiveSessionWithMultipleDishes(3)
    cleanupQueue.push(() => cleanupMultiple(seed))

    const deps = {
      selection: drizzleSelectionRepository,
      history: drizzleHistoryRepository,
      preferences: drizzlePreferenceRepository,
    }

    const input = {
      sessionId: seed.sessionId,
      userId: seed.userId,
      cursor: 0,
      pageSize: 20,
      referenceDate: '2026-08-17',
    }

    const first = await listDeck(deps, input)
    expect(first.ok).toBe(true)
    if (!first.ok) throw new Error('unreachable')
    const originalOrder = first.value.items.map((d) => d.dishId)

    // Thêm món mới vào group
    const db = getDb()
    const newGlobalDishId = crypto.randomUUID()
    const newGroupDishId = crypto.randomUUID()
    await db.insert(globalDishes).values({
      id: newGlobalDishId,
      name: 'Món mới chen ngang',
      normalizedName: 'mon moi chen ngang',
      createdByUserId: seed.userId,
      createdFromGroupId: seed.groupId,
    })
    await db.insert(groupDishes).values({
      id: newGroupDishId,
      groupId: seed.groupId,
      globalDishId: newGlobalDishId,
      state: 'ACTIVE',
    })
    seed.dishIds.push({ globalDishId: newGlobalDishId, groupDishId: newGroupDishId })

    const second = await listDeck(deps, input)
    expect(second.ok).toBe(true)
    if (!second.ok) throw new Error('unreachable')

    const secondOrder = second.value.items.map((d) => d.dishId)
    // Món mới không xuất hiện trong deck đang chạy
    expect(secondOrder).not.toContain(newGroupDishId)
    // Thứ tự cũ giữ nguyên
    expect(secondOrder).toEqual(originalOrder)
  })
})

describe('listEligibleDishCards — E9-T0 (TC-151)', () => {
  it('TC-151: trả systemTags theo thứ tự chuẩn, món không có tag trả []', async () => {
    const seed = await seedActiveSessionWithDish()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    // seed.groupDishId: "Món tích hợp" -> không gắn tag nào

    // Món 2: "Bún chả" -> gắn MAIN rồi STAPLE (thứ tự chèn ngược chuẩn)
    const bunChaGlobalId = crypto.randomUUID()
    const bunChaGroupId = crypto.randomUUID()
    await db.insert(globalDishes).values({
      id: bunChaGlobalId,
      name: 'Bún chả',
      normalizedName: 'bun cha',
      createdByUserId: seed.userId,
      createdFromGroupId: seed.groupId,
    })
    await db.insert(groupDishes).values({
      id: bunChaGroupId,
      groupId: seed.groupId,
      globalDishId: bunChaGlobalId,
      state: 'ACTIVE',
    })
    await db.insert(groupDishTags).values([
      { groupDishId: bunChaGroupId, systemTag: 'MAIN' },
      { groupDishId: bunChaGroupId, systemTag: 'STAPLE' },
    ])

    // Món 3: "Canh chua" -> gắn SOUP
    const canhChuaGlobalId = crypto.randomUUID()
    const canhChuaGroupId = crypto.randomUUID()
    await db.insert(globalDishes).values({
      id: canhChuaGlobalId,
      name: 'Canh chua',
      normalizedName: 'canh chua',
      createdByUserId: seed.userId,
      createdFromGroupId: seed.groupId,
    })
    await db.insert(groupDishes).values({
      id: canhChuaGroupId,
      groupId: seed.groupId,
      globalDishId: canhChuaGlobalId,
      state: 'ACTIVE',
    })
    await db.insert(groupDishTags).values([{ groupDishId: canhChuaGroupId, systemTag: 'SOUP' }])

    const cards = await drizzleSelectionRepository.listEligibleDishCards(
      seed.sessionId,
      seed.participantId,
      seed.userId,
    )

    const noTagCard = cards.find((c) => c.dishId === seed.groupDishId)
    const bunChaCard = cards.find((c) => c.dishId === bunChaGroupId)
    const canhChuaCard = cards.find((c) => c.dishId === canhChuaGroupId)

    expect(noTagCard).toBeDefined()
    expect(noTagCard?.systemTags).toEqual([])

    expect(bunChaCard).toBeDefined()
    // Thứ tự chuẩn của SYSTEM_TAGS: STAPLE đứng trước MAIN
    expect(bunChaCard?.systemTags).toEqual(['STAPLE', 'MAIN'])

    expect(canhChuaCard).toBeDefined()
    expect(canhChuaCard?.systemTags).toEqual(['SOUP'])

    // Dọn dẹp records bổ sung
    await db
      .delete(groupDishTags)
      .where(inArray(groupDishTags.groupDishId, [bunChaGroupId, canhChuaGroupId]))
    await db.delete(groupDishes).where(inArray(groupDishes.id, [bunChaGroupId, canhChuaGroupId]))
    await db
      .delete(globalDishes)
      .where(inArray(globalDishes.id, [bunChaGlobalId, canhChuaGlobalId]))
  })
})

/**
 * SPEC-037 / E13-T4 — nguồn dữ liệu của $I$.
 *
 * Seed dựng BA phiên cho cùng một người và cùng một món, mỗi phiên một state,
 * để `TC-163` kiểm được đúng thứ nó nói: chỉ phiên `FINALIZED` được học.
 */
async function seedThreeSessionStates() {
  const db = getDb()
  const userId = crypto.randomUUID()
  const groupId = crypto.randomUUID()
  const globalDishId = crypto.randomUUID()
  const groupDishId = crypto.randomUUID()

  await db.insert(users).values({
    id: userId,
    provider: 'test',
    providerSubject: `implicit-${userId}`,
    email: `${userId}@example.test`,
    displayName: 'Implicit Test User',
  })
  await db.insert(groups).values({ id: groupId, name: 'Implicit Group', timezone: 'UTC' })
  await db.insert(groupMembers).values({ groupId, userId, isAdmin: true })
  await db.insert(globalDishes).values({
    id: globalDishId,
    name: 'Món học ngầm',
    normalizedName: 'món học ngầm',
    createdByUserId: userId,
    createdFromGroupId: groupId,
  })
  await db.insert(groupDishes).values({ id: groupDishId, groupId, globalDishId, state: 'ACTIVE' })

  const sessionIds: Record<'FINALIZED' | 'ACTIVE' | 'INVALID', string> = {
    FINALIZED: crypto.randomUUID(),
    ACTIVE: crypto.randomUUID(),
    INVALID: crypto.randomUUID(),
  }
  const participantIds: Record<string, string> = {}
  const dates: Record<string, string> = {
    FINALIZED: '2026-08-01',
    ACTIVE: '2026-08-02',
    INVALID: '2026-08-03',
  }

  for (const state of ['FINALIZED', 'ACTIVE', 'INVALID'] as const) {
    const sessionId = sessionIds[state]
    const participantId = crypto.randomUUID()
    participantIds[state] = participantId
    await db.insert(selectionSessions).values({
      id: sessionId,
      groupId,
      decisionDate: dates[state]!,
      creatorUserId: userId,
      state,
    })
    await db.insert(participants).values({ id: participantId, sessionId, userId, state: 'ACTIVE' })
    await db.insert(interactions).values({
      id: crypto.randomUUID(),
      sessionId,
      participantId,
      groupDishId,
      type: 'SWIPE_RIGHT',
    })
  }

  return { userId, groupId, globalDishId, groupDishId, sessionIds, participantIds, dates }
}

async function cleanupThreeSessionStates(
  seed: Awaited<ReturnType<typeof seedThreeSessionStates>>,
  extraGroupIds: string[] = [],
  extraGlobalDishIds: string[] = [],
) {
  const db = getDb()
  const allSessions = Object.values(seed.sessionIds)
  await db.delete(userPreferenceSettings).where(eq(userPreferenceSettings.userId, seed.userId))
  await db.delete(interactionEvents).where(inArray(interactionEvents.sessionId, allSessions))
  await db.delete(interactions).where(inArray(interactions.sessionId, allSessions))
  await db.delete(sessionDecks).where(inArray(sessionDecks.sessionId, allSessions))
  await db.delete(participants).where(inArray(participants.sessionId, allSessions))
  await db.delete(selectionSessions).where(inArray(selectionSessions.id, allSessions))
  await db
    .delete(groupDishes)
    .where(inArray(groupDishes.globalDishId, [seed.globalDishId, ...extraGlobalDishIds]))
  await db
    .delete(globalDishes)
    .where(inArray(globalDishes.id, [seed.globalDishId, ...extraGlobalDishIds]))
  await db.delete(groupMembers).where(eq(groupMembers.userId, seed.userId))
  await db.delete(groups).where(inArray(groups.id, [seed.groupId, ...extraGroupIds]))
  await db.delete(users).where(eq(users.id, seed.userId))
}

describe('findImplicitSwipes — SPEC-037 (TC-163 → TC-165, TC-174)', () => {
  it('TC-163: cùng một món ở ba phiên FINALIZED/ACTIVE/INVALID → CHỈ lượt của phiên FINALIZED', async () => {
    const seed = await seedThreeSessionStates()
    cleanupQueue.push(() => cleanupThreeSessionStates(seed))

    const swipes = await drizzleSelectionRepository.findImplicitSwipes(seed.userId, [
      seed.globalDishId,
    ])

    expect(swipes).toHaveLength(1)
    expect(swipes[0]).toEqual({
      globalDishId: seed.globalDishId,
      type: 'SWIPE_RIGHT',
      decisionDate: seed.dates['FINALIZED'],
    })
  })

  it('TC-164: vuốt phải rồi Undo trong phiên đã FINALIZED → lượt đó KHÔNG tính vào I', async () => {
    const seed = await seedThreeSessionStates()
    cleanupQueue.push(() => cleanupThreeSessionStates(seed))
    const db = getDb()

    // Undo = xoá dòng khỏi `interactions`, để lại dấu ở `interaction_events`.
    // Nếu `findImplicitSwipes` đọc nhầm bảng nhật ký, ca này đỏ.
    await db.insert(interactionEvents).values({
      id: crypto.randomUUID(),
      sessionId: seed.sessionIds.FINALIZED,
      participantId: seed.participantIds['FINALIZED']!,
      groupDishId: seed.groupDishId,
      action: 'UNDO',
    })
    await db.delete(interactions).where(eq(interactions.sessionId, seed.sessionIds.FINALIZED))

    const swipes = await drizzleSelectionRepository.findImplicitSwipes(seed.userId, [
      seed.globalDishId,
    ])

    expect(swipes).toEqual([])
  })

  it('TC-165: cùng Global Dish qua hai group_dishes ở hai Group → I gộp cả hai', async () => {
    const seed = await seedThreeSessionStates()
    const db = getDb()

    // Nhóm thứ hai, dòng `group_dishes` thứ hai cho CÙNG một `global_dishes.id`.
    const otherGroupId = crypto.randomUUID()
    const otherGroupDishId = crypto.randomUUID()
    const otherSessionId = crypto.randomUUID()
    const otherParticipantId = crypto.randomUUID()

    await db.insert(groups).values({ id: otherGroupId, name: 'Nhóm thứ hai', timezone: 'UTC' })
    await db
      .insert(groupMembers)
      .values({ groupId: otherGroupId, userId: seed.userId, isAdmin: false })
    await db.insert(groupDishes).values({
      id: otherGroupDishId,
      groupId: otherGroupId,
      globalDishId: seed.globalDishId,
      state: 'ACTIVE',
    })
    await db.insert(selectionSessions).values({
      id: otherSessionId,
      groupId: otherGroupId,
      decisionDate: '2026-08-05',
      creatorUserId: seed.userId,
      state: 'FINALIZED',
    })
    await db.insert(participants).values({
      id: otherParticipantId,
      sessionId: otherSessionId,
      userId: seed.userId,
      state: 'ACTIVE',
    })
    await db.insert(interactions).values({
      id: crypto.randomUUID(),
      sessionId: otherSessionId,
      participantId: otherParticipantId,
      groupDishId: otherGroupDishId,
      type: 'SWIPE_LEFT',
    })

    seed.sessionIds.FINALIZED satisfies string
    const allSessionIds = { ...seed.sessionIds, OTHER: otherSessionId }
    cleanupQueue.push(() =>
      cleanupThreeSessionStates({ ...seed, sessionIds: allSessionIds }, [otherGroupId]),
    )

    const swipes = await drizzleSelectionRepository.findImplicitSwipes(seed.userId, [
      seed.globalDishId,
    ])

    // Hai lượt, cùng `globalDishId`, khác `group_dishes.id` — gộp theo món toàn cục.
    expect(swipes).toHaveLength(2)
    expect(new Set(swipes.map((s) => s.globalDishId))).toEqual(new Set([seed.globalDishId]))
    expect(new Set(swipes.map((s) => s.type))).toEqual(new Set(['SWIPE_RIGHT', 'SWIPE_LEFT']))
  })

  it('SPEC-040: implicit_reset_at bỏ qua mọi phiên có decision_date TRƯỚC mốc', async () => {
    const seed = await seedThreeSessionStates()
    cleanupQueue.push(() => cleanupThreeSessionStates(seed))
    const db = getDb()

    const before = await drizzleSelectionRepository.findImplicitSwipes(seed.userId, [
      seed.globalDishId,
    ])
    expect(before).toHaveLength(1)

    // Mốc đặt SAU decision_date của phiên FINALIZED (2026-08-01).
    await db.insert(userPreferenceSettings).values({
      userId: seed.userId,
      implicitResetAt: new Date('2026-08-02T00:00:00Z'),
    })

    const after = await drizzleSelectionRepository.findImplicitSwipes(seed.userId, [
      seed.globalDishId,
    ])
    expect(after).toEqual([])

    // TC-171 — số dòng `interactions` KHÔNG đổi: mốc thời gian, không phải lệnh xoá.
    const remaining = await db
      .select({ id: interactions.id })
      .from(interactions)
      .where(inArray(interactions.sessionId, Object.values(seed.sessionIds)))
    expect(remaining).toHaveLength(3)
  })

  it('danh sách món rỗng: trả [] mà không chạm DB', async () => {
    expect(await drizzleSelectionRepository.findImplicitSwipes(crypto.randomUUID(), [])).toEqual([])
  })

  it('lượt vuốt của NGƯỜI KHÁC không lọt vào I của mình', async () => {
    const seed = await seedThreeSessionStates()
    const db = getDb()

    const otherUserId = crypto.randomUUID()
    const otherParticipantId = crypto.randomUUID()
    await db.insert(users).values({
      id: otherUserId,
      provider: 'test',
      providerSubject: `implicit-other-${otherUserId}`,
      email: `${otherUserId}@example.test`,
      displayName: 'Người khác',
    })
    await db.insert(participants).values({
      id: otherParticipantId,
      sessionId: seed.sessionIds.FINALIZED,
      userId: otherUserId,
      state: 'ACTIVE',
    })
    await db.insert(interactions).values({
      id: crypto.randomUUID(),
      sessionId: seed.sessionIds.FINALIZED,
      participantId: otherParticipantId,
      groupDishId: seed.groupDishId,
      type: 'SWIPE_LEFT',
    })

    cleanupQueue.push(async () => {
      await cleanupThreeSessionStates(seed)
      await db.delete(users).where(eq(users.id, otherUserId))
    })

    const mine = await drizzleSelectionRepository.findImplicitSwipes(seed.userId, [
      seed.globalDishId,
    ])
    expect(mine).toHaveLength(1)
    expect(mine[0]?.type).toBe('SWIPE_RIGHT')
  })
})

describe('listEligibleDishCards — Stage 1 sau khi có cột kind (TC-167, E13-S1 Guide §1.1)', () => {
  it('TC-167: bật Blacklist → món bị LỌC CỨNG khỏi deck, cùng chỗ với Cannot Eat', async () => {
    const seed = await seedActiveSessionWithDish()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    await db.insert(userDishConstraints).values({
      userId: seed.userId,
      globalDishId: seed.globalDishId,
      kind: 'BLACKLIST',
    })

    const after = await drizzleSelectionRepository.listEligibleDishCards(
      seed.sessionId,
      seed.participantId,
      seed.userId,
    )
    expect(after.some((d) => d.dishId === seed.groupDishId)).toBe(false)
  })

  it('món HISTORY_WHITELIST VẪN CÓ trong deck — Whitelist gỡ phạt, KHÔNG phải phép lọc', async () => {
    // Lỗi im lặng nguy hiểm nhất của E13 (Guide S1 §1.1): trước khi có cột
    // `kind`, mệnh đề `notExists` hỏi "user có dòng nào cho món này không", và
    // câu hỏi đó tình cờ trùng với "user có khai Cannot Eat không". Bỏ sót
    // `kind` thì một dòng Whitelist cũng làm món biến khỏi deck — đúng ngược
    // BR-036, và không cổng máy nào bắt được.
    const seed = await seedActiveSessionWithDish()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    await db.insert(userDishConstraints).values({
      userId: seed.userId,
      globalDishId: seed.globalDishId,
      kind: 'HISTORY_WHITELIST',
    })

    const after = await drizzleSelectionRepository.listEligibleDishCards(
      seed.sessionId,
      seed.participantId,
      seed.userId,
    )
    expect(after.some((d) => d.dishId === seed.groupDishId)).toBe(true)
  })

  it('TC-168 (phía schema): ba cờ cùng (user, món) cùng tồn tại; gỡ một cái không đụng cái kia', async () => {
    const seed = await seedActiveSessionWithDish()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    await db.insert(userDishConstraints).values([
      { userId: seed.userId, globalDishId: seed.globalDishId, kind: 'CANNOT_EAT' },
      { userId: seed.userId, globalDishId: seed.globalDishId, kind: 'BLACKLIST' },
      { userId: seed.userId, globalDishId: seed.globalDishId, kind: 'HISTORY_WHITELIST' },
    ])

    const cannotEat = await drizzlePreferenceRepository.findConstrainedGlobalDishIds(
      seed.userId,
      'CANNOT_EAT',
    )
    const blacklist = await drizzlePreferenceRepository.findConstrainedGlobalDishIds(
      seed.userId,
      'BLACKLIST',
    )
    const whitelist = await drizzlePreferenceRepository.findConstrainedGlobalDishIds(
      seed.userId,
      'HISTORY_WHITELIST',
    )
    expect(cannotEat.has(seed.globalDishId)).toBe(true)
    expect(blacklist.has(seed.globalDishId)).toBe(true)
    expect(whitelist.has(seed.globalDishId)).toBe(true)

    // Gỡ Cannot Eat qua đường ghi thật — hai cờ kia phải còn nguyên.
    await drizzlePreferenceRepository.setConstraint({
      userId: seed.userId,
      globalDishId: seed.globalDishId,
      kind: 'CANNOT_EAT',
      enabled: false,
    })

    expect(
      (await drizzlePreferenceRepository.findConstrainedGlobalDishIds(seed.userId, 'CANNOT_EAT'))
        .size,
    ).toBe(0)
    expect(
      (await drizzlePreferenceRepository.findConstrainedGlobalDishIds(seed.userId, 'BLACKLIST'))
        .size,
    ).toBe(1)
    expect(
      (
        await drizzlePreferenceRepository.findConstrainedGlobalDishIds(
          seed.userId,
          'HISTORY_WHITELIST',
        )
      ).size,
    ).toBe(1)
  })
})

describe('E13 — điểm kiểm tra Master Plan §17.4 (cả chuỗi F30)', () => {
  it('vuốt phải cùng một món qua BA phiên FINALIZED → phiên thứ tư món đó nổi lên đầu deck mà KHÔNG cần Like', async () => {
    const db = getDb()
    const userId = crypto.randomUUID()
    const groupId = crypto.randomUUID()

    await db.insert(users).values({
      id: userId,
      provider: 'test',
      providerSubject: `checkpoint-${userId}`,
      email: `${userId}@example.test`,
      displayName: 'Checkpoint User',
    })
    await db.insert(groups).values({ id: groupId, name: 'Checkpoint Group', timezone: 'UTC' })
    await db.insert(groupMembers).values({ groupId, userId, isAdmin: true })

    // Năm món giống hệt nhau về mọi mặt: chưa từng ăn, không Like/Dislike, không tag.
    // Khác biệt DUY NHẤT sẽ là lịch sử vuốt.
    const dishes = Array.from({ length: 5 }, (_, i) => ({
      globalDishId: crypto.randomUUID(),
      groupDishId: crypto.randomUUID(),
      name: `Món checkpoint ${i}`,
    }))
    for (const d of dishes) {
      await db.insert(globalDishes).values({
        id: d.globalDishId,
        name: d.name,
        normalizedName: d.name.toLowerCase(),
        createdByUserId: userId,
        createdFromGroupId: groupId,
      })
      await db
        .insert(groupDishes)
        .values({ id: d.groupDishId, groupId, globalDishId: d.globalDishId, state: 'ACTIVE' })
    }
    const favourite = dishes[0]!

    // Ba phiên đã chốt, mỗi phiên một lượt vuốt phải cho đúng món đó.
    const pastSessionIds: string[] = []
    const pastDates = ['2026-08-14', '2026-08-15', '2026-08-16']
    for (const decisionDate of pastDates) {
      const sessionId = crypto.randomUUID()
      const participantId = crypto.randomUUID()
      pastSessionIds.push(sessionId)
      await db.insert(selectionSessions).values({
        id: sessionId,
        groupId,
        decisionDate,
        creatorUserId: userId,
        state: 'FINALIZED',
      })
      await db
        .insert(participants)
        .values({ id: participantId, sessionId, userId, state: 'ACTIVE' })
      await db.insert(interactions).values({
        id: crypto.randomUUID(),
        sessionId,
        participantId,
        groupDishId: favourite.groupDishId,
        type: 'SWIPE_RIGHT',
      })
    }

    // Phiên thứ tư, đang mở, chưa materialize deck.
    const freshSessionId = crypto.randomUUID()
    const freshParticipantId = crypto.randomUUID()
    await db.insert(selectionSessions).values({
      id: freshSessionId,
      groupId,
      decisionDate: '2026-08-17',
      creatorUserId: userId,
      state: 'ACTIVE',
    })
    await db
      .insert(participants)
      .values({ id: freshParticipantId, sessionId: freshSessionId, userId, state: 'ACTIVE' })

    const allSessionIds = [...pastSessionIds, freshSessionId]
    cleanupQueue.push(async () => {
      await db.delete(userPreferenceSettings).where(eq(userPreferenceSettings.userId, userId))
      await db.delete(sessionDecks).where(inArray(sessionDecks.sessionId, allSessionIds))
      await db.delete(interactionEvents).where(inArray(interactionEvents.sessionId, allSessionIds))
      await db.delete(interactions).where(inArray(interactions.sessionId, allSessionIds))
      await db.delete(participants).where(inArray(participants.sessionId, allSessionIds))
      await db.delete(selectionSessions).where(inArray(selectionSessions.id, allSessionIds))
      await db.delete(groupDishes).where(eq(groupDishes.groupId, groupId))
      await db.delete(globalDishes).where(
        inArray(
          globalDishes.id,
          dishes.map((d) => d.globalDishId),
        ),
      )
      await db.delete(groupMembers).where(eq(groupMembers.groupId, groupId))
      await db.delete(groups).where(eq(groups.id, groupId))
      await db.delete(users).where(eq(users.id, userId))
    })

    const result = await listDeck(
      {
        selection: drizzleSelectionRepository,
        history: drizzleHistoryRepository,
        preferences: drizzlePreferenceRepository,
      },
      {
        sessionId: freshSessionId,
        userId,
        cursor: 0,
        pageSize: 30,
        referenceDate: '2026-08-17',
      },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items).toHaveLength(5)
    // KHÔNG có Like nào cho món này. Nó lên đầu chỉ nhờ $I$.
    expect(result.value.items[0]?.dishId).toBe(favourite.groupDishId)
  })
})
