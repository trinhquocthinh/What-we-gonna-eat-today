import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GroupOverviewScreen } from './group-overview-screen'

describe('GroupOverviewScreen (S-04)', () => {
  it('dishCount={0} thì hiện "Chưa có món nào", nút "Thêm món đầu tiên" và link "Mời thành viên"', () => {
    render(
      <GroupOverviewScreen
        groupName="Nhà Bảy Hiền"
        dateCaption="Thứ Ba, 18 tháng 8"
        dishCount={0}
        dishesHref="/groups/group-1/dishes"
        inviteHref="/groups/group-1/invite"
      />,
    )

    expect(screen.getByText('Nhà Bảy Hiền')).toBeDefined()
    expect(screen.getByText('Thứ Ba, 18 tháng 8')).toBeDefined()
    expect(screen.getByText('Chưa có món nào')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Thêm món đầu tiên' })).toBeDefined()
    expect(screen.getByRole('link', { name: /Mời thành viên/ })).toBeDefined()
  })

  it('dishCount={7} thì hiện "7 món" và nút "Thêm món"', () => {
    render(
      <GroupOverviewScreen
        groupName="Nhà Bảy Hiền"
        dateCaption="Thứ Ba, 18 tháng 8"
        dishCount={7}
        dishesHref="/groups/group-1/dishes"
        inviteHref="/groups/group-1/invite"
      />,
    )

    expect(screen.getByText('7 món')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Thêm món' })).toBeDefined()
  })
})
