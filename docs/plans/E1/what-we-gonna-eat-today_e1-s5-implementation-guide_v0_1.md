# 🃏 Implementation Guide — E1 Slice S5: Candidate Deck & Tương tác Swipe thô

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Completed`
> - **Created:** `2026-08-17` | **Last Updated:** `2026-08-18`
> - **Upstream:** [Master Plan](what-we-gonna-eat-today_master-plan_v1_0.md) (`E1-T8, E1-T9`) • [SDD](what-we-gonna-eat-today_sdd_v0_1.md) (`SPEC-010, 011, 012`) • [Tech Spec](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) • [Test Cases Spec](what-we-gonna-eat-today_test-cases-specification_v0_1.md) (`TC-045→053, TC-105, TC-106`) • [Design Handoff](file:///Users/thinhquoc/Desktop/Persional/Enterprise/what-we-gonna-eat-today/docs/designs/README.md) (`S-09`)
> - **Tiền đề:** `E1-S1`, `E1-S2`, `E1-S3`, `E1-S4` đã hoàn thành.
>
> 📌 *Hướng dẫn kỹ thuật thi công TDD cho Slice S5: Materialize Candidate Deck, Route Handler xử lý tương tác vuốt thẻ song song dưới 100ms và Optimistic UI.*

---

# 0. Phạm vi và điều kiện xong

| ID | Việc | Giờ | Xong nghĩa là |
| --- | --- | --- | --- |
| E1-T8 | Deck liệt kê không ranking, phân trang | 2 | Mở phiên thấy danh sách món, cuộn hết được |
| E1-T9 | Route Handler ghi Interaction, optimistic UI | 3 | Vuốt 10 món liên tiếp không xếp hàng; TC-048→053 pass |

- [x] Mở `/sessions/<id>` thấy màn hình S-09 đầy đủ — chồng thẻ, tên món, tag (rỗng), footer, "Trong chồng"
- [x] Vuốt/bấm nút hai chiều hoạt động, thẻ bay đúng hướng, Hoàn tác lùi được, hết deck chuyển "Bạn đã xem hết N món.", bấm "Tôi chọn xong" chuyển "Xong lượt của bạn."
- [X] Mỗi lần vuốt gọi thật `POST /api/sessions/:id/interactions`, `yarn db:studio` thấy đúng dòng `interactions` (upsert) và `interaction_events` (append)
- [X] Ngắt mạng (DevTools → Network → Offline) khi đang vuốt → dải "Đang thử gửi lại · bạn vuốt tiếp được" hiện, thao tác vuốt **không bị chặn**
- [x] TC-045, TC-046, TC-047, TC-048, TC-049, TC-050, TC-051, TC-052 pass (tầng A); TC-053 pass (tầng I, `yarn test:integration`)
- [x] `yarn verify` · `yarn arch:probe` · `yarn build` xanh
- [x] PR link SPEC-010 (rút gọn), SPEC-011, SPEC-012, BR-040, BR-041, BR-042

---

# 1. Sáu phát hiện đã verify bằng đọc mã nguồn — đọc trước khi gõ

## 1.1 jsdom KHÔNG có `setPointerCapture`

```
$ grep -rln "setPointerCapture" node_modules/jsdom/
(không có kết quả nào)
```

`PointerEvent` (constructor) có trong jsdom, nhưng `Element.prototype.setPointerCapture`/`releasePointerCapture`/`hasPointerCapture` **không được hiện thực** — cùng loại lỗ hổng jsdom mà S2 đã gặp với `dialog.showModal()`. Gọi thẳng `e.currentTarget.setPointerCapture(...)` trong test sẽ ném `TypeError`.

→ Hai hệ quả bắt buộc trong thiết kế (§3.6):

- Gọi bằng optional chaining: `e.currentTarget.setPointerCapture?.(e.pointerId)` — đây còn là **thực hành tốt cho trình duyệt thật** (một số trình duyệt cũ/thiết bị không hỗ trợ), không chỉ để né jsdom.
- Tách toàn bộ **toán học của cử chỉ** (ngưỡng commit, góc xoay, hướng kéo) thành hàm thuần không đụng DOM — test được đầy đủ mà không cần giả lập pointer event nào.

## 1.2 Route Handler ở Next 16: `context.params` cũng là Promise, có `RouteContext` helper — vẫn KHÔNG dùng

`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md:668`:
> `v15.0.0-RC` | `context.params` is now a promise.

Và có helper `RouteContext<'/users/[id]'>` (dòng 107-115) — **không dùng**, cùng lý do đã ghi ở mọi guide trước: helper do `next typegen` sinh vào `.next/types`, CI chạy `yarn typecheck` trước `yarn build` nên trên máy sạch chưa tồn tại. Khai thủ công `{ params: Promise<{ id: string }> }` làm tham số thứ hai của `POST`.

## 1.3 `drizzle-orm` có `onConflictDoUpdate` — dùng cho upsert `interactions`

`node_modules/drizzle-orm/pg-core/query-builders/insert.d.ts:171`:

```ts
onConflictDoUpdate(config: PgInsertOnConflictDoUpdateConfig<this>): ...
```

Cú pháp: `.insert(t).values(...).onConflictDoUpdate({ target: [...cols], set: {...} })`.

## 1.4 `session_decks` KHÔNG tạo ở S5

Tech Spec §3.1 có bảng `session_decks(session_id, user_id, ordered_dish_ids jsonb, created_at)` — bảng này phục vụ việc **materialize deck có ranking một lần rồi lưu lại** (SPEC-010 đầy đủ, BR-048 Deck Stability). Đó là **E4-T3**. S5 không tạo bảng này, không ranking, không materialize — mỗi lần mở trang chỉ truy vấn lại Eligible Set từ `group_dishes`, sắp theo một cột bất biến (`group_dishes.id`, UUID v7 đơn điệu theo thời gian tạo). Vì dữ liệu (Group Dish Pool) không đổi trong lúc test S5, thứ tự tự nhiên ổn định qua nhiều lần load — không cần cơ chế lưu riêng.

## 1.5 Định dạng ngày ngắn cho header S-09 — khác `formatVietnameseDate` đã có

Header S-09 dùng **"Thứ Ba 16/8"** (weekday + space + ngày/tháng số), khác hẳn `formatVietnameseDate` của S2 vốn cho ra **"Thứ Ba · 18 tháng 8"** (dùng ở S-02/S-04). Đã verify bằng `Intl` thật:

```js
new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', weekday: 'long' }).format(d)   // 'Thứ Ba'
new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', day: 'numeric' }).format(d)    // '18'
new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', month: 'numeric' }).format(d)  // '8'
// ghép: 'Thứ Ba 18/8'
```

→ Thêm hàm mới `formatVietnameseDateShort` vào `src/shared/time/format-vietnamese-date.ts` (§7), **không sửa** `formatVietnameseDate` hiện có.

## 1.6 `SessionRepository` (S4) thiếu một method mà S5 cần — đã patch trực tiếp vào guide S4

Trang deck cần đọc lại một Session đã tồn tại (lấy `groupId` để gọi `assertGroupAccess`, lấy `decisionDate` để hiện header) — S4 không có method này vì S4 không có route nào cần đọc lại Session. Đã **sửa `docs/plans/what-we-gonna-eat-today_e1-s4-implementation-guide_v0_1.md`** (không phải đợi review riêng — S4 chưa landed nên sửa trực tiếp không có rủi ro drift):

- `SessionSummary.state` mở rộng từ `'DRAFT' | 'ACTIVE'` thành `SessionState` (đủ 4 giá trị) — vì `findById` có thể trả Session ở bất kỳ state nào.
- Thêm `findById(sessionId): Promise<SessionSummary | null>` vào interface `SessionRepository` và vào `drizzleSessionRepository`.

**Nếu bạn đã code S4 trước khi đọc phần này**: mở lại `session-repository.ts` và `drizzle-session-repository.ts`, áp hai thay đổi trên trước khi bắt đầu S5.

---

# 2. Bảy quyết định kiến trúc

## 2.1 Chia E1-T8 / E1-T9 theo đúng nghĩa "optimistic UI"

**E1-T8** dựng **toàn bộ UI S-09** (mọi trạng thái, mọi animation, hai nút lớn, Hoàn tác, hết món/xong lượt) với dữ liệu deck **thật** (RSC gọi `listDeck` thật). Nhưng hành động vuốt/bấm nút **chỉ cập nhật state cục bộ** (`cursor`, `marks` trong React) — **không gọi mạng**. Đây đúng là cách chính prototype hoạt động: `commit()` của nó không có `fetch` nào cả. Điều này thoả trọn vẹn "Xong nghĩa là" của E1-T8: *"Mở phiên thấy danh sách món, cuộn hết được"* — không đòi hỏi interaction phải được ghi lại.

**E1-T9** thêm Route Handler (SPEC-012) và **nối** các hành động đã có sẵn ở E1-T8 với một lệnh gọi mạng thật, có retry (NFR-05) và dải mất mạng thật (component đã dựng ở E1-T8, giờ mới có logic điều khiển). Đây chính là chỗ chữ "optimistic" trong tiêu đề E1-T9 có nghĩa: **optimistic = UI đã đổi trước (đã làm ở E1-T8), mạng đồng bộ theo sau (làm ở E1-T9)**, không phải hai việc tách rời.

Cùng một UI, không viết lại — E1-T9 chỉ thêm một callback thật vào chỗ mà E1-T8 để trống.

## 2.2 Route phẳng `/sessions/[sessionId]`, không lồng dưới `/groups/[groupId]`

Route Handler của Tech Spec đã cố định là `/api/sessions/:sessionId/interactions` (phẳng). Để nhất quán, trang xem deck cũng đặt phẳng: `app/sessions/[sessionId]/page.tsx`. `groupId` không nằm trong URL — trang tự đọc `session.groupId` (qua `findById`, §1.6) rồi mới gọi `assertGroupAccess`. Điều này còn tránh được vấn đề "route lồng ba tầng" (`[groupId]/[sessionId]`) mà `typedRoutes` từng gây rắc rối ở guide S3.

## 2.3 `selection` tự query `participants` và `selection_sessions`, không import `session`

`ALLOWED_CROSS_FEATURE` cho `selection` chỉ có `['history', 'dish']` — **không có `session`**. Nhưng SPEC-011/012 đều cần biết trạng thái Participant và trạng thái Session. Áp dụng đúng tiền lệ đã có từ S2 (`group`'s infra query thẳng bảng `users` mà không import `features/auth/`): `features/selection/infrastructure/` import thẳng `participants`, `selectionSessions` từ `@/shared/db/schema` — đây là dùng chung MỘT schema Postgres, không phải import TypeScript xuyên feature. `selection` **được phép** import `features/dish/` (`ALLOWED_CROSS_FEATURE` cho phép) nhưng ở S5 không cần tới vì infra tự query thẳng `group_dishes`/`global_dishes` cũng theo cùng lý do trên (nhất quán, không cần thứ đặc quyền `dish` mang lại — dành đặc quyền đó cho lúc thật sự cần, ví dụ khi `selection` cần gọi `normalizeDishName` ở E2+).

## 2.4 Phân trang "trong bộ nhớ" — `getDeckPage` là hàm thuần, RSC gọi một lần với `pageSize` đủ lớn

Tech Spec §3.3: *"Deck của một Group ~30–100 Dish. Không phân trang ở tầng DB; dựng deck một lần rồi lưu `session_decks`, phân trang trong bộ nhớ."* Vì S5 không lưu `session_decks` (§1.4), cách tôn trọng đúng tinh thần câu trên: RSC truy vấn **toàn bộ** Eligible Set một lần, gọi `getDeckPage(items, cursor=0, pageSize=<đủ lớn>)` — một hàm thuần khớp *chính xác* hợp đồng SPEC-011 — rồi gửi **toàn bộ mảng** xuống client. Client tự quản lý vị trí xem (`cursor` trong React state, giống hệt `state.i` của prototype), không có round-trip mạng nào cho "trang tiếp theo". `getDeckPage` vẫn được test đúng theo TC-045/046/047 với `pageSize=20` như đề — cách dùng thật trong `page.tsx` chỉ là gọi nó với `pageSize` lớn hơn tổng số món.

## 2.5 Hai giai đoạn cho `listEligibleDishCards` — trước và sau khi có bảng `interactions`

`DishCard.effectiveInteraction` (SPEC-011) cần đọc từ bảng `interactions` — bảng đó **chưa tồn tại lúc code E1-T8** (nó được tạo ở E1-T9, §6.2). Vì vậy infra của `selection` có đúng MỘT method, `listEligibleDishCards`, nhưng **thân hàm viết hai lần theo hai giai đoạn**:

- **Lúc code E1-T8**: JOIN `group_dishes` + `global_dishes`, hardcode `effectiveInteraction: null` (không có bảng nào để đọc từ).
- **Lúc code E1-T9**: sửa lại CHÍNH hàm đó, thêm `LEFT JOIN interactions ON ... AND interactions.participant_id = $participantId`, đọc `interactions.type` thật.

Không tạo hai hàm khác tên — đúng tinh thần "sửa lại đúng chỗ" đã lặp lại xuyên suốt các guide trước (`normalize-name.ts` ở S3, `findBlockingSessionToday` ở S4).

## 2.6 Không rollback UI khi gửi thất bại — chỉ báo lỗi rõ

NFR-05: *"Interaction được retry; nếu thất bại thì báo rõ, không im lặng."* Không nói phải hoàn tác thao tác vuốt trên UI. Quyết định: khi một lượt gửi thất bại hẳn (hết số lần retry), **giữ nguyên vị trí deck đã tiến** (người dùng đã vuốt tiếp, tâm lý đã "qua món đó rồi") — chỉ đổi dải banner từ "Đang thử gửi lại" sang một câu báo lỗi rõ ràng hơn kèm số lượt gửi thất bại, không có nút "hoàn tác lại UI". Đây là lựa chọn có chủ ý, không phải thiếu sót — ghi trong PR.

## 2.7 HTTP status mapper dùng chung — `shared/http-error.ts`

Route Handler là chỗ ĐẦU TIÊN của dự án cần chuyển `ErrorCode` (nội bộ) thành HTTP status thật (Server Action không cần việc này — Next tự lo qua cơ chế riêng). Thêm `httpStatusForErrorCode(code): number` vào file mới `src/shared/http-error.ts` (tách khỏi `shared/errors.ts` — errors.ts chỉ định nghĩa *loại* lỗi, không nên biết về HTTP; đúng tinh thần Single Responsibility, và để file này dùng lại được cho Route Handler khác nếu có ở E2+).

---

# 3. Bẫy Next 16 mới ở slice này

Guide S1 ghi bẫy 1-8, S2 ghi 9-14, S3 ghi 15-18. **Không lặp lại.** Ba bẫy mới:

 1. **Route Handler `context.params` cũng là Promise, có `RouteContext` helper — không dùng** (§1.2).
 2. **`Response.json()` là cách trả JSON chuẩn** thay vì `NextResponse.json()` khi không cần các tiện ích riêng của `NextResponse` (set cookie, rewrite...) — Route Handler của S5 chỉ trả JSON thuần nên dùng `Response.json()` (Web API chuẩn, không phải API riêng của Next) cho nhẹ, đúng ví dụ đầu tiên trong chính docs Next 16 (`route.md:9-11`).
 3. **`request.json()` có thể throw nếu body không phải JSON hợp lệ** — bọc trong try/catch, trả `ERR_VALIDATION` (400) thay vì để lỗi 500 không rõ ràng.

---

# 4. Cây file

```
src/
├── shared/
│   ├── ui/button.tsx                    (+ .test.tsx SỬA)  +variant yes/no
│   ├── db/schema.ts                                SỬA — +interactionType, +interactionAction (pgEnum),
│   │                                                      +interactions, +interactionEvents
│   ├── http-error.ts                    + .test.ts  mới — httpStatusForErrorCode()
│   └── time/format-vietnamese-date.ts   (+ .test.ts SỬA)  mới — +formatVietnameseDateShort
│
├── features/selection/                             ← feature MỚI
│   ├── domain/
│   │   ├── deck-page.ts              + .test.ts     mới — getDeckPage(), SPEC-011 thuần
│   │   ├── interaction.ts                           mới — type thuần
│   │   └── swipe-gesture.ts          + .test.ts      mới — toán học cử chỉ, KHÔNG đụng DOM
│   ├── application/
│   │   ├── selection-repository.ts                  mới — PORT
│   │   ├── list-deck.ts              + .test.ts     mới — SPEC-011, TC-045/046/047
│   │   └── record-interaction.ts     + .test.ts     mới — SPEC-012, TC-048→052
│   ├── infrastructure/
│   │   ├── drizzle-selection-repository.ts                    mới
│   │   └── drizzle-selection-repository.integration.test.ts   mới — TC-053
│   └── presentation/components/
│       ├── use-swipe-gesture.ts                     mới — hook, dùng swipe-gesture.ts + Pointer Events
│       ├── dish-swipe-card.tsx       + .test.tsx     mới — thẻ chính
│       ├── deck-screen.tsx           + .test.tsx     mới — toàn màn hình S-09, 'use client'
│       └── send-interaction.ts       + .test.ts      mới — fetch + retry (NFR-05), thuần (không React)
│
└── app/
    ├── sessions/[sessionId]/page.tsx                 mới — RSC
    └── api/sessions/[id]/interactions/route.ts       mới — Route Handler (E1-T9)

