import type { ErrorCode } from './errors'

/**
 * SDD §2.5 — bảng mã lỗi kèm HTTP status. Chỉ dùng ở Route Handler: Server
 * Action không cần map HTTP status (Next tự lo cơ chế riêng của nó).
 *
 * Tách khỏi `errors.ts` có chủ ý: `errors.ts` định nghĩa LOẠI lỗi, không nên
 * biết về HTTP. File này dùng lại được cho Route Handler khác ở E2+ mà không
 * kéo theo import HTTP vào những chỗ không cần (ví dụ domain/application).
 */
const HTTP_STATUS_BY_ERROR_CODE: Record<ErrorCode, number> = {
  ERR_UNAUTHENTICATED: 401,
  ERR_NOT_GROUP_MEMBER: 403,
  ERR_NOT_GROUP_ADMIN: 403,
  ERR_NOT_SESSION_CREATOR: 403,
  ERR_NOT_PARTICIPANT: 403,
  ERR_VALIDATION: 400,
  ERR_INVITE_INVALID: 400,
  ERR_INVITE_ALREADY_USED: 409,
  ERR_ALREADY_GROUP_MEMBER: 409,
  ERR_DISH_ALREADY_IN_POOL: 409,
  ERR_DISH_NOT_IN_POOL: 409,
  ERR_INVALID_SYSTEM_TAG: 400,
  ERR_SESSION_EXISTS_TODAY: 409,
  ERR_SESSION_NOT_DRAFT: 409,
  ERR_SESSION_NOT_ACTIVE: 409,
  ERR_PARTICIPANT_NOT_MEMBER: 409,
  ERR_PARTICIPANT_EXISTS: 409,
  ERR_DUPLICATE_DISH_IN_MEAL: 400,
  ERR_EMPTY_FINAL_MEAL: 400,
  ERR_REQUIRED_RULE_FAILED: 409,
  ERR_DUPLICATE_RULE: 409,
  ERR_INVALID_MINIMUM_COUNT: 400,
  ERR_GROUP_HAS_NO_DISH: 409,
}

export function httpStatusForErrorCode(code: ErrorCode): number {
  return HTTP_STATUS_BY_ERROR_CODE[code]
}
