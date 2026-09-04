import { describe, expect, it, vi } from 'vitest'

import type { PreferenceKind } from '../domain/explicit-preference'
import type { PreferenceRepository } from './preference-repository'
import { setDishPreference } from './set-dish-preference'

function makeDeps(overrides: Partial<PreferenceRepository> = {}) {
  const preferences: PreferenceRepository = {
    setConstraint: vi.fn(async () => ({ removedInteraction: false })),
    setPreference: vi.fn(async () => undefined),
    findConstrainedGlobalDishIds: vi.fn(async () => new Set<string>()),
    findCannotEatPairs: vi.fn(async () => new Set<string>()),
    findPreferencesByGlobalDish: vi.fn(async () => new Map()),
    ...overrides,
  }
  return { preferences }
}

describe('setDishPreference — E7-T4', () => {
  it('đặt sở thích LIKE thành công (TC-118)', async () => {
    const deps = makeDeps()

    const result = await setDishPreference(deps, {
      userId: 'u-1',
      globalDishId: 'gd-1',
      kind: 'LIKE',
    })

    expect(result.ok).toBe(true)
    expect(deps.preferences.setPreference).toHaveBeenCalledWith({
      userId: 'u-1',
      globalDishId: 'gd-1',
      kind: 'LIKE',
    })
  })

  it('đặt sở thích DISLIKE thành công (TC-118, TC-119)', async () => {
    const deps = makeDeps()

    const result = await setDishPreference(deps, {
      userId: 'u-1',
      globalDishId: 'gd-1',
      kind: 'DISLIKE',
    })

    expect(result.ok).toBe(true)
    expect(deps.preferences.setPreference).toHaveBeenCalledWith({
      userId: 'u-1',
      globalDishId: 'gd-1',
      kind: 'DISLIKE',
    })
  })

  it('đặt sở thích null (Neutral) thành công — xoá dòng trong DB (TC-120)', async () => {
    const deps = makeDeps()

    const result = await setDishPreference(deps, {
      userId: 'u-1',
      globalDishId: 'gd-1',
      kind: null,
    })

    expect(result.ok).toBe(true)
    expect(deps.preferences.setPreference).toHaveBeenCalledWith({
      userId: 'u-1',
      globalDishId: 'gd-1',
      kind: null,
    })
  })

  it('validate: globalDishId rỗng trả về ERR_VALIDATION', async () => {
    const deps = makeDeps()

    const result = await setDishPreference(deps, {
      userId: 'u-1',
      globalDishId: '',
      kind: 'LIKE',
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_VALIDATION')
    expect(result.error.details).toEqual({ field: 'globalDishId' })
    expect(deps.preferences.setPreference).not.toHaveBeenCalled()
  })

  it('validate: userId rỗng trả về ERR_VALIDATION', async () => {
    const deps = makeDeps()

    const result = await setDishPreference(deps, {
      userId: '',
      globalDishId: 'gd-1',
      kind: 'LIKE',
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_VALIDATION')
    expect(result.error.details).toEqual({ field: 'userId' })
    expect(deps.preferences.setPreference).not.toHaveBeenCalled()
  })

  it('validate: kind không hợp lệ (không phải LIKE, DISLIKE hay null) trả về ERR_VALIDATION', async () => {
    const deps = makeDeps()

    const result = await setDishPreference(deps, {
      userId: 'u-1',
      globalDishId: 'gd-1',
      kind: 'NEUTRAL' as unknown as PreferenceKind,
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_VALIDATION')
    expect(result.error.details).toEqual({ field: 'kind' })
    expect(deps.preferences.setPreference).not.toHaveBeenCalled()
  })
})