src/shared/db/migrations/000X_interactions.sql        sinh bởi drizzle-kit (E1-T9)
```

---

# 5. Domain

## 5.1 `src/features/selection/domain/deck-page.ts`

```ts
/**
 * SPEC-011 — Lấy trang deck. Hàm thuần, không chạm DB: slicing một mảng đã có
 * sẵn trong bộ nhớ (Tech Spec §3.3 — "không phân trang ở tầng DB... phân
 * trang trong bộ nhớ"). Generic vì đây thuần là logic cắt trang, không quan
 * tâm hình dạng phần tử.
 */
export type DeckPage<T> = {
  readonly items: readonly T[]
  readonly nextCursor: number | null
}

export function getDeckPage<T>(items: readonly T[], cursor: number, pageSize: number): DeckPage<T> {
  const page = items.slice(cursor, cursor + pageSize)
  const nextCursor = cursor + pageSize < items.length ? cursor + pageSize : null
  return { items: page, nextCursor }
}
```

`deck-page.test.ts` — **viết trước**:

```ts
import { describe, expect, it } from 'vitest'

import { getDeckPage } from './deck-page'

function makeThirtyItems(): number[] {
  return Array.from({ length: 30 }, (_, i) => i)
}

describe('SPEC-011 — Lấy trang deck', () => {
  it('TC-045: deck 30 món, cursor=0 thì trả 20 món và nextCursor=20', () => {
    const page = getDeckPage(makeThirtyItems(), 0, 20)
    expect(page.items).toHaveLength(20)
    expect(page.nextCursor).toBe(20)
  })

  it('TC-046: cursor=20 thì trả 10 món và nextCursor=null', () => {
    const page = getDeckPage(makeThirtyItems(), 20, 20)
    expect(page.items).toHaveLength(10)
    expect(page.nextCursor).toBeNull()
  })

  it('SPEC-011: pageSize lớn hơn tổng số món thì trả hết một lần, nextCursor=null', () => {
    const page = getDeckPage(makeThirtyItems(), 0, 100)
    expect(page.items).toHaveLength(30)
    expect(page.nextCursor).toBeNull()
  })
})
```

## 5.2 `src/features/selection/domain/interaction.ts`

```ts
/**
 * SDD §2.2. `InteractionType` KHÔNG có giá trị `NONE` — "None" được biểu diễn
 * bằng việc KHÔNG tồn tại row trong `interactions` (nguyên văn SDD, không
 * phải suy diễn).
 *
 * `InteractionAction` là tên TỰ ĐẶT: SDD không đặt tên riêng cho enum ba giá
 * trị của cột `interaction_events.action`, chỉ liệt kê chúng trong đầu vào
 * SPEC-012 (`action: SWIPE_RIGHT | SWIPE_LEFT | UNDO`).
 */
export type InteractionType = 'SWIPE_RIGHT' | 'SWIPE_LEFT'
export type InteractionAction = 'SWIPE_RIGHT' | 'SWIPE_LEFT' | 'UNDO'
```

## 5.3 `src/features/selection/domain/swipe-gesture.ts`

```ts
/**
 * Toán học của cử chỉ vuốt — hàm thuần, KHÔNG đụng DOM, KHÔNG đụng React. Tách
 * riêng vì jsdom không hiện thực `setPointerCapture` (§1.1): mọi logic ĐÁNG
 * test của cử chỉ phải nằm ở đây để test được mà không cần giả lập pointer
 * event nào.
 *
 * Giá trị lấy nguyên từ thiết kế S-09 (`S-09 Deck vuot prototype.dc.html`):
 * ngưỡng đổi màu preview 40px, ngưỡng commit 90px, góc xoay tối đa 8°.
 */

export const PREVIEW_THRESHOLD_PX = 40
export const COMMIT_THRESHOLD_PX = 90
export const MAX_ROTATION_DEG = 8
export const ROTATION_DIVISOR = 18
export const FLY_OUT_DISTANCE_PX = 460

export type SwipeDirection = -1 | 0 | 1

/** Hướng để ĐỔI MÀU/HIỆN NHÃN lúc đang kéo — ngưỡng 40px, chưa phải commit. */
export function resolvePreviewDirection(dx: number): SwipeDirection {
  if (dx > PREVIEW_THRESHOLD_PX) return 1
  if (dx < -PREVIEW_THRESHOLD_PX) return -1
  return 0
}

/** Có nên COMMIT hành động khi nhả tay không — ngưỡng 90px, tuyệt đối theo px. */
export function shouldCommitOnRelease(dx: number): SwipeDirection {
  if (dx > COMMIT_THRESHOLD_PX) return 1
  if (dx < -COMMIT_THRESHOLD_PX) return -1
  return 0
}

/** `translateX(dx) rotate(clamp(-8, dx/18, 8)deg)` — góc xoay theo dx lúc đang kéo. */
export function computeDragRotationDeg(dx: number): number {
  return Math.max(-MAX_ROTATION_DEG, Math.min(MAX_ROTATION_DEG, dx / ROTATION_DIVISOR))
}

/** Vị trí ngang của thẻ khi đang bay ra sau khi commit — dir * 460px. */
export function computeFlyOutTranslateX(direction: SwipeDirection): number {
  return direction * FLY_OUT_DISTANCE_PX
}
```

`swipe-gesture.test.ts` — **viết trước**:

```ts
import { describe, expect, it } from 'vitest'

import {
  computeDragRotationDeg,
  computeFlyOutTranslateX,
  resolvePreviewDirection,
  shouldCommitOnRelease,
} from './swipe-gesture'

describe('resolvePreviewDirection', () => {
  it('dx trong khoảng [-40, 40] thì chưa có hướng', () => {
    expect(resolvePreviewDirection(0)).toBe(0)
    expect(resolvePreviewDirection(39)).toBe(0)
    expect(resolvePreviewDirection(-39)).toBe(0)
  })

  it('dx > 40 thì hướng phải (Đề xuất)', () => {
    expect(resolvePreviewDirection(41)).toBe(1)
  })

  it('dx < -40 thì hướng trái (Không hôm nay)', () => {
    expect(resolvePreviewDirection(-41)).toBe(-1)
  })
})

describe('shouldCommitOnRelease', () => {
  it('|dx| <= 90 thì KHÔNG commit — bounce về giữa', () => {
    expect(shouldCommitOnRelease(90)).toBe(0)
    expect(shouldCommitOnRelease(-90)).toBe(0)
  })

  it('dx > 90 thì commit phải', () => {
    expect(shouldCommitOnRelease(91)).toBe(1)
  })

  it('dx < -90 thì commit trái', () => {
    expect(shouldCommitOnRelease(-91)).toBe(-1)
  })
})

