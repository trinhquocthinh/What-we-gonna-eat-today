# 🎴 Implementation Guide — E4 Slice S4: UI vuốt hoàn chỉnh

> **Document Metadata**
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-19`
> - **Upstream:** [Master Plan](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E4-T7`, `E4-T8`, `E4-T9`) • [Design Criteria](../../what-we-gonna-eat-today_design-criteria_v1.0.md) (§5, §7, §8, §10) • [PRD](../../what-we-gonna-eat-today_prd_v1.5.md) (`NFR-03`)
> - **Tiền đề bắt buộc:** `S1`, `S2`, `S3` (E4-T1→T6) đã code.
>
> 🎴 *Slice cuối của E4 — mốc M4. Phần lớn UI đã đúng từ E1-T8; việc thật ở đây là lấp hai chỗ dữ liệu giả mà S1 đã hẹn, tách một component theo đúng hợp đồng design system, và đóng vài khoảng hở nhỏ.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File (Master Plan) | DoD |
|---|---|---|---|---|
| `E4-T7` | Thẻ món và cử chỉ vuốt | 3 | `.../dish-card.tsx` | Nghiêng tối đa 8°, lớp phủ theo hướng, vuốt trái không dùng màu đỏ |
| `E4-T8` | Nút vuốt và khả năng tiếp cận | 2 | `.../swipe-controls.tsx` | Mọi cử chỉ có nút tương đương; nhãn screen reader đầy đủ; vùng chạm ≥44px |
| `E4-T9` | Chỉ báo tiến độ và lối vào Completed | 1 | như trên | Hết deck hiện gợi ý "Tôi chọn xong" — **Cột mốc M4** |

- [x] `lastEatenLabel` hiện số ngày thật, không còn hardcode `'Chưa từng ăn'`
- [x] Câu giải thích chỉ đổi khi vừa ăn gần đây (R > 0), còn lại giữ trung tính
- [x] `SwipeControls` tồn tại thành file riêng, đúng hợp đồng Design Criteria §5
- [x] `Hoàn tác`/`Tôi chọn xong` có `aria-label` câu hoàn chỉnh
- [x] Test tĩnh xác nhận không style nào cho "vuốt trái" tham chiếu màu đỏ
- [x] `use-swipe-gesture.ts` có test riêng (hiện đang 0 test)
- [x] `yarn verify && yarn arch:probe` xanh

---

# 1. Phát hiện lớn nhất: phần lớn DoD đã đạt từ E1-T8 — nhưng KHÔNG phải tất cả

Đã đọc verbatim toàn bộ `dish-swipe-card.tsx`, `use-swipe-gesture.ts`, `swipe-gesture.ts` (domain), và `deck-screen.tsx` hiện có. Đối chiếu từng DoD:

| DoD | Trạng thái | Bằng chứng |
|---|---|---|
| Nghiêng tối đa 8° | ✅ Đã đúng | `computeDragRotationDeg`: `Math.max(-8, Math.min(8, dx/18))`, đã test đầy đủ ở `swipe-gesture.test.ts` (E1-T8) |
| Lớp phủ theo hướng | ✅ Đã đúng | `DIRECTION_STYLES` đổi `background`/`border`/nhãn theo `previewDirection` |
| Vuốt trái không dùng màu đỏ | ✅ Đã đúng | `[-1]: { background: 'bg-no-soft', border: 'border-no', ... }` — không có `bg-red-*`/`danger` ở đâu trong file |
| Mọi cử chỉ có nút tương đương | ✅ Đã đúng | "Không hôm nay"/"Đề xuất" gọi đúng `handleCommit` mà thao tác vuốt cũng gọi |
| Nhãn screen reader đầy đủ | 🟡 Gần đúng | Hai nút vuốt đã có `aria-label` câu hoàn chỉnh; **"Hoàn tác" và "Tôi chọn xong" thì KHÔNG** — chỉ có chữ hiển thị |
| Vùng chạm ≥44px | 🟡 Gần đúng | Chiều cao luôn đạt (`min-h-11`+); "Hoàn tác" không có `min-w` tường minh |
| Hết deck gợi ý "Tôi chọn xong" | ✅ Đã đúng | Khối `isEmpty` đã có nút này từ E1-T8 |

**Nhưng có một việc CHƯA làm, và nó lớn hơn cả bảng trên** — `dish-swipe-card.tsx` hiện nhận `lastEatenLabel`/`explanation` như hai PROP, và `deck-screen.tsx` đang truyền **hằng số cứng**:

```ts
const GENERIC_EXPLANATION = 'Món này đang có trong danh mục của nhóm.'
const NEVER_EATEN_LABEL = 'Chưa từng ăn' // eating_history chưa tồn tại (E1-T11)
```

