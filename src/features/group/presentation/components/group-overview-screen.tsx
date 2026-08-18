import Link from 'next/link'
import type { ReactElement } from 'react'

import { EmptyStateCard } from '@/shared/ui/empty-state-card'

const DISH_EXAMPLES = ['Cá basa kho tiêu', 'Canh chua cá lóc', 'Gà chiên nước mắm']

export type GroupOverviewScreenProps = {
  groupName: string
  dateCaption: string
  dishCount: number
  dishesHref: string
}

/**
 * S-04.
 *
 * Bật: hàng "Danh mục món" và CTA "Thêm món đầu tiên" / "Thêm món".
 *
 * E2-T2 + E5-T1: thêm hai hàng "Thành viên" và "Quy định bữa ăn" khi hai route đó tồn tại.
 */
export function GroupOverviewScreen({
  groupName,
  dateCaption,
  dishCount,
  dishesHref,
}: GroupOverviewScreenProps): ReactElement {
  const hasDishes = dishCount > 0

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex flex-col gap-1 px-4 pb-3 pt-6">
        <span className="text-caption font-medium text-ink-muted">{dateCaption}</span>
        <h1 className="text-title font-semibold text-ink">{groupName}</h1>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-4 pt-3">
        <EmptyStateCard
          title="Trước tiên hãy thêm vài món nhà bạn hay ăn."
          description="Chưa có món thì chưa mở phiên chọn được. Khoảng 15–20 món là đủ để bắt đầu."
        >
          <hr className="border-border" />
          <span className="text-caption font-medium text-ink-muted">
            Cứ viết như cách cả nhà gọi tên
          </span>
          {DISH_EXAMPLES.map((example) => (
            <span key={example} className="text-body-lg font-normal text-ink-faint">
              {example}
            </span>
          ))}
        </EmptyStateCard>

        <div className="flex flex-col gap-2">
          <span className="pl-1 text-caption font-medium text-ink-muted">Nhóm của bạn</span>
          <div className="flex flex-col gap-2">
            <Link
              href={dishesHref}
              className="flex min-h-14 items-center justify-between gap-3 rounded-control border border-border bg-surface-raised p-4 text-left hover:border-border-strong active:bg-surface-sunken"
            >
              <span className="text-subtitle font-semibold text-ink">Danh mục món</span>
              <span
                className={`text-caption font-medium tabular-nums ${
                  hasDishes ? 'text-ink-muted' : 'text-accent'
                }`}
              >
                {hasDishes ? `${dishCount} món` : 'Chưa có món nào'}
              </span>
            </Link>
            {/* E2-T2 + E5-T1: thêm hai hàng "Thành viên" và "Quy định bữa ăn" khi hai route đó tồn tại. */}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-8 pt-4">
        <Link
          href={dishesHref}
          className="flex min-h-14 w-full items-center justify-center rounded-control bg-accent px-6 text-subtitle font-semibold text-on-accent shadow-button transition-transform duration-100 hover:bg-accent-hover active:scale-[0.98] active:bg-accent-active"
        >
          {hasDishes ? 'Thêm món' : 'Thêm món đầu tiên'}
        </Link>
        <Link
          href="/groups"
          className="flex min-h-11 items-center justify-center self-center rounded-control px-4 text-body font-semibold text-ink-muted hover:bg-surface-sunken"
        >
          Nhóm của bạn
        </Link>
      </div>
    </main>
  )
}
