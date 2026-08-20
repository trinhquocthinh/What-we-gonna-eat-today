export type EatingDateRecord = {
  readonly globalDishId: string
  readonly eatingDate: string
}

export interface HistoryRepository {
  /**
   * SPEC-020's nguồn dữ liệu. Trả TẤT CẢ ngày ăn (không chỉ ngày gần nhất) —
   * `daysSinceLastEaten` (S1) tự lấy max, và cần đủ mảng để BR-046 Multi-source
   * Collapse có ý nghĩa (hai bản ghi cùng món cùng ngày từ hai Group).
   */
  findEatingDates(
    userId: string,
    globalDishIds: readonly string[],
  ): Promise<readonly EatingDateRecord[]>
}
