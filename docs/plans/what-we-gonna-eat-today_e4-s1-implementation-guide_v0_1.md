# 🧮 Implementation Guide — E4 Slice S1: Thuật toán ranking thuần

> **Document Metadata**
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-19`
> - **Upstream:** [Master Plan](../what-we-gonna-eat-today_master-plan_v1_0.md) (`E4-T1`, `E4-T2`) • [Ranking Spec](../what-we-gonna-eat-today_ranking-specification_v0_1.md) (§2.2, §2.5, §5) • [SDD](../what-we-gonna-eat-today_sdd_v0_1.md) (`SPEC-020`, `SPEC-010`) • [Business Rules](../what-we-gonna-eat-today_business-rules_v1.4.md) (`BR-045`, `BR-046`, `BR-033`) • [Test Cases](../what-we-gonna-eat-today_test-cases-specification_v0_1.md) (`TC-079→084`, `TC-042`, `TC-043`)
> - **Tiền đề:** `E1-T11` đã code (`eating_history` có dữ liệu ghi vào).
>
> 🧮 *Slice mở đầu E4 — epic mà Master Plan gọi là "giai đoạn quyết định sản phẩm có khác một danh sách món ăn thông thường hay không". Hai hàm thuần, không DB, không UI, không mock.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
|---|---|---|---|---|
| `E4-T1` | `computeRecencyPenalty`, hàm thuần | 3 | `src/features/history/domain/recency.ts` | Không mock gì, nhận `referenceDate` làm tham số; `TC-084` pass |
| `E4-T2` | `computePersonalScore` & `buildDeck` kèm tie-break | 3 | `src/features/selection/domain/ranking.ts` | `RankingConfig` nằm ở **một** module hằng số duy nhất |

- [ ] `TC-079`→`TC-084` pass ở tầng `D`, không một dòng mock nào
- [ ] `TC-042`, `TC-043` pass ở tầng `D`
- [ ] `RANKING_CONFIG` là export hằng số DUY NHẤT chứa mọi trọng số của Ranking Spec §5
- [ ] `yarn verify && yarn arch:probe` xanh

---

# 1. Bốn phát hiện — đọc trước khi gõ

## 1.1 SDD thu hẹp công thức v1.0 xuống đúng MỘT số hạng

Ranking Spec §2.2 (Status `Approved`) đưa công thức đầy đủ 5 số hạng:

$$\text{Score} = w_{\text{explicit}} \cdot E + w_{\text{implicit}} \cdot I + w_{\text{chef}} \cdot C + w_{\text{source}} \cdot S - w_{\text{recency}} \cdot R$$

Nhưng **SDD SPEC-010 quy định riêng cho v1.0** (verbatim):

```
- **Quy tắc:**
  - $\text{score} = -w_{\text{recency}} \times R$ (với $w_{\text{recency}} = 0.25$).
  - Tie-break: Món chưa ăn ($d = \infty$) $\to$ $d$ lớn hơn $\to$ `stable_hash(sessionId, userId, dishId)`.
  - Deck được lưu trữ cố định (materialized) trong `session_decks`...
