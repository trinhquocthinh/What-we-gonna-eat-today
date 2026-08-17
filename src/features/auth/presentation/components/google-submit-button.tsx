'use client'

import type { ReactElement } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/shared/ui/button'

/**
 * Nhãn và màu đổi theo trạng thái submit của form bao ngoài. Kích thước không
 * đổi — Design Criteria cấm nút co giãn khi đang xử lý.
 */
export function GoogleSubmitButton(): ReactElement {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" pending={pending}>
      {pending ? 'Đang mở Google…' : 'Tiếp tục với Google'}
    </Button>
  )
}
