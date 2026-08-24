import { eq, inArray } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { getDb } from '@/shared/db/client'
import {
  eatingHistory,
  finalMealItems,
  finalMeals,
  globalDishes,
  groupDishes,
  groupMembers,
  groups,
  selectionSessions,
  users,
} from '@/shared/db/schema'

import { drizzleHistoryRepository } from './drizzle-history-repository'

async function seedHistoryTestData() {
  const db = getDb()
  const userId = crypto.randomUUID()
  const groupId = crypto.randomUUID()
  const sessionId = crypto.randomUUID()
  const finalMealId = crypto.randomUUID()
  const globalDishIdA = crypto.randomUUID()
  const globalDishIdB = crypto.randomUUID()
  const groupDishIdA = crypto.randomUUID()
  const groupDishIdB = crypto.randomUUID()

  await db.insert(users).values({
    id: userId,
    provider: 'test',
    providerSubject: `sub-${userId}`,
    email: `${userId}@test.local`,
    displayName: 'History User',
  })
  await db.insert(groups).values({ id: groupId, name: 'History Group', timezone: 'UTC' })
  await db.insert(groupMembers).values({ groupId, userId, isAdmin: true })
  await db.insert(selectionSessions).values({
    id: sessionId,
    groupId,
    decisionDate: '2026-08-10',
    creatorUserId: userId,
    state: 'FINALIZED',
  })
  await db.insert(globalDishes).values([
    {
      id: globalDishIdA,
      name: 'Món A',
      normalizedName: 'món a',
      createdByUserId: userId,
      createdFromGroupId: groupId,
    },
    {
      id: globalDishIdB,
      name: 'Món B',
      normalizedName: 'món b',
      createdByUserId: userId,
      createdFromGroupId: groupId,
    },
  ])
  await db.insert(groupDishes).values([
    { id: groupDishIdA, groupId, globalDishId: globalDishIdA, state: 'ACTIVE' },
    { id: groupDishIdB, groupId, globalDishId: globalDishIdB, state: 'ACTIVE' },
  ])
  await db.insert(finalMeals).values({ id: finalMealId, sessionId })
  await db.insert(finalMealItems).values([
    { finalMealId, groupDishId: groupDishIdA },
    { finalMealId, groupDishId: groupDishIdB },
  ])
  await db.insert(eatingHistory).values([
    {
      userId,
      globalDishId: globalDishIdA,
      eatingDate: '2026-08-10',
      sourceFinalMealId: finalMealId,
    },
    {
      userId,
      globalDishId: globalDishIdB,
      eatingDate: '2026-08-12',
      sourceFinalMealId: finalMealId,
    },
  ])

  return { userId, groupId, sessionId, finalMealId, globalDishIdA, globalDishIdB }
}

type Seed = Awaited<ReturnType<typeof seedHistoryTestData>>

