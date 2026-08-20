import type { RankingConfig } from './ranking-config'

/**
 * Ranking Spec §2.2 + SDD SPEC-010. Ở v1.0 chỉ số hạng recency có dữ liệu —
 * xem Implementation Guide §1.1. Kiểu `RankingInput` cố ý CHƯA có `explicit`,
 * `implicit`, `chef`, `source`: thêm một trường mà không hàm nào tính ra được
 * giá trị thật cho nó chỉ tạo ảo giác tính năng đã có.
 */
export type RankingInput = {
  /** $R \in [0, 1]$ từ `computeRecencyPenalty` (SPEC-020). */
  readonly recencyPenalty: number
}

/** $\text{score} = -w_{\text{recency}} \times R$ — SDD SPEC-010, v1.0. */
export function computePersonalScore(input: RankingInput, config: RankingConfig): number {
  return -config.personalRanking.wRecency * input.recencyPenalty
}

export type DishRankingInput = {
  /** `group_dishes.id` — cùng hệ id với `DishCard.dishId`. */
  readonly dishId: string
  readonly recencyPenalty: number
  /** `null` = chưa từng ăn ($d = \infty$). Tie-break tầng 2 cần giá trị này. */
  readonly daysSinceLastEaten: number | null
}

export type BuildDeckInput = {
  readonly sessionId: string
  readonly userId: string
  readonly eligible: readonly DishRankingInput[]
}

/**
 * FNV-1a 32-bit — băm xác định, viết tay bằng TS thuần.
 *
 * KHÔNG dùng `node:crypto`: `domain/` của dự án này giữ nguyên tắc không phụ
 * thuộc gì cả (Tech Spec §2.4 — "các hàm trong domain/ có độ bao phủ test cao
 * nhất và không sử dụng bất kỳ mock nào"). Băm ở đây chỉ để phá thế hoà một
 * cách ổn định, không phải để chống giả mạo — một hàm băm không mật mã là
 * đúng công cụ, và nó chạy cho MỌI món ở MỌI lần dựng deck.
 *
 * `Math.imul` là bắt buộc: phép `*` của JS trên số lớn hơn 2^53 sẽ mất chính
 * xác, `Math.imul` mới cho phép nhân 32-bit vòng đúng chuẩn.
 */
export function stableHash(seed: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Món chưa ăn đứng trước mọi món đã ăn — $d = \infty$ của Ranking Spec §2.5. */
function daysRank(daysSinceLastEaten: number | null): number {
  return daysSinceLastEaten === null ? Number.POSITIVE_INFINITY : daysSinceLastEaten
}

/**
 * SDD SPEC-010 — dựng thứ tự Personal Candidate Deck.
 *
 * Ba tầng sắp xếp, đúng thứ tự:
 *   1. `score` GIẢM DẦN (điểm cao lên trước)
 *   2. `d` GIẢM DẦN (lâu chưa ăn lên trước; chưa ăn bao giờ = $\infty$, trên cùng)
 *   3. `stableHash(sessionId:userId:dishId)` TĂNG DẦN
 *
 * Vì sao cần tầng 2 khi tầng 1 đã dựa trên $R$ (vốn là hàm của $d$): mọi món
 * có $d \ge 7$ và mọi món chưa từng ăn đều cho $R = 0$, tức CÙNG score. Tầng 1
 * không phân biệt được chúng — đó thường là phần lớn danh mục. Tầng 2 mới là
 * thứ đẩy món lâu chưa ăn lên trước món vừa qua ngưỡng cooldown.
 *
 * KHÔNG có tầng "nguồn mua" của Ranking Spec §2.5 — `F36` là v1.2, SDD
 * SPEC-010 đã bỏ tầng đó khỏi hợp đồng v1.0 (Guide §1.1).
 *
 * KHÔNG ghép luồng Exploit/Explore (Ranking Spec Stage 3) — `F18` là v1.1
 * (Guide §1.2). Hàm này chỉ sắp xếp.
 *
 * Chữ ký lệch nhẹ khỏi Tech Spec §2.4 (`input` object thay vì mảng phẳng) để
 * mang được seed tie-break — xem Guide §1.4 và DEC-036.
 */
export function buildDeck(input: BuildDeckInput, config: RankingConfig): string[] {
  return [...input.eligible]
    .sort((a, b) => {
      const scoreDiff =
        computePersonalScore({ recencyPenalty: b.recencyPenalty }, config) -
        computePersonalScore({ recencyPenalty: a.recencyPenalty }, config)
      if (scoreDiff !== 0) {
        return scoreDiff
      }

      const daysDiff = daysRank(b.daysSinceLastEaten) - daysRank(a.daysSinceLastEaten)
      // `Infinity - Infinity` ra `NaN`, không phải 0 — hai món cùng chưa ăn
      // bao giờ phải rơi xuống tầng 3 chứ không được trả NaN cho `sort`.
      if (!Number.isNaN(daysDiff) && daysDiff !== 0) {
        return daysDiff
      }

      return (
        stableHash(`${input.sessionId}:${input.userId}:${a.dishId}`) -
        stableHash(`${input.sessionId}:${input.userId}:${b.dishId}`)
      )
    })
    .map((dish) => dish.dishId)
}
