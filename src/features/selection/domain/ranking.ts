import type { SystemTag } from '@/shared/domain/system-tag'

import type { RankingConfig } from './ranking-config'

/**
 * Ranking Spec §2.2 + SDD SPEC-010. Ở v1.1 CÓ HAI số hạng có dữ liệu thật:
 * `recencyPenalty` (từ E4) và `explicit` (từ E7-S2). Ba số hạng còn lại —
 * `implicit` (F30), `chef` (F33), `source` (F36) — vẫn cố ý vắng mặt: thêm
 * một trường mà không hàm nào tính ra được giá trị thật cho nó chỉ tạo ảo
 * giác tính năng đã có.
 */
export type RankingInput = {
  /** $R \in [0, 1]$ từ `computeRecencyPenalty` (SPEC-020). */
  readonly recencyPenalty: number
  /** $E \in \{-1, 0, +1\}$ từ `explicitPreferenceScore` (SPEC-025). */
  readonly explicit: number
}

/** $\text{score} = w_{\text{explicit}} \times E - w_{\text{recency}} \times R$ — SPEC-010, v1.1. */
export function computePersonalScore(input: RankingInput, config: RankingConfig): number {
  return (
    config.personalRanking.wExplicit * input.explicit -
    config.personalRanking.wRecency * input.recencyPenalty
  )
}

