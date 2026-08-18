import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import { getDeckPage } from '../domain/deck-page'
import type { DishCard, SelectionRepository } from './selection-repository'

export type ListDeckDeps = {
  readonly selection: SelectionRepository
}

export type ListDeckInput = {
  readonly sessionId: string
  readonly userId: string
  readonly cursor: number
  readonly pageSize: number
}

export type ListDeckResult = {
  readonly items: DishCard[]
  readonly nextCursor: number | null
}

const ACCEPTED_PARTICIPANT_STATES = ['ACTIVE', 'COMPLETED'] as const

/**
 * SPEC-011 — Lấy trang deck.
 *
 * "Người gọi phải là Participant ACTIVE hoặc COMPLETED" — kiểm bằng danh sách
 * TRẮNG (chấp nhận đúng hai state), khác cách SPEC-012 diễn đạt ("chưa bị
 * remove" — danh sách ĐEN, từ chối đúng một state). Hai cách viết khác nhau
 * dù `ParticipantState` chỉ có 3 giá trị nên về logic tương đương — giữ đúng
 * cách diễn đạt của TỪNG SPEC để dễ đối chiếu ngược lại tài liệu, không gộp
 * thành một hàm `isActiveParticipant` dùng chung cho cả hai.
 */
export async function listDeck(
  deps: ListDeckDeps,
  input: ListDeckInput,
): Promise<Result<ListDeckResult, Failure>> {
  const participant = await deps.selection.findParticipant(input.sessionId, input.userId)

  if (
    participant === null ||
    !ACCEPTED_PARTICIPANT_STATES.includes(participant.state as 'ACTIVE' | 'COMPLETED')
  ) {
    return err(failure('ERR_NOT_PARTICIPANT', { sessionId: input.sessionId }))
  }

  const eligible = await deps.selection.listEligibleDishCards(input.sessionId, participant.id)
  const page = getDeckPage(eligible, input.cursor, input.pageSize)

  return ok({ items: [...page.items], nextCursor: page.nextCursor })
}
