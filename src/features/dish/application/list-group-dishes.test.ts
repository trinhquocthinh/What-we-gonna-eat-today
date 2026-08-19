import { describe, expect, it } from 'vitest'

import type { DishRepository, GroupDishSummary } from './dish-repository'
import { listGroupDishes } from './list-group-dishes'

function makeThrowingRepo(overrides: Partial<DishRepository> = {}): DishRepository {
  return {
    async findInGroupByNormalizedName() {
      throw new Error('không dùng trong test này')
    },
    async findGlobalCandidatesByNormalizedName() {
      throw new Error('không dùng trong test này')
    },
    async createGlobalDishAndAddToPool() {
      throw new Error('không dùng trong test này')
    },
    async reactivateGroupDish() {
      throw new Error('không dùng trong test này')
    },
    async addExistingGlobalDishToGroup() {
      throw new Error('không dùng trong test này')
    },
    async listActiveInGroup() {
      throw new Error('không dùng trong test này')
    },
    ...overrides,
  }
}

describe('listGroupDishes', () => {
  it('trả về mảng rỗng khi nhóm chưa có món nào', async () => {
    const fakeRepo = makeThrowingRepo({
      async listActiveInGroup() {
        return []
      },
    })

    const result = await listGroupDishes({ dishes: fakeRepo }, 'group-1')
    expect(result).toEqual([])
  })

  it('giữ nguyên thứ tự danh sách món ACTIVE mà repository trả về', async () => {
    const dishes: GroupDishSummary[] = [
      { id: 'dish-1', name: 'Cá basa kho tiêu' },
      { id: 'dish-2', name: 'Canh chua cá lóc' },
    ]
    const fakeRepo = makeThrowingRepo({
      async listActiveInGroup() {
        return dishes
      },
    })

    const result = await listGroupDishes({ dishes: fakeRepo }, 'group-1')
    expect(result).toEqual(dishes)
  })
})
