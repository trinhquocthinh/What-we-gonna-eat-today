import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { PreferenceKind } from '../domain/explicit-preference'
import type { PreferenceRepository } from './preference-repository'

export type SetDishPreferenceDeps = {
  readonly preferences: PreferenceRepository
}

export type SetDishPreferenceInput = {
  readonly userId: string
  readonly globalDishId: string
  readonly kind: PreferenceKind | null
}

const VALID_KINDS: readonly (PreferenceKind | null)[] = ['LIKE', 'DISLIKE', null]

/**
 * BR-037 — Đặt sở thích Explicit Preference cho món ăn (SPEC-025).
 *
 * `kind: null` biểu diễn trạng thái Neutral (xoá dòng khỏi bảng `user_dish_preferences`).
 */
export async function setDishPreference(
  deps: SetDishPreferenceDeps,
  input: SetDishPreferenceInput,
): Promise<Result<void, Failure>> {
  if (typeof input.userId !== 'string' || input.userId.trim() === '') {
    return err(failure('ERR_VALIDATION', { field: 'userId' }))
  }

  if (typeof input.globalDishId !== 'string' || input.globalDishId.trim() === '') {
    return err(failure('ERR_VALIDATION', { field: 'globalDishId' }))
  }

  if (!VALID_KINDS.includes(input.kind)) {
    return err(failure('ERR_VALIDATION', { field: 'kind' }))
  }

  await deps.preferences.setPreference({
    userId: input.userId,
    globalDishId: input.globalDishId,
    kind: input.kind,
  })

  return ok(undefined)
}
