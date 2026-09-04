/**
 * M3-T7 — Gửi một mutation JSON tới Route Handler, tự retry khi lỗi MẠNG.
 *
 * Rút ra từ `sendInteractionWithRetry` (E1-T9) khi màn Danh mục món cần đúng
 * cơ chế đó cho `/api/preferences/*`. Hai bản sao của cùng một vòng retry là
 * chỗ chúng sẽ lệch nhau — và lệch ở đây nghĩa là một khai báo `Cannot Eat`
 * biến mất trong im lặng, đúng rủi ro `R-05`.
 *
 * KHÔNG retry lỗi 4xx: đó là lỗi logic hoặc quyền, gửi lại không đổi kết quả.
 *
 * Hàm thuần theo nghĩa không phụ thuộc React — test bằng cách mock `fetch`,
 * không cần render component nào.
 */

export type SendStatus = 'idle' | 'retrying' | 'failed'

export type SendResult<T> = { ok: true; data: T } | { ok: false }

/** NFR-05: 3 lần retry, backoff 1s/2s/4s. Chưa có đặc tả số chính xác — đây
 *  là lựa chọn hợp lý cho quy mô <10 người dùng, không phải hằng số bất biến. */
const RETRY_DELAYS_MS = [1000, 2000, 4000]

export async function sendJsonWithRetry<T>(input: {
  readonly url: string
  readonly method: 'POST' | 'PUT'
  readonly body: unknown
  readonly onStatusChange: (status: SendStatus) => void
}): Promise<SendResult<T>> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(input.url, {
        method: input.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input.body),
      })

      if (response.ok) {
        input.onStatusChange('idle')
        return { ok: true, data: (await response.json()) as T }
      }

      // 4xx: lỗi quyền/validate — KHÔNG retry, gửi lại không đổi kết quả.
      if (response.status < 500) {
        input.onStatusChange('failed')
        return { ok: false }
      }
    } catch {
      // Lỗi mạng thật — rơi xuống nhánh retry bên dưới.
    }

    const delay = RETRY_DELAYS_MS[attempt]
    if (delay !== undefined) {
      input.onStatusChange('retrying')
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  input.onStatusChange('failed')
  return { ok: false }
}