```

Bốn số hạng còn lại đều ngoài v1.0: $E$ cần Like/Dislike (`F16`, v1.1), $I$ cần Implicit Preference (`F30`, v1.2), $C$ cần Chef Mode (`F33`, v1.2), $S$ cần Purchase Source (`F36`, v1.2). SDD §1.1 liệt kê v1.0 chỉ có `F07`, `F08`, `F09`, `F17` trong nhóm deck/ranking.

**Tie-break cũng khác nhau giữa hai tài liệu.** Ranking Spec §2.5 có **ba** tầng:
1. $d$ lớn hơn ($d = \infty$ cho món chưa ăn)
2. Món có nguồn mua đã biết lên trước
3. `stable_hash(session_id, user_id, dish_id)` tăng dần

SDD SPEC-010 chỉ có **hai** — bỏ tầng "nguồn mua", vì `F36` là v1.2. **Theo SDD**, và ghi lý do vào Decision Log (§11).

## 1.2 Explore Lane và đóng băng-giữa-phiên KHÔNG thuộc E4

Ranking Spec Stage 3 mô tả ghép luồng 4 Exploit + 1 Explore (BR-047), Stage §2.7 mô tả đóng băng thẻ `index < cursor` khi tính lại (BR-048). Cả hai **ngoài phạm vi E4**:

- PRD §6 xếp *"Explore lane 20%"* vào **v1.1**; bảng tính năng đánh `F18` (Explore) và `F19` (Ổn định Deck khi tính lại) là **Should**, không phải Must.
- Hai comment sẵn có trong code đã đánh dấu đúng như vậy từ E1-S5: `dish-swipe-card.tsx:46` (*"reason chip đổi màu theo explore lane là F18/v1.1"*) và `deck-screen.tsx:37` (*"CỐ Ý CHƯA CÓ ở S5 (F15/F18, v1.1)"*).
- Tiêu đề E4-T2 chỉ nói `computePersonalScore & buildDeck kèm tie-break` — không nhắc interleave.

Nên `buildDeck` ở slice này **chỉ sắp xếp**, không ghép luồng. Cấu hình `explore` vẫn nằm trong `RANKING_CONFIG` (§3) vì nguyên tắc tập trung, nhưng không hàm nào đọc nó ở v1.0.

## 1.3 Config tập trung đụng ranh giới feature — một xung đột thật

DoD của E4-T2 đòi `RankingConfig` ở **một** module duy nhất. Ranking Spec §1 nguyên tắc 4 nói rõ: *"Mọi hằng số và trọng số được định nghĩa tại một nơi duy nhất (§5)"*.

Nhưng `computeRecencyPenalty` sống ở `features/history/` (Master Plan chỉ định `src/features/history/domain/recency.ts`), còn config thuộc `features/selection/`. Và `eslint.config.mjs` chỉ cho `selection → history`, **không có chiều ngược lại**:

```js
const ALLOWED_CROSS_FEATURE = {
  selection: ['history', 'dish'],
  meal: ['rule', 'history'],
}
```

Để `COOLDOWN_WINDOW_DAYS = 7` cứng trong `recency.ts` là vi phạm nguyên tắc 4 (hằng số nằm hai nơi, lệch nhau lúc nào không biết).

**Giải pháp: tham số hoá.** `computeRecencyPenalty` nhận `cooldownWindowDays` làm tham số; `selection/application` (S2) truyền `RANKING_CONFIG.history.cooldownWindowDays` xuống. Đúng tinh thần DoD của chính E4-T1 (*"nhận `referenceDate` làm tham số"*) — hàm thuần không tự biết bối cảnh, mọi thứ đi vào qua tham số. `history/domain` giữ nguyên: không biết gì về ranking, không import gì.

## 1.4 Chữ ký `buildDeck` của Tech Spec không mang được seed tie-break

Tech Spec §2.4 ghi:

```typescript
export function buildDeck(eligible: DishRankingInput[], config: RankingConfig): string[];
```

Nhưng tie-break tầng cuối là `stable_hash(sessionId, userId, dishId)` — cần một seed theo cặp *(session, user)*, mà chữ ký hai tham số không chỗ nào mang nó. Nhét `sessionId`/`userId` vào từng phần tử `eligible` là lặp đúng hai giá trị N lần, dễ để lệch nhau giữa các phần tử.

**Quyết định: lệch nhẹ khỏi Tech Spec §2.4** — `buildDeck(input: BuildDeckInput, config: RankingConfig)` với `BuildDeckInput = { sessionId, userId, eligible }`. §2.4 là khối minh hoạ hình dạng ba hàm ("Tại `src/features/selection/domain/ranking.ts`:"), không phải hợp đồng byte-exact — hai hàm còn lại giữ nguyên chữ ký. Ghi vào Decision Log (§11).

## 1.5 TC-040→044 tự tách đúng ranh giới S1/S2

Master Plan gán cả dải `TC-040→044` cho E4-T2, nhưng Test Cases Spec ghi tầng khác nhau:

| TC | Tầng | Nội dung | Slice |
|---|---|---|---|
| `TC-040` | `A` | Group có 30 món `ACTIVE` → deck chứa đúng 30 món | **S2** |
| `TC-041` | `A` | Mở lại deck lần 2 → thứ tự giữ nguyên | **S2** |
| `TC-042` | `D` | 2 User khác nhau → thứ tự deck khác nhau theo lịch sử ăn | **S1** ← đây |
| `TC-043` | `D` | Ăn A hôm qua, chưa ăn B → B xếp trên A | **S1** ← đây |
| `TC-044` | `A` | 2 User có Eating History khác nhau → thứ tự phản ánh đúng từng người | **S2** |

Không phải bỏ sót — chỉ là ranh giới tầng. Slice này phủ hai ca `D`; ba ca `A` cần use case + DB thật, thuộc S2.

---

# 2. File tree

```
src/features/history/domain/
  recency.ts                    + MỚI
  recency.test.ts               + MỚI
  default-eating-history.ts     (không đụng — hàng xóm cùng thư mục)

src/features/selection/domain/
  ranking-config.ts             + MỚI
  ranking.ts                    + MỚI
  ranking.test.ts               + MỚI
