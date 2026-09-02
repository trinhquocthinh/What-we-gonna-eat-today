'use client'

import type { ReactElement } from 'react'
import { useActionState, useState } from 'react'

import { SYSTEM_TAGS, type SystemTag } from '@/shared/domain/system-tag'
import { Banner } from '@/shared/ui/banner'
import { Button } from '@/shared/ui/button'
import { InlineError } from '@/shared/ui/inline-error'
import { SYSTEM_TAG_LABELS } from '@/shared/ui/system-tag-label'

export type ParticipantRow = {
  readonly userId: string
  readonly displayName: string
  readonly error: string | null
}

export type StartSessionFormState = {
  readonly blockText: string | null
  readonly invalidParticipantIds: readonly string[]
}

export type StartSessionScreenProps = {
  dateCaption: string
  participants: readonly ParticipantRow[]
  /** Tag của Group Required Rule, thứ tự chuẩn. Rỗng nếu nhóm chưa đặt luật. */
  defaultCourses: readonly SystemTag[]
  blockText: string | null
  action: (state: StartSessionFormState, formData: FormData) => Promise<StartSessionFormState>
}

const INITIAL_STATE: StartSessionFormState = { blockText: null, invalidParticipantIds: [] }

/**
 * S-08 — "Mở phiên tối nay". Copy verbatim từ mockup.
 *
 * E9-T2: Bổ sung chọn và sắp thứ tự chặng (SPEC-029). Trạng thái chặng nằm ở client
 * và phản chiếu vào <form> qua hidden inputs `deckMode` và `courses`.
 */
