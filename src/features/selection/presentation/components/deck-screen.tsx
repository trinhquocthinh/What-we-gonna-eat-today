'use client'

import Link from 'next/link'
import type { ReactElement } from 'react'
import { useEffect, useRef, useState } from 'react'

import { sendJsonWithRetry } from '@/shared/http/send-json-with-retry'
import { Button } from '@/shared/ui/button'
import { SYSTEM_TAG_LABELS } from '@/shared/ui/system-tag-label'

import type { DishCard } from '../../domain/dish-card'
import type { SwipeDirection } from '../../domain/swipe-gesture'
import type { CourseBoundary } from './current-course'
import { currentCourse } from './current-course'
import { formatExplanation, formatLastEatenLabel } from './dish-explanation'
import { DishSwipeCard } from './dish-swipe-card'
import { resumePosition } from './resume-position'
import type { SendInteractionStatus } from './send-interaction'
import { sendInteractionWithRetry } from './send-interaction'
import { SwipeControls } from './swipe-controls'

export type DeckScreenProps = {
  sessionId: string
  dateCaption: string
  dishes: DishCard[]
  courses?: readonly CourseBoundary[] | null
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
 * E8-S2 kết nối `resumePosition` (F51/SPEC-036), hiển thị lý do explore lane,
 * và cập nhật màn hết thẻ theo trần deck.
 *
 * E9-T5 hỗ trợ duyệt theo chặng: tiêu đề chặng, tiến trình trong chặng,
 * tự chuyển chặng và nút quay lại chặng trước.
 */
export function DeckScreen({
  sessionId,
  dateCaption,
  dishes,
  courses = null,
  initialParticipantState,
  groupHref,
}: DeckScreenProps): ReactElement {
  const initial = resumePosition(dishes)
  const [cursor, setCursor] = useState(initial.cursor)
  const [marks, setMarks] = useState<Array<'yes' | 'no' | 'cannot'>>(initial.marks)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [view, setView] = useState<ViewState>(
    initialParticipantState === 'COMPLETED' ? 'done' : 'deck',
  )
  const [sendStatus, setSendStatus] = useState<SendInteractionStatus>('idle')
  const [failedCount, setFailedCount] = useState(0)

  const courseInfo = currentCourse(courses ?? null, cursor)

  const prevCourseTagRef = useRef<string | null>(courseInfo?.systemTag ?? null)
  const [courseAnnouncement, setCourseAnnouncement] = useState<string | null>(null)

  useEffect(() => {
    if (courseInfo !== null) {
      if (prevCourseTagRef.current !== null && prevCourseTagRef.current !== courseInfo.systemTag) {
        setCourseAnnouncement(`Sang chặng ${SYSTEM_TAG_LABELS[courseInfo.systemTag]}`)
      }
      prevCourseTagRef.current = courseInfo.systemTag
    }
  }, [courseInfo])

  const current = dishes[cursor]
  const isEmpty = view === 'deck' && current === undefined
  const isDeck = view === 'deck' && current !== undefined
  const isDone = view === 'done'

  const yesCount = marks.filter((m) => m === 'yes').length
  const noCount = marks.filter((m) => m === 'no').length
  const total = dishes.length

  const progress =
    courseInfo !== null
      ? `${courseInfo.position} / ${courseInfo.count}`
      : `${Math.min(cursor + 1, total)} / ${total}`

  const progressPercent =
    courseInfo !== null
      ? courseInfo.count === 0
        ? 0
        : Math.round((courseInfo.position / courseInfo.count) * 100)
      : total === 0
        ? 0
        : Math.round((Math.min(cursor, total) / total) * 100)

  const courseBoundaries: number[] = []
  let acc = 0
  for (const c of courses ?? []) {
    courseBoundaries.push(acc)
    acc += c.count
  }
  const firstCourseCount = courses?.[0]?.count ?? 0
  const canGoPreviousCourse = courses !== null && courses.length > 0 && cursor >= firstCourseCount

  /**
   * M3-T1 — `marks` PHẢI cắt cùng lúc với `cursor`.
   *
   * `marks` là mảng chỉ-thêm, đánh chỉ số ngầm theo `cursor`: `resume-position.ts`
   * dựng nó cho đúng tiền tố `[0, cursor)` và cả màn hình dựa vào bất biến
   * `marks.length === cursor`. Lùi `cursor` mà giữ nguyên `marks` làm gãy bất
   * biến đó — mỗi lượt vuốt sau khi quay chặng lại cộng thêm một phần tử, nên
   * `yesCount` đếm trùng (vượt cả số thẻ trong deck) và `handleUndo` pop nhầm.
   */
  function handlePreviousCourse() {
    const prevBoundary = courseBoundaries.filter((b) => b < cursor).pop() ?? 0
    setCursor(prevBoundary)
    setMarks((m) => m.slice(0, prevBoundary))
  }

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

  /**
   * M3-T7 — có retry và KHÔNG nuốt lỗi.
   *
   * Bản trước là `fetch(...).catch(() => {})`: mạng rớt thì khai báo biến mất
   * mà toast vẫn hứa "Sẽ không hiện lại". Đó đúng là rủi ro `R-05` — hệ thống
   * nói một đằng, lưu một nẻo — mà cả `E7` sinh ra để đóng. Lượt vuốt đã có
   * `sendInteractionWithRetry` từ E1-T9; khai báo `Cannot Eat` quan trọng hơn
   * một lượt vuốt chứ không kém.
   *
   * Con trỏ VẪN tiến ngay (lạc quan, đúng tinh thần vuốt). Chỉ lời hứa trong
   * toast mới đợi kết quả thật.
   */
  function handleCannotEat(dish: DishCard) {
    setMarks((m) => [...m, 'cannot'])
    setCursor((c) => c + 1)
    setToastMessage(`Sẽ không hiện lại ${dish.name} với bạn.`)

    void sendJsonWithRetry({
      url: '/api/preferences/constraints',
      method: 'PUT',
      body: { globalDishId: dish.globalDishId, cannotEat: true },
      onStatusChange: () => {},
    }).then((result) => {
      if (!result.ok) {
        setToastMessage(`Chưa lưu được "không ăn được ${dish.name}". Thử lại ở màn Danh mục món.`)
      }
    })
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

      {courseAnnouncement === null ? null : (
        <div role="status" aria-live="polite" className="sr-only">
          {courseAnnouncement}
        </div>
      )}

      <div className="flex flex-col gap-3 px-4 pb-3 pt-4">
        <div className="flex min-h-6 items-center justify-between gap-3">
          {courseInfo !== null ? (
            <div className="flex flex-col">
              <span className="text-caption font-semibold text-ink">
                Chặng {courseInfo.index}/{courseInfo.total} ·{' '}
                {SYSTEM_TAG_LABELS[courseInfo.systemTag]}
              </span>
              <span className="text-caption font-medium text-ink-muted">{dateCaption}</span>
            </div>
          ) : (
            <span className="text-caption font-medium text-ink-muted">Bữa tối · {dateCaption}</span>
          )}
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
              explanation={formatExplanation(current.daysSinceLastEaten, current.lane)}
              upcomingNames={upcoming}
              onCommit={handleCommit}
              onCannotEat={handleCannotEat}
            />
          </>
        ) : null}

        {isEmpty ? (
          <div className="flex h-full flex-col justify-center gap-3 px-2">
            <h2 className="text-title font-semibold text-ink">
              Bạn đã xem hết {total} món được chọn cho hôm nay.
            </h2>
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
          <>
            {canGoPreviousCourse ? (
              <div className="flex justify-center">
                <Button type="button" variant="quiet" size="sm" onClick={handlePreviousCourse}>
                  Quay lại chặng trước
                </Button>
              </div>
            ) : null}
            <SwipeControls
              currentDishName={current?.name ?? null}
              canUndo={cursor > 0 && marks[marks.length - 1] !== 'cannot'}
              onSwipeLeft={() => current !== undefined && handleCommit(-1, current.dishId)}
              onSwipeRight={() => current !== undefined && handleCommit(1, current.dishId)}
              onUndo={handleUndo}
              onFinish={handleFinish}
            />
          </>
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
