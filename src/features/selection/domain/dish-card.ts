import type { InteractionType } from './interaction'

export type DishCard = {
  readonly dishId: string
  readonly globalDishId: string
  readonly name: string
  /** Luôn rỗng ở S5 — `group_dish_tags` là E2-T5, chưa tồn tại. */
  readonly systemTags: readonly string[]
  readonly effectiveInteraction: InteractionType | null
  /**
   * MỚI — S4. `null` = chưa từng ăn. Dữ liệu THÔ, không phải câu chữ — câu
   * chữ tiếng Việt ("Lần cuối ăn · N ngày trước") thuộc `presentation/`, đúng
   * kỷ luật đã giữ xuyên suốt dự án (domain không chứa chuỗi hiển thị).
   */
  readonly daysSinceLastEaten: number | null
  /**
   * E8-T2 — Luồng của thẻ: 'EXPLOIT' hoặc 'EXPLORE'.
   * Không lưu xuống DB (`session_decks`), được suy lại ở mỗi lần đọc.
   */
  readonly lane: 'EXPLOIT' | 'EXPLORE'
}
