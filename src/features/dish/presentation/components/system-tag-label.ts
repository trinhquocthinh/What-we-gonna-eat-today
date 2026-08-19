import type { SystemTag } from '../../domain/system-tag'

/**
 * Nhãn tiếng Việt, lấy nguyên văn mockup S-05/S-06
 * (`designs/S-05 S-06 Danh muc mon.dc.html:164`).
 *
 * Nằm ở presentation vì đây là CHỮ HIỂN THỊ; còn THỨ TỰ nằm ở
 * `domain/system-tag.ts` (`SYSTEM_TAGS`) vì đó là thứ tự mâm cơm, không phải
 * thẩm mỹ. E6-T2 gom mọi chuỗi tiếng Việt về một chỗ thì mang cả file này đi.
 */
export const SYSTEM_TAG_LABELS: Record<SystemTag, string> = {
  STAPLE: 'Cơm',
  MAIN: 'Món mặn',
  SIDE: 'Món phụ',
  SOUP: 'Canh',
  DESSERT: 'Tráng miệng',
}
