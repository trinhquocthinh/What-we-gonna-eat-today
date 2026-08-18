import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import { collapseDishName, normalizeDishName } from './normalize-name'

/**
 * SPEC-005 — validation của "Thêm Dish". Hàm thuần, không throw, không chạm DB.
 *
 * `systemTags` CỐ Ý chưa có: E2-T5. Thêm vào đây khi tới đó, không tạo draft
 * thứ hai.
 */
export type DishDraft = {
  readonly name: string
  readonly normalizedName: string
}

export type DishDraftError = 'NAME_EMPTY' | 'NAME_TOO_LONG'

const MAX_NAME_LENGTH = 120

export function readDishDraft(input: { readonly name: string }): Result<DishDraft, DishDraftError> {
  const name = collapseDishName(input.name)

  if (name === '') {
    return err('NAME_EMPTY')
  }

  // Đếm code point chứ không dùng `.length` (đơn vị UTF-16): SPEC-005 nói
  // "1..120", và với tên tiếng Việt hai cách đếm cho ra số khác nhau.
  if (Array.from(name).length > MAX_NAME_LENGTH) {
    return err('NAME_TOO_LONG')
  }

  return ok({ name, normalizedName: normalizeDishName(name) })
}
