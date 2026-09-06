import { describe, expect, it, vi } from 'vitest'

import * as apiAuth from '@/app/api/api-auth'
import { drizzlePreferenceRepository } from '@/features/preference/infrastructure/drizzle-preference-repository'

import { POST } from './route'

vi.mock('@/app/api/api-auth', () => ({
  requireApiUser: vi.fn(),
}))

vi.mock('@/features/preference/infrastructure/drizzle-preference-repository', () => ({
  drizzlePreferenceRepository: {
    setConstraint: vi.fn(),
    resetImplicitPreference: vi.fn(),
    findImplicitResetAt: vi.fn(),
    setPreference: vi.fn(),
    findConstrainedGlobalDishIds: vi.fn(),
    findCannotEatPairs: vi.fn(),
    findPreferencesByGlobalDish: vi.fn(),
  },
}))

const RESET_AT = '2026-09-06T03:24:00.000Z'

describe('POST /api/preferences/implicit-reset', () => {
  it('chưa đăng nhập: trả 401 ERR_UNAUTHENTICATED, không ghi gì', async () => {
    vi.mocked(apiAuth.requireApiUser).mockResolvedValueOnce({
      ok: false,
      response: Response.json({ code: 'ERR_UNAUTHENTICATED' }, { status: 401 }),
    })
    vi.mocked(drizzlePreferenceRepository.resetImplicitPreference).mockClear()

    const response = await POST()

    expect(response.status).toBe(401)
    expect(drizzlePreferenceRepository.resetImplicitPreference).not.toHaveBeenCalled()
  })

  it('đã đăng nhập: ghi mốc cho CHÍNH người đăng nhập, trả về mốc đó', async () => {
    vi.mocked(apiAuth.requireApiUser).mockResolvedValueOnce({
      ok: true,
      user: { id: 'u-auth', email: 'test@example.com', displayName: 'User Auth' },
    })
    vi.mocked(drizzlePreferenceRepository.resetImplicitPreference).mockResolvedValueOnce({
      implicitResetAt: RESET_AT,
    })

    const response = await POST()

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.implicitResetAt).toBe(RESET_AT)
    expect(drizzlePreferenceRepository.resetImplicitPreference).toHaveBeenCalledWith('u-auth')
  })

  it('SPEC-040 — không đọc body: không có tham số nào để người gọi chỉ định người khác', async () => {
    // Handler nhận ZERO tham số. Đây là ca ghim chữ ký: thêm `request` rồi đọc
    // `userId` từ body là mở đúng lỗ hổng mà `TC-117` đóng ở hai route kia.
    expect(POST).toHaveLength(0)
  })
})
