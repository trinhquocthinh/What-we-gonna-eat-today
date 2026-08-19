import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AddDishSheet } from './add-dish-sheet'

describe('AddDishSheet', () => {
  it('nút "Thêm vào danh mục" enabled khi tên trống', () => {
    render(
      <AddDishSheet
        formAction={vi.fn()}
        nameError={null}
        systemTagError={null}
        pending={false}
        onClose={vi.fn()}
      />,
    )

    const submitButton = screen.getByRole('button', { name: 'Thêm vào danh mục' })
    expect(submitButton).toBeDefined()
    expect(submitButton).not.toBeDisabled()
  })

  it('nameError "Nhập tên món trước đã." hiện dưới input và nối bằng aria-describedby', () => {
    render(
      <AddDishSheet
        formAction={vi.fn()}
        nameError="Nhập tên món trước đã."
        systemTagError={null}
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
        systemTagError={null}
        pending={false}
        onClose={vi.fn()}
      />,
    )

    const errorText = screen.getByText('Món này đã có trong danh mục rồi.')
    expect(errorText).toBeDefined()
  })

  it('systemTagError hiện dưới hàng chip nhãn', () => {
    render(
      <AddDishSheet
        formAction={vi.fn()}
        nameError={null}
        systemTagError="Chọn một nhãn để quy định bữa ăn kiểm tra được."
        pending={false}
        onClose={vi.fn()}
      />,
    )

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe('Chọn một nhãn để quy định bữa ăn kiểm tra được.')
  })

  it('initialName điền sẵn vào ô tên món', () => {
    render(
      <AddDishSheet
        formAction={vi.fn()}
        nameError={null}
        systemTagError={null}
        initialName="Canh chua"
        pending={false}
        onClose={vi.fn()}
      />,
    )

    const input = screen.getByLabelText('Tên món') as HTMLInputElement
    expect(input.value).toBe('Canh chua')
  })

  it('gõ tên gần giống món đã có thì hiện DuplicateSheet (inGroup), bấm Dùng món này gọi onUseInGroup', async () => {
    const onUseInGroup = vi.fn()
    const onClose = vi.fn()
    const existingDishes = [{ id: '1', name: 'Canh chua cá lóc', systemTags: ['SOUP'] as const }]

    render(
      <AddDishSheet
        formAction={vi.fn()}
        nameError={null}
        systemTagError={null}
        existingDishes={existingDishes}
        onUseInGroup={onUseInGroup}
        pending={false}
        onClose={onClose}
      />,
    )

    await userEvent.type(screen.getByLabelText('Tên món'), 'canh chua')

    expect(screen.getByText('Nhà bạn đã có món gần giống')).toBeDefined()
    expect(screen.getByText('Canh chua cá lóc')).toBeDefined()

    await userEvent.click(screen.getByRole('button', { name: 'Dùng món này' }))
    expect(onUseInGroup).toHaveBeenCalledWith('Canh chua cá lóc')
  })

  it('bấm "Đây là món khác, vẫn tạo mới" ẩn khối trùng', async () => {
    const existingDishes = [{ id: '1', name: 'Canh chua cá lóc', systemTags: ['SOUP'] as const }]

    render(
      <AddDishSheet
        formAction={vi.fn()}
        nameError={null}
        systemTagError={null}
        existingDishes={existingDishes}
        pending={false}
        onClose={vi.fn()}
      />,
    )

    await userEvent.type(screen.getByLabelText('Tên món'), 'canh chua')
    expect(screen.getByText('Nhà bạn đã có món gần giống')).toBeDefined()

    await userEvent.click(screen.getByRole('button', { name: 'Đây là món khác, vẫn tạo mới' }))
    expect(screen.queryByText('Nhà bạn đã có món gần giống')).toBeNull()
  })

  it('server trả về candidates (global) thì hiện khối trùng với nút submit reuseGlobalDishId', () => {
    render(
      <AddDishSheet
        formAction={vi.fn()}
        nameError={null}
        systemTagError={null}
        candidates={[{ id: 'gd-99', name: 'Bún chả' }]}
        pending={false}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Nhà bạn đã có món gần giống')).toBeDefined()
    expect(screen.getByText('Bún chả')).toBeDefined()

    const submitBtn = screen.getByRole('button', { name: 'Dùng món này' })
    expect(submitBtn.getAttribute('type')).toBe('submit')
    expect(submitBtn.getAttribute('name')).toBe('reuseGlobalDishId')
    expect(submitBtn.getAttribute('value')).toBe('gd-99')
  })
})
