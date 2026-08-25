import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LoginScreen } from './login-screen'

async function noop(): Promise<void> {}

describe('SPEC-001 — Đăng nhập (S-01)', () => {
  it('trạng thái mặc định hiện đủ tiêu đề, nút và dòng trấn an', () => {
    render(<LoginScreen hasError={false} signInAction={noop} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hôm nay nhà mình ăn gì')
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument()
    expect(screen.getByText('Chỉ dùng để nhận diện bạn trong nhóm gia đình')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('trạng thái lỗi hiện banner và VẪN còn nút để thử lại', () => {
    render(<LoginScreen hasError signInAction={noop} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Không đăng nhập được. Thử lại giúp mình.')
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument()
  })
})