Đây chính là hai chỗ giả mà **guide S1 đã hẹn lấp ở đây**: *"Mọi thứ thuộc UI (nhãn 'Lần cuối ăn', chip lý do) — S4. Người dùng đã chốt sẽ lấp ở S4 bằng dữ liệu thật + chip chỉ hiện khi R > 0."* Việc thật lớn nhất của slice này là giữ đúng lời hẹn đó — không phải rotation hay màu sắc, những thứ đã đúng từ đầu.

**Đính chính một chữ dùng sai của chính tôi**: ở câu hỏi lúc lên kế hoạch S1, tôi gọi đây là "chip lý do". Đọc lại code thật thì `explanation` render thành **một dòng chữ thường** ở cuối thẻ (`<span className="text-pretty text-body font-normal ...">{explanation}</span>`), không phải một chip có nền màu. Không có gì cần sửa về mặt kỹ thuật — chỉ là từ "chip" tôi dùng lúc hỏi không khớp phần tử thật; ý chính (nội dung câu chữ chỉ đổi khi có gì đáng nói) vẫn giữ nguyên.

---

# 2. Sửa lại S2: `list-deck.ts` phải LUÔN đọc lịch sử ăn, không chỉ lúc materialize lần đầu

Guide S2 (E4-T3/T4) thiết kế: chỉ gọi `history.findEatingDates` khi `findMaterializedDeck` trả `null` (lần đầu mở deck) — mục đích là tiết kiệm một query ở những lần mở sau, vì **thứ tự** deck đã đóng băng nên không cần tính lại ranking.

Nhưng `lastEatenLabel` không phải một phần của THỨ TỰ — nó là DỮ LIỆU HIỂN THỊ, và phải đúng ở MỌI lần mở, không chỉ lần đầu. Nếu giữ nguyên thiết kế S2, lần mở thứ hai trở đi sẽ không có dữ liệu lịch sử để tính `lastEatenLabel`, buộc phải lại quay về giá trị giả.

**Sửa**: tách hai việc trong `list-deck.ts` — đọc lịch sử ăn (`history.findEatingDates`) chạy ở **MỌI** lần gọi; chỉ có bước TÍNH RANKING + GHI vào `session_decks` (`buildDeck` + `materializeDeck`) mới còn điều kiện `orderedDishIds === null`. Đây không phải viết lại kiến trúc S2 — chỉ di chuyển MỘT lời gọi ra khỏi nhánh điều kiện. Chi phí thêm: một SELECT có index (`eating_history_user_dish_date_idx`) mỗi lần mở trang deck — đây là tải trang, không phải request vuốt, nên không đụng tới NFR-02 (chỉ áp cho phản hồi thao tác vuốt, không áp cho tải trang ban đầu).

---

# 3. Tách `SwipeControls` — đúng hợp đồng Design Criteria §5, không phải chỉ để khớp tên file

Design Criteria §5 ("Thư viện UI Components") liệt kê `SwipeControls` cùng hàng với `DishCard`, `TagChip`, `Sheet`, `Skeleton` — tức là một **hợp đồng component**, không phải gợi ý đặt tên file. Nguyên văn:

> `SwipeControls:` Cụm 2 nút bấm lớn ở nửa dưới màn hình kèm nút Undo ở giữa (bắt buộc có để hỗ trợ accessibility).

Hiện cụm này nằm INLINE trong `deck-screen.tsx` (khối `isDeck` ở JSX đáy màn). Tách nó ra **đúng đúng phạm vi mô tả** — hai nút vuốt lớn + Undo — không kéo theo khối `isEmpty`/`isDone` (những khối đó không thuộc mô tả `SwipeControls`, ở lại `deck-screen.tsx`).

**Không đổi tên `dish-swipe-card.tsx` thành `dish-card.tsx`.** Master Plan's cột File dùng tên đó, nhưng đây là file đã ship, đã có lịch sử test từ E1-T8 — đổi tên chỉ để khớp một cột mô tả trong tài liệu kế hoạch là xáo trộn không cần thiết (git blame, import ở `deck-screen.tsx`, không lợi ích chức năng nào). Giữ nguyên tên hiện tại.

---

# 4. Một trích dẫn tài liệu sai — ghi nhận, không tự sửa Master Plan

Master Plan trích `[Design §4]`/`[Design §7]` trỏ về `docs/designs/README.md`. Đọc file đó: nó chỉ có §1→§6 (Tổng quan, Ràng buộc, Tokens, Danh mục màn hình, Quy tắc Component, Lịch sử) — **không có §7**. Nội dung khớp với DoD của E4-T7/T8 (nghiêng 8°, không màu đỏ, vùng chạm 44px, nhãn screen reader) thực ra nằm ở `design-criteria_v0_1.md` §5/§7/§8/§10 — một file khác. Đây là kiểu lệch trích dẫn đã gặp nhiều lần trong dự án (đánh số S-07/S-08/S-09 giữa hai tài liệu thiết kế) — ghi nhận ở đây, không tự sửa Master Plan.

