import type { HistoryRepository } from '@/features/history/application/history-repository'
import { computeRecencyPenalty, daysSinceLastEaten } from '@/features/history/domain/recency'
import type { PreferenceRepository } from '@/features/preference/application/preference-repository'
import { explicitPreferenceScore } from '@/features/preference/domain/explicit-preference'
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import { capDeck, getDeckPage } from '../domain/deck-page'
import { blendExploitExplore, buildDeck, isExploreEligible } from '../domain/ranking'
import { RANKING_CONFIG } from '../domain/ranking-config'
import type { DishCard, SelectionRepository } from './selection-repository'

export type ListDeckDeps = {
  readonly selection: SelectionRepository
  readonly history: HistoryRepository
  readonly preferences: PreferenceRepository
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

  const eligible = await deps.selection.listEligibleDishCards(
    input.sessionId,
    participant.id,
    input.userId,
  )

  // SPEC-020 + SPEC-025 (§4.2): đọc lịch sử ăn VÀ sở thích cá nhân cùng lúc
  // bằng Promise.all để thoả mãn NFR-01 (≤2.5s)
  const globalDishIds = eligible.map((d) => d.globalDishId)
  const [eatingRows, preferences] = await Promise.all([
    deps.history.findEatingDates(input.userId, globalDishIds),
    deps.preferences.findPreferencesByGlobalDish(input.userId, globalDishIds),
  ])
  const eatingByDish = groupEatingDatesByDish(eatingRows)

  let orderedDishIds = await deps.selection.findMaterializedDeck(input.sessionId, input.userId)

  if (orderedDishIds === null) {
    // Chỉ bước TÍNH RANKING + GHI còn nằm trong nhánh điều kiện — không phải
    // việc đọc lịch sử (đã chuyển ra ngoài, ở trên).
    //
    // LƯU Ý BR-048 (Deck Stability) & SPEC-028: Deck được materialize một lần
    // vào session_decks. Số hạng E chỉ tác động tới thứ tự ở lần dựng đầu tiên
    // của phiên; đổi Like/Dislike giữa phiên không sắp xếp lại deck đã lưu.
    const rankingInputs = eligible.map((dish) => {
      const dates = eatingByDish.get(dish.globalDishId) ?? []
      return {
        dishId: dish.dishId,
        explicit: explicitPreferenceScore(preferences.get(dish.globalDishId) ?? null),
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

    const ordered = buildDeck(
      { sessionId: input.sessionId, userId: input.userId, eligible: rankingInputs },
      RANKING_CONFIG,
    )

    // BR-047 — chia hai luồng TỪ danh sách đã sắp, giữ nguyên thứ tự tương đối.
    // Hai luồng CHỒNG NHAU (Guide §1.1) — `blendExploitExplore` khử trùng bằng Set.
    const byId = new Map(rankingInputs.map((r) => [r.dishId, r]))
    const explore = ordered.filter((id) => isExploreEligible(byId.get(id)!, RANKING_CONFIG))

    // Thứ tự BẮT BUỘC: trộn TRƯỚC, cắt trần SAU (BR-062, DEC-058, Guide §1.2).
    const blended = blendExploitExplore({
      exploit: ordered,
      explore,
      blockSize: RANKING_CONFIG.explore.blockSize,
    })
    const built = capDeck(blended, RANKING_CONFIG.deck.maxCards)

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
    .map((dish) => {
      const d = daysSinceLastEaten({
        eatingDates: eatingByDish.get(dish.globalDishId) ?? [],
        referenceDate: input.referenceDate,
      })
      const explicit = explicitPreferenceScore(preferences.get(dish.globalDishId) ?? null)
      return {
        ...dish,
        daysSinceLastEaten: d,
        lane: isExploreEligible({ daysSinceLastEaten: d, explicit }, RANKING_CONFIG)
          ? ('EXPLORE' as const)
          : ('EXPLOIT' as const),
      }
    })

  const page = getDeckPage(orderedCards, input.cursor, input.pageSize)
  return ok({ items: [...page.items], nextCursor: page.nextCursor })
}
