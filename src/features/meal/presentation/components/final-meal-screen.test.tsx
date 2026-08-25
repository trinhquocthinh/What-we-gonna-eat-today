import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { SystemTag } from '@/shared/domain/system-tag'
import { FinalMealScreen } from './final-meal-screen'

describe('FinalMealScreen (S-11)', () => {
  const defaultProps = {
    dateCaption: 'Thứ Hai · 16 tháng 8',
    finalizedCaption: 'Mẹ chốt lúc 17:42',
    dishes: [
      { name: 'Cá basa kho tiêu', systemTags: ['MAIN' as SystemTag] },
      { name: 'Canh chua cá lóc', systemTags: ['SOUP' as SystemTag] },
      { name: 'Rau muống xào tỏi', systemTags: ['SIDE' as SystemTag] },
    ],
    participantNames: ['Bạn', 'Mẹ', 'Bố', 'Em Trâm'],
    closeHref: '/groups/group-1',
  }

  it('hiển thị đầy đủ tên món với chữ lớn, nhãn tag tiếng Việt, caption người chốt', () => {
    render(<FinalMealScreen {...defaultProps} />)

    expect(screen.getByText('Thứ Hai · 16 tháng 8')).toBeDefined()
    expect(screen.getByText('Bữa tối nay')).toBeDefined()
    expect(screen.getByText('Mẹ chốt lúc 17:42')).toBeDefined()

    expect(screen.getByText('Cá basa kho tiêu')).toBeDefined()
    expect(screen.getByText('Món mặn')).toBeDefined()

    expect(screen.getByText('Canh chua cá lóc')).toBeDefined()
    expect(screen.getByText('Canh')).toBeDefined()

    expect(screen.getByText('Rau muống xào tỏi')).toBeDefined()
    expect(screen.getByText('Món phụ')).toBeDefined()
  })

  it('không có chuỗi v1.1/v1.2 (Tôi không ăn món này, Sửa món đã chốt, v.v.)', () => {
    render(<FinalMealScreen {...defaultProps} />)

    expect(screen.queryByText(/Tôi không ăn món này/i)).toBeNull()
    expect(screen.queryByText(/Sửa món đã chốt/i)).toBeNull()
    expect(screen.queryByText(/Bố không ăn được/i)).toBeNull()
  })

  it('hiển thị câu người tham gia dạng chữ số tự nhiên', () => {
    render(<FinalMealScreen {...defaultProps} />)

    expect(screen.getByText(/Bốn người tham gia chọn: Bạn · Mẹ · Bố · Em Trâm/)).toBeDefined()
  })

  it('nút Đóng là Link trỏ tới closeHref', () => {
    render(<FinalMealScreen {...defaultProps} />)

    const closeLink = screen.getByRole('link', { name: 'Đóng' })
    expect(closeLink).toBeDefined()
    expect(closeLink.getAttribute('href')).toBe('/groups/group-1')
  })

  it('khi không có món nào (dishes rỗng), hiển thị EmptyStateCard', () => {
    render(<FinalMealScreen {...defaultProps} dishes={[]} />)

    expect(screen.getByText(/Chưa có món nào được chốt/i)).toBeDefined()
  })
})