---

# 5. File tree

```
src/features/selection/
  domain/
    dish-card.ts                      SỬA (+ daysSinceLastEaten)
  application/
    list-deck.ts / .test.ts           SỬA (đọc lịch sử ở mọi lần gọi — §2)
  presentation/components/
    dish-explanation.ts               + MỚI (formatLastEatenLabel/formatExplanation)
    dish-explanation.test.ts          + MỚI
    swipe-controls.tsx                + MỚI (tách từ deck-screen.tsx)
    swipe-controls.test.tsx           + MỚI
    deck-screen.tsx / .test.tsx       SỬA (dùng SwipeControls, dữ liệu thật)
    dish-swipe-card.tsx               SỬA (export DIRECTION_STYLES để test tĩnh)
    dish-swipe-card.test.tsx          SỬA (+ test tĩnh không màu đỏ)
    use-swipe-gesture.test.ts         + MỚI (0 test hiện tại)
```

---

# 6. `DishCard` — thêm `daysSinceLastEaten`

```ts
export type DishCard = {
  readonly dishId: string
  readonly globalDishId: string   // đã thêm ở S2
  readonly name: string
  readonly systemTags: readonly string[]
  readonly effectiveInteraction: InteractionType | null
  /**
   * MỚI — S4. `null` = chưa từng ăn. Dữ liệu THÔ, không phải câu chữ — câu
   * chữ tiếng Việt ("Lần cuối ăn · N ngày trước") thuộc `presentation/`, đúng
   * kỷ luật đã giữ xuyên suốt dự án (domain không chứa chuỗi hiển thị).
   */
  readonly daysSinceLastEaten: number | null
}
```

---

# 7. `list-deck.ts` — SỬA theo §2

```ts
export async function listDeck(
  deps: ListDeckDeps,
  input: ListDeckInput,
): Promise<Result<ListDeckResult, Failure>> {
  if (input.cursor < 0) {
    return err(failure('ERR_VALIDATION', { field: 'cursor' }))
  }

  const participant = await deps.selection.findParticipant(input.sessionId, input.userId)
  if (
    participant === null ||
    !ACCEPTED_PARTICIPANT_STATES.includes(participant.state as 'ACTIVE' | 'COMPLETED')
  ) {
    return err(failure('ERR_NOT_PARTICIPANT', { sessionId: input.sessionId }))
  }

  const eligible = await deps.selection.listEligibleDishCards(input.sessionId, participant.id)

  // SỬA (S4): đọc lịch sử ăn ở MỌI lần gọi — cần cho lastEatenLabel bất kể
  // deck đã materialize hay chưa. Xem Implementation Guide §2.
  const eatingRows = await deps.history.findEatingDates(
    input.userId,
    eligible.map((d) => d.globalDishId),
  )
  const eatingByDish = groupEatingDatesByDish(eatingRows)

  let orderedDishIds = await deps.selection.findMaterializedDeck(input.sessionId, input.userId)

  if (orderedDishIds === null) {
    // Chỉ bước TÍNH RANKING + GHI còn nằm trong nhánh điều kiện — không phải
    // việc đọc lịch sử (đã chuyển ra ngoài, ở trên).
    const rankingInputs = eligible.map((dish) => {
      const dates = eatingByDish.get(dish.globalDishId) ?? []
      return {
        dishId: dish.dishId,
        daysSinceLastEaten: daysSinceLastEaten({ eatingDates: dates, referenceDate: input.referenceDate }),
        recencyPenalty: computeRecencyPenalty({
          eatingDates: dates,
          referenceDate: input.referenceDate,
          cooldownWindowDays: RANKING_CONFIG.history.cooldownWindowDays,
        }),
      }
    })

    const built = buildDeck(
      { sessionId: input.sessionId, userId: input.userId, eligible: rankingInputs },
      RANKING_CONFIG,
    )

    const materialized = await deps.selection.materializeDeck(input.sessionId, input.userId, built)
    orderedDishIds =
      materialized.outcome === 'MATERIALIZED'
        ? built
        : ((await deps.selection.findMaterializedDeck(input.sessionId, input.userId)) ?? built)
  }

  const eligibleById = new Map(eligible.map((dish) => [dish.dishId, dish]))
  const orderedCards = orderedDishIds
    .map((dishId) => eligibleById.get(dishId))
    .filter((dish): dish is DishCard => dish !== undefined)
    .map((dish) => ({
      ...dish,
      // MỚI — S4. Tính từ CÙNG `eatingByDish` đã đọc ở trên, không query thêm.
      daysSinceLastEaten: daysSinceLastEaten({
        eatingDates: eatingByDish.get(dish.globalDishId) ?? [],
        referenceDate: input.referenceDate,
      }),
    }))

  const page = getDeckPage(orderedCards, input.cursor, input.pageSize)
  return ok({ items: [...page.items], nextCursor: page.nextCursor })
}
```

