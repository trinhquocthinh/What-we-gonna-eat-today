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
  finalizedMeal: null,
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

  it('đã chốt (finalizedMeal !== null): hiện card mâm cơm với chip "Đã chốt lúc", CTA đáy là "Xem bữa hôm nay", không có chữ "Mở phiên"', () => {
    const finalizedMeal = {
      finalizedCaption: 'Đã chốt lúc 17:42 · Mẹ chốt',
      dishNames: ['Cá basa kho tiêu', 'Canh chua cá lóc', 'Rau muống xào tỏi'],
      mealHref: '/sessions/s1/meal',
    }

    render(<GroupOverviewScreen {...BASE_PROPS} finalizedMeal={finalizedMeal} />)

    expect(screen.getByText(/Đã chốt lúc 17:42 · Mẹ chốt/)).toBeDefined()
    expect(screen.getByText('Tối nay nhà mình ăn')).toBeDefined()
    expect(screen.getByText('Cá basa kho tiêu')).toBeDefined()
    expect(screen.getByText('Canh chua cá lóc')).toBeDefined()
    expect(screen.getByText('Rau muống xào tỏi')).toBeDefined()

    const viewMealLink = screen.getByRole('link', { name: 'Xem bữa hôm nay' })
    expect(viewMealLink).toBeDefined()
    expect(viewMealLink.getAttribute('href')).toBe('/sessions/s1/meal')

    expect(screen.queryByText('Mở phiên')).toBeNull()
    expect(screen.queryByText('Phiên đang mở')).toBeNull()
  })

  it('đã chốt khi dishCount={0}: vẫn không hiện EmptyStateCard thêm món', () => {
    const finalizedMeal = {
      finalizedCaption: 'Đã chốt lúc 17:42 · Mẹ chốt',
      dishNames: ['Cá basa kho tiêu'],
      mealHref: '/sessions/s1/meal',
    }

    render(<GroupOverviewScreen {...BASE_PROPS} dishCount={0} finalizedMeal={finalizedMeal} />)

    expect(screen.queryByText('Trước tiên hãy thêm vài món nhà bạn hay ăn.')).toBeNull()
    expect(screen.getByRole('link', { name: 'Xem bữa hôm nay' })).toBeDefined()
  })

  it('nhóm CÓ món thì không hiện thẻ "chưa có món" — hồi quy E6-T1', () => {
    render(<GroupOverviewScreen {...BASE_PROPS} dishCount={32} />)

    expect(screen.queryByText(/Trước tiên hãy thêm vài món/)).toBeNull()
  })

  it('nhóm có món và đang có phiên thì cũng không hiện thẻ đó', () => {
    const activeSession = {
      id: 's1',
      participants: [
        {
          userId: 'me',
          displayName: 'Bạn',
          state: 'ACTIVE' as const,
          statusLabel: 'Chưa xong',
        },
      ],
    }
    render(<GroupOverviewScreen {...BASE_PROPS} dishCount={32} activeSession={activeSession} />)

    expect(screen.queryByText(/Trước tiên hãy thêm vài món/)).toBeNull()
    expect(screen.getByText('Phiên đang mở')).toBeDefined()
  })

  it('nhóm 0 món vẫn hiện thẻ và CTA "Thêm món đầu tiên"', () => {
    render(<GroupOverviewScreen {...BASE_PROPS} dishCount={0} />)

    expect(screen.getByText(/Trước tiên hãy thêm vài món/)).toBeDefined()
    expect(screen.getByRole('link', { name: 'Thêm món đầu tiên' })).toBeDefined()
  })

  it('không còn ví dụ món mẫu ở S-04 — chúng thuộc về S-05', () => {
    render(<GroupOverviewScreen {...BASE_PROPS} dishCount={0} />)

    expect(screen.queryByText('Cá basa kho tiêu')).toBeNull()
  })
})
