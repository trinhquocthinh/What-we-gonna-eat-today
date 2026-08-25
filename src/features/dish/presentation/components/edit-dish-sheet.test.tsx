import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EditDishSheet } from './edit-dish-sheet'

describe('EditDishSheet (E2-T6)', () => {
  it('render tên món, tiêu đề và đánh dấu nhãn ban đầu', () => {
    render(
      <EditDishSheet
        dishId="d-1"
        dishName="Canh chua cá lóc"
        initialTags={['SOUP']}
        formAction={vi.fn()}
        pending={false}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Canh chua cá lóc' })).toBeDefined()
    expect(screen.getByText('Nhãn — chọn bao nhiêu cũng được')).toBeDefined()

    const soupCheckbox = screen.getByRole('checkbox', { name: 'Canh' }) as HTMLInputElement
    const stapleCheckbox = screen.getByRole('checkbox', {
      name: 'Cơm · Bún · Phở',
    }) as HTMLInputElement

    expect(soupCheckbox.checked).toBe(true)
    expect(stapleCheckbox.checked).toBe(false)
  })

  it('cho phép toggle nhiều nhãn (0..5)', async () => {
    render(
      <EditDishSheet
        dishId="d-1"
        dishName="Canh chua cá lóc"
        initialTags={['SOUP']}
        formAction={vi.fn()}
        pending={false}
        onClose={vi.fn()}
      />,
    )

    const mainCheckbox = screen.getByRole('checkbox', { name: 'Món mặn' }) as HTMLInputElement
    const soupCheckbox = screen.getByRole('checkbox', { name: 'Canh' }) as HTMLInputElement

    // Tick thêm Món mặn
    await userEvent.click(mainCheckbox)
    expect(mainCheckbox.checked).toBe(true)
    expect(soupCheckbox.checked).toBe(true)

    // Bỏ tick Canh
    await userEvent.click(soupCheckbox)
    expect(soupCheckbox.checked).toBe(false)
  })

  it('bấm Lưu nhãn gọi formAction với groupDishId và các nhãn đã chọn', async () => {
    let submittedData: FormData | null = null
    const formAction = vi.fn((formData: FormData) => {
      submittedData = formData
    })

    render(
      <EditDishSheet
        dishId="d-1"
        dishName="Bò kho bánh mì"
        initialTags={['MAIN']}
        formAction={formAction}
        pending={false}
        onClose={vi.fn()}
      />,
    )

    const soupCheckbox = screen.getByRole('checkbox', { name: 'Canh' })
    await userEvent.click(soupCheckbox)

    const submitButton = screen.getByRole('button', { name: 'Lưu nhãn' })
    await userEvent.click(submitButton)

    expect(formAction).toHaveBeenCalledTimes(1)
    expect(submittedData).not.toBeNull()
    expect(submittedData!.get('groupDishId')).toBe('d-1')
    expect(submittedData!.getAll('systemTag')).toEqual(['MAIN', 'SOUP'])
  })

  it('đóng bằng scrim (nút Đóng của Sheet)', async () => {
    const onClose = vi.fn()
    render(
      <EditDishSheet
        dishId="d-1"
        dishName="Canh chua cá lóc"
        initialTags={['SOUP']}
        formAction={vi.fn()}
        pending={false}
        onClose={onClose}
      />,
    )

    const closeButton = screen.getByRole('button', { name: 'Đóng' })
    await userEvent.click(closeButton)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
