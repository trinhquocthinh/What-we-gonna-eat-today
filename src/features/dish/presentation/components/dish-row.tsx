import type { ReactElement } from 'react'

export type DishRowProps = {
  name: string
  meta?: string
  onClick?: (() => void) | undefined
  action?: ReactElement | undefined
}

/**
 * Hàng món ở S-05.
 * - Khi `onClick` có: bấm vào tên món mở sheet sửa nhãn món (E2-T6 / Admin).
 * - Khi `onClick` không có: chỉ hiển thị dạng đọc (Member).
 * - `action`: nút hành động (ví dụ: "Gỡ" hoặc "Thêm lại", vùng chạm >= 44px).
 */
export function DishRow({ name, meta = '', onClick, action }: DishRowProps): ReactElement {
  return (
    <li className="flex min-h-14 w-full items-center justify-between gap-2 rounded-control border border-border bg-surface-raised p-2 pl-4">
      {onClick !== undefined ? (
        <button
          type="button"
          onClick={onClick}
          className="flex min-h-11 flex-1 items-center justify-between gap-2 text-left hover:text-accent focus-visible:outline-none"
        >
          <span className="text-subtitle font-semibold text-ink">{name}</span>
          {meta !== '' ? (
            <span className="flex-none text-caption font-medium text-ink-muted">{meta}</span>
          ) : null}
        </button>
      ) : (
        <div className="flex min-h-11 flex-1 items-center justify-between gap-2">
          <span className="text-subtitle font-semibold text-ink">{name}</span>
          {meta !== '' ? (
            <span className="flex-none text-caption font-medium text-ink-muted">{meta}</span>
          ) : null}
        </div>
      )}
      {action}
    </li>
  )
}
