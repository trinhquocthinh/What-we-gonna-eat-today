import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { ConstraintKind } from '../domain/explicit-preference'
import type { PreferenceRepository } from './preference-repository'

export type SetDishConstraintDeps = {
  readonly preferences: PreferenceRepository
}

export type SetDishConstraintInput = {
  readonly userId: string
  readonly globalDishId: string
  readonly kind: ConstraintKind
  readonly enabled: boolean
}

export type SetDishConstraintResult = {
  readonly removedInteraction: boolean
}

const VALID_KINDS: readonly ConstraintKind[] = ['CANNOT_EAT', 'BLACKLIST', 'HISTORY_WHITELIST']

/**
 * BR-034 / BR-035 / BR-036 — bật/tắt một trong ba cờ cá nhân
 * (SPEC-024, SPEC-038, SPEC-039).
 *
 * Use case mỏng: không kiểm tra sự tồn tại của dish trong DB ở tầng use case
 * vì khoá ngoại DB đã đảm bảo tính toàn vẹn, tránh tạo cửa sổ race condition.
 *
 * Ba cờ ĐỘC LẬP với nhau — bật cái này không tắt cái kia. Việc rẽ nhánh theo
 * hệ quả (chỉ `CANNOT_EAT` mới xoá lượt vuốt) nằm ở tầng infrastructure, vì đó
 * là chuyện của đường ghi chứ không phải của luật nghiệp vụ.
 */
export async function setDishConstraint(
  deps: SetDishConstraintDeps,
  input: SetDishConstraintInput,
): Promise<Result<SetDishConstraintResult, Failure>> {
  /* jscpd:ignore-start */
  if (typeof input.userId !== 'string' || input.userId.trim() === '') {
    return err(failure('ERR_VALIDATION', { field: 'userId' }))
  }

  if (typeof input.globalDishId !== 'string' || input.globalDishId.trim() === '') {
    return err(failure('ERR_VALIDATION', { field: 'globalDishId' }))
  }
  /* jscpd:ignore-end */

  if (!VALID_KINDS.includes(input.kind)) {
    return err(failure('ERR_VALIDATION', { field: 'kind' }))
  }

  if (typeof input.enabled !== 'boolean') {
    return err(failure('ERR_VALIDATION', { field: 'enabled' }))
  }

  const result = await deps.preferences.setConstraint({
    userId: input.userId,
    globalDishId: input.globalDishId,
    kind: input.kind,
    enabled: input.enabled,
  })

  return ok(result)
}
