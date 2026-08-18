import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DishCatalogScreen } from './dish-catalog-screen'

describe('DishCatalogScreen (S-05)', () => {
  it('rỗng: có "Chưa có món nào.", mô tả, 3 ví dụ, nút "Thêm món đầu tiên", không caption, số đếm trống', () => {
    render(<DishCatalogScreen groupName="Nhà Bảy Hiền" dishes={[]} action={vi.fn()} />)

    expect(screen.getByText('Nhà Bảy Hiền')).toBeDefined()
    expect(screen.getByRole('heading', { level: 1, name: 'Danh mục món' })).toBeDefined()
    expect(screen.getByText('Chưa có món nào.')).toBeDefined()
    expect(
      screen.getByText('Thêm những món nhà bạn thật sự hay ăn. Cứ viết như cách cả nhà gọi tên.'),
    ).toBeDefined()
    expect(screen.getByText('Cá basa kho tiêu')).toBeDefined()
    expect(screen.getByText('Canh chua cá lóc')).toBeDefined()
    expect(screen.getByText('Gà chiên nước mắm')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Thêm món đầu tiên' })).toBeDefined()
    expect(screen.queryByText('Khoảng 15–20 món là đủ để bắt đầu')).toBeNull()
  })

  it('có 2 món: tên món hiện, nút "Thêm món", caption "Khoảng 15–20 món...", số đếm "2 món", không có empty state', () => {
    const dishes = [
      { id: '1', name: 'Cá basa kho tiêu' },
      { id: '2', name: 'Canh chua cá lóc' },
    ]
    render(<DishCatalogScreen groupName="Nhà Bảy Hiền" dishes={dishes} action={vi.fn()} />)

    expect(screen.getByText('2 món')).toBeDefined()
    expect(screen.getByText('Cá basa kho tiêu')).toBeDefined()
    expect(screen.getByText('Canh chua cá lóc')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Thêm món' })).toBeDefined()
    expect(screen.getByText('Khoảng 15–20 món là đủ để bắt đầu')).toBeDefined()
    expect(screen.queryByText('Chưa có món nào.')).toBeNull()
  })

  it('bấm CTA mở sheet và toast không hiện', async () => {
    render(<DishCatalogScreen groupName="Nhà Bảy Hiền" dishes={[]} action={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Thêm món đầu tiên' }))
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('action trả về addedDishName thì sheet đóng và toast hiện', async () => {
    async function successAction() {
      return { nameError: null, addedDishName: 'Cá basa kho tiêu' }
    }

    render(<DishCatalogScreen groupName="Nhà Bảy Hiền" dishes={[]} action={successAction} />)

    // Open sheet
    await userEvent.click(screen.getByRole('button', { name: 'Thêm món đầu tiên' }))
    expect(screen.getByRole('dialog')).toBeDefined()

    // Type and Submit
    await userEvent.type(screen.getByLabelText('Tên món'), 'Cá basa kho tiêu')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm vào danh mục' }))

    // Toast will appear when addedDishName is set in state and sheet closes
    expect(await screen.findByRole('status')).toBeDefined()
    expect(screen.getByText('Đã thêm Cá basa kho tiêu vào danh mục.')).toBeDefined()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
