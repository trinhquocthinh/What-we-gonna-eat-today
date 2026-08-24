import Link from 'next/link'
import type { ReactElement } from 'react'

import { EmptyStateCard } from '@/shared/ui/empty-state-card'

const DISH_EXAMPLES = ['Cá basa kho tiêu', 'Canh chua cá lóc', 'Gà chiên nước mắm']

export type GroupOverviewParticipant = {
  readonly userId: string
  readonly displayName: string
  readonly state: 'ACTIVE' | 'COMPLETED' | 'REMOVED'
  readonly statusLabel: string
}

export type GroupOverviewScreenProps = {
  groupName: string
  dateCaption: string
  dishCount: number
  dishesHref: string
  inviteHref: string
  openSessionHref: string
  activeSession: {
    id: string
    participants: readonly GroupOverviewParticipant[]
    summaryHref?: string | undefined
  } | null
  /** `null` khi hôm nay chưa chốt. Loại trừ nhau với `activeSession` —
   *  một Group không thể vừa có phiên đang chạy vừa có phiên đã chốt trong
   *  cùng một Decision Date (BR-025, partial unique index). */
  finalizedMeal?: {
    finalizedCaption: string
    dishNames: readonly string[]
    mealHref: string
  } | null
  currentUserId: string
  rulesHref: string
  ruleCount: number
  historyHref?: string | undefined
}

/**
 * S-04 — Màn hình tổng quan nhóm (Group Hub).
 *
 * Bật: hàng "Danh mục món", "Lịch sử ăn", "Mời thành viên", "Quy định bữa ăn" và
 * CTA "Thêm món đầu tiên" / "Mở phiên" / "Xem bữa hôm nay".
 * E3-T6: thêm khối "Phiên đang mở" khi có activeSession.
 * E6-T7: thêm khối mâm cơm đã chốt khi có finalizedMeal.
 */
