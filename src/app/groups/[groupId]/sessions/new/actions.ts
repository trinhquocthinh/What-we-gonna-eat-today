'use server'

import { redirect } from 'next/navigation'

import { createSession } from '@/features/session/application/create-session'
import { startSession } from '@/features/session/application/start-session'
import { resolveDecisionDate } from '@/features/session/domain/decision-date'
import { drizzleSessionRepository } from '@/features/session/infrastructure/drizzle-session-repository'
import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import type { StartSessionFormState } from '@/features/session/presentation/components/start-session-screen'
import type { Failure } from '@/shared/errors'

import { requireGroupContext } from '../../group-access'

function toVietnameseBlockText(error: Failure): string | null {
  if (error.code === 'ERR_PARTICIPANT_NOT_MEMBER') {
    // Banner tổng — hàng lỗi riêng đã hiện tên cụ thể (xem screen component).
    return 'Bỏ những người đã rời nhóm ra trước khi bắt đầu.'
  }
  if (error.code === 'ERR_NOT_SESSION_CREATOR') {
    return 'Chỉ người mở phiên mới bắt đầu được.'
  }
  return 'Không mở được phiên. Thử lại giúp mình.'
}

export async function openSessionAction(
  groupId: string,
  _previousState: StartSessionFormState,
): Promise<StartSessionFormState> {
  const { group, user } = await requireGroupContext(groupId)
  const decisionDate = resolveDecisionDate(new Date(), group.timezone)

  const existingDraft = await drizzleSessionRepository.findDraftToday(groupId, decisionDate)

  let sessionId: string
  if (existingDraft !== null) {
    sessionId = existingDraft.id
  } else {
    const created = await createSession(
      { sessions: drizzleSessionRepository },
      { groupId, creatorUserId: user.id, decisionDate },
    )

    if (!created.ok) {
      // ERR_SESSION_EXISTS_TODAY — một phiên khác đã ACTIVE/FINALIZED hôm nay.
      // US-008: "điều hướng tôi tới phiên đang chạy", không phải lỗi bí ẩn.
      const blocking = await drizzleSessionRepository.findBlockingSessionToday(
        groupId,
        decisionDate,
      )
      if (blocking !== null) {
        redirect(`/sessions/${blocking.id}`)
      }
      return { blockText: 'Không mở được phiên. Thử lại giúp mình.', invalidParticipantIds: [] }
    }

    sessionId = created.value.id
  }

  const result = await startSession(
    {
      sessions: drizzleSessionRepository,
      findInvalidParticipants: ({ groupId: gid, userIds }) =>
        drizzleMembershipRepository.findInvalidMembers(gid, userIds),
    },
    sessionId,
    user.id,
  )

  if (!result.ok) {
    const invalidParticipantIds =
      result.error.code === 'ERR_PARTICIPANT_NOT_MEMBER'
        ? ((result.error.details?.['invalidParticipants'] as { userId: string }[] | undefined)?.map(
            (p) => p.userId,
          ) ?? [])
        : []

    return { blockText: toVietnameseBlockText(result.error), invalidParticipantIds }
  }

  redirect(`/sessions/${sessionId}`)
}