```

Ba file mới, không sửa file nào đang có. Không migration, không đụng `app/`, không đụng `presentation/`.

---

# 3. `src/features/selection/domain/ranking-config.ts` — MỚI

Chép trọn Ranking Spec §5 vào **một** `export const` duy nhất. Đây là chỗ DoD của E4-T2 chỉ đích danh.

```ts
/**
 * Ranking Spec §5 — "Cấu hình trọng số tập trung". Nguyên tắc 4 của §1:
 * "Mọi hằng số và trọng số được định nghĩa tại một nơi duy nhất."
 *
 * CHÉP TRỌN §5 kể cả những giá trị v1.0 chưa dùng tới. Lý do: nguyên tắc tập
 * trung nói về NƠI ĐỊNH NGHĨA, không phải về nơi sử dụng — để một nửa ở đây,
 * một nửa chờ v1.1 rồi thêm sau là đúng cái tình huống nguyên tắc này ngăn.
 *
 * v1.0 CHỈ đọc ba giá trị:
 * - `personalRanking.wRecency`      → `computePersonalScore` (SDD SPEC-010)
 * - `history.cooldownWindowDays`    → `computeRecencyPenalty` (SDD SPEC-020)
 * - `deck.pageSize`                 → phân trang (E4-T4, slice S2)
 *
 * Mọi giá trị còn lại là hợp đồng đã duyệt cho v1.1/v1.2 — đừng xoá, và cũng
 * đừng viết hàm dùng chúng ở E4 (xem Implementation Guide §1.1, §1.2).
 */
export type RankingConfig = {
  readonly personalRanking: {
    /** v1.1 — F16 Like/Dislike. Chưa hàm nào đọc. */
    readonly wExplicit: number
    /** v1.2 — F30 Implicit Preference. Chưa hàm nào đọc. */
    readonly wImplicit: number
    /** v1.0 — SỐ HẠNG DUY NHẤT đang dùng. */
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
  /** v1.1 — F18 Explore Lane. Chưa hàm nào đọc. */
  readonly explore: {
    readonly ratio: number
    readonly blockSize: number
    readonly staleDays: number
  }
  /** `pageSize` dùng từ S2 (E4-T4, SPEC-011). */
  readonly deck: {
    readonly pageSize: number
  }
  /** E5-T6 — SPEC-014 Session Ranking. Chưa hàm nào đọc ở E4. */
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
    pageSize: 20,
  },
  sessionRanking: {
    aSwipeRight: 1.0,
    bSwipeLeft: 0.7,
    cCannotEat: 1.0,
    dRecent: 0.3,
  },
}
```

**Một export giá trị duy nhất** (`RANKING_CONFIG`) — `knip` chỉ báo *export* không dùng, không báo *thuộc tính* không dùng, nên các giá trị v1.1/v1.2 không làm `yarn verify` đỏ.

**`deck.pageSize = 20`** khác `WHOLE_DECK_PAGE_SIZE = 500` đang hardcode trong `app/sessions/[sessionId]/page.tsx`. Không sửa ở slice này — SPEC-011 và `TC-045` (30 món, `cursor=0` → 20 món, `nextCursor=20`) là việc của **S2/E4-T4**.

---

# 4. `src/features/history/domain/recency.ts` — MỚI (E4-T1)

```ts
/**
 * SPEC-020 — Recency Penalty. Hàm thuần: không đọc DB, không tự biết "hôm
 * nay" là ngày nào. Mọi thứ đi vào qua tham số, đúng DoD của E4-T1.
 *
 * Nhận MẢNG ngày chứ không phải một ngày duy nhất — đó là điều làm `TC-084`
 * có ý nghĩa. BR-046 "Multi-source Collapse": cùng một người ăn cùng một món
 * ở hai Group khác nhau trong cùng một ngày chỉ tính LÀ MỘT lần ăn. Lấy ngày
 * lớn nhất là collapse theo cấu trúc — không cần đếm, không cần khử trùng
 * lặp riêng.
 *
 * `cooldownWindowDays` là tham số chứ không phải hằng số cục bộ: hằng số đó
 * thuộc `RANKING_CONFIG` bên `features/selection`, mà `history` KHÔNG được
 * import `selection` (`eslint.config.mjs` → `ALLOWED_CROSS_FEATURE`). Xem
 * Implementation Guide §1.3.
 */

/** Ngày lịch dạng `YYYY-MM-DD`, đã quy đổi sang timezone của Group từ trước. */
type CalendarDate = string

function toUtcMidnight(date: CalendarDate): number {
  const parsed = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`recency: ngày không hợp lệ: "${date}"`)
  }
  return parsed.getTime()
}

const MS_PER_DAY = 86_400_000

