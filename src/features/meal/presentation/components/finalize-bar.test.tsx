import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { SessionRule } from '@/features/rule/domain/evaluate'
import type { SystemTag } from '@/shared/domain/system-tag'

import { FinalizeBar } from './finalize-bar'

const RULES: readonly SessionRule[] = [
  { systemTag: 'MAIN', minimumCount: 1, ruleType: 'REQUIRED' },
  { systemTag: 'SOUP', minimumCount: 1, ruleType: 'REQUIRED' },
]

const PREFERRED_RULES: readonly SessionRule[] = [
  { systemTag: 'MAIN', minimumCount: 1, ruleType: 'REQUIRED' },
  { systemTag: 'SOUP', minimumCount: 1, ruleType: 'PREFERRED' },
]

const MAIN_DISH = {
  dishId: 'd1',
  name: 'Cá basa kho tiêu',
  systemTags: ['MAIN' as SystemTag],
}

const SOUP_DISH = {
  dishId: 'd2',
  name: 'Canh chua cá lóc',
  systemTags: ['SOUP' as SystemTag],
}

const SIDE_DISH = {
  dishId: 'd3',
  name: 'Rau muống xào tỏi',
  systemTags: ['SIDE' as SystemTag],
}

describe('FinalizeBar (S-10 Dải đáy — E5-T8 + E5-T9 + E10-T5)', () => {
  it('TC-072: chọn 1 món MAIN với rule SOUP>=1 thì thấy "còn thiếu 1 món canh"', () => {
    render(<FinalizeBar selectedDishes={[MAIN_DISH]} rules={RULES} pending={false} error={null} />)

    // Khay hiển thị tên món
    expect(screen.getByText('Cá basa kho tiêu')).toBeDefined()

    // Dòng quy định mặn: đã đủ
    expect(screen.getByText(/Phải có ít nhất 1 món mặn · đã đủ/)).toBeDefined()

    // Dòng quy định canh: còn thiếu 1 món canh
    expect(screen.getByText(/Phải có ít nhất 1 món canh · còn thiếu 1 món canh/)).toBeDefined()

    // Nút ghi "Chốt bữa"
    const button = screen.getByRole('button', { name: 'Chốt bữa' })
    expect(button).toBeDefined()
    expect(button).toBeEnabled()
  })

  it('đủ rule: thêm món SOUP thì dòng đổi thành "đã đủ"', () => {
    render(
      <FinalizeBar
        selectedDishes={[MAIN_DISH, SOUP_DISH]}
        rules={RULES}
        pending={false}
        error={null}
      />,
    )

    expect(screen.getByText('Cá basa kho tiêu · Canh chua cá lóc')).toBeDefined()
    expect(screen.getByText(/Phải có ít nhất 1 món mặn · đã đủ/)).toBeDefined()
    expect(screen.getByText(/Phải có ít nhất 1 món canh · đã đủ/)).toBeDefined()
    expect(screen.queryByText(/còn thiếu/)).toBeNull()
  })

  it('không dùng modal (E5-T9 DoD): queryByRole("dialog") là null', () => {
    render(
      <FinalizeBar
        selectedDishes={[MAIN_DISH]}
        rules={RULES}
        pending={false}
        error="Còn thiếu 1 món canh."
      />,
    )

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('alert')).toBeDefined()
    expect(screen.getByText('Còn thiếu 1 món canh.')).toBeDefined()
  })

  it('khay rỗng: nút ghi "Chọn món để chốt", vẫn bấm được (toBeEnabled)', () => {
    render(<FinalizeBar selectedDishes={[]} rules={RULES} pending={false} error={null} />)

    expect(screen.getByText('Chưa chọn món nào cho bữa này.')).toBeDefined()
    const button = screen.getByRole('button', { name: 'Chọn món để chốt' })
    expect(button).toBeDefined()
    expect(button).toBeEnabled()
  })

  it('E10-T5: Còn blocking -> nút muted, chữ "còn thiếu" xuất hiện; không có chữ "nên có thêm"', () => {
    render(
      <FinalizeBar
        selectedDishes={[SIDE_DISH]}
        rules={PREFERRED_RULES}
        pending={false}
        error={null}
      />,
    )

    // Thiếu REQUIRED MAIN -> blocking
    expect(screen.getByText(/Phải có ít nhất 1 món mặn · còn thiếu 1 món mặn/)).toBeDefined()
    // Không có chữ "nên có thêm" khi xét dòng blocking
    expect(screen.queryByText(/Phải có ít nhất 1 món mặn · nên có thêm/)).toBeNull()

    const button = screen.getByRole('button', { name: 'Chốt bữa' })
    expect(button).toBeDefined()
    // Nút muted vì có blocking -> mang class MUTED_CLASSES của Button
    expect(button.className).toContain('bg-surface-sunken')
  })

  it('E10-T5: Thiếu Preferred -> chữ "nên có thêm", nút không muted', () => {
    render(
      <FinalizeBar
        selectedDishes={[MAIN_DISH]}
        rules={PREFERRED_RULES}
        pending={false}
        error={null}
      />,
    )

    // Đủ REQUIRED MAIN, thiếu PREFERRED SOUP
    expect(screen.getByText(/Phải có ít nhất 1 món mặn · đã đủ/)).toBeDefined()
    expect(screen.getByText(/Nên có ít nhất 1 món canh · nên có thêm 1 món canh/)).toBeDefined()

    const button = screen.getByRole('button', { name: 'Chốt bữa' })
    expect(button).toBeDefined()
    // Không có blocking nên nút KHÔNG muted -> giữ màu accent primary
    expect(button.className).toContain('bg-accent')
    expect(button.className).not.toContain('bg-surface-sunken')
  })

  it('E10-T5: Lệch Target Count -> hiển thị dòng riêng không dùng "còn thiếu" hay "nên có"', () => {
    render(
      <FinalizeBar
        selectedDishes={[MAIN_DISH, SOUP_DISH]}
        rules={PREFERRED_RULES}
        targetDishCount={4}
        pending={false}
        error={null}
      />,
    )

    expect(screen.getByText('Bạn chọn 2 món · nhà mình thường ăn 4')).toBeDefined()
  })

  it('TC-155: Còn cảnh báo, bấm lần đầu -> không submit, nhãn đổi thành "Vẫn chốt · …"', () => {
    const handleSubmit = vi.fn((e) => e.preventDefault())
    render(
      <form onSubmit={handleSubmit}>
        <FinalizeBar
          selectedDishes={[MAIN_DISH]}
          rules={PREFERRED_RULES}
          pending={false}
          error={null}
        />
      </form>,
    )

    const button = screen.getByRole('button', { name: 'Chốt bữa' })
    fireEvent.click(button)

    // Nhịp 1: KHÔNG submit form
    expect(handleSubmit).not.toHaveBeenCalled()
    // Nhãn đổi thành "Vẫn chốt · thiếu 1 món canh"
    expect(screen.getByRole('button', { name: 'Vẫn chốt · thiếu 1 món canh' })).toBeDefined()
  })

  it('TC-155: Bấm lần hai sau khi armed -> submit form', () => {
    const handleSubmit = vi.fn((e) => e.preventDefault())
    render(
      <form onSubmit={handleSubmit}>
        <FinalizeBar
          selectedDishes={[MAIN_DISH]}
          rules={PREFERRED_RULES}
          pending={false}
          error={null}
        />
      </form>,
    )

    const button = screen.getByRole('button', { name: 'Chốt bữa' })
    // Nhịp 1
    fireEvent.click(button)
    expect(handleSubmit).not.toHaveBeenCalled()

    // Nhịp 2
    fireEvent.click(screen.getByRole('button', { name: 'Vẫn chốt · thiếu 1 món canh' }))
    expect(handleSubmit).toHaveBeenCalledTimes(1)
  })

  it('TC-155 (reset): Bấm lần đầu rồi đổi tập món -> nhãn quay về "Chốt bữa", lần bấm kế tiếp lại là nhịp một', () => {
    const handleSubmit = vi.fn((e) => e.preventDefault())
    const { rerender } = render(
      <form onSubmit={handleSubmit}>
        <FinalizeBar
          selectedDishes={[MAIN_DISH]}
          rules={PREFERRED_RULES}
          targetDishCount={4}
          pending={false}
          error={null}
        />
      </form>,
    )

    // Nhịp 1
    const button = screen.getByRole('button', { name: 'Chốt bữa' })
    fireEvent.click(button)
    expect(handleSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Vẫn chốt · thiếu 1 món canh' })).toBeDefined()

    // Người dùng thêm món SOUP_DISH -> đổi selectedDishes
    rerender(
      <form onSubmit={handleSubmit}>
        <FinalizeBar
          selectedDishes={[MAIN_DISH, SOUP_DISH]}
          rules={PREFERRED_RULES}
          targetDishCount={4} // vẫn còn cảnh báo Target Count (2 != 4)
          pending={false}
          error={null}
        />
      </form>,
    )

    // Nhãn phải QUAY VỀ "Chốt bữa", cờ armed đã bị reset!
    const resetButton = screen.getByRole('button', { name: 'Chốt bữa' })
    expect(resetButton).toBeDefined()

    // Bấm tiếp chỉ là nhịp một của cảnh báo mới (Target Count)
    fireEvent.click(resetButton)
    expect(handleSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Vẫn chốt · thiếu 2 món' })).toBeDefined()
  })

  it('E10-T5: Không cảnh báo nào -> bấm một lần là submit thẳng', () => {
    const handleSubmit = vi.fn((e) => e.preventDefault())
    render(
      <form onSubmit={handleSubmit}>
        <FinalizeBar
          selectedDishes={[MAIN_DISH, SOUP_DISH]}
          rules={PREFERRED_RULES}
          targetDishCount={2}
          pending={false}
          error={null}
        />
      </form>,
    )

    const button = screen.getByRole('button', { name: 'Chốt bữa' })
    fireEvent.click(button)
    expect(handleSubmit).toHaveBeenCalledTimes(1)
  })

  // M3-T2 — cùng một tag mang cả hai loại luật (E10-T1). Hai dòng phải nói hai
  // chuyện khác nhau; khớp chỉ bằng `systemTag` thì cả hai dòng cùng đọc một
  // shortfall và một trong hai luôn sai.
  const SOUP_BOTH: readonly SessionRule[] = [
    { systemTag: 'SOUP', minimumCount: 1, ruleType: 'REQUIRED' },
    { systemTag: 'SOUP', minimumCount: 2, ruleType: 'PREFERRED' },
  ]

  it('M3-T2: SOUP REQUIRED>=1 + PREFERRED>=2, mâm 0 canh -> hai dòng nói hai chuyện', () => {
    render(
      <FinalizeBar selectedDishes={[MAIN_DISH]} rules={SOUP_BOTH} pending={false} error={null} />,
    )

    expect(screen.getByText(/Phải có ít nhất 1 món canh · còn thiếu 1 món canh/)).toBeDefined()
    expect(screen.getByText(/Nên có ít nhất 2 món canh · nên có thêm 2 món canh/)).toBeDefined()
  })

  it('M3-T2: SOUP REQUIRED>=1 + PREFERRED>=2, mâm 1 canh -> REQUIRED đã đủ', () => {
    render(
      <FinalizeBar selectedDishes={[SOUP_DISH]} rules={SOUP_BOTH} pending={false} error={null} />,
    )

    expect(screen.getByText(/Phải có ít nhất 1 món canh · đã đủ/)).toBeDefined()
    expect(screen.getByText(/Nên có ít nhất 2 món canh · nên có thêm 1 món canh/)).toBeDefined()
  })
})
