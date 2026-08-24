import type { SystemTag } from '@/shared/domain/system-tag'

/**
 * Nhãn tiếng Việt cho SystemTag.
 *
 * Chuyển lên shared/ui theo DEC-048 vì nhiều feature cần dùng (dish, meal).
 */
export const SYSTEM_TAG_LABELS: Record<SystemTag, string> = {
  STAPLE: 'Cơm',
  MAIN: 'Món mặn',
  SIDE: 'Món phụ',
  SOUP: 'Canh',
  DESSERT: 'Tráng miệng',
}
