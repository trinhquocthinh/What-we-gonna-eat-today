import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { RequiredRule } from '@/features/rule/domain/evaluate'
import type { SystemTag } from '@/shared/domain/system-tag'

import { FinalizeBar } from './finalize-bar'

const RULES: readonly RequiredRule[] = [
  { systemTag: 'MAIN', minimumCount: 1 },
  { systemTag: 'SOUP', minimumCount: 1 },
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

describe('FinalizeBar (S-10 Dải đáy — E5-T8 + E5-T9)', () => {
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
})
