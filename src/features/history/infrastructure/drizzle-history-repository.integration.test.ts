import { eq } from 'drizzle-orm'
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
