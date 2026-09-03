'use server'

import { redirect } from 'next/navigation'

import { createSession } from '@/features/session/application/create-session'
import { startSession } from '@/features/session/application/start-session'
import { resolveDecisionDate } from '@/features/session/domain/decision-date'
import { drizzleDishRepository } from '@/features/dish/infrastructure/drizzle-dish-repository'
import { drizzleSessionRepository } from '@/features/session/infrastructure/drizzle-session-repository'
import {
  drizzleGroupRepository,
  drizzleMembershipRepository,
} from '@/features/group/infrastructure/drizzle-group-repository'
import type { StartSessionFormState } from '@/features/session/presentation/components/start-session-screen'
import { messageFor } from '@/shared/errors'
import { isSystemTag, type SystemTag } from '@/shared/domain/system-tag'

import { requireGroupContext } from '../../group-access'

export async function openSessionAction(
  groupId: string,
  _previousState: StartSessionFormState,
  formData?: FormData,
): Promise<StartSessionFormState> {
  const { group, user } = await requireGroupContext(groupId)
  const decisionDate = resolveDecisionDate(new Date(), group.timezone)

  const existingDraft = await drizzleSessionRepository.findDraftToday(groupId, decisionDate)

  let sessionId: string
  if (existingDraft !== null) {
    sessionId = existingDraft.id
  } else {
    const created = await createSession(
      {
        sessions: drizzleSessionRepository,
        countActiveDishes: (gid) => drizzleDishRepository.countActiveInGroup(gid),
      },
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
      return { blockText: messageFor(created.error), invalidParticipantIds: [] }
    }

    sessionId = created.value.id
  }

  // CẢ NHÀ vào phiên, không riêng người bấm nút (SPEC-009 / F06). Chạy cho cả
  // Draft mới lẫn Draft dùng lại, và chạy TRƯỚC `startSession` để bước
  // revalidate của nó soi đúng tập Participant thật sẽ vuốt.
  const members = await drizzleMembershipRepository.listActiveMembers(groupId)
  await drizzleSessionRepository.ensureParticipants(
    sessionId,
    members.map((m) => m.userId),
  )

  const deckMode = formData?.get('deckMode') === 'COURSE' ? 'COURSE' : 'FREE'
  const rawCourses = formData?.getAll('courses') ?? []
  const courses: SystemTag[] = rawCourses
    .filter((c): c is string => typeof c === 'string')
    .filter(isSystemTag)

  const result = await startSession(
    {
      sessions: drizzleSessionRepository,
      findInvalidParticipants: ({ groupId: gid, userIds }) =>
        drizzleMembershipRepository.findInvalidMembers(gid, userIds),
      findGroupTargetDishCount: async (gid) => {
        const found = await drizzleGroupRepository.findById(gid)
        return found?.targetDishCount ?? null
      },
    },
    sessionId,
    user.id,
    { deckMode, courses },
  )

  if (!result.ok) {
    const invalidParticipantIds =
      result.error.code === 'ERR_PARTICIPANT_NOT_MEMBER'
        ? ((result.error.details?.['invalidParticipants'] as { userId: string }[] | undefined)?.map(
            (p) => p.userId,
          ) ?? [])
        : []

    return { blockText: messageFor(result.error), invalidParticipantIds }
  }

  redirect(`/sessions/${sessionId}`)
}
