import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { SessionRepository } from './session-repository'

export type SetParticipantCompletedDeps = {
  readonly sessions: SessionRepository
}

export type SetParticipantCompletedInput = {
  readonly sessionId: string
  readonly userId: string
  readonly completed: boolean
}

/**
 * SPEC-013 — Đánh dấu Completed & Mở lại.
 *
 * KHÔNG kiểm "người gọi là Creator" — đây là hành động TỰ THÂN của chính
 * participant đang vuốt. SPEC-013's `Đầu vào` chính thức là `{sessionId,
 * completed}`, không có `userId` — vì US-014 xác nhận rõ: *"Given tôi đang
 * duyệt món, When bấm 'Tôi đã chọn xong'"* — người bấm và người bị đổi trạng
 * thái LUÔN là cùng một người. `userId` ở đây lấy từ danh tính đã xác thực
 * của caller (Route Handler truyền vào), không phải tham số người dùng tự
 * chọn.
 *
 * Idempotent có chủ ý: gửi `completed=true` khi đã `COMPLETED` không phải
 * lỗi — input là MỘT TRẠNG THÁI (`{completed: boolean}`), không phải một
 * LỆNH CHUYỂN TIẾP. Không có TC nào đòi lỗi cho ca này.
 */
export async function setParticipantCompleted(
  deps: SetParticipantCompletedDeps,
  input: SetParticipantCompletedInput,
): Promise<Result<{ state: 'ACTIVE' | 'COMPLETED' }, Failure>> {
  const session = await deps.sessions.findById(input.sessionId)

  if (session === null || session.state !== 'ACTIVE') {
    return err(failure('ERR_SESSION_NOT_ACTIVE', { sessionId: input.sessionId }))
  }

  const participantState = await deps.sessions.findParticipantState(input.sessionId, input.userId)
  if (participantState === null || participantState === 'REMOVED') {
    return err(failure('ERR_NOT_PARTICIPANT', { sessionId: input.sessionId }))
  }

  const nextState = input.completed ? 'COMPLETED' : 'ACTIVE'
  await deps.sessions.setParticipantState(input.sessionId, input.userId, nextState)

  return ok({ state: nextState })
}