export function GroupOverviewScreen({
  groupName,
  dateCaption,
  dishCount,
  dishesHref,
  inviteHref,
  openSessionHref,
  activeSession,
  finalizedMeal = null,
  currentUserId,
  rulesHref,
  ruleCount,
  historyHref,
}: GroupOverviewScreenProps): ReactElement {
  const hasDishes = dishCount > 0
  const isFinalized = finalizedMeal !== null
  const selfCompleted =
    activeSession?.participants.find((p) => p.userId === currentUserId)?.state === 'COMPLETED'
  const completedCount =
    activeSession?.participants.filter((p) => p.state === 'COMPLETED').length ?? 0

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex flex-col gap-1 px-4 pb-3 pt-6">
        <span className="text-caption font-medium text-ink-muted">{dateCaption}</span>
        <h1 className="text-title font-semibold text-ink">{groupName}</h1>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-4 pt-3">
        {isFinalized ? (
          <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-raised p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="rounded-chip bg-accent-soft px-3 py-1.5 text-caption font-semibold text-accent">
                {finalizedMeal.finalizedCaption}
              </span>
            </div>

            <span className="text-caption font-medium text-ink-muted">Tối nay nhà mình ăn</span>

            <div className="flex flex-col gap-2">
              {finalizedMeal.dishNames.map((dishName) => (
                <h2 key={dishName} className="text-2xl font-bold tracking-tight text-ink">
                  {dishName}
                </h2>
              ))}
            </div>
          </div>
        ) : activeSession !== null ? (
          <div className="flex flex-col gap-4 rounded-card border border-border bg-surface-raised p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-chip bg-accent-soft px-3 py-1.5 text-caption font-semibold text-accent">
                Phiên đang mở
              </span>
              <span className="tabular-nums text-caption font-medium text-ink-muted">
                {completedCount} / {activeSession.participants.length} người xong
              </span>
            </div>

            <h2 className="text-title font-semibold text-ink">
              {selfCompleted ? 'Bạn đã xong lượt của mình.' : 'Lượt của bạn chưa xong.'}
            </h2>

            <ul className="flex flex-col gap-2 border-t border-border pt-4">
              {activeSession.participants.map((p) => (
                <li key={p.userId} className="flex items-center justify-between gap-3">
                  <span
                    className={`text-subtitle font-semibold ${
                      p.userId === currentUserId ? 'text-ink' : 'text-ink-muted'
                    }`}
                  >
                    {p.displayName}
                  </span>
                  <span className="text-caption font-medium text-ink-muted">{p.statusLabel}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2">
              <Link
                href={`/sessions/${activeSession.id}`}
                className="flex min-h-14 w-full items-center justify-center rounded-control bg-accent px-6 text-subtitle font-semibold text-on-accent shadow-button transition-transform duration-100 hover:bg-accent-hover active:scale-[0.98] active:bg-accent-active"
              >
                Vào lượt của bạn
              </Link>
              {activeSession.summaryHref ? (
                <Link
                  href={activeSession.summaryHref}
                  className="flex min-h-14 w-full items-center justify-center rounded-control border border-border bg-surface-raised px-6 text-subtitle font-semibold text-ink shadow-button transition-transform duration-100 hover:border-border-strong active:scale-[0.98] active:bg-surface-sunken"
                >
                  Xem tổng hợp
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {isFinalized ? null : (
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
        )}

        <div className="flex flex-col gap-2">
          <span className="pl-1 text-caption font-medium text-ink-muted">Nhóm của bạn</span>
          <div className="flex flex-col gap-2">
            <Link
              href={dishesHref}
              className="flex min-h-14 items-center justify-between gap-3 rounded-control border border-border bg-surface-raised p-4 text-left hover:border-border-strong active:bg-surface-sunken"
            >
              <span className="text-subtitle font-semibold text-ink">Danh mục món</span>
              <span
                className={`tabular-nums text-caption font-medium ${
                  hasDishes ? 'text-ink-muted' : 'text-accent'
                }`}
              >
                {hasDishes ? `${dishCount} món` : 'Chưa có món nào'}
              </span>
            </Link>
            {historyHref ? (
              <Link
                href={historyHref}
                className="flex min-h-14 items-center justify-between gap-3 rounded-control border border-border bg-surface-raised p-4 text-left hover:border-border-strong active:bg-surface-sunken"
              >
                <span className="text-subtitle font-semibold text-ink">Lịch sử ăn</span>
                <span className="text-caption font-medium text-ink-muted">30 ngày gần đây</span>
              </Link>
            ) : null}
            <Link
              href={inviteHref}
              className="flex min-h-14 items-center justify-between gap-3 rounded-control border border-border bg-surface-raised p-4 text-left hover:border-border-strong active:bg-surface-sunken"
            >
              <span className="text-subtitle font-semibold text-ink">Mời thành viên</span>
              <span className="text-caption font-medium text-ink-muted">Tạo link mời</span>
            </Link>
            <Link
              href={rulesHref}
              className="flex min-h-14 items-center justify-between gap-3 rounded-control border border-border bg-surface-raised p-4 text-left hover:border-border-strong active:bg-surface-sunken"
            >
              <span className="text-subtitle font-semibold text-ink">Quy định bữa ăn</span>
              <span className="tabular-nums text-caption font-medium text-ink-muted">
                {ruleCount === 0 ? 'Chưa có quy định nào' : `${ruleCount} quy định`}
              </span>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-8 pt-4">
        {isFinalized ? (
          <Link
            href={finalizedMeal.mealHref}
            className="flex min-h-14 w-full items-center justify-center rounded-control bg-accent px-6 text-subtitle font-semibold text-on-accent shadow-button transition-transform duration-100 hover:bg-accent-hover active:scale-[0.98] active:bg-accent-active"
          >
            Xem bữa hôm nay
          </Link>
        ) : (
          <Link
            href={hasDishes ? openSessionHref : dishesHref}
            className="flex min-h-14 w-full items-center justify-center rounded-control bg-accent px-6 text-subtitle font-semibold text-on-accent shadow-button transition-transform duration-100 hover:bg-accent-hover active:scale-[0.98] active:bg-accent-active"
          >
            {hasDishes ? 'Mở phiên' : 'Thêm món đầu tiên'}
          </Link>
        )}
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
