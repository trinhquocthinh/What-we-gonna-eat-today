import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from './button'

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
})
