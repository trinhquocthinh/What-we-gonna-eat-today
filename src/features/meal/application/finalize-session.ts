import { buildDefaultEatingHistory } from '@/features/history/domain/default-eating-history'
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { MealRepository } from './meal-repository'

export type FinalizeSessionDeps = {
  readonly meal: MealRepository
}

export type FinalizeSessionInput = {
  readonly sessionId: string
  readonly userId: string
}

/**
 * SPEC-016 RÚT GỌN — Finalize. Chạy đúng bước 1-4 và 7 nguyên văn SDD; **CỐ Ý
 * BỎ bước 5-6** (đánh giá Required Rule trên Session Rule đã snapshot) — Group
 * Rule/Session Rule chưa tồn tại (E5). Khi E5 landed, chèn bước rule evaluation
 * vào ĐÚNG GIỮA bước 4 và bước ghi cuối, không viết lại hàm này từ đầu.
 *
 * Bước 7 (tạo Final Meal, chuyển FINALIZED, sinh Eating History "trong cùng
 * transaction") = gọi `commitFinalize` — nguyên tử, xem `meal-repository.ts`.
 */
export async function finalizeSession(
  deps: FinalizeSessionDeps,
  input: FinalizeSessionInput,
): Promise<Result<{ finalMealId: string }, Failure>> {
  /* jscpd:ignore-start */
  // Bước 1: Session ACTIVE.
  const session = await deps.meal.findSessionForMeal(input.sessionId)
  if (session === null || session.state !== 'ACTIVE') {
    return err(failure('ERR_SESSION_NOT_ACTIVE', { sessionId: input.sessionId }))
  }

  // Bước 2: người gọi là Creator.
  if (session.creatorUserId !== input.userId) {
    return err(failure('ERR_NOT_SESSION_CREATOR', { sessionId: input.sessionId }))
  }
  /* jscpd:ignore-end */

  // Bước 3: nháp không rỗng.
  const draft = await deps.meal.getDraft(input.sessionId)
  if (draft === null || draft.groupDishIds.length === 0) {
    return err(failure('ERR_EMPTY_FINAL_MEAL', { sessionId: input.sessionId }))
  }

  // Bước 4: revalidate mọi Dish vẫn Active TẠI THỜI ĐIỂM NÀY — có thể đã đổi
  // kể từ lúc lưu nháp (TC-069: Admin gỡ Dish sau khi Creator đã chọn).
  const inactiveDishIds = await deps.meal.findInactiveDishIds(input.sessionId, draft.groupDishIds)
  if (inactiveDishIds.length > 0) {
    return err(failure('ERR_DISH_NOT_IN_POOL', { groupDishIds: inactiveDishIds }))
  }

  // BỎ bước 5-6 ở đây (E5-T3 chèn vào).

  // Bước 7 — chuẩn bị dữ liệu TRƯỚC transaction, đúng nguyên tắc "đọc trước,
  // ghi nguyên tử sau" đã dùng xuyên suốt S2-S5.
  const participantUserIds = await deps.meal.listActiveParticipantUserIds(input.sessionId)
  const globalDishIdByGroupDishId = await deps.meal.resolveGlobalDishIds(draft.groupDishIds)
  const globalDishIds = draft.groupDishIds
    .map((id) => globalDishIdByGroupDishId.get(id))
    .filter((id): id is string => id !== undefined)

  const eatingHistoryRows = buildDefaultEatingHistory({
    participantUserIds,
    globalDishIds,
    decisionDate: session.decisionDate,
    finalMealId: draft.finalMealId,
  })

  await deps.meal.commitFinalize({ sessionId: input.sessionId, eatingHistoryRows })

  return ok({ finalMealId: draft.finalMealId })
}
