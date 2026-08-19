'use server'

import { createInvite } from '@/features/group/application/create-invite'
import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import { drizzleInviteRepository } from '@/features/group/infrastructure/drizzle-invite-repository'
import type { InviteFormState } from '@/features/group/presentation/components/invite-screen'
import type { Failure } from '@/shared/errors'

import { requireGroupAdminContext } from '../group-access'

function toVietnameseMessage(error: Failure): string {
  if (error.code === 'ERR_NOT_GROUP_ADMIN') {
    return 'Chỉ Admin mới tạo được link mời.'
  }
  return 'Không tạo được link mời. Thử lại giúp mình.'
}

export async function createInviteAction(
  groupId: string,
  _previousState: InviteFormState,
): Promise<InviteFormState> {
  const { user } = await requireGroupAdminContext(groupId)

  const result = await createInvite(
    { invites: drizzleInviteRepository, memberships: drizzleMembershipRepository },
    { groupId, requestedByUserId: user.id },
  )

  if (!result.ok) {
    return { token: null, expiresAt: null, error: toVietnameseMessage(result.error) }
  }

  return {
    token: result.value.token,
    expiresAt: result.value.expiresAt.toISOString(),
    error: null,
  }
}
