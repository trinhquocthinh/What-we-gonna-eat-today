import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from '@/shared/ui/button'

describe('Button', () => {
  it('hiện nhãn được truyền vào', () => {
    render(<Button>Tiếp tục với Google</Button>)
    expect(screen.getByRole('button', { name: 'Tiếp tục với Google' })).toBeInTheDocument()
  })

  it('pending thì khoá nút và báo aria-busy', () => {
    render(<Button pending>Đang mở Google…</Button>)
    const button = screen.getByRole('button', { name: 'Đang mở Google…' })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('không pending thì không khoá', () => {
    render(<Button>Tiếp tục với Google</Button>)
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

  it('muted vẫn bấm được — để bấm ra lỗi validation', () => {
    render(<Button muted>Tạo nhóm</Button>)
    expect(screen.getByRole('button')).toBeEnabled()
  })
})
