import type { ReactElement } from 'react'

export type DishRowProps = {
  name: string
  /** Cột phải của hàng. Ở S3 luôn rỗng; E2-T5 đưa nhãn hệ thống vào đây. */
  meta: string
}

/**
 * Hàng món ở S-05.
 *
 * Prototype vẽ nó là `<button>`. Ở S3 CHƯA CÓ màn hình chi tiết món (E2-T6),
 * nên đây là `<div>` trong `<li>`, không phải control:
 * - `<button disabled>` được screen reader đọc là "nút, không khả dụng" — một
 *   lời hứa app chưa giữ được, tệ hơn không có nút.
 * - `<button>` bật mà không có handler thì tệ hơn nữa (S2 §2.6).
 * Vì không còn là control, hai class trạng thái `hover:border-border-strong` và
 * `active:bg-surface-sunken` cũng bỏ luôn — trạng thái nghỉ giữ nguyên từng
 * pixel. E2-T6 đổi `<div>` thành `<button>` và trả lại hai class đó.
 */
export function DishRow({ name, meta }: DishRowProps): ReactElement {
  return (
    <li className="flex min-h-14 items-center justify-between gap-3 rounded-control border border-border bg-surface-raised p-4 text-left">
      <span className="text-subtitle font-semibold text-ink">{name}</span>
      <span className="flex-none text-caption font-medium text-ink-muted">{meta}</span>
    </li>
  )
}
