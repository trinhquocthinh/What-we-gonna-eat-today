import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DuplicateSheet } from './duplicate-sheet'

describe('DuplicateSheet (E2-T7)', () => {
  it('ứng viên inGroup: bấm "Dùng món này" gọi onUseInGroup, không submit', async () => {
    const onUseInGroup = vi.fn()
    render(
      <DuplicateSheet
        candidates={[{ kind: 'inGroup', id: '1', name: 'Canh chua cá lóc', meta: 'Canh' }]}
        onUseInGroup={onUseInGroup}
        onForceCreate={vi.fn()}
      />,
    )

    expect(screen.getByText('Nhà bạn đã có món gần giống')).toBeDefined()
    expect(screen.getByText('Canh chua cá lóc')).toBeDefined()
    expect(screen.getByText('Canh')).toBeDefined()

    const button = screen.getByRole('button', { name: 'Dùng món này' })
    expect(button.getAttribute('type')).toBe('button')

    await userEvent.click(button)
    expect(onUseInGroup).toHaveBeenCalledWith('Canh chua cá lóc')
  })

  it('ứng viên global: nút là submit mang theo reuseGlobalDishId', () => {
    render(
      <DuplicateSheet
        candidates={[{ kind: 'global', id: 'gd-1', name: 'Canh chua', meta: '' }]}
        onUseInGroup={vi.fn()}
        onForceCreate={vi.fn()}
      />,
    )

    const button = screen.getByRole('button', { name: 'Dùng món này' })
    expect(button.getAttribute('type')).toBe('submit')
    expect(button.getAttribute('name')).toBe('reuseGlobalDishId')
    expect(button.getAttribute('value')).toBe('gd-1')
  })

  it('E2-T7 DoD — "vẫn tạo mới" mờ hơn và không phải nút chính, click gọi onForceCreate', async () => {
    const onForceCreate = vi.fn()
    render(
      <DuplicateSheet
        candidates={[{ kind: 'inGroup', id: '1', name: 'Canh chua cá lóc', meta: 'Canh' }]}
        onUseInGroup={vi.fn()}
        onForceCreate={onForceCreate}
      />,
    )

    const forceButton = screen.getByRole('button', { name: 'Đây là món khác, vẫn tạo mới' })
    expect(forceButton.className).toContain('underline')
    expect(forceButton.className).toContain('text-ink-muted')

    await userEvent.click(forceButton)
    expect(onForceCreate).toHaveBeenCalledTimes(1)
  })
})
