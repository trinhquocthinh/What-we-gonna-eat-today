import { describe, expect, it, vi } from 'vitest'

import { makeInvite, makeMembership } from '@/shared/testing/factories'

import type { InviteRepository } from './invite-repository'
import { joinByInvite } from './join-by-invite'
import type { MembershipRepository } from './membership-repository'

function makeDeps(
  overrides: {
    invite?: ReturnType<typeof makeInvite> | null
    membership?: ReturnType<typeof makeMembership> | null
    consumed?: boolean
  } = {},
) {
  const invites: InviteRepository = {
    create: vi.fn(async (i) => ({ id: 'x', expiresAt: i.expiresAt })),
    findByTokenHash: vi.fn(async () =>
      overrides.invite === undefined
        ? makeInvite({ id: 'invite-1', groupId: 'g1' })
        : overrides.invite,
    ),
    consumeAndAddMember: vi.fn(async () => ({ consumed: overrides.consumed ?? true })),
  }
  const memberships: MembershipRepository = {
    findMembership: vi.fn(async () => overrides.membership ?? null),
    findInvalidMembers: vi.fn(async () => []),
  }
  return { invites, memberships }
}

describe('joinByInvite', () => {
  it('TC-013 — token hợp lệ, chưa dùng: tạo Member, trả groupId', async () => {
    const deps = makeDeps()

    const result = await joinByInvite(deps, { token: 'raw-token', userId: 'u2' })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.groupId).toBe('g1')
    expect(deps.invites.consumeAndAddMember).toHaveBeenCalledWith({
      inviteId: 'invite-1',
      groupId: 'g1',
      userId: 'u2',
    })
  })

  it('TC-014 — token đã dùng: ERR_INVITE_ALREADY_USED', async () => {
    const deps = makeDeps({ invite: makeInvite({ usedAt: new Date() }) })

    const result = await joinByInvite(deps, { token: 'raw-token', userId: 'u2' })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_INVITE_ALREADY_USED')
    expect(deps.invites.consumeAndAddMember).not.toHaveBeenCalled()
  })

  it('TC-015 — đã là Member: ERR_ALREADY_GROUP_MEMBER, token KHÔNG bị tiêu', async () => {
    const deps = makeDeps({ membership: makeMembership({ removedAt: null }) })

    const result = await joinByInvite(deps, { token: 'raw-token', userId: 'u2' })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_ALREADY_GROUP_MEMBER')
    expect(deps.invites.consumeAndAddMember).not.toHaveBeenCalled()
  })

  it('TC-016 — token tạo 8 ngày trước (hết hạn): ERR_INVITE_INVALID', async () => {
    const deps = makeDeps({
      invite: makeInvite({ expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) }),
    })

    const result = await joinByInvite(deps, { token: 'raw-token', userId: 'u2' })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_INVITE_INVALID')
  })

  it('token không tồn tại: ERR_INVITE_INVALID', async () => {
    const deps = makeDeps({ invite: null })

    const result = await joinByInvite(deps, { token: 'raw-token', userId: 'u2' })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_INVITE_INVALID')
  })

  it('thua race ở consumeAndAddMember: ERR_INVITE_ALREADY_USED', async () => {
    const deps = makeDeps({ consumed: false })

    const result = await joinByInvite(deps, { token: 'raw-token', userId: 'u2' })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_INVITE_ALREADY_USED')
  })
})
