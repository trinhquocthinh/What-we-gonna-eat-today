import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { InviteFormState } from './invite-screen'
import { InviteScreen } from './invite-screen'

describe('InviteScreen (S-13)', () => {
  it('render ban đầu khi chưa có token: hiện tiêu đề, nút "Tạo link mời"', () => {
    const action = vi.fn(async () => ({ token: null, expiresAt: null, error: null }))
    render(<InviteScreen groupId="g1" groupName="Nhà Bảy Hiền" action={action} />)

    expect(screen.getByText('Nhà Bảy Hiền')).toBeDefined()
    expect(screen.getByText('Mời thành viên')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Tạo link mời' })).toBeDefined()
  })

  it('khi bấm tạo link thành công: hiện link mời và nút "Tạo link cho người tiếp theo"', async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const action = vi.fn(async () => ({
      token: 'test-token-123',
      expiresAt,
      error: null,
    }))

    const user = userEvent.setup()
    render(<InviteScreen groupId="g1" groupName="Nhà Bảy Hiền" action={action} />)

    await user.click(screen.getByRole('button', { name: 'Tạo link mời' }))

    expect(await screen.findByText('Link mời tham gia')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Tạo link cho người tiếp theo' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Sao chép link' })).toBeDefined()
  })

  it('khi có lỗi: hiển thị banner lỗi', async () => {
    const action = vi.fn(async (): Promise<InviteFormState> => ({
      token: null,
      expiresAt: null,
      error: 'Chỉ Admin mới tạo được link mời.',
    }))

    const user = userEvent.setup()
    render(<InviteScreen groupId="g1" groupName="Nhà Bảy Hiền" action={action} />)

    await user.click(screen.getByRole('button', { name: 'Tạo link mời' }))

    expect(await screen.findByText('Chỉ Admin mới tạo được link mời.')).toBeDefined()
  })
})
