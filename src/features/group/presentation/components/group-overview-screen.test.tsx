import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GroupOverviewScreen } from './group-overview-screen'

const BASE_PROPS = {
  groupName: 'Nhà Bảy Hiền',
  dateCaption: 'Thứ Ba, 18 tháng 8',
  dishCount: 7,
  dishesHref: '/groups/group-1/dishes',
  inviteHref: '/groups/group-1/invite',
  openSessionHref: '/groups/group-1/sessions/new',
  activeSession: null,
  currentUserId: 'me',
}

describe('GroupOverviewScreen (S-04)', () => {
  it('dishCount={0} thì hiện "Chưa có món nào", nút "Thêm món đầu tiên" và link "Mời thành viên"', () => {
    render(<GroupOverviewScreen {...BASE_PROPS} dishCount={0} />)

    expect(screen.getByText('Nhà Bảy Hiền')).toBeDefined()
    expect(screen.getByText('Thứ Ba, 18 tháng 8')).toBeDefined()
    expect(screen.getByText('Chưa có món nào')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Thêm món đầu tiên' })).toBeDefined()
    expect(screen.getByRole('link', { name: /Mời thành viên/ })).toBeDefined()
  })

  it('dishCount={7} thì hiện "7 món" và nút "Mở phiên"', () => {
    render(<GroupOverviewScreen {...BASE_PROPS} dishCount={7} />)

    expect(screen.getByText('7 món')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Mở phiên' })).toBeDefined()
  })

  it('activeSession !== null: hiện badge "Phiên đang mở", đúng số người xong, đúng tên từng hàng', () => {
    const activeSession = {
      id: 's1',
      participants: [
        {
          userId: 'me',
          displayName: 'Bạn',
          state: 'ACTIVE' as const,
          statusLabel: 'Chưa xong',
        },
        {
          userId: 'u2',
          displayName: 'Mẹ',
          state: 'COMPLETED' as const,
          statusLabel: 'Xong · 6 món',
        },
      ],
    }

    render(<GroupOverviewScreen {...BASE_PROPS} activeSession={activeSession} currentUserId="me" />)

    expect(screen.getByText('Phiên đang mở')).toBeDefined()
    expect(screen.getByText('1 / 2 người xong')).toBeDefined()
    expect(screen.getByText('Lượt của bạn chưa xong.')).toBeDefined()
    expect(screen.getByText('Chưa xong')).toBeDefined() // hàng "Bạn"
    expect(screen.getByText('Xong · 6 món')).toBeDefined() // hàng "Mẹ"
    expect(screen.getByRole('link', { name: 'Vào lượt của bạn' })).toBeDefined()
  })

  it('activeSession === null: không hiện khối phiên đang mở', () => {
    render(<GroupOverviewScreen {...BASE_PROPS} activeSession={null} currentUserId="me" />)
    expect(screen.queryByText('Phiên đang mở')).toBeNull()
  })
})
