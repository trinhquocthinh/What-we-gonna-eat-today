import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { GroupRulesScreen } from './group-rules-screen'

describe('GroupRulesScreen (S-07 + E10-T1)', () => {
  const dummyAction = vi.fn(async () => ({ error: null, savedAt: Date.now() }))

  it('hiển thị 2 rule: thấy đúng 2 câu quy định và tiêu đề Bắt buộc', () => {
    const { container } = render(
      <GroupRulesScreen
        groupName="Nhà Bảy Hiền"
        initialRules={[
          { systemTag: 'MAIN', minimumCount: 1, ruleType: 'REQUIRED' },
          { systemTag: 'SOUP', minimumCount: 1, ruleType: 'REQUIRED' },
        ]}
        canEdit={true}
        action={dummyAction}
      />,
    )

    expect(screen.getByText('Nhà Bảy Hiền')).toBeDefined()
    expect(screen.getByText('Quy định bữa ăn')).toBeDefined()
    expect(screen.getByText('Bắt buộc')).toBeDefined()
    expect(screen.getByText('Phải có ít nhất 1 món mặn')).toBeDefined()
    expect(screen.getByText('Phải có ít nhất 1 món canh')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Thêm quy định bắt buộc' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Thêm quy định nên có' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Lưu quy định' })).toBeDefined()

    // Kiểm tra hidden inputs trường ghép
    const ruleInputs = Array.from(container.querySelectorAll('input[name="rule"]'))
    expect(ruleInputs.map((i) => (i as HTMLInputElement).value)).toEqual([
      'REQUIRED:MAIN:1',
      'REQUIRED:SOUP:1',
    ])
  })

  it('hiển thị cả 2 nhóm: Bắt buộc và Nên có', () => {
    const { container } = render(
      <GroupRulesScreen
        groupName="Nhà Bảy Hiền"
        initialRules={[
          { systemTag: 'MAIN', minimumCount: 1, ruleType: 'REQUIRED' },
          { systemTag: 'SOUP', minimumCount: 2, ruleType: 'PREFERRED' },
        ]}
        canEdit={true}
        action={dummyAction}
      />,
    )

    expect(screen.getByText('Bắt buộc')).toBeDefined()
    expect(screen.getByText('Phải có ít nhất 1 món mặn')).toBeDefined()
    expect(screen.getByText('Nên có')).toBeDefined()
    expect(screen.getByText('Nên có ít nhất 2 món canh')).toBeDefined()

    const ruleInputs = Array.from(container.querySelectorAll('input[name="rule"]'))
    expect(ruleInputs.map((i) => (i as HTMLInputElement).value)).toEqual([
      'REQUIRED:MAIN:1',
      'PREFERRED:SOUP:2',
    ])
  })

  it('canEdit=false: không có các nút Thêm quy định, Gỡ, hay Lưu quy định', () => {
    render(
      <GroupRulesScreen
        groupName="Nhà Bảy Hiền"
        initialRules={[{ systemTag: 'SOUP', minimumCount: 1, ruleType: 'REQUIRED' }]}
        canEdit={false}
        action={dummyAction}
      />,
    )

    expect(screen.getByText('Phải có ít nhất 1 món canh')).toBeDefined()
    expect(screen.queryByRole('button', { name: /Thêm quy định/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Gỡ' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Lưu quy định' })).toBeNull()
  })

  it('gỡ hàng đầu: hàng biến mất khỏi danh sách', () => {
    render(
      <GroupRulesScreen
        groupName="Nhà Bảy Hiền"
        initialRules={[
          { systemTag: 'MAIN', minimumCount: 1, ruleType: 'REQUIRED' },
          { systemTag: 'SOUP', minimumCount: 1, ruleType: 'REQUIRED' },
        ]}
        canEdit={true}
        action={dummyAction}
      />,
    )

    const removeButtons = screen.getAllByRole('button', { name: 'Gỡ' })
    expect(removeButtons).toHaveLength(2)

    fireEvent.click(removeButtons[0]!)

    expect(screen.queryByText('Phải có ít nhất 1 món mặn')).toBeNull()
    expect(screen.getByText('Phải có ít nhất 1 món canh')).toBeDefined()
  })

  it('initialRules=[]: hiện EmptyStateCard và ẩn cả 2 tiêu đề nhóm', () => {
    render(
      <GroupRulesScreen
        groupName="Nhà Bảy Hiền"
        initialRules={[]}
        canEdit={true}
        action={dummyAction}
      />,
    )

    expect(screen.getByText('Chưa có quy định nào')).toBeDefined()
    expect(
      screen.getByText(
        'Chưa có quy định nào. Lúc chốt bữa sẽ không có gì được kiểm tra — thiếu canh hay thiếu món mặn cũng chốt được.',
      ),
    ).toBeDefined()
    expect(screen.queryByRole('heading', { name: 'Bắt buộc' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Nên có' })).toBeNull()
  })

  // Test §1.5: Sheet với minimumCount = 2 -> chip hiện "món canh", không phải cả câu
  it('E10-T1 §1.5: mở sheet thêm quy định, chip hiển thị tên nhãn món đúng chuẩn ("món canh")', async () => {
    render(
      <GroupRulesScreen
        groupName="Nhà Bảy Hiền"
        initialRules={[]}
        canEdit={true}
        action={dummyAction}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Thêm quy định bắt buộc' }))

    // Thay đổi minimumCount lên 2
    const countInput = screen.getByLabelText('Ít nhất bao nhiêu món')
    await userEvent.clear(countInput)
    await userEvent.type(countInput, '2')

    // Chip vẫn chỉ hiện "món canh", không bị dính chuỗi cả câu
    expect(screen.getByText('món canh')).toBeInTheDocument()
    expect(screen.getByText('Phải có ít nhất 2 món cơm/bún')).toBeInTheDocument()
  })

  // Test E10-T3: Ô cấu hình Target Dish Count
  it('E10-T3: hiển thị ô Số món thường ăn mỗi bữa với giá trị khởi tạo', () => {
    render(
      <GroupRulesScreen
        groupName="Nhà Bảy Hiền"
        initialRules={[]}
        initialTargetDishCount={4}
        canEdit={true}
        action={dummyAction}
      />,
    )

    const targetInput = screen.getByLabelText('Số món thường ăn mỗi bữa') as HTMLInputElement
    expect(targetInput.value).toBe('4')
  })
})
