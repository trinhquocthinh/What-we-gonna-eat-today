'use client'

import type { ReactElement } from 'react'

import type { DishCard } from '../../domain/dish-card'
import { useSwipeGesture } from './use-swipe-gesture'
import type { SwipeDirection } from '../../domain/swipe-gesture'

export type DishSwipeCardProps = {
  dish: DishCard
  /** "Lần cuối ăn · N ngày trước" — LUÔN "Chưa từng ăn" ở S5, `eating_history`
   *  chưa tồn tại (E1-T11). */
  lastEatenLabel: string
  /** Câu giải thích ranking — LUÔN một câu chung ở S5, ranking thật là E4. */
  explanation: string
  /** Tên hai món kế tiếp trong deck — "Trong chồng". */
  upcomingNames: readonly string[]
  onCommit: (direction: SwipeDirection, dishId: string) => void
}

const DIRECTION_STYLES: Record<
  SwipeDirection,
  { background: string; border: string; label: string; dragLabelBackground: string }
> = {
  [-1]: {
    background: 'bg-no-soft',
    border: 'border-no',
    label: 'Không hôm nay',
    dragLabelBackground: 'bg-no',
  },
  0: {
    background: 'bg-surface-raised',
    border: 'border-border',
    label: '',
    dragLabelBackground: '',
  },
  1: {
    background: 'bg-yes-soft',
    border: 'border-yes',
    label: 'Đề xuất',
    dragLabelBackground: 'bg-yes',
  },
}

/**
 * Thẻ chính của S-09. `reason` chip đổi màu theo explore lane là F18/v1.1 —
 * BỎ ở S5, luôn dùng màu trung tính (`--surface-sunken`/`--ink-muted`).
 */
export function DishSwipeCard({
  dish,
  lastEatenLabel,
  explanation,
  upcomingNames,
  onCommit,
}: DishSwipeCardProps): ReactElement {
  const gesture = useSwipeGesture((direction) => onCommit(direction, dish.dishId))
  const tone = DIRECTION_STYLES[gesture.previewDirection]

  const transform = gesture.flying
    ? `translateX(${gesture.dx}px)`
    : `translateX(${gesture.dx}px) rotate(${gesture.rotationDeg}deg)`
  const transition = gesture.dragging
    ? 'none'
    : 'transform .18s ease, opacity .18s ease, background .12s linear'

  return (
    <div
      {...gesture.handlers}
      style={{ transform, transition, opacity: gesture.flying ? 0 : 1 }}
      className={`relative flex h-full touch-none select-none flex-col gap-4 rounded-card border p-6 shadow-lift ${tone.background} ${tone.border}`}
    >
      <div className="flex min-h-7.5 items-start justify-between gap-3">
        <span className="rounded-chip bg-surface-sunken px-3 py-1.5 text-caption font-medium text-ink-muted">
          {dish.systemTags[0] ?? 'Trong danh mục'}
        </span>
        {tone.label === '' ? null : (
          <span
            className={`flex-none rounded-chip px-3 py-1.5 text-caption font-semibold text-on-accent ${tone.dragLabelBackground}`}
          >
            {tone.label}
          </span>
        )}
      </div>

      <h2 className="text-pretty text-display font-bold text-ink">{dish.name}</h2>

      {dish.systemTags.length === 0 ? null : (
        <div className="flex flex-wrap gap-2">
          {dish.systemTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface-sunken px-3 py-1.5 text-caption font-medium text-ink-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex-1" />

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <span className="tabular text-caption font-medium text-ink-muted">{lastEatenLabel}</span>
        <span className="text-pretty text-body font-normal text-ink-muted">{explanation}</span>
      </div>

      {upcomingNames.length === 0 ? null : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="h-px w-6 bg-border-strong" />
            <span className="text-caption font-medium text-ink-muted">Trong chồng</span>
          </div>
          {upcomingNames.map((name) => (
            <span key={name} className="text-subtitle font-semibold text-ink-muted">
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
