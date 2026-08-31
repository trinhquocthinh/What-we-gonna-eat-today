import type { HistoryRepository } from '@/features/history/application/history-repository'
import { computeRecencyPenalty, daysSinceLastEaten } from '@/features/history/domain/recency'
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import { getDeckPage } from '../domain/deck-page'
import { buildDeck } from '../domain/ranking'
import { RANKING_CONFIG } from '../domain/ranking-config'
import type { DishCard, SelectionRepository } from './selection-repository'

export type ListDeckDeps = {
  readonly selection: SelectionRepository
  readonly history: HistoryRepository
}

export type ListDeckInput = {
  readonly sessionId: string
  readonly userId: string
  readonly cursor: number
  readonly pageSize: number
  /**
   * Người gọi truyền `session.decisionDate` — KHÔNG tính `new Date()` ở đây.
   * Đúng kỷ luật "hàm nhận referenceDate làm tham số" mà E4-T1 (S1) đã đặt ra
   * cho `computeRecencyPenalty`; ở tầng use case thì `referenceDate` cũng
   * không tự suy ra, vì `selection` không biết timezone của Group (đó là
   * `group`, và `selection` không được import `group`).
   */
  readonly referenceDate: string
}

export type ListDeckResult = {
  readonly items: DishCard[]
  readonly nextCursor: number | null
}

const ACCEPTED_PARTICIPANT_STATES = ['ACTIVE', 'COMPLETED'] as const

function groupEatingDatesByDish(
  rows: readonly { globalDishId: string; eatingDate: string }[],
): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const row of rows) {
    const existing = map.get(row.globalDishId)
    if (existing === undefined) {
      map.set(row.globalDishId, [row.eatingDate])
    } else {
      existing.push(row.eatingDate)
    }
  }
  return map
}

export async function listDeck(
  deps: ListDeckDeps,
  input: ListDeckInput,
): Promise<Result<ListDeckResult, Failure>> {
  if (input.cursor < 0) {
    return err(failure('ERR_VALIDATION', { field: 'cursor' }))
  }

  const participant = await deps.selection.findParticipant(input.sessionId, input.userId)
  if (
    participant === null ||
    !ACCEPTED_PARTICIPANT_STATES.includes(participant.state as 'ACTIVE' | 'COMPLETED')
  ) {
    return err(failure('ERR_NOT_PARTICIPANT', { sessionId: input.sessionId }))
  }

  const eligible = await deps.selection.listEligibleDishCards(input.sessionId, participant.id)

  // SỬA (S4): đọc lịch sử ăn ở MỌI lần gọi — cần cho lastEatenLabel bất kể
  // deck đã materialize hay chưa. Xem Implementation Guide §2.
  const eatingRows = await deps.history.findEatingDates(
    input.userId,
    eligible.map((d) => d.globalDishId),
  )
  const eatingByDish = groupEatingDatesByDish(eatingRows)

  let orderedDishIds = await deps.selection.findMaterializedDeck(input.sessionId, input.userId)

  if (orderedDishIds === null) {
    // Chỉ bước TÍNH RANKING + GHI còn nằm trong nhánh điều kiện — không phải
    // việc đọc lịch sử (đã chuyển ra ngoài, ở trên).
    const rankingInputs = eligible.map((dish) => {
      const dates = eatingByDish.get(dish.globalDishId) ?? []
      return {
        dishId: dish.dishId,
        // E7-T4: S1 truyền 0 — nguồn dữ liệu thật từ PreferenceRepository tới ở S2 (§1.5).
        explicit: 0,
        daysSinceLastEaten: daysSinceLastEaten({
          eatingDates: dates,
          referenceDate: input.referenceDate,
        }),
        recencyPenalty: computeRecencyPenalty({
          eatingDates: dates,
          referenceDate: input.referenceDate,
          cooldownWindowDays: RANKING_CONFIG.history.cooldownWindowDays,
        }),
      }
    })

    const built = buildDeck(
      { sessionId: input.sessionId, userId: input.userId, eligible: rankingInputs },
      RANKING_CONFIG,
    )

    const materialized = await deps.selection.materializeDeck(input.sessionId, input.userId, built)
    orderedDishIds =
      materialized.outcome === 'MATERIALIZED'
        ? built
        : ((await deps.selection.findMaterializedDeck(input.sessionId, input.userId)) ?? built)
  }

  const eligibleById = new Map(eligible.map((dish) => [dish.dishId, dish]))
  const orderedCards = orderedDishIds
    .map((dishId) => eligibleById.get(dishId))
    .filter((dish): dish is DishCard => dish !== undefined)
    .map((dish) => ({
      ...dish,
      // MỚI — S4. Tính từ CÙNG `eatingByDish` đã đọc ở trên, không query thêm.
      daysSinceLastEaten: daysSinceLastEaten({
        eatingDates: eatingByDish.get(dish.globalDishId) ?? [],
        referenceDate: input.referenceDate,
      }),
    }))

  const page = getDeckPage(orderedCards, input.cursor, input.pageSize)
  return ok({ items: [...page.items], nextCursor: page.nextCursor })
}