describe('computeDragRotationDeg', () => {
  it('góc xoay tỉ lệ thuận dx/18', () => {
    expect(computeDragRotationDeg(18)).toBe(1)
    expect(computeDragRotationDeg(-18)).toBe(-1)
  })

  it('kẹp trong [-8, 8] độ dù dx rất lớn', () => {
    expect(computeDragRotationDeg(1000)).toBe(8)
    expect(computeDragRotationDeg(-1000)).toBe(-8)
  })
})

describe('computeFlyOutTranslateX', () => {
  it('bay ra đúng hướng, cách 460px', () => {
    expect(computeFlyOutTranslateX(1)).toBe(460)
    expect(computeFlyOutTranslateX(-1)).toBe(-460)
  })
})
```

---

# 6. Schema

## 6.1 `src/shared/db/schema.ts` — thêm (E1-T9)

Import thêm `pgEnum` (đã có từ S3), không cần import mới nào khác ngoài các bảng tham chiếu.

```ts
/**
 * SDD §2.2. Không có giá trị `NONE` — "None" = không tồn tại row (xem
 * `features/selection/domain/interaction.ts`).
 */
export const interactionType = pgEnum('interaction_type', ['SWIPE_RIGHT', 'SWIPE_LEFT'])

/**
 * Tên TỰ ĐẶT cho `interaction_events.action` — SDD không đặt tên riêng cho
 * enum này. Ba giá trị vì UNDO là một sự kiện audit dù nó xoá row khỏi
 * `interactions`.
 */
export const interactionAction = pgEnum('interaction_action', ['SWIPE_RIGHT', 'SWIPE_LEFT', 'UNDO'])

/**
 * Tech Spec §3.1, §3.2. Bảng EFFECTIVE STATE — luôn upsert, không append.
 * Session Ranking (E4+) CHỈ đọc bảng này, không đọc `interaction_events`
 * (Tech Spec §3.2: gộp làm một thì "mọi truy vấn ranking phải tự tìm bản ghi
 * mới nhất theo timestamp — đắt và dễ sai").
 */
export const interactions = pgTable(
  'interactions',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => selectionSessions.id),
    participantId: uuid('participant_id')
      .notNull()
      .references(() => participants.id),
    groupDishId: uuid('group_dish_id')
      .notNull()
      .references(() => groupDishes.id),
    type: interactionType('type').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('interactions_session_participant_dish_unique').on(
      table.sessionId,
      table.participantId,
      table.groupDishId,
    ),
    // Đường nóng Tech Spec §3.3: SPEC-014 Session Ranking (E4+).
    index('interactions_session_id_idx').on(table.sessionId),
  ],
)

/**
 * Tech Spec §3.1, §3.2. Bảng APPEND-ONLY AUDIT — mọi request SPEC-012 (dù có
 * đổi effective state hay không) đều thêm một dòng. KHÔNG dùng cho ranking.
 */
export const interactionEvents = pgTable('interaction_events', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => selectionSessions.id),
  participantId: uuid('participant_id')
    .notNull()
    .references(() => participants.id),
  groupDishId: uuid('group_dish_id')
    .notNull()
    .references(() => groupDishes.id),
  action: interactionAction('action').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Interaction = typeof interactions.$inferSelect
export type InteractionEvent = typeof interactionEvents.$inferSelect
```

**Quyết định: mỗi request SPEC-012 luôn ghi một `interaction_events`, kể cả khi gửi lại đúng `action` cũ (idempotent).** SPEC-012 nói *"Mọi thay đổi đều ghi thêm một dòng vào `interaction_events`"* — "thay đổi" ở đây đọc là "mọi lượt request", không phải "mọi lần effective state thực sự đổi", vì bảng này là **audit** (ghi lại mọi lần người dùng thao tác, kể cả thao tác lặp) chứ không phải delta log. TC-053 chỉ khẳng định effective interaction không đổi khi gửi lặp — không khẳng định số dòng event, nên cách hiểu này không vi phạm gì. Ghi rõ trong PR vì đây là một diễn giải, không phải trích nguyên văn.

## 6.2 Migration

```bash
yarn db:generate --name=interactions
```

Số thứ tự tự sinh — không hardcode (phụ thuộc thứ tự code thật với S3/S4, xem cảnh báo tương tự ở hai guide đó). Đọc `.sql` sinh ra, xác nhận có `CREATE TYPE "interaction_type"`, `CREATE TYPE "interaction_action"`, và `CREATE UNIQUE INDEX "interactions_session_participant_dish_unique"`. Migrate cả hai branch `dev` và `test` (như S4 §6.2).

---

# 7. `src/shared/time/format-vietnamese-date.ts` — thêm

```ts
/**
 * Header S-09: "Thứ Ba 16/8" — khác `formatVietnameseDate` ("Thứ Ba · 18
 * tháng 8", dùng ở S-02/S-04). Hai định dạng cho hai ngữ cảnh khác nhau, KHÔNG
 * hợp nhất — header compact của màn hình vuốt cần ngắn nhất có thể.
 */
export function formatVietnameseDateShort(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`formatVietnameseDateShort: ngày không hợp lệ: "${isoDate}"`)
  }

  const weekday = new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', weekday: 'long' }).format(date)
  const day = new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', day: 'numeric' }).format(date)
  const month = new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', month: 'numeric' }).format(date)

  return `${weekday} ${day}/${month}`
}
```

Thêm vào `format-vietnamese-date.test.ts`:

```ts
describe('formatVietnameseDateShort', () => {
  it('dựng đúng chuỗi header S-09', () => {
    expect(formatVietnameseDateShort('2026-08-18')).toBe('Thứ Ba 18/8')
  })
})
```

---

# 8. `src/shared/http-error.ts`

```ts
import type { ErrorCode } from './errors'

/**
 * SDD §2.5 — bảng mã lỗi kèm HTTP status. Chỉ dùng ở Route Handler: Server
 * Action không cần map HTTP status (Next tự lo cơ chế riêng của nó).
 *
 * Tách khỏi `errors.ts` có chủ ý: `errors.ts` định nghĩa LOẠI lỗi, không nên
 * biết về HTTP. File này dùng lại được cho Route Handler khác ở E2+ mà không
 * kéo theo import HTTP vào những chỗ không cần (ví dụ domain/application).
 */
const HTTP_STATUS_BY_ERROR_CODE: Record<ErrorCode, number> = {
  ERR_UNAUTHENTICATED: 401,
  ERR_NOT_GROUP_MEMBER: 403,
  ERR_NOT_GROUP_ADMIN: 403,
  ERR_NOT_SESSION_CREATOR: 403,
  ERR_NOT_PARTICIPANT: 403,
  ERR_VALIDATION: 400,
  ERR_INVITE_INVALID: 400,
  ERR_INVITE_ALREADY_USED: 409,
  ERR_ALREADY_GROUP_MEMBER: 409,
  ERR_DISH_ALREADY_IN_POOL: 409,
  ERR_DISH_NOT_IN_POOL: 409,
  ERR_INVALID_SYSTEM_TAG: 400,
  ERR_SESSION_EXISTS_TODAY: 409,
  ERR_SESSION_NOT_DRAFT: 409,
  ERR_SESSION_NOT_ACTIVE: 409,
  ERR_PARTICIPANT_NOT_MEMBER: 409,
  ERR_PARTICIPANT_EXISTS: 409,
  ERR_DUPLICATE_DISH_IN_MEAL: 400,
  ERR_EMPTY_FINAL_MEAL: 400,
  ERR_REQUIRED_RULE_FAILED: 409,
  ERR_DUPLICATE_RULE: 409,
  ERR_INVALID_MINIMUM_COUNT: 400,
}

export function httpStatusForErrorCode(code: ErrorCode): number {
  return HTTP_STATUS_BY_ERROR_CODE[code]
}
```

`Record<ErrorCode, number>` bắt buộc liệt kê **đủ mọi thành viên** của union — nếu SDD §2.5 thêm mã lỗi mới mà quên thêm vào đây, `tsc` báo lỗi ngay, không rơi vào runtime.

`http-error.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { httpStatusForErrorCode } from './http-error'

describe('httpStatusForErrorCode', () => {
  it('mã liên quan tới S5 trả đúng status', () => {
    expect(httpStatusForErrorCode('ERR_UNAUTHENTICATED')).toBe(401)
    expect(httpStatusForErrorCode('ERR_NOT_PARTICIPANT')).toBe(403)
    expect(httpStatusForErrorCode('ERR_SESSION_NOT_ACTIVE')).toBe(409)
    expect(httpStatusForErrorCode('ERR_DISH_NOT_IN_POOL')).toBe(409)
    expect(httpStatusForErrorCode('ERR_VALIDATION')).toBe(400)
  })
})
```

---

# 9. Application

## 9.1 `src/features/selection/application/selection-repository.ts` — PORT

```ts
import type { InteractionAction, InteractionType } from '../domain/interaction'

export type ParticipantState = 'ACTIVE' | 'COMPLETED' | 'REMOVED'

export type ParticipantRecord = {
  readonly id: string
  readonly state: ParticipantState
}

export type DishCard = {
  readonly dishId: string
  readonly name: string
  /** Luôn rỗng ở S5 — `group_dish_tags` là E2-T5, chưa tồn tại. */
  readonly systemTags: readonly string[]
  readonly effectiveInteraction: InteractionType | null
}

export interface SelectionRepository {
  /** SPEC-011/012. `null` nếu userId chưa từng là Participant của Session này. */
  findParticipant(sessionId: string, userId: string): Promise<ParticipantRecord | null>

  /**
   * SPEC-010 rút gọn + SPEC-011. Eligible Set (`group_dishes.state='ACTIVE'`
   * của Group thuộc Session), sắp ổn định theo `group_dishes.id`, kèm
   * `effectiveInteraction` hiện tại của `participantId`.
   *
   * VIẾT HAI GIAI ĐOẠN (§2.5 của Implementation Guide):
   * - E1-T8: chưa có bảng `interactions` → `effectiveInteraction` hardcode `null`.
   * - E1-T9: sửa lại thân hàm, thêm LEFT JOIN `interactions` để đọc giá trị thật.
   */
  listEligibleDishCards(sessionId: string, participantId: string): Promise<DishCard[]>

  /** SPEC-012. Session phải đang ACTIVE mới ghi được interaction. */
  findSessionState(sessionId: string): Promise<'DRAFT' | 'ACTIVE' | 'FINALIZED' | 'INVALID' | null>

  /** SPEC-012. Dish có đang Active trong Group Dish Pool của Group thuộc Session không. */
  isDishActiveInSession(sessionId: string, groupDishId: string): Promise<boolean>

  /**
   * SPEC-012 — ghi/xoá effective interaction + LUÔN append event, NGUYÊN TỬ
   * (`db.batch`). `SWIPE_RIGHT`/`SWIPE_LEFT` → upsert vào `interactions`.
   * `UNDO` → xoá khỏi `interactions` (không phải ghi giá trị rỗng — SDD §2.2:
   * "None" = không tồn tại row). Trả về effective interaction SAU thao tác.
   */
  applyInteraction(input: {
    sessionId: string
    participantId: string
    groupDishId: string
    action: InteractionAction
  }): Promise<InteractionType | null>
}
```

## 9.2 `src/features/selection/application/list-deck.ts`

```ts
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import { getDeckPage } from '../domain/deck-page'
import type { DishCard, SelectionRepository } from './selection-repository'

export type ListDeckDeps = {
  readonly selection: SelectionRepository
}

export type ListDeckInput = {
  readonly sessionId: string
  readonly userId: string
  readonly cursor: number
  readonly pageSize: number
}

export type ListDeckResult = {
  readonly items: DishCard[]
  readonly nextCursor: number | null
}

const ACCEPTED_PARTICIPANT_STATES = ['ACTIVE', 'COMPLETED'] as const

