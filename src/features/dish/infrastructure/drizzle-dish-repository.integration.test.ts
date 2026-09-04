import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { afterEach, describe, expect, it } from 'vitest'

import { normalizeDishName } from '@/features/dish/domain/normalize-name'
import { getDb } from '@/shared/db/client'
import { globalDishes, groupDishes, groupDishTags, groups, users } from '@/shared/db/schema'
import { makeGroup, makeUser } from '@/shared/testing/factories'

import { drizzleDishRepository } from './drizzle-dish-repository'

type Cleanable = {
  userIds: string[]
  groupIds: string[]
}

async function cleanupEntities(cleanable: Cleanable) {
  const db = getDb()
  // 0. Xoá groupDishTags
  for (const groupId of cleanable.groupIds) {
    const dishes = await db
      .select({ id: groupDishes.id })
      .from(groupDishes)
      .where(eq(groupDishes.groupId, groupId))
    for (const d of dishes) {
      await db.delete(groupDishTags).where(eq(groupDishTags.groupDishId, d.id))
    }
  }
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
      systemTags: [],
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
      systemTags: [],
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

describe('drizzleDishRepository — System Tag (E2-T5)', () => {
  it('TC-024 — cùng món ở 2 Group: đổi tag Group A, Group B giữ nguyên', async () => {
    const db = getDb()
    const user = makeUser({
      id: uuidv7(),
      email: `test-${uuidv7()}@example.com`,
    })
    const groupA = makeGroup({
      id: uuidv7(),
      name: 'Nhà A',
      creatorUserId: user.id,
    })
    const groupB = makeGroup({
      id: uuidv7(),
      name: 'Nhà B',
      creatorUserId: user.id,
    })

    cleanupQueue.push(() =>
      cleanupEntities({
        userIds: [user.id],
        groupIds: [groupA.id, groupB.id],
      }),
    )

    await db.insert(users).values({
      ...user,
      provider: 'test',
      providerSubject: `test-${user.id}`,
    })
    await db.insert(groups).values([groupA, groupB])

    // Group A tạo món, mang sẵn tag MAIN.
    const dishA = await drizzleDishRepository.createGlobalDishAndAddToPool({
      groupId: groupA.id,
      name: 'Canh chua',
      normalizedName: 'canh chua',
      creatorUserId: user.id,
      systemTags: ['MAIN'],
    })

    // Group B dùng CÙNG Global Dish, nhưng gắn tag SOUP.
    const [globalDish] = await db
      .select()
      .from(globalDishes)
      .where(eq(globalDishes.createdFromGroupId, groupA.id))
    const groupDishB = uuidv7()
    await db.insert(groupDishes).values({
      id: groupDishB,
      groupId: groupB.id,
      globalDishId: globalDish!.id,
      state: 'ACTIVE',
    })
    await drizzleDishRepository.replaceSystemTags({
      groupDishId: groupDishB,
      systemTags: ['SOUP'],
    })

    // Đổi tag ở Group A.
    await drizzleDishRepository.replaceSystemTags({
      groupDishId: dishA.id,
      systemTags: ['STAPLE', 'DESSERT'],
    })

    const listA = await drizzleDishRepository.listActiveInGroup(groupA.id)
    const listB = await drizzleDishRepository.listActiveInGroup(groupB.id)

    expect(listA[0]?.systemTags).toEqual(['STAPLE', 'DESSERT'])
    expect(listB[0]?.systemTags).toEqual(['SOUP']) // ← GIỮ NGUYÊN
  })

  it('TC-023 — replaceSystemTags([]) xoá sạch tag', async () => {
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
      normalizedName: 'canh chua',
      creatorUserId: user.id,
      systemTags: ['MAIN', 'SOUP'],
    })

    await drizzleDishRepository.replaceSystemTags({ groupDishId: dish.id, systemTags: [] })

    const rows = await db.select().from(groupDishTags).where(eq(groupDishTags.groupDishId, dish.id))
    expect(rows).toHaveLength(0)
    const list = await drizzleDishRepository.listActiveInGroup(group.id)
    expect(list[0]?.systemTags).toEqual([]) // món không tag vẫn ra một hàng
  })

  it('findActiveGroupDish chặn truy cập chéo Group', async () => {
    const db = getDb()
    const user = makeUser({
      id: uuidv7(),
      email: `test-${uuidv7()}@example.com`,
    })
    const groupA = makeGroup({
      id: uuidv7(),
      name: 'Nhà A',
      creatorUserId: user.id,
    })
    const groupB = makeGroup({
      id: uuidv7(),
      name: 'Nhà B',
      creatorUserId: user.id,
    })

    cleanupQueue.push(() =>
      cleanupEntities({
        userIds: [user.id],
        groupIds: [groupA.id, groupB.id],
      }),
    )

    await db.insert(users).values({
      ...user,
      provider: 'test',
      providerSubject: `test-${user.id}`,
    })
    await db.insert(groups).values([groupA, groupB])
    const dishA = await drizzleDishRepository.createGlobalDishAndAddToPool({
      groupId: groupA.id,
      name: 'Canh chua',
      normalizedName: 'canh chua',
      creatorUserId: user.id,
      systemTags: [],
    })

    const stolen = await drizzleDishRepository.findActiveGroupDish({
      groupId: groupB.id, // Admin của B…
      groupDishId: dishA.id, // …nhắm vào món của A
    })

    expect(stolen).toBeNull()
  })
})

