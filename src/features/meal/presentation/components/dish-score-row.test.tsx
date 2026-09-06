import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DishScoreRow } from './dish-score-row'
import type { SummaryDish } from './finalize-meal-screen'

const SAMPLE_DISH: SummaryDish = {
  dishId: 'dish-1',
  name: 'Cá basa kho tiêu',
  systemTags: ['MAIN'],
  proposedCount: 3,
  rejectedCount: 0,
  cannotEatCount: 2,
  recentEaterCount: 1,
  score: 0.425,
}

describe('DishScoreRow (S-10 Thẻ món — E7-T6)', () => {
  it('bốn ô đếm: thấy "0 không muốn" (không bị ẩn) và CÓ ô "2 không ăn được"', () => {
    render(
      <DishScoreRow dish={SAMPLE_DISH} selected={false} onToggle={vi.fn()} tagLabel="Món mặn" />,
    )

    // Thấy tên món
    expect(screen.getByText('Cá basa kho tiêu')).toBeDefined()
    expect(screen.getByText('Món mặn')).toBeDefined()

    // 4 ô đếm: đề xuất, không muốn, vừa ăn, không ăn được
    expect(screen.getByText(/3 đề xuất/)).toBeDefined()
    expect(screen.getByText(/0 không muốn/)).toBeDefined()
    expect(screen.getByText(/1 vừa ăn/)).toBeDefined()
    expect(screen.getByText(/2 không ăn được/)).toBeDefined()
  })

  it('dùng tabular-nums trên các ô đếm', () => {
    const { container } = render(
      <DishScoreRow dish={SAMPLE_DISH} selected={false} onToggle={vi.fn()} tagLabel="Món mặn" />,
    )

    const tabularElements = container.querySelectorAll('.tabular-nums')
    expect(tabularElements.length).toBeGreaterThanOrEqual(4)
  })

  it('không hiện điểm số float: queryByText(/0\\.\\d/) là null', () => {
    render(
      <DishScoreRow dish={SAMPLE_DISH} selected={false} onToggle={vi.fn()} tagLabel="Món mặn" />,
    )

    expect(screen.queryByText(/0\.\d/)).toBeNull()
  })

  it('nút Chọn / Bỏ toggle đúng trạng thái và gọi onToggle', async () => {
    const onToggle = vi.fn()
    const { rerender } = render(
      <DishScoreRow dish={SAMPLE_DISH} selected={false} onToggle={onToggle} tagLabel="Món mặn" />,
    )

    const button = screen.getByRole('button', { name: 'Chọn' })
    expect(button).toBeDefined()
    expect(button.getAttribute('aria-pressed')).toBe('false')

    await userEvent.click(button)
    expect(onToggle).toHaveBeenCalledWith('dish-1')

    rerender(
      <DishScoreRow dish={SAMPLE_DISH} selected={true} onToggle={onToggle} tagLabel="Món mặn" />,
    )

    const selectedButton = screen.getByRole('button', { name: 'Bỏ' })
    expect(selectedButton).toBeDefined()
    expect(selectedButton.getAttribute('aria-pressed')).toBe('true')
  })
})
