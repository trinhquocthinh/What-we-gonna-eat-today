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
 * Chỉ đổi khi R > 0 (vừa ăn trong cửa sổ cooldown) — đúng quyết định đã chốt
 * lúc lên kế hoạch S1. Ngưỡng lấy TRỰC TIẾP từ `RANKING_CONFIG`, không hardcode
 * lại số 7 — một nguồn sự thật duy nhất (Ranking Spec §1 nguyên tắc 4).
 */
export function formatExplanation(daysSinceLastEaten: number | null): string {
  if (
    daysSinceLastEaten !== null &&
    daysSinceLastEaten < RANKING_CONFIG.history.cooldownWindowDays
  ) {
    return 'Vừa ăn gần đây.'
  }
  return 'Món này đang có trong danh mục của nhóm.'
}
