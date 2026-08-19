'use server'

import { joinByInvite } from '@/features/group/application/join-by-invite'
import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import { drizzleInviteRepository } from '@/features/group/infrastructure/drizzle-invite-repository'

function toVietnameseMessage(code: string): string {
  if (code === 'ERR_INVITE_INVALID') return 'Link mời không còn hiệu lực.'
  if (code === 'ERR_INVITE_ALREADY_USED') return 'Link mời này đã được dùng rồi.'
  if (code === 'ERR_ALREADY_GROUP_MEMBER') return 'Bạn đã ở trong nhóm này rồi.'
  return 'Không tham gia được nhóm. Thử lại giúp mình.'
}

export async function joinAction(
  token: string,
  userId: string,
): Promise<{ ok: true; groupId: string } | { ok: false; message: string }> {
  const result = await joinByInvite(
    { invites: drizzleInviteRepository, memberships: drizzleMembershipRepository },
    { token, userId },
  )

  if (!result.ok) {
    return { ok: false, message: toVietnameseMessage(result.error.code) }
  }

  return { ok: true, groupId: result.value.groupId }
}
