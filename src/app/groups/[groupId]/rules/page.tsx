import { assertGroupAccess } from '@/features/group/application/assert-group-access'
import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import { listGroupRules } from '@/features/rule/application/list-group-rules'
import { drizzleRuleRepository } from '@/features/rule/infrastructure/drizzle-rule-repository'
import { GroupRulesScreen } from '@/features/rule/presentation/components/group-rules-screen'

import { requireGroupContext } from '../group-access'
import { setGroupRulesAction } from './actions'

// Khai kiểu thủ công, KHÔNG dùng helper `PageProps` (bẫy đã ghi ở E2-S4).
type RulesPageProps = {
  params: Promise<{ groupId: string }>
}

export default async function RulesPage({ params }: RulesPageProps) {
  const { groupId } = await params
  const { user, group } = await requireGroupContext(groupId)

  const rules = await listGroupRules({ rules: drizzleRuleRepository }, groupId)

  // MEMBER xem được, ADMIN mới sửa được (BR-010). Không `requireGroupAdminContext`
  // ở đây: một Member vào trang này phải THẤY quy định của nhà mình, không phải
  // gặp 404.
  const admin = await assertGroupAccess(
    { memberships: drizzleMembershipRepository },
    { userId: user.id, groupId, requiredRole: 'ADMIN' },
  )

  return (
    <GroupRulesScreen
      groupName={group.name}
      initialRules={rules}
      canEdit={admin.ok}
      action={setGroupRulesAction.bind(null, groupId)}
    />
  )
}