/**
 * Số ngày LỊCH kể từ lần ăn gần nhất. `null` = chưa từng ăn ($d = \infty$ theo
 * cách nói của Ranking Spec §2.5) — `buildDeck` cần phân biệt để tie-break,
 * nên đây là hàm export riêng chứ không phải biến cục bộ.
 *
 * Parse ở UTC midnight (cùng khuôn `formatVietnameseDate` đã có): hai mốc đều
 * là nửa đêm UTC nên hiệu luôn là bội số nguyên của một ngày — không lệch do
 * DST, không lệch qua ranh giới tháng hay năm nhuận.
 */
export function daysSinceLastEaten(input: {
  readonly eatingDates: readonly CalendarDate[]
  readonly referenceDate: CalendarDate
}): number | null {
  if (input.eatingDates.length === 0) {
    return null
  }

  // Chuỗi `YYYY-MM-DD` so sánh từ điển TRÙNG với so sánh thời gian — không
  // cần parse để tìm max.
  let latest = input.eatingDates[0] as CalendarDate
  for (const date of input.eatingDates) {
    if (date > latest) {
      latest = date
    }
  }

  const diffMs = toUtcMidnight(input.referenceDate) - toUtcMidnight(latest)
  return Math.round(diffMs / MS_PER_DAY)
}

/**
 * $R = \max\left(0, 1 - \frac{d}{\text{window}}\right)$, chặn trên tại 1.
 *
 * SPEC-020 ghi đầu ra là $R \in [0, 1]$ nhưng công thức chỉ có `max(0, …)`.
 * Nếu `eatingDates` chứa ngày MUỘN HƠN `referenceDate` thì $d$ âm và
 * $1 - d/7 > 1$ — phá vỡ đúng cái hợp đồng SPEC-020 tự tuyên bố. Không có TC
 * nào cho ca này và nó không nên xảy ra trong dữ liệu thật (lịch sử ăn sinh
 * từ Session đã FINALIZED, luôn ở quá khứ hoặc hôm nay), nhưng chặn trên là
 * một phép `Math.min` — rẻ hơn nhiều so với việc đi tìm một điểm số > 1 lọt
 * vào `buildDeck` rồi tự hỏi vì sao thứ tự deck vô lý.
 */
export function computeRecencyPenalty(input: {
  readonly eatingDates: readonly CalendarDate[]
  readonly referenceDate: CalendarDate
  readonly cooldownWindowDays: number
}): number {
  const d = daysSinceLastEaten(input)
  if (d === null) {
    return 0
  }

  return Math.min(1, Math.max(0, 1 - d / input.cooldownWindowDays))
}
```

## 4.1 Test — `recency.test.ts`

Toàn bộ tầng `D`, **không một dòng mock nào** — đó là DoD của E4-T1.

```ts
import { describe, expect, it } from 'vitest'

import { computeRecencyPenalty, daysSinceLastEaten } from './recency'

const WINDOW = 7
const TODAY = '2026-08-19'

function penaltyAfter(days: number): number {
  // Dựng ngày ăn cách `TODAY` đúng `days` ngày, không hardcode từng chuỗi.
  const eaten = new Date(Date.UTC(2026, 7, 19) - days * 86_400_000)
    .toISOString()
    .slice(0, 10)
  return computeRecencyPenalty({
    eatingDates: [eaten],
    referenceDate: TODAY,
    cooldownWindowDays: WINDOW,
  })
}

