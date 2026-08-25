import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GroupListScreen } from './group-list-screen'

describe('S-02 Danh sách nhóm', () => {
  it('chưa có nhóm nào thì nêu tình trạng và việc cần làm', () => {
    render(<GroupListScreen dateCaption="Thứ Ba · 18 tháng 8" groups={[]} />)

    expect(screen.getByText('Bạn chưa có nhóm nào.')).toBeInTheDocument()
    expect(
      screen.getByText('Tạo một nhóm cho nhà mình, rồi mời từng người bằng link.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tạo nhóm' })).toBeInTheDocument()
    expect(
      screen.getByText('Được mời rồi? Mở link trong tin nhắn là vào thẳng.'),
    ).toBeInTheDocument()
  })

  it('có nhóm thì hiện thẻ và không còn empty state', () => {
    render(
      <GroupListScreen
        dateCaption="Thứ Ba · 18 tháng 8"
        groups={[
          { id: 'g1', name: 'Nhà Bảy Hiền', status: 'Chưa mở phiên hôm nay', meta: '4 người' },
        ]}
      />,
    )

    expect(screen.getByRole('link', { name: /Nhà Bảy Hiền/ })).toBeInTheDocument()
    expect(screen.queryByText('Bạn chưa có nhóm nào.')).not.toBeInTheDocument()
  })
})
