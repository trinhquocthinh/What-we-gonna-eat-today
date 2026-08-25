import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Banner } from '@/shared/ui/banner'

describe('Banner', () => {
  it('tone danger thì có role alert và hiện đúng câu', () => {
    render(<Banner tone="danger">Không đăng nhập được. Thử lại giúp mình.</Banner>)
    expect(screen.getByRole('alert')).toHaveTextContent('Không đăng nhập được. Thử lại giúp mình.')
  })

  it('tone warning thì là status chứ không phải alert', () => {
    render(<Banner tone="warning">Bữa nay chưa có món canh.</Banner>)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
