import { describe, expect, it, vi } from 'vitest'

import { addExistingDishToGroup } from './add-existing-dish-to-group'
import type { DishRepository } from './dish-repository'

function makeDishes(): Partial<DishRepository> {
  return {
    addExistingGlobalDishToGroup: vi.fn(async () => ({ id: 'gd1', name: 'Canh chua' })),
    replaceSystemTags: vi.fn(async () => {}),
  }
}

describe('addExistingDishToGroup', () => {
  it('thêm món vào pool và GHI TAG đã chọn — tag không được rơi im lặng', async () => {
    const dishes = makeDishes()

    const result = await addExistingDishToGroup(
      { dishes: dishes as DishRepository },
      { groupId: 'g1', globalDishId: 'global-1', systemTags: ['SOUP'] },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value).toEqual({ id: 'gd1', name: 'Canh chua' })
    expect(dishes.addExistingGlobalDishToGroup).toHaveBeenCalledWith({
      groupId: 'g1',
      globalDishId: 'global-1',
    })
    // Tag gắn theo `group_dishes.id` mà upsert vừa trả về, KHÔNG phải globalDishId.
    expect(dishes.replaceSystemTags).toHaveBeenCalledWith({
      groupDishId: 'gd1',
      systemTags: ['SOUP'],
    })
  })

  it('nhận nhiều tag — "Bún chả" là STAPLE + MAIN, trả về theo thứ tự chuẩn', async () => {
    const dishes = makeDishes()

    await addExistingDishToGroup(
      { dishes: dishes as DishRepository },
      { groupId: 'g1', globalDishId: 'global-1', systemTags: ['MAIN', 'STAPLE'] },
    )

    expect(dishes.replaceSystemTags).toHaveBeenCalledWith({
      groupDishId: 'gd1',
      systemTags: ['STAPLE', 'MAIN'],
    })
  })

  it('tag lạ trả ERR_INVALID_SYSTEM_TAG và KHÔNG ghi gì', async () => {
    const dishes = makeDishes()

    const result = await addExistingDishToGroup(
      { dishes: dishes as DishRepository },
      { groupId: 'g1', globalDishId: 'global-1', systemTags: ['KHONG_CO_THAT'] },
    )

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_INVALID_SYSTEM_TAG')
    expect(dishes.addExistingGlobalDishToGroup).not.toHaveBeenCalled()
    expect(dishes.replaceSystemTags).not.toHaveBeenCalled()
  })

  it('mảng tag rỗng vẫn hợp lệ — xoá sạch nhãn (TC-023)', async () => {
    const dishes = makeDishes()

    const result = await addExistingDishToGroup(
      { dishes: dishes as DishRepository },
      { groupId: 'g1', globalDishId: 'global-1', systemTags: [] },
    )

    expect(result.ok).toBe(true)
    expect(dishes.replaceSystemTags).toHaveBeenCalledWith({ groupDishId: 'gd1', systemTags: [] })
  })
})