describe('drizzleDishRepository — searchGlobalDishes (SPEC-023)', () => {
  /** Dựng một catalog chung do NHÓM KHÁC tạo, rồi tra từ nhóm đang trống. */
  async function seedCatalog(names: string[]) {
    const db = getDb()
    const user = makeUser({ id: uuidv7(), email: `test-${uuidv7()}@example.com` })
    const owner = makeGroup({ id: uuidv7(), name: 'Nhà chủ catalog', creatorUserId: user.id })
    const mine = makeGroup({ id: uuidv7(), name: 'Nhà tôi', creatorUserId: user.id })

    cleanupQueue.push(() => cleanupEntities({ userIds: [user.id], groupIds: [owner.id, mine.id] }))

    await db.insert(users).values({ ...user, provider: 'test', providerSubject: `test-${user.id}` })
    await db.insert(groups).values([owner, mine])

    for (const name of names) {
      await drizzleDishRepository.createGlobalDishAndAddToPool({
        groupId: owner.id,
        name,
        normalizedName: normalizeDishName(name),
        creatorUserId: user.id,
        systemTags: [],
      })
    }

    return { user, owner, mine }
  }

  it('khớp CHUỖI CON, không chỉ tiền tố — gõ "cha" ra "Bún chả"', async () => {
    const { mine } = await seedCatalog(['Bún chả', 'Canh chua cá lóc'])

    const found = await drizzleDishRepository.searchGlobalDishes({
      groupId: mine.id,
      needle: 'cha',
      limit: 5,
    })

    expect(found.map((d) => d.name)).toContain('Bún chả')
  })

  it('bỏ dấu — gõ "bun cha" ra "Bún chả"', async () => {
    const { mine } = await seedCatalog(['Bún chả'])

    const found = await drizzleDishRepository.searchGlobalDishes({
      groupId: mine.id,
      needle: 'bun cha',
      limit: 5,
    })

    expect(found.map((d) => d.name)).toEqual(['Bún chả'])
  })

  it('LOẠI món nhóm đang có (ACTIVE) — không gợi ý thứ đã nằm trong danh mục', async () => {
    const { user, mine } = await seedCatalog(['Bún chả'])

    const [globalDish] = await getDb()
      .select({ id: globalDishes.id })
      .from(globalDishes)
      .where(eq(globalDishes.normalizedName, 'bun cha'))
      .limit(1)

    await drizzleDishRepository.addExistingGlobalDishToGroup({
      groupId: mine.id,
      globalDishId: globalDish!.id,
    })

    const found = await drizzleDishRepository.searchGlobalDishes({
      groupId: mine.id,
      needle: 'bun',
      limit: 5,
    })

    expect(found).toEqual([])
    expect(user).toBeDefined()
  })

  it('VẪN gợi ý món nhóm đã gỡ (INACTIVE) — chọn lại chính là cách thêm lại', async () => {
    const { mine } = await seedCatalog(['Bún chả'])

    const [globalDish] = await getDb()
      .select({ id: globalDishes.id })
      .from(globalDishes)
      .where(eq(globalDishes.normalizedName, 'bun cha'))
      .limit(1)

    const added = await drizzleDishRepository.addExistingGlobalDishToGroup({
      groupId: mine.id,
      globalDishId: globalDish!.id,
    })
    await getDb().update(groupDishes).set({ state: 'INACTIVE' }).where(eq(groupDishes.id, added.id))

    const found = await drizzleDishRepository.searchGlobalDishes({
      groupId: mine.id,
      needle: 'bun',
      limit: 5,
    })

    expect(found.map((d) => d.name)).toEqual(['Bún chả'])
  })

  it('khớp từ ĐẦU tên nổi lên trước, rồi tên ngắn hơn', async () => {
    const { mine } = await seedCatalog(['Miến trộn bún tàu', 'Bún chả giò cuốn tôm', 'Bún chả'])

    const found = await drizzleDishRepository.searchGlobalDishes({
      groupId: mine.id,
      needle: 'bun',
      limit: 5,
    })

    expect(found.map((d) => d.name)).toEqual([
      'Bún chả',
      'Bún chả giò cuốn tôm',
      'Miến trộn bún tàu',
    ])
  })

  it('tôn trọng limit', async () => {
    const { mine } = await seedCatalog(['Bún chả', 'Bún bò Huế', 'Bún riêu cua', 'Bún thịt nướng'])

    const found = await drizzleDishRepository.searchGlobalDishes({
      groupId: mine.id,
      needle: 'bun',
      limit: 2,
    })

    expect(found).toHaveLength(2)
  })
})

