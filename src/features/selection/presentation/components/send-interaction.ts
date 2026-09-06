import { sendJsonWithRetry, type SendStatus } from '@/shared/http/send-json-with-retry'

import type { InteractionAction, InteractionType } from '../../domain/interaction'

export type SendInteractionStatus = SendStatus

export type SendInteractionResult =
  { ok: true; effectiveInteraction: InteractionType | null } | { ok: false }

/**
 * Gửi một lượt vuốt tới Route Handler. Vòng retry nằm ở
 * `shared/http/send-json-with-retry` từ M3-T7 — hàm này chỉ còn giữ phần RIÊNG
 * của lượt vuốt: đường dẫn, và `clientTimestamp`.
 *
 * `clientTimestamp` capture MỘT LẦN, TRƯỚC vòng retry — mọi lần thử lại gửi lại
 * ĐÚNG mốc thời gian gốc. Retry là gửi lại CÙNG một hành động đã xảy ra, không
 * phải tạo ra một hành động mới mỗi lần thử: nếu mỗi lần retry tự lấy
 * `new Date()` mới, một request bị delay 4 giây (qua cả 3 lần retry) sẽ tự báo
 * cáo thời điểm SAI, làm hỏng chính cơ chế mà E4-T5 vừa dựng. Đây là lý do
 * hàm này không tan hẳn vào hàm dùng chung.
 */
export async function sendInteractionWithRetry(
  sessionId: string,
  input: { dishId: string; action: InteractionAction },
  onStatusChange: (status: SendInteractionStatus) => void,
): Promise<SendInteractionResult> {
  const clientTimestamp = new Date().toISOString()

  const result = await sendJsonWithRetry<{ effectiveInteraction: InteractionType | null }>({
    url: `/api/sessions/${sessionId}/interactions`,
    method: 'POST',
    body: { ...input, clientTimestamp },
    onStatusChange,
  })

  return result.ok
    ? { ok: true, effectiveInteraction: result.data.effectiveInteraction }
    : { ok: false }
}
