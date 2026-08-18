import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

/**
 * SPEC-015 — validation của "Lưu Final Meal nháp". Hàm thuần, không throw,
 * không chạm DB. Chỉ kiểm trùng lặp — kiểm "Dish còn Active trong pool" là
 * việc của tầng application (cần đọc DB), không thuộc hàm thuần này.
 */
export type MealDraft = {
  readonly dishIds: readonly string[]
}

export type MealDraftError = 'DUPLICATE_DISH'

export function readMealDraft(dishIds: readonly string[]): Result<MealDraft, MealDraftError> {
  if (new Set(dishIds).size !== dishIds.length) {
    return err('DUPLICATE_DISH')
  }
  return ok({ dishIds })
}
