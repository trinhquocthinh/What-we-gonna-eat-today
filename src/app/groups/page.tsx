import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { listGroups } from '@/features/group/application/list-groups'
import { drizzleGroupRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import { GroupListScreen } from '@/features/group/presentation/components/group-list-screen'
import { resolveDecisionDate } from '@/features/session/domain/decision-date'
import { DISPLAY_TIME_ZONE_FALLBACK } from '@/shared/time/time-zone'
import { formatVietnameseDate } from '@/shared/time/format-vietnamese-date'

export default async function GroupsPage() {
  const user = await getCurrentUser()
  if (user === null) {
    redirect('/')
  }

  const groups = await listGroups({ groups: drizzleGroupRepository }, user.id)

  // Trang này không có Group context nên dùng fallback CHỈ để hiển thị.
  const today = resolveDecisionDate(new Date(), DISPLAY_TIME_ZONE_FALLBACK)

  return (
    <GroupListScreen
      dateCaption={formatVietnameseDate(today)}
      groups={groups.map((group) => ({
        id: group.id,
        name: group.name,
        // E1-T7 thay bằng trạng thái phiên thật. Không bịa số liệu ở đây.
        status: 'Chưa mở phiên hôm nay',
        meta: `${group.memberCount} người`,
      }))}
    />
  )
}
