import { notFound, redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { assertGroupAccess } from '@/features/group/application/assert-group-access'
import {
  drizzleGroupRepository,
  drizzleMembershipRepository,
} from '@/features/group/infrastructure/drizzle-group-repository'
import { GroupOverviewScreen } from '@/features/group/presentation/components/group-overview-screen'
import { resolveDecisionDate } from '@/features/session/domain/decision-date'
import { formatVietnameseDate } from '@/shared/time/format-vietnamese-date'

// Khai kiểu thủ công, KHÔNG dùng helper `PageProps<'/groups/[groupId]'>` — nó do
// `next typegen` sinh vào `.next/types`, mà CI chạy `typecheck` trước `build`.
type GroupPageProps = {
  params: Promise<{ groupId: string }>
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { groupId } = await params

  const user = await getCurrentUser()
  if (user === null) {
    redirect('/')
  }

  // Tech Spec §5: guard chạy TRƯỚC business logic.
  const access = await assertGroupAccess(
    { memberships: drizzleMembershipRepository },
    { userId: user.id, groupId, requiredRole: 'MEMBER' },
  )

  // `notFound()` chứ không `forbidden()`: (a) `forbidden()` cần
  // `experimental.authInterrupts`; (b) NFR-04 — không lộ nhóm này có tồn tại hay không.
  if (!access.ok) {
    notFound()
  }

  const group = await drizzleGroupRepository.findById(groupId)
  if (group === null) {
    notFound()
  }

  // SPEC-018 chạy production lần đầu — header phải theo timezone của NHÓM,
  // không phải của server.
  const decisionDate = resolveDecisionDate(new Date(), group.timezone)

  return (
    <GroupOverviewScreen groupName={group.name} dateCaption={formatVietnameseDate(decisionDate)} />
  )
}
