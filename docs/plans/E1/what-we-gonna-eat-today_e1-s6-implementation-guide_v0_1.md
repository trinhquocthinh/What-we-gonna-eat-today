# 🍱 Implementation Guide — E1 Slice S6: Chốt thực đơn thô & Lịch sử ăn uống

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Completed`
> - **Created:** `2026-08-17` | **Last Updated:** `2026-08-18`
> - **Upstream:** [Master Plan](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E1-T10, E1-T11`) • [SDD](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-015, 016, 017`) • [Tech Spec](../../what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) • [Test Cases Spec](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-063→071, TC-076→078, TC-109`)
> - **Tiền đề:** `E1-S1` đến `E1-S5` đã hoàn thành.
>
> 📌 *Hướng dẫn kỹ thuật thi công TDD cho Slice S6: Lưu thực đơn nháp, thực thi Finalize nguyên tử qua `db.batch()` và sinh Default Eating History.*

---

# 0. Phạm vi và điều kiện xong

| ID | Việc | Giờ | Xong nghĩa là |
| --- | --- | --- | --- |
| E1-T10 | Chọn món và finalize, chưa có rule | 2 | Session chuyển `FINALIZED`, không reopen được |
| E1-T11 | Sinh Default Eating History trong cùng transaction | 2 | TC-109 pass: `INSERT` thất bại giữa chừng thì Session **không** `FINALIZED` |

- [ ] Lưu nháp Final Meal, gọi lại ghi đè (không cộng dồn)
- [ ] Finalize thành công: Session `FINALIZED`, `finalized_at` có giá trị, `eating_history` sinh đủ `số Dish × số Participant`
- [ ] Finalize lần hai: `ERR_SESSION_NOT_ACTIVE`, không có gì đổi
- [ ] TC-063→071, TC-076→078 pass (tầng D/A/I tương ứng); TC-109 pass (tầng I, `.integration.test.ts`)
- [ ] `yarn verify` · `yarn arch:probe` · `yarn build` xanh
- [ ] `yarn test:integration` xanh, chạy TC-109 nhiều lần liên tiếp không flaky
- [ ] PR link SPEC-015, SPEC-016 (rút gọn), SPEC-017, BR-050, BR-052, BR-056

**Slice này KHÔNG có UI, KHÔNG đụng `app/`** — giống S4. Master Plan chỉ liệt kê `features/meal/**` và `features/history/**`. Màn hình S-10 "Chốt bữa" (tổng hợp P/N/X/H, khay chọn món) cần Session Ranking (SPEC-014, E4) và hiển thị Rule (E5) trước khi có ý nghĩa — nó được dựng ở **E5-T7/T8/T9**, không phải ở đây.

---

# 1. Bốn phát hiện — đọc trước khi gõ

## 1.1 `db.batch()` là transaction Postgres thật, có `isolationLevel` thật — nhưng chưa verify được 100% hành vi rollback khi một câu lỗi

Đọc `node_modules/@neondatabase/serverless/README.md` và `CONFIG.md`:

> *"Multiple queries can be issued via fetch request within a single, **non-interactive transaction** by using the `transaction()` function."*
> *"The optional second argument to `transaction()`... concern the transaction configuration. These transaction-related keys are: `isolationMode`, `readOnly` and `deferrable`."*

`isolationMode` nhận `'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable'` — đây là khái niệm **transaction thật** của Postgres (`SET TRANSACTION ISOLATION LEVEL`), không phải "gửi song song nhiều query độc lập". `drizzle-orm/neon-http/session.js`'s `batch()` gọi thẳng hàm `transaction()` này (đã verify từ S2).

**Điều tôi KHÔNG tìm thấy trong tài liệu đóng gói**: một câu khẳng định tường minh "nếu một câu trong batch lỗi, mọi câu khác rollback". Đây là suy luận hợp lý từ việc nó dùng đúng từ "transaction" và có tuỳ chọn isolation level thật — nhưng **TC-109 chính là phép kiểm THẬT cho giả định này**, không phải một điều đã biết chắc trước khi code. Xem §11 cho phương án dự phòng nếu TC-109 chạy thật mà không thấy rollback.

## 1.2 Đính chính lần hai cho DEC-015 — E1-T11 cũng không cần driver WebSocket

DEC-015 (viết lúc S2) và DEC-018 (viết lúc S4, đính chính phần E1-T7) để lại một khoảng trống: DEC-015 gốc nói *"E1-T7 **and E1-T11** need read-then-write inside the same transaction"* — DEC-018 chỉ sửa phần E1-T7, chưa xử lý phần E1-T11.

Phân tích cho S6: `finalizeSession` cần (a) đọc participant hiện tại, (b) đọc `group_dish_id → global_dish_id` của từng món trong nháp, (c) sinh UUID cho từng dòng `eating_history` — **cả ba việc này đều làm được TRƯỚC khi vào transaction**, không có bước nào cần đọc lại kết quả của một câu ghi vừa xảy ra TRONG transaction. Tức là không có "read-then-write" thật ở đây — chỉ có "read, rồi batch nhiều write cùng lúc", đúng thế mạnh của `db.batch()`.

→ Thêm **DEC-020** (§13) đính chính nốt phần còn lại của DEC-015 — không xoá, không sửa DEC-018, chỉ bổ sung.

## 1.3 `final_meal_items` không có cột `id` — khoá chính là cặp cột

Tech Spec §3.1 (nguyên văn): `final_meal_items(final_meal_id, group_dish_id) primary key(final_meal_id, group_dish_id)` — **khác mọi bảng khác trong dự án tới giờ** (mọi bảng trước đều có UUID `id` riêng). Drizzle hỗ trợ khoá chính ghép qua `primaryKey({ columns: [...] })` (đã verify `node_modules/drizzle-orm/pg-core/primary-keys.d.ts` — dùng dạng `{ columns: [...] }`, không dùng dạng biến đổi cũ đã deprecated).

## 1.4 `onConflictDoNothing` không giúp TC-109 — phải tách một hàm mức thấp để test rollback bằng lỗi KHÁC

`eating_history` có `unique(user_id, global_dish_id, eating_date, source_final_meal_id)` — dùng `onConflictDoNothing` trên đúng bốn cột này cho TC-077 (idempotent, gọi lại không nhân đôi). Nhưng **nếu dùng `onConflictDoNothing` thì một dòng trùng sẽ bị bỏ qua ÊM re, không ném lỗi** — TC-109 cần một `INSERT` **thật sự lỗi** để chứng minh rollback, nên không thể dùng chính cơ chế đó để ép lỗi.

→ Thiết kế: TC-109 ép lỗi bằng **vi phạm khoá ngoại** (chèn `global_dish_id` không tồn tại) — loại lỗi mà `onConflictDoNothing` (chỉ xử lý đúng bốn cột unique) không đụng tới. Cần tách một hàm mức thấp `commitFinalize` (chỉ gồm UPDATE session + INSERT eating_history, KHÔNG có bước validate của `finalizeSession`) để test gọi thẳng với dữ liệu cố ý sai — xem §2.5.

---

# 2. Sáu quyết định kiến trúc

## 2.1 "Nháp" và "Final Meal" là CÙNG một bảng — không có bảng draft riêng

Đã rà toàn bộ Tech Spec §3.1, không có bảng nào tên `final_meal_drafts` hay tương tự. SPEC-016 (Finalize) nhận đầu vào **chỉ `{ sessionId }`** — không có `dishIds` — nghĩa là danh sách món PHẢI đã được lưu từ trước bởi SPEC-015. Kết luận: `final_meals`/`final_meal_items` **là bảng nháp**, mutable trong lúc Session `ACTIVE` (SPEC-015 ghi đè toàn bộ mỗi lần gọi), và trở thành **Authoritative Final Meal** thuần tuý nhờ `session.state = 'FINALIZED'` — không có cột trạng thái riêng nào trên `final_meals`. Đây đúng tinh thần BR-052: *"Nếu validation thành công... Final Meal trở thành Authoritative Final Meal."* — "trở thành", không phải "được tạo mới".

