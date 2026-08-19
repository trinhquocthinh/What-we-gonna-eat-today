import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { afterEach, describe, expect, it } from 'vitest'

import { normalizeDishName } from '@/features/dish/domain/normalize-name'
import { getDb } from '@/shared/db/client'
import { globalDishes, groupDishes, groups, users } from '@/shared/db/schema'
import { makeGroup, makeUser } from '@/shared/testing/factories'

import { drizzleDishRepository } from './drizzle-dish-repository'

type Cleanable = {
  userIds: string[]
  groupIds: string[]
}

async function cleanupEntities(cleanable: Cleanable) {
  const db = getDb()
  // 1. Xoá toàn bộ groupDishes của các groups trước để không còn FK trỏ tới globalDishes
  for (const groupId of cleanable.groupIds) {
    await db.delete(groupDishes).where(eq(groupDishes.groupId, groupId))
  }
  // 2. Xoá globalDishes sau khi groupDishes đã được dọn sạch
  for (const groupId of cleanable.groupIds) {
    await db.delete(globalDishes).where(eq(globalDishes.createdFromGroupId, groupId))
  }
  // 3. Xoá groups
  for (const groupId of cleanable.groupIds) {
    await db.delete(groups).where(eq(groups.id, groupId))
  }
  // 4. Xoá users
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

describe('drizzleDishRepository — E2-T4', () => {
  it('addExistingGlobalDishToGroup — chưa có row: tạo mới ACTIVE', async () => {
    const db = getDb()
    const user = makeUser({
      id: uuidv7(),
      email: `test-${uuidv7()}@example.com`,
    })
    const group = makeGroup({
      id: uuidv7(),
      creatorUserId: user.id,
    })
    const group2 = makeGroup({
      id: uuidv7(),
      name: 'Nhà khác',
      creatorUserId: user.id,
    })

    cleanupQueue.push(() =>
      cleanupEntities({
        userIds: [user.id],
        groupIds: [group.id, group2.id],
      }),
    )

    await db.insert(users).values({
      ...user,
      provider: 'test',
      providerSubject: `test-${user.id}`,
    })
    await db.insert(groups).values(group)
    await db.insert(groups).values(group2)

    await drizzleDishRepository.createGlobalDishAndAddToPool({
      groupId: group.id,
      name: 'Canh chua',
      normalizedName: normalizeDishName('Canh chua'),
      creatorUserId: user.id,
    })

    const globalRows = await db
      .select()
      .from(globalDishes)
      .where(eq(globalDishes.createdFromGroupId, group.id))

    const result = await drizzleDishRepository.addExistingGlobalDishToGroup({
      groupId: group2.id,
      globalDishId: globalRows[0]!.id,
    })

    expect(result.name).toBe('Canh chua')
    const rows = await db.select().from(groupDishes).where(eq(groupDishes.groupId, group2.id))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.state).toBe('ACTIVE')
  })

  it('addExistingGlobalDishToGroup — có row INACTIVE: chuyển ACTIVE, không tạo row mới', async () => {
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
      ...user,
      provider: 'test',
      providerSubject: `test-${user.id}`,
    })
    await db.insert(groups).values(group)

    const dish = await drizzleDishRepository.createGlobalDishAndAddToPool({
      groupId: group.id,
      name: 'Canh chua',
      normalizedName: normalizeDishName('Canh chua'),
      creatorUserId: user.id,
    })

    const globalRows = await db
      .select()
      .from(globalDishes)
      .where(eq(globalDishes.createdFromGroupId, group.id))

    await db.update(groupDishes).set({ state: 'INACTIVE' }).where(eq(groupDishes.id, dish.id))

    await drizzleDishRepository.addExistingGlobalDishToGroup({
      groupId: group.id,
      globalDishId: globalRows[0]!.id,
    })

    const rows = await db.select().from(groupDishes).where(eq(groupDishes.groupId, group.id))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.state).toBe('ACTIVE')
  })
})
