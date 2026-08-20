import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { SessionRepository } from './session-repository'

export type AddParticipantDeps = {
  readonly sessions: SessionRepository
  /**
   * Truyền từ `app/` — `session` không được import `group`
   * (`eslint.config.mjs` → `ALLOWED_CROSS_FEATURE`). Cùng khuôn
   * `findInvalidParticipants` đã dùng ở `start-session.ts` (S1), nhưng đơn
   * giản hơn: chỉ cần biết ĐÚNG-hay-SAI cho MỘT user, không cần trả tên —
   * không có "hàng" nào để hiện lỗi ở slice backend-thuần này.
   */
  readonly isActiveGroupMember: (input: { groupId: string; userId: string }) => Promise<boolean>
}

export type AddParticipantInput = {
  readonly sessionId: string
  readonly userId: string
  readonly requestedByUserId: string
}

export type AddParticipantOutput = {
  readonly participantId: string
}

/**
 * SPEC-009 — Thêm Participant vào phiên. Một hàm cho cả hai subtask Master
 * Plan (E3-T3 "khi Draft" + E3-T4 "khi Active") — xem Implementation Guide
 * §1 cho lý do gộp.
 *
 * Thứ tự: session tồn tại & đúng trạng thái → người gọi là Creator → target
 * còn là Member → ghi (DB tự chặn trùng qua unique index, không SELECT trước).
 */
export async function addParticipant(
  deps: AddParticipantDeps,
  input: AddParticipantInput,
): Promise<Result<AddParticipantOutput, Failure>> {
  const session = await deps.sessions.findForStart(input.sessionId)

  if (session === null || (session.state !== 'DRAFT' && session.state !== 'ACTIVE')) {
    return err(failure('ERR_SESSION_NOT_ACTIVE', { sessionId: input.sessionId }))
  }

  if (session.creatorUserId !== input.requestedByUserId) {
    return err(failure('ERR_NOT_SESSION_CREATOR', { sessionId: input.sessionId }))
  }

  const isMember = await deps.isActiveGroupMember({
    groupId: session.groupId,
    userId: input.userId,
  })
  if (!isMember) {
    return err(failure('ERR_PARTICIPANT_NOT_MEMBER', { userId: input.userId }))
  }

  const outcome = await deps.sessions.addParticipant({
    sessionId: input.sessionId,
    userId: input.userId,
  })

  if (outcome.outcome === 'ALREADY_EXISTS') {
    return err(failure('ERR_PARTICIPANT_EXISTS', { userId: input.userId }))
  }

  return ok({ participantId: outcome.participantId })
}
