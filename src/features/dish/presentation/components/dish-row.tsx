import type { ReactElement } from 'react'

export type DishRowProps = {
  name: string
  meta: string
  onClick: () => void
}

/**
 * Hàng món ở S-05. Bấm vào mở sheet sửa nhãn món (E2-T6).
 */
export function DishRow({ name, meta, onClick }: DishRowProps): ReactElement {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-control border border-border bg-surface-raised p-4 text-left hover:border-border-strong active:bg-surface-sunken"
      >
        <span className="text-subtitle font-semibold text-ink">{name}</span>
        <span className="flex-none text-caption font-medium text-ink-muted">{meta}</span>
      </button>
    </li>
  )
}