## 7.1 Test — sửa `list-deck.test.ts`

Đổi ca *"TC-041 — đã materialize: KHÔNG gọi history lại"* (viết ở S2) — **giờ SAI**, phải sửa thành:

```ts
it('TC-041 — đã materialize: KHÔNG tính lại ranking, NHƯNG vẫn đọc lịch sử cho nhãn hiển thị', async () => {
  const deps = makeDeps({
    eligible: [makeDishCard({ dishId: 'a' }), makeDishCard({ dishId: 'b' })],
    materialized: ['b', 'a'],
  })

  const result = await listDeck(deps, BASE_INPUT)

  expect(deps.history.findEatingDates).toHaveBeenCalledOnce() // ← đổi từ "not.toHaveBeenCalled"
  expect(deps.materializeDeck).not.toHaveBeenCalled() // ← vẫn giữ, KHÔNG ghi lại
  if (!result.ok) throw new Error('unreachable')
  expect(result.value.items.map((d) => d.dishId)).toEqual(['b', 'a']) // thứ tự vẫn không đổi
})

it('daysSinceLastEaten gắn đúng vào từng card, kể cả khi đã materialize', async () => {
  const deps = makeDeps({
    eligible: [makeDishCard({ dishId: 'a', globalDishId: 'ga' })],
    materialized: ['a'],
    eatingRows: [{ globalDishId: 'ga', eatingDate: '2026-08-17' }], // referenceDate 2026-08-19 → d=2
  })

  const result = await listDeck(deps, BASE_INPUT)

  if (!result.ok) throw new Error('unreachable')
  expect(result.value.items[0]?.daysSinceLastEaten).toBe(2)
})
```

---

# 8. `dish-explanation.ts` — MỚI

```ts
import { RANKING_CONFIG } from '../../domain/ranking-config'

/**
 * S4 — lấp chỗ giả `NEVER_EATEN_LABEL`/`GENERIC_EXPLANATION` mà S1 đã hẹn.
 * Chữ hiển thị tiếng Việt, đúng chỗ (presentation, không phải domain) —
 * cùng nguyên tắc `system-tag-label.ts` (E2), `participant-status.ts` (E3).
 */
export function formatLastEatenLabel(daysSinceLastEaten: number | null): string {
  if (daysSinceLastEaten === null) {
    return 'Chưa từng ăn'
  }
  if (daysSinceLastEaten === 0) {
    return 'Lần cuối ăn · hôm nay'
  }
  if (daysSinceLastEaten === 1) {
    return 'Lần cuối ăn · hôm qua'
  }
  return `Lần cuối ăn · ${daysSinceLastEaten} ngày trước`
}

/**
 * Chỉ đổi khi R > 0 (vừa ăn trong cửa sổ cooldown) — đúng quyết định đã chốt
 * lúc lên kế hoạch S1. Ngưỡng lấy TRỰC TIẾP từ `RANKING_CONFIG`, không hardcode
 * lại số 7 — một nguồn sự thật duy nhất (Ranking Spec §1 nguyên tắc 4).
 */
export function formatExplanation(daysSinceLastEaten: number | null): string {
  if (daysSinceLastEaten !== null && daysSinceLastEaten < RANKING_CONFIG.history.cooldownWindowDays) {
    return 'Vừa ăn gần đây.'
  }
  return 'Món này đang có trong danh mục của nhóm.'
}
```

## 8.1 Test — `dish-explanation.test.ts`

```ts
import { describe, expect, it } from 'vitest'

import { formatExplanation, formatLastEatenLabel } from './dish-explanation'

describe('formatLastEatenLabel', () => {
  it('chưa từng ăn', () => {
    expect(formatLastEatenLabel(null)).toBe('Chưa từng ăn')
  })
  it('hôm nay và hôm qua có chữ riêng, không phải "0/1 ngày trước"', () => {
    expect(formatLastEatenLabel(0)).toBe('Lần cuối ăn · hôm nay')
    expect(formatLastEatenLabel(1)).toBe('Lần cuối ăn · hôm qua')
  })
  it('từ 2 ngày trở lên: "N ngày trước"', () => {
    expect(formatLastEatenLabel(5)).toBe('Lần cuối ăn · 5 ngày trước')
  })
})

describe('formatExplanation', () => {
  it('trong cửa sổ cooldown (R > 0): câu "vừa ăn gần đây"', () => {
    expect(formatExplanation(0)).toBe('Vừa ăn gần đây.')
    expect(formatExplanation(6)).toBe('Vừa ăn gần đây.')
  })
  it('ngoài cửa sổ hoặc chưa từng ăn: câu trung tính', () => {
    expect(formatExplanation(7)).toBe('Món này đang có trong danh mục của nhóm.')
    expect(formatExplanation(null)).toBe('Món này đang có trong danh mục của nhóm.')
  })
})
```

