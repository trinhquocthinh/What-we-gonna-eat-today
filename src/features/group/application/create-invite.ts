import { generateInviteToken, hashInviteToken } from '@/shared/crypto/invite-token'
import type { Failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { ok } from '@/shared/result'

import { assertGroupAccess } from './assert-group-access'
import type { InviteRepository } from './invite-repository'
import type { MembershipRepository } from './membership-repository'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type CreateInviteDeps = {
  readonly invites: InviteRepository
  readonly memberships: MembershipRepository
}

export type CreateInviteInput = {
  readonly groupId: string
  readonly requestedByUserId: string
}

export type CreateInviteOutput = {
  readonly token: string
  readonly expiresAt: Date
}

export async function createInvite(
  deps: CreateInviteDeps,
  input: CreateInviteInput,
): Promise<Result<CreateInviteOutput, Failure>> {
  const access = await assertGroupAccess(
    { memberships: deps.memberships },
    { userId: input.requestedByUserId, groupId: input.groupId, requiredRole: 'ADMIN' },
  )
  if (!access.ok) {
    return access
  }

  const token = generateInviteToken()
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

  await deps.invites.create({
    groupId: input.groupId,
    tokenHash: hashInviteToken(token),
    expiresAt,
  })

  // Token thô CHỈ tồn tại trong biến này và giá trị trả về — không bao giờ
  // ghi xuống DB, không log. Đây là lần DUY NHẤT caller thấy được nó.
  return ok({ token, expiresAt })
}
