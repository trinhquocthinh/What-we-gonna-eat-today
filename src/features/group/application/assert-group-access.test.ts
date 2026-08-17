import { describe, expect, it } from 'vitest'

import { makeMembership } from '@/shared/testing/factories'
import { assertGroupAccess } from './assert-group-access'

import type { Membership } from '../domain/membership'
import type { MembershipRepository } from './membership-repository'

function makeFakeMembershipRepository(membership: Membership | null) {
  let calls = 0

  const repository: MembershipRepository = {
    async findMembership() {
      calls += 1
      return membership
    },
  }

  return {
    repository,
    get calls() {
      return calls
    },
  }
}

const INPUT = { userId: 'user-1', groupId: 'group-1' } as const

describe('SPEC-019 — Authorization guard', () => {
  it('TC-006: User không thuộc Group thì ERR_NOT_GROUP_MEMBER', async () => {
    const fake = makeFakeMembershipRepository(null)

    const result = await assertGroupAccess(
      { memberships: fake.repository },
      { ...INPUT, requiredRole: 'MEMBER' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_NOT_GROUP_MEMBER')
  })

  it('TC-006b: membership đã bị gỡ vẫn là ERR_NOT_GROUP_MEMBER', async () => {
    const fake = makeFakeMembershipRepository(
      makeMembership({ isAdmin: true, removedAt: new Date('2026-08-01T00:00:00Z') }),
    )

    const result = await assertGroupAccess(
      { memberships: fake.repository },
      { ...INPUT, requiredRole: 'MEMBER' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_NOT_GROUP_MEMBER')
  })

  it('TC-007: Member không phải Admin gọi thao tác cần Admin thì ERR_NOT_GROUP_ADMIN', async () => {
    const fake = makeFakeMembershipRepository(makeMembership({ isAdmin: false }))

    const result = await assertGroupAccess(
      { memberships: fake.repository },
      { ...INPUT, requiredRole: 'ADMIN' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_NOT_GROUP_ADMIN')
  })

  it('Member đang hoạt động qua được mức MEMBER', async () => {
    const fake = makeFakeMembershipRepository(makeMembership({ isAdmin: false }))

    const result = await assertGroupAccess(
      { memberships: fake.repository },
      { ...INPUT, requiredRole: 'MEMBER' },
    )

    expect(result.ok).toBe(true)
    expect(fake.calls).toBe(1)
  })

  it('Admin qua được cả hai mức', async () => {
    const admin = makeMembership({ isAdmin: true })

    for (const requiredRole of ['MEMBER', 'ADMIN'] as const) {
      const fake = makeFakeMembershipRepository(admin)
      const result = await assertGroupAccess(
        { memberships: fake.repository },
        { ...INPUT, requiredRole },
      )
      expect(result.ok).toBe(true)
    }
  })
})
