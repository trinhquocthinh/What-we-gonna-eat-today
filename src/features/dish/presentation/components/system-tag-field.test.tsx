import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SystemTagField } from './system-tag-field'

describe('SystemTagField', () => {
  it('render 5 nhãn tiếng Việt theo thứ tự chuẩn', () => {
    render(<SystemTagField value={[]} error={null} onChange={vi.fn()} />)

    expect(screen.getByText('Nhãn — chọn bao nhiêu cũng được')).toBeDefined()
    expect(screen.getByText('Cơm · Bún · Phở')).toBeDefined()
    expect(screen.getByText('Món mặn')).toBeDefined()
    expect(screen.getByText('Món phụ')).toBeDefined()
    expect(screen.getByText('Canh')).toBeDefined()
    expect(screen.getByText('Tráng miệng')).toBeDefined()
  })

  it('nhãn STAPLE nói rõ gồm cả bún/phở — BR-003 định nghĩa "Món tinh bột / Cơm, bún"', () => {
    render(<SystemTagField value={[]} error={null} onChange={vi.fn()} />)

    // Nhãn cũ 'Cơm' làm "Bún chả" mang tag STAPLE trông như bị gán sai.
    expect(screen.queryByRole('checkbox', { name: 'Cơm' })).toBeNull()
    expect(screen.getByRole('checkbox', { name: 'Cơm · Bún · Phở' })).toBeDefined()
  })

  it('đánh dấu checked đúng với các tag trong value', () => {
    render(<SystemTagField value={['SOUP']} error={null} onChange={vi.fn()} />)

    const soup = screen.getByRole('checkbox', { name: 'Canh' }) as HTMLInputElement
    const main = screen.getByRole('checkbox', { name: 'Món mặn' }) as HTMLInputElement

    expect(soup.checked).toBe(true)
    expect(main.checked).toBe(false)
  })

  it('ĐA CHỌN: click tag thứ hai thì giữ nguyên tag đang có', async () => {
    const onChange = vi.fn()
    render(<SystemTagField value={['STAPLE']} error={null} onChange={onChange} />)

    await userEvent.click(screen.getByText('Món mặn'))

    // "Bún chả" = STAPLE + MAIN. Bản radio cũ sẽ thay STAPLE bằng MAIN.
    expect(onChange).toHaveBeenCalledWith(['STAPLE', 'MAIN'])
  })

  it('click lại tag đang chọn thì bỏ chọn nó', async () => {
    const onChange = vi.fn()
    render(<SystemTagField value={['STAPLE', 'MAIN']} error={null} onChange={onChange} />)

    await userEvent.click(screen.getByText('Món mặn'))

    expect(onChange).toHaveBeenCalledWith(['STAPLE'])
  })

  it('hiển thị thông báo lỗi khi có error prop', () => {
    render(
      <SystemTagField
        value={[]}
        error="Chọn một nhãn để quy định bữa ăn kiểm tra được."
        onChange={vi.fn()}
      />,
    )

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe('Chọn một nhãn để quy định bữa ăn kiểm tra được.')
  })
})
