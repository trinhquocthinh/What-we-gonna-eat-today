import type { InteractionAction, InteractionType } from '../../domain/interaction'

export type SendInteractionStatus = 'idle' | 'retrying' | 'failed'

/** NFR-05: 3 lần retry, backoff 1s/2s/4s. Chưa có đặc tả số chính xác — đây
 *  là lựa chọn hợp lý cho quy mô <10 người dùng, không phải hằng số bất biến. */
const RETRY_DELAYS_MS = [1000, 2000, 4000]

export type SendInteractionResult =
  { ok: true; effectiveInteraction: InteractionType | null } | { ok: false }

/**
 * Gửi một lượt vuốt tới Route Handler, tự retry khi lỗi MẠNG (không retry lỗi
 * 4xx — đó là lỗi logic/quyền, gửi lại không giúp gì). Gọi `onStatusChange` để
 * component điều khiển dải "Đang thử gửi lại".
 *
 * Hàm THUẦN theo nghĩa không phụ thuộc React — test được bằng cách mock
 * `fetch`, không cần render component nào.
 */
export async function sendInteractionWithRetry(
  sessionId: string,
  input: { dishId: string; action: InteractionAction },
  onStatusChange: (status: SendInteractionStatus) => void,
): Promise<SendInteractionResult> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (response.ok) {
        onStatusChange('idle')
        const body = (await response.json()) as { effectiveInteraction: InteractionType | null }
        return { ok: true, effectiveInteraction: body.effectiveInteraction }
      }

      // 4xx: lỗi quyền/validate — KHÔNG retry, gửi lại không đổi kết quả.
      if (response.status < 500) {
        onStatusChange('failed')
        return { ok: false }
      }
    } catch {
      // Lỗi mạng thật — rơi xuống nhánh retry bên dưới.
    }

    const delay = RETRY_DELAYS_MS[attempt]
    if (delay !== undefined) {
      onStatusChange('retrying')
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  onStatusChange('failed')
  return { ok: false }
}
