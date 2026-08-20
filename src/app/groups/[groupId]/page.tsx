import { listGroupDishes } from '@/features/dish/application/list-group-dishes'
import { drizzleDishRepository } from '@/features/dish/infrastructure/drizzle-dish-repository'
import { GroupOverviewScreen } from '@/features/group/presentation/components/group-overview-screen'
import { resolveDecisionDate } from '@/features/session/domain/decision-date'
import { drizzleSessionRepository } from '@/features/session/infrastructure/drizzle-session-repository'
import { describeParticipantRow } from '@/features/session/presentation/components/participant-status'
import { formatVietnameseDate } from '@/shared/time/format-vietnamese-date'

import { requireGroupContext } from './group-access'

type GroupPageProps = {
  params: Promise<{ groupId: string }>
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { groupId } = await params
  const { user, group } = await requireGroupContext(groupId)

  // E1-T5 bật hàng lối tắt "Danh mục món", nên trang này phải biết số món.
  // E1-T7 gộp truy vấn khi trang nhóm cần thêm số liệu phiên.
  const dishes = await listGroupDishes({ dishes: drizzleDishRepository }, groupId)

  const decisionDate = resolveDecisionDate(new Date(), group.timezone)

  const blockingSession = await drizzleSessionRepository.findBlockingSessionToday(
    groupId,
    decisionDate,
  )
  const activeSessionOverview =
    blockingSession !== null && blockingSession.state === 'ACTIVE'
      ? await drizzleSessionRepository.findSessionOverview(blockingSession.id)
      : null

  return (
    <GroupOverviewScreen
      groupName={group.name}
      dateCaption={formatVietnameseDate(decisionDate)}
      dishCount={dishes.length}
      dishesHref={`/groups/${groupId}/dishes`}
      inviteHref={`/groups/${groupId}/invite`}
      openSessionHref={`/groups/${groupId}/sessions/new`}
      activeSession={
        activeSessionOverview === null
          ? null
          : {
              id: blockingSession!.id,
              participants: activeSessionOverview.participants.map((p) => ({
                ...p,
                statusLabel: describeParticipantRow(p, p.userId === user.id),
              })),
            }
      }
      currentUserId={user.id}
    />
  )
}
