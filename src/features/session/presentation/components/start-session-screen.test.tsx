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
        defaultCourses={[]}
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
        defaultCourses={[]}
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
        defaultCourses={[]}
        blockText={null}
        action={vi.fn()}
      />,
    )

    expect(screen.queryByRole('alert')).toBeNull()
  })

  describe('E9-T2 — Chọn và sắp thứ tự chặng', () => {
    it('Mặc định: công tắc tắt, không có hidden input courses nào', () => {
      const { container: rendered } = render(
        <StartSessionScreen
          dateCaption="Thứ Ba · 19 tháng 8"
          participants={ONE_PARTICIPANT}
          defaultCourses={['STAPLE', 'MAIN']}
          blockText={null}
          action={vi.fn()}
        />,
      )

      const toggle = screen.getByRole('button', { name: /Vuốt theo chặng/ })
      expect(toggle).toHaveAttribute('aria-pressed', 'false')
      const deckModeInput = rendered.querySelector('input[name="deckMode"]') as HTMLInputElement
      expect(deckModeInput?.value).toBe('FREE')
      const courseInputs = rendered.querySelectorAll('input[name="courses"]')
      expect(courseInputs).toHaveLength(0)
    })

    it('Bật công tắc, defaultCourses = [STAPLE, MAIN, SOUP]: ba hidden input đúng thứ tự', async () => {
      const { container } = render(
        <StartSessionScreen
          dateCaption="Thứ Ba · 19 tháng 8"
          participants={ONE_PARTICIPANT}
          defaultCourses={['STAPLE', 'MAIN', 'SOUP']}
          blockText={null}
          action={vi.fn()}
        />,
      )

      const toggle = screen.getByRole('button', { name: /Vuốt theo chặng/ })
      await userEvent.click(toggle)
      expect(toggle).toHaveAttribute('aria-pressed', 'true')

      const deckModeInput = container.querySelector('input[name="deckMode"]') as HTMLInputElement
      expect(deckModeInput?.value).toBe('COURSE')
      const courseInputs = Array.from(container.querySelectorAll('input[name="courses"]'))
      expect(courseInputs.map((input) => (input as HTMLInputElement).value)).toEqual([
        'STAPLE',
        'MAIN',
        'SOUP',
      ])
    })

    it('Bấm mũi tên xuống ở chặng đầu: thứ tự hidden input đổi tương ứng', async () => {
      const { container } = render(
        <StartSessionScreen
          dateCaption="Thứ Ba · 19 tháng 8"
          participants={ONE_PARTICIPANT}
          defaultCourses={['STAPLE', 'MAIN', 'SOUP']}
          blockText={null}
          action={vi.fn()}
        />,
      )

      await userEvent.click(screen.getByRole('button', { name: /Vuốt theo chặng/ }))
      const downButtons = screen.getAllByRole('button', { name: /Chuyển .* xuống/ })
      await userEvent.click(downButtons[0]!)

      const courseInputs = Array.from(container.querySelectorAll('input[name="courses"]'))
      expect(courseInputs.map((input) => (input as HTMLInputElement).value)).toEqual([
        'MAIN',
        'STAPLE',
        'SOUP',
      ])
    })

    it('Bật công tắc, bỏ hết chặng: nút submit disabled, có InlineError', async () => {
      render(
        <StartSessionScreen
          dateCaption="Thứ Ba · 19 tháng 8"
          participants={ONE_PARTICIPANT}
          defaultCourses={['STAPLE']}
          blockText={null}
          action={vi.fn()}
        />,
      )

      await userEvent.click(screen.getByRole('button', { name: /Vuốt theo chặng/ }))
      const removeBtn = screen.getByRole('button', { name: /Bỏ chặng/ })
      await userEvent.click(removeBtn)

      expect(screen.getByText('Chọn ít nhất một chặng để bắt đầu phiên.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Bắt đầu phiên với 1 người' })).toBeDisabled()
    })

    it('Nhóm chưa có Required Rule (defaultCourses = []): bật công tắc -> danh sách rỗng, nút bị chặn, vẫn thêm chặng được', async () => {
      const { container } = render(
        <StartSessionScreen
          dateCaption="Thứ Ba · 19 tháng 8"
          participants={ONE_PARTICIPANT}
          defaultCourses={[]}
          blockText={null}
          action={vi.fn()}
        />,
      )

      await userEvent.click(screen.getByRole('button', { name: /Vuốt theo chặng/ }))
      expect(screen.getByText('Chọn ít nhất một chặng để bắt đầu phiên.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Bắt đầu phiên với 1 người' })).toBeDisabled()

      // Bấm thêm chặng Canh
      const addSoupBtn = screen.getByRole('button', { name: /Thêm chặng Canh/ })
      await userEvent.click(addSoupBtn)

      expect(screen.queryByText('Chọn ít nhất một chặng để bắt đầu phiên.')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Bắt đầu phiên với 1 người' })).not.toBeDisabled()
      const courseInputs = Array.from(container.querySelectorAll('input[name="courses"]'))
      expect(courseInputs.map((input) => (input as HTMLInputElement).value)).toEqual(['SOUP'])
    })
  })
})