---

# 9. `swipe-controls.tsx` — MỚI, tách từ `deck-screen.tsx`

```tsx
'use client'

import type { ReactElement } from 'react'

import { Button } from '@/shared/ui/button'

export type SwipeControlsProps = {
  /** `null` khi deck rỗng — hai nút vuốt và Undo không hiện `aria-label` động. */
  currentDishName: string | null
  canUndo: boolean
  onSwipeLeft: () => void
  onSwipeRight: () => void
  onUndo: () => void
  onFinish: () => void
}

/**
 * Design Criteria §5 — "Cụm 2 nút bấm lớn ở nửa dưới màn hình kèm nút Undo ở
 * giữa (bắt buộc có để hỗ trợ accessibility)." Tách nguyên khối từ
 * `deck-screen.tsx` (E1-T8) — hành vi KHÔNG đổi, chỉ đổi chỗ ở.
 *
 * KHÔNG kéo theo khối "hết deck"/"đã xong lượt" — Design Criteria mô tả đúng
 * ba nút này, không phải toàn bộ thanh điều khiển đáy màn.
 */
export function SwipeControls({
  currentDishName,
  canUndo,
  onSwipeLeft,
  onSwipeRight,
  onUndo,
  onFinish,
}: SwipeControlsProps): ReactElement {
  return (
    <>
      <div className="flex gap-3">
        {/* `flex-1` bù lại `w-full` mà size="lg" đặt trên chính button. */}
        <Button
          type="button"
          variant="no"
          className="flex-1"
          aria-label={currentDishName === null ? undefined : `Không muốn ăn ${currentDishName} hôm nay`}
          onClick={onSwipeLeft}
        >
          Không hôm nay
        </Button>
        <Button
          type="button"
          variant="yes"
          className="flex-1"
          aria-label={currentDishName === null ? undefined : `Đề xuất ${currentDishName}`}
          onClick={onSwipeRight}
        >
          Đề xuất
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="quiet"
          size="sm"
          className="min-w-11"
          disabled={!canUndo}
          aria-label="Hoàn tác lượt vuốt vừa rồi"
          onClick={onUndo}
        >
          Hoàn tác
        </Button>
      </div>

      <Button
        type="button"
        variant="quiet"
        size="sm"
        aria-label="Tôi chọn xong, dừng vuốt cho lượt này"
        onClick={onFinish}
      >
        Tôi chọn xong
      </Button>
    </>
  )
}
```

**Hai `aria-label` mới** (`Hoàn tác`, `Tôi chọn xong`) — E4-T8's DoD nói "nhãn screen reader đầy đủ", và Design Criteria §8 đòi câu hoàn chỉnh cho mọi điều khiển, không chỉ hai nút vuốt. "Hoàn tác" đứng một mình dễ mơ hồ (hoàn tác CÁI GÌ?) — câu đầy đủ giải quyết đúng chỗ đó.

**`min-w-11`** trên nút Hoàn tác — DoD nói "vùng chạm ≥44px", chiều cao đã đạt qua `size="sm"` (`min-h-11`), chiều rộng giờ có bảo đảm tường minh thay vì trông chờ padding+chữ đủ rộng.

## 9.1 `deck-screen.tsx` — SỬA, dùng `SwipeControls` + dữ liệu thật

```tsx
import { formatExplanation, formatLastEatenLabel } from './dish-explanation'
import { SwipeControls } from './swipe-controls'
// xoá: import { Button } from '@/shared/ui/button' NẾU không còn dùng trực tiếp
//      trong file này nữa (isEmpty/isDone vẫn dùng Button — kiểm khi code, có
//      thể vẫn cần giữ import)

// XOÁ hai hằng số:
// const GENERIC_EXPLANATION = ...
// const NEVER_EATEN_LABEL = ...
```

Trong khối render thẻ:
```tsx
<DishSwipeCard
  dish={current}
  lastEatenLabel={formatLastEatenLabel(current.daysSinceLastEaten)}
  explanation={formatExplanation(current.daysSinceLastEaten)}
  upcomingNames={upcoming}
  onCommit={handleCommit}
/>
```

Thay khối `isDeck` ở đáy màn (toàn bộ đoạn từ `<div className="flex gap-3">` tới hết `Tôi chọn xong` đầu tiên) bằng:
```tsx
{isDeck ? (
  <SwipeControls
    currentDishName={current?.name ?? null}
    canUndo={cursor > 0}
    onSwipeLeft={() => current !== undefined && handleCommit(-1, current.dishId)}
    onSwipeRight={() => current !== undefined && handleCommit(1, current.dishId)}
    onUndo={handleUndo}
    onFinish={handleFinish}
  />
) : null}
```

