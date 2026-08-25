import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { StartSessionScreen } from './start-session-screen'

const ONE_PARTICIPANT = [{ userId: 'u1', displayName: 'Bạn', error: null }]

describe('StartSessionScreen (S-08)', () => {
  it('hiện đúng heading, ngày, và nút CTA đúng số người', () => {
    render(
      <StartSessionScreen
        dateCaption="Thứ Ba · 19 tháng 8"
        participants={ONE_PARTICIPANT}
        blockText={null}
        action={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Mở phiên tối nay' })).toBeDefined()
    expect(screen.getByText('Thứ Ba · 19 tháng 8')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Bắt đầu phiên với 1 người' })).toBeDefined()
  })

  it('action trả invalidParticipantIds thì hiện lỗi ĐÚNG TẠI HÀNG, không phải chỉ banner chung (E3-T2 DoD)', async () => {
    async function failingAction() {
      return {
        blockText: 'Bỏ những người đã rời nhóm ra trước khi bắt đầu.',
        invalidParticipantIds: ['u1'],
      }
    }

    render(
      <StartSessionScreen
        dateCaption="Thứ Ba · 19 tháng 8"
        participants={ONE_PARTICIPANT}
        blockText={null}
        action={failingAction}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Bắt đầu phiên với 1 người' }))

    expect(await screen.findByText('Bạn đã rời nhóm, không thể tham gia phiên.')).toBeDefined()
    expect(screen.getByText('Bỏ những người đã rời nhóm ra trước khi bắt đầu.')).toBeDefined()
  })

  it('không có lỗi thì không banner, không có span lỗi nào', () => {
    render(
      <StartSessionScreen
        dateCaption="Thứ Ba · 19 tháng 8"
        participants={ONE_PARTICIPANT}
        blockText={null}
        action={vi.fn()}
      />,
    )

    expect(screen.queryByRole('alert')).toBeNull()
  })
})
