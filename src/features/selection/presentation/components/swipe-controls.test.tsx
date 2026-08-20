import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SwipeControls } from './swipe-controls'

const NOOP = { onSwipeLeft: vi.fn(), onSwipeRight: vi.fn(), onUndo: vi.fn(), onFinish: vi.fn() }

describe('SwipeControls', () => {
  it('có đủ 3 nút, đúng nhãn screen reader câu hoàn chỉnh', () => {
    render(<SwipeControls currentDishName="Cá basa kho tiêu" canUndo={true} {...NOOP} />)

    expect(
      screen.getByRole('button', { name: 'Không muốn ăn Cá basa kho tiêu hôm nay' }),
    ).toBeDefined()
    expect(screen.getByRole('button', { name: 'Đề xuất Cá basa kho tiêu' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Hoàn tác lượt vuốt vừa rồi' })).toBeDefined()
    expect(
      screen.getByRole('button', { name: 'Tôi chọn xong, dừng vuốt cho lượt này' }),
    ).toBeDefined()
  })

  it('canUndo=false: nút Hoàn tác bị disable', () => {
    render(<SwipeControls currentDishName="A" canUndo={false} {...NOOP} />)
    expect(screen.getByRole('button', { name: 'Hoàn tác lượt vuốt vừa rồi' })).toBeDisabled()
  })

  it('bấm từng nút gọi đúng callback tương ứng', async () => {
    const onSwipeRight = vi.fn()
    render(
      <SwipeControls currentDishName="A" canUndo={true} {...NOOP} onSwipeRight={onSwipeRight} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Đề xuất A' }))

    expect(onSwipeRight).toHaveBeenCalledOnce()
  })

  it('currentDishName null: hai nút vuốt không có aria-label động', () => {
    render(<SwipeControls currentDishName={null} canUndo={false} {...NOOP} />)

    expect(screen.getByRole('button', { name: 'Không hôm nay' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Đề xuất' })).toBeDefined()
  })
})