/**
 * SPEC-011 — Lấy trang deck.
 *
 * "Người gọi phải là Participant ACTIVE hoặc COMPLETED" — kiểm bằng danh sách
 * TRẮNG (chấp nhận đúng hai state), khác cách SPEC-012 diễn đạt ("chưa bị
 * remove" — danh sách ĐEN, từ chối đúng một state). Hai cách viết khác nhau
 * dù `ParticipantState` chỉ có 3 giá trị nên về logic tương đương — giữ đúng
 * cách diễn đạt của TỪNG SPEC để dễ đối chiếu ngược lại tài liệu, không gộp
 * thành một hàm `isActiveParticipant` dùng chung cho cả hai.
 */
export async function listDeck(
  deps: ListDeckDeps,
  input: ListDeckInput,
): Promise<Result<ListDeckResult, Failure>> {
  const participant = await deps.selection.findParticipant(input.sessionId, input.userId)

  if (
    participant === null ||
    !ACCEPTED_PARTICIPANT_STATES.includes(participant.state as 'ACTIVE' | 'COMPLETED')
  ) {
    return err(failure('ERR_NOT_PARTICIPANT', { sessionId: input.sessionId }))
  }

  const eligible = await deps.selection.listEligibleDishCards(input.sessionId, participant.id)
  const page = getDeckPage(eligible, input.cursor, input.pageSize)

  return ok({ items: [...page.items], nextCursor: page.nextCursor })
}
```

`list-deck.test.ts` — **viết trước**:

```ts
import { describe, expect, it } from 'vitest'

import type { DishCard, ParticipantRecord, SelectionRepository } from './selection-repository'
import { listDeck } from './list-deck'

function makeDishCards(count: number): DishCard[] {
  return Array.from({ length: count }, (_, i) => ({
    dishId: `dish-${i}`,
    name: `Món ${i}`,
    systemTags: [],
    effectiveInteraction: null,
  }))
}

