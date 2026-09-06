import { isSystemTag, type SystemTag } from '@/shared/domain/system-tag'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

/**
 * SPEC-021 + E10-T1 — validation của "Cấu hình Group Rules". Hàm thuần, không
 * throw, không chạm DB, cùng khuôn `readSystemTags` (E2-T5) và `readMealDraft`
 * (E1-T10).
 *
 * Mang `ruleType` ('REQUIRED' | 'PREFERRED') theo DEC-067: nhóm có thể đặt
 * cả "phải có 1 món mặn" lẫn "nên có 2 món mặn".
 */
export type GroupRuleDraft = {
  readonly systemTag: SystemTag
  readonly minimumCount: number
  readonly ruleType: 'REQUIRED' | 'PREFERRED'
}

export type GroupRuleError = 'INVALID_SYSTEM_TAG' | 'INVALID_MINIMUM_COUNT' | 'DUPLICATE_RULE'

export type RawGroupRule = {
  readonly systemTag: string
  readonly minimumCount: number
  readonly ruleType?: string
}

/**
 * THỨ TỰ KIỂM CỐ ĐỊNH: tag hợp lệ → `minimumCount` hợp lệ → không trùng (ruleType, tag).
 * Cố định vì mỗi ca âm trong Test Cases Spec chỉ khẳng định ĐÚNG MỘT mã lỗi
 * (TC-086 `ERR_INVALID_MINIMUM_COUNT`, TC-087 `ERR_DUPLICATE_RULE`).
 *
 * Khoá khử trùng là `${ruleType}:${systemTag}`: một tag được phép xuất hiện
 * ở cả hai loại luật (ví dụ REQUIRED MAIN >= 1 và PREFERRED MAIN >= 2).
 *
 * `minimumCount` phải là SỐ NGUYÊN ≥ 1.
 *
 * Danh sách RỖNG là hợp lệ — TC-088: lưu `[]` nghĩa là gỡ hết quy định của Group.
 */
export function readGroupRules(
  rules: readonly RawGroupRule[],
): Result<GroupRuleDraft[], GroupRuleError> {
  const drafts: GroupRuleDraft[] = []
  const seen = new Set<string>()

  for (const rule of rules) {
    const ruleType = rule.ruleType ?? 'REQUIRED'
    if (ruleType !== 'REQUIRED' && ruleType !== 'PREFERRED') {
      return err('INVALID_SYSTEM_TAG')
    }
    if (!isSystemTag(rule.systemTag)) {
      return err('INVALID_SYSTEM_TAG')
    }
    if (!Number.isInteger(rule.minimumCount) || rule.minimumCount < 1) {
      return err('INVALID_MINIMUM_COUNT')
    }
    const dedupeKey = `${ruleType}:${rule.systemTag}`
    if (seen.has(dedupeKey)) {
      return err('DUPLICATE_RULE')
    }

    seen.add(dedupeKey)
    drafts.push({
      systemTag: rule.systemTag,
      minimumCount: rule.minimumCount,
      ruleType,
    })
  }

  return ok(drafts)
}
