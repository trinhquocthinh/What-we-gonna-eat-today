/**
 * SPEC-037 — Implicit Preference ($I$). Hàm thuần: không đọc DB, không tự biết
 * "hôm nay" là ngày nào. Cùng kỷ luật `computeRecencyPenalty` (SPEC-020) đã
 * đặt ra ở E4-T1 — mọi thứ đi vào qua tham số.
 *
 * VÌ SAO NÓ Ở `selection` CHỨ KHÔNG Ở `preference` (SDD §10): tên `BR-038`
 * ("Implicit Preference") kéo người đọc về feature `preference`, nhưng $I$ được
 * SUY RA từ `interactions` — bảng của `selection` — rồi tiêu thụ ngay bởi
 * ranking của `selection`. `preference` sở hữu thứ người dùng KHAI;
 * `selection` sở hữu thứ hệ thống QUAN SÁT. Đặt ở `preference` sinh ra chiều
 * `preference → selection` chưa từng có và không nên có.
 *
 * Nhận `config` chứ không nhận `halfLifeDays`/`priorK` rời như
 * `computeRecencyPenalty`. Khác biệt có lý do: `recency.ts` nhận số rời VÌ
 * `history` không được import `selection` (doc-comment của nó viết đúng câu
 * đó). Ràng buộc ấy không áp cho một hàm nằm TRONG `selection`, và hai hàm
 * hàng xóm cùng thư mục — `computePersonalScore`, `computeSessionScore` — đều
 * nhận `config`.
 */

import type { RankingConfig } from './ranking-config'

/**
 * Một lượt vuốt CÒN HIỆU LỰC trong một phiên đã `FINALIZED`.
 *
 * `decisionDate` là `selection_sessions.decision_date`, KHÔNG phải
 * `interactions.updated_at`: cái đầu là ngày người ta ăn, cái sau đổi mỗi lần
 * đổi ý trong cùng phiên. Một người vuốt đi vuốt lại một món lúc 23h không làm
 * lượt vuốt ấy "mới" hơn lượt của người quyết một lần rồi thôi.
 */
export type ImplicitSwipe = {
  readonly globalDishId: string
  readonly type: 'SWIPE_RIGHT' | 'SWIPE_LEFT'
  /** Ngày lịch `YYYY-MM-DD`. */
  readonly decisionDate: string
}

function toUtcMidnight(date: string): number {
  const parsed = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`implicit-preference: ngày không hợp lệ: "${date}"`)
  }
  return parsed.getTime()
}

const MS_PER_DAY = 86_400_000

/**
 * $$\text{Weight}(t) = 0.5^{\text{AgeDays}(t) / \text{halfLifeDays}}$$
 * $$I = \frac{R_w - L_w}{R_w + L_w + K_{\text{prior}}}$$
 *
 * Món KHÔNG có lượt vuốt nào **không có mặt** trong Map — người gọi dùng
 * `?? 0`, đúng khuôn `countRecentEatersByDish` của SPEC-014. Trả về `0` cho
 * mọi món trên đời là trả về một khẳng định ("món này trung tính") thay cho
 * một sự vắng mặt ("chưa biết gì về món này"), và người gọi mất khả năng phân
 * biệt hai chuyện đó.
 *
 * KHÔNG có nhánh `if (total === 0) return 0`: mẫu số luôn $\ge K_{\text{prior}}
 * = 3$ nên phép chia không bao giờ chạm 0. Viết nhánh ấy là gợi ý rằng nó có
 * thể chạm, và người đọc sau sẽ đi tìm một ca không tồn tại. Đây cũng là lý do
 * $K_{\text{prior}}$ tồn tại: một món vuốt phải đúng một lần chỉ đạt $I = 0.25$
 * chứ không nhảy thẳng lên $1.0$ (TC-159).
 *
 * `ageDays` chặn dưới ở 0 vì cùng lý lẽ `computeRecencyPenalty` chặn trên ở 1:
 * SPEC-037 tuyên bố $I \in [-1, 1]$, mà một `decision_date` ở tương lai (lệch
 * timezone giữa hai Group) cho trọng số > 1 và phá vỡ đúng hợp đồng ấy. Một
 * phép `Math.max` rẻ hơn nhiều so với việc đi tìm một điểm số vô lý trong
 * `buildDeck`.
 */
export function computeImplicitPreference(
  input: {
    readonly swipes: readonly ImplicitSwipe[]
    readonly referenceDate: string
  },
  config: RankingConfig,
): Map<string, number> {
  const { halfLifeDays, priorK } = config.implicit
  const reference = toUtcMidnight(input.referenceDate)

  // Gộp trọng số trước, chia sau: một món có thể có nhiều lượt vuốt qua nhiều
  // phiên, và $R_w$/$L_w$ của SPEC-037 là TỔNG trên toàn bộ chúng.
  const weights = new Map<string, { right: number; left: number }>()

  for (const swipe of input.swipes) {
    const ageDays = Math.max(0, (reference - toUtcMidnight(swipe.decisionDate)) / MS_PER_DAY)
    const weight = Math.pow(0.5, ageDays / halfLifeDays)

    const bucket = weights.get(swipe.globalDishId) ?? { right: 0, left: 0 }
    if (swipe.type === 'SWIPE_RIGHT') {
      bucket.right += weight
    } else {
      bucket.left += weight
    }
    weights.set(swipe.globalDishId, bucket)
  }

  const scores = new Map<string, number>()
  for (const [globalDishId, { right, left }] of weights) {
    scores.set(globalDishId, (right - left) / (right + left + priorK))
  }
  return scores
}
