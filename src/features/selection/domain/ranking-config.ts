/**
 * Ranking Spec §5 — "Cấu hình trọng số tập trung". Nguyên tắc 4 của §1:
 * "Mọi hằng số và trọng số được định nghĩa tại một nơi duy nhất."
 *
 * CHÉP TRỌN §5 kể cả những giá trị v1.0 chưa dùng tới. Lý do: nguyên tắc tập
 * trung nói về NƠI ĐỊNH NGHĨA, không phải về nơi sử dụng — để một nửa ở đây,
 * một nửa chờ v1.1 rồi thêm sau là đúng cái tình huống nguyên tắc này ngăn.
 *
 * v1.1 đọc năm giá trị:
 * - `personalRanking.wRecency`      → `computePersonalScore` (SDD SPEC-010)
 * - `personalRanking.wExplicit`     → `computePersonalScore` (SPEC-025, E7-T2)
 * - `history.cooldownWindowDays`    → `computeRecencyPenalty` (SDD SPEC-020)
 * - `explore.*`                     → `isExploreEligible` + `blendExploitExplore` (BR-047, E8-T2)
 * - `deck.maxCards`                 → `capDeck` + `splitIntoCourses` (BR-062, E8-T1)
 * - `sessionRanking.*`              → `computeSessionScore` (SPEC-014, E5-T6 + E7-T6)
 *
 * Mọi giá trị còn lại là hợp đồng đã duyệt cho v1.2 — đừng xoá, và cũng đừng
 * viết hàm dùng chúng trước khi epic của chúng tới (Implementation Guide §1.1, §1.2).
 */
export type RankingConfig = {
  readonly personalRanking: {
    /** v1.1 — F16 Like/Dislike, `explicitPreferenceScore` (E7-T2). */
    readonly wExplicit: number
    /** v1.2 — F30 Implicit Preference. Chưa hàm nào đọc. */
    readonly wImplicit: number
    /** v1.0 — SPEC-020. */
    readonly wRecency: number
    /** v1.2 — F33 Chef Mode. Chưa hàm nào đọc. */
    readonly wChef: number
    /** v1.2 — F36 Purchase Source. Chưa hàm nào đọc. */
    readonly wSource: number
  }
  /** v1.2 — F30. Chưa hàm nào đọc. */
  readonly implicit: {
    readonly halfLifeDays: number
    readonly priorK: number
  }
  /** v1.0 — BR-046. */
  readonly history: {
    readonly cooldownWindowDays: number
  }
  /** v1.1 — F18 Explore Lane, BR-047 (E8-T2). */
  readonly explore: {
    readonly ratio: number
    readonly blockSize: number
    readonly staleDays: number
  }
  readonly deck: {
    /**
     * BR-062 + Ranking Spec §5 — Trần 30 thẻ mỗi người mỗi phiên.
     * Chia hết cho `blockSize = 5` => đúng 24 Exploit + 6 Explore, không có khối cụt ở cuối.
     */
    readonly maxCards: number
  }
  /** E5-T6 + E7-T6 — SPEC-014 Session Ranking. */
  readonly sessionRanking: {
    readonly aSwipeRight: number
    readonly bSwipeLeft: number
    readonly cCannotEat: number
    readonly dRecent: number
  }
}

export const RANKING_CONFIG: RankingConfig = {
  personalRanking: {
    wExplicit: 0.3,
    wImplicit: 0.25,
    wRecency: 0.25,
    wChef: 0.1,
    wSource: 0.1,
  },
  implicit: {
    halfLifeDays: 60,
    priorK: 3,
  },
  history: {
    cooldownWindowDays: 7,
  },
  explore: {
    ratio: 0.2,
    blockSize: 5,
    staleDays: 30,
  },
  deck: {
    maxCards: 30,
  },
  sessionRanking: {
    aSwipeRight: 1.0,
    bSwipeLeft: 0.7,
    cCannotEat: 1.0,
    dRecent: 0.3,
  },
}
