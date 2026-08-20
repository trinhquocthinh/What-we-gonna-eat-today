import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { DishCard } from '../../application/selection-repository'
import { DishSwipeCard } from './dish-swipe-card'

const DISH: DishCard = {
  dishId: 'dish-1',
  globalDishId: 'gld-1',
  name: 'Cá basa kho tiêu',
  systemTags: [],
  effectiveInteraction: null,
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
})
