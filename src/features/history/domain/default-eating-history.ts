/**
 * SPEC-017 — Sinh Default Eating History. Hàm thuần: nhận danh sách
 * Participant + danh sách Global Dish trong Final Meal + `decisionDate` +
 * `finalMealId` đã biết trước, trả về các dòng CẦN chèn — không tự đọc DB,
 * không tự sinh `id` (đó là việc của infrastructure, theo tiền lệ `uuidv7()`
 * tường minh ở mọi `db.batch()` trước).
 *
 * BR-056 ngoại lệ (DEC-060): Bỏ qua các cặp `${userId}:${globalDishId}` trong
 * `cannotEatPairs` — người khai Cannot Eat món nào sẽ không nhận dòng lịch sử
 * ăn cho món đó.
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
  /**
   * BR-056 ngoại lệ (DEC-060). Khoá `${userId}:${globalDishId}` — cặp, không
   * phải một trong hai: người B không ăn được cá vẫn được ghi là đã ăn canh
   * trong cùng bữa đó.
   */
  readonly cannotEatPairs?: ReadonlySet<string>
}): DefaultEatingHistoryRow[] {
  const rows: DefaultEatingHistoryRow[] = []

  for (const userId of input.participantUserIds) {
    for (const globalDishId of input.globalDishIds) {
      if (input.cannotEatPairs?.has(`${userId}:${globalDishId}`)) {
        continue
      }
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
