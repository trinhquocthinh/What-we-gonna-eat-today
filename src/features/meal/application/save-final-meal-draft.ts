import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import { readMealDraft } from '../domain/meal-draft'
import type { MealRepository } from './meal-repository'

export type SaveFinalMealDraftDeps = {
  readonly meal: MealRepository
}

export type SaveFinalMealDraftInput = {
  readonly sessionId: string
  readonly userId: string
  readonly dishIds: readonly string[]
}

/**
 * SPEC-015 — Dựng Final Meal nháp.
 *
 * Thứ tự BẤT BIẾN: validate trùng lặp (thuần) → Session ACTIVE + Creator
 * (đọc DB) → mọi Dish còn Active trong pool (đọc DB) → ghi. Không bước nào
 * ghi dữ liệu nếu một bước trước đó thất bại.
 */
export async function saveFinalMealDraft(
  deps: SaveFinalMealDraftDeps,
  input: SaveFinalMealDraftInput,
): Promise<Result<{ finalMealId: string }, Failure>> {
  const draft = readMealDraft(input.dishIds)
  if (!draft.ok) {
    return err(failure('ERR_DUPLICATE_DISH_IN_MEAL', { sessionId: input.sessionId }))
  }

  const session = await deps.meal.findSessionForMeal(input.sessionId)
  if (session === null || session.state !== 'ACTIVE') {
    return err(failure('ERR_SESSION_NOT_ACTIVE', { sessionId: input.sessionId }))
  }
  if (session.creatorUserId !== input.userId) {
    return err(failure('ERR_NOT_SESSION_CREATOR', { sessionId: input.sessionId }))
  }

  if (draft.value.dishIds.length > 0) {
    const inactiveDishIds = await deps.meal.findInactiveDishIds(
      input.sessionId,
      draft.value.dishIds,
    )
    if (inactiveDishIds.length > 0) {
      return err(failure('ERR_DISH_NOT_IN_POOL', { groupDishIds: inactiveDishIds }))
    }
  }

  const saved = await deps.meal.saveDraft(input.sessionId, draft.value.dishIds)
  return ok(saved)
}
