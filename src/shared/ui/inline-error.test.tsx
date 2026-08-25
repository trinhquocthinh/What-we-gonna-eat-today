import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { InlineError } from './inline-error'

describe('InlineError', () => {
  it('message: null thì không render gì', () => {
    const { container } = render(<InlineError message={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('có lỗi: getByRole("alert") thấy đúng chuỗi', () => {
    render(<InlineError message="Tên món không được để trống." />)
    expect(screen.getByRole('alert')).toBeDefined()
    expect(screen.getByText('Tên món không được để trống.')).toBeDefined()
  })

  it('dùng token text-danger, không chứa text-no', () => {
    render(<InlineError message="Lỗi hệ thống" />)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('text-danger')
    expect(alert.className).not.toContain('text-no')
  })

  it('truyền id thì gắn id đúng', () => {
    render(<InlineError message="Lỗi ô nhập" id="custom-error-id" />)
    const alert = screen.getByRole('alert')
    expect(alert.id).toBe('custom-error-id')
  })

  it('size="body" render class text-body, mặc định là text-caption', () => {
    const { rerender } = render(<InlineError message="Lỗi body" size="body" />)
    expect(screen.getByRole('alert').className).toContain('text-body')

    rerender(<InlineError message="Lỗi caption" />)
    expect(screen.getByRole('alert').className).toContain('text-caption')
  })
})
