import type { EatingRecord } from '../domain/eating-history'

export type EatingDateRecord = {
  readonly globalDishId: string
  readonly eatingDate: string
}

export type { EatingRecord } from '../domain/eating-history'

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

  /**
   * $H$ của SPEC-014 — với mỗi món, ĐẾM SỐ NGƯỜI trong `userIds` đã ăn nó
   * trong `windowDays` ngày tính lùi từ `referenceDate`.
   *
   * KHÁC `findEatingDates` (đọc mọi ngày ăn của MỘT người để tính $R$ của
   * SPEC-020). Đừng hiện thực method này bằng cách gọi `findEatingDates` N lần:
   * $H$ là một câu `COUNT(DISTINCT user_id) … GROUP BY global_dish_id`, và N
   * round-trip cho một Group 8 người trên deck 60 món là 8 lần đi về mạng để
   * lấy thứ Postgres trả trong một lần.
   *
   * `COUNT(DISTINCT user_id)`, không `COUNT(*)`: một người ăn cùng món hai
   * ngày trong tuần vẫn là MỘT người (BR-046 Multi-source Collapse).
   *
   * Món không ai ăn gần đây KHÔNG có mặt trong Map — người gọi dùng `?? 0`.
   */
  countRecentEatersByDish(input: {
    readonly userIds: readonly string[]
    readonly globalDishIds: readonly string[]
    readonly referenceDate: string
    readonly windowDays: number
  }): Promise<Map<string, number>>

  /**
   * SPEC-017 phía ĐỌC, cho S-12. Trả bản ghi PHẲNG kèm TÊN MÓN; gom theo ngày
   * là việc của `groupEatingHistory` ở `domain/`.
   *
   * Trả tên món chứ không chỉ `globalDishId` — khác hẳn `findEatingDates` và
   * `countRecentEatersByDish`, vốn để TÍNH TOÁN nên không cần tên. Tên lấy
   * bằng JOIN `global_dishes` ngay trong `history/infrastructure`: đọc một
   * BẢNG, không import feature `dish` (Guide §1.5).
   *
   * `from`/`to` là ngày lịch dạng `YYYY-MM-DD`, đã quy đổi theo timezone Group
   * bởi người gọi — cùng khuôn `countRecentEatersByDish`.
   */
  findEatingHistory(input: {
    readonly userId: string
    readonly from: string
    readonly to: string
  }): Promise<EatingRecord[]>
}
