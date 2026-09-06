import { describe, expect, it, vi } from 'vitest'

import type { ConstraintKind } from '../domain/explicit-preference'
import type { PreferenceRepository } from './preference-repository'
import { setDishConstraint } from './set-dish-constraint'

function makeDeps(overrides: Partial<PreferenceRepository> = {}) {
  const preferences: PreferenceRepository = {
    setConstraint: vi.fn(async () => ({ removedInteraction: false })),
    resetImplicitPreference: vi.fn(async () => ({ implicitResetAt: '2026-09-06T00:00:00.000Z' })),
    findImplicitResetAt: vi.fn(async () => null),
    setPreference: vi.fn(async () => undefined),
    findConstrainedGlobalDishIds: vi.fn(async () => new Set<string>()),
    findCannotEatPairs: vi.fn(async () => new Set<string>()),
    findPreferencesByGlobalDish: vi.fn(async () => new Map()),
    ...overrides,
  }
  return { preferences }
}

describe('setDishConstraint — E7-T4 + E13-T6', () => {
  it('bật ràng buộc Cannot Eat thành công (không có lượt vuốt cũ để xoá)', async () => {
    const deps = makeDeps({
      setConstraint: vi.fn(async () => ({ removedInteraction: false })),
    })

    const result = await setDishConstraint(deps, {
      userId: 'u-1',
      globalDishId: 'gd-1',
      kind: 'CANNOT_EAT',
      enabled: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value).toEqual({ removedInteraction: false })
    expect(deps.preferences.setConstraint).toHaveBeenCalledWith({
      userId: 'u-1',
      globalDishId: 'gd-1',
      kind: 'CANNOT_EAT',
      enabled: true,
    })
  })

  it('bật ràng buộc Cannot Eat xoá thành công một lượt vuốt đang có (TC-114)', async () => {
    const deps = makeDeps({
      setConstraint: vi.fn(async () => ({ removedInteraction: true })),
    })

    const result = await setDishConstraint(deps, {
      userId: 'u-1',
      globalDishId: 'gd-1',
      kind: 'CANNOT_EAT',
      enabled: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value).toEqual({ removedInteraction: true })
  })

  it('gỡ ràng buộc Cannot Eat (enabled: false) thành công (TC-115)', async () => {
    const deps = makeDeps({
      setConstraint: vi.fn(async () => ({ removedInteraction: false })),
    })

    const result = await setDishConstraint(deps, {
      userId: 'u-1',
      globalDishId: 'gd-1',
      kind: 'CANNOT_EAT',
      enabled: false,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value).toEqual({ removedInteraction: false })
    expect(deps.preferences.setConstraint).toHaveBeenCalledWith({
      userId: 'u-1',
      globalDishId: 'gd-1',
      kind: 'CANNOT_EAT',
      enabled: false,
    })
  })

  it('E13-T6 — ba loại cờ đều đi qua use case này, `kind` truyền nguyên xuống repository', async () => {
    for (const kind of ['CANNOT_EAT', 'BLACKLIST', 'HISTORY_WHITELIST'] as const) {
      const deps = makeDeps()

      const result = await setDishConstraint(deps, {
        userId: 'u-1',
        globalDishId: 'gd-1',
        kind,
        enabled: true,
      })

      expect(result.ok).toBe(true)
      expect(deps.preferences.setConstraint).toHaveBeenCalledWith({
        userId: 'u-1',
        globalDishId: 'gd-1',
        kind,
        enabled: true,
      })
    }
  })

  it('validate: globalDishId rỗng trả về ERR_VALIDATION', async () => {
    const deps = makeDeps()

    const result = await setDishConstraint(deps, {
      userId: 'u-1',
      globalDishId: '',
      kind: 'CANNOT_EAT',
      enabled: true,
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
      kind: 'CANNOT_EAT',
      enabled: true,
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_VALIDATION')
    expect(result.error.details).toEqual({ field: 'userId' })
    expect(deps.preferences.setConstraint).not.toHaveBeenCalled()
  })

  it('validate: kind lạ trả về ERR_VALIDATION, KHÔNG ghi gì', async () => {
    const deps = makeDeps()

    const result = await setDishConstraint(deps, {
      userId: 'u-1',
      globalDishId: 'gd-1',
      kind: 'FAVOURITE' as unknown as ConstraintKind,
      enabled: true,
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_VALIDATION')
    expect(result.error.details).toEqual({ field: 'kind' })
    expect(deps.preferences.setConstraint).not.toHaveBeenCalled()
  })

  it('validate: enabled không phải boolean trả về ERR_VALIDATION', async () => {
    const deps = makeDeps()

    const result = await setDishConstraint(deps, {
      userId: 'u-1',
      globalDishId: 'gd-1',
      kind: 'CANNOT_EAT',
      enabled: 'true' as unknown as boolean,
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_VALIDATION')
    expect(result.error.details).toEqual({ field: 'enabled' })
    expect(deps.preferences.setConstraint).not.toHaveBeenCalled()
  })
})
