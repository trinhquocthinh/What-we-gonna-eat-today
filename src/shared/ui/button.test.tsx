import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from '@/shared/ui/button'

describe('Button', () => {
  it('hiện nhãn được truyền vào', () => {
    render(<Button>Đăng nhập</Button>)
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('pending thì khoá nút và báo aria-busy', () => {
    render(<Button pending>Đang mở trang đăng nhập…</Button>)
    const button = screen.getByRole('button', { name: 'Đang mở trang đăng nhập…' })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('không pending thì không khoá', () => {
    render(<Button>Đăng nhập</Button>)
    expect(screen.getByRole('button')).toBeEnabled()
  })

  it('render được variant secondary', () => {
    render(<Button variant="secondary">Đăng xuất</Button>)
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument()
  })

  it('size quiet không chiếm hết chiều ngang', () => {
    render(
      <Button variant="quiet" size="sm">
        Tôi có link mời
      </Button>,
    )
    expect(screen.getByRole('button')).not.toHaveClass('w-full')
  })

  it('muted vẫn bấm được và dùng text-ink-muted (đạt chuẩn tương phản §8, không dùng ink-faint)', () => {
    render(<Button muted>Tạo nhóm</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeEnabled()
    expect(button).toHaveClass('text-ink-muted')
    expect(button).not.toHaveClass('text-ink-faint')
  })

  it('quietAccent có hover compliant với nền surface (không đặt text-accent trên surface-sunken)', () => {
    render(
      <Button variant="quietAccent" size="sm">
        Đổi
      </Button>,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveClass('hover:bg-surface')
    expect(button).toHaveClass('hover:text-accent-hover')
  })
})
