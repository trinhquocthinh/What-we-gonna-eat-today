import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { InteractionAction, InteractionType } from '../domain/interaction'
import type { SelectionRepository } from './selection-repository'

export type RecordInteractionDeps = {
  readonly selection: SelectionRepository
}

export type RecordInteractionInput = {
  readonly sessionId: string
  readonly userId: string
  readonly groupDishId: string
  readonly action: InteractionAction
  readonly clientTimestamp: Date
}

/**
 * SPEC-012 — Ghi Session Interaction và Undo.
 *
 * Thứ tự kiểm BẤT BIẾN, dừng ở lỗi đầu tiên, đúng nguyên văn SDD: (1) Session
 * ACTIVE, (2) Participant chưa bị remove, (3) Dish còn Active trong pool.
 * Validate trước khi chạm tới bước ghi — không có bước nào ghi dữ liệu nếu
 * một trong ba bước trên thất bại (SDD §2.4).
 */
export async function recordInteraction(
  deps: RecordInteractionDeps,
  input: RecordInteractionInput,
): Promise<Result<{ effectiveInteraction: InteractionType | null }, Failure>> {
  const sessionState = await deps.selection.findSessionState(input.sessionId)
  if (sessionState !== 'ACTIVE') {
    return err(failure('ERR_SESSION_NOT_ACTIVE', { sessionId: input.sessionId }))
  }

  const participant = await deps.selection.findParticipant(input.sessionId, input.userId)
  if (participant === null || participant.state === 'REMOVED') {
    return err(failure('ERR_NOT_PARTICIPANT', { sessionId: input.sessionId }))
  }

  const dishActive = await deps.selection.isDishActiveInSession(input.sessionId, input.groupDishId)
  if (!dishActive) {
    return err(failure('ERR_DISH_NOT_IN_POOL', { groupDishId: input.groupDishId }))
  }

  const effectiveInteraction = await deps.selection.applyInteraction({
    sessionId: input.sessionId,
    participantId: participant.id,
    groupDishId: input.groupDishId,
    action: input.action,
    clientTimestamp: input.clientTimestamp,
  })

  return ok({ effectiveInteraction })
}
