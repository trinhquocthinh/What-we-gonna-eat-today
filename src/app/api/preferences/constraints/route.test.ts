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
    findCannotEatPairs: vi.fn(),
    findPreferencesByGlobalDish: vi.fn(),
  },
}))

describe('PUT /api/preferences/constraints', () => {
  it('chưa đăng nhập: trả 401 ERR_UNAUTHENTICATED', async () => {
    vi.mocked(apiAuth.requireApiUser).mockResolvedValueOnce({
      ok: false,
      response: Response.json({ code: 'ERR_UNAUTHENTICATED' }, { status: 401 }),
    })

    const request = new Request('http://localhost/api/preferences/constraints', {
      method: 'PUT',
      body: JSON.stringify({ globalDishId: 'gd-1', cannotEat: true }),
    })

    const response = await PUT(request)
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.code).toBe('ERR_UNAUTHENTICATED')
  })

  it('body không phải JSON: trả 400 ERR_VALIDATION', async () => {
    vi.mocked(apiAuth.requireApiUser).mockResolvedValueOnce({
      ok: true,
      user: { id: 'u-auth', email: 'test@example.com', displayName: 'User Auth' },
    })

    const request = new Request('http://localhost/api/preferences/constraints', {
      method: 'PUT',
      body: 'invalid-json',
    })

    const response = await PUT(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.code).toBe('ERR_VALIDATION')
  })

  it('thiếu globalDishId hoặc cannotEat sai kiểu: trả 400 ERR_VALIDATION', async () => {
    vi.mocked(apiAuth.requireApiUser).mockResolvedValueOnce({
      ok: true,
      user: { id: 'u-auth', email: 'test@example.com', displayName: 'User Auth' },
    })

    const request = new Request('http://localhost/api/preferences/constraints', {
      method: 'PUT',
      body: JSON.stringify({ globalDishId: '', cannotEat: 'true' }),
    })

    const response = await PUT(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.code).toBe('ERR_VALIDATION')
  })

  it('TC-117 (§1.4): Payload kèm trường userId của người khác → bị bỏ qua, ghi cho người đăng nhập', async () => {
    vi.mocked(apiAuth.requireApiUser).mockResolvedValueOnce({
      ok: true,
      user: { id: 'u-auth', email: 'test@example.com', displayName: 'User Auth' },
    })
    vi.mocked(drizzlePreferenceRepository.setConstraint).mockResolvedValueOnce({
      removedInteraction: true,
    })

    const request = new Request('http://localhost/api/preferences/constraints', {
      method: 'PUT',
      body: JSON.stringify({
        globalDishId: 'gd-1',
        cannotEat: true,
        userId: 'other-user-id', // cố ý gửi userId của người khác
      }),
    })

    const response = await PUT(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.removedInteraction).toBe(true)

    // Khẳng định use case được gọi với userId của người đăng nhập (u-auth), không phải other-user-id
    expect(drizzlePreferenceRepository.setConstraint).toHaveBeenCalledWith({
      userId: 'u-auth',
      globalDishId: 'gd-1',
      cannotEat: true,
    })
  })
})
