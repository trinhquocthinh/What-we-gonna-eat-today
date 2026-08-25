'use client'

import type { ReactElement } from 'react'
import { useState } from 'react'

import { formatTimeZoneLabel } from '@/shared/time/time-zone'
import { Button } from '@/shared/ui/button'

import { TimeZonePickerSheet } from './time-zone-picker-sheet'

export type TimeZoneFieldProps = {
  value: string
  onChange: (timeZone: string) => void
}

export function TimeZoneField({ value, onChange }: TimeZoneFieldProps): ReactElement {
  const [isPickerOpen, setPickerOpen] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption font-medium text-ink-muted">Múi giờ</span>

      <div className="flex min-h-14 items-center justify-between gap-3 rounded-control border border-border bg-surface-raised p-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-subtitle font-semibold text-ink">
            {formatTimeZoneLabel(value, new Date())}
          </span>
          <span className="text-caption font-medium text-ink-muted">Theo điện thoại của bạn</span>
        </span>

        <Button type="button" variant="quietAccent" size="sm" onClick={() => setPickerOpen(true)}>
          Đổi
        </Button>
      </div>

      <span className="text-pretty text-caption font-medium text-ink-muted">
        Múi giờ quyết định phiên chọn món đóng lúc nào cuối ngày.
      </span>

      {/* Server validate lại bằng readGroupDraft, nên giá trị này không phải
          nguồn tin cậy — chỉ là tiện lợi. */}
      <input type="hidden" name="timezone" value={value} />

      {isPickerOpen ? (
        <TimeZonePickerSheet
          selected={value}
          onClose={() => setPickerOpen(false)}
          onSelect={(timeZone) => {
            onChange(timeZone)
            setPickerOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}
