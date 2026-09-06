import { describe, expect, it, vi } from 'vitest'

import type { PreferenceRepository } from './preference-repository'
import { resetImplicitPreference } from './reset-implicit-preference'

const RESET_AT = '2026-09-06T03:24:00.000Z'

function makeDeps(overrides: Partial<PreferenceRepository> = {}) {
  const preferences: PreferenceRepository = {
    setConstraint: vi.fn(async () => ({ removedInteraction: false })),
    resetImplicitPreference: vi.fn(async () => ({ implicitResetAt: RESET_AT })),
    findImplicitResetAt: vi.fn(async () => null),
    setPreference: vi.fn(async () => undefined),
    findConstrainedGlobalDishIds: vi.fn(async () => new Set<string>()),
    findCannotEatPairs: vi.fn(async () => new Set<string>()),
    findPreferencesByGlobalDish: vi.fn(async () => new Map()),
    ...overrides,
  }
  return { preferences }
}

describe('resetImplicitPreference — E13-T6 (SPEC-040)', () => {
  it('trả về mốc thời gian do repository sinh', async () => {
    const deps = makeDeps()

    const result = await resetImplicitPreference(deps, { userId: 'u-1' })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value).toEqual({ implicitResetAt: RESET_AT })
    expect(deps.preferences.resetImplicitPreference).toHaveBeenCalledWith('u-1')
  })

  it('TC-173 — KHÔNG chạm tới Like/Dislike hay ba cờ cá nhân', async () => {
    // Đúng theo cấu trúc: use case này chỉ có một đường ghi. Ca ghim để lần
    // sửa sau không "tiện tay" dọn luôn mấy bảng kia cho sạch.
    const deps = makeDeps()

    await resetImplicitPreference(deps, { userId: 'u-1' })

    expect(deps.preferences.setPreference).not.toHaveBeenCalled()
    expect(deps.preferences.setConstraint).not.toHaveBeenCalled()
  })

  it('validate: userId rỗng trả về ERR_VALIDATION, không ghi gì', async () => {
    const deps = makeDeps()

    const result = await resetImplicitPreference(deps, { userId: '   ' })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_VALIDATION')
    expect(result.error.details).toEqual({ field: 'userId' })
    expect(deps.preferences.resetImplicitPreference).not.toHaveBeenCalled()
  })
})
