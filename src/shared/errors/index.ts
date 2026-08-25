/**
 * SDD §2.5 — bảng mã lỗi. Đây là nguồn sự thật duy nhất; bảng dịch sang thông
 * điệp tiếng Việt là việc của E6-T2 (`shared/errors/messages.ts`).
 *
 * Khai dưới dạng type union chứ không phải mảng `as const`: knip chỉ báo export
 * giá trị không dùng, nên một mảng hằng số sẽ bắt phải nuôi thêm một export chết
 * cho tới khi có đủ use case.
 */
export type ErrorCode =
  | 'ERR_UNAUTHENTICATED'
  | 'ERR_NOT_GROUP_MEMBER'
  | 'ERR_NOT_GROUP_ADMIN'
  | 'ERR_NOT_SESSION_CREATOR'
  | 'ERR_NOT_PARTICIPANT'
  | 'ERR_VALIDATION'
  | 'ERR_INVITE_INVALID'
  | 'ERR_INVITE_ALREADY_USED'
  | 'ERR_ALREADY_GROUP_MEMBER'
  | 'ERR_DISH_ALREADY_IN_POOL'
  | 'ERR_DISH_NOT_IN_POOL'
  | 'ERR_INVALID_SYSTEM_TAG'
  | 'ERR_SESSION_EXISTS_TODAY'
  | 'ERR_SESSION_NOT_DRAFT'
  | 'ERR_SESSION_NOT_ACTIVE'
  | 'ERR_PARTICIPANT_NOT_MEMBER'
  | 'ERR_PARTICIPANT_EXISTS'
  | 'ERR_DUPLICATE_DISH_IN_MEAL'
  | 'ERR_EMPTY_FINAL_MEAL'
  | 'ERR_REQUIRED_RULE_FAILED'
  | 'ERR_DUPLICATE_RULE'
  | 'ERR_INVALID_MINIMUM_COUNT'
  | 'ERR_GROUP_HAS_NO_DISH'

export type Failure = {
  readonly code: ErrorCode
  readonly details?: Record<string, unknown>
}

/**
 * `exactOptionalPropertyTypes` cấm gán `details: undefined`, nên phải rẽ nhánh
 * chứ không viết `{ code, details }` một phát.
 */
export function failure(code: ErrorCode, details?: Record<string, unknown>): Failure {
  return details === undefined ? { code } : { code, details }
}

export { messageFor } from './messages'
