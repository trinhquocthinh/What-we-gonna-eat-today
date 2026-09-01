import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { DishCard } from '../../application/selection-repository'
import { DeckScreen } from './deck-screen'

function makeDishes(names: string[]): DishCard[] {
  return names.map((name, i) => ({
    dishId: `dish-${i}`,
    globalDishId: `gld-${i}`,
    name,
    systemTags: [],
    effectiveInteraction: null,
    daysSinceLastEaten: null,
    lane: 'EXPLOIT',
  }))
}

describe('S-09 Deck vuốt', () => {
  it('hiện món đầu tiên và bộ đếm 1/N', () => {
    render(
      <DeckScreen
        sessionId="s1"
        dateCaption="Thứ Ba 18/8"
        dishes={makeDishes(['Cá basa kho tiêu', 'Canh chua'])}
        initialParticipantState="ACTIVE"
        groupHref="/groups/g1"
      />,
    )

    expect(screen.getByText('Cá basa kho tiêu')).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('Hoàn tác disabled ở món đầu tiên', () => {
    render(
      <DeckScreen
        sessionId="s1"
        dateCaption="Thứ Ba 18/8"
        dishes={makeDishes(['Cá basa kho tiêu'])}
        initialParticipantState="ACTIVE"
        groupHref="/groups/g1"
      />,
    )

    expect(screen.getByRole('button', { name: 'Hoàn tác lượt vuốt vừa rồi' })).toBeDisabled()
  })

  it('bấm Đề xuất thì tiến sang món kế tiếp', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ effectiveInteraction: 'SWIPE_RIGHT' }),
      }),
    )

    render(
      <DeckScreen
        sessionId="s1"
        dateCaption="Thứ Ba 18/8"
        dishes={makeDishes(['Cá basa kho tiêu', 'Canh chua'])}
        initialParticipantState="ACTIVE"
        groupHref="/groups/g1"
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Đề xuất Cá basa kho tiêu' }))

    expect(await screen.findByText('Canh chua')).toBeInTheDocument()
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    vi.unstubAllGlobals()
  })

  it('hết deck thì chuyển trạng thái hết món với câu "N món được chọn cho hôm nay" (E8-T5)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ effectiveInteraction: 'SWIPE_RIGHT' }),
      }),
    )

    render(
      <DeckScreen
        sessionId="s1"
        dateCaption="Thứ Ba 18/8"
        dishes={makeDishes(['Cá basa kho tiêu', 'Canh chua', 'Thịt kho tàu'])}
        initialParticipantState="ACTIVE"
        groupHref="/groups/g1"
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Đề xuất Cá basa kho tiêu' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Đề xuất Canh chua' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Đề xuất Thịt kho tàu' }))

    expect(
      await screen.findByText('Bạn đã xem hết 3 món được chọn cho hôm nay.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/hết danh mục/)).not.toBeInTheDocument()
    expect(screen.getByText('Đã đề xuất 3 món. Xong lượt của mình chứ?')).toBeInTheDocument()

    vi.unstubAllGlobals()
  })

  it('bấm Tôi chọn xong thì chuyển Xong lượt của bạn', async () => {
    render(
      <DeckScreen
        sessionId="s1"
        dateCaption="Thứ Ba 18/8"
        dishes={makeDishes(['Cá basa kho tiêu'])}
        initialParticipantState="ACTIVE"
        groupHref="/groups/g1"
      />,
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Tôi chọn xong, dừng vuốt cho lượt này' }),
    )

    expect(screen.getByText('Xong lượt của bạn.')).toBeInTheDocument()
    expect(screen.getByText('Mở lại lượt chọn')).toBeInTheDocument()
  })

  it('initialParticipantState COMPLETED: mở thẳng vào màn "Xong lượt của bạn"', () => {
    render(
      <DeckScreen
        sessionId="s1"
        dateCaption="Thứ Ba · 19 tháng 8"
        dishes={makeDishes(['Cá basa kho tiêu'])}
        initialParticipantState="COMPLETED"
        groupHref="/groups/g1"
      />,
    )

    expect(screen.getByText('Xong lượt của bạn.')).toBeInTheDocument()
  })

  it('màn "Xong lượt của bạn" có link "Về trang nhóm" trỏ đúng groupHref — trước đây là ngõ cụt', () => {
    render(
      <DeckScreen
        sessionId="s1"
        dateCaption="Thứ Ba · 19 tháng 8"
        dishes={makeDishes(['Cá basa kho tiêu'])}
        initialParticipantState="COMPLETED"
        groupHref="/groups/g1"
      />,
    )

    expect(screen.getByRole('link', { name: 'Về trang nhóm' })).toHaveAttribute(
      'href',
      '/groups/g1',
    )
  })

  it('bấm "Tôi chọn xong" gọi đúng endpoint với completed=true', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ state: 'COMPLETED' }) })
    vi.stubGlobal('fetch', fetchSpy)

    render(
      <DeckScreen
        sessionId="s1"
        dateCaption="..."
        dishes={[]}
        initialParticipantState="ACTIVE"
        groupHref="/groups/g1"
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Tôi chọn xong' }))

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/sessions/s1/completed',
      expect.objectContaining({ body: JSON.stringify({ completed: true }) }),
    )
    vi.unstubAllGlobals()
  })

  it('bấm "Tôi không ăn được món này" gọi PUT /api/preferences/constraints, hiện toast và sang món kế tiếp', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchSpy)

    render(
      <DeckScreen
        sessionId="s1"
        dateCaption="Thứ Ba 18/8"
        dishes={makeDishes(['Cá basa kho tiêu', 'Canh chua'])}
        initialParticipantState="ACTIVE"
        groupHref="/groups/g1"
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Tôi không ăn được món này' }))

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/preferences/constraints',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ globalDishId: 'gld-0', cannotEat: true }),
      }),
    )

    // Hiện toast thông báo
    expect(screen.getByRole('status')).toHaveTextContent(
      'Sẽ không hiện lại Cá basa kho tiêu với bạn.',
    )

    // Tiến sang món kế tiếp
    expect(await screen.findByText('Canh chua')).toBeInTheDocument()
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    vi.unstubAllGlobals()
  })

  it('DEC-060: sau khi bấm "Tôi không ăn được món này", nút Hoàn tác bị disabled', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchSpy)

    render(
      <DeckScreen
        sessionId="s1"
        dateCaption="Thứ Ba 18/8"
        dishes={makeDishes(['Cá basa kho tiêu', 'Canh chua'])}
        initialParticipantState="ACTIVE"
        groupHref="/groups/g1"
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Tôi không ăn được món này' }))

    // Nút Hoàn tác bị disabled vì lượt vừa rồi là Cannot Eat
    expect(screen.getByRole('button', { name: 'Hoàn tác lượt vuốt vừa rồi' })).toBeDisabled()

    vi.unstubAllGlobals()
  })

  it('E8-T7 (F51): mở lại phiên với deck đã có tương tác từ trước thì tiếp tục đúng vị trí sau thẻ cuối', () => {
    const dishes: DishCard[] = Array.from({ length: 30 }, (_, i) => ({
      dishId: `dish-${i}`,
      globalDishId: `gld-${i}`,
      name: `Món ${i + 1}`,
      systemTags: [],
      effectiveInteraction: i < 12 ? (i % 2 === 0 ? 'SWIPE_RIGHT' : 'SWIPE_LEFT') : null,
      daysSinceLastEaten: null,
      lane: 'EXPLOIT',
    }))

    render(
      <DeckScreen
        sessionId="s1"
        dateCaption="Thứ Ba 18/8"
        dishes={dishes}
        initialParticipantState="ACTIVE"
        groupHref="/groups/g1"
      />,
    )

    // Khởi tạo tại thẻ thứ 13 (index 12, tên 'Món 13')
    expect(screen.getByText('Món 13')).toBeInTheDocument()
    expect(screen.getByText('13 / 30')).toBeInTheDocument()
  })
})
