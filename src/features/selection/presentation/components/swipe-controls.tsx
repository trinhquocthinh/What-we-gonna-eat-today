'use client'

import type { ReactElement } from 'react'

import { Button } from '@/shared/ui/button'

export type SwipeControlsProps = {
  /** `null` khi deck rỗng — hai nút vuốt và Undo không hiện `aria-label` động. */
  currentDishName: string | null
  canUndo: boolean
  onSwipeLeft: () => void
  onSwipeRight: () => void
  onUndo: () => void
  onFinish: () => void
}

/**
 * Design Criteria §5 — "Cụm 2 nút bấm lớn ở nửa dưới màn hình kèm nút Undo ở
 * giữa (bắt buộc có để hỗ trợ accessibility)." Tách nguyên khối từ
 * `deck-screen.tsx` (E1-T8) — hành vi KHÔNG đổi, chỉ đổi chỗ ở.
 *
 * KHÔNG kéo theo khối "hết deck"/"đã xong lượt" — Design Criteria mô tả đúng
 * ba nút này, không phải toàn bộ thanh điều khiển đáy màn.
 */
export function SwipeControls({
  currentDishName,
  canUndo,
  onSwipeLeft,
  onSwipeRight,
  onUndo,
  onFinish,
}: SwipeControlsProps): ReactElement {
  return (
    <>
      <div className="flex gap-3">
        {/* `flex-1` bù lại `w-full` mà size="lg" đặt trên chính button. */}
        <Button
          type="button"
          variant="no"
          className="flex-1"
          aria-label={
            currentDishName === null ? undefined : `Không muốn ăn ${currentDishName} hôm nay`
          }
          onClick={onSwipeLeft}
        >
          Không hôm nay
        </Button>
        <Button
          type="button"
          variant="yes"
          className="flex-1"
          aria-label={currentDishName === null ? undefined : `Đề xuất ${currentDishName}`}
          onClick={onSwipeRight}
        >
          Đề xuất
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="quiet"
          size="sm"
          className="min-w-11"
          disabled={!canUndo}
          aria-label="Hoàn tác lượt vuốt vừa rồi"
          onClick={onUndo}
        >
          Hoàn tác
        </Button>
      </div>

      <Button
        type="button"
        variant="quiet"
        size="sm"
        aria-label="Tôi chọn xong, dừng vuốt cho lượt này"
        onClick={onFinish}
      >
        Tôi chọn xong
      </Button>
    </>
  )
}
