import { describe, expect, it, vi } from 'vitest'

import { addDishToGroup, type AddDishToGroupDeps } from './add-dish-to-group'
import type { DishRepository, GroupDishLookup } from './dish-repository'

function makeDeps(
  overrides: {
    existing?: GroupDishLookup | null
    candidates?: { id: string; name: string }[]
  } = {},
): AddDishToGroupDeps {
  const dishes: DishRepository = {
    findInGroupByNormalizedName: vi.fn(async () => overrides.existing ?? null),
    findGlobalCandidatesByNormalizedName: vi.fn(async () => overrides.candidates ?? []),
    searchGlobalDishes: vi.fn(async () => []),
    createGlobalDishAndAddToPool: vi.fn(async (input) => ({ id: 'new-dish', name: input.name })),
    reactivateGroupDish: vi.fn(async () => undefined),
    deactivateGroupDish: vi.fn(async () => undefined),
    addExistingGlobalDishToGroup: vi.fn(async () => ({ id: 'reused', name: 'x' })),
    listActiveInGroup: vi.fn(async () => []),
    listInactiveInGroup: vi.fn(async () => []),
    findActiveGroupDish: vi.fn(async () => null),
    replaceSystemTags: vi.fn(async () => undefined),
    countActiveInGroup: vi.fn(async () => 0),
  }
  return { dishes }
}

describe('addDishToGroup', () => {
  it('TC-017 — chưa có Dish nào: tạo mới, normalized_name đúng, truyền systemTags', async () => {
    const deps = makeDeps()

    const result = await addDishToGroup(deps, {
      groupId: 'g1',
      creatorUserId: 'u1',
      name: '  Canh   Chua  ',
      systemTags: ['SOUP'],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.kind).toBe('added')
    expect(deps.dishes.createGlobalDishAndAddToPool).toHaveBeenCalledWith(
      expect.objectContaining({ normalizedName: 'canh chua', systemTags: ['SOUP'] }),
    )
  })

  it('TC-018 — đã có Global Dish cùng tên, không forceCreate: trả candidates, không tạo', async () => {
    const deps = makeDeps({ candidates: [{ id: 'gd1', name: 'Canh chua' }] })

    const result = await addDishToGroup(deps, {
      groupId: 'g1',
      creatorUserId: 'u1',
      name: 'canh chua',
      systemTags: [],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value).toEqual({
      kind: 'candidates',
      candidates: [{ id: 'gd1', name: 'Canh chua' }],
    })
    expect(deps.dishes.createGlobalDishAndAddToPool).not.toHaveBeenCalled()
  })

  it('TC-019 — forceCreate=true: tạo Global Dish thứ hai dù có candidate', async () => {
    const deps = makeDeps({ candidates: [{ id: 'gd1', name: 'Canh chua' }] })

    const result = await addDishToGroup(deps, {
      groupId: 'g1',
      creatorUserId: 'u1',
      name: 'canh chua',
      systemTags: ['MAIN'],
      forceCreate: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.kind).toBe('added')
    expect(deps.dishes.createGlobalDishAndAddToPool).toHaveBeenCalledOnce()
    expect(deps.dishes.findGlobalCandidatesByNormalizedName).not.toHaveBeenCalled()
  })

  it('TC-020 — Dish INACTIVE trong group: khôi phục ACTIVE, ghi đè tag bằng mảng rỗng', async () => {
    const deps = makeDeps({ existing: { id: 'gd-existing', name: 'Canh chua', state: 'INACTIVE' } })

    const result = await addDishToGroup(deps, {
      groupId: 'g1',
      creatorUserId: 'u1',
      name: 'canh chua',
      systemTags: [],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value).toEqual({ kind: 'added', dish: { id: 'gd-existing', name: 'Canh chua' } })
    expect(deps.dishes.reactivateGroupDish).toHaveBeenCalledWith('gd-existing')
    expect(deps.dishes.replaceSystemTags).toHaveBeenCalledWith({
      groupDishId: 'gd-existing',
      systemTags: [],
    })
    expect(deps.dishes.createGlobalDishAndAddToPool).not.toHaveBeenCalled()
  })

  it('TC-020 — Dish INACTIVE trong group: khôi phục ACTIVE, ghi đè tag bằng tag mới', async () => {
    const deps = makeDeps({ existing: { id: 'gd-existing', name: 'Canh chua', state: 'INACTIVE' } })

    const result = await addDishToGroup(deps, {
      groupId: 'g1',
      creatorUserId: 'u1',
      name: 'canh chua',
      systemTags: ['SOUP'],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(deps.dishes.reactivateGroupDish).toHaveBeenCalledWith('gd-existing')
    expect(deps.dishes.replaceSystemTags).toHaveBeenCalledWith({
      groupDishId: 'gd-existing',
      systemTags: ['SOUP'],
    })
  })

  it('TC-099 — Dish đã ACTIVE trong group: ERR_DISH_ALREADY_IN_POOL', async () => {
    const deps = makeDeps({ existing: { id: 'gd-existing', name: 'Canh chua', state: 'ACTIVE' } })

    const result = await addDishToGroup(deps, {
      groupId: 'g1',
      creatorUserId: 'u1',
      name: 'canh chua',
      systemTags: [],
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_DISH_ALREADY_IN_POOL')
  })

  it('TC-021 — tag ngoài enum: ERR_INVALID_SYSTEM_TAG với field=systemTag', async () => {
    const deps = makeDeps()

    const result = await addDishToGroup(deps, {
      groupId: 'g1',
      creatorUserId: 'u1',
      name: 'Canh chua',
      systemTags: ['BREAKFAST'],
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_INVALID_SYSTEM_TAG')
    expect(result.error.details?.['field']).toBe('systemTag')
    expect(deps.dishes.createGlobalDishAndAddToPool).not.toHaveBeenCalled()
  })

  it('tên trống: ERR_VALIDATION với field=dishName', async () => {
    const deps = makeDeps()

    const result = await addDishToGroup(deps, {
      groupId: 'g1',
      creatorUserId: 'u1',
      name: '   ',
      systemTags: [],
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_VALIDATION')
    expect(result.error.details?.['field']).toBe('dishName')
  })

  it('TC-097 (hồi quy) — tên 120 ký tự vẫn được chấp nhận', async () => {
    const deps = makeDeps()
    const longName = 'a'.repeat(120)

    const result = await addDishToGroup(deps, {
      groupId: 'g1',
      creatorUserId: 'u1',
      name: longName,
      systemTags: [],
    })

    expect(result.ok).toBe(true)
  })
})
