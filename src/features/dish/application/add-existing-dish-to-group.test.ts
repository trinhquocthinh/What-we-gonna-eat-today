import { describe, expect, it, vi } from 'vitest'

import { addExistingDishToGroup } from './add-existing-dish-to-group'
import type { DishRepository } from './dish-repository'

describe('addExistingDishToGroup', () => {
  it('gọi thẳng addExistingGlobalDishToGroup, trả dish', async () => {
    const dishes: Partial<DishRepository> = {
      addExistingGlobalDishToGroup: vi.fn(async () => ({ id: 'gd1', name: 'Canh chua' })),
    }

    const result = await addExistingDishToGroup(
      { dishes: dishes as DishRepository },
      { groupId: 'g1', globalDishId: 'global-1' },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value).toEqual({ id: 'gd1', name: 'Canh chua' })
    expect(dishes.addExistingGlobalDishToGroup).toHaveBeenCalledWith({
      groupId: 'g1',
      globalDishId: 'global-1',
    })
  })
})
