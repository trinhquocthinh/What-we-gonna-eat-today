import { describe, expect, it, vi } from 'vitest'

import { failure } from '@/shared/errors'
import { err, ok } from '@/shared/result'

import { setSystemTags } from './set-system-tags'
import type { DishRepository } from './dish-repository'

function makeDeps(
  overrides: { isAdmin?: boolean; dish?: { id: string; name: string } | null } = {},
) {
  const replaceSystemTags = vi.fn(async () => undefined)
  const dishes = {
    findActiveGroupDish: vi.fn(async () =>
      overrides.dish === undefined ? { id: 'gd1', name: 'Canh chua' } : overrides.dish,
    ),
    replaceSystemTags,
  } as unknown as DishRepository

  const assertAdmin = vi.fn(async () =>
    overrides.isAdmin === false ? err(failure('ERR_NOT_GROUP_ADMIN')) : ok(undefined),
  )

  return { deps: { dishes, assertAdmin }, replaceSystemTags }
}

const BASE_INPUT = {
  groupId: 'g1',
  groupDishId: 'gd1',
  requestedByUserId: 'u1',
}

describe('setSystemTags', () => {
  it('TC-022 — ghi đè [MAIN] thành [MAIN, SOUP]: đúng 2 tag', async () => {
    const { deps, replaceSystemTags } = makeDeps()

    const result = await setSystemTags(deps, { ...BASE_INPUT, systemTags: ['MAIN', 'SOUP'] })

    expect(result.ok).toBe(true)
    expect(replaceSystemTags).toHaveBeenCalledWith({
      groupDishId: 'gd1',
      systemTags: ['MAIN', 'SOUP'],
    })
  })

  it('TC-023 — gán [] thì món không còn tag nào', async () => {
    const { deps, replaceSystemTags } = makeDeps()

    const result = await setSystemTags(deps, { ...BASE_INPUT, systemTags: [] })

    expect(result.ok).toBe(true)
    expect(replaceSystemTags).toHaveBeenCalledWith({ groupDishId: 'gd1', systemTags: [] })
  })

  it('TC-025 — Member không phải Admin: ERR_NOT_GROUP_ADMIN, không ghi gì', async () => {
    const { deps, replaceSystemTags } = makeDeps({ isAdmin: false })

    const result = await setSystemTags(deps, { ...BASE_INPUT, systemTags: ['MAIN'] })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_NOT_GROUP_ADMIN')
    expect(replaceSystemTags).not.toHaveBeenCalled()
  })

  it('TC-021 — tag ngoài enum: ERR_INVALID_SYSTEM_TAG, không ghi gì', async () => {
    const { deps, replaceSystemTags } = makeDeps()

    const result = await setSystemTags(deps, { ...BASE_INPUT, systemTags: ['BREAKFAST'] })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_INVALID_SYSTEM_TAG')
    expect(replaceSystemTags).not.toHaveBeenCalled()
  })

  it('TC-100 — đủ 5 tag: chấp nhận, lưu theo thứ tự chuẩn', async () => {
    const { deps, replaceSystemTags } = makeDeps()

    await setSystemTags(deps, {
      ...BASE_INPUT,
      systemTags: ['DESSERT', 'SOUP', 'SIDE', 'MAIN', 'STAPLE'],
    })

    expect(replaceSystemTags).toHaveBeenCalledWith({
      groupDishId: 'gd1',
      systemTags: ['STAPLE', 'MAIN', 'SIDE', 'SOUP', 'DESSERT'],
    })
  })

  it('TC-101 — tag lặp: khử trùng trước khi lưu', async () => {
    const { deps, replaceSystemTags } = makeDeps()

    await setSystemTags(deps, { ...BASE_INPUT, systemTags: ['MAIN', 'MAIN', 'MAIN'] })

    expect(replaceSystemTags).toHaveBeenCalledWith({ groupDishId: 'gd1', systemTags: ['MAIN'] })
  })

  it('món không còn ACTIVE trong group: ERR_DISH_NOT_IN_POOL', async () => {
    const { deps, replaceSystemTags } = makeDeps({ dish: null })

    const result = await setSystemTags(deps, { ...BASE_INPUT, systemTags: ['MAIN'] })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_DISH_NOT_IN_POOL')
    expect(replaceSystemTags).not.toHaveBeenCalled()
  })
})
