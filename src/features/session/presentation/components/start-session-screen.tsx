'use client'

import type { ReactElement } from 'react'
import { useActionState } from 'react'

import { Banner } from '@/shared/ui/banner'
import { Button } from '@/shared/ui/button'

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
  blockText: string | null
  action: (state: StartSessionFormState, formData: FormData) => Promise<StartSessionFormState>
}

const INITIAL_STATE: StartSessionFormState = { blockText: null, invalidParticipantIds: [] }

/**
 * S-08 — "Mở phiên tối nay". Copy verbatim từ mockup.
 *
 * Hàng participant Ở SLICE NÀY là `<li>` tĩnh, KHÔNG phải `<button>` toggle
 * như mockup — chưa có gì để toggle cho tới khi E3-T3/T4 (S2) cho thêm
 * participant. `error` trên mỗi hàng vẫn hoạt động đầy đủ ngay từ bây giờ:
 * component nhận mảng participant TỔNG QUÁT, S2 chỉ cần đổi `<li>` này thành
 * `<button>` và thêm khả năng thêm hàng — không viết lại phần lỗi.
 */
export function StartSessionScreen({
  dateCaption,
  participants,
  blockText: initialBlockText,
  action,
}: StartSessionScreenProps): ReactElement {
  const [state, formAction, pending] = useActionState(action, {
    ...INITIAL_STATE,
    blockText: initialBlockText,
  })

  const rows = participants.map((p) => ({
    ...p,
    error: state.invalidParticipantIds.includes(p.userId)
      ? `${p.displayName} đã rời nhóm, không thể tham gia phiên.`
      : null,
  }))

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
                  <span className="pl-1 text-caption font-medium text-danger">{row.error}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-8 pt-4">
        {state.blockText === null ? null : <Banner tone="danger">{state.blockText}</Banner>}

        <form action={formAction}>
          <Button type="submit" pending={pending}>
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
