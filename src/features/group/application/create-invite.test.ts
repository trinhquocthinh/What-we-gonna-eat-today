import { describe, expect, it, vi } from 'vitest'

import { makeMembership } from '@/shared/testing/factories'

import { createInvite } from './create-invite'
import type { InviteRepository } from './invite-repository'
import type { MembershipRepository } from './membership-repository'

function makeDeps(
  overrides: {
    membership?: ReturnType<typeof makeMembership> | null
    createInvite?: InviteRepository['create']
  } = {},
) {
  const memberships: MembershipRepository = {
    findMembership: vi.fn(async () =>
      overrides.membership === undefined ? makeMembership({ isAdmin: true }) : overrides.membership,
    ),
    findInvalidMembers: vi.fn(async () => []),
    listActiveMembers: vi.fn(async () => []),
  }
  const invites: InviteRepository = {
    create:
      overrides.createInvite ??
      vi.fn(async (input) => ({ id: 'invite-1', expiresAt: input.expiresAt })),
    findByTokenHash: vi.fn(async () => null),
    consumeAndAddMember: vi.fn(async () => ({ consumed: true })),
  }
  return { memberships, invites }
}

describe('createInvite', () => {
  it('TC-011 — Admin tạo link: trả token + expiresAt, chỉ token hash được lưu', async () => {
    const create = vi.fn(async (input: Parameters<InviteRepository['create']>[0]) => ({
      id: 'invite-1',
      expiresAt: input.expiresAt,
    }))
    const deps = makeDeps({ createInvite: create })

    const result = await createInvite(deps, { groupId: 'g1', requestedByUserId: 'u1' })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.token).toMatch(/^[A-Za-z0-9_-]+$/u)
    expect(create).toHaveBeenCalledOnce()
    const savedInput = create.mock.calls[0]?.[0]
    expect(savedInput?.tokenHash).not.toBe(result.value.token)
    expect(savedInput?.tokenHash).toHaveLength(64) // sha256 hex
  })

  it('TC-011 — hạn 7 ngày kể từ lúc tạo', async () => {
    const deps = makeDeps()
    const before = Date.now()

    const result = await createInvite(deps, { groupId: 'g1', requestedByUserId: 'u1' })

    if (!result.ok) throw new Error('unreachable')
    const days = (result.value.expiresAt.getTime() - before) / (24 * 60 * 60 * 1000)
    expect(days).toBeGreaterThan(6.99)
    expect(days).toBeLessThan(7.01)
  })

  it('TC-012 — Member (không phải Admin) bị chặn: ERR_NOT_GROUP_ADMIN', async () => {
    const deps = makeDeps({ membership: makeMembership({ isAdmin: false }) })

    const result = await createInvite(deps, { groupId: 'g1', requestedByUserId: 'u1' })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_NOT_GROUP_ADMIN')
  })
})
