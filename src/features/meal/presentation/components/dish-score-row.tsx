'use client'

import type { ReactElement } from 'react'

import { Button } from '@/shared/ui/button'

import { countTone } from './count-tone'
import type { SummaryDish } from './finalize-meal-screen'

export type DishScoreRowProps = {
  dish: SummaryDish
  selected: boolean
  onToggle: (dishId: string) => void
  tagLabel: string
}

/**
 * S-10, một thẻ món. BA ô đếm, không phải bốn: ô "không ăn được" trong mockup
 * là $X$ (F15, v1.1) — một ô luôn hiện 0 vĩnh viễn nói dối người dùng rằng
 * "chưa ai báo không ăn được", trong khi sự thật là chưa hỏi ai bao giờ
 * (Guide §1.2).
 *
 * KHÔNG hiện `score`. Điểm là thứ dùng để SẮP XẾP, không phải thứ để đọc:
 * "0.43" không nói gì với người đang chọn bữa tối, còn "3 đề xuất · 1 không
 * muốn" thì nói đủ. Mockup cũng không có số điểm ở đâu.
 */
export function DishScoreRow({
  dish,
  selected,
  onToggle,
  tagLabel,
}: DishScoreRowProps): ReactElement {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-raised p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-subtitle font-semibold text-ink">{dish.name}</h3>
        <Button
          type="button"
          variant={selected ? 'quietAccent' : 'quiet'}
          size="sm"
          aria-pressed={selected}
          onClick={() => onToggle(dish.dishId)}
        >
          {selected ? 'Bỏ' : 'Chọn'}
        </Button>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        <Count value={dish.proposedCount} label="đề xuất" tone="yes" />
        <Count value={dish.rejectedCount} label="không muốn" tone="neutral" />
        <Count value={dish.recentEaterCount} label="vừa ăn" tone="neutral" />
      </dl>

      <p className="text-caption text-ink-muted">{tagLabel}</p>
    </div>
  )
}

function Count({
  value,
  label,
  tone,
}: {
  value: number
  label: string
  tone: 'yes' | 'neutral'
}): ReactElement {
  return (
    <div className={`flex gap-1 text-body tabular-nums ${countTone(value, tone)}`}>
      <dt className="sr-only">{label}</dt>
      <dd aria-label={`${value} ${label}`}>
        {value} {label}
      </dd>
    </div>
  )
}
