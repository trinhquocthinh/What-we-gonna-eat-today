import { InviteScreen } from '@/features/group/presentation/components/invite-screen'

import { requireGroupAdminContext } from '../group-access'
import { createInviteAction } from './actions'

type InvitePageProps = {
  params: Promise<{ groupId: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { groupId } = await params
  const { group } = await requireGroupAdminContext(groupId)

  return (
    <InviteScreen
      groupId={groupId}
      groupName={group.name}
      action={createInviteAction.bind(null, groupId)}
    />
  )
}
