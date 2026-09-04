import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { PreferenceRepository } from './preference-repository'

export type SetDishConstraintDeps = {
  readonly preferences: PreferenceRepository
}

export type SetDishConstraintInput = {
  readonly userId: string
  readonly globalDishId: string
  readonly cannotEat: boolean
}

export type SetDishConstraintResult = {
  readonly removedInteraction: boolean
}

/**
 * BR-034 — Bật/tắt ràng buộc Cannot Eat cho món ăn (SPEC-024).
 *
 * Use case mỏng: không kiểm tra sự tồn tại của dish trong DB ở tầng use case
 * vì khoá ngoại DB đã đảm bảo tính toàn vẹn, tránh tạo cửa sổ race condition.
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

  if (typeof input.cannotEat !== 'boolean') {
    return err(failure('ERR_VALIDATION', { field: 'cannotEat' }))
  }

  const result = await deps.preferences.setConstraint({
    userId: input.userId,
    globalDishId: input.globalDishId,
    cannotEat: input.cannotEat,
  })

  return ok(result)
}