describe('computeRecencyPenalty', () => {
  it('TC-079 — ăn hôm nay (d = 0): R = 1.0', () => {
    expect(penaltyAfter(0)).toBe(1)
  })

  it('TC-080 — ăn 3 ngày trước (d = 3): R ≈ 0.57', () => {
    expect(penaltyAfter(3)).toBeCloseTo(0.57, 2)
  })

  it('TC-081 — ăn đúng 7 ngày trước (d = 7): R = 0.0 (biên đóng)', () => {
    expect(penaltyAfter(7)).toBe(0)
  })

  it('TC-082 — ăn 20 ngày trước (d = 20): R = 0.0, không âm', () => {
    expect(penaltyAfter(20)).toBe(0)
  })

  it('TC-083 — chưa từng ăn: R = 0.0', () => {
    expect(
      computeRecencyPenalty({ eatingDates: [], referenceDate: TODAY, cooldownWindowDays: WINDOW }),
    ).toBe(0)
  })

  it('TC-084 — hai bản ghi cùng món cùng ngày: collapse thành một lần ăn', () => {
    const once = computeRecencyPenalty({
      eatingDates: ['2026-08-19'],
      referenceDate: TODAY,
      cooldownWindowDays: WINDOW,
    })
    const twice = computeRecencyPenalty({
      eatingDates: ['2026-08-19', '2026-08-19'],
      referenceDate: TODAY,
      cooldownWindowDays: WINDOW,
    })

    expect(twice).toBe(once)
    expect(twice).toBe(1)
  })

  it('khớp trọn bảng giá trị Ranking Spec §2.2', () => {
    expect(penaltyAfter(0)).toBeCloseTo(1.0, 2)
    expect(penaltyAfter(1)).toBeCloseTo(0.86, 2)
    expect(penaltyAfter(3)).toBeCloseTo(0.57, 2)
    expect(penaltyAfter(6)).toBeCloseTo(0.14, 2)
    expect(penaltyAfter(7)).toBeCloseTo(0.0, 2)
  })

  it('nhiều ngày khác nhau: lấy lần ăn GẦN NHẤT', () => {
    expect(
      computeRecencyPenalty({
        eatingDates: ['2026-08-01', '2026-08-18', '2026-07-15'],
        referenceDate: TODAY,
        cooldownWindowDays: WINDOW,
      }),
    ).toBeCloseTo(0.86, 2) // d = 1, không phải d = 18 hay d = 35
  })

  it('ngày ăn muộn hơn referenceDate: chặn trên tại 1, không vượt hợp đồng R ∈ [0,1]', () => {
    expect(
      computeRecencyPenalty({
        eatingDates: ['2026-08-22'],
        referenceDate: TODAY,
        cooldownWindowDays: WINDOW,
      }),
    ).toBe(1)
  })
})

describe('daysSinceLastEaten', () => {
  it('chưa từng ăn trả null, không phải 0 — 0 nghĩa là "ăn hôm nay"', () => {
    expect(daysSinceLastEaten({ eatingDates: [], referenceDate: TODAY })).toBeNull()
    expect(daysSinceLastEaten({ eatingDates: [TODAY], referenceDate: TODAY })).toBe(0)
  })

  it('đúng qua ranh giới tháng và năm nhuận', () => {
    expect(daysSinceLastEaten({ eatingDates: ['2026-07-31'], referenceDate: '2026-08-03' })).toBe(3)
    expect(daysSinceLastEaten({ eatingDates: ['2024-02-28'], referenceDate: '2024-03-01' })).toBe(2)
    expect(daysSinceLastEaten({ eatingDates: ['2026-12-30'], referenceDate: '2027-01-02' })).toBe(3)
  })

  it('ngày không hợp lệ thì ném RangeError, không trả NaN im lặng', () => {
    expect(() => daysSinceLastEaten({ eatingDates: ['khong-phai-ngay'], referenceDate: TODAY })).toThrow(
      RangeError,
    )
  })
})
```

> Bảng giá trị và ba ca ranh giới tháng/năm nhuận ở trên đã được chạy thử bằng Node trước khi viết guide — `0.8571→0.86`, `0.5714→0.57`, `0.1429→0.14`, và cả ba phép trừ ngày ra đúng `3 / 2 / 3`.

---

# 5. `src/features/selection/domain/ranking.ts` — MỚI (E4-T2)

```ts
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
```

**`Infinity - Infinity = NaN`** là cái bẫy thật của hàm này: hai món cùng chưa từng ăn (rất phổ biến ở nhóm mới — Ranking Spec §2.6 "Cold Start") sẽ cho `NaN`, và `Array.prototype.sort` với comparator trả `NaN` cho thứ tự **không xác định**. Kiểm `Number.isNaN` trước là bắt buộc, không phải phòng thủ thừa.

**`[...input.eligible]`** — `sort` sửa mảng tại chỗ; `eligible` là `readonly` nên phải sao chép, nếu không `tsc` đỏ và (tệ hơn) mảng của người gọi bị xáo.

## 5.1 Test — `ranking.test.ts`

```ts
import { describe, expect, it } from 'vitest'

import { buildDeck, computePersonalScore, stableHash } from './ranking'
import { RANKING_CONFIG } from './ranking-config'

const SEED = { sessionId: 'sess-1', userId: 'user-1' }

function dish(dishId: string, daysSinceLastEaten: number | null, recencyPenalty: number) {
  return { dishId, daysSinceLastEaten, recencyPenalty }
}

describe('computePersonalScore', () => {
  it('v1.0 chỉ có số hạng recency: score = −0.25 × R', () => {
    expect(computePersonalScore({ recencyPenalty: 1 }, RANKING_CONFIG)).toBeCloseTo(-0.25, 6)
    expect(computePersonalScore({ recencyPenalty: 0 }, RANKING_CONFIG)).toBe(-0)
  })

  it('R càng lớn điểm càng thấp — món vừa ăn bị đẩy xuống', () => {
    const justEaten = computePersonalScore({ recencyPenalty: 1 }, RANKING_CONFIG)
    const longAgo = computePersonalScore({ recencyPenalty: 0 }, RANKING_CONFIG)
    expect(longAgo).toBeGreaterThan(justEaten)
  })
})

