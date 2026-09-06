import Link from 'next/link'
import type { ReactElement } from 'react'

import { EmptyStateCard } from '@/shared/ui/empty-state-card'

import type { SessionClosedReason } from '../../domain/session-openness'

export type ClosedSessionScreenProps = {
  reason: SessionClosedReason
  dateCaption: string
  groupHref: string
  /** Chỉ có với `FINALIZED` — phiên đã chốt thì còn một bữa để xem. */
  mealHref?: string | undefined
}

const COPY: Record<SessionClosedReason, { title: string; description: string }> = {
  NOT_STARTED: {
    title: 'Phiên này chưa mở.',
    description: 'Người tạo phiên bấm "Bắt đầu" thì cả nhà mới vuốt được.',
  },
  EXPIRED: {
    title: 'Phiên này đã qua ngày.',
    description:
      'Mỗi phiên chỉ sống trong ngày của nó. Bữa hôm nay cần một phiên mới — mở ở trang nhóm.',
  },
  INVALID: {
    title: 'Phiên này đã đóng.',
    description:
      'Nó đã qua ngày và được đóng lại. Những gì cả nhà vuốt vẫn còn, chỉ là không chốt bữa được nữa.',
  },
  FINALIZED: {
    title: 'Bữa này đã chốt.',
    description: 'Lượt vuốt đã khép lại. Xem lại mâm cơm cả nhà chốt bên dưới.',
  },
}

/**
 * M3-T10 — màn thay cho deck khi phiên không còn mở.
 *
 * Trước M3, `/sessions/[id]` không kiểm `state`: mở một phiên hôm qua từ tab cũ
 * vẫn hiện deck vuốt được, mọi lượt vuốt trả `ERR_SESSION_NOT_ACTIVE`, và dải
 * cảnh báo lại nói "Không gửi được N lượt vuốt. **Vuốt tiếp vẫn được.**" — sai
 * sự thật, rồi Chốt bữa đâm vào một mã lỗi chung chung. Ngõ cụt đó là thứ `E11`
 * mở ra khi làm cho `INVALID` tới được, nhưng chưa lấp.
 *
 * LUÔN có lối đi tiếp (Design Criteria): về trang nhóm, và với phiên đã chốt
 * thì thêm lối xem bữa. Cùng lý lẽ đã sửa màn "Xong lượt của bạn" ở E3-T5 —
 * một màn hình không có nút nào là một màn hình đã hỏng.
 */
export function ClosedSessionScreen({
  reason,
  dateCaption,
  groupHref,
  mealHref,
}: ClosedSessionScreenProps): ReactElement {
  const copy = COPY[reason]

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex flex-col gap-1 px-4 pb-3 pt-6">
        <span className="text-caption font-medium text-ink-muted">{dateCaption}</span>
      </header>

      <div className="flex flex-1 flex-col justify-center px-4">
        <EmptyStateCard title={copy.title} description={copy.description} />
      </div>

      <div className="flex flex-col gap-3 px-4 pb-8 pt-6">
        {mealHref === undefined ? null : (
          <Link
            href={mealHref}
            className="flex min-h-14 w-full items-center justify-center rounded-control bg-accent px-6 text-subtitle font-semibold text-on-accent shadow-button transition-transform duration-100 hover:bg-accent-hover active:scale-[0.98] active:bg-accent-active"
          >
            Xem bữa đã chốt
          </Link>
        )}
        <Link
          href={groupHref}
          className={`flex min-h-14 w-full items-center justify-center rounded-control px-6 text-subtitle font-semibold transition-transform duration-100 active:scale-[0.98] ${
            mealHref === undefined
              ? 'bg-accent text-on-accent shadow-button hover:bg-accent-hover active:bg-accent-active'
              : 'border border-border bg-surface-raised text-ink hover:border-border-strong hover:bg-surface active:bg-surface-sunken'
          }`}
        >
          Về trang nhóm
        </Link>
      </div>
    </main>
  )
}
