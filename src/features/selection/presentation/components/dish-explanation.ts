import type { DishLane } from '../../domain/dish-card'
import { RANKING_CONFIG } from '../../domain/ranking-config'

/**
 * S4 — lấp chỗ giả `NEVER_EATEN_LABEL`/`GENERIC_EXPLANATION` mà S1 đã hẹn.
 * Chữ hiển thị tiếng Việt, đúng chỗ (presentation, không phải domain) —
 * cùng nguyên tắc `system-tag-label.ts` (E2), `participant-status.ts` (E3).
 */
export function formatLastEatenLabel(daysSinceLastEaten: number | null): string {
  if (daysSinceLastEaten === null) {
    return 'Chưa từng ăn'
  }
  if (daysSinceLastEaten === 0) {
    return 'Lần cuối ăn · hôm nay'
  }
  if (daysSinceLastEaten === 1) {
    return 'Lần cuối ăn · hôm qua'
  }
  return `Lần cuối ăn · ${daysSinceLastEaten} ngày trước`
}

/**
 * E8-T3 — Format câu giải thích lý do cho thẻ dựa vào `daysSinceLastEaten` và `lane`.
 * Ưu tiên từ cụ thể tới chung:
 * 1. Cooldown (< 7 ngày): 'Vừa ăn gần đây.'
 * 2. Explore lane:
 *    - d === null: 'Nhà mình chưa ăn món này bao giờ.'
 *    - d !== null: `Đã ${daysSinceLastEaten} ngày chưa ăn — thử đổi vị?`
 * 3. Default: 'Món này đang có trong danh mục của nhóm.'
 *
 * Ngưỡng lấy TRỰC TIẾP từ `RANKING_CONFIG`, không hardcode 7 hay 30 (Ranking Spec §1 nguyên tắc 4).
 */
export function formatExplanation(daysSinceLastEaten: number | null, lane: DishLane): string {
  if (
    daysSinceLastEaten !== null &&
    daysSinceLastEaten < RANKING_CONFIG.history.cooldownWindowDays
  ) {
    return 'Vừa ăn gần đây.'
  }
  if (lane === 'EXPLORE') {
    return daysSinceLastEaten === null
      ? 'Nhà mình chưa ăn món này bao giờ.'
      : `Đã ${daysSinceLastEaten} ngày chưa ăn — thử đổi vị?`
  }
  return 'Món này đang có trong danh mục của nhóm.'
}
