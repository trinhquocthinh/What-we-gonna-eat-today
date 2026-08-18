'use client'

import type { ReactElement } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/shared/ui/button'

/**
 * Nhãn và màu đổi theo trạng thái submit của form bao ngoài. Kích thước không
 * đổi — Design Criteria cấm nút co giãn khi đang xử lý.
 *
 * Copy cố ý KHÔNG nhắc tên nhà cung cấp. Danh tính của app đến từ Family Hub,
 * và nhà cung cấp phía sau là hạ tầng có thể đổi (hiện là Google, sẽ là
 * Authentik) — người trong nhà không cần biết, và đổi nó không được kéo theo
 * việc sửa giao diện.
 */
export function SsoSubmitButton(): ReactElement {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" pending={pending}>
      {pending ? 'Đang mở trang đăng nhập…' : 'Đăng nhập'}
    </Button>
  )
}
