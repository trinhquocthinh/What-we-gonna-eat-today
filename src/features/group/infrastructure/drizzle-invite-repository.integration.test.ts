import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { uuidv7 } from 'uuidv7'

import { getDb } from '@/shared/db/client'
import { groupInvites, groupMembers, groups, users } from '@/shared/db/schema'
import { makeGroup, makeUser } from '@/shared/testing/factories'

import { drizzleInviteRepository } from './drizzle-invite-repository'

type Cleanable = {
  userIds: string[]
  groupIds: string[]
}

async function cleanupEntities(cleanable: Cleanable) {
  const db = getDb()
  for (const groupId of cleanable.groupIds) {
    await db.delete(groupInvites).where(eq(groupInvites.groupId, groupId))
    await db.delete(groupMembers).where(eq(groupMembers.groupId, groupId))
    await db.delete(groups).where(eq(groups.id, groupId))
  }
  for (const userId of cleanable.userIds) {
    await db.delete(users).where(eq(users.id, userId))
  }
}

const cleanupQueue: Array<() => Promise<void>> = []

afterEach(async () => {
  while (cleanupQueue.length > 0) {
    const fn = cleanupQueue.pop()
    if (fn !== undefined) await fn()
  }
})

describe('drizzleInviteRepository.consumeAndAddMember', () => {
  it('cùng transaction: dùng token VÀ tạo member cùng lúc', async () => {
    const db = getDb()
    const user = makeUser({
      id: uuidv7(),
      email: `test-${uuidv7()}@example.com`,
    })
    const group = makeGroup({
      id: uuidv7(),
      creatorUserId: user.id,
    })

    cleanupQueue.push(() =>
      cleanupEntities({
        userIds: [user.id],
        groupIds: [group.id],
      }),
    )

    await db.insert(users).values({
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      provider: 'google',
      providerSubject: `sub-${user.id}`,
    })
    await db.insert(groups).values({
      id: group.id,
      name: group.name,
      timezone: group.timezone,
    })
    const tokenHash = `hash-${uuidv7()}`
    const invite = await drizzleInviteRepository.create({
      groupId: group.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    })

    const { consumed } = await drizzleInviteRepository.consumeAndAddMember({
      inviteId: invite.id,
      groupId: group.id,
      userId: user.id,
    })

    expect(consumed).toBe(true)
    const [savedInvite] = await db.select().from(groupInvites).where(eq(groupInvites.id, invite.id))
    expect(savedInvite?.usedAt).not.toBeNull()
    const members = await db.select().from(groupMembers).where(eq(groupMembers.userId, user.id))
    expect(members).toHaveLength(1)
  })

  it('race — token đã dùng: lần gọi thứ hai consumed=false, KHÔNG tạo member thứ hai', async () => {
    const db = getDb()
    const userA = makeUser({
      id: uuidv7(),
      email: `a-${uuidv7()}@example.com`,
    })
    const userB = makeUser({
      id: uuidv7(),
      email: `b-${uuidv7()}@example.com`,
    })
    const group = makeGroup({
      id: uuidv7(),
      creatorUserId: userA.id,
    })

    cleanupQueue.push(() =>
      cleanupEntities({
        userIds: [userA.id, userB.id],
        groupIds: [group.id],
      }),
    )

    await db.insert(users).values([
      {
        id: userA.id,
        displayName: userA.displayName,
        email: userA.email,
        provider: 'google',
        providerSubject: `sub-${userA.id}`,
      },
      {
        id: userB.id,
        displayName: userB.displayName,
        email: userB.email,
        provider: 'google',
        providerSubject: `sub-${userB.id}`,
      },
    ])
    await db.insert(groups).values({
      id: group.id,
      name: group.name,
      timezone: group.timezone,
    })
    const tokenHash = `hash-${uuidv7()}`
    const invite = await drizzleInviteRepository.create({
      groupId: group.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    })

    const first = await drizzleInviteRepository.consumeAndAddMember({
      inviteId: invite.id,
      groupId: group.id,
      userId: userA.id,
    })
    const second = await drizzleInviteRepository.consumeAndAddMember({
      inviteId: invite.id,
      groupId: group.id,
      userId: userB.id,
    })

    expect(first.consumed).toBe(true)
    expect(second.consumed).toBe(false)
    const members = await db.select().from(groupMembers).where(eq(groupMembers.groupId, group.id))
    expect(members).toHaveLength(1)
    expect(members[0]?.userId).toBe(userA.id)
  })
})
