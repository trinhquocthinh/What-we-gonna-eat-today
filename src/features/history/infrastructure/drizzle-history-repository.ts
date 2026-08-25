import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm'

import { getDb } from '@/shared/db/client'
import { eatingHistory, globalDishes } from '@/shared/db/schema'

import type {
  EatingDateRecord,
  EatingRecord,
  HistoryRepository,
} from '../application/history-repository'

async function findEatingDates(
  userId: string,
  globalDishIds: readonly string[],
): Promise<readonly EatingDateRecord[]> {
  if (globalDishIds.length === 0) {
    return []
  }

  return getDb()
    .select({ globalDishId: eatingHistory.globalDishId, eatingDate: eatingHistory.eatingDate })
    .from(eatingHistory)
    .where(
      and(
        eq(eatingHistory.userId, userId),
        inArray(eatingHistory.globalDishId, [...globalDishIds]),
      ),
    )
}

async function countRecentEatersByDish(input: {
  readonly userIds: readonly string[]
  readonly globalDishIds: readonly string[]
  readonly referenceDate: string
  readonly windowDays: number
}): Promise<Map<string, number>> {
  if (input.userIds.length === 0 || input.globalDishIds.length === 0) {
    return new Map()
  }

  const rows = await getDb()
    .select({
      globalDishId: eatingHistory.globalDishId,
      eaterCount: sql<string>`COUNT(DISTINCT ${eatingHistory.userId})`,
    })
    .from(eatingHistory)
    .where(
      and(
        inArray(eatingHistory.userId, [...input.userIds]),
        inArray(eatingHistory.globalDishId, [...input.globalDishIds]),
        sql`${eatingHistory.eatingDate} > (${input.referenceDate}::date - ${input.windowDays}::int)`,
        sql`${eatingHistory.eatingDate} <= ${input.referenceDate}::date`,
      ),
    )
    .groupBy(eatingHistory.globalDishId)

  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(row.globalDishId, Number(row.eaterCount))
  }

  return map
}

async function findEatingHistory(input: {
  readonly userId: string
  readonly from: string
  readonly to: string
}): Promise<EatingRecord[]> {
  const rows = await getDb()
    .select({
      eatingDate: eatingHistory.eatingDate,
      dishName: globalDishes.name,
    })
    .from(eatingHistory)
    .innerJoin(globalDishes, eq(globalDishes.id, eatingHistory.globalDishId))
    .where(
      and(
        eq(eatingHistory.userId, input.userId),
        gte(eatingHistory.eatingDate, input.from),
        lte(eatingHistory.eatingDate, input.to),
      ),
    )

  return rows
}

export const drizzleHistoryRepository: HistoryRepository = {
  findEatingDates,
  countRecentEatersByDish,
  findEatingHistory,
}