Ghi chú TC-109 nói *"transaction bao trọn bốn lệnh ghi"* — đây là mô tả khái quát, không phải đặc tả từng câu lệnh. Không suy ra kiến trúc từ số đếm đó; suy ra từ văn bản "Hành vi" của từng SPEC (đã trích nguyên văn ở trên).

## 2.2 `finalizeSession` KHÔNG chạm `final_meals`/`final_meal_items` — chúng đã đúng từ nháp

Vì (2.1), transaction của Finalize chỉ cần: `UPDATE selection_sessions` + `INSERT eating_history`. Không INSERT lại `final_meal_items` (đã có từ SPEC-015, không đổi khi finalize).

## 2.3 `saveFinalMealDraft` yêu cầu Session `ACTIVE` — diễn giải thêm, không phải trích nguyên văn

SPEC-015 không liệt kê "Session phải ACTIVE" như một bước đánh số (khác SPEC-016 có). Quyết định: vẫn yêu cầu, trả `ERR_SESSION_NOT_ACTIVE` nếu không — lưu nháp cho một Session `DRAFT`/`FINALIZED`/`INVALID` không có ý nghĩa sản phẩm. Ghi rõ trong PR đây là diễn giải, không phải trích SDD.

## 2.4 Kiểm tra Creator nằm TRONG use case, không lắp ở `app/`

