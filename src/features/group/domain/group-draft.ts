import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'
import { canonicalTimeZone } from '@/shared/time/time-zone'

/**
 * SPEC-002 — validation của "Tạo Group". Hàm thuần, không throw, không chạm DB.
 */
export type GroupDraft = {
  readonly name: string
  readonly timezone: string
}

export type GroupDraftError = 'NAME_EMPTY' | 'NAME_TOO_LONG' | 'TIMEZONE_INVALID'

const MAX_NAME_LENGTH = 60

export function readGroupDraft(input: {
  readonly name: string
  readonly timezone: string
}): Result<GroupDraft, GroupDraftError> {
  // NFC trước khi trim: 'Nhà' gõ bằng dấu tổ hợp và bằng ký tự dựng sẵn phải là
  // cùng một tên nhóm.
  const name = input.name.normalize('NFC').trim()

  if (name === '') {
    return err('NAME_EMPTY')
  }

  // Đếm code point chứ không dùng `.length` (đơn vị UTF-16): SPEC-002 nói "1..60",
  // và với tên tiếng Việt hai cách đếm cho ra số khác nhau.
  if (Array.from(name).length > MAX_NAME_LENGTH) {
    return err('NAME_TOO_LONG')
  }

  // Ghi dạng canonical để mọi trình duyệt lưu cùng một chuỗi cho cùng múi giờ.
  const timezone = canonicalTimeZone(input.timezone)
  if (timezone === null) {
    return err('TIMEZONE_INVALID')
  }

  return ok({ name, timezone })
}
