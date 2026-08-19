import { describe, expect, it } from 'vitest'

import type { DishRepository, GroupDishListItem } from './dish-repository'
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
    async findActiveGroupDish() {
      throw new Error('không dùng trong test này')
    },
    async replaceSystemTags() {
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

  it('giữ nguyên thứ tự danh sách món ACTIVE mà repository trả về kèm tag', async () => {
    const dishes: GroupDishListItem[] = [
      { id: 'dish-1', name: 'Cá basa kho tiêu', systemTags: ['MAIN'] },
      { id: 'dish-2', name: 'Canh chua cá lóc', systemTags: ['SOUP'] },
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
