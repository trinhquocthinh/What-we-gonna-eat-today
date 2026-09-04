import { describe, expect, it, vi } from 'vitest'

import { failure } from '@/shared/errors'
import { err, ok } from '@/shared/result'

import type { DishRepository } from './dish-repository'
import { removeDishFromGroup } from './remove-dish-from-group'

function makeDeps(
  overrides: {
    isAdmin?: boolean
    dish?: { id: string; name: string } | null
  } = {},
) {
  const deactivateGroupDish = vi.fn(async () => undefined)
  const dishes = {
    findActiveGroupDish: vi.fn(async () =>
      overrides.dish === undefined ? { id: 'gd1', name: 'Canh chua' } : overrides.dish,
    ),
    deactivateGroupDish,
  } as unknown as DishRepository

  const assertAdmin = vi.fn(async () =>
    overrides.isAdmin === false ? err(failure('ERR_NOT_GROUP_ADMIN')) : ok(undefined),
  )

  return { deps: { dishes, assertAdmin }, deactivateGroupDish }
}

const BASE_INPUT = {
  groupId: 'g1',
  groupDishId: 'gd1',
  requestedByUserId: 'u1',
}

describe('removeDishFromGroup', () => {
  it('Admin gỡ món ACTIVE -> thành công và gọi deactivateGroupDish', async () => {
    const { deps, deactivateGroupDish } = makeDeps()

    const result = await removeDishFromGroup(deps, BASE_INPUT)

    expect(result.ok).toBe(true)
    expect(deactivateGroupDish).toHaveBeenCalledWith('gd1')
  })

  it('Member không phải Admin: ERR_NOT_GROUP_ADMIN, không ghi gì', async () => {
    const { deps, deactivateGroupDish } = makeDeps({ isAdmin: false })

    const result = await removeDishFromGroup(deps, BASE_INPUT)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('ERR_NOT_GROUP_ADMIN')
    }
    expect(deactivateGroupDish).not.toHaveBeenCalled()
  })

  it('Gỡ món không tồn tại hoặc đã INACTIVE: ERR_DISH_NOT_IN_POOL, không ghi gì', async () => {
    const { deps, deactivateGroupDish } = makeDeps({ dish: null })

    const result = await removeDishFromGroup(deps, BASE_INPUT)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('ERR_DISH_NOT_IN_POOL')
    }
    expect(deactivateGroupDish).not.toHaveBeenCalled()
  })
})
