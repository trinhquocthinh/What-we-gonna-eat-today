import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SystemTagField } from './system-tag-field'

describe('SystemTagField', () => {
  it('render 5 nhãn tiếng Việt theo thứ tự chuẩn', () => {
    render(<SystemTagField value={null} error={null} onChange={vi.fn()} />)

    expect(screen.getByText('Nhãn — chọn một')).toBeDefined()
    expect(screen.getByText('Cơm')).toBeDefined()
    expect(screen.getByText('Món mặn')).toBeDefined()
    expect(screen.getByText('Món phụ')).toBeDefined()
    expect(screen.getByText('Canh')).toBeDefined()
    expect(screen.getByText('Tráng miệng')).toBeDefined()
  })

  it('đánh dấu radio checked đúng với giá trị value', () => {
    render(<SystemTagField value="SOUP" error={null} onChange={vi.fn()} />)

    const soupRadio = screen.getByRole('radio', { name: 'Canh' }) as HTMLInputElement
    const mainRadio = screen.getByRole('radio', { name: 'Món mặn' }) as HTMLInputElement

    expect(soupRadio.checked).toBe(true)
    expect(mainRadio.checked).toBe(false)
  })

  it('kích hoạt onChange khi người dùng click vào nhãn khác', async () => {
    const onChange = vi.fn()
    render(<SystemTagField value={null} error={null} onChange={onChange} />)

    await userEvent.click(screen.getByText('Món mặn'))
    expect(onChange).toHaveBeenCalledWith('MAIN')
  })

  it('hiển thị thông báo lỗi khi có error prop', () => {
    render(
      <SystemTagField
        value={null}
        error="Chọn một nhãn để quy định bữa ăn kiểm tra được."
        onChange={vi.fn()}
      />,
    )

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe('Chọn một nhãn để quy định bữa ăn kiểm tra được.')
  })
})