describe('drizzleDishRepository — E11-T2: deactivateGroupDish & listInactiveInGroup', () => {
  async function seedGroupWithDishes(names: string[]) {
    const db = getDb()
    const user = makeUser({ id: uuidv7(), email: `test-${uuidv7()}@example.com` })
    const group = makeGroup({ id: uuidv7(), name: 'Nhà Test E11', creatorUserId: user.id })

    cleanupQueue.push(() => cleanupEntities({ userIds: [user.id], groupIds: [group.id] }))

    await db.insert(users).values({ ...user, provider: 'test', providerSubject: `test-${user.id}` })
    await db.insert(groups).values([group])

    const dishes = []
    for (const name of names) {
      const d = await drizzleDishRepository.createGlobalDishAndAddToPool({
        groupId: group.id,
        name,
        normalizedName: normalizeDishName(name),
        creatorUserId: user.id,
        systemTags: ['MAIN'],
      })
      dishes.push(d)
    }

    return { user, group, dishes }
  }

  it('TC-142: Gỡ món -> state = "INACTIVE", dòng vẫn còn; thêm lại -> state = "ACTIVE", không dòng mới', async () => {
    const { group, dishes } = await seedGroupWithDishes(['Cá basa kho tiêu', 'Canh chua cá lóc'])
    const targetDish = dishes[0]!

    // Trước khi gỡ: 2 món active, 0 món inactive
    const activeBefore = await drizzleDishRepository.listActiveInGroup(group.id)
    expect(activeBefore).toHaveLength(2)
    const inactiveBefore = await drizzleDishRepository.listInactiveInGroup(group.id)
    expect(inactiveBefore).toHaveLength(0)

    // Gỡ món
    await drizzleDishRepository.deactivateGroupDish(targetDish.id)

    // Sau khi gỡ: 1 món active, 1 món inactive. Dòng trong DB vẫn còn!
    const activeAfter = await drizzleDishRepository.listActiveInGroup(group.id)
    expect(activeAfter).toHaveLength(1)
    expect(activeAfter[0]?.id).not.toBe(targetDish.id)

    const inactiveAfter = await drizzleDishRepository.listInactiveInGroup(group.id)
    expect(inactiveAfter).toHaveLength(1)
    expect(inactiveAfter[0]?.id).toBe(targetDish.id)
    expect(inactiveAfter[0]?.name).toBe('Cá basa kho tiêu')
    // DEC-053: System tag vẫn được giữ nguyên, không bị xoá
    expect(inactiveAfter[0]?.systemTags).toEqual(['MAIN'])

    // Thêm lại qua reactivateGroupDish
    await drizzleDishRepository.reactivateGroupDish(targetDish.id)

    // Trở lại 2 active, 0 inactive
    const activeRestored = await drizzleDishRepository.listActiveInGroup(group.id)
    expect(activeRestored).toHaveLength(2)
    const inactiveRestored = await drizzleDishRepository.listInactiveInGroup(group.id)
    expect(inactiveRestored).toHaveLength(0)

    // Không sinh thêm dòng mới trong groupDishes
    const allDishes = await getDb()
      .select({ id: groupDishes.id })
      .from(groupDishes)
      .where(eq(groupDishes.groupId, group.id))
    expect(allDishes).toHaveLength(2)
  })

  it('TC-020: Thêm món -> gỡ món -> thêm lại qua addExistingGlobalDishToGroup -> không tạo Global Dish mới', async () => {
    const { group, dishes } = await seedGroupWithDishes(['Bún chả'])
    const targetDish = dishes[0]!

    // Tìm globalDishId tương ứng
    const [row] = await getDb()
      .select({ globalDishId: groupDishes.globalDishId })
      .from(groupDishes)
      .where(eq(groupDishes.id, targetDish.id))
      .limit(1)
    expect(row).toBeDefined()
    const globalDishId = row!.globalDishId

    // Đếm số dòng globalDishes ban đầu
    const globalDishesBefore = await getDb()
      .select({ id: globalDishes.id })
      .from(globalDishes)
      .where(eq(globalDishes.id, globalDishId))
    expect(globalDishesBefore).toHaveLength(1)

    // Gỡ món
    await drizzleDishRepository.deactivateGroupDish(targetDish.id)

    // Thêm lại qua addExistingGlobalDishToGroup (như luồng UI duplicate sheet hoặc search)
    const reAdded = await drizzleDishRepository.addExistingGlobalDishToGroup({
      groupId: group.id,
      globalDishId,
    })
    expect(reAdded.id).toBe(targetDish.id)

    // Số dòng globalDishes vẫn là 1, không sinh Global Dish mới
    const globalDishesAfter = await getDb()
      .select({ id: globalDishes.id })
      .from(globalDishes)
      .where(eq(globalDishes.id, globalDishId))
    expect(globalDishesAfter).toHaveLength(1)

    // Món đã trở lại ACTIVE
    const active = await drizzleDishRepository.listActiveInGroup(group.id)
    expect(active).toHaveLength(1)
    expect(active[0]?.id).toBe(targetDish.id)
  })

  it('Gỡ hết món của nhóm -> countActiveInGroup trả về 0', async () => {
    const { group, dishes } = await seedGroupWithDishes(['Món duy nhất'])
    const targetDish = dishes[0]!

    expect(await drizzleDishRepository.countActiveInGroup(group.id)).toBe(1)

    await drizzleDishRepository.deactivateGroupDish(targetDish.id)

    expect(await drizzleDishRepository.countActiveInGroup(group.id)).toBe(0)
  })
})
