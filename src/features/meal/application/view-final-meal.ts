import type { FinalMealView, MealRepository } from './meal-repository'

/**
 * SPEC-016 phía đọc. KHÔNG guard ở đây: `assertGroupAccess` chạy ở `app/`
 * trước khi use case được gọi (Tech Spec §5), và MỌI Member của Group đều
 * được xem mâm cơm nhà mình — `BR-050` không hạn chế quyền xem, chỉ hạn chế
 * quyền chọn (Creator).
 */
export async function viewFinalMeal(
  deps: { readonly meal: MealRepository },
  sessionId: string,
): Promise<FinalMealView | null> {
  return deps.meal.findFinalMeal(sessionId)
}
