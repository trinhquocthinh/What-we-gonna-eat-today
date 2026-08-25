import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { SystemTag } from '../../domain/system-tag'
import { DishCatalogScreen } from './dish-catalog-screen'

const DISHES: { id: string; name: string; systemTags: readonly SystemTag[] }[] = [
  { id: '1', name: 'Cá basa kho tiêu', systemTags: ['MAIN'] },
  { id: '2', name: 'Canh chua cá lóc', systemTags: ['SOUP'] },
  { id: '3', name: 'Gà chiên nước mắm', systemTags: ['MAIN'] },
]

describe('DishCatalogScreen (S-05)', () => {
  it('rỗng: có "Chưa có món nào.", mô tả, 3 ví dụ, nút "Thêm món đầu tiên", không caption, số đếm trống, không có ô tìm', () => {
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
    expect(screen.queryByRole('searchbox')).toBeNull()
  })

  it('có món: tên món hiện, nhóm theo nhãn đúng thứ tự mâm cơm, số đếm, ô tìm kiếm', () => {
    const dishes: { id: string; name: string; systemTags: readonly SystemTag[] }[] = [
      { id: '1', name: 'Chè đậu đỏ', systemTags: ['DESSERT'] },
      { id: '2', name: 'Cơm tấm', systemTags: ['STAPLE'] },
      { id: '3', name: 'Canh chua cá lóc', systemTags: ['SOUP'] },
      { id: '4', name: 'Món chưa nhãn', systemTags: [] },
    ]
    render(<DishCatalogScreen groupName="Nhà Bảy Hiền" dishes={dishes} action={vi.fn()} />)

    expect(screen.getByText('4 món')).toBeDefined()
    expect(screen.getByRole('searchbox', { name: 'Tìm món trong nhà' })).toBeDefined()

    // Thứ tự nhóm: Cơm -> Canh -> Tráng miệng -> Chưa phân nhãn
    expect(screen.getByText('Cơm')).toBeDefined()
    expect(screen.getByText('Cơm tấm')).toBeDefined()
    expect(screen.getByText('Canh')).toBeDefined()
    expect(screen.getByText('Canh chua cá lóc')).toBeDefined()
    expect(screen.getByText('Tráng miệng')).toBeDefined()
    expect(screen.getByText('Chè đậu đỏ')).toBeDefined()
    expect(screen.getByText('Chưa phân nhãn')).toBeDefined()
    expect(screen.getByText('Món chưa nhãn')).toBeDefined()

    expect(screen.getByRole('button', { name: 'Thêm món' })).toBeDefined()
    expect(screen.getByText('Khoảng 15–20 món là đủ để bắt đầu')).toBeDefined()
  })

  it('gõ vào ô tìm thì lọc danh sách ngay (hỗ trợ bỏ dấu)', async () => {
    render(<DishCatalogScreen groupName="Nhà Bảy Hiền" dishes={DISHES} action={vi.fn()} />)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm món trong nhà' }), 'ca loc')

    expect(screen.getByText('Canh chua cá lóc')).toBeDefined()
    expect(screen.queryByText('Cá basa kho tiêu')).toBeNull()
    expect(screen.queryByText('Gà chiên nước mắm')).toBeNull()
  })

  it('tìm không ra thì hiện thẻ không khớp, đúng nháy cong', async () => {
    render(<DishCatalogScreen groupName="Nhà Bảy Hiền" dishes={DISHES} action={vi.fn()} />)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm món trong nhà' }), 'phở')

    expect(screen.getByText('Không có món nào khớp “phở”.')).toBeDefined()
    expect(screen.getByText('Thêm nó vào danh mục bằng nút bên dưới.')).toBeDefined()
  })

  it('ô tìm prefill vào sheet khi mở', async () => {
    render(<DishCatalogScreen groupName="Nhà Bảy Hiền" dishes={DISHES} action={vi.fn()} />)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm món trong nhà' }), 'Bún bò')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm món' }))

    expect(screen.getByRole('dialog')).toBeDefined()
    const input = screen.getByLabelText('Tên món') as HTMLInputElement
    expect(input.value).toBe('Bún bò')
  })

  it('bấm một hàng món mở sheet sửa nhãn', async () => {
    render(<DishCatalogScreen groupName="Nhà Bảy Hiền" dishes={DISHES} action={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Canh chua cá lóc' }))

    expect(screen.getByRole('heading', { level: 2, name: 'Canh chua cá lóc' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Lưu nhãn' })).toBeDefined()
  })

  it('action trả về addedDishName thì sheet đóng, query xoá và toast hiện', async () => {
    async function successAction() {
      return {
        nameError: null,
        systemTagError: null,
        addedDishName: 'Cá basa kho tiêu',
        reusedDishName: null,
        candidates: [],
      }
    }

    render(<DishCatalogScreen groupName="Nhà Bảy Hiền" dishes={DISHES} action={successAction} />)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm món trong nhà' }), 'Cá basa')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm món' }))

    await userEvent.click(screen.getByRole('button', { name: 'Thêm vào danh mục' }))

    expect(await screen.findByRole('status')).toBeDefined()
    expect(screen.getByText('Đã thêm Cá basa kho tiêu vào danh mục.')).toBeDefined()
    expect(screen.queryByRole('dialog')).toBeNull()
    const searchbox = screen.getByRole('searchbox', {
      name: 'Tìm món trong nhà',
    }) as HTMLInputElement
    expect(searchbox.value).toBe('')
  })

  it('action trả về reusedDishName thì toast hiện "Dùng lại ... — đã có trong danh mục."', async () => {
    async function reuseAction() {
      return {
        nameError: null,
        systemTagError: null,
        addedDishName: null,
        reusedDishName: 'Bún chả',
        candidates: [],
      }
    }

    render(<DishCatalogScreen groupName="Nhà Bảy Hiền" dishes={DISHES} action={reuseAction} />)

    await userEvent.click(screen.getByRole('button', { name: 'Thêm món' }))
    await userEvent.click(screen.getByRole('button', { name: 'Thêm vào danh mục' }))

    expect(await screen.findByRole('status')).toBeDefined()
    expect(screen.getByText('Dùng lại Bún chả — đã có trong danh mục.')).toBeDefined()
  })

  it('inGroup reuse: bấm Dùng món này từ panel trùng lặp đóng sheet và hiện toast với dấu em-dash', async () => {
    render(<DishCatalogScreen groupName="Nhà Bảy Hiền" dishes={DISHES} action={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Thêm món' }))
    await userEvent.type(screen.getByLabelText('Tên món'), 'canh chua')

    expect(screen.getByText('Nhà bạn đã có món gần giống')).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: 'Dùng món này' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('status')).toBeDefined()
    expect(screen.getByText('Dùng lại Canh chua cá lóc — đã có trong danh mục.')).toBeDefined()
  })
})
