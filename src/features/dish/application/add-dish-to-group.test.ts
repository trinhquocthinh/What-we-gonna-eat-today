import { describe, expect, it } from 'vitest'

import { makeGroup, makeUser } from '@/shared/testing/factories'

import type { DishRepository, GroupDishSummary, NewDishInGroup } from './dish-repository'
import { addDishToGroup } from './add-dish-to-group'

type Row = NewDishInGroup & { id: string }

/** Cổng giả là object thuần, không auto-mock (Test Cases §1.3). */
function makeFakeDishRepository(seed: Row[] = []) {
  const rows: Row[] = [...seed]

  const repository: DishRepository = {
    async findInGroupByNormalizedName(groupId, normalizedName) {
      const found = rows.find(
        (row) => row.groupId === groupId && row.normalizedName === normalizedName,
      )
      return found === undefined ? null : { id: found.id, name: found.name }
    },
    async createGlobalDishAndAddToPool(input) {
      const id = `group-dish-${rows.length + 1}`
      rows.push({ ...input, id })
      return { id, name: input.name }
    },
    async listActiveInGroup(): Promise<GroupDishSummary[]> {
      return rows.map((row) => ({ id: row.id, name: row.name }))
    },
  }

  return { repository, rows }
}

const GROUP_ID = makeGroup().id
const CREATOR = makeUser().id

describe('SPEC-005 rút gọn — Thêm Dish vào Group Dish Pool', () => {
  it('SPEC-005: thêm "  Cá basa   kho tiêu " thì lưu tên đã dọn và normalized_name', async () => {
    const fake = makeFakeDishRepository()

    const result = await addDishToGroup(
      { dishes: fake.repository },
      { groupId: GROUP_ID, creatorUserId: CREATOR, name: '  Cá basa   kho tiêu ' },
    )

    expect(result.ok).toBe(true)
    expect(fake.rows).toHaveLength(1)
    expect(fake.rows[0]?.name).toBe('Cá basa kho tiêu')
    expect(fake.rows[0]?.normalizedName).toBe('cá basa kho tiêu')
  })

  it('BR-001: provenance đi kèm mọi Global Dish mới', async () => {
    const fake = makeFakeDishRepository()

    await addDishToGroup(
      { dishes: fake.repository },
      { groupId: GROUP_ID, creatorUserId: CREATOR, name: 'Canh chua cá lóc' },
    )

    expect(fake.rows[0]?.creatorUserId).toBe(CREATOR)
    expect(fake.rows[0]?.groupId).toBe(GROUP_ID)
  })

  it('SPEC-005: món đã có trong pool thì ERR_DISH_ALREADY_IN_POOL và KHÔNG ghi thêm', async () => {
    const fake = makeFakeDishRepository([
      {
        id: 'group-dish-1',
        groupId: GROUP_ID,
        name: 'Canh chua cá lóc',
        normalizedName: 'canh chua cá lóc',
        creatorUserId: CREATOR,
      },
    ])

    const result = await addDishToGroup(
      { dishes: fake.repository },
      { groupId: GROUP_ID, creatorUserId: CREATOR, name: '  canh   CHUA cá lóc  ' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_DISH_ALREADY_IN_POOL')
    expect(fake.rows).toHaveLength(1)
  })

  it('BR-005: cùng tên ở Group KHÁC vẫn thêm được — pool là của từng Group', async () => {
    const fake = makeFakeDishRepository([
      {
        id: 'group-dish-1',
        groupId: GROUP_ID,
        name: 'Canh chua cá lóc',
        normalizedName: 'canh chua cá lóc',
        creatorUserId: CREATOR,
      },
    ])

    const result = await addDishToGroup(
      { dishes: fake.repository },
      { groupId: 'group-khac', creatorUserId: CREATOR, name: 'Canh chua cá lóc' },
    )

    expect(result.ok).toBe(true)
    expect(fake.rows).toHaveLength(2)
  })

  it('SPEC-005: tên toàn khoảng trắng thì ERR_VALIDATION và KHÔNG chạm repository', async () => {
    const fake = makeFakeDishRepository()

    const result = await addDishToGroup(
      { dishes: fake.repository },
      { groupId: GROUP_ID, creatorUserId: CREATOR, name: '   ' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_VALIDATION')
    expect(result.ok === false && result.error.details?.['field']).toBe('name')
    expect(fake.rows).toHaveLength(0)
  })

  it('SPEC-005: 120 ký tự thì được, 121 thì ERR_VALIDATION', async () => {
    const fake = makeFakeDishRepository()
    const deps = { dishes: fake.repository }

    expect(
      (
        await addDishToGroup(deps, {
          groupId: GROUP_ID,
          creatorUserId: CREATOR,
          name: 'à'.repeat(120),
        })
      ).ok,
    ).toBe(true)

    const tooLong = await addDishToGroup(deps, {
      groupId: GROUP_ID,
      creatorUserId: CREATOR,
      name: 'à'.repeat(121),
    })
    expect(tooLong.ok === false && tooLong.error.code).toBe('ERR_VALIDATION')
  })
})
