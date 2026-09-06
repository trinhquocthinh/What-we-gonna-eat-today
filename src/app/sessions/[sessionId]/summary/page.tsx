import { notFound, redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { assertGroupAccess } from '@/features/group/application/assert-group-access'
import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import { drizzleHistoryRepository } from '@/features/history/infrastructure/drizzle-history-repository'
import {
  FinalizeMealScreen,
  type SummaryDish,
} from '@/features/meal/presentation/components/finalize-meal-screen'
import { drizzleRuleRepository } from '@/features/rule/infrastructure/drizzle-rule-repository'
import { listSessionRanking } from '@/features/selection/application/list-session-ranking'
import type { RankedDish, SessionDishInput } from '@/features/selection/domain/ranking'
import { drizzleSelectionRepository } from '@/features/selection/infrastructure/drizzle-selection-repository'
import { drizzleSessionRepository } from '@/features/session/infrastructure/drizzle-session-repository'
import { formatVietnameseDateShort } from '@/shared/time/format-vietnamese-date'

import { finalizeMealAction } from './actions'

type SummaryPageProps = {
  params: Promise<{ sessionId: string }>
}

export default async function SummaryPage({ params }: SummaryPageProps) {
  const { sessionId } = await params

  const user = await getCurrentUser()
  if (user === null) redirect('/')

  const session = await drizzleSessionRepository.findById(sessionId)
  if (session === null) notFound()

  const access = await assertGroupAccess(
    { memberships: drizzleMembershipRepository },
    { userId: user.id, groupId: session.groupId, requiredRole: 'MEMBER' },
  )
  if (!access.ok) notFound()

  // SPEC-014 "Yêu cầu Creator" — use case tự kiểm (TC-062); ở đây chỉ dịch
  // thất bại thành 404, không lộ ra phiên có tồn tại hay không (NFR-04).
  const ranking = await listSessionRanking(
    { selection: drizzleSelectionRepository, history: drizzleHistoryRepository },
    { sessionId, userId: user.id, referenceDate: session.decisionDate },
  )
  if (!ranking.ok) notFound()

  const [rules, overview] = await Promise.all([
    drizzleRuleRepository.listSessionRules(sessionId),
    drizzleSessionRepository.findSessionOverview(sessionId),
  ])

  const participants = overview?.participants ?? []
  const done = participants.filter((p) => p.state === 'COMPLETED').length

  // ÁNH XẠ — đây là chỗ `selection` và `meal` gặp nhau, và là lý do KHÔNG cần
  // chiều cross-feature `meal → selection` (Guide §1.1, DEC-046).
  const toSummaryDish = (
    dish: RankedDish | SessionDishInput,
    score: number | null,
  ): SummaryDish => ({
    dishId: dish.dishId,
    name: dish.name,
    systemTags: dish.systemTags,
    proposedCount: dish.proposedCount,
    rejectedCount: dish.rejectedCount,
    cannotEatCount: dish.cannotEatCount,
    recentEaterCount: dish.recentEaterCount,
    score,
  })

  return (
    <FinalizeMealScreen
      dateCaption={formatVietnameseDateShort(session.decisionDate)}
      progressCaption={`${done} trong ${participants.length} người đã xong`}
      ranked={ranking.value.ranked.map((d) => toSummaryDish(d, d.score))}
      untouched={ranking.value.untouched.map((d) => toSummaryDish(d, null))}
      rules={rules}
      targetDishCount={session.targetDishCount}
      closeHref={`/groups/${session.groupId}`}
      action={finalizeMealAction.bind(null, sessionId)}
    />
  )
}
