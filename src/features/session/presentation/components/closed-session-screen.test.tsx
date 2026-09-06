import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ClosedSessionScreen } from './closed-session-screen'

describe('ClosedSessionScreen (M3-T10)', () => {
  it('phiên quá hạn: nói rõ vì sao và chỉ đường mở phiên mới', () => {
    render(<ClosedSessionScreen reason="EXPIRED" dateCaption="Thứ Tư 3/9" groupHref="/groups/g1" />)

    expect(screen.getByRole('heading', { name: 'Phiên này đã qua ngày.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về trang nhóm' })).toHaveAttribute(
      'href',
      '/groups/g1',
    )
    // KHÔNG có deck: không nút vuốt nào lọt vào màn này.
    expect(screen.queryByRole('button', { name: /Đề xuất/ })).toBeNull()
  })

  it('phiên đã chốt: có thêm lối xem bữa', () => {
    render(
      <ClosedSessionScreen
        reason="FINALIZED"
        dateCaption="Thứ Tư 3/9"
        groupHref="/groups/g1"
        mealHref="/sessions/s1/meal"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Bữa này đã chốt.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem bữa đã chốt' })).toHaveAttribute(
      'href',
      '/sessions/s1/meal',
    )
    expect(screen.getByRole('link', { name: 'Về trang nhóm' })).toBeInTheDocument()
  })

  it('mọi lý do đều có ít nhất một lối đi tiếp — không màn nào là ngõ cụt', () => {
    for (const reason of ['NOT_STARTED', 'EXPIRED', 'INVALID', 'FINALIZED'] as const) {
      const { unmount } = render(
        <ClosedSessionScreen reason={reason} dateCaption="Thứ Tư 3/9" groupHref="/groups/g1" />,
      )
      expect(screen.getByRole('link', { name: 'Về trang nhóm' })).toBeInTheDocument()
      unmount()
    }
  })
})