Tech Spec §5 (đã trích ở guide S2's `assert-group-access.ts`): *"Kiểm tra Creator của Session được thực hiện riêng ở từng spec, không gộp vào guard chung, vì Creator là thuộc tính của Session chứ không phải của Group."* SPEC-015 và SPEC-016 đều ghi rõ "người gọi là Creator" trong đầu vào — cả hai use case tự đọc `selection_sessions.creator_user_id` và so sánh, KHÔNG có `assertGroupAccess` hay `requireGroupContext` nào ở slice này (không có route để lắp guard đó).

## 2.5 Tách `commitFinalize` khỏi `finalizeSession` — cho khả năng test TC-109

`finalizeSession` (application) = validate (bước 1-4 của SPEC-016, bỏ 5-6) → build danh sách `eating_history` cần chèn → gọi `commitFinalize` (infrastructure, atomic). `commitFinalize` **không tự validate gì** — nó là chỗ DUY NHẤT chứa `db.batch()`. Test TC-109 gọi thẳng `commitFinalize` với một dòng `eating_history` cố ý sai (FK không tồn tại), bỏ qua toàn bộ bước validate của `finalizeSession`, để ép lỗi đúng chỗ cần kiểm.

## 2.6 `history` chỉ đóng góp domain thuần — không có application/infrastructure riêng ở S5

`ALLOWED_CROSS_FEATURE` cho `meal: ['rule', 'history']` — `meal` được phép import `history`. Nhưng vì `commitFinalize` phải nằm trong MỘT `db.batch()` duy nhất của `meal` (không thể gọi một transaction riêng của `history` rồi một transaction riêng của `meal` — sẽ mất tính nguyên tử), `history` ở S6 chỉ đóng góp **một hàm thuần** tính toán các dòng cần chèn (`buildDefaultEatingHistory`), không có `application/` hay `infrastructure/` riêng. Bảng `eating_history` được `meal/infrastructure/` import thẳng từ `@/shared/db/schema` để build câu INSERT, đúng tiền lệ "infra tự query bảng của feature khác qua schema chung" đã lặp lại từ S2.

---

# 3. Bẫy Next 16

**Không có bẫy mới** — slice này không chạm `app/`, không có route, không có Route Handler, không có component. Tất cả code nằm trong `features/meal/`, `features/history/`, và test.

---

# 4. Cây file

```
src/
├── shared/db/schema.ts                                SỬA — +finalMeals, +finalMealItems, +eatingHistory
│
├── features/history/
│   └── domain/default-eating-history.ts   + .test.ts   mới — hàm thuần, TC-076/078
│
└── features/meal/
    ├── domain/meal-draft.ts               + .test.ts   mới — dedup check, TC-064
    ├── application/
    │   ├── meal-repository.ts                          mới — PORT
    │   ├── save-final-meal-draft.ts       + .test.ts   mới — SPEC-015, TC-063/064/066
    │   └── finalize-session.ts            + .test.ts   mới — SPEC-016 rút gọn, TC-068/070
    └── infrastructure/
        ├── drizzle-meal-repository.ts                  mới
        └── drizzle-meal-repository.integration.test.ts mới — TC-065/067/069/071/077, TC-109

src/shared/db/migrations/000X_final_meal_and_eating_history.sql   sinh bởi drizzle-kit
```

---

# 5. Schema

## 5.1 `src/shared/db/schema.ts` — thêm

Không cần `pgEnum` mới — ba bảng này không có cột enum. Import `primaryKey` thêm vào từ `drizzle-orm/pg-core`.

```ts
import { primaryKey } from 'drizzle-orm/pg-core'
```

```ts
/**
 * Tech Spec §3.1, §3.2. ĐÂY LÀ BẢNG NHÁP — SPEC-015 ghi đè lên chính bảng
 * này trong lúc Session `ACTIVE`. "Authoritative Final Meal" (BR-050, BR-052)
 * hoàn toàn suy ra từ `selection_sessions.state = 'FINALIZED'`, KHÔNG có cột
 * trạng thái riêng ở đây — Tech Spec §3.2 đã cố ý bỏ `group_id`/`decision_date`
 * khỏi bảng này vì cả hai suy ra được qua `session_id`.
 */
export const finalMeals = pgTable(
  'final_meals',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => selectionSessions.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('final_meals_session_id_unique').on(table.sessionId)],
)

/**
 * KHÔNG có cột `id` — khoá chính là cặp cột, đúng nguyên văn Tech Spec §3.1.
 * Khác mọi bảng khác trong dự án tới giờ.
 */
export const finalMealItems = pgTable(
  'final_meal_items',
  {
    finalMealId: uuid('final_meal_id')
      .notNull()
      .references(() => finalMeals.id),
    groupDishId: uuid('group_dish_id')
      .notNull()
      .references(() => groupDishes.id),
  },
  (table) => [primaryKey({ columns: [table.finalMealId, table.groupDishId] })],
)

/**
 * Tech Spec §3.2: trỏ `global_dish_id`, KHÔNG phải `group_dish_id` — Eating
 * History thuộc về User chứ không thuộc Group (BR-056), để F43 multi-group
 * sau này collapse được cùng một User ăn cùng Dish ở hai Group thành một
 * eating event.
 */
export const eatingHistory = pgTable(
  'eating_history',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    globalDishId: uuid('global_dish_id')
      .notNull()
      .references(() => globalDishes.id),
    eatingDate: date('eating_date').notNull(),
    sourceFinalMealId: uuid('source_final_meal_id')
      .notNull()
      .references(() => finalMeals.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('eating_history_user_dish_date_source_unique').on(
      table.userId,
      table.globalDishId,
      table.eatingDate,
      table.sourceFinalMealId,
    ),
    // Đường nóng Tech Spec §3.3: SPEC-020 tính recency penalty (E4+).
    index('eating_history_user_dish_date_idx').on(table.userId, table.globalDishId, table.eatingDate.desc()),
  ],
)

export type FinalMeal = typeof finalMeals.$inferSelect
export type FinalMealItem = typeof finalMealItems.$inferSelect
export type EatingHistory = typeof eatingHistory.$inferSelect
```

## 5.2 Migration

```bash
yarn db:generate --name=final_meal_and_eating_history
```

Số thứ tự tự sinh — không hardcode (phụ thuộc thứ tự code thật với S3/S4/S5). Đọc `.sql` sinh ra, xác nhận:

1. `final_meal_items` sinh ra `PRIMARY KEY ("final_meal_id","group_dish_id")` — **không có cột `id`**.
2. `eating_history_user_dish_date_idx` có `DESC` trên `eating_date`.
3. Bốn `REFERENCES` đúng bảng (`selection_sessions`, `final_meals` ×2, `group_dishes`, `global_dishes`, `users`).

---

# 6. Domain

## 6.1 `src/features/meal/domain/meal-draft.ts`

```ts
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

/**
 * SPEC-015 — validation của "Lưu Final Meal nháp". Hàm thuần, không throw,
 * không chạm DB. Chỉ kiểm trùng lặp — kiểm "Dish còn Active trong pool" là
 * việc của tầng application (cần đọc DB), không thuộc hàm thuần này.
 */
export type MealDraft = {
  readonly dishIds: readonly string[]
}

export type MealDraftError = 'DUPLICATE_DISH'

export function readMealDraft(dishIds: readonly string[]): Result<MealDraft, MealDraftError> {
  if (new Set(dishIds).size !== dishIds.length) {
    return err('DUPLICATE_DISH')
  }
  return ok({ dishIds })
}
```

`meal-draft.test.ts` — **viết trước**:

```ts
import { describe, expect, it } from 'vitest'

import { readMealDraft } from './meal-draft'

describe('SPEC-015 — Final Meal nháp (domain)', () => {
  it('TC-063: 3 dishId hợp lệ thì nháp chứa đúng 3 món', () => {
    const result = readMealDraft(['dish-1', 'dish-2', 'dish-3'])
    expect(result.ok && result.value.dishIds).toEqual(['dish-1', 'dish-2', 'dish-3'])
  })

  it('TC-064: danh sách chứa dishId trùng thì DUPLICATE_DISH', () => {
    const result = readMealDraft(['dish-1', 'dish-1'])
    expect(result.ok === false && result.error).toBe('DUPLICATE_DISH')
  })

  it('SPEC-015: mảng rỗng hợp lệ ở tầng domain — rỗng chỉ chặn ở Finalize (SPEC-016)', () => {
    expect(readMealDraft([]).ok).toBe(true)
  })
})
```

## 6.2 `src/features/history/domain/default-eating-history.ts`

```ts
/**
 * SPEC-017 — Sinh Default Eating History. Hàm thuần: nhận danh sách
 * Participant + danh sách Global Dish trong Final Meal + `decisionDate` +
 * `finalMealId` đã biết trước, trả về các dòng CẦN chèn — không tự đọc DB,
 * không tự sinh `id` (đó là việc của infrastructure, theo tiền lệ `uuidv7()`
 * tường minh ở mọi `db.batch()` trước).
 *
 * Ở v1.0 KHÔNG có ngoại lệ `Cannot Eat` (F15 chưa có) — SDD nói rõ nguyên
 * văn. Mọi Participant hiện tại (đã lọc ACTIVE/COMPLETED trước khi gọi hàm
 * này) đều nhận đủ mọi Dish trong Final Meal.
 */
export type DefaultEatingHistoryRow = {
  readonly userId: string
  readonly globalDishId: string
  readonly eatingDate: string
  readonly sourceFinalMealId: string
}

export function buildDefaultEatingHistory(input: {
  readonly participantUserIds: readonly string[]
  readonly globalDishIds: readonly string[]
  readonly decisionDate: string
  readonly finalMealId: string
}): DefaultEatingHistoryRow[] {
  const rows: DefaultEatingHistoryRow[] = []

  for (const userId of input.participantUserIds) {
    for (const globalDishId of input.globalDishIds) {
      rows.push({
        userId,
        globalDishId,
        eatingDate: input.decisionDate,
        sourceFinalMealId: input.finalMealId,
      })
    }
  }

  return rows
}
```

`default-eating-history.test.ts` — **viết trước**:

```ts
import { describe, expect, it } from 'vitest'

import { buildDefaultEatingHistory } from './default-eating-history'

describe('SPEC-017 — Sinh Default Eating History (domain)', () => {
  it('TC-076: Final Meal 3 Dish và 4 Participant thì tạo đúng 12 record', () => {
    const rows = buildDefaultEatingHistory({
      participantUserIds: ['u1', 'u2', 'u3', 'u4'],
      globalDishIds: ['d1', 'd2', 'd3'],
      decisionDate: '2026-08-14',
      finalMealId: 'meal-1',
    })

    expect(rows).toHaveLength(12)
  })

  it('TC-078: eating_date khớp đúng decision_date được truyền vào, không phụ thuộc giờ UTC', () => {
    const rows = buildDefaultEatingHistory({
      participantUserIds: ['u1'],
      globalDishIds: ['d1'],
      decisionDate: '2026-08-14',
      finalMealId: 'meal-1',
    })

    expect(rows[0]?.eatingDate).toBe('2026-08-14')
  })

  it('SPEC-017: mỗi record giữ đúng source_final_meal_id truyền vào', () => {
    const rows = buildDefaultEatingHistory({
      participantUserIds: ['u1'],
      globalDishIds: ['d1'],
      decisionDate: '2026-08-14',
      finalMealId: 'meal-xyz',
    })

    expect(rows[0]?.sourceFinalMealId).toBe('meal-xyz')
  })

  it('không có Participant hoặc không có Dish thì trả mảng rỗng', () => {
    expect(
      buildDefaultEatingHistory({
        participantUserIds: [],
        globalDishIds: ['d1'],
        decisionDate: '2026-08-14',
        finalMealId: 'meal-1',
      }),
    ).toEqual([])
  })
})
```

> `TC-078` "bất kể giờ UTC lúc finalize" đúng nghĩa VÌ hàm này không hề gọi `new Date()` — `decisionDate` là chuỗi `'YYYY-MM-DD'` truyền thẳng vào, không có timezone nào len được vào. Test không cần mock `Date`, khớp kỷ luật test đã lặp lại xuyên suốt dự án.

---

# 7. Application

## 7.1 `src/features/meal/application/meal-repository.ts` — PORT

```ts
export type SessionForMeal = {
  readonly id: string
  readonly creatorUserId: string
  readonly state: 'DRAFT' | 'ACTIVE' | 'FINALIZED' | 'INVALID'
  readonly decisionDate: string
}

export type DraftDish = {
  readonly groupDishId: string
}

export interface MealRepository {
  findSessionForMeal(sessionId: string): Promise<SessionForMeal | null>

  /**
   * SPEC-015/016. `groupDishId` nào trong danh sách KHÔNG active — mảng rỗng
   * = tất cả hợp lệ. Nhận `sessionId` (không phải `groupId` trần) vì mọi
   * caller ở `application/` đều có sẵn `sessionId`, còn `groupId` thì không
   * — infrastructure tự resolve `groupId` qua JOIN (xem §8.1).
   */
  findInactiveDishIds(sessionId: string, groupDishIds: readonly string[]): Promise<string[]>

  /**
   * SPEC-015 — upsert `final_meals` (tạo nếu chưa có) rồi GHI ĐÈ toàn bộ
   * `final_meal_items` (không cộng dồn). Trả `finalMealId` để caller dùng
   * tiếp (ví dụ Finalize).
   */
  saveDraft(sessionId: string, groupDishIds: readonly string[]): Promise<{ finalMealId: string }>

  /** Đọc nháp hiện tại — dùng ở bước validate của Finalize (bước 3, 4 SPEC-016). */
  getDraft(sessionId: string): Promise<{ finalMealId: string; groupDishIds: string[] } | null>

  /** ACTIVE hoặc COMPLETED — REMOVED không nhận Default Eating History (BR-026). */
  listActiveParticipantUserIds(sessionId: string): Promise<string[]>

  /** Map `group_dish_id → global_dish_id` cho danh sách món trong nháp. */
  resolveGlobalDishIds(groupDishIds: readonly string[]): Promise<Map<string, string>>

  /**
   * NGUYÊN TỬ — CHỈ hai việc: UPDATE session sang FINALIZED, và INSERT toàn
   * bộ dòng `eating_history`. KHÔNG validate gì (đó là việc của
   * `finalizeSession` ở application, chạy TRƯỚC khi gọi hàm này). Tách riêng
   * để TC-109 gọi thẳng được với dữ liệu cố ý sai — xem Implementation Guide
   * §2.5.
   */
  commitFinalize(input: {
    sessionId: string
    eatingHistoryRows: readonly {
      userId: string
      globalDishId: string
      eatingDate: string
      sourceFinalMealId: string
    }[]
  }): Promise<void>
}
```

## 7.2 `src/features/meal/application/save-final-meal-draft.ts`

```ts
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import { readMealDraft } from '../domain/meal-draft'
import type { MealRepository } from './meal-repository'

export type SaveFinalMealDraftDeps = {
  readonly meal: MealRepository
}

export type SaveFinalMealDraftInput = {
  readonly sessionId: string
  readonly userId: string
  readonly dishIds: readonly string[]
}

/**
 * SPEC-015 — Dựng Final Meal nháp.
 *
 * Thứ tự BẤT BIẾN: validate trùng lặp (thuần) → Session ACTIVE + Creator
 * (đọc DB) → mọi Dish còn Active trong pool (đọc DB) → ghi. Không bước nào
 * ghi dữ liệu nếu một bước trước đó thất bại.
 */
export async function saveFinalMealDraft(
  deps: SaveFinalMealDraftDeps,
  input: SaveFinalMealDraftInput,
): Promise<Result<{ finalMealId: string }, Failure>> {
  const draft = readMealDraft(input.dishIds)
  if (!draft.ok) {
    return err(failure('ERR_DUPLICATE_DISH_IN_MEAL', { sessionId: input.sessionId }))
  }

  const session = await deps.meal.findSessionForMeal(input.sessionId)
  if (session === null || session.state !== 'ACTIVE') {
    return err(failure('ERR_SESSION_NOT_ACTIVE', { sessionId: input.sessionId }))
  }
  if (session.creatorUserId !== input.userId) {
    return err(failure('ERR_NOT_SESSION_CREATOR', { sessionId: input.sessionId }))
  }

  if (draft.value.dishIds.length > 0) {
    const inactiveDishIds = await deps.meal.findInactiveDishIds(input.sessionId, draft.value.dishIds)
    if (inactiveDishIds.length > 0) {
      return err(failure('ERR_DISH_NOT_IN_POOL', { groupDishIds: inactiveDishIds }))
    }
  }

  const saved = await deps.meal.saveDraft(input.sessionId, draft.value.dishIds)
  return ok(saved)
}
```

`save-final-meal-draft.test.ts` — **viết trước**:

```ts
import { describe, expect, it } from 'vitest'

import type { MealRepository, SessionForMeal } from './meal-repository'
import { saveFinalMealDraft } from './save-final-meal-draft'

function makeFakeMealRepository(options: {
  session?: SessionForMeal | null
  inactiveDishIds?: string[]
}) {
  const savedDrafts: Array<{ sessionId: string; groupDishIds: readonly string[] }> = []

  const repository: MealRepository = {
    async findSessionForMeal() {
      return options.session ?? { id: 's1', creatorUserId: 'creator-1', state: 'ACTIVE', decisionDate: '2026-08-14' }
    },
    async findInactiveDishIds() {
      return options.inactiveDishIds ?? []
    },
    async saveDraft(sessionId, groupDishIds) {
      savedDrafts.push({ sessionId, groupDishIds })
      return { finalMealId: 'final-meal-1' }
    },
    async getDraft(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async listActiveParticipantUserIds(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async resolveGlobalDishIds(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async commitFinalize(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
  }

  return { repository, savedDrafts }
}

const INPUT = { sessionId: 's1', userId: 'creator-1' } as const

describe('SPEC-015 — Dựng Final Meal nháp (application)', () => {
  it('TC-063: Creator chọn 3 Dish hợp lệ thì nháp chứa đúng 3 Dish', async () => {
    const fake = makeFakeMealRepository({})

    const result = await saveFinalMealDraft(
      { meal: fake.repository },
      { ...INPUT, dishIds: ['d1', 'd2', 'd3'] },
    )

    expect(result.ok).toBe(true)
    expect(fake.savedDrafts).toHaveLength(1)
    expect(fake.savedDrafts[0]?.groupDishIds).toEqual(['d1', 'd2', 'd3'])
  })

  it('TC-064: danh sách trùng dishId thì ERR_DUPLICATE_DISH_IN_MEAL, KHÔNG ghi', async () => {
    const fake = makeFakeMealRepository({})

    const result = await saveFinalMealDraft({ meal: fake.repository }, { ...INPUT, dishIds: ['d1', 'd1'] })

    expect(result.ok === false && result.error.code).toBe('ERR_DUPLICATE_DISH_IN_MEAL')
    expect(fake.savedDrafts).toHaveLength(0)
  })

  it('TC-066: Dish không ai swipe vẫn lưu được — draft không đọc interactions', async () => {
    const fake = makeFakeMealRepository({})

    const result = await saveFinalMealDraft({ meal: fake.repository }, { ...INPUT, dishIds: ['d-never-swiped'] })

    expect(result.ok).toBe(true)
  })

  it('SPEC-015: người gọi không phải Creator thì ERR_NOT_SESSION_CREATOR', async () => {
    const fake = makeFakeMealRepository({
      session: { id: 's1', creatorUserId: 'someone-else', state: 'ACTIVE', decisionDate: '2026-08-14' },
    })

    const result = await saveFinalMealDraft({ meal: fake.repository }, { ...INPUT, dishIds: ['d1'] })

    expect(result.ok === false && result.error.code).toBe('ERR_NOT_SESSION_CREATOR')
  })

  it('SPEC-015: Session không ACTIVE thì ERR_SESSION_NOT_ACTIVE', async () => {
    const fake = makeFakeMealRepository({
      session: { id: 's1', creatorUserId: 'creator-1', state: 'DRAFT', decisionDate: '2026-08-14' },
    })

    const result = await saveFinalMealDraft({ meal: fake.repository }, { ...INPUT, dishIds: ['d1'] })

    expect(result.ok === false && result.error.code).toBe('ERR_SESSION_NOT_ACTIVE')
  })
})
```

## 7.3 `src/features/meal/application/finalize-session.ts`

```ts
import { buildDefaultEatingHistory } from '@/features/history/domain/default-eating-history'
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { MealRepository } from './meal-repository'

export type FinalizeSessionDeps = {
  readonly meal: MealRepository
}

export type FinalizeSessionInput = {
  readonly sessionId: string
  readonly userId: string
}

/**
 * SPEC-016 RÚT GỌN — Finalize. Chạy đúng bước 1-4 và 7 nguyên văn SDD; **CỐ Ý
 * BỎ bước 5-6** (đánh giá Required Rule trên Session Rule đã snapshot) — Group
 * Rule/Session Rule chưa tồn tại (E5). Khi E5 landed, chèn bước rule evaluation
 * vào ĐÚNG GIỮA bước 4 và bước ghi cuối, không viết lại hàm này từ đầu.
 *
 * Bước 7 (tạo Final Meal, chuyển FINALIZED, sinh Eating History "trong cùng
 * transaction") = gọi `commitFinalize` — nguyên tử, xem `meal-repository.ts`.
 */
export async function finalizeSession(
  deps: FinalizeSessionDeps,
  input: FinalizeSessionInput,
): Promise<Result<{ finalMealId: string }, Failure>> {
  // Bước 1: Session ACTIVE.
  const session = await deps.meal.findSessionForMeal(input.sessionId)
  if (session === null || session.state !== 'ACTIVE') {
    return err(failure('ERR_SESSION_NOT_ACTIVE', { sessionId: input.sessionId }))
  }

  // Bước 2: người gọi là Creator.
  if (session.creatorUserId !== input.userId) {
    return err(failure('ERR_NOT_SESSION_CREATOR', { sessionId: input.sessionId }))
  }

  // Bước 3: nháp không rỗng.
  const draft = await deps.meal.getDraft(input.sessionId)
  if (draft === null || draft.groupDishIds.length === 0) {
    return err(failure('ERR_EMPTY_FINAL_MEAL', { sessionId: input.sessionId }))
  }

  // Bước 4: revalidate mọi Dish vẫn Active TẠI THỜI ĐIỂM NÀY — có thể đã đổi
  // kể từ lúc lưu nháp (TC-069: Admin gỡ Dish sau khi Creator đã chọn).
  const inactiveDishIds = await deps.meal.findInactiveDishIds(input.sessionId, draft.groupDishIds)
  if (inactiveDishIds.length > 0) {
    return err(failure('ERR_DISH_NOT_IN_POOL', { groupDishIds: inactiveDishIds }))
  }

  // BỎ bước 5-6 ở đây (E5-T3 chèn vào).

  // Bước 7 — chuẩn bị dữ liệu TRƯỚC transaction, đúng nguyên tắc "đọc trước,
  // ghi nguyên tử sau" đã dùng xuyên suốt S2-S5.
  const participantUserIds = await deps.meal.listActiveParticipantUserIds(input.sessionId)
  const globalDishIdByGroupDishId = await deps.meal.resolveGlobalDishIds(draft.groupDishIds)
  const globalDishIds = draft.groupDishIds.map((id) => globalDishIdByGroupDishId.get(id)).filter(
    (id): id is string => id !== undefined,
  )

  const eatingHistoryRows = buildDefaultEatingHistory({
    participantUserIds,
    globalDishIds,
    decisionDate: session.decisionDate,
    finalMealId: draft.finalMealId,
  })

  await deps.meal.commitFinalize({ sessionId: input.sessionId, eatingHistoryRows })

  return ok({ finalMealId: draft.finalMealId })
}
```

`finalize-session.test.ts` — **viết trước. Acceptance chính của E1-T10.**

```ts
import { describe, expect, it } from 'vitest'

import type { MealRepository, SessionForMeal } from './meal-repository'
import { finalizeSession } from './finalize-session'

function makeFakeMealRepository(options: {
  session?: SessionForMeal | null
  draft?: { finalMealId: string; groupDishIds: string[] } | null
  inactiveDishIds?: string[]
  participantUserIds?: string[]
}) {
  const commitCalls: Array<{ sessionId: string; eatingHistoryRows: unknown[] }> = []

  const repository: MealRepository = {
    async findSessionForMeal() {
      return options.session ?? { id: 's1', creatorUserId: 'creator-1', state: 'ACTIVE', decisionDate: '2026-08-14' }
    },
    async findInactiveDishIds() {
      return options.inactiveDishIds ?? []
    },
    async saveDraft(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async getDraft() {
      return options.draft === undefined
        ? { finalMealId: 'final-meal-1', groupDishIds: ['d1', 'd2'] }
        : options.draft
    },
    async listActiveParticipantUserIds() {
      return options.participantUserIds ?? ['u1', 'u2']
    },
    async resolveGlobalDishIds(groupDishIds) {
      return new Map(groupDishIds.map((id) => [id, `global-${id}`]))
    },
    async commitFinalize(input) {
      commitCalls.push(input)
    },
  }

  return { repository, commitCalls }
}

const INPUT = { sessionId: 's1', userId: 'creator-1' } as const

describe('SPEC-016 rút gọn — Finalize', () => {
  it('SPEC-016: nháp hợp lệ thì finalize thành công và gọi commitFinalize đúng một lần', async () => {
    const fake = makeFakeMealRepository({})

    const result = await finalizeSession({ meal: fake.repository }, INPUT)

    expect(result.ok).toBe(true)
    expect(fake.commitCalls).toHaveLength(1)
    // 2 dish × 2 participant = 4 dòng eating_history.
    expect(fake.commitCalls[0]?.eatingHistoryRows).toHaveLength(4)
  })

  it('TC-068: nháp rỗng thì ERR_EMPTY_FINAL_MEAL, không gọi commitFinalize', async () => {
    const fake = makeFakeMealRepository({ draft: null })

    const result = await finalizeSession({ meal: fake.repository }, INPUT)

    expect(result.ok === false && result.error.code).toBe('ERR_EMPTY_FINAL_MEAL')
    expect(fake.commitCalls).toHaveLength(0)
  })

  it('TC-070: Session đã FINALIZED thì ERR_SESSION_NOT_ACTIVE', async () => {
    const fake = makeFakeMealRepository({
      session: { id: 's1', creatorUserId: 'creator-1', state: 'FINALIZED', decisionDate: '2026-08-14' },
    })

    const result = await finalizeSession({ meal: fake.repository }, INPUT)

    expect(result.ok === false && result.error.code).toBe('ERR_SESSION_NOT_ACTIVE')
    expect(fake.commitCalls).toHaveLength(0)
  })

  it('SPEC-016: người gọi không phải Creator thì ERR_NOT_SESSION_CREATOR', async () => {
    const fake = makeFakeMealRepository({
      session: { id: 's1', creatorUserId: 'someone-else', state: 'ACTIVE', decisionDate: '2026-08-14' },
    })

    const result = await finalizeSession({ meal: fake.repository }, INPUT)

    expect(result.ok === false && result.error.code).toBe('ERR_NOT_SESSION_CREATOR')
  })

  it('SPEC-016 bước 4: Dish bị gỡ khỏi pool sau khi lưu nháp thì ERR_DISH_NOT_IN_POOL, không gọi commitFinalize', async () => {
    const fake = makeFakeMealRepository({ inactiveDishIds: ['d1'] })

    const result = await finalizeSession({ meal: fake.repository }, INPUT)

    expect(result.ok === false && result.error.code).toBe('ERR_DISH_NOT_IN_POOL')
    expect(fake.commitCalls).toHaveLength(0)
  })
})
```

---

# 8. Infrastructure

## 8.1 `src/features/meal/infrastructure/drizzle-meal-repository.ts`

```ts
import { and, eq, inArray } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { getDb } from '@/shared/db/client'
import {
  eatingHistory,
  finalMealItems,
  finalMeals,
  globalDishes,
  groupDishes,
  participants,
  selectionSessions,
} from '@/shared/db/schema'

import type { MealRepository, SessionForMeal } from '../application/meal-repository'

async function findSessionForMeal(sessionId: string): Promise<SessionForMeal | null> {
  const rows = await getDb()
    .select({
      id: selectionSessions.id,
      creatorUserId: selectionSessions.creatorUserId,
      state: selectionSessions.state,
      decisionDate: selectionSessions.decisionDate,
      groupId: selectionSessions.groupId,
    })
    .from(selectionSessions)
    .where(eq(selectionSessions.id, sessionId))
    .limit(1)

  return rows[0] ?? null
}

/**
 * `groupId` tự resolve từ `sessionId` — giữ chữ ký use case gọn (không phải
 * đọc `SessionForMeal.groupId` rồi truyền tay qua hai tầng).
 */
async function findInactiveDishIds(sessionId: string, groupDishIds: readonly string[]): Promise<string[]> {
  if (groupDishIds.length === 0) return []

  const rows = await getDb()
    .select({ id: groupDishes.id })
    .from(groupDishes)
    .innerJoin(selectionSessions, eq(selectionSessions.groupId, groupDishes.groupId))
    .where(
      and(
        eq(selectionSessions.id, sessionId),
        inArray(groupDishes.id, [...groupDishIds]),
        eq(groupDishes.state, 'ACTIVE'),
      ),
    )

  const activeIds = new Set(rows.map((row) => row.id))
  return groupDishIds.filter((id) => !activeIds.has(id))
}

/**
 * SPEC-015 — upsert `final_meals` rồi GHI ĐÈ `final_meal_items`. Ba bước:
 * (1) đọc `final_meals` hiện có (nếu có) để biết `finalMealId` đúng — KHÔNG
 * đoán id mới nếu đã tồn tại; (2) nếu chưa có, tạo mới; (3) xoá hết item cũ
 * rồi chèn lại toàn bộ — "ghi đè, không cộng dồn" (SPEC-015).
 *
 * DELETE + INSERT không cần `db.batch()`: không có bước nào phụ thuộc kết
 * quả của bước trước trong CÙNG một request — nếu muốn tuyệt đối an toàn
 * trước request chồng chéo, xem ghi chú rủi ro §11.
 */
async function saveDraft(sessionId: string, groupDishIds: readonly string[]): Promise<{ finalMealId: string }> {
  const db = getDb()

  const existing = await db
    .select({ id: finalMeals.id })
    .from(finalMeals)
    .where(eq(finalMeals.sessionId, sessionId))
    .limit(1)

  const finalMealId = existing[0]?.id ?? uuidv7()

  if (existing[0] === undefined) {
    await db.insert(finalMeals).values({ id: finalMealId, sessionId })
  }

  await db.delete(finalMealItems).where(eq(finalMealItems.finalMealId, finalMealId))

  if (groupDishIds.length > 0) {
    await db
      .insert(finalMealItems)
      .values(groupDishIds.map((groupDishId) => ({ finalMealId, groupDishId })))
  }

  return { finalMealId }
}

async function getDraft(
  sessionId: string,
): Promise<{ finalMealId: string; groupDishIds: string[] } | null> {
  const meal = await getDb()
    .select({ id: finalMeals.id })
    .from(finalMeals)
    .where(eq(finalMeals.sessionId, sessionId))
    .limit(1)

  const finalMealRow = meal[0]
  if (finalMealRow === undefined) return null

  const items = await getDb()
    .select({ groupDishId: finalMealItems.groupDishId })
    .from(finalMealItems)
    .where(eq(finalMealItems.finalMealId, finalMealRow.id))

  return { finalMealId: finalMealRow.id, groupDishIds: items.map((item) => item.groupDishId) }
}

/** ACTIVE hoặc COMPLETED — REMOVED bị loại (BR-026: Interaction của Participant
 *  bị remove không được tính, và tương tự không nhận Default Eating History). */
async function listActiveParticipantUserIds(sessionId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ userId: participants.userId })
    .from(participants)
    .where(and(eq(participants.sessionId, sessionId), inArray(participants.state, ['ACTIVE', 'COMPLETED'])))

  return rows.map((row) => row.userId)
}

async function resolveGlobalDishIds(groupDishIds: readonly string[]): Promise<Map<string, string>> {
  if (groupDishIds.length === 0) return new Map()

  const rows = await getDb()
    .select({ groupDishId: groupDishes.id, globalDishId: groupDishes.globalDishId })
    .from(groupDishes)
    .where(inArray(groupDishes.id, [...groupDishIds]))

  return new Map(rows.map((row) => [row.groupDishId, row.globalDishId]))
}

/**
 * NGUYÊN TỬ — `db.batch()` của neon-http LÀ transaction Postgres thật (đã
 * verify từ S2, isolation level thật — xem Implementation Guide §1.1). Đây
 * là hàm mà TC-109 gọi TRỰC TIẾP với `eatingHistoryRows` cố ý sai để ép lỗi
 * và kiểm rollback — KHÔNG tự validate gì, tin tưởng hoàn toàn vào caller
 * (`finalizeSession` ở application, hoặc test tầng I).
 */
async function commitFinalize(input: {
  sessionId: string
  eatingHistoryRows: readonly {
    userId: string
    globalDishId: string
    eatingDate: string
    sourceFinalMealId: string
  }[]
}): Promise<void> {
  const db = getDb()

  const updateSession = db
    .update(selectionSessions)
    .set({ state: 'FINALIZED', finalizedAt: new Date() })
    .where(and(eq(selectionSessions.id, input.sessionId), eq(selectionSessions.state, 'ACTIVE')))

  if (input.eatingHistoryRows.length === 0) {
    // `db.batch` cần tuple ≥1 phần tử — nháp có thể hợp lệ với 0 Participant
    // (lý thuyết: Session không có Participant nào ngoài Creator đã bị remove
    // — hiếm nhưng không phải bất khả). Chỉ UPDATE, không batch.
    await updateSession
    return
  }

  await db.batch([
    updateSession,
    db
      .insert(eatingHistory)
      .values(
        input.eatingHistoryRows.map((row) => ({
          id: uuidv7(),
          userId: row.userId,
          globalDishId: row.globalDishId,
          eatingDate: row.eatingDate,
          sourceFinalMealId: row.sourceFinalMealId,
        })),
      )
      // TC-077 — idempotent theo `finalMealId`: gọi lại với cùng dữ liệu
      // KHÔNG nhân đôi. Đây là cơ chế graceful cho trùng lặp HỢP LỆ; TC-109
      // ép lỗi bằng vi phạm KHOÁ NGOẠI (global_dish_id không tồn tại), một
      // loại lỗi mà onConflictDoNothing không xử lý — batch vẫn thất bại
      // thật ở tình huống đó.
      .onConflictDoNothing({
        target: [
          eatingHistory.userId,
          eatingHistory.globalDishId,
          eatingHistory.eatingDate,
          eatingHistory.sourceFinalMealId,
        ],
      }),
  ])
}

export const drizzleMealRepository: MealRepository = {
  findSessionForMeal,
  findInactiveDishIds,
  saveDraft,
  getDraft,
  listActiveParticipantUserIds,
  resolveGlobalDishIds,
  commitFinalize,
}
```

Không unit test riêng cho file này (Tech Spec §8.2). Chứng minh ở integration test bên dưới.

## 8.2 `src/features/meal/infrastructure/drizzle-meal-repository.integration.test.ts`

```ts
import { and, eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { getDb } from '@/shared/db/client'
import {
  eatingHistory,
  finalMealItems,
  finalMeals,
  globalDishes,
  groupDishes,
  groupMembers,
  groups,
  participants,
  selectionSessions,
  users,
} from '@/shared/db/schema'

import { finalizeSession } from '../application/finalize-session'
import { saveFinalMealDraft } from '../application/save-final-meal-draft'
import { drizzleMealRepository } from './drizzle-meal-repository'

/** Seed: 1 Group, 2 User (Creator + 1 Participant khác), 1 Session ACTIVE, 2 Dish Active. */
async function seedActiveSessionWithTwoDishes() {
  const db = getDb()
  const creatorId = crypto.randomUUID()
  const otherUserId = crypto.randomUUID()
  const groupId = crypto.randomUUID()
  const sessionId = crypto.randomUUID()
  const dish1 = { globalId: crypto.randomUUID(), groupDishId: crypto.randomUUID() }
  const dish2 = { globalId: crypto.randomUUID(), groupDishId: crypto.randomUUID() }

  await db.insert(users).values([
    { id: creatorId, provider: 'test', providerSubject: `c-${creatorId}`, email: `${creatorId}@test`, displayName: 'Creator' },
    { id: otherUserId, provider: 'test', providerSubject: `o-${otherUserId}`, email: `${otherUserId}@test`, displayName: 'Other' },
  ])
  await db.insert(groups).values({ id: groupId, name: 'Integration Group', timezone: 'UTC' })
  await db.insert(groupMembers).values([
    { groupId, userId: creatorId, isAdmin: true },
    { groupId, userId: otherUserId, isAdmin: false },
  ])
  await db.insert(selectionSessions).values({
    id: sessionId,
    groupId,
    decisionDate: '2026-08-14',
    creatorUserId: creatorId,
    state: 'ACTIVE',
  })
  await db.insert(participants).values([
    { sessionId, userId: creatorId, state: 'ACTIVE' },
    { sessionId, userId: otherUserId, state: 'ACTIVE' },
  ])
  await db.insert(globalDishes).values([
    { id: dish1.globalId, name: 'Món 1', normalizedName: 'món 1', createdByUserId: creatorId, createdFromGroupId: groupId },
    { id: dish2.globalId, name: 'Món 2', normalizedName: 'món 2', createdByUserId: creatorId, createdFromGroupId: groupId },
  ])
  await db.insert(groupDishes).values([
    { id: dish1.groupDishId, groupId, globalDishId: dish1.globalId, state: 'ACTIVE' },
    { id: dish2.groupDishId, groupId, globalDishId: dish2.globalId, state: 'ACTIVE' },
  ])

  return { creatorId, otherUserId, groupId, sessionId, dish1, dish2 }
}

type Seed = Awaited<ReturnType<typeof seedActiveSessionWithTwoDishes>>

async function cleanup(seed: Seed) {
  const db = getDb()
  await db.delete(eatingHistory).where(eq(eatingHistory.sourceFinalMealId, seed.sessionId)).catch(() => {})
  const meal = await db.select({ id: finalMeals.id }).from(finalMeals).where(eq(finalMeals.sessionId, seed.sessionId))
  for (const row of meal) {
    await db.delete(eatingHistory).where(eq(eatingHistory.sourceFinalMealId, row.id))
    await db.delete(finalMealItems).where(eq(finalMealItems.finalMealId, row.id))
  }
  await db.delete(finalMeals).where(eq(finalMeals.sessionId, seed.sessionId))
  await db.delete(participants).where(eq(participants.sessionId, seed.sessionId))
  await db.delete(selectionSessions).where(eq(selectionSessions.id, seed.sessionId))
  await db.delete(groupDishes).where(eq(groupDishes.groupId, seed.groupId))
  await db.delete(globalDishes).where(eq(globalDishes.createdFromGroupId, seed.groupId))
  await db.delete(groupMembers).where(eq(groupMembers.groupId, seed.groupId))
  await db.delete(groups).where(eq(groups.id, seed.groupId))
  await db.delete(users).where(eq(users.id, seed.creatorId))
  await db.delete(users).where(eq(users.id, seed.otherUserId))
}

const cleanupQueue: Array<() => Promise<void>> = []

afterEach(async () => {
  while (cleanupQueue.length > 0) {
    const fn = cleanupQueue.pop()
    if (fn !== undefined) await fn()
  }
})

describe('SPEC-015/016 — draft và finalize (integration)', () => {
  it('TC-065: Dish vừa bị gỡ khỏi pool thì lưu nháp có Dish đó bị ERR_DISH_NOT_IN_POOL', async () => {
    const seed = await seedActiveSessionWithTwoDishes()
    cleanupQueue.push(() => cleanup(seed))
    await getDb().update(groupDishes).set({ state: 'INACTIVE' }).where(eq(groupDishes.id, seed.dish1.groupDishId))

    const result = await saveFinalMealDraft(
      { meal: drizzleMealRepository },
      { sessionId: seed.sessionId, userId: seed.creatorId, dishIds: [seed.dish1.groupDishId] },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_DISH_NOT_IN_POOL')
  })

  it('TC-067 + TC-071: nháp hợp lệ, Finalize thành công thì Session FINALIZED và Eating History tồn tại', async () => {
    const seed = await seedActiveSessionWithTwoDishes()
    cleanupQueue.push(() => cleanup(seed))

    const draft = await saveFinalMealDraft(
      { meal: drizzleMealRepository },
      { sessionId: seed.sessionId, userId: seed.creatorId, dishIds: [seed.dish1.groupDishId, seed.dish2.groupDishId] },
    )
    expect(draft.ok).toBe(true)

    const finalize = await finalizeSession({ meal: drizzleMealRepository }, { sessionId: seed.sessionId, userId: seed.creatorId })
    expect(finalize.ok).toBe(true)

    const session = await getDb()
      .select({ state: selectionSessions.state })
      .from(selectionSessions)
      .where(eq(selectionSessions.id, seed.sessionId))
    expect(session[0]?.state).toBe('FINALIZED')

    // 2 Dish × 2 Participant = 4 dòng.
    const historyRows = await getDb()
      .select()
      .from(eatingHistory)
      .where(eq(eatingHistory.sourceFinalMealId, finalize.ok ? finalize.value.finalMealId : ''))
    expect(historyRows).toHaveLength(4)
  })

  it('TC-069: Dish bị gỡ SAU khi lưu nháp thì Finalize trả ERR_DISH_NOT_IN_POOL, Session vẫn ACTIVE', async () => {
    const seed = await seedActiveSessionWithTwoDishes()
    cleanupQueue.push(() => cleanup(seed))

    await saveFinalMealDraft(
      { meal: drizzleMealRepository },
      { sessionId: seed.sessionId, userId: seed.creatorId, dishIds: [seed.dish1.groupDishId] },
    )
    await getDb().update(groupDishes).set({ state: 'INACTIVE' }).where(eq(groupDishes.id, seed.dish1.groupDishId))

    const finalize = await finalizeSession({ meal: drizzleMealRepository }, { sessionId: seed.sessionId, userId: seed.creatorId })

    expect(finalize.ok === false && finalize.error.code).toBe('ERR_DISH_NOT_IN_POOL')
    const session = await getDb()
      .select({ state: selectionSessions.state })
      .from(selectionSessions)
      .where(eq(selectionSessions.id, seed.sessionId))
    expect(session[0]?.state).toBe('ACTIVE')
  })

  it('TC-077: commitFinalize gọi hai lần với cùng dữ liệu thì vẫn đúng số dòng, không nhân đôi', async () => {
    const seed = await seedActiveSessionWithTwoDishes()
    cleanupQueue.push(() => cleanup(seed))

    const draft = await saveFinalMealDraft(
      { meal: drizzleMealRepository },
      { sessionId: seed.sessionId, userId: seed.creatorId, dishIds: [seed.dish1.groupDishId] },
    )
    if (!draft.ok) throw new Error('setup thất bại')

    const rows = [
      { userId: seed.creatorId, globalDishId: seed.dish1.globalId, eatingDate: '2026-08-14', sourceFinalMealId: draft.value.finalMealId },
      { userId: seed.otherUserId, globalDishId: seed.dish1.globalId, eatingDate: '2026-08-14', sourceFinalMealId: draft.value.finalMealId },
    ]

    await drizzleMealRepository.commitFinalize({ sessionId: seed.sessionId, eatingHistoryRows: rows })
    await drizzleMealRepository.commitFinalize({ sessionId: seed.sessionId, eatingHistoryRows: rows })

    const historyRows = await getDb()
      .select()
      .from(eatingHistory)
      .where(eq(eatingHistory.sourceFinalMealId, draft.value.finalMealId))
    expect(historyRows).toHaveLength(2)
  })
})

describe('TC-109 — rollback thật khi một dòng eating_history lỗi', () => {
  it('TC-109: INSERT eating_history vi phạm khoá ngoại thì Session KHÔNG chuyển FINALIZED', async () => {
    const seed = await seedActiveSessionWithTwoDishes()
    cleanupQueue.push(() => cleanup(seed))

    const NONEXISTENT_GLOBAL_DISH_ID = crypto.randomUUID() // không tồn tại trong global_dishes

    await expect(
      drizzleMealRepository.commitFinalize({
        sessionId: seed.sessionId,
        eatingHistoryRows: [
          {
            userId: seed.creatorId,
            globalDishId: NONEXISTENT_GLOBAL_DISH_ID, // vi phạm FK — KHÔNG bị onConflictDoNothing nuốt
            eatingDate: '2026-08-14',
            sourceFinalMealId: crypto.randomUUID(),
          },
        ],
      }),
    ).rejects.toThrow()

    // Bằng chứng rollback: session PHẢI vẫn ACTIVE — nếu db.batch() không
    // atomic thật, UPDATE (câu đầu trong batch) đã commit trước khi INSERT
    // (câu sau) thất bại, và assertion dưới đây sẽ ĐỎ.
    const session = await getDb()
      .select({ state: selectionSessions.state })
      .from(selectionSessions)
      .where(eq(selectionSessions.id, seed.sessionId))
    expect(session[0]?.state).toBe('ACTIVE')
  })
})
```

> Chạy `yarn test:integration` **nhiều lần liên tiếp** cho nhóm TC-109 để chắc chắn không phải một lần ăn may — cùng kỷ luật đã áp dụng cho TC-107 (S4).

---

# 9. Cấu hình phải sửa

| File | Sửa gì |
| --- | --- |
| `src/shared/db/schema.ts` | +`finalMeals`, +`finalMealItems` (khoá chính ghép, không có `id`), +`eatingHistory`; import thêm `primaryKey` |
| migrations | `yarn db:generate --name=final_meal_and_eating_history` — số tự sinh, không hardcode |
| `docs/..._decision-log_v1.1.md` | +**DEC-020** (§13) |
| `docs/..._master-plan_v1_0.md` | tick E1-T10, E1-T11 |

**Không sửa**: `eslint.config.mjs` (`meal`, `history` đã có sẵn trong `FEATURES` và `ALLOWED_CROSS_FEATURE`), `knip.jsonc`, `vitest.config.mts`/`vitest.integration.config.mts` (hạ tầng dựng đủ ở S4, tái dùng nguyên xi), `next.config.ts`, `package.json` (không thêm dependency nào), không có route/page nào trong `app/`.

---

# 10. Thứ tự thi công (TDD)

Nhánh `feat/finalize-meal-minimum`. Conventional Commits, scope `meal` / `history` / `db`.

| # | Việc | Test viết TRƯỚC | Tick |
| --- | --- | --- | --- |
| 0 | `yarn verify` xanh trên baseline S1-S5 | — | |
| 1 | `domain/meal-draft.ts` | **ĐỎ trước — TC-063/064** | |
| 2 | `history/domain/default-eating-history.ts` | **ĐỎ trước — TC-076/078** | |
| 3 | `schema.ts` → `yarn db:generate --name=final_meal_and_eating_history` → đọc `.sql`, xác nhận 3 điều ở §5.2 → migrate cả hai branch | | |
| 4 | port `meal-repository.ts` + `save-final-meal-draft.ts` | **ĐỎ trước — TC-063/064/066** | **E1-T10 (draft)** |
| 5 | `finalize-session.ts` | **ĐỎ trước — TC-068/070** — acceptance chính | **E1-T10 (finalize)** |
| 6 | `infrastructure/drizzle-meal-repository.ts` | không unit test (Tech Spec §8.2) | |
| 7 | Integration test: TC-065, TC-067+071, TC-069, TC-077 | `yarn test:integration` | **E1-T11 (eating history)** |
| 8 | Integration test TC-109 | `yarn test:integration` **lặp lại ít nhất 5 lần liên tiếp** | **E1-T11 (rollback)** |
| 9 | Decision log (DEC-020), master plan | `yarn verify && yarn arch:probe && yarn build` | |
| 10 | PR link SPEC-015, SPEC-016 (rút gọn), SPEC-017, BR-050, BR-052, BR-056 | | |

Sau bước 5: `yarn test:coverage` — `meal-draft.ts`, `default-eating-history.ts`, `save-final-meal-draft.ts`, `finalize-session.ts` phải ≥80% dòng.

---

# 11. Verify

## 11.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn build
yarn test:integration
```

`yarn test` in nhóm `SPEC-015 — Dựng Final Meal nháp` (domain + application), `SPEC-017 — Sinh Default Eating History (domain)`, `SPEC-016 rút gọn — Finalize`. `yarn test:integration` in `TC-065`, `TC-067 + TC-071`, `TC-069`, `TC-077`, `TC-109`.

## 11.2 `yarn db:studio` — bằng chứng thủ công

1. Tạo Group + Session (S2-S4) + vài Dish (S3), Start Session.
2. Gọi `saveFinalMealDraft` rồi `finalizeSession` (chưa có UI — gọi trực tiếp từ một script tạm hoặc REPL Node có import `getDb()`, hoặc viết một test thủ công tạm rồi xoá).
3. `yarn db:studio` → `selection_sessions.state = 'FINALIZED'`, `finalized_at` có giá trị. `final_meals` có 1 dòng, `final_meal_items` có đúng N dòng theo N Dish đã chọn. `eating_history` có N×M dòng (N Dish × M Participant ACTIVE/COMPLETED), `eating_date` đúng `decision_date` của Session, `source_final_meal_id` trỏ đúng `final_meals.id`.
4. Gọi lại `finalizeSession` lần hai → `ERR_SESSION_NOT_ACTIVE`, không có gì trong `db:studio` đổi.

## 11.3 Độ tin cậy TC-109

```bash
for i in 1 2 3 4 5; do yarn test:integration || echo "LẦN $i ĐỎ"; done
```

Không dòng nào xuất hiện. Nếu TC-109 đỏ ngay từ lần đầu (không phải flaky, mà `session.state` bị 'FINALIZED' sau khi lẽ ra phải rollback), xem §12 "Rủi ro" — đây là bằng chứng thật rằng giả định ở §1.1 sai, và phương án dự phòng phải chạy.

---

# 12. Rủi ro

| Rủi ro | Dấu hiệu | Phương án |
| --- | --- | --- |
| **`db.batch()` không thật sự rollback khi một câu lỗi** (giả định §1.1 sai) | TC-109 đỏ: `session.state === 'FINALIZED'` dù INSERT đã lỗi | Đây là rủi ro nghiêm trọng nhất của slice. Phương án dự phòng: thêm driver `neon-serverless` (WebSocket) chỉ cho riêng `commitFinalize`, dùng `client.query('BEGIN')` / `COMMIT` / `ROLLBACK` tường minh qua `Client` (không phải `neon()` HTTP). Ghi lại phát hiện này đè lên DEC-020 nếu xảy ra — đừng âm thầm sửa mà không cập nhật quyết định đã ghi |
| `commitFinalize` với 0 dòng `eating_history` (Session không có Participant nào ACTIVE/COMPLETED) | `db.batch` ném lỗi vì tuple rỗng | Đã xử lý — nhánh `if (eatingHistoryRows.length === 0)` chạy UPDATE đơn lẻ, không qua `batch` (§8.1) |
| `onConflictDoNothing` target sai thứ tự cột | TC-077 vẫn tạo dòng trùng (không đúng object literal match) | `target` phải liệt kê ĐÚNG BỐN cột của `eating_history_user_dish_date_source_unique`, đúng thứ tự khai trong migration không quan trọng (Postgres so theo tập hợp), nhưng phải đủ cả bốn |
| `final_meal_items` không có `id` làm nhầm khi viết `.returning()` hoặc `.where(eq(finalMealItems.id, ...))` | `tsc` đỏ ngay — không có field `id` để tham chiếu | Dùng `eq(finalMealItems.finalMealId, ...)` kết hợp `eq(finalMealItems.groupDishId, ...)` khi cần định vị một dòng cụ thể |
| Migration số thứ tự đụng với S3/S4/S5 nếu code sau | conflict `_journal.json` | Không hardcode; sinh migration ở commit cuối cùng trước PR |
| `date` column (`eatingDate`) nhận string nhưng gửi `Date` object nhầm | Postgres ném lỗi kiểu hoặc lưu sai ngày | Luôn truyền `'YYYY-MM-DD'` string cho cột `date` — đúng pattern `decisionDate` đã dùng từ S4 |

---

# 13. Decision Log — DEC-020

Thêm sau DEC-019 (nếu đã tồn tại từ S5) hoặc DEC-018 (nếu S5 chưa landed), theo đúng khuôn các entry trước:

```markdown
# DEC-020 — E1-T11 Does Not Need the WebSocket Driver Either

**Date:** 2026-08-17
**Status:** Accepted

## Decision

DEC-015's original consequence section claimed both E1-T7 and E1-T11 need read-then-write inside the same transaction, requiring the `neon-serverless` driver. DEC-018 corrected the E1-T7 half. This entry corrects the E1-T11 half: `finalizeSession` reads everything it needs — active participants, `group_dish_id → global_dish_id` mapping, and a freshly-generated `finalMealId`/row ids — *before* entering the atomic write phase. The atomic phase itself (`commitFinalize` in `features/meal/infrastructure/drizzle-meal-repository.ts`) is exactly two statement types: `UPDATE selection_sessions` and one multi-row `INSERT` into `eating_history`, both known in full before `db.batch()` is called. No read-after-write dependency exists inside the transaction.

## Rationale

`db.batch()` (`neon-http`'s wrapper around `@neondatabase/serverless`'s `sql.transaction()`) accepts an `isolationLevel` option — a genuine Postgres transaction concept, not a batching convenience. TC-109 is designed precisely to prove atomicity empirically: it forces a foreign-key violation on the `eating_history` insert (a failure mode `onConflictDoNothing` does not suppress) and asserts the session's state update rolled back too. If TC-109 passes, `db.batch()` is sufficient; the WebSocket driver adds a second connection-management concern (long-lived sockets in a serverless environment) that isn't justified without evidence it's needed.

## Consequence

Neither E1-T7 nor E1-T11 needs `neon-serverless`. The driver remains deferred to **E3-T1** (Group Rule → Session Rule snapshot), which is a genuine read-then-write: the current Group Rules must be read and immediately written as Session Rules inside the same transaction as the Session state change. If TC-109 is ever observed failing in CI or production, that is the trigger to revisit this decision — not a preemptive addition.

## Affected Documents

- Decision Log DEC-015 (amended by DEC-018 and this entry, not superseded), DEC-018
- Tech Spec v0.2 §3.2, §4.1
```

---

# 18. Lịch sử thay đổi (Change History)

| Version | Ngày | Phần tác động | Nội dung thay đổi | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- | :--- |
| `0.1` | 2026-08-17 | Toàn bộ | Khởi tạo Implementation Guide cho E1-S6 (E1-T10, E1-T11) | Kế hoạch Epic E1 |
