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
  // TC-103 — trước MỌI truy vấn, cùng nguyên tắc "validate không chạm DB"
  // đã dùng ở `addDishToGroup`.
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

  let orderedDishIds = await deps.selection.findMaterializedDeck(input.sessionId, input.userId)

  if (orderedDishIds === null) {
    // Lần đầu mở deck — TÍNH RANKING, chỉ MỘT lần trong đời deck này.
    const eatingRows = await deps.history.findEatingDates(
      input.userId,
      eligible.map((d) => d.globalDishId),
    )
    const eatingByDish = groupEatingDatesByDish(eatingRows)

    const rankingInputs = eligible.map((dish) => {
      const dates = eatingByDish.get(dish.globalDishId) ?? []
      return {
        dishId: dish.dishId,
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
        : // Thua race hiếm: request khác vừa materialize xong. Đọc lại để hội
          // tụ về ĐÚNG thứ tự đã thắng, không dùng bản mình vừa tính.
          ((await deps.selection.findMaterializedDeck(input.sessionId, input.userId)) ?? built)
  }

  // R-02 (TC-108) — giao giữa thứ tự đã lưu và tập ACTIVE hiện tại. Giữ
  // nguyên thứ tự đã lưu, chỉ bớt dish không còn hợp lệ. Món mới thêm sau
  // materialize KHÔNG xuất hiện — đây là chủ ý (BR-048 Deck Stability).
  const eligibleById = new Map(eligible.map((dish) => [dish.dishId, dish]))
  const orderedCards = orderedDishIds
    .map((dishId) => eligibleById.get(dishId))
    .filter((dish): dish is DishCard => dish !== undefined)

  const page = getDeckPage(orderedCards, input.cursor, input.pageSize)
  return ok({ items: [...page.items], nextCursor: page.nextCursor })
}
