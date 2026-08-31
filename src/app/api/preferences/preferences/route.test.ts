import { describe, expect, it, vi } from 'vitest'

import * as apiAuth from '@/app/api/api-auth'
import { drizzlePreferenceRepository } from '@/features/preference/infrastructure/drizzle-preference-repository'

import { PUT } from './route'

vi.mock('@/app/api/api-auth', () => ({
  requireApiUser: vi.fn(),
}))

vi.mock('@/features/preference/infrastructure/drizzle-preference-repository', () => ({
  drizzlePreferenceRepository: {
    setConstraint: vi.fn(),
    setPreference: vi.fn(),
    findConstrainedGlobalDishIds: vi.fn(),
    findPreferencesByGlobalDish: vi.fn(),
  },
}))

describe('PUT /api/preferences/preferences', () => {
  it('chưa đăng nhập: trả 401 ERR_UNAUTHENTICATED', async () => {
    vi.mocked(apiAuth.requireApiUser).mockResolvedValueOnce({
      ok: false,
      response: Response.json({ code: 'ERR_UNAUTHENTICATED' }, { status: 401 }),
    })

    const request = new Request('http://localhost/api/preferences/preferences', {
      method: 'PUT',
      body: JSON.stringify({ globalDishId: 'gd-1', kind: 'LIKE' }),
    })

    const response = await PUT(request)
    expect(response.status).toBe(401)
  })

  it('kind không hợp lệ (không phải LIKE, DISLIKE, null): trả 400 ERR_VALIDATION', async () => {
    vi.mocked(apiAuth.requireApiUser).mockResolvedValueOnce({
      ok: true,
      user: { id: 'u-auth', email: 'test@example.com', displayName: 'User Auth' },
    })

    const request = new Request('http://localhost/api/preferences/preferences', {
      method: 'PUT',
      body: JSON.stringify({ globalDishId: 'gd-1', kind: 'INVALID' }),
    })

    const response = await PUT(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.code).toBe('ERR_VALIDATION')
  })

  it('hợp lệ: đặt LIKE thành công cho người đăng nhập', async () => {
    vi.mocked(apiAuth.requireApiUser).mockResolvedValueOnce({
      ok: true,
      user: { id: 'u-auth', email: 'test@example.com', displayName: 'User Auth' },
    })
    vi.mocked(drizzlePreferenceRepository.setPreference).mockResolvedValueOnce(undefined)

    const request = new Request('http://localhost/api/preferences/preferences', {
      method: 'PUT',
      body: JSON.stringify({ globalDishId: 'gd-1', kind: 'LIKE' }),
    })

    const response = await PUT(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.ok).toBe(true)

    expect(drizzlePreferenceRepository.setPreference).toHaveBeenCalledWith({
      userId: 'u-auth',
      globalDishId: 'gd-1',
      kind: 'LIKE',
    })
  })

  it('hợp lệ: đặt kind: null (Neutral) thành công', async () => {
    vi.mocked(apiAuth.requireApiUser).mockResolvedValueOnce({
      ok: true,
      user: { id: 'u-auth', email: 'test@example.com', displayName: 'User Auth' },
    })
    vi.mocked(drizzlePreferenceRepository.setPreference).mockResolvedValueOnce(undefined)

    const request = new Request('http://localhost/api/preferences/preferences', {
      method: 'PUT',
      body: JSON.stringify({ globalDishId: 'gd-1', kind: null }),
    })

    const response = await PUT(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.ok).toBe(true)

    expect(drizzlePreferenceRepository.setPreference).toHaveBeenCalledWith({
      userId: 'u-auth',
      globalDishId: 'gd-1',
      kind: null,
    })
  })
})
