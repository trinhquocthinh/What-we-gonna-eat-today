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
  rulesHref: '/groups/group-1/rules',
  ruleCount: 0,
}

describe('GroupOverviewScreen (S-04)', () => {
  it('dishCount={0} thì hiện "Chưa có món nào", nút "Thêm món đầu tiên" và link "Mời thành viên"', () => {
    render(<GroupOverviewScreen {...BASE_PROPS} dishCount={0} />)

    expect(screen.getByText('Nhà Bảy Hiền')).toBeDefined()
    expect(screen.getByText('Thứ Ba, 18 tháng 8')).toBeDefined()
    expect(screen.getByText('Chưa có món nào')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Thêm món đầu tiên' })).toBeDefined()
    expect(screen.getByRole('link', { name: /Mời thành viên/ })).toBeDefined()
    expect(screen.getByRole('link', { name: /Quy định bữa ăn/ })).toBeDefined()
    expect(screen.getByText('Chưa có quy định nào')).toBeDefined()
  })

  it('dishCount={7} và ruleCount={2} thì hiện "7 món", "2 quy định" và nút "Mở phiên"', () => {
    render(<GroupOverviewScreen {...BASE_PROPS} dishCount={7} ruleCount={2} />)

    expect(screen.getByText('7 món')).toBeDefined()
    expect(screen.getByText('2 quy định')).toBeDefined()
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

  it('activeSession có summaryHref: hiện thêm link "Xem tổng hợp"', () => {
    const activeSession = {
      id: 's1',
      summaryHref: '/sessions/s1/summary',
      participants: [
        {
          userId: 'me',
          displayName: 'Bạn',
          state: 'ACTIVE' as const,
          statusLabel: 'Chưa xong',
        },
      ],
    }

    render(<GroupOverviewScreen {...BASE_PROPS} activeSession={activeSession} currentUserId="me" />)

    const summaryLink = screen.getByRole('link', { name: 'Xem tổng hợp' })
    expect(summaryLink).toBeDefined()
    expect(summaryLink.getAttribute('href')).toBe('/sessions/s1/summary')
  })
})
