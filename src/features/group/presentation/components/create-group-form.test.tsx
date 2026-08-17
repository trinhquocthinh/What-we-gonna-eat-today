import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { CreateGroupFormState } from './create-group-form'
import { CreateGroupForm } from './create-group-form'

async function noopAction(state: CreateGroupFormState): Promise<CreateGroupFormState> {
  return state
}

async function failingAction(): Promise<CreateGroupFormState> {
  return { nameError: 'Đặt tên để cả nhà nhận ra nhóm.' }
}

describe('S-03 Tạo nhóm', () => {
  it('nút Tạo nhóm mờ khi tên trống nhưng vẫn bấm được', () => {
    render(<CreateGroupForm action={noopAction} initialTimeZone="Asia/Ho_Chi_Minh" />)
    expect(screen.getByRole('button', { name: 'Tạo nhóm' })).toBeEnabled()
  })

  it('hiện múi giờ dạng người đọc được', () => {
    render(<CreateGroupForm action={noopAction} initialTimeZone="Asia/Ho_Chi_Minh" />)
    expect(screen.getByText('Việt Nam · GMT+7')).toBeInTheDocument()
  })

  it('action trả lỗi thì hiện dưới input và giữ nguyên tên đã gõ', async () => {
    render(<CreateGroupForm action={failingAction} initialTimeZone="Asia/Ho_Chi_Minh" />)

    await userEvent.type(screen.getByLabelText('Tên nhóm'), 'Nhà Bảy Hiền')
    await userEvent.click(screen.getByRole('button', { name: 'Tạo nhóm' }))

    expect(await screen.findByText('Đặt tên để cả nhà nhận ra nhóm.')).toBeInTheDocument()
    expect(screen.getByLabelText('Tên nhóm')).toHaveValue('Nhà Bảy Hiền')
  })
})
