import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import { readGroupRules, type GroupRuleError, type RawGroupRule } from '../domain/group-rule'
import type { RuleRepository } from './rule-repository'

export type SetGroupRulesDeps = {
  readonly rules: RuleRepository
  /** Truyền từ `app/` — `features/rule` không được import `features/group`.
   *  Cùng khuôn `setSystemTags` (E2-T5) và `startSession` (E3-T1). */
  readonly assertAdmin: (input: {
    readonly userId: string
    readonly groupId: string
  }) => Promise<Result<void, Failure>>
}

export type SetGroupRulesInput = {
  readonly groupId: string
  readonly rules: readonly RawGroupRule[]
  readonly requestedByUserId: string
}

const ERROR_BY_DOMAIN: Record<GroupRuleError, Failure['code']> = {
  INVALID_SYSTEM_TAG: 'ERR_INVALID_SYSTEM_TAG',
  INVALID_MINIMUM_COUNT: 'ERR_INVALID_MINIMUM_COUNT',
  DUPLICATE_RULE: 'ERR_DUPLICATE_RULE',
}

/**
 * SPEC-021 — ghi đè toàn bộ Rule Set của một Group.
 *
 * Thứ tự BẤT BIẾN: quyền → validate thuần → ghi. Hai vòng đầu không chạm dữ
 * liệu, nên mọi nhánh lỗi đều không để lại thay đổi từng phần (SDD §2.4).
 */
export async function setGroupRules(
  deps: SetGroupRulesDeps,
  input: SetGroupRulesInput,
): Promise<Result<void, Failure>> {
  // TC-089 — BR-010: chỉ Group Admin.
  const access = await deps.assertAdmin({
    userId: input.requestedByUserId,
    groupId: input.groupId,
  })
  if (!access.ok) {
    return access
  }

  // TC-086, TC-087.
  const parsed = readGroupRules(input.rules)
  if (!parsed.ok) {
    return err(failure(ERROR_BY_DOMAIN[parsed.error], { field: 'rules' }))
  }

  // TC-085, TC-088.
  await deps.rules.replaceGroupRules(input.groupId, parsed.value)

  return ok(undefined)
}
