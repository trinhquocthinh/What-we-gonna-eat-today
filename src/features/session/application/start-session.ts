import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { SessionRepository, SessionSummary } from './session-repository'

export type InvalidParticipant = {
  readonly userId: string
  readonly displayName: string
}

export type StartSessionDeps = {
  readonly sessions: SessionRepository
  /**
   * Truyền từ `app/` — `session` không được import `group`
   * (`eslint.config.mjs` → `ALLOWED_CROSS_FEATURE` không có mục cho `session`
   * theo cả hai chiều). Cùng khuôn `assertAdmin` đã dùng ở E2-S3
   * (`set-system-tags.ts`) để feature `dish` gọi được `assertGroupAccess`.
   */
  readonly findInvalidParticipants: (input: {
    readonly groupId: string
    readonly userIds: readonly string[]
  }) => Promise<readonly InvalidParticipant[]>
}

/**
 * SPEC-008 — 4 bước revalidate, theo đúng thứ tự, dừng ở lỗi đầu tiên.
 *
 * Bước 5 (snapshot Group Rule → Session Rule) KHÔNG thuộc phạm vi hàm này —
 * bảng `group_rules`/`session_rules` chưa tồn tại (tạo ở E5-T1, sau cả E3).
 * `E5-T4` sẽ chèn bước snapshot vào ĐÚNG giao dịch `startDraft` bên dưới khi
 * bảng đã có. Xem Implementation Guide §1 cho phần đính chính đầy đủ.
 *
 * Bước 3 ("Creator vẫn Member") và bước 4 ("mọi Participant vẫn Member") gộp
 * thành MỘT lệnh gọi `findInvalidParticipants` trên toàn bộ
 * `participantUserIds` — Creator luôn nằm trong danh sách đó (SPEC-007:
 * `createDraftWithCreatorParticipant` đã thêm Creator làm Participant đầu
 * tiên, BR-020), nên bước 3 chỉ là một trường hợp riêng của bước 4, không cần
 * hai lệnh khác nhau.
 *
 * `startDraft` ở cuối vẫn là lưới an toàn chống race — nếu state đổi giữa lúc
 * đọc (`findForStart`) và lúc ghi, UPDATE có điều kiện vẫn đúng, không dựa
 * vào 4 bước đọc phía trên để đảm bảo tính đúng đắn dưới tải đồng thời.
 */
export async function startSession(
  deps: StartSessionDeps,
  sessionId: string,
  callerId: string,
): Promise<Result<SessionSummary, Failure>> {
  const session = await deps.sessions.findForStart(sessionId)

  if (session !== null) {
    if (session.state !== 'DRAFT') {
      return err(failure('ERR_SESSION_NOT_DRAFT', { sessionId }))
    }

    if (session.creatorUserId !== callerId) {
      return err(failure('ERR_NOT_SESSION_CREATOR', { sessionId }))
    }

    const invalid = await deps.findInvalidParticipants({
      groupId: session.groupId,
      userIds: session.participantUserIds,
    })
    if (invalid.length > 0) {
      return err(failure('ERR_PARTICIPANT_NOT_MEMBER', { invalidParticipants: invalid }))
    }
  }

  const outcome = await deps.sessions.startDraft(sessionId)

  if (outcome.outcome === 'NOT_DRAFT') {
    return err(failure('ERR_SESSION_NOT_DRAFT', { sessionId }))
  }

  if (outcome.outcome === 'ALREADY_EXISTS_TODAY') {
    return err(failure('ERR_SESSION_EXISTS_TODAY', { sessionId }))
  }

  return ok(outcome.session)
}
