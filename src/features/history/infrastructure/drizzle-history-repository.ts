import { and, eq, inArray } from 'drizzle-orm'

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

export const drizzleHistoryRepository: HistoryRepository = { findEatingDates }