function makeFakeSelectionRepository(options: {
  participant: ParticipantRecord | null
  eligible: DishCard[]
}): SelectionRepository {
  return {
    async findParticipant() {
      return options.participant
    },
    async listEligibleDishCards() {
      return options.eligible
    },
    async findSessionState(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async isDishActiveInSession(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async applyInteraction(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
  }
}

describe('SPEC-011 — Lấy trang deck', () => {
  it('TC-045: deck 30 Dish, cursor=0 thì trả 20 item và nextCursor=20', async () => {
    const repository = makeFakeSelectionRepository({
      participant: { id: 'participant-1', state: 'ACTIVE' },
      eligible: makeDishCards(30),
    })

    const result = await listDeck(
      { selection: repository },
      { sessionId: 'session-1', userId: 'user-1', cursor: 0, pageSize: 20 },
    )

    expect(result.ok).toBe(true)
    expect(result.ok && result.value.items).toHaveLength(20)
    expect(result.ok && result.value.nextCursor).toBe(20)
  })

  it('TC-046: cursor=20 thì trả 10 item và nextCursor=null', async () => {
    const repository = makeFakeSelectionRepository({
      participant: { id: 'participant-1', state: 'ACTIVE' },
      eligible: makeDishCards(30),
    })

    const result = await listDeck(
      { selection: repository },
      { sessionId: 'session-1', userId: 'user-1', cursor: 20, pageSize: 20 },
    )

    expect(result.ok).toBe(true)
    expect(result.ok && result.value.items).toHaveLength(10)
    expect(result.ok && result.value.nextCursor).toBeNull()
  })

  it('TC-047: người gọi không phải Participant thì ERR_NOT_PARTICIPANT', async () => {
    const repository = makeFakeSelectionRepository({ participant: null, eligible: makeDishCards(30) })

    const result = await listDeck(
      { selection: repository },
      { sessionId: 'session-1', userId: 'user-la', cursor: 0, pageSize: 20 },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_NOT_PARTICIPANT')
  })

  it('SPEC-011: Participant REMOVED cũng bị từ chối như chưa từng tham gia', async () => {
    const repository = makeFakeSelectionRepository({
      participant: { id: 'participant-1', state: 'REMOVED' },
      eligible: makeDishCards(30),
    })

    const result = await listDeck(
      { selection: repository },
      { sessionId: 'session-1', userId: 'user-1', cursor: 0, pageSize: 20 },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_NOT_PARTICIPANT')
  })
})
```

## 9.3 `src/features/selection/application/record-interaction.ts`

```ts
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { InteractionAction, InteractionType } from '../domain/interaction'
import type { SelectionRepository } from './selection-repository'

export type RecordInteractionDeps = {
  readonly selection: SelectionRepository
}

export type RecordInteractionInput = {
  readonly sessionId: string
  readonly userId: string
  readonly groupDishId: string
  readonly action: InteractionAction
}

/**
 * SPEC-012 — Ghi Session Interaction và Undo.
 *
 * Thứ tự kiểm BẤT BIẾN, dừng ở lỗi đầu tiên, đúng nguyên văn SDD: (1) Session
 * ACTIVE, (2) Participant chưa bị remove, (3) Dish còn Active trong pool.
 * Validate trước khi chạm tới bước ghi — không có bước nào ghi dữ liệu nếu
 * một trong ba bước trên thất bại (SDD §2.4).
 */
export async function recordInteraction(
  deps: RecordInteractionDeps,
  input: RecordInteractionInput,
): Promise<Result<{ effectiveInteraction: InteractionType | null }, Failure>> {
  const sessionState = await deps.selection.findSessionState(input.sessionId)
  if (sessionState !== 'ACTIVE') {
    return err(failure('ERR_SESSION_NOT_ACTIVE', { sessionId: input.sessionId }))
  }

  const participant = await deps.selection.findParticipant(input.sessionId, input.userId)
  if (participant === null || participant.state === 'REMOVED') {
    return err(failure('ERR_NOT_PARTICIPANT', { sessionId: input.sessionId }))
  }

  const dishActive = await deps.selection.isDishActiveInSession(input.sessionId, input.groupDishId)
  if (!dishActive) {
    return err(failure('ERR_DISH_NOT_IN_POOL', { groupDishId: input.groupDishId }))
  }

  const effectiveInteraction = await deps.selection.applyInteraction({
    sessionId: input.sessionId,
    participantId: participant.id,
    groupDishId: input.groupDishId,
    action: input.action,
  })

  return ok({ effectiveInteraction })
}
```

`record-interaction.test.ts` — **viết trước. Acceptance chính của E1-T9.**

```ts
import { describe, expect, it } from 'vitest'

import type { InteractionType } from '../domain/interaction'
import type { ParticipantRecord, SelectionRepository } from './selection-repository'
import { recordInteraction } from './record-interaction'

type ApplyCall = { action: string }

function makeFakeSelectionRepository(options: {
  sessionState?: 'DRAFT' | 'ACTIVE' | 'FINALIZED' | 'INVALID' | null
  participant?: ParticipantRecord | null
  dishActive?: boolean
  effective?: InteractionType | null
}) {
  const applyCalls: ApplyCall[] = []
  let effective = options.effective ?? null

  const repository: SelectionRepository = {
    async findParticipant() {
      return options.participant ?? { id: 'participant-1', state: 'ACTIVE' }
    },
    async listEligibleDishCards(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async findSessionState() {
      return options.sessionState ?? 'ACTIVE'
    },
    async isDishActiveInSession() {
      return options.dishActive ?? true
    },
    async applyInteraction(input) {
      applyCalls.push({ action: input.action })
      effective = input.action === 'UNDO' ? null : (input.action as InteractionType)
      return effective
    },
  }

  return { repository, applyCalls, get effective() { return effective } }
}

const INPUT = { sessionId: 'session-1', userId: 'user-1', groupDishId: 'dish-1' } as const

describe('SPEC-012 — Ghi Session Interaction và Undo', () => {
  it('TC-048: chưa có interaction, SWIPE_RIGHT thì effective SWIPE_RIGHT, 1 event', async () => {
    const fake = makeFakeSelectionRepository({})

    const result = await recordInteraction(
      { selection: fake.repository },
      { ...INPUT, action: 'SWIPE_RIGHT' },
    )

    expect(result.ok).toBe(true)
    expect(result.ok && result.value.effectiveInteraction).toBe('SWIPE_RIGHT')
    expect(fake.applyCalls).toHaveLength(1)
  })

  it('TC-049: effective SWIPE_RIGHT, SWIPE_LEFT thì effective SWIPE_LEFT', async () => {
    const fake = makeFakeSelectionRepository({ effective: 'SWIPE_RIGHT' })

    const result = await recordInteraction(
      { selection: fake.repository },
      { ...INPUT, action: 'SWIPE_LEFT' },
    )

    expect(result.ok && result.value.effectiveInteraction).toBe('SWIPE_LEFT')
  })

  it('TC-050: effective SWIPE_LEFT, UNDO thì effective null', async () => {
    const fake = makeFakeSelectionRepository({ effective: 'SWIPE_LEFT' })

    const result = await recordInteraction({ selection: fake.repository }, { ...INPUT, action: 'UNDO' })

    expect(result.ok && result.value.effectiveInteraction).toBeNull()
  })

  it('TC-051: chưa có interaction, UNDO thì effective null, không lỗi', async () => {
    const fake = makeFakeSelectionRepository({ effective: null })

    const result = await recordInteraction({ selection: fake.repository }, { ...INPUT, action: 'UNDO' })

    expect(result.ok).toBe(true)
    expect(result.ok && result.value.effectiveInteraction).toBeNull()
  })

  it('TC-052: Session FINALIZED thì ERR_SESSION_NOT_ACTIVE, KHÔNG chạm applyInteraction', async () => {
    const fake = makeFakeSelectionRepository({ sessionState: 'FINALIZED' })

    const result = await recordInteraction(
      { selection: fake.repository },
      { ...INPUT, action: 'SWIPE_RIGHT' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_SESSION_NOT_ACTIVE')
    expect(fake.applyCalls).toHaveLength(0)
  })

  it('SPEC-012: Participant đã bị REMOVED thì ERR_NOT_PARTICIPANT', async () => {
    const fake = makeFakeSelectionRepository({ participant: { id: 'p-1', state: 'REMOVED' } })

    const result = await recordInteraction(
      { selection: fake.repository },
      { ...INPUT, action: 'SWIPE_RIGHT' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_NOT_PARTICIPANT')
  })

  it('SPEC-012: Dish không còn Active trong pool thì ERR_DISH_NOT_IN_POOL', async () => {
    const fake = makeFakeSelectionRepository({ dishActive: false })

    const result = await recordInteraction(
      { selection: fake.repository },
      { ...INPUT, action: 'SWIPE_RIGHT' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_DISH_NOT_IN_POOL')
  })
})
```

---

# 10. Infrastructure

## 10.1 `src/features/selection/infrastructure/drizzle-selection-repository.ts`

```ts
import { and, eq, inArray } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { getDb } from '@/shared/db/client'
import {
  globalDishes,
  groupDishes,
  interactionEvents,
  interactions,
  participants,
  selectionSessions,
} from '@/shared/db/schema'

import type { InteractionAction, InteractionType } from '../domain/interaction'
import type { DishCard, ParticipantRecord, SelectionRepository } from '../application/selection-repository'

async function findParticipant(sessionId: string, userId: string): Promise<ParticipantRecord | null> {
  const rows = await getDb()
    .select({ id: participants.id, state: participants.state })
    .from(participants)
    .where(and(eq(participants.sessionId, sessionId), eq(participants.userId, userId)))
    .limit(1)

  return rows[0] ?? null
}

/**
 * VIẾT HAI GIAI ĐOẠN — xem Implementation Guide §2.5 và §9.1.
 *
 * Bản dưới đây là bản SAU E1-T9 (có LEFT JOIN `interactions`). Nếu bạn code
 * E1-T8 trước khi bảng `interactions` tồn tại, tạm bỏ khối JOIN + tham số
 * `participantId` không dùng tới, và trả `effectiveInteraction: null` cứng —
 * rồi quay lại sửa đúng hàm này khi tới E1-T9, đừng tạo hàm thứ hai.
 */
async function listEligibleDishCards(sessionId: string, participantId: string): Promise<DishCard[]> {
  const rows = await getDb()
    .select({
      dishId: groupDishes.id,
      name: globalDishes.name,
      effectiveType: interactions.type,
    })
    .from(groupDishes)
    .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
    .innerJoin(selectionSessions, eq(selectionSessions.groupId, groupDishes.groupId))
    .leftJoin(
      interactions,
      and(
        eq(interactions.groupDishId, groupDishes.id),
        eq(interactions.sessionId, sessionId),
        eq(interactions.participantId, participantId),
      ),
    )
    .where(and(eq(selectionSessions.id, sessionId), eq(groupDishes.state, 'ACTIVE')))
    .orderBy(groupDishes.id)

  // `systemTags` luôn rỗng ở S5 — `group_dish_tags` là E2-T5, chưa tồn tại.
  return rows.map((row) => ({
    dishId: row.dishId,
    name: row.name,
    systemTags: [],
    effectiveInteraction: row.effectiveType,
  }))
}

async function findSessionState(
  sessionId: string,
): Promise<'DRAFT' | 'ACTIVE' | 'FINALIZED' | 'INVALID' | null> {
  const rows = await getDb()
    .select({ state: selectionSessions.state })
    .from(selectionSessions)
    .where(eq(selectionSessions.id, sessionId))
    .limit(1)

  return rows[0]?.state ?? null
}

async function isDishActiveInSession(sessionId: string, groupDishId: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: groupDishes.id })
    .from(groupDishes)
    .innerJoin(selectionSessions, eq(selectionSessions.groupId, groupDishes.groupId))
    .where(
      and(
        eq(selectionSessions.id, sessionId),
        eq(groupDishes.id, groupDishId),
        eq(groupDishes.state, 'ACTIVE'),
      ),
    )
    .limit(1)

  return rows.length > 0
}

async function applyInteraction(input: {
  sessionId: string
  participantId: string
  groupDishId: string
  action: InteractionAction
}): Promise<InteractionType | null> {
  const db = getDb()

  if (input.action === 'UNDO') {
    // `db.batch([...])` của neon-http LÀ transaction thật (verify ở S2/S3/S4).
    // DELETE khớp 0 dòng (chưa từng có interaction) KHÔNG phải lỗi — TC-051
    // dựa đúng vào việc này.
    await db.batch([
      db
        .delete(interactions)
        .where(
          and(
            eq(interactions.sessionId, input.sessionId),
            eq(interactions.participantId, input.participantId),
            eq(interactions.groupDishId, input.groupDishId),
          ),
        ),
      db.insert(interactionEvents).values({
        id: uuidv7(),
        sessionId: input.sessionId,
        participantId: input.participantId,
        groupDishId: input.groupDishId,
        action: 'UNDO',
      }),
    ])
    return null
  }

  const type: InteractionType = input.action

  await db.batch([
    db
      .insert(interactions)
      .values({
        id: uuidv7(),
        sessionId: input.sessionId,
        participantId: input.participantId,
        groupDishId: input.groupDishId,
        type,
      })
      .onConflictDoUpdate({
        target: [interactions.sessionId, interactions.participantId, interactions.groupDishId],
        set: { type, updatedAt: new Date() },
      }),
    db.insert(interactionEvents).values({
      id: uuidv7(),
      sessionId: input.sessionId,
      participantId: input.participantId,
      groupDishId: input.groupDishId,
      action: input.action,
    }),
  ])

  return type
}

export const drizzleSelectionRepository: SelectionRepository = {
  findParticipant,
  listEligibleDishCards,
  findSessionState,
  isDishActiveInSession,
  applyInteraction,
}
```

> `db.batch()` cần tuple ≥1 phần tử — cả hai nhánh trên đều truyền literal array 2 phần tử, không `.map()`, đúng ràng buộc đã ghi ở S2/S3/S4.

Không unit test riêng cho file này (Tech Spec §8.2). Chứng minh ở integration test (TC-053) và smoke test thủ công (§14).

## 10.2 `src/features/selection/infrastructure/drizzle-selection-repository.integration.test.ts`

```ts
import { and, eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { getDb } from '@/shared/db/client'
import {
  groupDishes,
  groupMembers,
  globalDishes,
  groups,
  interactionEvents,
  interactions,
  participants,
  selectionSessions,
  users,
} from '@/shared/db/schema'

import { recordInteraction } from '../application/record-interaction'
import { drizzleSelectionRepository } from './drizzle-selection-repository'

/** Seed tối thiểu: User + Group + Session ACTIVE + Participant + một Dish Active. */
async function seedActiveSessionWithDish() {
  const db = getDb()
  const userId = crypto.randomUUID()
  const groupId = crypto.randomUUID()
  const sessionId = crypto.randomUUID()
  const participantId = crypto.randomUUID()
  const globalDishId = crypto.randomUUID()
  const groupDishId = crypto.randomUUID()

  await db.insert(users).values({
    id: userId,
    provider: 'test',
    providerSubject: `integration-${userId}`,
    email: `${userId}@example.test`,
    displayName: 'Integration Test User',
  })
  await db.insert(groups).values({ id: groupId, name: 'Integration Test Group', timezone: 'UTC' })
  await db.insert(groupMembers).values({ groupId, userId, isAdmin: true })
  await db.insert(selectionSessions).values({
    id: sessionId,
    groupId,
    decisionDate: '2026-08-17',
    creatorUserId: userId,
    state: 'ACTIVE',
  })
  await db.insert(participants).values({ id: participantId, sessionId, userId, state: 'ACTIVE' })
  await db.insert(globalDishes).values({
    id: globalDishId,
    name: 'Món tích hợp',
    normalizedName: 'món tích hợp',
    createdByUserId: userId,
    createdFromGroupId: groupId,
  })
  await db.insert(groupDishes).values({ id: groupDishId, groupId, globalDishId, state: 'ACTIVE' })

  return { userId, groupId, sessionId, participantId, globalDishId, groupDishId }
}

async function cleanup(seed: Awaited<ReturnType<typeof seedActiveSessionWithDish>>) {
  const db = getDb()
  await db.delete(interactionEvents).where(eq(interactionEvents.sessionId, seed.sessionId))
  await db.delete(interactions).where(eq(interactions.sessionId, seed.sessionId))
  await db.delete(groupDishes).where(eq(groupDishes.id, seed.groupDishId))
  await db.delete(globalDishes).where(eq(globalDishes.id, seed.globalDishId))
  await db.delete(participants).where(eq(participants.sessionId, seed.sessionId))
  await db.delete(selectionSessions).where(eq(selectionSessions.id, seed.sessionId))
  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, seed.groupId), eq(groupMembers.userId, seed.userId)))
  await db.delete(groups).where(eq(groups.id, seed.groupId))
  await db.delete(users).where(eq(users.id, seed.userId))
}

const cleanupQueue: Array<() => Promise<void>> = []

afterEach(async () => {
  while (cleanupQueue.length > 0) {
    const fn = cleanupQueue.pop()
    if (fn !== undefined) await fn()
  }
})

describe('SPEC-012 — idempotent thật (TC-053)', () => {
  it('TC-053: SWIPE_RIGHT gửi hai lần liên tiếp thì effective vẫn SWIPE_RIGHT', async () => {
    const seed = await seedActiveSessionWithDish()
    cleanupQueue.push(() => cleanup(seed))

    const first = await recordInteraction(
      { selection: drizzleSelectionRepository },
      { sessionId: seed.sessionId, userId: seed.userId, groupDishId: seed.groupDishId, action: 'SWIPE_RIGHT' },
    )
    const second = await recordInteraction(
      { selection: drizzleSelectionRepository },
      { sessionId: seed.sessionId, userId: seed.userId, groupDishId: seed.groupDishId, action: 'SWIPE_RIGHT' },
    )

    expect(first.ok && first.value.effectiveInteraction).toBe('SWIPE_RIGHT')
    expect(second.ok && second.value.effectiveInteraction).toBe('SWIPE_RIGHT')

    // Đúng MỘT dòng effective — upsert không tạo bản trùng (unique constraint
    // session_id+participant_id+group_dish_id).
    const rows = await getDb()
      .select()
      .from(interactions)
      .where(eq(interactions.sessionId, seed.sessionId))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.type).toBe('SWIPE_RIGHT')
  })
})
```

---

# 11. Route Handler (E1-T9)

## 11.1 `src/app/api/sessions/[id]/interactions/route.ts`

```ts
import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { drizzleSelectionRepository } from '@/features/selection/infrastructure/drizzle-selection-repository'
import { recordInteraction } from '@/features/selection/application/record-interaction'
import type { InteractionAction } from '@/features/selection/domain/interaction'
import { httpStatusForErrorCode } from '@/shared/http-error'

// Khai kiểu thủ công, KHÔNG dùng helper `RouteContext` (bẫy 19, §1.2).
type RouteParams = { params: Promise<{ id: string }> }

const VALID_ACTIONS: readonly InteractionAction[] = ['SWIPE_RIGHT', 'SWIPE_LEFT', 'UNDO']

function isValidAction(value: unknown): value is InteractionAction {
  return typeof value === 'string' && (VALID_ACTIONS as readonly string[]).includes(value)
}

/**
 * SPEC-012 — Route Handler, KHÔNG phải Server Action (Tech Spec §4.1): React
 * serialise Server Action liên tiếp, mà NFR-02 đòi phản hồi ≤100ms cho mỗi
 * lượt vuốt. Route Handler cho phép gửi song song.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser()
  if (user === null) {
    return Response.json({ code: 'ERR_UNAUTHENTICATED' }, { status: httpStatusForErrorCode('ERR_UNAUTHENTICATED') })
  }

  const { id: sessionId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ code: 'ERR_VALIDATION' }, { status: httpStatusForErrorCode('ERR_VALIDATION') })
  }

  const dishId = typeof body === 'object' && body !== null ? (body as Record<string, unknown>)['dishId'] : undefined
  const action = typeof body === 'object' && body !== null ? (body as Record<string, unknown>)['action'] : undefined

  if (typeof dishId !== 'string' || dishId === '' || !isValidAction(action)) {
    return Response.json({ code: 'ERR_VALIDATION' }, { status: httpStatusForErrorCode('ERR_VALIDATION') })
  }

  const result = await recordInteraction(
    { selection: drizzleSelectionRepository },
    { sessionId, userId: user.id, groupDishId: dishId, action },
  )

  if (!result.ok) {
    return Response.json(
      { code: result.error.code, details: result.error.details },
      { status: httpStatusForErrorCode(result.error.code) },
    )
  }

  return Response.json({ effectiveInteraction: result.value.effectiveInteraction }, { status: 200 })
}
```

Không unit test cho `route.ts` (giống mọi `page.tsx`/`route.ts` khác — lắp ráp thuần, logic đã test ở `record-interaction.test.ts`). Chứng minh ở smoke test §14.

---

# 12. Component — S-09 Deck vuốt

## 12.0 `src/shared/ui/button.tsx` — thêm hai variant `yes`/`no`

Hai nút lớn của S-09 ("Đề xuất" nền `--yes`, "Không hôm nay" viền+chữ `--no`) không khớp variant nào đã có (`primary` dùng `--accent`, `secondary` dùng `--ink`). Ghi đè màu bằng `className` (`text-no`, `bg-yes`...) **không an toàn**: className truyền vào ghép sau class của variant trong cùng chuỗi, nhưng cả hai đều là utility class cùng độ đặc hiệu — ai thắng phụ thuộc **thứ tự trong stylesheet đã build**, không phải thứ tự trong JSX. Guide S2 đã tự nhắc chính điều này khi thêm `quietAccent` thay vì `className="text-accent"`. Áp dụng lại đúng nguyên tắc đó: thêm hai variant thật.

```ts
type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'quietAccent' | 'yes' | 'no'
```

Thêm vào `VARIANT_CLASSES` (giữ nguyên bốn dòng cũ của S2):

```ts
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // …primary, secondary, quiet, quietAccent như S2…
  yes: 'bg-yes text-on-accent shadow-button hover:bg-yes-hover active:bg-yes',
  no: 'border border-border-strong bg-surface-raised text-no hover:border-no hover:text-ink active:bg-no-soft',
}
```

`--yes`/`--no` chỉ dùng ở đúng ba chỗ theo Design Handoff §9 (nút "Đề xuất", nền thẻ khi kéo phải, số "đề xuất" trong bảng tổng hợp S-10) — hai variant này CHÍNH LÀ một trong ba chỗ đó, không phải mở khoá dùng tuỳ tiện. `no` không có bóng đổ và luôn trung tính — vuốt trái/không đề xuất không bao giờ dùng `--danger` (đúng ràng buộc Design Handoff §10).

## 12.1 `src/features/selection/presentation/components/use-swipe-gesture.ts`

```ts
'use client'

import type { PointerEvent as ReactPointerEvent } from 'react'
import { useCallback, useRef, useState } from 'react'

import {
  computeDragRotationDeg,
  computeFlyOutTranslateX,
  resolvePreviewDirection,
  shouldCommitOnRelease,
  type SwipeDirection,
} from '../../domain/swipe-gesture'

export type SwipeGestureState = {
  dx: number
  dragging: boolean
  flying: SwipeDirection
}

const FLY_DURATION_MS = 180

/**
 * Hook cử chỉ — bọc toán học thuần ở `domain/swipe-gesture.ts` bằng Pointer
 * Events. `setPointerCapture` gọi qua optional chaining: jsdom không hiện
 * thực method này (§1.1 Implementation Guide) — dùng `?.()` vừa né lỗi test
 * vừa là thực hành đúng cho trình duyệt không hỗ trợ.
 */
export function useSwipeGesture(onCommit: (direction: SwipeDirection) => void) {
  const [state, setState] = useState<SwipeGestureState>({ dx: 0, dragging: false, flying: 0 })
  const startXRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    startXRef.current = event.clientX
    setState((s) => ({ ...s, dragging: true }))
  }, [])

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    setState((s) => (s.dragging ? { ...s, dx: event.clientX - startXRef.current } : s))
  }, [])

  const commit = useCallback(
    (direction: SwipeDirection) => {
      if (direction === 0) return
      setState({ dx: computeFlyOutTranslateX(direction), dragging: false, flying: direction })
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        onCommit(direction)
        setState({ dx: 0, dragging: false, flying: 0 })
      }, FLY_DURATION_MS)
    },
    [onCommit],
  )

  const handlePointerUp = useCallback(() => {
    setState((s) => {
      const direction = shouldCommitOnRelease(s.dx)
      if (direction !== 0) {
        // `commit` tự setState — trả nguyên state hiện tại để tránh setState lồng.
        queueMicrotask(() => commit(direction))
        return s
      }
      return { ...s, dragging: false, dx: 0 }
    })
  }, [commit])

  const previewDirection = resolvePreviewDirection(state.dx)
  const rotationDeg = computeDragRotationDeg(state.dx)

  return {
    dx: state.dx,
    dragging: state.dragging,
    flying: state.flying,
    previewDirection,
    rotationDeg,
    commitByButton: commit,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
  }
}
```

## 12.2 `src/features/selection/presentation/components/dish-swipe-card.tsx`

```tsx
'use client'

import type { ReactElement } from 'react'

import type { DishCard } from '../../application/selection-repository'
import { useSwipeGesture } from './use-swipe-gesture'
import type { SwipeDirection } from '../../domain/swipe-gesture'

export type DishSwipeCardProps = {
  dish: DishCard
  /** "Lần cuối ăn · N ngày trước" — LUÔN "Chưa từng ăn" ở S5, `eating_history`
   *  chưa tồn tại (E1-T11). */
  lastEatenLabel: string
  /** Câu giải thích ranking — LUÔN một câu chung ở S5, ranking thật là E4. */
  explanation: string
  /** Tên hai món kế tiếp trong deck — "Trong chồng". */
  upcomingNames: readonly string[]
  onCommit: (direction: SwipeDirection, dishId: string) => void
}

const DIRECTION_STYLES: Record<
  SwipeDirection,
  { background: string; border: string; label: string; dragLabelBackground: string }
> = {
  [-1]: { background: 'bg-no-soft', border: 'border-no', label: 'Không hôm nay', dragLabelBackground: 'bg-no' },
  0: { background: 'bg-surface-raised', border: 'border-border', label: '', dragLabelBackground: '' },
  1: { background: 'bg-yes-soft', border: 'border-yes', label: 'Đề xuất', dragLabelBackground: 'bg-yes' },
}

/**
 * Thẻ chính của S-09. `reason` chip đổi màu theo explore lane là F18/v1.1 —
 * BỎ ở S5, luôn dùng màu trung tính (`--surface-sunken`/`--ink-muted`).
 */
export function DishSwipeCard({
  dish,
  lastEatenLabel,
  explanation,
  upcomingNames,
  onCommit,
}: DishSwipeCardProps): ReactElement {
  const gesture = useSwipeGesture((direction) => onCommit(direction, dish.dishId))
  const tone = DIRECTION_STYLES[gesture.previewDirection]

  const transform = gesture.flying
    ? `translateX(${gesture.dx}px)`
    : `translateX(${gesture.dx}px) rotate(${gesture.rotationDeg}deg)`
  const transition = gesture.dragging
    ? 'none'
    : 'transform .18s ease, opacity .18s ease, background .12s linear'

  return (
    <div
      {...gesture.handlers}
      style={{ transform, transition, opacity: gesture.flying ? 0 : 1 }}
      className={`relative flex h-full touch-none select-none flex-col gap-4 rounded-card border p-6 shadow-lift ${tone.background} ${tone.border}`}
    >
      <div className="flex min-h-[30px] items-start justify-between gap-3">
        <span className="rounded-chip bg-surface-sunken px-3 py-1.5 text-caption font-medium text-ink-muted">
          {dish.systemTags[0] ?? 'Trong danh mục'}
        </span>
        {tone.label === '' ? null : (
          <span
            className={`flex-none rounded-chip px-3 py-1.5 text-caption font-semibold text-on-accent ${tone.dragLabelBackground}`}
          >
            {tone.label}
          </span>
        )}
      </div>

      <h2 className="text-pretty text-display font-bold text-ink">{dish.name}</h2>

      {dish.systemTags.length === 0 ? null : (
        <div className="flex flex-wrap gap-2">
          {dish.systemTags.map((tag) => (
            <span key={tag} className="rounded-full bg-surface-sunken px-3 py-1.5 text-caption font-medium text-ink-muted">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex-1" />

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <span className="tabular text-caption font-medium text-ink-muted">{lastEatenLabel}</span>
        <span className="text-pretty text-body font-normal text-ink-muted">{explanation}</span>
      </div>

      {upcomingNames.length === 0 ? null : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="h-px w-6 bg-border-strong" />
            <span className="text-caption font-medium text-ink-muted">Trong chồng</span>
          </div>
          {upcomingNames.map((name) => (
            <span key={name} className="text-subtitle font-semibold text-ink-muted">
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
```

> `reason` chip ở S5 hiện tạm `dish.systemTags[0] ?? 'Trong danh mục'` — vì `systemTags` luôn rỗng nên luôn hiện "Trong danh mục", KHÔNG phải chip lý do ranking thật ("Lâu chưa ăn", "Bạn thích món này"...) như prototype — đó cần dữ liệu ranking (E4). Ghi rõ trong PR đây là placeholder có chủ ý.

`dish-swipe-card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { DishCard } from '../../application/selection-repository'
import { DishSwipeCard } from './dish-swipe-card'

const DISH: DishCard = { dishId: 'dish-1', name: 'Cá basa kho tiêu', systemTags: [], effectiveInteraction: null }

describe('DishSwipeCard', () => {
  it('hiện tên món, footer, và Trong chồng', () => {
    render(
      <DishSwipeCard
        dish={DISH}
        lastEatenLabel="Chưa từng ăn"
        explanation="Món này đang có trong danh mục của nhóm."
        upcomingNames={['Canh chua cá lóc', 'Gà chiên nước mắm']}
        onCommit={vi.fn()}
      />,
    )

    expect(screen.getByText('Cá basa kho tiêu')).toBeInTheDocument()
    expect(screen.getByText('Chưa từng ăn')).toBeInTheDocument()
    expect(screen.getByText('Canh chua cá lóc')).toBeInTheDocument()
    expect(screen.getByText('Gà chiên nước mắm')).toBeInTheDocument()
  })

  it('không có Trong chồng thì không render khối đó', () => {
    render(
      <DishSwipeCard
        dish={DISH}
        lastEatenLabel="Chưa từng ăn"
        explanation="..."
        upcomingNames={[]}
        onCommit={vi.fn()}
      />,
    )

    expect(screen.queryByText('Trong chồng')).not.toBeInTheDocument()
  })
})
```

## 12.3 `src/features/selection/presentation/components/send-interaction.ts`

```ts
import type { InteractionAction, InteractionType } from '../../domain/interaction'

export type SendInteractionStatus = 'idle' | 'retrying' | 'failed'

/** NFR-05: 3 lần retry, backoff 1s/2s/4s. Chưa có đặc tả số chính xác — đây
 *  là lựa chọn hợp lý cho quy mô <10 người dùng, không phải hằng số bất biến. */
const RETRY_DELAYS_MS = [1000, 2000, 4000]

export type SendInteractionResult =
  | { ok: true; effectiveInteraction: InteractionType | null }
  | { ok: false }

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
```

`send-interaction.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

import { sendInteractionWithRetry } from './send-interaction'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('sendInteractionWithRetry', () => {
  it('thành công ngay lần đầu thì không retry, báo idle', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ effectiveInteraction: 'SWIPE_RIGHT' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const onStatusChange = vi.fn()

    const result = await sendInteractionWithRetry(
      'session-1',
      { dishId: 'dish-1', action: 'SWIPE_RIGHT' },
      onStatusChange,
    )

    expect(result).toEqual({ ok: true, effectiveInteraction: 'SWIPE_RIGHT' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(onStatusChange).toHaveBeenCalledWith('idle')
  })

  it('lỗi 400 thì KHÔNG retry, báo failed ngay', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400 })
    vi.stubGlobal('fetch', fetchMock)
    const onStatusChange = vi.fn()

    const result = await sendInteractionWithRetry(
      'session-1',
      { dishId: 'dish-1', action: 'SWIPE_RIGHT' },
      onStatusChange,
    )

    expect(result).toEqual({ ok: false })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(onStatusChange).toHaveBeenLastCalledWith('failed')
  })

  it('lỗi mạng liên tục thì retry đủ số lần rồi báo failed', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockRejectedValue(new Error('network'))
    vi.stubGlobal('fetch', fetchMock)
    const onStatusChange = vi.fn()

    const promise = sendInteractionWithRetry(
      'session-1',
      { dishId: 'dish-1', action: 'SWIPE_RIGHT' },
      onStatusChange,
    )
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toEqual({ ok: false })
    expect(fetchMock).toHaveBeenCalledTimes(4) // 1 lần đầu + 3 retry
    expect(onStatusChange).toHaveBeenCalledWith('retrying')
    expect(onStatusChange).toHaveBeenLastCalledWith('failed')
    vi.useRealTimers()
  })
})
```

## 12.4 `src/features/selection/presentation/components/deck-screen.tsx`

```tsx
'use client'

import type { ReactElement } from 'react'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'

import type { DishCard } from '../../application/selection-repository'
import type { SwipeDirection } from '../../domain/swipe-gesture'
import { DishSwipeCard } from './dish-swipe-card'
import type { SendInteractionStatus } from './send-interaction'
import { sendInteractionWithRetry } from './send-interaction'

export type DeckScreenProps = {
  sessionId: string
  dateCaption: string
  dishes: DishCard[]
}

type ViewState = 'deck' | 'done'

const GENERIC_EXPLANATION = 'Món này đang có trong danh mục của nhóm.'
const NEVER_EATEN_LABEL = 'Chưa từng ăn' // eating_history chưa tồn tại (E1-T11)

/**
 * S-09 Deck vuốt ⭐ màn hình chính.
 *
 * E1-T8 dựng TOÀN BỘ UI này với dữ liệu deck thật, hành động chỉ đổi state
 * cục bộ. E1-T9 thêm `sendInteractionWithRetry` vào `commit()` — cùng một
 * UI, không viết lại (Implementation Guide §2.1).
 *
 * CỐ Ý CHƯA CÓ ở S5 (F15/F18, v1.1): nút "Tôi không ăn được món này", đổi màu
 * reason chip theo explore lane.
 */
export function DeckScreen({ sessionId, dateCaption, dishes }: DeckScreenProps): ReactElement {
  const [cursor, setCursor] = useState(0)
  const [marks, setMarks] = useState<Array<'yes' | 'no'>>([])
  const [view, setView] = useState<ViewState>('deck')
  const [sendStatus, setSendStatus] = useState<SendInteractionStatus>('idle')
  const [failedCount, setFailedCount] = useState(0)

  const current = dishes[cursor]
  const isEmpty = view === 'deck' && current === undefined
  const isDeck = view === 'deck' && current !== undefined
  const isDone = view === 'done'

  const yesCount = marks.filter((m) => m === 'yes').length
  const noCount = marks.filter((m) => m === 'no').length
  const total = dishes.length
  const progress = `${Math.min(cursor + 1, total)} / ${total}`
  const progressPercent = total === 0 ? 0 : Math.round((Math.min(cursor, total) / total) * 100)

  function handleCommit(direction: SwipeDirection, dishId: string) {
    if (direction === 0) return
    setMarks((m) => [...m, direction === 1 ? 'yes' : 'no'])
    setCursor((c) => c + 1)

    const action = direction === 1 ? 'SWIPE_RIGHT' : 'SWIPE_LEFT'
    // Fire-and-forget có chủ ý: UI đã tiến rồi (optimistic), không await ở đây
    // — nhiều lượt vuốt liên tiếp gửi song song, đúng lý do chọn Route Handler
    // thay Server Action (Tech Spec §4.1).
    void sendInteractionWithRetry(sessionId, { dishId, action }, (status) => {
      setSendStatus(status)
      if (status === 'failed') setFailedCount((n) => n + 1)
    })
  }

  function handleUndo() {
    if (cursor === 0) return
    const previousDish = dishes[cursor - 1]
    setCursor((c) => c - 1)
    setMarks((m) => m.slice(0, -1))
    if (previousDish !== undefined) {
      void sendInteractionWithRetry(sessionId, { dishId: previousDish.dishId, action: 'UNDO' }, setSendStatus)
    }
  }

  const upcoming = dishes.slice(cursor + 1, cursor + 3).map((d) => d.name)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      {sendStatus === 'idle' ? null : (
        <div className="flex items-center gap-2 border-b border-border bg-warning-soft px-4 py-2">
          <span aria-hidden className="h-4 w-[3px] rounded-full bg-warning" />
          <span className="text-caption font-medium text-ink">
            {sendStatus === 'retrying'
              ? 'Đang thử gửi lại · bạn vuốt tiếp được'
              : `Không gửi được ${failedCount} lượt vuốt. Vuốt tiếp vẫn được.`}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3 px-4 pb-3 pt-4">
        <div className="flex min-h-6 items-center justify-between gap-3">
          <span className="text-caption font-medium text-ink-muted">Bữa tối · {dateCaption}</span>
          <span className="tabular text-caption font-semibold text-ink-muted">{progress}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="relative min-h-0 flex-1 px-4 pt-2">
        {isDeck && current !== undefined ? (
          <>
            <div className="absolute inset-x-10 top-0 h-[140px] rounded-card border border-border" />
            <div className="absolute inset-x-[30px] top-[5px] h-[140px] rounded-card border border-border" />
            <DishSwipeCard
              dish={current}
              lastEatenLabel={NEVER_EATEN_LABEL}
              explanation={GENERIC_EXPLANATION}
              upcomingNames={upcoming}
              onCommit={handleCommit}
            />
          </>
        ) : null}

        {isEmpty ? (
          <div className="flex h-full flex-col justify-center gap-3 px-2">
            <h2 className="text-title font-semibold text-ink">Bạn đã xem hết {cursor} món.</h2>
            <p className="text-pretty text-body-lg font-normal text-ink-muted">
              Đã đề xuất {yesCount} món. Xong lượt của mình chứ?
            </p>
          </div>
        ) : null}

        {isDone ? (
          <div className="flex h-full flex-col justify-center gap-4 px-2">
            <h2 className="text-title font-semibold text-ink">Xong lượt của bạn.</h2>
            <p className="text-pretty text-body-lg font-normal text-ink-muted">
              Bạn đã đề xuất {yesCount} món và bỏ qua {noCount} món.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 px-4 pb-8 pt-6">
        {isDeck ? (
          <>
            <div className="flex gap-3">
              {/* `flex-1` bù lại `w-full` mà size="lg" đặt trên chính button —
                  không có nó hai nút sẽ co về kích thước chữ thay vì chia đôi
                  hàng, đúng thiết kế "flex:1 mỗi nút". */}
              <Button
                type="button"
                variant="no"
                className="flex-1"
                aria-label={current === undefined ? undefined : `Không muốn ăn ${current.name} hôm nay`}
                onClick={() => current !== undefined && handleCommit(-1, current.dishId)}
              >
                Không hôm nay
              </Button>
              <Button
                type="button"
                variant="yes"
                className="flex-1"
                aria-label={current === undefined ? undefined : `Đề xuất ${current.name}`}
                onClick={() => current !== undefined && handleCommit(1, current.dishId)}
              >
                Đề xuất
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <Button type="button" variant="quiet" size="sm" disabled={cursor === 0} onClick={handleUndo}>
                Hoàn tác
              </Button>
            </div>
            <Button type="button" variant="quiet" size="sm" onClick={() => setView('done')}>
              Tôi chọn xong
            </Button>
          </>
        ) : null}

        {isEmpty ? (
          <>
            <Button type="button" onClick={() => setView('done')}>
              Tôi chọn xong
            </Button>
            <Button type="button" variant="quiet" size="sm" onClick={() => { setCursor(0); setMarks([]) }}>
              Xem lại từ đầu
            </Button>
          </>
        ) : null}

        {isDone ? (
          <>
            <Button type="button" variant="secondary" onClick={() => setView('deck')}>
              Mở lại lượt chọn
            </Button>
            <span className="self-center text-caption font-medium text-ink-muted">
              Sửa được cho tới khi Mẹ chốt bữa
            </span>
          </>
        ) : null}
      </div>
    </main>
  )
}
```

> Hai thẻ hé phía sau (`inset-x-10 top-0 h-[140px]` và `inset-x-[30px] top-[5px] h-[140px]`) là trang trí tĩnh, không đổi theo dữ liệu — dùng arbitrary value Tailwind vì 40px/30px/5px/140px không nằm gọn trên thang mặc định. Đúng con số từ prototype (§1 báo cáo khảo sát).
>
> `aria-label={undefined}` khi `current === undefined`: về mặt logic hai nút này chỉ render trong nhánh `isDeck` (đã đảm bảo `current !== undefined`) — điều kiện `current === undefined` trong `aria-label` chỉ để `tsc` hài lòng với `noUncheckedIndexedAccess`, không bao giờ thực sự xảy ra ở runtime.

`deck-screen.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { DishCard } from '../../application/selection-repository'
import { DeckScreen } from './deck-screen'

function makeDishes(names: string[]): DishCard[] {
  return names.map((name, i) => ({ dishId: `dish-${i}`, name, systemTags: [], effectiveInteraction: null }))
}

describe('S-09 Deck vuốt', () => {
  it('hiện món đầu tiên và bộ đếm 1/N', () => {
    render(<DeckScreen sessionId="s1" dateCaption="Thứ Ba 18/8" dishes={makeDishes(['Cá basa kho tiêu', 'Canh chua'])} />)

    expect(screen.getByText('Cá basa kho tiêu')).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('Hoàn tác disabled ở món đầu tiên', () => {
    render(<DeckScreen sessionId="s1" dateCaption="Thứ Ba 18/8" dishes={makeDishes(['Cá basa kho tiêu'])} />)

    expect(screen.getByRole('button', { name: 'Hoàn tác' })).toBeDisabled()
  })

  it('bấm Đề xuất thì tiến sang món kế tiếp', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ effectiveInteraction: 'SWIPE_RIGHT' }) }))

    render(<DeckScreen sessionId="s1" dateCaption="Thứ Ba 18/8" dishes={makeDishes(['Cá basa kho tiêu', 'Canh chua'])} />)
    await userEvent.click(screen.getByRole('button', { name: 'Đề xuất Cá basa kho tiêu' }))

    expect(await screen.findByText('Canh chua')).toBeInTheDocument()
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    vi.unstubAllGlobals()
  })

  it('hết deck thì chuyển trạng thái hết món', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ effectiveInteraction: 'SWIPE_RIGHT' }) }))

    render(<DeckScreen sessionId="s1" dateCaption="Thứ Ba 18/8" dishes={makeDishes(['Cá basa kho tiêu'])} />)
    await userEvent.click(screen.getByRole('button', { name: 'Đề xuất Cá basa kho tiêu' }))

    expect(await screen.findByText('Bạn đã xem hết 1 món.')).toBeInTheDocument()
    expect(screen.getByText('Đã đề xuất 1 món. Xong lượt của mình chứ?')).toBeInTheDocument()

    vi.unstubAllGlobals()
  })

  it('bấm Tôi chọn xong thì chuyển Xong lượt của bạn', async () => {
    render(<DeckScreen sessionId="s1" dateCaption="Thứ Ba 18/8" dishes={makeDishes(['Cá basa kho tiêu'])} />)

    await userEvent.click(screen.getByRole('button', { name: 'Tôi chọn xong' }))

    expect(screen.getByText('Xong lượt của bạn.')).toBeInTheDocument()
    expect(screen.getByText('Mở lại lượt chọn')).toBeInTheDocument()
  })
})
```

> Không test cử chỉ kéo bằng pointer event thật ở tầng component (jsdom thiếu `setPointerCapture`, §1.1) — toán học cử chỉ đã test đầy đủ ở `swipe-gesture.test.ts` (§5.3), và hai nút lớn (đường thay thế bắt buộc cho cử chỉ) đã test hành vi commit ở trên. Đây là phép thay thế hợp lệ, không phải khoảng trống test.

---

# 13. Route và lắp ráp

## 13.1 `src/app/sessions/[sessionId]/page.tsx`

```tsx
import { notFound, redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { assertGroupAccess } from '@/features/group/application/assert-group-access'
import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import { listDeck } from '@/features/selection/application/list-deck'
import { drizzleSelectionRepository } from '@/features/selection/infrastructure/drizzle-selection-repository'
import { DeckScreen } from '@/features/selection/presentation/components/deck-screen'
import { drizzleSessionRepository } from '@/features/session/infrastructure/drizzle-session-repository'
import { formatVietnameseDateShort } from '@/shared/time/format-vietnamese-date'

// Khai kiểu thủ công, KHÔNG dùng helper `PageProps` (bẫy đã ghi ở S1-S4).
type SessionPageProps = {
  params: Promise<{ sessionId: string }>
}

// Đủ lớn để lấy TOÀN BỘ deck trong một lần — Tech Spec §3.3: Group ~30-100
// Dish, "không phân trang ở tầng DB". Xem Implementation Guide §2.4.
const WHOLE_DECK_PAGE_SIZE = 500

export default async function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = await params

  const user = await getCurrentUser()
  if (user === null) {
    redirect('/')
  }

  // Route PHẲNG, không có groupId trong URL (§2.2) — đọc Session trước để
  // biết Group nào mà gọi assertGroupAccess.
  const session = await drizzleSessionRepository.findById(sessionId)
  if (session === null) {
    notFound()
  }

  const access = await assertGroupAccess(
    { memberships: drizzleMembershipRepository },
    { userId: user.id, groupId: session.groupId, requiredRole: 'MEMBER' },
  )
  if (!access.ok) {
    notFound()
  }

  const deck = await listDeck(
    { selection: drizzleSelectionRepository },
    { sessionId, userId: user.id, cursor: 0, pageSize: WHOLE_DECK_PAGE_SIZE },
  )
  if (!deck.ok) {
    // ERR_NOT_PARTICIPANT — thành viên Group nhưng chưa từng được thêm vào
    // Session này. E3-T3 (thêm Participant) sẽ cho lối vào hợp lệ; ở S5 chỉ
    // báo not found, không có UI riêng cho trường hợp này.
    notFound()
  }

  return (
    <DeckScreen
      sessionId={sessionId}
      dateCaption={formatVietnameseDateShort(session.decisionDate)}
      dishes={deck.value.items}
    />
  )
}
```

---

# 14. Cấu hình phải sửa

| File | Sửa gì |
| --- | --- |
| `docs/plans/..._e1-s4-implementation-guide_v0_1.md` | **Đã patch** (§1.6): `SessionSummary.state` rộng thành `SessionState`, thêm `findById` vào port + infra |
| `src/shared/ui/button.tsx` | +variant `yes`, +variant `no` (§12.0) — hai nút lớn của S-09, dùng lại được ở S-10 |
| `src/shared/db/schema.ts` | +`interactionType`, +`interactionAction` (pgEnum), +`interactions`, +`interactionEvents` |
| migrations | `yarn db:generate --name=interactions` — số tự sinh, không hardcode |
| `src/shared/time/format-vietnamese-date.ts` | +`formatVietnameseDateShort` |
| `src/shared/http-error.ts` | mới — `httpStatusForErrorCode` |
| `src/shared/testing/factories.ts` | **không sửa** — S5 không cần factory mới (fake port trong test tự dựng dữ liệu cục bộ, không cần `makeInteraction` dùng chung vì shape đơn giản và chỉ dùng ở đúng một chỗ) |
| `docs/..._decision-log_v1.1.md` | 1 mục: quyết định "mọi request SPEC-012 luôn ghi event, kể cả lặp action" (§6.1) |
| `docs/..._master-plan_v1_0.md` | tick E1-T8, E1-T9 |

**Không sửa**: `eslint.config.mjs` (`selection` đã có sẵn trong `FEATURES` và `ALLOWED_CROSS_FEATURE`), `knip.jsonc` (mọi file mới có importer production qua `app/`), `vitest.config.mts`/`vitest.integration.config.mts` (hạ tầng đã dựng đủ ở S4, tái dùng nguyên xi), `next.config.ts`, `package.json` (không thêm dependency nào — Design Handoff §4).

---

# 15. Thứ tự thi công (TDD)

Nhánh `feat/deck-swipe-minimum`. Conventional Commits, scope `selection` / `db` / `app` / `ui`.

| # | Việc | Test viết TRƯỚC | Tick |
| --- | --- | --- | --- |
| 0 | Patch S4 guide (`findById`) nếu chưa làm; `yarn verify` xanh trên baseline S1-S4 | — | |
| 1 | `domain/deck-page.ts` | **ĐỎ trước — TC-045/046/047 (phần thuần)** | |
| 2 | `domain/interaction.ts` (chỉ type) | — | |
| 3 | `domain/swipe-gesture.ts` | **ĐỎ trước** (§5.3) | |
| 4 | port `selection-repository.ts` + `list-deck.ts` — CHƯA có `interactions` | **`list-deck.test.ts` ĐỎ trước — TC-045/046/047** | |
| 5 | `infrastructure/drizzle-selection-repository.ts` — bản E1-T8 (không JOIN interactions, `effectiveInteraction: null` cứng) | không unit test | **E1-T8 (logic)** |
| 6 | `shared/ui/button.tsx` +variant `yes`/`no` (§12.0); `presentation/`: `use-swipe-gesture.ts`, `dish-swipe-card.tsx`, `deck-screen.tsx` (action chỉ đổi state cục bộ, chưa gọi `sendInteractionWithRetry`) | **ĐỎ trước** (component test không cần fetch mock ở bước này); 4 test `Button` cũ của S1/S2 phải vẫn xanh | |
| 7 | `app/sessions/[sessionId]/page.tsx` | không unit test; kiểm bằng `yarn dev` | **E1-T8 (UI)** |
| 8 | `schema.ts` +`interactions`/`interactionEvents` → `yarn db:generate --name=interactions` → đọc `.sql` → migrate cả hai branch | | |
| 9 | `shared/http-error.ts` | **ĐỎ trước** (§8) | |
| 10 | `record-interaction.ts` | **ĐỎ trước — TC-048→052** | |
| 11 | Sửa `drizzle-selection-repository.ts`: thêm LEFT JOIN `interactions` vào `listEligibleDishCards`, thêm `findSessionState`/`isDishActiveInSession`/`applyInteraction` | | |
| 12 | `route.ts` | không unit test; kiểm bằng `curl`/DevTools | |
| 13 | `send-interaction.ts`, nối vào `deck-screen.tsx` (`handleCommit`/`handleUndo` gọi `sendInteractionWithRetry` thật) | **`send-interaction.test.ts` ĐỎ trước** | **E1-T9 (UI thật)** |
| 14 | Integration test TC-053 | `yarn test:integration`, chạy 3-5 lần liên tiếp | **E1-T9** |
| 15 | Decision log, master plan | `yarn verify && yarn arch:probe && yarn build` | |
| 16 | Smoke thủ công (§16) → PR link SPEC-010 (rút gọn), SPEC-011, SPEC-012, BR-040/041/042 | | |

Sau bước 10: `yarn test:coverage` — `deck-page.ts`, `list-deck.ts`, `record-interaction.ts`, `swipe-gesture.ts` phải ≥80% dòng.

---

# 16. Verify

## 16.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn build
yarn test:integration
```

`yarn test` in nhóm `SPEC-011 — Lấy trang deck` (6 it), `SPEC-012 — Ghi Session Interaction và Undo` (7 it), cộng test domain/component. `yarn test:integration` in `TC-053`.

## 16.2 Local — DevTools 390×844

```bash
yarn db:migrate && yarn dev
```

1. Tạo Group → thêm vài Dish (cần S3 landed) → tạo + Start Session (cần S4 landed) → mở `/sessions/<id>`.
2. Thấy chồng thẻ 2 lớp hé + thẻ chính, tên món, footer "Chưa từng ăn" + câu giải thích chung, "Trong chồng" 2 tên kế tiếp (nếu deck ≥3 món).
3. Kéo chuột/chạm sang phải >90px → thẻ bay phải, nền/viền đổi `--yes`/`--yes-soft` khi kéo qua 40px. Kéo trái tương tự với `--no`/`--no-soft` — **không bao giờ thấy màu đỏ**.
4. Bấm hai nút lớn "Không hôm nay"/"Đề xuất" cũng tiến deck y hệt cử chỉ.
5. Hoàn tác lùi lại đúng một món, disabled khi ở món đầu.
6. Vuốt hết → "Bạn đã xem hết N món." + "Đã đề xuất N món...". Bấm "Tôi chọn xong" → "Xong lượt của bạn." + "Mở lại lượt chọn" + "Sửa được cho tới khi Mẹ chốt bữa".
7. **`yarn db:studio`** → mỗi lượt vuốt có đúng 1 dòng `interactions` (cùng dish, vuốt lại thì UPDATE không thêm dòng) và ≥1 dòng `interaction_events` tương ứng.
8. **Bằng chứng NFR-05**: DevTools → Network → Offline, vuốt tiếp một món → dải "Đang thử gửi lại · bạn vuốt tiếp được" hiện ngay, **thao tác vuốt tiếp vẫn được** (không có gì bị khoá). Bật lại mạng trong lúc đang retry → dải biến mất, `db:studio` thấy dòng đã ghi.
9. Tắt mạng và **giữ tắt** qua hết 3 lần retry (~7 giây) → dải đổi câu "Không gửi được N lượt vuốt. Vuốt tiếp vẫn được."

## 16.3 Bằng chứng SPEC-011 `ERR_NOT_PARTICIPANT`

Đăng nhập bằng một tài khoản là Group Member nhưng CHƯA từng được thêm vào Session (chỉ Creator là Participant mặc định — SPEC-007) → mở `/sessions/<id>` → 404 (route hiện tại chưa có UI riêng cho `ERR_NOT_PARTICIPANT`, xem ghi chú trong `page.tsx` §13.1).

## 16.4 Preview Vercel

Env Preview trỏ Neon branch của PR; migration chạy trong build. Chạy lại kịch bản 1-8 **trên điện thoại thật** — đặc biệt bước 3 (cử chỉ kéo bằng ngón tay thật, không phải chuột giả lập) và bước 8 (bật chế độ máy bay thật thay vì DevTools Offline).

---

# 17. Rủi ro

| Rủi ro | Dấu hiệu | Phương án |
| --- | --- | --- |
| jsdom thiếu `setPointerCapture` làm test cử chỉ thật crash | `TypeError: setPointerCapture is not a function` | Đã tránh bằng optional chaining (§12.1) + tách toán học ra `swipe-gesture.ts` test riêng (§5.3, §1.1) |
| `db.batch()` cần tuple ≥1 phần tử | `tsc`: "not assignable to tuple" | Literal array 2 phần tử ở cả hai nhánh UNDO/upsert (§10.1) |
| Quên sửa `listEligibleDishCards` ở giai đoạn E1-T9 (vẫn hardcode `null`) | `effectiveInteraction` luôn `null` dù đã có interaction thật | Bước 11 trong TDD order nhắc rõ; kiểm bằng `db:studio` đối chiếu UI |
| `onConflictDoUpdate` target sai cột | upsert tạo dòng trùng thay vì update | `target` phải đúng BA cột của `interactions_session_participant_dish_unique`: `[sessionId, participantId, groupDishId]` |
| Route Handler không parse được body | 500 thay vì 400 rõ ràng | try/catch quanh `request.json()`, trả `ERR_VALIDATION` (§11.1, bẫy 21) |
| `Record<ErrorCode, number>` thiếu mã khi SDD thêm lỗi mới sau này | `tsc` đỏ ngay (đây là tính năng, không phải bug) | Thêm dòng tương ứng vào `HTTP_STATUS_BY_ERROR_CODE`, tra HTTP status trong SDD §2.5 |
| Nhiều lượt vuốt nhanh gửi song song, phản hồi về KHÔNG theo thứ tự gửi | effective interaction cuối cùng có thể không khớp lượt vuốt cuối cùng của UI nếu response trước bị trễ hơn response sau | SPEC-012 tự thân là upsert theo request đến sau cùng ở DB — chấp nhận độ lệch nhỏ này ở E1 (R-04 trong Tech Spec §9 đã ghi rủi ro tương tự cho trường hợp tổng quát hơn, xử lý triệt để bằng so `updated_at` phía server là việc của E2+) |
| Test `deck-screen.test.tsx` bị treo vì `sendInteractionWithRetry` thật sự gọi `setTimeout` dài | test chạy chậm hoặc timeout | Bốn test đầu ở §12.4 chỉ assert phần UI ngay sau khi `fetch` (mock) resolve — không rơi vào nhánh retry (không cần `vi.useFakeTimers()` ở test này, chỉ cần ở `send-interaction.test.ts`) |
| Migration số thứ tự đụng với S3/S4 nếu code sau | conflict `_journal.json` | Không hardcode; sinh migration ở commit cuối cùng trước PR |

---

# 18. Lịch sử thay đổi (Change History)

| Version | Ngày | Phần tác động | Nội dung thay đổi | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- | :--- |
| `0.1` | 2026-08-17 | Toàn bộ | Khởi tạo Implementation Guide cho E1-S5 (E1-T8, E1-T9) | Kế hoạch Epic E1 |
