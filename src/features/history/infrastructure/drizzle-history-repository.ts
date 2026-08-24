import { and, eq, inArray, sql } from 'drizzle-orm'

import { getDb } from '@/shared/db/client'
import { eatingHistory } from '@/shared/db/schema'

import type { EatingDateRecord, HistoryRepository } from '../application/history-repository'

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

export const drizzleHistoryRepository: HistoryRepository = {
  findEatingDates,
  countRecentEatersByDish,
}
