import type { HistoryRepository } from '@/features/history/application/history-repository'
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import { rankSession, type SessionRankingResult } from '../domain/ranking'
import { RANKING_CONFIG } from '../domain/ranking-config'
import type { SelectionRepository } from './selection-repository'

export type ListSessionRankingDeps = {
  readonly selection: SelectionRepository
  readonly history: HistoryRepository
}

export type ListSessionRankingInput = {
  readonly sessionId: string
  readonly userId: string
  /** `session.decisionDate` — mốc tính "gần đây" của $H$. Truyền vào chứ không
   *  đọc `new Date()`: cùng nguyên tắc đã áp cho `computeRecencyPenalty` ở
   *  E4-T1, và là điều kiện để test không phải mock thời gian. */
  readonly referenceDate: string
}

/**
 * SPEC-014 — bảng xếp hạng đồng thuận cho Creator.
 *
 * "Yêu cầu Creator" (SPEC-014 đầu vào) → TC-062. Kiểm quyền TRƯỚC mọi lần đọc
 * dữ liệu: một Member không phải Creator không được biết cả nhà đang nghiêng
 * về món gì trước khi bữa được chốt.
 *
 * BR-054 — Rule KHÔNG tham gia vào điểm. Bảng này phản ánh trung thực sở thích;
 * Rule Engine chỉ chạy lúc Finalize. Không có `evaluateRequired` ở đây, và
 * đừng thêm vào.
 */
export async function listSessionRanking(
  deps: ListSessionRankingDeps,
  input: ListSessionRankingInput,
): Promise<Result<SessionRankingResult, Failure>> {
  const session = await deps.selection.findSessionForRanking(input.sessionId)
  if (session === null) {
    return err(failure('ERR_SESSION_NOT_ACTIVE', { sessionId: input.sessionId }))
  }
  if (session.creatorUserId !== input.userId) {
    return err(failure('ERR_NOT_SESSION_CREATOR', { sessionId: input.sessionId }))
  }

  const [counts, participantUserIds] = await Promise.all([
    deps.selection.countInteractionsByDish(input.sessionId),
    deps.selection.listRankingParticipantUserIds(input.sessionId),
  ])

  const recentEaters = await deps.history.countRecentEatersByDish({
    userIds: participantUserIds,
    globalDishIds: counts.map((row) => row.globalDishId),
    referenceDate: input.referenceDate,
    windowDays: RANKING_CONFIG.history.cooldownWindowDays,
  })

  return ok(
    rankSession(
      {
        participantCount: participantUserIds.length,
        dishes: counts.map((row) => ({
          dishId: row.groupDishId,
          name: row.name,
          systemTags: row.systemTags,
          proposedCount: row.proposedCount,
          rejectedCount: row.rejectedCount,
          recentEaterCount: recentEaters.get(row.globalDishId) ?? 0,
        })),
      },
      RANKING_CONFIG,
    ),
  )
}
