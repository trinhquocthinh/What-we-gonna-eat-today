import type { ReactElement } from 'react'

export type DishRowProps = {
  name: string
  meta?: string
  onClick?: (() => void) | undefined
  action?: ReactElement | undefined
  /** M3-T6 — hàng thứ hai dưới tên món: ba nút khai báo sở thích cá nhân.
   *  Tách khỏi `action` vì `action` là hành động lên DANH MỤC CỦA NHÓM (chỉ
   *  Admin), còn hàng này là khai báo CỦA CHÍNH NGƯỜI ĐANG XEM (mọi Member). */
  footer?: ReactElement | undefined
}

/**
 * Hàng món ở S-05.
 * - Khi `onClick` có: bấm vào tên món mở sheet sửa nhãn món (E2-T6 / Admin).
 * - Khi `onClick` không có: chỉ hiển thị dạng đọc (Member).
 * - `action`: nút hành động (ví dụ: "Gỡ" hoặc "Thêm lại", vùng chạm >= 44px).
 * - `footer`: hàng phụ bên dưới, xem `DishPreferenceControls`.
 */
export function DishRow({ name, meta = '', onClick, action, footer }: DishRowProps): ReactElement {
  return (
    <li className="flex w-full flex-col gap-1 rounded-control border border-border bg-surface-raised p-2 pl-4">
      <div className="flex min-h-12 w-full items-center justify-between gap-2">
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
      </div>
      {footer}
    </li>
  )
}
