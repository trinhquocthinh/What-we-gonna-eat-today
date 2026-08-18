import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AddDishSheet } from './add-dish-sheet'

describe('AddDishSheet', () => {
  it('nút "Thêm vào danh mục" enabled khi tên trống', () => {
    render(<AddDishSheet formAction={vi.fn()} nameError={null} pending={false} onClose={vi.fn()} />)

    const submitButton = screen.getByRole('button', { name: 'Thêm vào danh mục' })
    expect(submitButton).toBeDefined()
    expect(submitButton).not.toBeDisabled()
  })

  it('nameError "Nhập tên món trước đã." hiện dưới input và nối bằng aria-describedby', () => {
    render(
      <AddDishSheet
        formAction={vi.fn()}
        nameError="Nhập tên món trước đã."
        pending={false}
        onClose={vi.fn()}
      />,
    )

    const input = screen.getByLabelText('Tên món')
    const errorText = screen.getByText('Nhập tên món trước đã.')
    expect(errorText).toBeDefined()
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe(errorText.id)
  })

  it('nameError "Món này đã có trong danh mục rồi." hiện dưới input', () => {
    render(
      <AddDishSheet
        formAction={vi.fn()}
        nameError="Món này đã có trong danh mục rồi."
        pending={false}
        onClose={vi.fn()}
      />,
    )

    const errorText = screen.getByText('Món này đã có trong danh mục rồi.')
    expect(errorText).toBeDefined()
  })
})
