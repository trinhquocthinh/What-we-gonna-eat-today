import { listGroupDishes } from '@/features/dish/application/list-group-dishes'
import { drizzleDishRepository } from '@/features/dish/infrastructure/drizzle-dish-repository'
import { GroupOverviewScreen } from '@/features/group/presentation/components/group-overview-screen'
import { resolveDecisionDate } from '@/features/session/domain/decision-date'
import { formatVietnameseDate } from '@/shared/time/format-vietnamese-date'

import { requireGroupContext } from './group-access'

type GroupPageProps = {
  params: Promise<{ groupId: string }>
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { groupId } = await params
  const { group } = await requireGroupContext(groupId)

  // E1-T5 bật hàng lối tắt "Danh mục món", nên trang này phải biết số món.
  // E1-T7 gộp truy vấn khi trang nhóm cần thêm số liệu phiên.
  const dishes = await listGroupDishes({ dishes: drizzleDishRepository }, groupId)

  const decisionDate = resolveDecisionDate(new Date(), group.timezone)

  return (
    <GroupOverviewScreen
      groupName={group.name}
      dateCaption={formatVietnameseDate(decisionDate)}
      dishCount={dishes.length}
      dishesHref={`/groups/${groupId}/dishes`}
      inviteHref={`/groups/${groupId}/invite`}
      openSessionHref={`/groups/${groupId}/sessions/new`}
    />
  )
}
