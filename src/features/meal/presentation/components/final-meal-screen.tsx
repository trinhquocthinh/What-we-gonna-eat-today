import Link from 'next/link'
import type { ReactElement } from 'react'

import type { SystemTag } from '@/shared/domain/system-tag'
import { EmptyStateCard } from '@/shared/ui/empty-state-card'
import { SYSTEM_TAG_LABELS } from '@/shared/ui/system-tag-label'

export type FinalMealScreenProps = {
  dateCaption: string
  /** "Mẹ chốt lúc 17:42" — dựng ở `app/`, nơi biết timezone của Group (§1.3). */
  finalizedCaption: string
  dishes: readonly { name: string; systemTags: readonly SystemTag[] }[]
  participantNames: readonly string[]
  closeHref: string
}

const COUNT_WORDS = ['', 'Một', 'Hai', 'Ba', 'Bốn', 'Năm', 'Sáu', 'Bảy', 'Tám']

function countInWords(n: number): string {
  return COUNT_WORDS[n] ?? String(n)
}

/**
 * S-11 — Màn hình "Bữa ăn hôm nay".
 *
 * v1.0 hiển thị mâm cơm đã chốt kèm người chốt, giờ chốt theo timezone Group,
 * danh sách món (chữ lớn) với nhãn phân loại, và danh sách người tham gia.
 * Bỏ các tính năng v1.1/v1.2: "Tôi không ăn món này" (F15), "Sửa món đã chốt" (F40).
 */
export function FinalMealScreen({
  dateCaption,
  finalizedCaption,
  dishes,
  participantNames,
  closeHref,
}: FinalMealScreenProps): ReactElement {
  const participantCount = participantNames.length
  const participantSentence =
    participantCount > 0
      ? `${countInWords(participantCount)} người tham gia chọn: ${participantNames.join(' · ')}`
      : null

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex items-center justify-between px-4 pb-3 pt-6">
        <div className="flex flex-col gap-1">
          <span className="text-caption font-medium text-ink-muted">{dateCaption}</span>
          <h1 className="text-title font-semibold text-ink">Bữa tối nay</h1>
        </div>
        <Link
          href={closeHref}
          className="flex min-h-11 items-center justify-center rounded-control px-4 text-body font-semibold text-ink-muted hover:bg-surface-sunken"
        >
          Đóng
        </Link>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-4 pt-3 pb-8">
        {dishes.length === 0 ? (
          <EmptyStateCard
            title="Chưa có món nào được chốt."
            description="Phiên chọn này chưa có thực đơn đã chốt."
          />
        ) : (
          <div className="flex flex-col gap-5 rounded-card border border-border bg-surface-raised p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="rounded-chip bg-accent-soft px-3 py-1 text-caption font-semibold text-accent">
                {finalizedCaption}
              </span>
            </div>

            <div className="flex flex-col gap-4 divide-y divide-border">
              {dishes.map((dish, index) => (
                <div key={`${dish.name}-${index}`} className={index > 0 ? 'pt-4' : ''}>
                  <h2 className="text-2xl font-bold tracking-tight text-ink">{dish.name}</h2>
                  {dish.systemTags.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {dish.systemTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-chip bg-surface-sunken px-2.5 py-0.5 text-caption font-medium text-ink-muted"
                        >
                          {SYSTEM_TAG_LABELS[tag] ?? tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {participantSentence !== null ? (
              <div className="border-t border-border pt-4">
                <p className="text-caption font-medium text-ink-muted">{participantSentence}</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </main>
  )
}
