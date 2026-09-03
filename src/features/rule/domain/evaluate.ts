import type { SystemTag } from '@/shared/domain/system-tag'

/** Một quy định trong phiên (đã snapshot từ Group Rule sang session_rules). */
export type SessionRule = {
  readonly systemTag: SystemTag
  readonly minimumCount: number
  readonly ruleType?: 'REQUIRED' | 'PREFERRED'
}

/** Tương thích ngược với các caller cũ nếu có */
export type RequiredRule = SessionRule

/** Món trong nháp Final Meal, kèm System Tag **hiện tại** của nó (BR-052 — chứ
 *  không phải tag lúc Start; xem S3 §…). Không cần `dishId`: hàm này chỉ đếm. */
export type TaggedDish = {
  readonly systemTags: readonly SystemTag[]
}

/** Vi phạm luật Bắt buộc — CHẶN chốt bữa (BR-052). Giữ nguyên hình dạng cũ
 *  để `ruleShortfallPhrase` và `TC-072` không phải đổi. */
export type RuleShortfall = {
  readonly systemTag: SystemTag
  readonly minimumCount: number
  readonly actual: number
  /** `minimumCount - actual`, luôn ≥ 1. Tính sẵn để presentation
   *  không phải trừ lại. */
  readonly missing: number
}

/**
 * Cảnh báo MỀM — không chặn (BR-014, BR-011). Union có thẻ vì hai loại khác
 * hình dạng: thiếu Preferred gắn với một System Tag, lệch Target Count thì
 * không gắn tag nào (Guide §1.3).
 */
export type RuleWarning =
  | ({ readonly kind: 'PREFERRED_SHORTFALL' } & RuleShortfall)
  | {
      readonly kind: 'TARGET_COUNT'
      readonly direction: 'OVER' | 'UNDER'
      readonly target: number
      readonly actual: number
    }

export type RuleEvaluation = {
  readonly blocking: readonly RuleShortfall[]
  readonly warnings: readonly RuleWarning[]
}

/**
 * SPEC-016 + SDD §8 + E10-T2 — đánh giá cả Required Rules và Preferred Rules,
 * cùng Target Dish Count trên một nháp Final Meal.
 *
 * **INDEPENDENT TAG COUNTING (TC-073, TC-139).** Mỗi rule được đánh giá ĐỘC LẬP
 * trên toàn bộ danh sách món. Một món mang cả `MAIN` và `SOUP` (Bò kho bánh mì)
 * đóng góp trọn vẹn cho cả `Required MAIN` lẫn `Preferred SOUP`. SDD §8 gọi thẳng
 * tên thứ bị cấm: *"Tuyệt đối không phân bổ độc quyền kiểu slot allocation"*.
 *
 * Chỗ dễ sai nhất nằm ở cấu trúc chứ không ở phép đếm: nếu viết vòng lặp
 * NGOÀI theo `dishes` (mỗi món tìm một rule để "gán vào") thì slot allocation
 * xuất hiện gần như không tránh được. Vòng lặp ngoài PHẢI theo `rules`, và mỗi
 * lần lặp quét lại toàn bộ `dishes` từ đầu.
 *
 * `N ≤ 10` luật × `N ≤ 10` món — không có gì để tối ưu ở đây.
 *
 * Thứ tự trong `warnings`: các `PREFERRED_SHORTFALL` theo đúng thứ tự `rules`
 * đầu vào, sau đó đến `TARGET_COUNT` (nếu có).
 */
export function evaluateRules(input: {
  readonly rules: readonly SessionRule[]
  readonly dishes: readonly TaggedDish[]
  readonly targetDishCount: number | null
}): RuleEvaluation {
  const blocking: RuleShortfall[] = []
  const warnings: RuleWarning[] = []

  for (const rule of input.rules) {
    const actual = input.dishes.filter((dish) => dish.systemTags.includes(rule.systemTag)).length

    if (actual < rule.minimumCount) {
      const shortfall: RuleShortfall = {
        systemTag: rule.systemTag,
        minimumCount: rule.minimumCount,
        actual,
        missing: rule.minimumCount - actual,
      }

      if (rule.ruleType === 'PREFERRED') {
        warnings.push({
          kind: 'PREFERRED_SHORTFALL',
          ...shortfall,
        })
      } else {
        blocking.push(shortfall)
      }
    }
  }

  if (input.targetDishCount !== null && input.dishes.length !== input.targetDishCount) {
    warnings.push({
      kind: 'TARGET_COUNT',
      direction: input.dishes.length > input.targetDishCount ? 'OVER' : 'UNDER',
      target: input.targetDishCount,
      actual: input.dishes.length,
    })
  }

  return { blocking, warnings }
}
