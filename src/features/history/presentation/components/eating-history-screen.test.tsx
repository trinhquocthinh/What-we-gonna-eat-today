import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EatingHistoryScreen } from './eating-history-screen'

describe('EatingHistoryScreen (S-12)', () => {
  const defaultProps = {
    groupName: 'Nhà Bảy Hiền',
    today: '2026-08-16',
    days: [
      {
        eatingDate: '2026-08-16',
        dishNames: ['Cá basa kho tiêu', 'Canh chua cá lóc'],
      },
      {
        eatingDate: '2026-08-15',
        dishNames: ['Gà chiên nước mắm', 'Rau muống xào tỏi'],
      },
      {
        eatingDate: '2026-08-14',
        dishNames: ['Thịt kho tàu'],
      },
    ],
    closeHref: '/groups/group-1',
  }

  it('hiển thị danh sách các ngày ăn với số món, tên món và nhãn ngày tương đối', () => {
    render(<EatingHistoryScreen {...defaultProps} />)

    expect(screen.getByText('Nhà Bảy Hiền · 30 ngày gần đây')).toBeDefined()
    expect(screen.getByText('Lịch sử ăn')).toBeDefined()

    // 3 thẻ
    expect(screen.getByText('Hôm nay · Chủ Nhật 16/8')).toBeDefined()
    expect(screen.getAllByText('2 món')).toHaveLength(2)
    expect(screen.getByText('Cá basa kho tiêu')).toBeDefined()
    expect(screen.getByText('Canh chua cá lóc')).toBeDefined()

    expect(screen.getByText('Hôm qua · Thứ Bảy 15/8')).toBeDefined()
    expect(screen.getByText('Gà chiên nước mắm')).toBeDefined()
    expect(screen.getByText('Rau muống xào tỏi')).toBeDefined()

    expect(screen.getByText('Thứ Sáu 14/8')).toBeDefined()
    expect(screen.getByText('1 món')).toBeDefined()
    expect(screen.getByText('Thịt kho tàu')).toBeDefined()
  })

  it('không có chuỗi v1.1/v1.2 (Bạn đã bỏ ... khỏi lịch sử của mình, Sửa lịch sử ăn)', () => {
    render(<EatingHistoryScreen {...defaultProps} />)

    expect(screen.queryByText(/Bạn đã bỏ/i)).toBeNull()
    expect(screen.queryByText(/Sửa lịch sử/i)).toBeNull()
  })

  it('nút Đóng là Link trỏ tới closeHref', () => {
    render(<EatingHistoryScreen {...defaultProps} />)

    const closeLink = screen.getByRole('link', { name: 'Đóng' })
    expect(closeLink).toBeDefined()
    expect(closeLink.getAttribute('href')).toBe('/groups/group-1')
  })

  it('khi chưa có lịch sử (days rỗng): hiện EmptyStateCard hướng dẫn', () => {
    render(<EatingHistoryScreen {...defaultProps} days={[]} />)

    expect(screen.getByText(/Chốt bữa đầu tiên rồi lịch sử sẽ tự hiện ở đây/i)).toBeDefined()
  })
})
