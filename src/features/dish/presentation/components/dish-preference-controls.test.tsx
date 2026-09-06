import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DishPreferenceControls } from './dish-preference-controls'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubOkFetch() {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const BASE = {
  dishName: 'Canh chua cá lóc',
  globalDishId: 'gld-1',
  preference: null,
  cannotEat: false,
  blacklisted: false,
  historyWhitelisted: false,
} as const

describe('DishPreferenceControls (M3-T6 — nửa còn thiếu của E7-T5)', () => {
  it('chưa đặt gì: cả năm nút đều aria-pressed=false', () => {
    render(<DishPreferenceControls {...BASE} />)

    expect(screen.getByRole('button', { name: /Thích Canh chua cá lóc/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: /Không thích Canh chua cá lóc/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(
      screen.getByRole('button', { name: /Không ăn được — Canh chua cá lóc/ }),
    ).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /Đừng gợi ý — Canh chua cá lóc/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(
      screen.getByRole('button', { name: /Ăn hoài không chán — Canh chua cá lóc/ }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  // E6-T6 — không thông tin nào chỉ truyền tải bằng màu sắc.
  it('trạng thái đọc được bằng CHỮ, không chỉ bằng màu', () => {
    render(<DishPreferenceControls {...BASE} preference="LIKE" />)

    expect(screen.getByText('Đang thích')).toBeInTheDocument()
  })

  it('bấm "Thích" gửi PUT /api/preferences/preferences kèm kind LIKE', async () => {
    const fetchMock = stubOkFetch()
    render(<DishPreferenceControls {...BASE} />)

    await userEvent.click(screen.getByRole('button', { name: /Thích Canh chua cá lóc/ }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/preferences/preferences')
    expect((init as RequestInit).method).toBe('PUT')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      globalDishId: 'gld-1',
      kind: 'LIKE',
    })
  })

  // BR-037 — Neutral là "không có dòng trong DB", nên bấm lại nút đang bật gửi `null`.
  it('bấm lại nút đang bật thì gỡ về Neutral (kind: null)', async () => {
    const fetchMock = stubOkFetch()
    render(<DishPreferenceControls {...BASE} preference="LIKE" />)

    await userEvent.click(screen.getByRole('button', { name: /Thích Canh chua cá lóc/ }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body))).toEqual({
      globalDishId: 'gld-1',
      kind: null,
    })
  })

  it('Thích và Không thích loại trừ nhau', async () => {
    stubOkFetch()
    render(<DishPreferenceControls {...BASE} preference="DISLIKE" />)

    expect(screen.getByRole('button', { name: /Không thích Canh chua cá lóc/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await userEvent.click(screen.getByRole('button', { name: /Thích Canh chua cá lóc/ }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Thích Canh chua cá lóc/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    expect(screen.getByRole('button', { name: /Không thích Canh chua cá lóc/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('Cannot Eat gửi tới /constraints và độc lập với Like/Dislike', async () => {
    const fetchMock = stubOkFetch()
    render(<DishPreferenceControls {...BASE} preference="LIKE" />)

    await userEvent.click(screen.getByRole('button', { name: /Không ăn được — Canh chua cá lóc/ }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/preferences/constraints')
    expect(JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body))).toEqual({
      globalDishId: 'gld-1',
      kind: 'CANNOT_EAT',
      enabled: true,
    })
    // Like vẫn giữ nguyên — hai trạng thái độc lập (Guide §3.3).
    expect(screen.getByRole('button', { name: /Thích Canh chua cá lóc/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  // R-05 — khai báo mất trong im lặng là đúng thứ E7 sinh ra để ngăn.
  it('ghi thất bại: trạng thái quay về giá trị cũ và nói rõ là chưa lưu được', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({}) }),
    )
    render(<DishPreferenceControls {...BASE} />)

    await userEvent.click(screen.getByRole('button', { name: /Thích Canh chua cá lóc/ }))

    await waitFor(() => expect(screen.getByText(/Chưa lưu được/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Thích Canh chua cá lóc/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
  it.each([
    ['BLACKLIST', /Đừng gợi ý — Canh chua cá lóc/],
    ['HISTORY_WHITELIST', /Ăn hoài không chán — Canh chua cá lóc/],
  ] as const)('E13-T7 — nút %s gửi PUT /constraints với đúng kind', async (kind, name) => {
    const fetchMock = stubOkFetch()
    render(<DishPreferenceControls {...BASE} />)

    await userEvent.click(screen.getByRole('button', { name }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/preferences/constraints')
    expect(JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body))).toEqual({
      globalDishId: 'gld-1',
      kind,
      enabled: true,
    })
  })

  it('E13-T7 — bấm lại nút cờ đang bật thì gỡ (enabled: false)', async () => {
    const fetchMock = stubOkFetch()
    render(<DishPreferenceControls {...BASE} blacklisted />)

    await userEvent.click(screen.getByRole('button', { name: /Đừng gợi ý — Canh chua cá lóc/ }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body))).toEqual({
      globalDishId: 'gld-1',
      kind: 'BLACKLIST',
      enabled: false,
    })
  })

  it('E13-T7 — ba cờ ĐỘC LẬP: bật cái này không tắt cái kia, và cả ba đọc được bằng chữ', async () => {
    stubOkFetch()
    render(<DishPreferenceControls {...BASE} cannotEat historyWhitelisted />)

    // Hai cờ có sẵn đều hiện trên dòng chữ, không cái nào bị giấu (Guide §1.3).
    expect(screen.getByText('Không ăn được · Ăn hoài không chán')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Đừng gợi ý — Canh chua cá lóc/ }))

    await waitFor(() =>
      expect(
        screen.getByText('Không ăn được · Đã tắt gợi ý · Ăn hoài không chán'),
      ).toBeInTheDocument(),
    )
    for (const name of [
      /Không ăn được — Canh chua cá lóc/,
      /Đừng gợi ý — Canh chua cá lóc/,
      /Ăn hoài không chán — Canh chua cá lóc/,
    ]) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true')
    }
  })

  it('E13-T7 — cờ ghi thất bại: chỉ cờ vừa bấm rollback, hai cờ kia còn nguyên', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({}) }),
    )
    render(<DishPreferenceControls {...BASE} cannotEat />)

    await userEvent.click(screen.getByRole('button', { name: /Đừng gợi ý — Canh chua cá lóc/ }))

    await waitFor(() => expect(screen.getByText(/Chưa lưu được/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Đừng gợi ý — Canh chua cá lóc/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(
      screen.getByRole('button', { name: /Không ăn được — Canh chua cá lóc/ }),
    ).toHaveAttribute('aria-pressed', 'true')
  })
})
