import type { SystemTag } from '@/shared/domain/system-tag'

/**
 * Nhãn tiếng Việt cho SystemTag.
 *
 * Chuyển lên shared/ui theo DEC-048 vì nhiều feature cần dùng (dish, meal).
 */
/**
 * BR-003 định nghĩa `STAPLE` là "Món tinh bột / Cơm, bún" — KHÔNG phải riêng
 * cơm. Nhãn cũ `'Cơm'` làm một tag đúng chuẩn trông như sai: "Bún chả" mang
 * tag STAPLE hiện ra chữ "Cơm". Liệt kê ví dụ thay vì dùng từ "tinh bột" vì
 * đây là app cho người nhà đọc, không phải bảng phân loại dinh dưỡng.
 *
 * Nhãn này chứa dấu `·`, nên chỗ nào nối NHIỀU nhãn phải dùng dấu khác
 * (` + `) — xem `add-dish-sheet.tsx` và `finalize-meal-screen.tsx`.
 */
export const SYSTEM_TAG_LABELS: Record<SystemTag, string> = {
  STAPLE: 'Cơm · Bún · Phở',
  MAIN: 'Món mặn',
  SIDE: 'Món phụ',
  SOUP: 'Canh',
  DESSERT: 'Tráng miệng',
}

/** Nhãn dùng TRONG CÂU, viết thường — "Phải có ít nhất 1 món canh". Khác
 *  `SYSTEM_TAG_LABELS` (nhãn đứng một mình trên chip, viết hoa đầu). */
export const TAG_IN_SENTENCE: Record<SystemTag, string> = {
  STAPLE: 'món cơm/bún',
  MAIN: 'món mặn',
  SIDE: 'món phụ',
  SOUP: 'món canh',
  DESSERT: 'món tráng miệng',
}

/** "1 món canh" — mảnh dùng trong dòng "Còn thiếu: …" ở S4 (E5-T9) và bảng mã lỗi E6-T2. */
export function ruleShortfallPhrase(shortfall: { systemTag: SystemTag; missing: number }): string {
  return `${shortfall.missing} ${TAG_IN_SENTENCE[shortfall.systemTag]}`
}
