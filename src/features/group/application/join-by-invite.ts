import { hashInviteToken } from '@/shared/crypto/invite-token'
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import { isInviteExpired } from '../domain/invite'
import { isActiveMembership } from '../domain/membership'
import type { InviteRepository } from './invite-repository'
import type { MembershipRepository } from './membership-repository'

export type JoinByInviteDeps = {
  readonly invites: InviteRepository
  readonly memberships: MembershipRepository
}

export type JoinByInviteInput = {
  readonly token: string
  readonly userId: string
}

export type JoinByInviteOutput = {
  readonly groupId: string
}

export async function joinByInvite(
  deps: JoinByInviteDeps,
  input: JoinByInviteInput,
): Promise<Result<JoinByInviteOutput, Failure>> {
  const invite = await deps.invites.findByTokenHash(hashInviteToken(input.token))

  if (invite === null) {
    return err(failure('ERR_INVITE_INVALID'))
  }
  if (isInviteExpired(invite.expiresAt, new Date())) {
    return err(failure('ERR_INVITE_INVALID'))
  }
  if (invite.usedAt !== null) {
    return err(failure('ERR_INVITE_ALREADY_USED'))
  }

  // TC-015 — đã là Member: KHÔNG đánh dấu token đã dùng, token còn dùng được
  // cho người khác. Đọc trước batch/CTE bên dưới nên phải chặn ở đây, chưa
  // được để CTE tự chặn (CTE chỉ biết "used_at IS NULL", không biết membership).
  const existingMembership = await deps.memberships.findMembership(invite.groupId, input.userId)
  if (existingMembership !== null && isActiveMembership(existingMembership)) {
    return err(failure('ERR_ALREADY_GROUP_MEMBER'))
  }

  const { consumed } = await deps.invites.consumeAndAddMember({
    inviteId: invite.id,
    groupId: invite.groupId,
    userId: input.userId,
  })

  // Thua race cực hiếm: một request khác dùng đúng token này giữa lúc ta đọc
  // (findByTokenHash) và lúc ta ghi (consumeAndAddMember). CTE ở infra đã tự
  // chặn ghi trùng — ở đây chỉ cần dịch kết quả 0-hàng thành lỗi thay vì coi
  // là thành công.
  if (!consumed) {
    return err(failure('ERR_INVITE_ALREADY_USED'))
  }

  return ok({ groupId: invite.groupId })
}
