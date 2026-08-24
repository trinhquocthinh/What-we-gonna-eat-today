import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { listEatingHistory } from '@/features/history/application/list-eating-history'
import { drizzleHistoryRepository } from '@/features/history/infrastructure/drizzle-history-repository'
import { EatingHistoryScreen } from '@/features/history/presentation/components/eating-history-screen'
import { resolveDecisionDate } from '@/features/session/domain/decision-date'

import { requireGroupContext } from '../group-access'

type HistoryPageProps = {
  params: Promise<{ groupId: string }>
}

/**
 * S-12 — Lịch sử ăn (30 ngày gần đây).
 *
 * Ghi chú quan trọng (DEC-048, Guide §1.4):
 * Route đặt dưới Group (`/groups/[groupId]/history`) để phục vụ guard `requireGroupContext`,
 * tiêu đề nhóm ở header, và đường quay lại. Tuy nhiên, `eating_history` thuộc về USER (BR-056)
 * và được truy vấn theo `userId`. Khi F43 (multi-group) vào ở v1.1+, route giữ nguyên
 * còn truy vấn sẽ lọc theo group nếu cần.
 */
export default async function HistoryPage({ params }: HistoryPageProps) {
  const { groupId } = await params

  const user = await getCurrentUser()
  if (user === null) redirect('/')

  const { group } = await requireGroupContext(groupId)

  const today = resolveDecisionDate(new Date(), group.timezone)
  const days = await listEatingHistory(
    { history: drizzleHistoryRepository },
    { userId: user.id, today },
  )

  return (
    <EatingHistoryScreen
      groupName={group.name}
      today={today}
      days={days}
      closeHref={`/groups/${groupId}`}
    />
  )
}
