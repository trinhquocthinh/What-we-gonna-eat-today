'use client'

import Link from 'next/link'
import type { ReactElement } from 'react'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'

import type { DishCard } from '../../domain/dish-card'
import type { SwipeDirection } from '../../domain/swipe-gesture'
import { formatExplanation, formatLastEatenLabel } from './dish-explanation'
import { DishSwipeCard } from './dish-swipe-card'
import type { SendInteractionStatus } from './send-interaction'
import { sendInteractionWithRetry } from './send-interaction'
import { SwipeControls } from './swipe-controls'

export type DeckScreenProps = {
  sessionId: string
  dateCaption: string
  dishes: DishCard[]
  initialParticipantState: 'ACTIVE' | 'COMPLETED'
  /** Group Hub — nơi duy nhất hiện "Xem tổng hợp" (Creator) và "ai xong ai
   *  chưa" (mọi Member). Màn "Xong lượt của bạn" từng là NGÕ CỤT: không có
   *  cách nào đi tiếp ngoài nút back của trình duyệt. */
  groupHref: string
}

type ViewState = 'deck' | 'done'

/**
 * S-09 Deck vuốt ⭐ màn hình chính.
 *
 * E1-T8 dựng TOÀN BỘ UI này với dữ liệu deck thật, hành động chỉ đổi state
 * cục bộ. E1-T9 thêm `sendInteractionWithRetry` vào `commit()` — cùng một
 * UI, không viết lại (Implementation Guide §2.1).
 *
 * E3-T5 nối nút "Tôi chọn xong" và "Mở lại lượt chọn" tới Route Handler
 * `/api/sessions/[id]/completed`, và khởi tạo `view` ban đầu theo dữ liệu
 * server.
 *
 * E4-S4 tách `SwipeControls` theo Design Criteria §5 và dùng dữ liệu thật
 * cho `lastEatenLabel` / `explanation`.
 *
 * CỐ Ý CHƯA CÓ ở S5 (F15/F18, v1.1): nút "Tôi không ăn được món này", đổi màu
 * reason chip theo explore lane.
 */
