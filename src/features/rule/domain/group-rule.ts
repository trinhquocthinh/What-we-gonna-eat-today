import { isSystemTag, type SystemTag } from '@/shared/domain/system-tag'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

/**
 * SPEC-021 — validation của "Cấu hình Group Required Rules". Hàm thuần, không
 * throw, không chạm DB, cùng khuôn `readSystemTags` (E2-T5) và `readMealDraft`
 * (E1-T10).
 *
 * KHÔNG có `ruleType` và `overridable`: v1.0 chỉ đặt Required Rule, và tầng
 * `domain/` không nên mang một trường mà mọi giá trị của nó đều bằng nhau.
 * `infrastructure/` đóng đinh `ruleType: 'REQUIRED'` khi ghi (Guide §1.2).
 */
export type GroupRuleDraft = {
  readonly systemTag: SystemTag
  readonly minimumCount: number
}

export type GroupRuleError = 'INVALID_SYSTEM_TAG' | 'INVALID_MINIMUM_COUNT' | 'DUPLICATE_RULE'

export type RawGroupRule = {
  readonly systemTag: string
  readonly minimumCount: number
}

/**
 * THỨ TỰ KIỂM CỐ ĐỊNH: tag hợp lệ → `minimumCount` hợp lệ → không trùng tag.
 * Cố định vì mỗi ca âm trong Test Cases Spec chỉ khẳng định ĐÚNG MỘT mã lỗi
 * (TC-086 `ERR_INVALID_MINIMUM_COUNT`, TC-087 `ERR_DUPLICATE_RULE`); nếu thứ
 * tự trôi thì một input sai hai chỗ sẽ đổi mã lỗi tuỳ phiên bản.
 *
 * `minimumCount` phải là SỐ NGUYÊN ≥ 1: `1.5` không lọt được qua
 * `check(minimum_count >= 1)` của DB nhưng cũng chẳng có nghĩa gì
 * ("phải có ít nhất 1.5 món canh"), nên chặn ở đây với thông điệp tử tế thay
 * vì để Postgres ném ra một lỗi kiểu.
 *
 * Danh sách RỖNG là hợp lệ, không phải ca lỗi — TC-088: lưu `[]` nghĩa là gỡ
 * hết quy định của Group.
 */
export function readGroupRules(
  rules: readonly RawGroupRule[],
): Result<GroupRuleDraft[], GroupRuleError> {
  const drafts: GroupRuleDraft[] = []
  const seen = new Set<string>()

  for (const rule of rules) {
    if (!isSystemTag(rule.systemTag)) {
      return err('INVALID_SYSTEM_TAG')
    }
    if (!Number.isInteger(rule.minimumCount) || rule.minimumCount < 1) {
      return err('INVALID_MINIMUM_COUNT')
    }
    if (seen.has(rule.systemTag)) {
      return err('DUPLICATE_RULE')
    }

    seen.add(rule.systemTag)
    drafts.push({ systemTag: rule.systemTag, minimumCount: rule.minimumCount })
  }

  return ok(drafts)
}
