import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import { collapseDishName, normalizeDishName } from './normalize-name'
import { readSystemTags, type SystemTag } from './system-tag'

/**
 * SPEC-005 — validation của "Thêm Dish". Hàm thuần, không throw, không chạm DB.
 */
export type DishDraft = {
  readonly name: string
  readonly normalizedName: string
  readonly systemTags: readonly SystemTag[]
}

export type DishDraftError = 'NAME_EMPTY' | 'NAME_TOO_LONG' | 'INVALID_SYSTEM_TAG'

const MAX_NAME_LENGTH = 120

export function readDishDraft(input: {
  readonly name: string
  readonly systemTags: readonly string[]
}): Result<DishDraft, DishDraftError> {
  const name = collapseDishName(input.name)

  if (name === '') {
    return err('NAME_EMPTY')
  }

  // Đếm code point chứ không dùng `.length` (đơn vị UTF-16): SPEC-005 nói
  // "1..120", và với tên tiếng Việt hai cách đếm cho ra số khác nhau.
  if (Array.from(name).length > MAX_NAME_LENGTH) {
    return err('NAME_TOO_LONG')
  }

  // Tên trước, tag sau: tên rỗng là lỗi người dùng thấy ngay, tag lạ gần như
  // chỉ tới từ request giả mạo. Thứ tự này giữ nguyên trải nghiệm S-06.
  const systemTags = readSystemTags(input.systemTags)
  if (!systemTags.ok) {
    return err('INVALID_SYSTEM_TAG')
  }

  return ok({ name, normalizedName: normalizeDishName(name), systemTags: systemTags.value })
}
