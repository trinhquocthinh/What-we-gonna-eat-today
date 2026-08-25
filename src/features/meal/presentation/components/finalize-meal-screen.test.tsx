import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { RequiredRule } from '@/features/rule/domain/evaluate'
import type { SystemTag } from '@/shared/domain/system-tag'

import { FinalizeMealScreen, type SummaryDish } from './finalize-meal-screen'

const RANKED_DISHES: readonly SummaryDish[] = [
  {
    dishId: 'd1',
    name: 'Cá basa kho tiêu',
    systemTags: ['MAIN' as SystemTag],
    proposedCount: 3,
    rejectedCount: 0,
    recentEaterCount: 0,
    score: 0.75,
  },
]

const UNTOUCHED_DISHES: readonly SummaryDish[] = [
  {
    dishId: 'd2',
    name: 'Canh chua cá lóc',
    systemTags: ['SOUP' as SystemTag],
    proposedCount: 0,
    rejectedCount: 0,
    recentEaterCount: 0,
    score: null, // TC-061: untouched không có điểm
  },
]

const RULES: readonly RequiredRule[] = [
  { systemTag: 'MAIN', minimumCount: 1 },
  { systemTag: 'SOUP', minimumCount: 1 },
]

describe('FinalizeMealScreen (S-10 Màn tổng hợp và chốt bữa — E5-T7 + E5-T8 + E5-T9)', () => {
  it('TC-061: Món có score: null nằm dưới tiêu đề "Chưa ai chọn"', () => {
    render(
      <FinalizeMealScreen
        dateCaption="Thứ Ba · 20 tháng 8"
        progressCaption="2 trong 2 người đã xong"
        ranked={RANKED_DISHES}
        untouched={UNTOUCHED_DISHES}
        rules={RULES}
        closeHref="/groups/g-1"
        action={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Cả nhà nghiêng về' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Chưa ai chọn' })).toBeDefined()
    expect(screen.getByText('Canh chua cá lóc')).toBeDefined()
  })

  it('TC-066 / E5-T8: Bấm "Chọn" trên một món ở mục "Chưa ai chọn" → tên nó xuất hiện ở khay đáy', async () => {
    render(
      <FinalizeMealScreen
        dateCaption="Thứ Ba · 20 tháng 8"
        progressCaption="2 trong 2 người đã xong"
        ranked={RANKED_DISHES}
        untouched={UNTOUCHED_DISHES}
        rules={RULES}
        closeHref="/groups/g-1"
        action={vi.fn()}
      />,
    )

    // Ban đầu chưa chọn món nào
    expect(screen.getByText('Chưa chọn món nào cho bữa này.')).toBeDefined()

    // Tìm nút Chọn của Canh chua cá lóc (ở mục Chưa ai chọn)
    const selectButtons = screen.getAllByRole('button', { name: 'Chọn' })
    const soupSelectBtn = selectButtons[1] // d2
    expect(soupSelectBtn).toBeDefined()

    await userEvent.click(soupSelectBtn!)

    // Tên món xuất hiện ở cả thẻ món và khay đáy (2 phần tử)
    expect(screen.getAllByText('Canh chua cá lóc')).toHaveLength(2)
  })

  it('phản hồi tức thì (BR-051): Bấm Chọn → dòng "Còn thiếu" đổi ngay tại client mà KHÔNG gọi action', async () => {
    const actionSpy = vi.fn()
    render(
      <FinalizeMealScreen
        dateCaption="Thứ Ba · 20 tháng 8"
        progressCaption="2 trong 2 người đã xong"
        ranked={RANKED_DISHES}
        untouched={UNTOUCHED_DISHES}
        rules={RULES}
        closeHref="/groups/g-1"
        action={actionSpy}
      />,
    )

    // Ban đầu cả 2 rule đều thiếu
    expect(screen.getByText(/Phải có ít nhất 1 món mặn · còn thiếu 1 món mặn/)).toBeDefined()
    expect(screen.getByText(/Phải có ít nhất 1 món canh · còn thiếu 1 món canh/)).toBeDefined()

    // Chọn món mặn
    const selectButtons = screen.getAllByRole('button', { name: 'Chọn' })
    await userEvent.click(selectButtons[0]!)

    // Dòng quy định món mặn đổi sang "đã đủ", món canh vẫn "còn thiếu"
    expect(screen.getByText(/Phải có ít nhất 1 món mặn · đã đủ/)).toBeDefined()
    expect(screen.getByText(/Phải có ít nhất 1 món canh · còn thiếu 1 món canh/)).toBeDefined()

    // Chọn tiếp món canh
    const soupSelectBtn = screen.getAllByRole('button', { name: 'Chọn' })[0] // nút còn lại
    await userEvent.click(soupSelectBtn!)

    // Cả 2 đều "đã đủ"
    expect(screen.getByText(/Phải có ít nhất 1 món mặn · đã đủ/)).toBeDefined()
    expect(screen.getByText(/Phải có ít nhất 1 món canh · đã đủ/)).toBeDefined()
    expect(screen.queryByText(/còn thiếu/)).toBeNull()

    // Không có action nào được gọi trong lúc toggle
    expect(actionSpy).not.toHaveBeenCalled()
  })

  it('render link đóng quay về trang nhóm', () => {
    render(
      <FinalizeMealScreen
        dateCaption="Thứ Ba · 20 tháng 8"
        progressCaption="2 trong 2 người đã xong"
        ranked={RANKED_DISHES}
        untouched={UNTOUCHED_DISHES}
        rules={RULES}
        closeHref="/groups/g-1"
        action={vi.fn()}
      />,
    )

    const closeLink = screen.getByRole('link', { name: /Đóng/i })
    expect(closeLink).toBeDefined()
    expect(closeLink.getAttribute('href')).toBe('/groups/g-1')
  })

  it('khi ranked và untouched đều rỗng: hiện EmptyStateCard nhắc đợi cả nhà vuốt hoặc tự chọn', () => {
    render(
      <FinalizeMealScreen
        dateCaption="Thứ Ba · 20 tháng 8"
        progressCaption="0 trong 2 người đã xong"
        ranked={[]}
        untouched={[]}
        rules={RULES}
        closeHref="/groups/g-1"
        action={vi.fn()}
      />,
    )

    expect(screen.getByText('Chưa ai vuốt món nào.')).toBeDefined()
    expect(
      screen.getByText('Đợi cả nhà chọn xong rồi quay lại, hoặc tự chọn món ngay bây giờ.'),
    ).toBeDefined()
  })
})
