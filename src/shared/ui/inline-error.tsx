import type { ReactElement } from 'react'

export type InlineErrorProps = {
  /** `null` = không có lỗi; component tự trả `null`, người gọi không phải
   *  viết `{error === null ? null : …}` ở bảy chỗ khác nhau. */
  message: string | null
  /** Nối với `aria-describedby` của input tương ứng khi lỗi thuộc về một ô
   *  nhập cụ thể (khuôn `text-field.tsx` đang dùng). */
  id?: string
  size?: 'caption' | 'body'
}

/**
 * Design Criteria §5 `InlineError` + §10 anti-pattern 7 (không modal giữa màn
 * hình cho lỗi form). Lỗi hiện NGAY CẠNH thứ gây ra nó.
 *
 * Token là `--danger`, KHÔNG phải `--no`. Hai chỗ ở E5 (`group-rules-screen`,
 * `finalize-bar`) đang dùng `--no` — sai: `--no` là nâu đất trung tính của
 * VUỐT TRÁI, nói "món này tôi không muốn". Dùng nó cho lỗi làm thất bại trông
 * như một lựa chọn (Guide §1.4).
 *
 * `role="alert"` để screen reader đọc ngay khi lỗi xuất hiện, không đợi người
 * dùng tab tới.
 */
export function InlineError({
  message,
  id,
  size = 'caption',
}: InlineErrorProps): ReactElement | null {
  if (message === null) {
    return null
  }

  return (
    <span
      {...(id === undefined ? {} : { id })}
      role="alert"
      className={`font-medium text-danger ${size === 'body' ? 'text-body' : 'text-caption'}`}
    >
      {message}
    </span>
  )
}