export function StartSessionScreen({
  dateCaption,
  participants,
  defaultCourses,
  blockText: initialBlockText,
  action,
}: StartSessionScreenProps): ReactElement {
  const [state, formAction, pending] = useActionState(action, {
    ...INITIAL_STATE,
    blockText: initialBlockText,
  })

  const [courseMode, setCourseMode] = useState(false)
  const [selectedCourses, setSelectedCourses] = useState<readonly SystemTag[]>(defaultCourses)

  const rows = participants.map((p) => ({
    ...p,
    error: state.invalidParticipantIds.includes(p.userId)
      ? `${p.displayName} đã rời nhóm, không thể tham gia phiên.`
      : null,
  }))

  function handleMoveUp(index: number) {
    if (index <= 0) return
    setSelectedCourses((prev) => {
      const next = [...prev]
      const temp = next[index - 1]!
      next[index - 1] = next[index]!
      next[index] = temp
      return next
    })
  }

  function handleMoveDown(index: number) {
    if (index >= selectedCourses.length - 1) return
    setSelectedCourses((prev) => {
      const next = [...prev]
      const temp = next[index + 1]!
      next[index + 1] = next[index]!
      next[index] = temp
      return next
    })
  }

  function handleRemoveCourse(tag: SystemTag) {
    setSelectedCourses((prev) => prev.filter((t) => t !== tag))
  }

  function handleAddCourse(tag: SystemTag) {
    if (selectedCourses.includes(tag)) return
    setSelectedCourses((prev) => [...prev, tag])
  }

  const availableCourses = SYSTEM_TAGS.filter((tag) => !selectedCourses.includes(tag))
  const isBlocked = courseMode && selectedCourses.length === 0

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-6">
        <div className="flex flex-col gap-1">
          <span className="text-caption font-medium text-ink-muted">{dateCaption}</span>
          <h1 className="text-title font-semibold text-ink">Mở phiên tối nay</h1>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-4 pt-3">
        <div className="flex flex-col gap-2">
          <span className="pl-1 text-caption font-medium text-ink-muted">Tối nay ai ăn ở nhà</span>
          <ul className="flex flex-col gap-2">
            {rows.map((row, index) => (
              <li key={row.userId} className="flex flex-col gap-1">
                <div className="flex min-h-14 items-center justify-between gap-3 rounded-control border border-border bg-surface-raised p-4">
                  <span className="text-subtitle font-semibold text-ink">{row.displayName}</span>
                  <span className="text-caption font-medium text-ink-muted">
                    {index === 0 ? 'Người mở phiên · chốt bữa' : 'Trong nhóm'}
                  </span>
                </div>
                {row.error === null ? null : (
                  <span className="pl-1">
                    <InlineError message={row.error} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* E9-T2: Chọn & sắp thứ tự chặng */}
        <div className="flex flex-col gap-3">
          <div className="flex min-h-14 items-center justify-between gap-3 rounded-control border border-border bg-surface-raised p-4">
            <div className="flex flex-col">
              <span className="text-subtitle font-semibold text-ink">Vuốt theo chặng</span>
              <span className="text-caption font-medium text-ink-muted">
                Cả nhà duyệt lần lượt từng loại món.
              </span>
            </div>
            <button
              type="button"
              role="button"
              aria-label="Vuốt theo chặng"
              aria-pressed={courseMode}
              onClick={() => setCourseMode((v) => !v)}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                courseMode ? 'bg-accent' : 'bg-surface-sunken'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-surface shadow-lift ring-0 transition duration-200 ease-in-out ${
                  courseMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {courseMode ? (
            <div className="flex flex-col gap-3 pt-1">
              {selectedCourses.length === 0 ? null : (
                <ul className="flex flex-col gap-2">
                  {selectedCourses.map((tag, index) => {
                    const label = SYSTEM_TAG_LABELS[tag]
                    return (
                      <li
                        key={tag}
                        className="flex min-h-12 items-center justify-between gap-2 rounded-control border border-border bg-surface-raised px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-caption font-semibold text-ink-muted">
                            {index + 1}.
                          </span>
                          <span className="text-body font-medium text-ink">{label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            aria-label={`Chuyển ${label} lên`}
                            onClick={() => handleMoveUp(index)}
                            className="flex h-11 w-11 items-center justify-center rounded-control text-ink-muted hover:bg-surface-hover active:bg-surface-active disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={index === selectedCourses.length - 1}
                            aria-label={`Chuyển ${label} xuống`}
                            onClick={() => handleMoveDown(index)}
                            className="flex h-11 w-11 items-center justify-center rounded-control text-ink-muted hover:bg-surface-hover active:bg-surface-active disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            aria-label={`Bỏ chặng ${label}`}
                            onClick={() => handleRemoveCourse(tag)}
                            className="flex h-11 w-11 items-center justify-center rounded-control text-ink-muted hover:bg-surface-hover active:bg-surface-active"
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              {availableCourses.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-caption font-medium text-ink-muted">Thêm chặng:</span>
                  {availableCourses.map((tag) => (
                    <Button
                      key={tag}
                      type="button"
                      variant="quiet"
                      size="sm"
                      onClick={() => handleAddCourse(tag)}
                      aria-label={`Thêm chặng ${SYSTEM_TAG_LABELS[tag]}`}
                    >
                      + {SYSTEM_TAG_LABELS[tag]}
                    </Button>
                  ))}
                </div>
              ) : null}

              {isBlocked ? (
                <InlineError message="Chọn ít nhất một chặng để bắt đầu phiên." />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-8 pt-4">
        {state.blockText === null ? null : <Banner tone="danger">{state.blockText}</Banner>}

        <form action={formAction}>
          <input type="hidden" name="deckMode" value={courseMode ? 'COURSE' : 'FREE'} />
          {/* FormData.getAll('courses') trả về theo thứ tự DOM, bảo toàn thứ tự Creator sắp xếp */}
          {courseMode
            ? selectedCourses.map((tag) => (
                <input key={tag} type="hidden" name="courses" value={tag} />
              ))
            : null}

          <Button type="submit" pending={pending} disabled={pending || isBlocked}>
            {`Bắt đầu phiên với ${participants.length} người`}
          </Button>
        </form>

        <span className="self-center text-caption font-medium text-ink-muted">
          Ai cũng sửa lượt của mình được cho tới khi bạn chốt
        </span>
      </div>
    </main>
  )
}