describe('buildDeck', () => {
  it('TC-043 — chưa từng ăn B xếp trên A vừa ăn hôm qua', () => {
    const order = buildDeck(
      { ...SEED, eligible: [dish('A', 1, 0.857), dish('B', null, 0)] },
      RANKING_CONFIG,
    )

    expect(order).toEqual(['B', 'A'])
  })

  it('TC-042 — hai user khác lịch sử ăn cho ra thứ tự khác nhau', () => {
    // Cùng tập món, nhưng lịch sử ăn khác nhau nên `recencyPenalty` khác nhau.
    const orderUser1 = buildDeck(
      {
        sessionId: 'sess-1',
        userId: 'user-1',
        eligible: [dish('A', 0, 1), dish('B', null, 0)],
      },
      RANKING_CONFIG,
    )
    const orderUser2 = buildDeck(
      {
        sessionId: 'sess-1',
        userId: 'user-2',
        eligible: [dish('A', null, 0), dish('B', 0, 1)],
      },
      RANKING_CONFIG,
    )

    expect(orderUser1).toEqual(['B', 'A'])
    expect(orderUser2).toEqual(['A', 'B'])
  })

  it('cùng score (R = 0): món lâu chưa ăn hơn lên trước', () => {
    const order = buildDeck(
      { ...SEED, eligible: [dish('gan', 8, 0), dish('lau', 40, 0), dish('chua-an', null, 0)] },
      RANKING_CONFIG,
    )

    expect(order).toEqual(['chua-an', 'lau', 'gan'])
  })

  it('hoà hoàn toàn (cùng chưa ăn bao giờ): thứ tự XÁC ĐỊNH, lặp lại y hệt', () => {
    const eligible = [dish('x', null, 0), dish('y', null, 0), dish('z', null, 0)]

    const first = buildDeck({ ...SEED, eligible }, RANKING_CONFIG)
    const second = buildDeck({ ...SEED, eligible: [...eligible].reverse() }, RANKING_CONFIG)

    expect(first).toEqual(second) // không phụ thuộc thứ tự đầu vào
    expect(new Set(first).size).toBe(3) // không mất món nào
  })

  it('không sửa mảng đầu vào', () => {
    const eligible = [dish('A', 0, 1), dish('B', null, 0)]
    const snapshot = eligible.map((d) => d.dishId)

    buildDeck({ ...SEED, eligible }, RANKING_CONFIG)

    expect(eligible.map((d) => d.dishId)).toEqual(snapshot)
  })

  it('danh sách rỗng: trả mảng rỗng, không ném (TC-102 ở tầng D)', () => {
    expect(buildDeck({ ...SEED, eligible: [] }, RANKING_CONFIG)).toEqual([])
  })
})

