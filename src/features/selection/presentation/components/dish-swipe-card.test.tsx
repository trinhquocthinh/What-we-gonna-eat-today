import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { DishCard } from '../../application/selection-repository'
import { DIRECTION_STYLES, DishSwipeCard } from './dish-swipe-card'

const DISH: DishCard = {
  dishId: 'dish-1',
  globalDishId: 'gld-1',
  name: 'Cá basa kho tiêu',
  systemTags: [],
  effectiveInteraction: null,
  daysSinceLastEaten: null,
  lane: 'EXPLOIT',
}

describe('DishSwipeCard', () => {
  it('hiện tên món, footer, và Trong chồng', () => {
    render(
      <DishSwipeCard
        dish={DISH}
        lastEatenLabel="Chưa từng ăn"
        explanation="Món này đang có trong danh mục của nhóm."
        upcomingNames={['Canh chua cá lóc', 'Gà chiên nước mắm']}
        onCommit={vi.fn()}
      />,
    )

    expect(screen.getByText('Cá basa kho tiêu')).toBeInTheDocument()
    expect(screen.getByText('Chưa từng ăn')).toBeInTheDocument()
    expect(screen.getByText('Canh chua cá lóc')).toBeInTheDocument()
    expect(screen.getByText('Gà chiên nước mắm')).toBeInTheDocument()
  })

  it('không có Trong chồng thì không render khối đó', () => {
    render(
      <DishSwipeCard
        dish={DISH}
        lastEatenLabel="Chưa từng ăn"
        explanation="..."
        upcomingNames={[]}
        onCommit={vi.fn()}
      />,
    )

    expect(screen.queryByText('Trong chồng')).not.toBeInTheDocument()
  })

  it('render nút "Tôi không ăn được món này" khi có onCannotEat và gọi onCannotEat khi click', () => {
    const onCannotEat = vi.fn()
    render(
      <DishSwipeCard
        dish={DISH}
        lastEatenLabel="Chưa từng ăn"
        explanation="..."
        upcomingNames={[]}
        onCommit={vi.fn()}
        onCannotEat={onCannotEat}
      />,
    )

    const btn = screen.getByRole('button', { name: 'Tôi không ăn được món này' })
    expect(btn).toBeInTheDocument()
    btn.click()
    expect(onCannotEat).toHaveBeenCalledWith(DISH)
  })

  it('E8-T3: thẻ có lane EXPLORE hiện chip "Đổi vị", thẻ EXPLOIT không hiện', () => {
    const exploreDish: DishCard = {
      ...DISH,
      lane: 'EXPLORE',
    }
    const { rerender } = render(
      <DishSwipeCard
        dish={exploreDish}
        lastEatenLabel="Chưa từng ăn"
        explanation="Nhà mình chưa ăn món này bao giờ."
        upcomingNames={[]}
        onCommit={vi.fn()}
      />,
    )

    expect(screen.getByText('Đổi vị')).toBeInTheDocument()

    rerender(
      <DishSwipeCard
        dish={DISH}
        lastEatenLabel="Chưa từng ăn"
        explanation="Món này đang có trong danh mục của nhóm."
        upcomingNames={[]}
        onCommit={vi.fn()}
      />,
    )

    expect(screen.queryByText('Đổi vị')).not.toBeInTheDocument()
  })

  it('E9-T0: thẻ có systemTags: ["SOUP"] hiện nhãn "Canh", không hiện "Trong danh mục"', () => {
    const soupDish: DishCard = {
      ...DISH,
      systemTags: ['SOUP'],
    }
    render(
      <DishSwipeCard
        dish={soupDish}
        lastEatenLabel="Chưa từng ăn"
        explanation="Món này đang có trong danh mục của nhóm."
        upcomingNames={[]}
        onCommit={vi.fn()}
      />,
    )

    expect(screen.getAllByText('Canh').length).toBeGreaterThan(0)
    expect(screen.queryByText('Trong danh mục')).not.toBeInTheDocument()
  })
})

describe('DIRECTION_STYLES — bất biến thiết kế', () => {
  it('KHÔNG hướng nào dùng màu đỏ/danger — Design Criteria §10 anti-pattern', () => {
    for (const style of Object.values(DIRECTION_STYLES)) {
      expect(style.background).not.toMatch(/red|danger/)
      expect(style.border).not.toMatch(/red|danger/)
      expect(style.dragLabelBackground).not.toMatch(/red|danger/)
    }
  })

  it('vuốt trái dùng đúng token trung tính --no, không phải --danger', () => {
    expect(DIRECTION_STYLES[-1]?.background).toBe('bg-no-soft')
    expect(DIRECTION_STYLES[-1]?.border).toBe('border-no')
  })
})
