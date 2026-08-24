import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { afterEach, describe, expect, it } from 'vitest'

import { getDb } from '@/shared/db/client'
import { groupRules, groups, users } from '@/shared/db/schema'
import { makeGroup, makeUser } from '@/shared/testing/factories'

import { drizzleRuleRepository } from './drizzle-rule-repository'

type Cleanable = {
  userIds: string[]
  groupIds: string[]
}

async function cleanupEntities(cleanable: Cleanable) {
  const db = getDb()
  for (const groupId of cleanable.groupIds) {
    await db.delete(groupRules).where(eq(groupRules.groupId, groupId))
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

async function createGroup(): Promise<string> {
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

  return group.id
}

describe('drizzleRuleRepository (Integration)', () => {
  it('ghi đè toàn bộ: lưu [MAIN 1, SOUP 1], rồi lưu [SOUP 2] -> còn đúng 1 hàng với minimumCount = 2', async () => {
    const groupId = await createGroup()

    await drizzleRuleRepository.replaceGroupRules(groupId, [
      { systemTag: 'MAIN', minimumCount: 1 },
      { systemTag: 'SOUP', minimumCount: 1 },
    ])

    let rules = await drizzleRuleRepository.listGroupRules(groupId)
    expect(rules).toHaveLength(2)

    await drizzleRuleRepository.replaceGroupRules(groupId, [{ systemTag: 'SOUP', minimumCount: 2 }])

    rules = await drizzleRuleRepository.listGroupRules(groupId)
    expect(rules).toHaveLength(1)
    expect(rules[0]?.systemTag).toBe('SOUP')
    expect(rules[0]?.minimumCount).toBe(2)
  })

  // TC-088
  it('TC-088: lưu [] sau khi đã có 2 rule -> listGroupRules trả []', async () => {
    const groupId = await createGroup()

    await drizzleRuleRepository.replaceGroupRules(groupId, [
      { systemTag: 'MAIN', minimumCount: 1 },
      { systemTag: 'SOUP', minimumCount: 1 },
    ])

    await drizzleRuleRepository.replaceGroupRules(groupId, [])

    const rules = await drizzleRuleRepository.listGroupRules(groupId)
    expect(rules).toEqual([])
  })

  it('thứ tự: lưu [SOUP, STAPLE, MAIN] -> đọc ra theo thứ tự mâm cơm [STAPLE, MAIN, SOUP]', async () => {
    const groupId = await createGroup()

    await drizzleRuleRepository.replaceGroupRules(groupId, [
      { systemTag: 'SOUP', minimumCount: 1 },
      { systemTag: 'STAPLE', minimumCount: 1 },
      { systemTag: 'MAIN', minimumCount: 2 },
    ])

    const rules = await drizzleRuleRepository.listGroupRules(groupId)
    expect(rules.map((r) => r.systemTag)).toEqual(['STAPLE', 'MAIN', 'SOUP'])
  })

  // E5-T2 DoD
  it('DB chặn rule trùng và minimum_count = 0, không phụ thuộc hàm thuần', async () => {
    const groupId = await createGroup()

    await getDb()
      .insert(groupRules)
      .values({ groupId, systemTag: 'MAIN', minimumCount: 1, ruleType: 'REQUIRED' })

    await expect(
      getDb()
        .insert(groupRules)
        .values({ groupId, systemTag: 'MAIN', minimumCount: 2, ruleType: 'REQUIRED' }),
    ).rejects.toThrow()

    await expect(
      getDb()
        .insert(groupRules)
        .values({ groupId, systemTag: 'SOUP', minimumCount: 0, ruleType: 'REQUIRED' }),
    ).rejects.toThrow()
  })
})