describe('stableHash', () => {
  it('xác định: cùng seed cho cùng giá trị', () => {
    expect(stableHash('a:b:c')).toBe(stableHash('a:b:c'))
  })

  it('nhạy với từng thành phần của seed', () => {
    expect(stableHash('s1:u1:d1')).not.toBe(stableHash('s1:u2:d1'))
    expect(stableHash('s1:u1:d1')).not.toBe(stableHash('s1:u1:d2'))
  })

  it('luôn là số nguyên không âm 32-bit', () => {
    for (const seed of ['', 'a', 'sess:user:dish', 'x'.repeat(200)]) {
      const h = stableHash(seed)
      expect(Number.isInteger(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(0xffffffff)
    }
  })
})
```

> Tính xác định và độ phân tán của `stableHash` đã chạy thử trước khi viết guide: 2000 seed khác nhau cho ra đúng 2000 giá trị phân biệt, và đổi bất kỳ thành phần nào của seed đều đổi kết quả.

---

# 6. Vì sao `daysSinceLastEaten` là export riêng

Người đọc dễ hỏi: đã có `recencyPenalty` rồi thì `buildDeck` cần `daysSinceLastEaten` làm gì nữa, có phải dữ liệu thừa không?

Không — nó mang thông tin mà `R` đã **làm mất**. `R = max(0, 1 − d/7)` ép mọi $d \ge 7$ về cùng một giá trị 0. Món ăn cách đây 8 ngày và món chưa từng ăn bao giờ có `R` giống hệt nhau, nhưng Ranking Spec §2.5 đòi món chưa từng ăn phải lên trước. Chỉ `d` phân biệt được.

Ngoài ra `d` còn là dữ liệu mà **S4 cần** để hiện nhãn *"Lần cuối ăn · 3 ngày trước"* thay cho chuỗi cứng `'Chưa từng ăn'` hiện tại (`deck-screen.tsx:24`). Đưa nó thành một khái niệm hạng nhất từ bây giờ để S2 chỉ việc truyền tiếp, không phải tính lại.

---

# 7. Rủi ro

| Rủi ro | Hậu quả | Giảm thiểu |
|---|---|---|
| Quên kiểm `Number.isNaN` ở tie-break tầng 2 | Nhóm mới (mọi món chưa ăn) cho comparator trả `NaN` → thứ tự deck không xác định, `TC-041` ở S2 sẽ đỏ ngẫu nhiên | Đã xử lý ở §5; test "hoà hoàn toàn" bắt đúng ca này |
| Hardcode `7` trong `recency.ts` cho tiện | Vi phạm nguyên tắc 4 (Ranking Spec §1); hai nguồn sự thật lệch nhau khi đổi cửa sổ cooldown | Tham số hoá, §1.3 |
| Thêm `explicit`/`implicit`/`chef`/`source` vào `RankingInput` "cho đủ công thức" | Tạo ảo giác tính năng đã có; không dữ liệu nào điền được, và mọi call site phải truyền số 0 vô nghĩa | Chỉ khai trường có dữ liệu thật; §5 |
| Dùng `node:crypto` cho `stableHash` | Kéo phụ thuộc vào `domain/`, đi ngược Tech Spec §2.4 | FNV-1a thuần TS, §5 |
| Ghép luồng Explore vì Ranking Spec Stage 3 có mô tả | Làm sớm một tính năng v1.1, phình phạm vi đường găng | §1.2 — `F18` là Should/v1.1, hai comment trong code đã đánh dấu sẵn |

---

# 8. Test Cases coverage

| TC | Mô tả | Tầng | Nơi test |
|---|---|---|---|
| `TC-079` | $d = 0$ → $R = 1.0$ | `D` | `recency.test.ts` |
| `TC-080` | $d = 3$ → $R \approx 0.57$ | `D` | `recency.test.ts` |
| `TC-081` | $d = 7$ → $R = 0.0$ | `D` | `recency.test.ts` |
| `TC-082` | $d = 20$ → $R = 0.0$ | `D` | `recency.test.ts` |
| `TC-083` | Chưa từng ăn → $R = 0.0$ | `D` | `recency.test.ts` |
| `TC-084` | Hai bản ghi cùng ngày → collapse một lần ăn | `D` | `recency.test.ts` |
| `TC-042` | Hai user khác lịch sử → thứ tự deck khác nhau | `D` | `ranking.test.ts` |
| `TC-043` | Món chưa ăn xếp trên món vừa ăn hôm qua | `D` | `ranking.test.ts` |
| `TC-040`, `TC-041`, `TC-044` | — | `A` | **S2** (cần use case + DB thật) — xem §1.5 |

---

# 9. Thứ tự TDD

1. `recency.test.ts` → `recency.ts`
2. `ranking-config.ts` (hằng số, không test riêng — giá trị được các test dưới dùng gián tiếp)
3. `ranking.test.ts` → `ranking.ts`
4. `yarn verify && yarn arch:probe`

---

# 10. Verify

## 10.1 Cổng máy

```bash
yarn verify && yarn arch:probe
```

`yarn test` phải in hai nhóm mới: `computeRecencyPenalty` / `daysSinceLastEaten`, và `computePersonalScore` / `buildDeck` / `stableHash`.

**Không có `yarn test:integration` ở slice này** — toàn bộ tầng `D`, không chạm DB. Nếu bạn thấy mình cần một test tích hợp ở đây, đó là dấu hiệu code đã rò xuống hạ tầng: kiểm lại xem có import nào ngoài `./ranking-config` không.

`yarn arch:probe` là cổng đáng chú ý nhất của slice:
- `history/domain/recency.ts` **không được** import bất cứ thứ gì từ `features/selection` (chiều đó không nằm trong `ALLOWED_CROSS_FEATURE`).
- Cả ba file `domain/` không được chạm `shared/db`, `drizzle-orm`, `react`, `next` — ESLint chặn sẵn, nhưng biết trước thì không mất thời gian gỡ.

## 10.2 Đối chiếu tay bảng giá trị

Cách nhanh nhất để tin thuật toán đúng là so với bảng in sẵn trong Ranking Spec §2.2:

| $d$ | Ranking Spec | Hàm phải trả |
|---:|---:|---:|
| 0 | `1.00` | `1.0` |
| 1 | `0.86` | `0.857…` |
| 3 | `0.57` | `0.571…` |
| 6 | `0.14` | `0.142…` |
| ≥ 7 hoặc chưa ăn | `0.00` | `0` |

Test `'khớp trọn bảng giá trị Ranking Spec §2.2'` (§4.1) chính là bảng này viết thành code — nếu nó xanh thì không cần kiểm tay thêm.

## 10.3 Một phép thử tinh thần cho `buildDeck`

Chưa có UI để nhìn, nên cách kiểm nhanh ý nghĩa sản phẩm: dựng một mảng gồm ba món — một món ăn hôm nay ($R=1$), một món ăn 10 ngày trước ($R=0$, $d=10$), một món chưa ăn bao giờ ($R=0$, $d=$ null) — và xác nhận thứ tự ra là **chưa-ăn → 10-ngày-trước → hôm-nay**. Đó đúng là câu mà cả epic này tồn tại để trả lời: *"tối nay ăn gì thì đừng gợi ý lại món tối qua"*.

---

# 11. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v1.1.md`

```markdown
# DEC-036 — v1.0 Personal Score Uses Only the Recency Term; Two-Level Tie-Break

**Ngày quyết định:** 2026-08-19 | **Trạng thái:** Accepted

## Quyết định

`computePersonalScore` implements `score = −w_recency × R` only. `RankingInput`
declares just `recencyPenalty`. `buildDeck` sorts by score, then by days-since-
last-eaten (never-eaten first), then by `stableHash` — two tie-break levels, not
the three in Ranking Spec §2.5.

## Rationale

Ranking Spec §2.2 (Approved) defines five score terms, but SDD SPEC-010 states
the v1.0 rule explicitly and narrowly: `score = −w_recency × R`. The other four
terms have no data source in v1.0 — `E` needs Like/Dislike (F16, v1.1), `I`
needs Implicit Preference (F30, v1.2), `C` needs Chef Mode (F33, v1.2), `S`
needs Purchase Source (F36, v1.2). SPEC-010 likewise drops Ranking Spec §2.5's
middle tie-break ("known purchase source first") for the same reason.

Declaring the unused terms on `RankingInput` would force every call site to
pass meaningless zeros and would suggest a capability that does not exist. The
weights themselves ARE kept, in `RANKING_CONFIG`, because Ranking Spec §1
principle 4 requires all constants to live in exactly one place.

Explore Lane interleaving (Ranking Spec Stage 3 / BR-047) and mid-session deck
freezing (§2.7 / BR-048) are likewise out of E4: PRD §6 schedules "Explore lane
20%" for v1.1, and E1-S5 already marked both as `F18/v1.1` in shipped code
comments.

## Consequence

When F16/F30/F33/F36 land, extend `RankingInput` and `computePersonalScore`
together — the config values are already present and correct. Reviewers of E4
should expect a one-term formula and not treat it as an incomplete port of the
Ranking Spec.

## Affected Documents

- Ranking Spec §2.2, §2.5 (documents the v1.0 narrowing; specs unchanged)
- SDD SPEC-010 (the governing contract)
```

```markdown
# DEC-037 — `buildDeck` Takes an Input Object, Not the Bare Array of Tech Spec §2.4

**Ngày quyết định:** 2026-08-19 | **Trạng thái:** Accepted

## Quyết định

`buildDeck(input: BuildDeckInput, config: RankingConfig)` where
`BuildDeckInput = { sessionId, userId, eligible }`, instead of Tech Spec §2.4's
`buildDeck(eligible: DishRankingInput[], config: RankingConfig)`.
`computePersonalScore` and `computeSessionScore` keep their §2.4 signatures.

## Rationale

The third tie-break level is `stable_hash(session_id, user_id, dish_id)`
(Ranking Spec §2.5, SDD SPEC-010). The two-parameter signature has nowhere to
carry a per-(session, user) seed. The alternative — duplicating `sessionId` and
`userId` onto every element of `eligible` — repeats two values N times and
creates a class of bug where elements disagree about which session they belong
to. Tech Spec §2.4 is an illustrative shape sketch for the module, not a
byte-exact contract.

## Consequence

E5-T6's `computeSessionScore` lands in this same file and should keep the §2.4
signature — this deviation is specific to `buildDeck`'s seed requirement.

## Affected Documents

- Tech Spec §2.4 (signature sketch; not updated in place)
```

---

# 12. Master Plan

Sau khi `yarn verify` và `yarn arch:probe` xanh: tick `E4-T1` và `E4-T2` ở §6. Mốc **M4** thuộc `E4-T9` (slice S4), chưa đạt ở đây.