export type DishRankingInput = {
  /** `group_dishes.id` — cùng hệ id với `DishCard.dishId`. */
  readonly dishId: string
  readonly recencyPenalty: number
  /** $E \in \{-1, 0, +1\}$ từ `explicitPreferenceScore` (SPEC-025). */
  readonly explicit: number
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
        computePersonalScore({ recencyPenalty: b.recencyPenalty, explicit: b.explicit }, config) -
        computePersonalScore({ recencyPenalty: a.recencyPenalty, explicit: a.explicit }, config)
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

/**
 * BR-047 — điều kiện vào luồng Explore. Dùng ở HAI chỗ và phải là CÙNG một
 * hàm: `list-deck` chia luồng lúc dựng deck, và gắn `lane` cho từng thẻ ở mỗi
 * lần đọc. Hai bản sao của cùng một vị từ là chỗ chúng sẽ lệch nhau.
 */
export function isExploreEligible(
  input: { readonly daysSinceLastEaten: number | null; readonly explicit: number },
  config: RankingConfig,
): boolean {
  if (input.explicit < 0) return false // Dislike — BR-047 loại trừ
  return input.daysSinceLastEaten === null || input.daysSinceLastEaten >= config.explore.staleDays
}

/**
 * BR-047 — mỗi khối `blockSize` vị trí: (blockSize - 1) thẻ Exploit + 1 thẻ
 * Explore ở vị trí cuối khối.
 *
 * HAI LUỒNG CHỒNG NHAU (Guide §1.1): món chưa từng ăn có R = 0 nên vừa đứng
 * đầu Exploit vừa đứng đầu Explore. `used` là thứ giữ cho mỗi món chỉ vào deck
 * một lần — bỏ nó đi thì deck có món lặp và không test nào ở tầng trên bắt được.
 *
 * Luồng nào cạn thì vị trí đó lấy từ luồng còn lại — không để trống.
 */
export function blendExploitExplore(input: {
  readonly exploit: readonly string[]
  readonly explore: readonly string[]
  readonly blockSize: number
}): string[] {
  const blockSize = Math.max(1, input.blockSize)
  const used = new Set<string>()
  let exploitIdx = 0
  let exploreIdx = 0

  function nextExploit(): string | null {
    while (exploitIdx < input.exploit.length) {
      const id = input.exploit[exploitIdx++]!
      if (!used.has(id)) {
        used.add(id)
        return id
      }
    }
    return null
  }

  function nextExplore(): string | null {
    while (exploreIdx < input.explore.length) {
      const id = input.explore[exploreIdx++]!
      if (!used.has(id)) {
        used.add(id)
        return id
      }
    }
    return null
  }

  const result: string[] = []
  while (true) {
    const isExplorePos = (result.length + 1) % blockSize === 0
    const candidate = isExplorePos
      ? (nextExplore() ?? nextExploit())
      : (nextExploit() ?? nextExplore())

    if (candidate === null) {
      break
    }
    result.push(candidate)
  }

  return result
}

/**
 * SPEC-014 — số đếm thô của MỘT món trong MỘT phiên.
 *
 * `cannotEatCount` ($X$): SỐ NGƯỜI trong phiên đã khai `Cannot Eat` món này (BR-034).
 *
 * `recentEaterCount` ($H$) là SỐ NGƯỜI trong phiên đã ăn món này trong cửa sổ
 * cooldown — KHÁC hẳn `recencyPenalty` của SPEC-020 ($R \in [0,1]$ của MỘT
 * người cho MỘT món). Hai số hạng cùng nói về "vừa ăn gần đây" nhưng ở hai
 * đơn vị và hai phạm vi khác nhau; nhầm chúng là lỗi khó thấy nhất ở slice này.
 */
export type SessionScoreInput = {
  readonly proposedCount: number
  readonly rejectedCount: number
  /** $X$ — SỐ NGƯỜI trong phiên đã khai `Cannot Eat` món này (BR-034). */
  readonly cannotEatCount: number
  readonly recentEaterCount: number
}

/**
 * $$\text{Score} = \frac{a P - b N - c X - d H}{T}$$
 *
 * Chuẩn hoá theo $T$ để điểm so sánh được giữa các phiên có số người khác nhau
 * (TC-060: thêm người thứ 5 thì cùng $P=3$ phải cho điểm thấp hơn).
 *
 * $T \le 0$ trả 0 chứ không `NaN`. Trên thực tế không tới được — Creator luôn
 * là Participant (BR-020) và v1.0 chưa có F25 Gỡ Participant — nhưng một `NaN`
 * lọt qua đây sẽ hiện lên màn hình S-10 cạnh tên món, và không test nào ở
 * tầng trên bắt kịp. TC-111 giữ nhánh $T = 1$.
 */
export function computeSessionScore(
  input: SessionScoreInput,
  participantCount: number,
  config: RankingConfig,
): number {
  if (participantCount <= 0) {
    return 0
  }

  const { aSwipeRight, bSwipeLeft, cCannotEat, dRecent } = config.sessionRanking

  return (
    (aSwipeRight * input.proposedCount -
      bSwipeLeft * input.rejectedCount -
      cCannotEat * input.cannotEatCount -
      dRecent * input.recentEaterCount) /
    participantCount
  )
}

export type SessionDishInput = SessionScoreInput & {
  /** `group_dishes.id`. */
  readonly dishId: string
  readonly name: string
  readonly systemTags: readonly SystemTag[]
}

export type RankedDish = SessionDishInput & {
  readonly score: number
}

export type SessionRankingResult = {
  readonly ranked: readonly RankedDish[]
  /** TC-061 — món CHƯA AI tương tác. Không có điểm, không nằm trong `ranked`. */
  readonly untouched: readonly SessionDishInput[]
}

/**
 * SPEC-014 — tách bảng xếp hạng thành hai mục đúng như đầu ra spec mô tả:
 * `{ ranked, untouched }`.
 *
 * "Chưa ai tương tác" xét trên $P$ và $N$, KHÔNG xét $H$: một món cả nhà vừa
 * ăn hôm qua mà chưa ai vuốt vẫn là món chưa ai tương tác (TC-061). Cho nó một
 * điểm âm rồi xếp cuối bảng `ranked` là nói dối — người dùng sẽ đọc thành "cả
 * nhà không thích món này".
 *
 * Tie-break hai tầng (SPEC-014 không quy định, Guide §1.6): `score` giảm dần →
 * $P$ giảm dần → `dishId` tăng dần. KHÔNG dùng `stableHash` như `buildDeck`:
 * hash ở đó để hai người thấy thứ tự KHÁC nhau, ở đây cả nhà phải nhìn cùng
 * một bảng.
 *
 * `untouched` giữ nguyên thứ tự đầu vào (`group_dishes.id`) — không có tín
 * hiệu nào để sắp, và bịa ra một thứ tự là ngụ ý một thứ hạng không tồn tại.
 */
export function rankSession(
  input: {
    readonly dishes: readonly SessionDishInput[]
    readonly participantCount: number
  },
  config: RankingConfig,
): SessionRankingResult {
  const untouched = input.dishes.filter(
    (dish) => dish.proposedCount === 0 && dish.rejectedCount === 0,
  )

  const ranked = input.dishes
    .filter((dish) => dish.proposedCount > 0 || dish.rejectedCount > 0)
    .map((dish) => ({ ...dish, score: computeSessionScore(dish, input.participantCount, config) }))
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score
      }
      if (a.proposedCount !== b.proposedCount) {
        return b.proposedCount - a.proposedCount
      }
      return a.dishId < b.dishId ? -1 : a.dishId > b.dishId ? 1 : 0
    })

  return { ranked, untouched }
}
