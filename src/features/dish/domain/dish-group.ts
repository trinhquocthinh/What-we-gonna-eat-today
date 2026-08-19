import type { SystemTag } from './system-tag'
import { SYSTEM_TAGS } from './system-tag'

export type TaggedDish = {
  readonly id: string
  readonly name: string
  readonly systemTags: readonly SystemTag[]
}

/** `tag: null` là nhóm cuối — món chưa gắn nhãn nào. */
export type DishGroup<T extends TaggedDish> = {
  readonly tag: SystemTag | null
  readonly dishes: readonly T[]
}

/**
 * Nhóm món theo nhãn hệ thống, đúng thứ tự `SYSTEM_TAGS` (Cơm → Món mặn →
 * Món phụ → Canh → Tráng miệng). Nhóm rỗng bị loại, đúng mockup
 * (`.filter(g => g.items.length)`).
 *
 * MỘT MÓN NHIỀU NHÃN THÌ XUẤT HIỆN Ở NHIỀU NHÓM. Đây là chủ ý, khớp nguyên tắc
 * "Independent Tag Counting" của SDD §8: món mang cả `MAIN` lẫn `SOUP` đóng góp
 * độc lập cho cả hai quy định, nên nó cũng phải NHÌN THẤY được ở cả hai chỗ.
 * Hệ quả: tổng số đếm của các nhóm có thể LỚN HƠN số ở header. Không phải lỗi.
 */
export function groupDishesByTag<T extends TaggedDish>(dishes: readonly T[]): DishGroup<T>[] {
  const groups: DishGroup<T>[] = []

  for (const tag of SYSTEM_TAGS) {
    const inTag = dishes.filter((dish) => dish.systemTags.includes(tag))
    if (inTag.length > 0) {
      groups.push({ tag, dishes: inTag })
    }
  }

  const untagged = dishes.filter((dish) => dish.systemTags.length === 0)
  if (untagged.length > 0) {
    groups.push({ tag: null, dishes: untagged })
  }

  return groups
}
