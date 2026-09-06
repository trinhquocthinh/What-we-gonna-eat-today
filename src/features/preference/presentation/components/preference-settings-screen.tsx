'use client'

import type { ReactElement } from 'react'
import { useState } from 'react'

import { sendJsonWithRetry } from '@/shared/http/send-json-with-retry'
import { formatVietnameseDate } from '@/shared/time/format-vietnamese-date'
import { Button } from '@/shared/ui/button'
import { InlineError } from '@/shared/ui/inline-error'

export type PreferenceSettingsScreenProps = {
  readonly groupName: string
  /** ISO timestamp của lần Quên gần nhất; `null` = chưa bấm bao giờ. */
  readonly initialImplicitResetAt: string | null
}

/**
 * S-13 — cài đặt cá nhân. `SPEC-040` "Quên sở thích đã học" (`F39`, `BR-038`,
 * `BR-061`).
 *
 * XÁC NHẬN HAI NHỊP TRÊN CHÍNH NÚT, khuôn `armed` của `finalize-bar.tsx`.
 * KHÔNG modal — `design-invariants.test.ts` chỉ cho `shared/ui/sheet.tsx` mở
 * hộp thoại, và một hộp thoại cho một hành động đảo được bằng vài ngày dùng
 * tiếp là nhiều hơn mức cần.
 *
 * Khác `finalize-bar` đúng một điểm: đây là `type="button"` gọi `fetch`, không
 * phải `type="submit"` trong `<form>`, nên nhịp 1 chỉ `setArmed(true)` — không
 * cần `e.preventDefault()`.
 *
 * Nhãn nút ở nhịp 2 nói ra HỆ QUẢ chứ không hỏi "bạn có chắc không": câu hỏi ấy
 * không thêm thông tin nào, còn "có hiệu lực từ phiên sau" thì có.
 *
 * Tầng `presentation/components` không import được `application/` hay
 * `shared/db` (ESLint). Mốc hiện tại vào qua props, và component tự gọi Route
 * Handler — đúng khuôn `DishPreferenceControls`, không phải ngoại lệ.
 */
export function PreferenceSettingsScreen({
  groupName,
  initialImplicitResetAt,
}: PreferenceSettingsScreenProps): ReactElement {
  const [resetAt, setResetAt] = useState(initialImplicitResetAt)
  const [armed, setArmed] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (!armed) {
      setArmed(true)
      return
    }

    setPending(true)
    setError(null)

    const result = await sendJsonWithRetry<{ implicitResetAt: string }>({
      url: '/api/preferences/implicit-reset',
      method: 'POST',
      body: {},
      onStatusChange: () => {},
    })

    setPending(false)
    setArmed(false)

    if (result.ok) {
      setResetAt(result.data.implicitResetAt)
    } else {
      setError('Chưa quên được — thử lại giúp mình.')
    }
  }

  let buttonLabel = 'Quên sở thích đã học'
  if (pending) {
    buttonLabel = 'Đang quên…'
  } else if (armed) {
    buttonLabel = 'Chắc chắn quên · có hiệu lực từ phiên sau'
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex flex-col gap-3 px-4 pb-3 pt-6">
        <span className="text-caption font-medium text-ink-muted">{groupName}</span>
        <h1 className="text-title font-semibold text-ink">Sở thích của bạn</h1>
      </header>

      <div className="flex flex-col gap-4 px-4 pb-10">
        <section className="flex flex-col gap-3 rounded-control border border-border bg-surface-raised p-4">
          <h2 className="text-subtitle font-semibold text-ink">Sở thích hệ thống tự học</h2>

          <p className="text-body text-ink-muted">
            Mỗi lần cả nhà chốt xong một bữa, hệ thống nhìn lại những món bạn đã vuốt để đoán khẩu
            vị và xếp deck lần sau. Bấm nút dưới đây nếu bạn muốn nó quên hết và học lại từ đầu.
          </p>

          {/* SPEC-040 — màn hình PHẢI nói ra hai điều này. Ranh giới giữa thứ
              người dùng KHAI và thứ hệ thống SUY RA là toàn bộ ý nghĩa của nút. */}
          <ul className="flex flex-col gap-2">
            <li className="border-l-2 border-yes pl-3 text-caption text-ink-muted">
              Những gì bạn tự tay khai vẫn giữ nguyên: Thích, Không thích, Không ăn được, Đừng gợi
              ý, Ăn hoài không chán.
            </li>
            <li className="border-l-2 border-border-strong pl-3 text-caption text-ink-muted">
              Phiên đang mở không đổi thứ tự thẻ. Thay đổi bắt đầu từ phiên kế tiếp.
            </li>
          </ul>

          {resetAt === null ? null : (
            <p className="text-caption font-medium text-ink-muted">
              Lần quên gần nhất: {formatVietnameseDate(resetAt.slice(0, 10))}
            </p>
          )}

          <InlineError message={error} size="body" />

          {/* Nhịp 1 chỉ đổi nhãn; nhịp 2 mới gọi API. Không modal (E5-T9 DoD). */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="self-start"
            pending={pending}
            onClick={() => void handleClick()}
          >
            {buttonLabel}
          </Button>
        </section>
      </div>
    </main>
  )
}
