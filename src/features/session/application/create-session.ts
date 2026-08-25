import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { SessionRepository, SessionSummary } from './session-repository'

export type CreateSessionDeps = {
  readonly sessions: SessionRepository
  /** Truyền từ `app/` — `session` không được import `dish`. Cùng khuôn
   *  `findInvalidParticipants` của `startSession`. */
  readonly countActiveDishes: (groupId: string) => Promise<number>
}

export type CreateSessionInput = {
  readonly groupId: string
  readonly creatorUserId: string
  /**
   * Đã tính sẵn bởi caller qua `resolveDecisionDate(now, group.timezone)`
   * (SPEC-018). `session` không import được `group` nên không tự tính ở đây —
   * xem Implementation Guide §3.1.
   */
  readonly decisionDate: string
}

/**
 * SPEC-007 — Tạo Session.
 *
 * KHÔNG gọi `assertGroupAccess` ở đây: guard đó chạy ở `app/`, trước khi use
 * case này được gọi (Tech Spec §5). S4 chưa có route nào gọi guard thật — sẽ
 * tới ở E1-T8/E3.
 */
export async function createSession(
  deps: CreateSessionDeps,
  input: CreateSessionInput,
): Promise<Result<SessionSummary, Failure>> {
  // BR/SPEC-007 — nhóm rỗng không mở phiên được. Kiểm TRƯỚC
  // `findBlockingSessionToday`: "nhà chưa có món nào" là lỗi cơ bản hơn "hôm
  // nay đã có phiên rồi", và trả đúng lỗi cơ bản nhất là cách người dùng biết
  // phải làm gì tiếp.
  //
  // Rào ở UI đã có từ E1 (nút đổi thành "Thêm món đầu tiên"), nhưng đó là rào
  // giao diện: gõ tay `/groups/<id>/sessions/new` vẫn đi qua được. E6-T4 đóng
  // nốt đường đó.
  if ((await deps.countActiveDishes(input.groupId)) === 0) {
    return err(failure('ERR_GROUP_HAS_NO_DISH', { groupId: input.groupId }))
  }

  const blocking = await deps.sessions.findBlockingSessionToday(input.groupId, input.decisionDate)

  if (blocking !== null) {
    return err(
      failure('ERR_SESSION_EXISTS_TODAY', {
        groupId: input.groupId,
        decisionDate: input.decisionDate,
      }),
    )
  }

  const created = await deps.sessions.createDraftWithCreatorParticipant({
    groupId: input.groupId,
    decisionDate: input.decisionDate,
    creatorUserId: input.creatorUserId,
  })

  return ok(created)
}
