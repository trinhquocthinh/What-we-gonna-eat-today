'use client'

import type { ReactElement } from 'react'
import { useMemo, useState } from 'react'

import { Sheet } from '@/shared/ui/sheet'
import { canonicalTimeZone } from '@/shared/time/time-zone'

/** Dự phòng khi trình duyệt chưa có `Intl.supportedValuesOf` (Chrome <99,
 *  Safari <15.4). Đủ để không ai bị kẹt. */
const FALLBACK_TIME_ZONES = [
  'Asia/Ho_Chi_Minh',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
]

export type TimeZonePickerSheetProps = {
  selected: string
  onSelect: (timeZone: string) => void
  onClose: () => void
}

export function TimeZonePickerSheet({
  selected,
  onSelect,
  onClose,
}: TimeZonePickerSheetProps): ReactElement {
  const [query, setQuery] = useState('')

  // Gọi ở CLIENT và chỉ khi sheet mở: danh sách 418 mục nặng ~7.7 KB JSON, mà
  // trình duyệt đã có sẵn miễn phí. Nhét nó vào RSC payload là trả tiền hai lần.
  const timeZones = useMemo(
    () =>
      typeof Intl.supportedValuesOf === 'function'
        ? Intl.supportedValuesOf('timeZone')
        : FALLBACK_TIME_ZONES,
    [],
  )

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle === ''
      ? timeZones
      : timeZones.filter((zone) => zone.toLowerCase().includes(needle))
  }, [query, timeZones])

  // So khớp theo dạng canonical: Firefox báo 'Asia/Ho_Chi_Minh' còn danh sách
  // chỉ có 'Asia/Saigon' — không canonical hoá thì KHÔNG mục nào được đánh dấu.
  const selectedCanonical = canonicalTimeZone(selected)

  return (
    <Sheet title="Chọn múi giờ" onClose={onClose}>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tìm múi giờ"
        aria-label="Tìm múi giờ"
        className="min-h-12 w-full rounded-chip border border-border bg-surface-raised px-4 py-3 text-body-lg text-ink placeholder:text-ink-faint"
      />

      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto">
        {visible.map((zone) => (
          <li key={zone}>
            <button
              type="button"
              aria-current={zone === selectedCanonical}
              onClick={() => onSelect(zone)}
              className={`min-h-11 w-full rounded-control px-4 py-3 text-left text-body ${
                zone === selectedCanonical
                  ? 'bg-accent-soft font-semibold text-accent'
                  : 'font-normal text-ink hover:bg-surface-sunken'
              }`}
            >
              {zone.replaceAll('_', ' ')}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
