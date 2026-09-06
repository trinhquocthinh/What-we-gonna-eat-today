import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PreferenceSettingsScreen } from './preference-settings-screen'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubOkFetch(implicitResetAt = '2026-09-06T03:24:00.000Z') {
  const fetchMock = vi
    .fn()
    .mockResolvedValue({ ok: true, status: 200, json: async () => ({ implicitResetAt }) })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const BASE = {
  groupName: 'Nhà Bảy Hiền',
  initialImplicitResetAt: null,
} as const

const FORGET_BUTTON = { name: /Quên sở thích đã học/ }
const ARMED_BUTTON = { name: /Chắc chắn quên/ }

describe('PreferenceSettingsScreen — E13-T8 (SPEC-040)', () => {
  it('nhịp 1: bấm một lần KHÔNG gọi API, chỉ đổi nhãn nút', async () => {
    const fetchMock = stubOkFetch()
    render(<PreferenceSettingsScreen {...BASE} />)

    await userEvent.click(screen.getByRole('button', FORGET_BUTTON))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', ARMED_BUTTON)).toBeInTheDocument()
  })

  it('nhịp 2: bấm lần thứ hai mới gọi POST /api/preferences/implicit-reset', async () => {
    const fetchMock = stubOkFetch()
    render(<PreferenceSettingsScreen {...BASE} />)

    await userEvent.click(screen.getByRole('button', FORGET_BUTTON))
    await userEvent.click(screen.getByRole('button', ARMED_BUTTON))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/preferences/implicit-reset')
    expect((init as RequestInit).method).toBe('POST')
  })

  it('không có modal — xác nhận nằm trên chính nút (design-invariants)', async () => {
    stubOkFetch()
    render(<PreferenceSettingsScreen {...BASE} />)

    await userEvent.click(screen.getByRole('button', FORGET_BUTTON))

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('sau khi quên xong: nút về nhịp 1 và hiện mốc vừa ghi', async () => {
    stubOkFetch('2026-09-06T03:24:00.000Z')
    render(<PreferenceSettingsScreen {...BASE} />)

    await userEvent.click(screen.getByRole('button', FORGET_BUTTON))
    await userEvent.click(screen.getByRole('button', ARMED_BUTTON))

    await waitFor(() => expect(screen.getByText(/Lần quên gần nhất/)).toBeInTheDocument())
    expect(screen.getByRole('button', FORGET_BUTTON)).toBeInTheDocument()
  })

  it('TC-173 — màn hình nói rõ khai báo TỰ TAY được giữ nguyên', async () => {
    render(<PreferenceSettingsScreen {...BASE} />)

    const kept = screen.getByText(/Những gì bạn tự tay khai vẫn giữ nguyên/)
    expect(kept).toBeInTheDocument()
    for (const label of [
      'Thích',
      'Không thích',
      'Không ăn được',
      'Đừng gợi ý',
      'Ăn hoài không chán',
    ]) {
      expect(kept.textContent).toContain(label)
    }
  })

  it('TC-172 — màn hình nói rõ phiên đang mở KHÔNG đổi, hiệu lực từ phiên sau', () => {
    render(<PreferenceSettingsScreen {...BASE} />)

    expect(screen.getByText(/Phiên đang mở không đổi thứ tự thẻ/)).toBeInTheDocument()
    expect(screen.getByText(/bắt đầu từ phiên kế tiếp/)).toBeInTheDocument()
  })

  it('chưa bấm Quên bao giờ: không hiện dòng "Lần quên gần nhất"', () => {
    render(<PreferenceSettingsScreen {...BASE} />)

    expect(screen.queryByText(/Lần quên gần nhất/)).toBeNull()
  })

  it('đã từng quên: hiện mốc cũ ngay từ lần render đầu', () => {
    render(<PreferenceSettingsScreen {...BASE} initialImplicitResetAt="2026-08-30T10:00:00.000Z" />)

    expect(screen.getByText(/Lần quên gần nhất/)).toBeInTheDocument()
  })

  it('ghi thất bại: nói ra bằng chữ và cho bấm lại từ nhịp 1', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({}) }),
    )
    render(<PreferenceSettingsScreen {...BASE} />)

    await userEvent.click(screen.getByRole('button', FORGET_BUTTON))
    await userEvent.click(screen.getByRole('button', ARMED_BUTTON))

    await waitFor(() => expect(screen.getByText(/Chưa quên được/)).toBeInTheDocument())
    expect(screen.getByRole('button', FORGET_BUTTON)).toBeInTheDocument()
    expect(screen.queryByText(/Lần quên gần nhất/)).toBeNull()
  })
})
