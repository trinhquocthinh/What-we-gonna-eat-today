import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { CreateGroupForm } from '@/features/group/presentation/components/create-group-form'
import { DISPLAY_TIME_ZONE_FALLBACK } from '@/shared/time/time-zone'
import { createGroupAction } from '../actions'

export default async function NewGroupPage() {
  const user = await getCurrentUser()
  if (user === null) {
    redirect('/')
  }

  return <CreateGroupForm action={createGroupAction} initialTimeZone={DISPLAY_TIME_ZONE_FALLBACK} />
}
