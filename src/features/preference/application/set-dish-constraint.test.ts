import { describe, expect, it, vi } from 'vitest'

import type { PreferenceRepository } from './preference-repository'
import { setDishConstraint } from './set-dish-constraint'

function makeDeps(overrides: Partial<PreferenceRepository> = {}) {
  const preferences: PreferenceRepository = {
    setConstraint: vi.fn(async () => ({ removedInteraction: false })),
    setPreference: vi.fn(async () => undefined),
    findConstrainedGlobalDishIds: vi.fn(async () => new Set<string>()),
    findPreferencesByGlobalDish: vi.fn(async () => new Map()),
    ...overrides,
  }
  return { preferences }
}

describe('setDishConstraint — E7-T4', () => {
  it('bật ràng buộc Cannot Eat thành công (không có lượt vuốt cũ để xoá)', async () => {
    const deps = makeDeps({
      setConstraint: vi.fn(async () => ({ removedInteraction: false })),
    })

    const result = await setDishConstraint(deps, {
      userId: 'u-1',
      globalDishId: 'gd-1',
      cannotEat: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value).toEqual({ removedInteraction: false })
    expect(deps.preferences.setConstraint).toHaveBeenCalledWith({
      userId: 'u-1',
      globalDishId: 'gd-1',
      cannotEat: true,
    })
  })

  it('bật ràng buộc Cannot Eat xoá thành công một lượt vuốt đang có (TC-114)', async () => {
    const deps = makeDeps({
      setConstraint: vi.fn(async () => ({ removedInteraction: true })),
    })

    const result = await setDishConstraint(deps, {
      userId: 'u-1',
      globalDishId: 'gd-1',
      cannotEat: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value).toEqual({ removedInteraction: true })
  })

  it('gỡ ràng buộc Cannot Eat (cannotEat: false) thành công (TC-115)', async () => {
    const deps = makeDeps({
      setConstraint: vi.fn(async () => ({ removedInteraction: false })),
    })

    const result = await setDishConstraint(deps, {
      userId: 'u-1',
      globalDishId: 'gd-1',
      cannotEat: false,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value).toEqual({ removedInteraction: false })
    expect(deps.preferences.setConstraint).toHaveBeenCalledWith({
      userId: 'u-1',
      globalDishId: 'gd-1',
      cannotEat: false,
    })
  })

  it('validate: globalDishId rỗng trả về ERR_VALIDATION', async () => {
    const deps = makeDeps()

    const result = await setDishConstraint(deps, {
      userId: 'u-1',
      globalDishId: '',
      cannotEat: true,
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_VALIDATION')
    expect(result.error.details).toEqual({ field: 'globalDishId' })
    expect(deps.preferences.setConstraint).not.toHaveBeenCalled()
  })

  it('validate: userId rỗng trả về ERR_VALIDATION', async () => {
    const deps = makeDeps()

    const result = await setDishConstraint(deps, {
      userId: '',
      globalDishId: 'gd-1',
      cannotEat: true,
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_VALIDATION')
    expect(result.error.details).toEqual({ field: 'userId' })
    expect(deps.preferences.setConstraint).not.toHaveBeenCalled()
  })

  it('validate: cannotEat không phải boolean trả về ERR_VALIDATION', async () => {
    const deps = makeDeps()

    const result = await setDishConstraint(deps, {
      userId: 'u-1',
      globalDishId: 'gd-1',
      cannotEat: 'true' as unknown as boolean,
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_VALIDATION')
    expect(result.error.details).toEqual({ field: 'cannotEat' })
    expect(deps.preferences.setConstraint).not.toHaveBeenCalled()
  })
})
