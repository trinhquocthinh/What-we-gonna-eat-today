'use client'

import type { ReactElement } from 'react'
import { useState } from 'react'

import { sendJsonWithRetry } from '@/shared/http/send-json-with-retry'
import { Button } from '@/shared/ui/button'

/** `'LIKE' | 'DISLIKE'` khai lại ở đây thay vì import từ feature `preference`:
 *  `dish` không có chiều cross-feature nào (`ALLOWED_CROSS_FEATURE`), và đây là
 *  hai chuỗi trong hợp đồng HTTP chứ không phải kiến thức miền đi mượn. */
export type DishPreferenceKind = 'LIKE' | 'DISLIKE'

export type DishPreferenceControlsProps = {
  dishName: string
  globalDishId: string
  preference: DishPreferenceKind | null
  cannotEat: boolean
}

/**
 * S-05 — khai báo sở thích cá nhân cho MỘT món (E7-T5 §3.3, hoàn tất ở M3-T6).
 *
 * Ba trạng thái ĐỘC LẬP: `Like`/`Dislike` loại trừ nhau (`null` = chưa đặt,
 * BR-037), còn `Cannot Eat` bật/tắt riêng (BR-034). Một người vừa thích món
 * cá vừa không ăn được nó là vô lý, nhưng một người thích món ăn kèm mà không
 * ăn được thành phần chính thì không — hệ thống không đoán hộ.
 *
 * `Like`/`Dislike` KHÔNG lên thẻ vuốt (BR-043, E7-S3 Guide §1.1): thẻ vuốt nói
 * về HÔM NAY, còn ba nút này là cài đặt lâu dài tác động lên MỌI phiên sau qua
 * số hạng $E$. Bốn hành động trên cùng một thẻ, hai cặp trông giống nhau và có
 * nghĩa khác nhau, là đúng sự nhầm lẫn `BR-043` sinh ra để ngăn.
 *
 * Trạng thái đọc được KHÔNG CẦN MÀU (E6-T6): `aria-pressed` cho trình đọc màn
 * hình, và một dòng chữ tóm tắt cho mắt thường.
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
}: DishPreferenceControlsProps): ReactElement {
  const [currentPreference, setCurrentPreference] = useState(preference)
  const [currentCannotEat, setCurrentCannotEat] = useState(cannotEat)
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

  async function saveConstraint(next: boolean) {
    const previous = currentCannotEat
    setCurrentCannotEat(next)
    setFailed(false)

    const result = await sendJsonWithRetry({
      url: '/api/preferences/constraints',
      method: 'PUT',
      body: { globalDishId, cannotEat: next },
      onStatusChange: () => {},
    })

    if (!result.ok) {
      setCurrentCannotEat(previous)
      setFailed(true)
    }
  }

  const statusText = failed
    ? 'Chưa lưu được — thử lại giúp mình.'
    : currentCannotEat
      ? 'Không ăn được'
      : currentPreference === 'LIKE'
        ? 'Đang thích'
        : currentPreference === 'DISLIKE'
          ? 'Đang không thích'
          : ''

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
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
        <Button
          type="button"
          variant={currentCannotEat ? 'quietAccent' : 'quiet'}
          size="sm"
          aria-pressed={currentCannotEat}
          aria-label={`Không ăn được ${dishName}`}
          onClick={() => void saveConstraint(!currentCannotEat)}
        >
          Không ăn được
        </Button>
      </div>

      {statusText === '' ? null : (
        <span
          role={failed ? 'alert' : undefined}
          className="pl-4 text-caption font-medium text-ink-muted"
        >
          {statusText}
        </span>
      )}
    </div>
  )
}
