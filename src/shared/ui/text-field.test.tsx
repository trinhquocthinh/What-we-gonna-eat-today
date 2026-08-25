import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TextField } from './text-field'

describe('TextField', () => {
  it('không lỗi thì không có thông báo nào', () => {
    render(
      <TextField
        label="Tên nhóm"
        name="name"
        value=""
        placeholder="Ví dụ: Nhà Bảy Hiền"
        error={null}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Tên nhóm')).toHaveAttribute('aria-invalid', 'false')
  })

  it('có lỗi thì hiện ngay dưới input và nối bằng aria-describedby', () => {
    render(
      <TextField
        label="Tên nhóm"
        name="name"
        value=""
        placeholder="Ví dụ: Nhà Bảy Hiền"
        error="Đặt tên để cả nhà nhận ra nhóm."
        onChange={vi.fn()}
      />,
    )

    const input = screen.getByLabelText('Tên nhóm')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Đặt tên để cả nhà nhận ra nhóm.')).toBeInTheDocument()
    expect(input).toHaveAccessibleDescription('Đặt tên để cả nhà nhận ra nhóm.')
  })
})
