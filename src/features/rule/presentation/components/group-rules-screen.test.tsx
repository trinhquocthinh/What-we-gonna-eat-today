import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GroupRulesScreen } from './group-rules-screen'

describe('GroupRulesScreen (S-07)', () => {
  const dummyAction = vi.fn(async () => ({ error: null, savedAt: Date.now() }))

  it('hiển thị 2 rule: thấy đúng 2 câu quy định', () => {
    render(
      <GroupRulesScreen
        groupName="Nhà Bảy Hiền"
        initialRules={[
          { systemTag: 'MAIN', minimumCount: 1 },
          { systemTag: 'SOUP', minimumCount: 1 },
        ]}
        canEdit={true}
        action={dummyAction}
      />,
    )

    expect(screen.getByText('Nhà Bảy Hiền')).toBeDefined()
    expect(screen.getByText('Quy định bữa ăn')).toBeDefined()
    expect(screen.getByText('Phải có ít nhất 1 món mặn')).toBeDefined()
    expect(screen.getByText('Phải có ít nhất 1 món canh')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Thêm quy định' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Lưu quy định' })).toBeDefined()
  })

  it('canEdit=false: không có nút Thêm quy định, không có nút Gỡ, không có nút Lưu quy định', () => {
    render(
      <GroupRulesScreen
        groupName="Nhà Bảy Hiền"
        initialRules={[{ systemTag: 'SOUP', minimumCount: 1 }]}
        canEdit={false}
        action={dummyAction}
      />,
    )

    expect(screen.getByText('Phải có ít nhất 1 món canh')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Thêm quy định' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Gỡ' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Lưu quy định' })).toBeNull()
  })

  it('gỡ hàng đầu: hàng biến mất khỏi danh sách', () => {
    render(
      <GroupRulesScreen
        groupName="Nhà Bảy Hiền"
        initialRules={[
          { systemTag: 'MAIN', minimumCount: 1 },
          { systemTag: 'SOUP', minimumCount: 1 },
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

  it('initialRules=[]: hiện EmptyStateCard và không có tiêu đề Nên có', () => {
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
        'Thêm quy định để lúc chốt bữa hệ thống nhắc bạn nếu mâm cơm còn thiếu món.',
      ),
    ).toBeDefined()
    expect(screen.queryByText(/Nên có/)).toBeNull()
  })

  it('không có mục Nên có trên UI (bảo vệ tĩnh cho Guide §1.4)', () => {
    render(
      <GroupRulesScreen
        groupName="Nhà Bảy Hiền"
        initialRules={[{ systemTag: 'MAIN', minimumCount: 1 }]}
        canEdit={true}
        action={dummyAction}
      />,
    )

    expect(screen.queryByText(/Nên có/)).toBeNull()
  })
})
