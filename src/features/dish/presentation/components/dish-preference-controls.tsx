'use client'

import type { ReactElement } from 'react'
import { useState } from 'react'

import { sendJsonWithRetry } from '@/shared/http/send-json-with-retry'
import { Button } from '@/shared/ui/button'

import type { ConstraintFlags, DishConstraintKind, DishPreferenceKind } from './constraint-status'
import { constraintStatusText } from './constraint-status'

export type { DishPreferenceKind }

export type DishPreferenceControlsProps = {
  dishName: string
  globalDishId: string
  preference: DishPreferenceKind | null
  cannotEat: boolean
  blacklisted: boolean
  historyWhitelisted: boolean
}

/** Nhãn + mô tả cho trình đọc màn hình, cùng thứ tự với hàng nút. */
const CONSTRAINT_BUTTONS: readonly (readonly [DishConstraintKind, string])[] = [
  ['CANNOT_EAT', 'Không ăn được'],
  ['BLACKLIST', 'Đừng gợi ý'],
  ['HISTORY_WHITELIST', 'Ăn hoài không chán'],
]

/**
 * S-05 — khai báo sở thích cá nhân cho MỘT món (E7-T5 §3.3, M3-T6, mở rộng ở E13-T7).
 *
 * NĂM nút, chia HAI HÀNG CÓ NHÃN, và ranh giới giữa hai hàng là ranh giới thật
 * của hệ thống chứ không phải trang trí:
 *
 * - Hàng trên (`BR-037`) cộng/trừ số hạng $E$ trong Personal Score. `Like` và
 *   `Dislike` loại trừ nhau; `null` = chưa đặt.
 * - Hàng dưới (`BR-034`/`BR-035`/`BR-036`) là ba cờ ĐỘC LẬP với hệ quả khác hẳn
 *   nhau: `Cannot Eat` lọc cứng VÀ xoá lượt vuốt đang có; `Blacklist` lọc cứng
 *   NHƯNG giữ nguyên lượt vuốt; `History Whitelist` không lọc, không cộng điểm,
 *   chỉ ép $R = 0$.
 *
 * Năm nút trên một hàng `flex-wrap` sẽ xuống dòng theo bề rộng máy, và chỗ ngắt
 * rơi vào giữa hai nhóm — tuỳ thiết bị. Hai hàng làm ranh giới ấy cố định.
 *
 * "Ăn hoài không chán" chứ KHÔNG phải "Luôn gợi ý": nhãn thứ hai hứa sai.
 * `SPEC-039` nói rõ Whitelist chỉ gỡ một hình phạt — món phở của người ngày nào
 * ăn cũng được thôi bị Cooldown đẩy xuống, nhưng cũng không vì thế mà nhảy lên
 * đầu deck.
 *
 * `Like`/`Dislike` KHÔNG lên thẻ vuốt (BR-043, E7-S3 Guide §1.1): thẻ vuốt nói
 * về HÔM NAY, còn năm nút này là cài đặt lâu dài tác động lên MỌI phiên sau.
 *
 * Trạng thái đọc được KHÔNG CẦN MÀU (E6-T6): `aria-pressed` cho trình đọc màn
 * hình, và `constraintStatusText` cho mắt thường.
 *
 * Ghi lạc quan nhưng KHÔNG nuốt lỗi: thất bại thì trả trạng thái về giá trị cũ
 * và nói ra. Một khai báo "tôi không ăn được món này" biến mất trong im lặng là
 * đúng rủi ro `R-05` mà `E7` tồn tại để đóng.
 */
export function DishPreferenceControls({
  dishName,
  globalDishId,
  preference,
  cannotEat,
  blacklisted,
  historyWhitelisted,
}: DishPreferenceControlsProps): ReactElement {
  const [currentPreference, setCurrentPreference] = useState(preference)
  const [flags, setFlags] = useState<ConstraintFlags>({
    CANNOT_EAT: cannotEat,
    BLACKLIST: blacklisted,
    HISTORY_WHITELIST: historyWhitelisted,
  })
  const [failed, setFailed] = useState(false)

  async function savePreference(next: DishPreferenceKind | null) {
    const previous = currentPreference
    setCurrentPreference(next)
    setFailed(false)

    const result = await sendJsonWithRetry({
      url: '/api/preferences/preferences',
      method: 'PUT',
      body: { globalDishId, kind: next },
      onStatusChange: () => {},
    })

    if (!result.ok) {
      setCurrentPreference(previous)
      setFailed(true)
    }
  }

  /**
   * MỘT handler cho cả ba cờ. Ba bản sao gần trùng sẽ đụng `yarn dup`, và gộp
   * cũng là cách duy nhất để phần rollback lạc quan không phải viết ba lần.
   */
  async function saveConstraint(kind: DishConstraintKind, next: boolean) {
    const previous = flags
    setFlags({ ...previous, [kind]: next })
    setFailed(false)

    const result = await sendJsonWithRetry({
      url: '/api/preferences/constraints',
      method: 'PUT',
      body: { globalDishId, kind, enabled: next },
      onStatusChange: () => {},
    })

    if (!result.ok) {
      setFlags(previous)
      setFailed(true)
    }
  }

  const statusText = failed
    ? 'Chưa lưu được — thử lại giúp mình.'
    : constraintStatusText({ preference: currentPreference, flags })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <span className="w-full text-caption font-medium text-ink-muted sm:w-auto sm:pr-1">
          Sở thích
        </span>
        <Button
          type="button"
          variant={currentPreference === 'LIKE' ? 'quietAccent' : 'quiet'}
          size="sm"
          aria-pressed={currentPreference === 'LIKE'}
          aria-label={`Thích ${dishName}`}
          onClick={() => void savePreference(currentPreference === 'LIKE' ? null : 'LIKE')}
        >
          Thích
        </Button>
        <Button
          type="button"
          variant={currentPreference === 'DISLIKE' ? 'quietAccent' : 'quiet'}
          size="sm"
          aria-pressed={currentPreference === 'DISLIKE'}
          aria-label={`Không thích ${dishName}`}
          onClick={() => void savePreference(currentPreference === 'DISLIKE' ? null : 'DISLIKE')}
        >
          Không thích
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="w-full text-caption font-medium text-ink-muted sm:w-auto sm:pr-1">
          Gợi ý
        </span>
        {CONSTRAINT_BUTTONS.map(([kind, label]) => (
          <Button
            key={kind}
            type="button"
            variant={flags[kind] ? 'quietAccent' : 'quiet'}
            size="sm"
            aria-pressed={flags[kind]}
            aria-label={`${label} — ${dishName}`}
            onClick={() => void saveConstraint(kind, !flags[kind])}
          >
            {label}
          </Button>
        ))}
      </div>

      {statusText === '' ? null : (
        <span
          role={failed ? 'alert' : undefined}
          className="pl-1 text-caption font-medium text-ink-muted"
        >
          {statusText}
        </span>
      )}
    </div>
  )
}