async function cleanup(seed: Seed) {
  const db = getDb()
  await db.delete(eatingHistory).where(eq(eatingHistory.userId, seed.userId))
  await db.delete(finalMealItems).where(eq(finalMealItems.finalMealId, seed.finalMealId))
  await db.delete(finalMeals).where(eq(finalMeals.id, seed.finalMealId))
  await db.delete(groupDishes).where(eq(groupDishes.groupId, seed.groupId))
  await db.delete(globalDishes).where(eq(globalDishes.createdFromGroupId, seed.groupId))
  await db.delete(selectionSessions).where(eq(selectionSessions.id, seed.sessionId))
  await db.delete(groupMembers).where(eq(groupMembers.groupId, seed.groupId))
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

describe('drizzleHistoryRepository.findEatingDates (SPEC-020)', () => {
  it('trả đúng eatingDate cho từng globalDishId, bỏ qua dish không được hỏi tới', async () => {
    const seed = await seedHistoryTestData()
    cleanupQueue.push(() => cleanup(seed))

    const records = await drizzleHistoryRepository.findEatingDates(seed.userId, [
      seed.globalDishIdA,
    ])

    expect(records).toHaveLength(1)
    expect(records[0]).toEqual({
      globalDishId: seed.globalDishIdA,
      eatingDate: '2026-08-10',
    })
  })

  it('globalDishIds rỗng: trả mảng rỗng, không lỗi', async () => {
    const records = await drizzleHistoryRepository.findEatingDates('non-existent-user', [])
    expect(records).toEqual([])
  })
})

describe('drizzleHistoryRepository.countRecentEatersByDish (SPEC-014)', () => {
  it('đếm đúng số người (COUNT DISTINCT), áp dụng multi-source collapse khi 1 user ăn 2 lần', async () => {
    const seed = await seedHistoryTestData()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    // Thêm user thứ 2
    const user2Id = crypto.randomUUID()
    await db.insert(users).values({
      id: user2Id,
      provider: 'test',
      providerSubject: `sub-${user2Id}`,
      email: `${user2Id}@test.local`,
      displayName: 'User 2',
    })

    // User 1 ăn món A vào 2 ngày khác nhau trong tuần (2026-08-15 và 2026-08-16)
    await db.insert(eatingHistory).values([
      {
        userId: seed.userId,
        globalDishId: seed.globalDishIdA,
        eatingDate: '2026-08-15',
        sourceFinalMealId: seed.finalMealId,
      },
      {
        userId: seed.userId,
        globalDishId: seed.globalDishIdA,
        eatingDate: '2026-08-16',
        sourceFinalMealId: seed.finalMealId,
      },
    ])

    // User 2 ăn món A vào ngày 2026-08-16
    await db.insert(eatingHistory).values([
      {
        userId: user2Id,
        globalDishId: seed.globalDishIdA,
        eatingDate: '2026-08-16',
        sourceFinalMealId: seed.finalMealId,
      },
    ])

    // Reference date: 2026-08-17, window: 7 ngày
    const counts = await drizzleHistoryRepository.countRecentEatersByDish({
      userIds: [seed.userId, user2Id],
      globalDishIds: [seed.globalDishIdA, seed.globalDishIdB],
      referenceDate: '2026-08-17',
      windowDays: 7,
    })

    // Món A: User 1 (2 lần) + User 2 (1 lần) = 2 distinct users
    expect(counts.get(seed.globalDishIdA)).toBe(2)
    // Món B: chỉ có User 1 ăn ngày 2026-08-12 (5 ngày trước 2026-08-17) = 1 user
    expect(counts.get(seed.globalDishIdB)).toBe(1)

    await db.delete(eatingHistory).where(eq(eatingHistory.userId, user2Id))
    await db.delete(users).where(eq(users.id, user2Id))
  })

  it('ranh giới cửa sổ: d=6 (tính), d=7 (loại bỏ), ngày tương lai (loại bỏ)', async () => {
    const seed = await seedHistoryTestData()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    // Reference Date: 2026-08-20, window: 7 ngày
    // (2026-08-20 - 7 ngày) = 2026-08-13
    // Cửa sổ: > 2026-08-13 AND <= 2026-08-20
    // d = 7 (2026-08-13): NGOÀI cửa sổ (loại bỏ)
    // d = 6 (2026-08-14): TRONG cửa sổ (tính)
    // d = 0 (2026-08-20): TRONG cửa sổ (tính)
    // tương lai (2026-08-21): NGOÀI cửa sổ (loại bỏ)

    const dishD7 = crypto.randomUUID()
    const dishD6 = crypto.randomUUID()
    const dishD0 = crypto.randomUUID()
    const dishFuture = crypto.randomUUID()

    await db.insert(globalDishes).values([
      {
        id: dishD7,
        name: 'Món d=7',
        normalizedName: 'món d=7',
        createdByUserId: seed.userId,
        createdFromGroupId: seed.groupId,
      },
      {
        id: dishD6,
        name: 'Món d=6',
        normalizedName: 'món d=6',
        createdByUserId: seed.userId,
        createdFromGroupId: seed.groupId,
      },
      {
        id: dishD0,
        name: 'Món d=0',
        normalizedName: 'món d=0',
        createdByUserId: seed.userId,
        createdFromGroupId: seed.groupId,
      },
      {
        id: dishFuture,
        name: 'Món future',
        normalizedName: 'món future',
        createdByUserId: seed.userId,
        createdFromGroupId: seed.groupId,
      },
    ])

    await db.insert(eatingHistory).values([
      {
        userId: seed.userId,
        globalDishId: dishD7,
        eatingDate: '2026-08-13',
        sourceFinalMealId: seed.finalMealId,
      },
      {
        userId: seed.userId,
        globalDishId: dishD6,
        eatingDate: '2026-08-14',
        sourceFinalMealId: seed.finalMealId,
      },
      {
        userId: seed.userId,
        globalDishId: dishD0,
        eatingDate: '2026-08-20',
        sourceFinalMealId: seed.finalMealId,
      },
      {
        userId: seed.userId,
        globalDishId: dishFuture,
        eatingDate: '2026-08-21',
        sourceFinalMealId: seed.finalMealId,
      },
    ])

    const counts = await drizzleHistoryRepository.countRecentEatersByDish({
      userIds: [seed.userId],
      globalDishIds: [dishD7, dishD6, dishD0, dishFuture],
      referenceDate: '2026-08-20',
      windowDays: 7,
    })

    expect(counts.has(dishD7)).toBe(false)
    expect(counts.get(dishD6)).toBe(1)
    expect(counts.get(dishD0)).toBe(1)
    expect(counts.has(dishFuture)).toBe(false)

    await db
      .delete(eatingHistory)
      .where(inArray(eatingHistory.globalDishId, [dishD7, dishD6, dishD0, dishFuture]))
    await db
      .delete(globalDishes)
      .where(inArray(globalDishes.id, [dishD7, dishD6, dishD0, dishFuture]))
  })

  it('userIds hoặc globalDishIds rỗng: trả Map rỗng, không truy vấn lỗi', async () => {
    const empty1 = await drizzleHistoryRepository.countRecentEatersByDish({
      userIds: [],
      globalDishIds: ['dish-1'],
      referenceDate: '2026-08-20',
      windowDays: 7,
    })
    expect(empty1.size).toBe(0)

    const empty2 = await drizzleHistoryRepository.countRecentEatersByDish({
      userIds: ['user-1'],
      globalDishIds: [],
      referenceDate: '2026-08-20',
      windowDays: 7,
    })
    expect(empty2.size).toBe(0)
  })
})
