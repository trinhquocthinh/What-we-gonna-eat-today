'use server'

import { joinByInvite } from '@/features/group/application/join-by-invite'
import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import { drizzleInviteRepository } from '@/features/group/infrastructure/drizzle-invite-repository'
import { messageFor } from '@/shared/errors'

export async function joinAction(
  token: string,
  userId: string,
): Promise<{ ok: true; groupId: string } | { ok: false; message: string }> {
  const result = await joinByInvite(
    { invites: drizzleInviteRepository, memberships: drizzleMembershipRepository },
    { token, userId },
  )

  if (!result.ok) {
    return { ok: false, message: messageFor(result.error) }
  }

  return { ok: true, groupId: result.value.groupId }
}
