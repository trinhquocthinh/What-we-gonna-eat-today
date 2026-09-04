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
    render(<DishCatalogScreen groupId="g1" groupName="Nhà Bảy Hiền" dishes={[]} action={vi.fn()} />)

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
    render(
      <DishCatalogScreen groupId="g1" groupName="Nhà Bảy Hiền" dishes={dishes} action={vi.fn()} />,
    )

    expect(screen.getByText('4 món')).toBeDefined()
    expect(screen.getByRole('searchbox', { name: 'Tìm món trong nhà' })).toBeDefined()

    // Thứ tự nhóm: Cơm · Bún · Phở -> Canh -> Tráng miệng -> Chưa phân nhãn
    expect(screen.getByText('Cơm · Bún · Phở')).toBeDefined()
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
    render(
      <DishCatalogScreen groupId="g1" groupName="Nhà Bảy Hiền" dishes={DISHES} action={vi.fn()} />,
    )

    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm món trong nhà' }), 'ca loc')

    expect(screen.getByText('Canh chua cá lóc')).toBeDefined()
    expect(screen.queryByText('Cá basa kho tiêu')).toBeNull()
    expect(screen.queryByText('Gà chiên nước mắm')).toBeNull()
  })

  it('tìm không ra thì hiện thẻ không khớp, đúng nháy cong', async () => {
    render(
      <DishCatalogScreen groupId="g1" groupName="Nhà Bảy Hiền" dishes={DISHES} action={vi.fn()} />,
    )

    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm món trong nhà' }), 'phở')

    expect(screen.getByText('Không có món nào khớp “phở”.')).toBeDefined()
    expect(screen.getByText('Thêm nó vào danh mục bằng nút bên dưới.')).toBeDefined()
  })

  it('ô tìm prefill vào sheet khi mở', async () => {
    render(
      <DishCatalogScreen groupId="g1" groupName="Nhà Bảy Hiền" dishes={DISHES} action={vi.fn()} />,
    )

    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm món trong nhà' }), 'Bún bò')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm món' }))

    expect(screen.getByRole('dialog')).toBeDefined()
    const input = screen.getByLabelText('Tên món') as HTMLInputElement
    expect(input.value).toBe('Bún bò')
  })

  it('bấm một hàng món mở sheet sửa nhãn', async () => {
    render(
      <DishCatalogScreen groupId="g1" groupName="Nhà Bảy Hiền" dishes={DISHES} action={vi.fn()} />,
    )

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

    render(
      <DishCatalogScreen
        groupId="g1"
        groupName="Nhà Bảy Hiền"
        dishes={DISHES}
        action={successAction}
      />,
    )

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

    render(
      <DishCatalogScreen
        groupId="g1"
        groupName="Nhà Bảy Hiền"
        dishes={DISHES}
        action={reuseAction}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Thêm món' }))
    await userEvent.click(screen.getByRole('button', { name: 'Thêm vào danh mục' }))

    expect(await screen.findByRole('status')).toBeDefined()
    expect(screen.getByText('Dùng lại Bún chả — đã có trong danh mục.')).toBeDefined()
  })

  it('inGroup reuse: bấm Dùng món này từ panel trùng lặp đóng sheet và hiện toast với dấu em-dash', async () => {
    render(
      <DishCatalogScreen groupId="g1" groupName="Nhà Bảy Hiền" dishes={DISHES} action={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Thêm món' }))
    await userEvent.type(screen.getByLabelText('Tên món'), 'canh chua')

    expect(screen.getByText('Nhà bạn đã có món gần giống')).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: 'Dùng món này' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('status')).toBeDefined()
    expect(screen.getByText('Dùng lại Canh chua cá lóc — đã có trong danh mục.')).toBeDefined()
  })

  it('canEdit = false: không có nút "Gỡ", không có nút "Thêm lại", không mở được sheet sửa nhãn', async () => {
    const inactiveDishes = [{ id: 'in1', name: 'Thịt kho hột vịt', systemTags: [] }]

    render(
      <DishCatalogScreen
        groupId="g1"
        groupName="Nhà Bảy Hiền"
        dishes={DISHES}
        inactiveDishes={inactiveDishes}
        canEdit={false}
        action={vi.fn()}
      />,
    )

    // Không có nút "Gỡ"
    expect(screen.queryByRole('button', { name: 'Gỡ' })).toBeNull()

    // Không có mục "Đã gỡ khỏi nhóm" và không có nút "Thêm lại"
    expect(screen.queryByText('Đã gỡ khỏi nhóm')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Thêm lại' })).toBeNull()

    // Tên món không phải button tương tác (không mở sheet sửa nhãn)
    expect(screen.queryByRole('button', { name: 'Canh chua cá lóc' })).toBeNull()
    // Nhưng tên món vẫn đọc được
    expect(screen.getByText('Canh chua cá lóc')).toBeDefined()
  })

  it('canEdit = true: có nút "Gỡ", bấm gọi removeAction và hiện toast', async () => {
    const removeAction = vi.fn(async () => ({ error: null }))

    render(
      <DishCatalogScreen
        groupId="g1"
        groupName="Nhà Bảy Hiền"
        dishes={DISHES}
        canEdit={true}
        action={vi.fn()}
        removeAction={removeAction}
      />,
    )

    const removeButtons = screen.getAllByRole('button', { name: 'Gỡ' })
    expect(removeButtons.length).toBe(3)

    await userEvent.click(removeButtons[0]!)
    expect(removeAction).toHaveBeenCalledWith('1')
    expect(await screen.findByRole('status')).toBeDefined()
    expect(screen.getByText('Đã gỡ Cá basa kho tiêu khỏi nhóm.')).toBeDefined()
  })

  it('canEdit = true và có inactiveDishes: mục "Đã gỡ khỏi nhóm" hiện, bấm "Thêm lại" gọi reAddAction', async () => {
    const reAddAction = vi.fn(async () => ({ error: null }))
    const inactiveDishes = [{ id: 'in1', name: 'Thịt kho tàu', systemTags: [] }]

    render(
      <DishCatalogScreen
        groupId="g1"
        groupName="Nhà Bảy Hiền"
        dishes={DISHES}
        inactiveDishes={inactiveDishes}
        canEdit={true}
        action={vi.fn()}
        reAddAction={reAddAction}
      />,
    )

    expect(screen.getByText('Đã gỡ khỏi nhóm')).toBeDefined()
    expect(screen.getByText('Thịt kho tàu')).toBeDefined()

    const reAddButton = screen.getByRole('button', { name: 'Thêm lại' })
    await userEvent.click(reAddButton)

    expect(reAddAction).toHaveBeenCalledWith('in1')
    expect(await screen.findByRole('status')).toBeDefined()
    expect(screen.getByText('Đã thêm lại Thịt kho tàu vào nhóm.')).toBeDefined()
  })

  describe('M3-T6 — khai báo sở thích cá nhân ở màn danh mục', () => {
    const PREFS = [
      { groupDishId: '1', globalDishId: 'gld-1', preference: 'LIKE' as const, cannotEat: false },
      { groupDishId: '2', globalDishId: 'gld-2', preference: null, cannotEat: true },
      { groupDishId: '3', globalDishId: 'gld-3', preference: null, cannotEat: false },
    ]

    it('mỗi món có đủ ba nút, mang trạng thái từ server', () => {
      render(
        <DishCatalogScreen
          groupId="g1"
          groupName="Nhà Bảy Hiền"
          dishes={DISHES}
          dishPreferences={PREFS}
          action={vi.fn()}
        />,
      )

      expect(screen.getByRole('button', { name: 'Thích Cá basa kho tiêu' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      expect(
        screen.getByRole('button', { name: 'Không ăn được Canh chua cá lóc' }),
      ).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'Thích Gà chiên nước mắm' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    })

    // BR-043 — khai báo cá nhân là của MỌI Member, khác hẳn `canEdit` (sửa nhãn,
    // gỡ món) vốn chỉ của Admin. Trộn hai quyền này là lỗi E11-T2 vừa sửa xong.
    it('Member không phải Admin vẫn khai báo được, dù không thấy nút "Gỡ"', () => {
      render(
        <DishCatalogScreen
          groupId="g1"
          groupName="Nhà Bảy Hiền"
          dishes={DISHES}
          dishPreferences={PREFS}
          canEdit={false}
          action={vi.fn()}
        />,
      )

      expect(screen.getByRole('button', { name: 'Thích Cá basa kho tiêu' })).toBeDefined()
      expect(screen.queryByRole('button', { name: 'Gỡ' })).toBeNull()
    })

    it('không truyền dishPreferences: màn hình y hệt trước M3, không có nút nào', () => {
      render(
        <DishCatalogScreen
          groupId="g1"
          groupName="Nhà Bảy Hiền"
          dishes={DISHES}
          action={vi.fn()}
        />,
      )

      expect(screen.queryByRole('button', { name: /^Thích / })).toBeNull()
    })
  })
})
