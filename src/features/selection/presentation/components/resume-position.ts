import type { DishCard } from '../../domain/dish-card'

/**
 * SPEC-036 — vị trí tiếp tục khi mở lại phiên. Hàm thuần, không phụ thuộc
 * React: nhận mảng thẻ đã có `effectiveInteraction`, trả cursor và `marks`
 * tương ứng.
 *
 * Lấy vị trí SAU thẻ CUỐI CÙNG đã tương tác, không phải vị trí thẻ ĐẦU TIÊN
 * chưa tương tác — Guide §1.4. Undo một thẻ ở giữa để lại một lỗ `null`, và
 * cách thứ hai sẽ kéo người dùng lùi về cái lỗ đó rồi bắt vuốt lại toàn bộ
 * phần đuôi.
 *
 * `marks` sinh cho ĐÚNG tiền tố `[0, cursor)`, đúng bất biến mà `deck-screen`
 * dựa vào: `marks.length === cursor`.
 *
 * Thẻ nào trong tiền tố có `effectiveInteraction === null` (đã Undo) được
 * đánh `'cannot'`: nó là giá trị duy nhất trong ba giá trị không góp vào
 * `yesCount` lẫn `noCount` (DEC-065).
 */
export function resumePosition(dishes: readonly DishCard[]): {
  readonly cursor: number
  readonly marks: Array<'yes' | 'no' | 'cannot'>
} {
  let lastInteractedIndex = -1
  for (let i = dishes.length - 1; i >= 0; i--) {
    const dish = dishes[i]
    if (dish !== undefined && dish.effectiveInteraction !== null) {
      lastInteractedIndex = i
      break
    }
  }

  if (lastInteractedIndex === -1) {
    return {
      cursor: 0,
      marks: [],
    }
  }

  const cursor = lastInteractedIndex + 1
  const marks: Array<'yes' | 'no' | 'cannot'> = []

  for (let i = 0; i < cursor; i++) {
    const dish = dishes[i]
    if (dish?.effectiveInteraction === 'SWIPE_RIGHT') {
      marks.push('yes')
    } else if (dish?.effectiveInteraction === 'SWIPE_LEFT') {
      marks.push('no')
    } else {
      // Lỗ Undo ở giữa: dùng 'cannot' để không tính vào yesCount hay noCount (DEC-065)
      marks.push('cannot')
    }
  }

  return {
    cursor,
    marks,
  }
}
