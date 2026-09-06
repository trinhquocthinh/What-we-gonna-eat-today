import type { SystemTag } from '@/shared/domain/system-tag'

import type { CourseBoundary } from '../../domain/course-deck'

export type { CourseBoundary }

export type CurrentCourseResult = {
  readonly index: number
  readonly total: number
  readonly systemTag: SystemTag
  readonly position: number
  readonly count: number
}

/**
 * Chặng đang đứng và tiến trình trong chặng, suy từ `cursor` phẳng.
 * `courses === null` (chế độ FREE) → `null`, và màn hình dùng tiến trình tổng
 * như E8-T5 đã làm.
 */
export function currentCourse(
  courses: readonly CourseBoundary[] | null,
  cursor: number,
): CurrentCourseResult | null {
  if (courses === null || courses.length === 0 || cursor < 0) {
    return null
  }

  const total = courses.length
  let accumulated = 0

  for (let i = 0; i < total; i++) {
    const boundary = courses[i]
    if (boundary === undefined || boundary.count <= 0) {
      continue
    }

    const courseStart = accumulated
    const courseEnd = accumulated + boundary.count

    if (cursor >= courseStart && cursor < courseEnd) {
      return {
        index: i + 1,
        total,
        systemTag: boundary.systemTag,
        position: cursor - courseStart + 1,
        count: boundary.count,
      }
    }

    accumulated = courseEnd
  }

  return null
}