export function DeckScreen({
  sessionId,
  dateCaption,
  dishes,
  initialParticipantState,
  groupHref,
}: DeckScreenProps): ReactElement {
  const [cursor, setCursor] = useState(0)
  const [marks, setMarks] = useState<Array<'yes' | 'no' | 'cannot'>>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [view, setView] = useState<ViewState>(
    initialParticipantState === 'COMPLETED' ? 'done' : 'deck',
  )
  const [sendStatus, setSendStatus] = useState<SendInteractionStatus>('idle')
  const [failedCount, setFailedCount] = useState(0)

  const current = dishes[cursor]
  const isEmpty = view === 'deck' && current === undefined
  const isDeck = view === 'deck' && current !== undefined
  const isDone = view === 'done'

  const yesCount = marks.filter((m) => m === 'yes').length
  const noCount = marks.filter((m) => m === 'no').length
  const total = dishes.length
  const progress = `${Math.min(cursor + 1, total)} / ${total}`
  const progressPercent = total === 0 ? 0 : Math.round((Math.min(cursor, total) / total) * 100)

  function handleCommit(direction: SwipeDirection, dishId: string) {
    if (direction === 0) return
    setMarks((m) => [...m, direction === 1 ? 'yes' : 'no'])
    setCursor((c) => c + 1)

    const action = direction === 1 ? 'SWIPE_RIGHT' : 'SWIPE_LEFT'
    // Fire-and-forget có chủ ý: UI đã tiến rồi (optimistic), không await ở đây
    // — nhiều lượt vuốt liên tiếp gửi song song, đúng lý do chọn Route Handler
    // thay Server Action (Tech Spec §4.1).
    void sendInteractionWithRetry(sessionId, { dishId, action }, (status) => {
      setSendStatus(status)
      if (status === 'failed') setFailedCount((n) => n + 1)
    })
  }

  function handleCannotEat(dish: DishCard) {
    setMarks((m) => [...m, 'cannot'])
    setCursor((c) => c + 1)
    setToastMessage(`Sẽ không hiện lại ${dish.name} với bạn.`)

    void fetch('/api/preferences/constraints', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        globalDishId: dish.globalDishId,
        cannotEat: true,
      }),
    }).catch(() => {})
  }

  function handleUndo() {
    if (cursor === 0) return
    const lastMark = marks[marks.length - 1]
    if (lastMark === 'cannot') {
      return
    }
    const previousDish = dishes[cursor - 1]
    setCursor((c) => c - 1)
    setMarks((m) => m.slice(0, -1))
    if (previousDish !== undefined) {
      void sendInteractionWithRetry(
        sessionId,
        { dishId: previousDish.dishId, action: 'UNDO' },
        setSendStatus,
      )
    }
  }

  function handleFinish() {
    setView('done') // optimistic — đúng tinh thần vuốt (E1-T9), UI đi trước
    void fetch(`/api/sessions/${sessionId}/completed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    }).catch(() => {
      // Lỗi mạng: không revert `view`. Người dùng vẫn thấy "Xong lượt của bạn"
      // đúng ý định của họ; request thất bại sẽ được coi là đồng bộ lại ở lần
      // tương tác kế tiếp (mở lại/vuốt tiếp), không cần cơ chế retry riêng cho
      // một hành động đơn lẻ, không thường xuyên như swipe.
    })
  }

  function handleReopen() {
    setView('deck')
    void fetch(`/api/sessions/${sessionId}/completed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: false }),
    }).catch(() => {})
  }

  const upcoming = dishes.slice(cursor + 1, cursor + 3).map((d) => d.name)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      {sendStatus === 'idle' ? null : (
        <div className="flex items-center gap-2 border-b border-border bg-warning-soft px-4 py-2">
          <span aria-hidden className="h-4 w-hairline rounded-full bg-warning" />
          <span className="text-caption font-medium text-ink">
            {sendStatus === 'retrying'
              ? 'Đang thử gửi lại · bạn vuốt tiếp được'
              : `Không gửi được ${failedCount} lượt vuốt. Vuốt tiếp vẫn được.`}
          </span>
        </div>
      )}

      {toastMessage === null ? null : (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-control border border-border bg-surface-raised px-4 py-3 text-body font-medium text-ink shadow-lift"
        >
          {toastMessage}
        </div>
      )}

      <div className="flex flex-col gap-3 px-4 pb-3 pt-4">
        <div className="flex min-h-6 items-center justify-between gap-3">
          <span className="text-caption font-medium text-ink-muted">Bữa tối · {dateCaption}</span>
          <span className="tabular text-caption font-semibold text-ink-muted">{progress}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="relative min-h-0 flex-1 px-4 pt-2">
        {isDeck && current !== undefined ? (
          <>
            <div className="absolute inset-x-10 top-0 h-35 rounded-card border border-border" />
            <div className="absolute inset-x-7.5 top-1.25 h-35 rounded-card border border-border" />
            <DishSwipeCard
              dish={current}
              lastEatenLabel={formatLastEatenLabel(current.daysSinceLastEaten)}
              explanation={formatExplanation(current.daysSinceLastEaten)}
              upcomingNames={upcoming}
              onCommit={handleCommit}
              onCannotEat={handleCannotEat}
            />
          </>
        ) : null}

        {isEmpty ? (
          <div className="flex h-full flex-col justify-center gap-3 px-2">
            <h2 className="text-title font-semibold text-ink">Bạn đã xem hết {cursor} món.</h2>
            <p className="text-pretty text-body-lg font-normal text-ink-muted">
              Đã đề xuất {yesCount} món. Xong lượt của mình chứ?
            </p>
          </div>
        ) : null}

        {isDone ? (
          <div className="flex h-full flex-col justify-center gap-4 px-2">
            <h2 className="text-title font-semibold text-ink">Xong lượt của bạn.</h2>
            <p className="text-pretty text-body-lg font-normal text-ink-muted">
              Bạn đã đề xuất {yesCount} món và bỏ qua {noCount} món.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 px-4 pb-8 pt-6">
        {isDeck ? (
          <SwipeControls
            currentDishName={current?.name ?? null}
            canUndo={cursor > 0 && marks[marks.length - 1] !== 'cannot'}
            onSwipeLeft={() => current !== undefined && handleCommit(-1, current.dishId)}
            onSwipeRight={() => current !== undefined && handleCommit(1, current.dishId)}
            onUndo={handleUndo}
            onFinish={handleFinish}
          />
        ) : null}

        {isEmpty ? (
          <>
            <Button type="button" onClick={handleFinish}>
              Tôi chọn xong
            </Button>
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={() => {
                setCursor(0)
                setMarks([])
                setToastMessage(null)
              }}
            >
              Xem lại từ đầu
            </Button>
          </>
        ) : null}

        {isDone ? (
          <>
            <Link
              href={groupHref}
              className="flex min-h-14 w-full items-center justify-center rounded-control bg-accent px-6 text-subtitle font-semibold text-on-accent shadow-button transition-transform duration-100 hover:bg-accent-hover active:scale-[0.98] active:bg-accent-active"
            >
              Về trang nhóm
            </Link>
            <Button type="button" variant="secondary" onClick={handleReopen}>
              Mở lại lượt chọn
            </Button>
            <span className="self-center text-caption font-medium text-ink-muted">
              Sửa được cho tới khi phiên được chốt
            </span>
          </>
        ) : null}
      </div>
    </main>
  )
}
