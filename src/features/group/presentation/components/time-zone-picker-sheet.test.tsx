import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TimeZonePickerSheet } from './time-zone-picker-sheet'

describe('TimeZonePickerSheet', () => {
  it('đánh dấu mục đang chọn theo dạng canonical dù truyền vào alias', () => {
    render(<TimeZonePickerSheet selected="Asia/Ho_Chi_Minh" onSelect={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByText('Asia/Saigon')).toHaveAttribute('aria-current', 'true')
  })

  it('gõ để lọc chỉ còn múi giờ khớp', async () => {
    render(<TimeZonePickerSheet selected="UTC" onSelect={vi.fn()} onClose={vi.fn()} />)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm múi giờ' }), 'tokyo')

    expect(screen.getByRole('button', { name: 'Asia/Tokyo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Asia/Saigon' })).not.toBeInTheDocument()
  })

  it('bấm một mục thì gọi onSelect với đúng zone', async () => {
    const onSelect = vi.fn()
    render(<TimeZonePickerSheet selected="UTC" onSelect={onSelect} onClose={vi.fn()} />)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm múi giờ' }), 'tokyo')
    await userEvent.click(screen.getByRole('button', { name: 'Asia/Tokyo' }))

    expect(onSelect).toHaveBeenCalledWith('Asia/Tokyo')
  })

  it('Escape đóng sheet', async () => {
    const onClose = vi.fn()
    render(<TimeZonePickerSheet selected="UTC" onSelect={vi.fn()} onClose={onClose} />)

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })
})
