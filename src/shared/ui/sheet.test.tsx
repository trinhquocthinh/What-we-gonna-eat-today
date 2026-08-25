import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Sheet } from './sheet'

describe('Sheet', () => {
  it('Escape đóng sheet', async () => {
    const onClose = vi.fn()
    render(
      <Sheet title="Chọn múi giờ" onClose={onClose}>
        <button type="button">Một</button>
      </Sheet>,
    )

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('bấm ra ngoài đóng sheet', async () => {
    const onClose = vi.fn()
    render(
      <Sheet title="Chọn múi giờ" onClose={onClose}>
        <button type="button">Một</button>
      </Sheet>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('focus rơi vào phần tử đầu tiên bên trong và Tab quay vòng', async () => {
    render(
      <Sheet title="Chọn múi giờ" onClose={vi.fn()}>
        <button type="button">Một</button>
        <button type="button">Hai</button>
      </Sheet>,
    )

    expect(screen.getByRole('button', { name: 'Một' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Hai' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Một' })).toHaveFocus()
  })
})
