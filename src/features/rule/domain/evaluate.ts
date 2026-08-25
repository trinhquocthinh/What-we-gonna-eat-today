import type { SystemTag } from '@/shared/domain/system-tag'

/** Một quy định đã đông cứng trong phiên. Cùng hình dạng với `GroupRuleDraft`
 *  nhưng KHÔNG dùng chung kiểu: nguồn của nó là `session_rules`, và ở v1.1 khi
 *  Preferred Rule xuất hiện thì hai bên sẽ tiến hoá khác nhau. */
export type RequiredRule = {
  readonly systemTag: SystemTag
  readonly minimumCount: number
}

/** Món trong nháp Final Meal, kèm System Tag **hiện tại** của nó (BR-052 — chứ
 *  không phải tag lúc Start; xem S3 §…). Không cần `dishId`: hàm này chỉ đếm. */
export type TaggedDish = {
  readonly systemTags: readonly SystemTag[]
}

export type RuleShortfall = {
  readonly systemTag: SystemTag
  readonly minimumCount: number
  readonly actual: number
  /** `minimumCount - actual`, luôn ≥ 1. Tính sẵn để presentation (E5-T9) không
   *  phải trừ lại — "Còn thiếu: 1 món canh" là con số này, không phải `minimumCount`. */
  readonly missing: number
}

export type RequiredEvaluation = {
  readonly satisfied: boolean
  /** Rỗng khi `satisfied`. Theo ĐÚNG thứ tự của `rules` đầu vào. */
  readonly shortfalls: readonly RuleShortfall[]
}

/**
 * SPEC-016 bước 2 + SDD §8 — đánh giá Required Rules trên một nháp Final Meal.
 *
 * **INDEPENDENT TAG COUNTING (TC-073).** Mỗi rule được đánh giá ĐỘC LẬP trên
 * toàn bộ danh sách món. Một món mang cả `MAIN` và `SOUP` (Bò kho bánh mì) đóng
 * góp trọn vẹn cho cả `Required MAIN` lẫn `Required SOUP`. SDD §8 gọi thẳng
 * tên thứ bị cấm: *"Tuyệt đối không phân bổ độc quyền kiểu slot allocation"*.
 *
 * Chỗ dễ sai nhất nằm ở cấu trúc chứ không ở phép đếm: nếu viết vòng lặp
 * NGOÀI theo `dishes` (mỗi món tìm một rule để "gán vào") thì slot allocation
 * xuất hiện gần như không tránh được. Vòng lặp ngoài PHẢI theo `rules`, và mỗi
 * lần lặp quét lại toàn bộ `dishes` từ đầu. N ≤ 5 rule × N ≤ 10 món — không có
 * gì để tối ưu ở đây.
 *
 * KHÔNG trả `boolean` trần: `E5-T9` phải in được "Còn thiếu: 1 món canh" ngay
 * trên nút chốt (không dùng modal), nên hàm phải nói THIẾU GÌ, THIẾU BAO NHIÊU.
 *
 * Rule Set rỗng → `satisfied: true` (TC-110). Không có quy định nghĩa là không
 * có gì để vi phạm — không phải "chưa cấu hình nên chặn cho chắc".
 */
export function evaluateRequired(input: {
  readonly rules: readonly RequiredRule[]
  readonly dishes: readonly TaggedDish[]
}): RequiredEvaluation {
  const shortfalls: RuleShortfall[] = []

  for (const rule of input.rules) {
    const actual = input.dishes.filter((dish) => dish.systemTags.includes(rule.systemTag)).length

    if (actual < rule.minimumCount) {
      shortfalls.push({
        systemTag: rule.systemTag,
        minimumCount: rule.minimumCount,
        actual,
        missing: rule.minimumCount - actual,
      })
    }
  }

  return { satisfied: shortfalls.length === 0, shortfalls }
}
