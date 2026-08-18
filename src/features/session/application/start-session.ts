import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { SessionRepository, SessionSummary } from './session-repository'

export type StartSessionDeps = {
  readonly sessions: SessionRepository
}

/**
 * SPEC-008 rút gọn — chỉ chuyển DRAFT sang ACTIVE, dựa vào partial unique
 * index để bắt BR-025 (TC-107).
 *
 * CỐ Ý CHƯA CÓ ở S4 (đều là E3-T1, xem Implementation Guide §0):
 * - kiểm người gọi là Creator (`ERR_NOT_SESSION_CREATOR`, TC-034)
 * - kiểm Participant vẫn là Group Member (`ERR_PARTICIPANT_NOT_MEMBER`, TC-031)
 * - snapshot Group Rule → Session Rule (SPEC-022, TC-030, TC-035)
 *
 * Trạng thái "không phải DRAFT" (TC-033) là hệ quả TỰ NHIÊN của mệnh đề WHERE
 * trong `startDraft`, không phải một bước revalidate riêng được thêm có chủ ý
 * — không thể triển khai UPDATE có điều kiện mà KHÔNG xử lý trường hợp "không
 * khớp điều kiện", nên `ERR_SESSION_NOT_DRAFT` ở đây không tính là mượn phạm
 * vi của E3-T1.
 */
export async function startSession(
  deps: StartSessionDeps,
  sessionId: string,
): Promise<Result<SessionSummary, Failure>> {
  const outcome = await deps.sessions.startDraft(sessionId)

  if (outcome.outcome === 'NOT_DRAFT') {
    return err(failure('ERR_SESSION_NOT_DRAFT', { sessionId }))
  }

  if (outcome.outcome === 'ALREADY_EXISTS_TODAY') {
    return err(failure('ERR_SESSION_EXISTS_TODAY', { sessionId }))
  }

  return ok(outcome.session)
}
