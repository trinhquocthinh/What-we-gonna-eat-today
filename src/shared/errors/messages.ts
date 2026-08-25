import type { SystemTag } from '@/shared/domain/system-tag'
import { ruleShortfallPhrase } from '@/shared/ui/system-tag-label'
import type { ErrorCode, Failure } from './index'

/**
 * SDD §2.5 — BẢNG TRA DUY NHẤT từ mã lỗi sang tiếng Việt. Trước slice này có
 * SÁU bảng rải ở `app/**\/actions.ts`, mỗi bảng biết một phần và không bảng nào
 * biết đủ.
 *
 * `satisfies Record<ErrorCode, string>` là ràng buộc quan trọng nhất ở đây:
 * thêm một mã vào `ErrorCode` mà quên dịch thì `tsc` đỏ ngay, chứ không phải
 * người dùng gặp một chuỗi tiếng Anh giữa màn hình rồi mới biết.
 *
 * Giọng văn — theo Design Criteria §2, và đây là hợp đồng, không phải gu:
 * - Nói với người dùng, không nói về hệ thống. "Món này đã có trong danh mục
 *   rồi." chứ không "Vi phạm ràng buộc duy nhất."
 * - Nêu VIỆC CẦN LÀM TIẾP khi có. "Nhập tên món trước đã." chứ không "Tên món
 *   không hợp lệ."
 * - Không xin lỗi, không đổ lỗi, không dấu chấm than.
 */
const BASE_MESSAGES = {
  ERR_UNAUTHENTICATED: 'Bạn cần đăng nhập lại.',
  ERR_NOT_GROUP_MEMBER: 'Bạn không ở trong nhóm này.',
  ERR_NOT_GROUP_ADMIN: 'Chỉ người quản lý nhóm mới làm được việc này.',
  ERR_NOT_SESSION_CREATOR: 'Chỉ người mở phiên mới làm được việc này.',
  ERR_NOT_PARTICIPANT: 'Bạn chưa được thêm vào phiên này.',
  ERR_VALIDATION: 'Kiểm tra lại thông tin vừa nhập giúp mình.',
  ERR_INVITE_INVALID: 'Link mời không còn hiệu lực.',
  ERR_INVITE_ALREADY_USED: 'Link mời này đã được dùng rồi.',
  ERR_ALREADY_GROUP_MEMBER: 'Bạn đã ở trong nhóm này rồi.',
  ERR_DISH_ALREADY_IN_POOL: 'Món này đã có trong danh mục rồi.',
  ERR_DISH_NOT_IN_POOL: 'Có món vừa bị gỡ khỏi nhóm. Chọn lại giúp mình.',
  ERR_INVALID_SYSTEM_TAG: 'Chọn một nhãn để quy định bữa ăn kiểm tra được.',
  ERR_SESSION_EXISTS_TODAY: 'Hôm nay nhà mình đã có một phiên rồi.',
  ERR_SESSION_NOT_DRAFT: 'Phiên này đã bắt đầu rồi.',
  ERR_SESSION_NOT_ACTIVE: 'Bữa này chốt rồi.',
  ERR_PARTICIPANT_NOT_MEMBER: 'Bỏ những người đã rời nhóm ra trước khi bắt đầu.',
  ERR_PARTICIPANT_EXISTS: 'Người này đã có trong phiên rồi.',
  ERR_DUPLICATE_DISH_IN_MEAL: 'Mỗi món chỉ chọn được một lần.',
  ERR_EMPTY_FINAL_MEAL: 'Chọn ít nhất một món trước đã.',
  ERR_REQUIRED_RULE_FAILED: 'Mâm cơm còn thiếu món bắt buộc.',
  ERR_DUPLICATE_RULE: 'Mỗi nhãn chỉ đặt được một quy định.',
  ERR_INVALID_MINIMUM_COUNT: 'Số lượng phải từ 1 trở lên.',
} satisfies Record<ErrorCode, string>

/**
 * Câu cụ thể theo `details.field`. Chỉ chứa những field mà một câu chung
 * KHÔNG đủ tử tế — không phải mọi field đều cần mặt ở đây.
 *
 * `dishName`/`groupName` chứ không phải `name` cho cả hai: xem Guide §1.3.
 */
const VALIDATION_MESSAGES: Record<string, string> = {
  dishName: 'Nhập tên món trước đã.',
  groupName: 'Đặt tên để cả nhà nhận ra nhóm.',
}

type RuleShortfall = { systemTag: SystemTag; missing: number }

/**
 * "Còn thiếu 1 món canh." / "Còn thiếu 1 món mặn và 1 món canh."
 *
 * `details.shortfalls` do `finalizeSession` gắn vào (E5-S3) đúng để câu này
 * nói được thiếu GÌ. Nếu `details` không có nó — ví dụ lỗi tới từ một đường
 * chưa cập nhật — rơi về câu chung của bảng, không throw.
 */
function requiredRuleMessage(details: Record<string, unknown> | undefined): string {
  const shortfalls = details?.['shortfalls']
  if (!Array.isArray(shortfalls) || shortfalls.length === 0) {
    return BASE_MESSAGES.ERR_REQUIRED_RULE_FAILED
  }

  const phrases = (shortfalls as RuleShortfall[]).map(ruleShortfallPhrase)
  const joined =
    phrases.length === 1 ? phrases[0] : `${phrases.slice(0, -1).join(', ')} và ${phrases.at(-1)}`

  return `Còn thiếu ${joined}.`
}

/** SDD §2.5 — điểm vào DUY NHẤT. Mọi `actions.ts` gọi hàm này, không hàm nào
 *  tự viết câu tiếng Việt của riêng mình nữa. */
export function messageFor(failure: Failure): string {
  if (failure.code === 'ERR_REQUIRED_RULE_FAILED') {
    return requiredRuleMessage(failure.details)
  }

  if (failure.code === 'ERR_VALIDATION') {
    const field = failure.details?.['field']
    if (typeof field === 'string' && field in VALIDATION_MESSAGES) {
      return VALIDATION_MESSAGES[field] ?? BASE_MESSAGES.ERR_VALIDATION
    }
  }

  return BASE_MESSAGES[failure.code]
}
