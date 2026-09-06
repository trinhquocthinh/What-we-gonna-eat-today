import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { PreferenceRepository } from './preference-repository'

export type ResetImplicitPreferenceDeps = {
  readonly preferences: PreferenceRepository
}

export type ResetImplicitPreferenceInput = {
  readonly userId: string
}

export type ResetImplicitPreferenceResult = {
  readonly implicitResetAt: string
}

/**
 * SPEC-040 / BR-038 — "Quên sở thích đã học".
 *
 * Ghi một MỐC THỜI GIAN, không xoá dòng nào. `SPEC-037` bỏ qua mọi phiên có
 * `decision_date` trước mốc, còn `interactions` giữ nguyên số dòng (`BR-061`,
 * `TC-171`).
 *
 * **Chỉ reset $I$.** Like/Dislike, Cannot Eat, Blacklist, Whitelist giữ nguyên
 * — chúng là thứ người dùng tự KHAI, không phải thứ hệ thống SUY RA, nên không
 * thuộc phạm vi "quên" (`TC-173`). Việc đó đúng theo cấu trúc ở đây: use case
 * này không chạm tới bảng nào khác, và không có nhánh nào để quên chạm.
 *
 * Không tham số ngoài `userId` — `SPEC-040` ghi đầu vào là `{ }`, người gọi
 * luôn là chính chủ.
 */
export async function resetImplicitPreference(
  deps: ResetImplicitPreferenceDeps,
  input: ResetImplicitPreferenceInput,
): Promise<Result<ResetImplicitPreferenceResult, Failure>> {
  if (typeof input.userId !== 'string' || input.userId.trim() === '') {
    return err(failure('ERR_VALIDATION', { field: 'userId' }))
  }

  const result = await deps.preferences.resetImplicitPreference(input.userId)

  return ok(result)
}