Khối `isEmpty`/`isDone` **giữ nguyên hệt**, không di chuyển.

## 9.2 Test — `swipe-controls.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SwipeControls } from './swipe-controls'

const NOOP = { onSwipeLeft: vi.fn(), onSwipeRight: vi.fn(), onUndo: vi.fn(), onFinish: vi.fn() }

describe('SwipeControls', () => {
  it('có đủ 3 nút, đúng nhãn screen reader câu hoàn chỉnh', () => {
    render(<SwipeControls currentDishName="Cá basa kho tiêu" canUndo={true} {...NOOP} />)

    expect(screen.getByRole('button', { name: 'Không muốn ăn Cá basa kho tiêu hôm nay' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Đề xuất Cá basa kho tiêu' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Hoàn tác lượt vuốt vừa rồi' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Tôi chọn xong, dừng vuốt cho lượt này' })).toBeDefined()
  })

  it('canUndo=false: nút Hoàn tác bị disable', () => {
    render(<SwipeControls currentDishName="A" canUndo={false} {...NOOP} />)
    expect(screen.getByRole('button', { name: 'Hoàn tác lượt vuốt vừa rồi' })).toBeDisabled()
  })

  it('bấm từng nút gọi đúng callback tương ứng', async () => {
    const onSwipeRight = vi.fn()
    render(<SwipeControls currentDishName="A" canUndo={true} {...NOOP} onSwipeRight={onSwipeRight} />)

    await userEvent.click(screen.getByRole('button', { name: 'Đề xuất A' }))

    expect(onSwipeRight).toHaveBeenCalledOnce()
  })

  it('currentDishName null: hai nút vuốt không có aria-label động', () => {
    render(<SwipeControls currentDishName={null} canUndo={false} {...NOOP} />)

    expect(screen.getByRole('button', { name: 'Không hôm nay' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Đề xuất' })).toBeDefined()
  })
})
```

---

# 10. Bảo vệ tĩnh "vuốt trái không dùng màu đỏ"

`DoD` là một bất biến thiết kế cụ thể, đáng có một bài test giữ nguyên nó mãi mãi, không phải chỉ đọc code một lần rồi tin. Export `DIRECTION_STYLES` khỏi `dish-swipe-card.tsx` (hiện đang module-private):

```ts
// dish-swipe-card.tsx — đổi
const DIRECTION_STYLES: Record<...> = { ... }
// thành
export const DIRECTION_STYLES: Record<...> = { ... }
```

## 10.1 Test — thêm vào `dish-swipe-card.test.tsx`

```ts
import { DIRECTION_STYLES } from './dish-swipe-card'

describe('DIRECTION_STYLES — bất biến thiết kế', () => {
  it('KHÔNG hướng nào dùng màu đỏ/danger — Design Criteria §10 anti-pattern', () => {
    for (const style of Object.values(DIRECTION_STYLES)) {
      expect(style.background).not.toMatch(/red|danger/)
      expect(style.border).not.toMatch(/red|danger/)
      expect(style.dragLabelBackground).not.toMatch(/red|danger/)
    }
  })

  it('vuốt trái dùng đúng token trung tính --no, không phải --danger', () => {
    expect(DIRECTION_STYLES[-1]?.background).toBe('bg-no-soft')
    expect(DIRECTION_STYLES[-1]?.border).toBe('border-no')
  })
})
```

Bài test này rẻ (không render, không simulate kéo-thả) nhưng bắt được đúng loại lỗi dễ xảy ra nhất trong tương lai: một người sau này "sửa cho giống Tinder" rồi vô tình thêm `bg-red-500` vào nhánh `[-1]`.

---

# 11. `use-swipe-gesture.ts` — thêm test, hiện đang 0 test

Đây là **lần đầu** một hook được test trực tiếp trong dự án (mọi hook trước giờ chỉ được test gián tiếp qua component tiêu thụ nó). Dùng `renderHook` từ `@testing-library/react` — đã có sẵn trong gói (không phải cài thêm, `@testing-library/react-hooks` đã gộp vào `@testing-library/react` từ nhiều version trước bản 16.3.2 dự án đang dùng).

Gọi thẳng `result.current.handlers.onPointerDown(...)` với một object giả tối thiểu — **không** cần dựng `PointerEvent` thật của trình duyệt. Hàm trong hook chỉ đụng `event.clientX` và `event.currentTarget.setPointerCapture` (qua `?.()`, đã tự né việc thiếu method này — đúng comment sẵn có trong file). Object giả chỉ cần hai trường đó.

```ts
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useSwipeGesture } from './use-swipe-gesture'
import type { SwipeDirection } from '../../domain/swipe-gesture'

function fakePointerEvent(clientX: number) {
  return {
    clientX,
    currentTarget: { setPointerCapture: undefined },
    pointerId: 1,
  } as unknown as Parameters<ReturnType<typeof useSwipeGesture>['handlers']['onPointerDown']>[0]
}

describe('useSwipeGesture', () => {
  it('pointerDown rồi pointerMove: dx cập nhật, dragging=true', () => {
    const { result } = renderHook(() => useSwipeGesture(vi.fn()))

    act(() => result.current.handlers.onPointerDown(fakePointerEvent(100)))
    act(() => result.current.handlers.onPointerMove(fakePointerEvent(150)))

    expect(result.current.dragging).toBe(true)
    expect(result.current.dx).toBe(50)
  })

  it('thả tay DƯỚI ngưỡng commit: dx về 0, KHÔNG gọi onCommit', () => {
    const onCommit = vi.fn()
    const { result } = renderHook(() => useSwipeGesture(onCommit))

    act(() => result.current.handlers.onPointerDown(fakePointerEvent(0)))
    act(() => result.current.handlers.onPointerMove(fakePointerEvent(50))) // < COMMIT_THRESHOLD_PX (90)
    act(() => result.current.handlers.onPointerUp())

    expect(result.current.dx).toBe(0)
    expect(result.current.dragging).toBe(false)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('thả tay TRÊN ngưỡng commit: bay ra rồi gọi onCommit đúng hướng', async () => {
    vi.useFakeTimers()
    const onCommit = vi.fn()
    const { result } = renderHook(() => useSwipeGesture(onCommit))

    act(() => result.current.handlers.onPointerDown(fakePointerEvent(0)))
    act(() => result.current.handlers.onPointerMove(fakePointerEvent(120))) // > 90
    act(() => result.current.handlers.onPointerUp())

    expect(result.current.flying).toBe(1) // đã bắt đầu bay ngay lúc thả tay

    act(() => vi.advanceTimersByTime(180)) // FLY_DURATION_MS

    expect(onCommit).toHaveBeenCalledWith(1)
    expect(result.current.flying).toBe(0) // reset sau khi bay xong
    vi.useRealTimers()
  })

  it('commitByButton: giả lập nút bấm thay vì kéo — vẫn bay và gọi onCommit', () => {
    vi.useFakeTimers()
    const onCommit = vi.fn()
    const { result } = renderHook(() => useSwipeGesture(onCommit))

    act(() => result.current.commitByButton(-1))
    act(() => vi.advanceTimersByTime(180))

    expect(onCommit).toHaveBeenCalledWith(-1)
    vi.useRealTimers()
  })

  it('rotationDeg/previewDirection phản ánh đúng dx hiện tại (uỷ quyền cho hàm domain đã test)', () => {
    const { result } = renderHook(() => useSwipeGesture(vi.fn()))

    act(() => result.current.handlers.onPointerDown(fakePointerEvent(0)))
    act(() => result.current.handlers.onPointerMove(fakePointerEvent(50)))

    expect(result.current.previewDirection).toBe(1)
    expect(result.current.rotationDeg).toBeCloseTo(50 / 18, 3)
  })
})
```

**Ghi chú cho `commitByButton`**: hook có export nó nhưng `DishSwipeCard` (component tiêu thụ duy nhất hiện tại) **không dùng nó** — các nút vuốt trong `SwipeControls` gọi thẳng `handleCommit` của `DeckScreen`, đi vòng qua state cục bộ của thẻ, không kích hoạt animation bay ra khi bấm nút (chỉ khi kéo thả mới bay). Đây là kiến trúc đã có từ E1-T8, không phải lỗi — không TC/DoD nào đòi bấm nút phải có animation giống hệt kéo thả. Không sửa ở slice này; ghi chú lại để không ai tưởng nhầm `commitByButton` là code chết cần xoá.

---

# 12. Rủi ro

| Rủi ro | Hậu quả | Giảm thiểu |
|---|---|---|
| Quên sửa test S2 (`TC-041` cũ khẳng định "KHÔNG gọi history") sau khi đổi hành vi ở §2 | Test cũ đỏ, hoặc tệ hơn — bị sửa sai để "cho qua" thay vì phản ánh đúng hành vi mới | §7.1 đã viết lại rõ ràng, thay hẳn expectation cũ |
| `renderHook` là API mới với dự án — sai cách dùng `act()`/fake timers | Test hook có thể pass giả (React không flush state) hoặc treo do fake timer không advance đúng | Ví dụ ở §11 đã bọc mọi thay đổi state trong `act()`, dùng `vi.useFakeTimers()` đúng chỗ cần `FLY_DURATION_MS` |
| Nhầm `formatExplanation`'s ngưỡng với hardcode số 7 riêng | Hai nguồn sự thật cho cùng một hằng số cooldown | Đã import thẳng `RANKING_CONFIG.history.cooldownWindowDays`, không hardcode |
| Tách `SwipeControls` nhưng quên xoá `Button`/`handleCommit` logic trùng lặp ở `deck-screen.tsx` | `jscpd` đỏ hoặc code chết | Đã ghi rõ đoạn JSX nào cần thay thế TOÀN BỘ ở §9.1 |

---

# 13. Test Cases coverage

Không có `TC-xxx` nào được Master Plan gán cho E4-T7/T8/T9 (khác mọi subtask khác của E4) — cả ba đều dẫn nguồn tới màn hình thiết kế (`S-09`) và tiêu chuẩn UI (`Design §4/§7`, `NFR-03`), không phải Test Cases Specification. Bằng chứng đạt DoD ở đây là test tự động (§10, §11) cộng kiểm tay (§14), không phải một mã `TC` cụ thể.

---

# 14. Verify

## 14.1 Cổng máy

```bash
yarn verify && yarn arch:probe
```

`yarn test` phải in các nhóm mới: `dish-explanation`, `SwipeControls`, `useSwipeGesture`, cộng `DIRECTION_STYLES — bất biến thiết kế` trong `dish-swipe-card.test.tsx`.

## 14.2 Bằng chứng lastEatenLabel/explanation thật — DoD lớn nhất của slice

1. `yarn dev`, mở deck cho một Group đã có ít nhất một món từng ăn (tức đã Finalize một phiên trước đó — cần `eating_history` có dữ liệu; nếu chưa có, dựng tay qua `db:studio` hoặc chạy trọn một vòng MS-01 trước).
2. Món CHƯA từng ăn → thẻ hiện `Chưa từng ăn`, câu giải thích trung tính.
3. Món ăn hôm qua → thẻ hiện `Lần cuối ăn · hôm qua`, câu giải thích đổi thành `Vừa ăn gần đây.`
4. Món ăn 10 ngày trước (ngoài cửa sổ cooldown 7 ngày) → thẻ hiện đúng số ngày, nhưng câu giải thích quay về trung tính — **không** nói "vừa ăn gần đây" cho món đã 10 ngày.

## 14.3 Bằng chứng a11y — tắt màn hình, chỉ nghe

Bật VoiceOver (macOS)/TalkBack (Android), điều hướng qua các nút ở đáy màn deck. Mỗi nút phải đọc thành một câu tự nó đủ nghĩa mà không cần nhìn màn hình — đặc biệt "Hoàn tác" phải đọc ra "Hoàn tác lượt vuốt vừa rồi", không phải chỉ "Hoàn tác, nút".

## 14.4 Mốc M4

Sau khi §14.1–§14.3 xanh: tick `E4-T7`, `E4-T8`, `E4-T9` ở Master Plan §6, ghi ngày đạt **M4**. **E4 kết thúc tại đây** — toàn epic "Deck và Ranking" đã xong cả 9 subtask qua 4 slice.

---

# 15. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v3.9.md`

```markdown
# DEC-039 — list-deck Reads Eating History on Every Call, Not Just First Materialize

**Ngày quyết định:** 2026-08-19 | **Trạng thái:** Accepted

## Quyết định

`listDeck` (S2/E4-T4) is amended: `history.findEatingDates` now runs on every
call, not only when `findMaterializedDeck` returns `null`. Only the ranking
computation (`buildDeck`) and the `materializeDeck` write remain conditional
on first-open.

## Rationale

S2 optimized the history read away for repeat views because the deck's ORDER
is frozen once materialized and doesn't need recomputing. But S1 committed to
displaying real `lastEatenLabel`/explanation data on every card (deferred to
S4), and that display data is not the same thing as the order — it must stay
current across every view, not just the first. Splitting "read history" from
"compute and persist ranking" resolves both requirements without reintroducing
the cost S2 was avoiding (the ranking computation and the `session_decks`
write still only happen once).

## Consequence

Every deck page load now performs one indexed SELECT against `eating_history`
in addition to the existing queries. This is page-load cost, not
swipe-interaction cost, so it does not affect NFR-02 (which governs the
interaction Route Handler's response time, not initial page render).

## Affected Documents

- E4-S2 implementation guide (`list-deck.ts`'s design section is superseded by
  this entry for the history-read timing; the materialize/pagination logic
  itself is unchanged)
```

---

# 16. Master Plan

Sau khi `yarn verify`/`yarn arch:probe` xanh và §14.2–§14.3 đã kiểm tay: tick `E4-T7`, `E4-T8`, `E4-T9` ở §6, ghi ngày đạt **M4**.
