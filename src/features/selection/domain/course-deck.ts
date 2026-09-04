import type { SystemTag } from '@/shared/domain/system-tag'

export type CourseDeck = {
  readonly systemTag: SystemTag
  readonly dishIds: readonly string[]
}

export type CourseBoundary = {
  readonly systemTag: SystemTag
  /** Số thẻ của chặng này trong mảng phẳng. */
  readonly count: number
}

/**
 * SPEC-030 — Tìm chặng đầu tiên khớp với một trong các tag của món
 * theo thứ tự Creator sắp xếp (S1 §1.5).
 */
export function findMatchingCourse(
  dishTags: readonly SystemTag[],
  courses: readonly SystemTag[],
): SystemTag | null {
  for (const course of courses) {
    if (dishTags.includes(course)) {
      return course
    }
  }
  return null
}

/**
 * SPEC-030 + BR-063 — chia danh sách đã sắp thành các chặng, cắt hạn mức
 * TRONG TỪNG CHẶNG.
 *
 * Cắt theo chặng chứ không cắt chung rồi chia (Guide §1.2): top-30 của một
 * nhóm vừa ăn canh hôm qua có thể không còn món canh nào, và chặng Canh sẽ
 * rỗng dù danh mục có 15 món.
 *
 * Món mang nhiều tag vào ĐÚNG MỘT chặng — chặng đầu tiên khớp theo thứ tự
 * Creator sắp (§1.5). Hai chặng cùng chứa một món nghĩa là người dùng vuốt nó
 * hai lần và P của BR-049 bị đếm trùng.
 *
 * Món không khớp chặng nào (tag không nằm trong danh sách chặng, hoặc chưa
 * gắn tag) bị LOẠI KHỎI DECK ở chế độ COURSE.
 */
export function splitIntoCourses(input: {
  /** Đã sắp theo Personal Score, chưa trộn Explore, chưa cắt trần. */
  readonly orderedDishIds: readonly string[]
  readonly tagsByDishId: ReadonlyMap<string, readonly SystemTag[]>
  /** Thứ tự Creator sắp. */
  readonly courses: readonly SystemTag[]
  readonly maxCards: number
}): CourseDeck[] {
  const { orderedDishIds, tagsByDishId, courses, maxCards } = input

  if (courses.length === 0 || maxCards <= 0) {
    return []
  }

  // 1. Gom món vào từng chặng theo quy tắc "chặng đầu tiên khớp",
  // giữ nguyên thứ tự tương đối từ orderedDishIds.
  const groupedByCourse = new Map<SystemTag, string[]>()
  for (const course of courses) {
    groupedByCourse.set(course, [])
  }

  for (const dishId of orderedDishIds) {
    const tags = tagsByDishId.get(dishId) ?? []
    const matchingCourse = findMatchingCourse(tags, courses)
    if (matchingCourse !== null) {
      groupedByCourse.get(matchingCourse)!.push(dishId)
    }
  }

  // 2. Phân bổ hạn mức (iterative redistribution)
  const n = courses.length
  const available = courses.map((course) => groupedByCourse.get(course)!.length)
  const quotas = new Array<number>(n).fill(0)

  const baseQuota = Math.floor(maxCards / n)
  const baseRemainder = maxCards % n
  for (let i = 0; i < n; i += 1) {
    quotas[i] = baseQuota + (i < baseRemainder ? 1 : 0)
  }

  const capped = new Array<boolean>(n).fill(false)

  // Vòng lặp phân bổ lại phần dư
  while (true) {
    let surplus = 0
    let newlyCapped = false

    for (let i = 0; i < n; i += 1) {
      if (!capped[i] && available[i]! < quotas[i]!) {
        surplus += quotas[i]! - available[i]!
        quotas[i] = available[i]!
        capped[i] = true
        newlyCapped = true
      }
    }

    if (surplus === 0 && !newlyCapped) {
      break
    }

    let uncappedCount = 0
    for (let i = 0; i < n; i += 1) {
      if (!capped[i]) {
        uncappedCount += 1
      }
    }

    if (uncappedCount === 0 || surplus === 0) {
      break
    }

    const extraPerCourse = Math.floor(surplus / uncappedCount)
    const extraRemainder = surplus % uncappedCount

    let uncappedIndex = 0
    for (let i = 0; i < n; i += 1) {
      if (!capped[i]) {
        const extra = extraPerCourse + (uncappedIndex < extraRemainder ? 1 : 0)
        quotas[i] = (quotas[i] ?? 0) + extra
        uncappedIndex += 1
      }
    }
  }

  // 3. Cắt theo hạn mức cho từng chặng
  return courses.map((course, index) => ({
    systemTag: course,
    dishIds: (groupedByCourse.get(course) ?? []).slice(0, quotas[index] ?? 0),
  }))
}

/**
 * M3-T4 — Suy ranh giới chặng từ THỨ TỰ ĐÃ ĐÔNG CỨNG, không phải từ tag hiện tại.
 *
 * Thứ tự phẳng của deck nằm trong `session_decks` và không đổi nữa (`BR-048`);
 * System Tag của món thì Admin sửa được bất cứ lúc nào. Bản trước đếm ranh giới
 * bằng `findMatchingCourse` trên tag hiện tại, nên sửa nhãn giữa phiên phá vỡ
 * bất biến mà `currentCourse` dựa vào — tổng các `count` không còn bằng số thẻ,
 * và món mất hết nhãn thì rơi ra khỏi mọi chặng, kéo tiêu đề chặng biến mất
 * giữa deck.
 *
 * Ở đây con trỏ chặng CHỈ TIẾN, không lùi: mỗi thẻ thuộc đúng một chặng, các
 * chặng luôn liền khối, và tổng luôn bằng `orderedDishTags.length`. Thẻ không
 * khớp chặng nào — hoặc khớp một chặng đã đi qua — nằm lại chặng đang mở, đúng
 * vị trí vật lý của nó trong deck.
 *
 * Tag không đổi (trường hợp thường) cho kết quả y hệt cách đếm cũ.
 */
export function deriveCourseBoundaries(input: {
  /** Tag hiện tại của từng thẻ, theo đúng thứ tự đã đông cứng của deck. */
  readonly orderedDishTags: readonly (readonly SystemTag[])[]
  /** Thứ tự Creator sắp. */
  readonly courses: readonly SystemTag[]
}): CourseBoundary[] {
  const { orderedDishTags, courses } = input

  if (courses.length === 0) {
    return []
  }

  const counts = new Array<number>(courses.length).fill(0)
  let current = 0

  for (const tags of orderedDishTags) {
    const match = findMatchingCourse(tags, courses)
    const index = match === null ? -1 : courses.indexOf(match)
    if (index > current) {
      current = index
    }
    counts[current] = (counts[current] ?? 0) + 1
  }

  return courses.map((systemTag, index) => ({ systemTag, count: counts[index] ?? 0 }))
}
