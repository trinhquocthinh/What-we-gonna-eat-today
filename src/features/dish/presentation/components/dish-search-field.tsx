'use client'

import type { ReactElement } from 'react'

export type DishSearchFieldProps = {
  value: string
  onChange: (value: string) => void
}

/**
 * 48px = `min-h-12`, đúng con số mockup. Class chép từ ô tìm của
 * `time-zone-picker-sheet.tsx` — cùng vai trò, cùng hình dạng.
 *
 * KHÔNG debounce. Không có tiền lệ debounce nào trong repo (ô tìm múi giờ lọc
 * 418 mục mỗi phím bấm, danh mục món chỉ ~20), và thêm nó vào sẽ phá idiom test
 * `await userEvent.type(...)` rồi assert ngay mà cả repo đang dùng.
 */
export function DishSearchField({ value, onChange }: DishSearchFieldProps): ReactElement {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Tìm món trong nhà"
      aria-label="Tìm món trong nhà"
      className="min-h-12 w-full rounded-chip border border-border bg-surface-raised px-4 py-3 text-body-lg text-ink placeholder:text-ink-faint"
    />
  )
}
