/**
 * SPEC-017 — Sinh Default Eating History. Hàm thuần: nhận danh sách
 * Participant + danh sách Global Dish trong Final Meal + `decisionDate` +
 * `finalMealId` đã biết trước, trả về các dòng CẦN chèn — không tự đọc DB,
 * không tự sinh `id` (đó là việc của infrastructure, theo tiền lệ `uuidv7()`
 * tường minh ở mọi `db.batch()` trước).
 *
 * Ở v1.0 KHÔNG có ngoại lệ `Cannot Eat` (F15 chưa có) — SDD nói rõ nguyên
 * văn. Mọi Participant hiện tại (đã lọc ACTIVE/COMPLETED trước khi gọi hàm
 * này) đều nhận đủ mọi Dish trong Final Meal.
 */
export type DefaultEatingHistoryRow = {
  readonly userId: string
  readonly globalDishId: string
  readonly eatingDate: string
  readonly sourceFinalMealId: string
}

export function buildDefaultEatingHistory(input: {
  readonly participantUserIds: readonly string[]
  readonly globalDishIds: readonly string[]
  readonly decisionDate: string
  readonly finalMealId: string
}): DefaultEatingHistoryRow[] {
  const rows: DefaultEatingHistoryRow[] = []

  for (const userId of input.participantUserIds) {
    for (const globalDishId of input.globalDishIds) {
      rows.push({
        userId,
        globalDishId,
        eatingDate: input.decisionDate,
        sourceFinalMealId: input.finalMealId,
      })
    }
  }

  return rows
}
