import Link from 'next/link'
import type { ReactElement } from 'react'

export type GroupCardProps = {
  id: string
  name: string
  status: string
  meta: string
}

/**
 * Thẻ nhóm ở S-02. Prototype vẽ nó là `<button>`, nhưng đây là điều hướng nên
 * dùng `<Link>` — người dùng mở tab mới được, và screen reader đọc đúng vai trò.
 *
 * Chấm `--accent` "có phiên đang chạy" và số món CỐ Ý chưa có: bảng
 * `selection_sessions` và `group_dishes` chưa tồn tại ở slice này, và bịa số
 * liệu là cách nhanh nhất để mất lòng tin. E1-T5/E1-T7 nối vào.
 */
export function GroupCard({ id, name, status, meta }: GroupCardProps): ReactElement {
  return (
    <Link
      href={`/groups/${id}`}
      className="flex flex-col items-stretch gap-2 rounded-control border border-border bg-surface-raised p-4 text-left hover:border-border-strong active:bg-surface-sunken"
    >
      <span className="text-subtitle font-semibold text-ink">{name}</span>
      <span className="text-pretty text-body font-normal text-ink-muted">{status}</span>
      <span className="text-caption font-medium tabular-nums text-ink-muted">{meta}</span>
    </Link>
  )
}
