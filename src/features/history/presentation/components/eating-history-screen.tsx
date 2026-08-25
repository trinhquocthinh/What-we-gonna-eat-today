import Link from 'next/link'
import type { ReactElement } from 'react'

import { EmptyStateCard } from '@/shared/ui/empty-state-card'

import type { EatingDay } from '../../domain/eating-history'
import { eatingDayLabel } from './eating-day-label'

export type EatingHistoryScreenProps = {
  groupName: string
  today: string
  days: readonly EatingDay[]
  closeHref: string
}

/**
 * S-12 — Màn hình "Lịch sử ăn".
 *
 * Hiển thị lịch sử ăn của User trong 30 ngày gần đây, nhóm theo ngày (mới nhất trên cùng).
 * Bỏ các tính năng v1.1: "Bạn đã bỏ món X khỏi lịch sử" (F28), "Sửa lịch sử ăn".
 */
export function EatingHistoryScreen({
  groupName,
  today,
  days,
  closeHref,
}: EatingHistoryScreenProps): ReactElement {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex items-center justify-between px-4 pb-3 pt-6">
        <div className="flex flex-col gap-1">
          <span className="text-caption font-medium text-ink-muted">
            {groupName} · 30 ngày gần đây
          </span>
          <h1 className="text-title font-semibold text-ink">Lịch sử ăn</h1>
        </div>
        <Link
          href={closeHref}
          className="flex min-h-11 items-center justify-center rounded-control px-4 text-body font-semibold text-ink-muted hover:bg-surface-sunken"
        >
          Đóng
        </Link>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-4 pt-3 pb-8">
        {days.length === 0 ? (
          <EmptyStateCard
            title="Chưa có lịch sử ăn uống."
            description="Chốt bữa đầu tiên để bắt đầu lưu lịch sử. Hệ thống sẽ tự động giảm gợi ý những món vừa ăn trong 7 ngày để tránh lặp món."
          />
        ) : (
          days.map((day) => (
            <div
              key={day.eatingDate}
              className="flex flex-col gap-3 rounded-card border border-border bg-surface-raised p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption font-semibold text-ink">
                  {eatingDayLabel(day.eatingDate, today)}
                </span>
                <span className="tabular-nums text-caption font-medium text-ink-muted">
                  {day.dishNames.length} món
                </span>
              </div>

              <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                {day.dishNames.map((name) => (
                  <span key={name} className="text-body font-medium text-ink">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
