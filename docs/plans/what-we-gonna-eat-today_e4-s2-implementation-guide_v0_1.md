# 📦 Implementation Guide — E4 Slice S2: session_decks + phân trang

> **Document Metadata**
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-19`
> - **Upstream:** [Master Plan](../what-we-gonna-eat-today_master-plan_v1_0.md) (`E4-T3`, `E4-T4`) • [SDD](../what-we-gonna-eat-today_sdd_v0_1.md) (`SPEC-010`, `SPEC-011`) • [Tech Spec](../what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) (§3.1 `session_decks`, §11 `R-02`) • [Test Cases](../what-we-gonna-eat-today_test-cases-specification_v0_1.md) (`TC-041`, `TC-045→047`, `TC-102→104`, `TC-108`)
> - **Tiền đề bắt buộc:** `S1` (`E4-T1`, `E4-T2`) đã code — slice này tái dùng nguyên vẹn `buildDeck`, `computeRecencyPenalty`, `daysSinceLastEaten`, `RANKING_CONFIG`.
>
> 📦 *Nối ranking (S1) vào đường đọc deck thật: materialize một lần vào bảng mới, lọc lại theo trạng thái hiện tại lúc đọc, cursor/pageSize đúng SPEC-011.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
|---|---|---|---|---|
| `E4-T3` | Lưu `session_decks`, thứ tự bất biến trong phiên | 2 | `src/features/selection/infrastructure/**` | Mở lại deck lần hai thứ tự giống hệt |
| `E4-T4` | Phân trang và lọc theo `group_dishes.state` | 3 | `src/features/selection/application/**` | `TC-108` pass — Dish bị gỡ sau khi deck materialize không xuất hiện |

- [ ] `session_decks` tồn tại, migration `0008` áp được
- [ ] `TC-041` pass — mở deck 2 lần, thứ tự giống hệt, không tính lại ranking lần thứ hai
- [ ] `TC-045`, `TC-046`, `TC-102`, `TC-103`, `TC-104` pass ở tầng `A`
- [ ] `TC-108` pass ở tầng `I` — món bị gỡ sau materialize biến mất khỏi lần đọc kế
- [ ] `yarn verify && yarn arch:probe && yarn test:integration` xanh

---

# 1. Năm phát hiện — đọc trước khi gõ

## 1.1 Bảng mới, cột `jsonb` đầu tiên của dự án

Tech Spec §3.1 đã định nghĩa sẵn hình dạng:

```
session_decks(session_id, user_id, ordered_dish_ids jsonb, created_at)
  primary key(session_id, user_id)
```

Bảng này **chưa tồn tại** — migration `0008` là số trống kế tiếp (`0000`→`0007` đã dùng). Đây cũng là **cột `jsonb` đầu tiên trong dự án** — đã đọc trực tiếp `node_modules/drizzle-orm/pg-core/columns/jsonb.d.ts` và xác nhận: `jsonb('ordered_dish_ids').$type<string[]>().notNull()`. `.$type<T>()` là method có sẵn trên mọi column builder (kế thừa từ `ColumnBuilder` gốc — doc-comment của chính Drizzle đưa đúng ví dụ này: *"`details: json('details').$type<UserDetails>().notNull()`"*).

## 1.2 "Lọc lại lúc đọc" (R-02) — giao giữa thứ tự đã lưu và tập hiện hành

`TC-108` (tầng `I`, tier tích hợp DUY NHẤT trong cả bốn subtask E4-T1→T4): *"Dish bị gỡ sau khi deck đã materialize → tự động loại khỏi trang đọc kế tiếp."* Đây chính là rủi ro `R-02` (Tech Spec §11): *"Lọc lại theo `group_dishes.state` lúc đọc trang thay vì tin tưởng tuyệt đối vào deck lưu."*

Thiết kế: `ordered_dish_ids` là **bộ khung cố định**, materialize đúng một lần (`TC-041`). Ở **mỗi lần đọc**, lấy **giao** giữa thứ tự đã lưu và tập `group_dishes.state = 'ACTIVE'` hiện tại — giữ nguyên thứ tự đã lưu, chỉ bớt những dish không còn hợp lệ. Món **mới thêm vào Group sau khi deck đã materialize không xuất hiện** — nhất quán với BR-048 Deck Stability, dù cơ chế đóng băng đầy đủ theo cursor (Ranking Spec §2.7) là v1.1, ngoài phạm vi E4 (đã loại ở S1 §1.2).

## 1.3 `DishCard` thiếu `globalDishId` — cần để tra lịch sử ăn

`eating_history` khoá theo `(user_id, global_dish_id)`, nhưng `DishCard.dishId` là `group_dishes.id`. Không có `globalDishId` trên `DishCard` thì không nối được dish với lịch sử ăn của chính nó. May là `globalDishes` đã được `listEligibleDishCards` INNER JOIN sẵn (hiện chỉ lấy `name`) — thêm `globalDishes.id` vào SELECT không tốn join mới.

## 1.4 `selection → history` đã được phép — không cần tiêm phụ thuộc

Khác các slice trước (`session→group` ở E3, `dish→group` ở E2) phải tiêm một hàm qua `deps` vì `ALLOWED_CROSS_FEATURE` không cho phép chiều đó, lần này:

```js
const ALLOWED_CROSS_FEATURE = {
  selection: ['history', 'dish'],
  meal: ['rule', 'history'],
}
```

`selection → history` **đã có sẵn**. `list-deck.ts` import thẳng `HistoryRepository` — không cần lớp tiêm phụ thuộc. Đây là lần đầu `features/history` có `application/`/`infrastructure/` — hiện chỉ có đúng một hàm thuần ở `domain/` (`buildDefaultEatingHistory`, từ E1-T11).

## 1.5 `getDeckPage` không tự validate cursor âm

`deck-page.ts` (S1 không đụng, vẫn nguyên bản E1): `items.slice(cursor, cursor + pageSize)`. Với `cursor` âm, `Array.prototype.slice` hiểu là "đếm từ cuối" — **không ném lỗi, chỉ âm thầm trả sai kết quả**. `TC-103` đòi `ERR_VALIDATION` — phải chặn trong `list-deck.ts` TRƯỚC khi gọi `getDeckPage`, không sửa hàm thuần (nó cố tình không biết mã lỗi nào cả — đúng nguyên tắc domain không phụ thuộc `shared/errors`).

`TC-104` (cursor lớn hơn tổng số món → 0 item, `nextCursor=null`) và `TC-046` (cursor giữa deck → phần còn lại, `nextCursor=null`) **đã đúng sẵn** với `getDeckPage` hiện tại — chỉ cần test xác nhận, không sửa gì trong hàm đó.

## 1.6 Quyết định phạm vi: không đổi `WHOLE_DECK_PAGE_SIZE=500`

`RANKING_CONFIG.deck.pageSize = 20` (S1) là giá trị SPEC-011 quy định, nhưng `app/sessions/[sessionId]/page.tsx` hiện gọi `listDeck` với `pageSize=500` (E1-T8 — "lấy trọn deck một lần", Tech Spec §3.3: nhóm ~30-100 món, không phân trang tầng DB). `DeckScreen` hiện không có affordance "tải thêm" nào.

Đổi `page.tsx` sang `pageSize=20` mà chưa có UI "tải thêm" là **cắt cụt deck thật** — món thứ 21 trở đi biến mất khỏi màn hình, không phải lỗi hiển thị mà là mất dữ liệu. DoD của `E4-T4` chỉ đòi `TC-045→047/102→104/108` pass — cả năm kiểm được ở tầng use case bằng cách truyền thẳng `pageSize` khác nhau vào test, không cần đổi call site thật.

**Quyết định: giữ nguyên `page.tsx`.** `listDeck` xử lý đúng MỌI `pageSize`/`cursor` được truyền; nối UI "tải thêm" chờ tới khi thật sự cần (chưa slice nào của E4 yêu cầu — kể cả S4 UI, xem Master Plan §6, không nhắc "tải thêm" ở đâu).

---

# 2. File tree

```
src/shared/db/
  schema.ts                                       SỬA (+ sessionDecks)
  migrations/0008_session_decks.sql                + MỚI

src/features/history/
  application/
    history-repository.ts                         + MỚI (lần đầu của feature)
  infrastructure/
    drizzle-history-repository.ts                  + MỚI
    drizzle-history-repository.integration.test.ts + MỚI

src/features/selection/
  domain/
    dish-card.ts                                   SỬA (+ globalDishId)
  application/
    selection-repository.ts                        SỬA (+ 2 method)
    list-deck.ts / .test.ts                         SỬA (nối toàn bộ luồng)
  infrastructure/
    drizzle-selection-repository.ts                 SỬA (+ globalDishId, + 2 method)
    drizzle-selection-repository.integration.test.ts SỬA (mở rộng — TC-041, TC-108)
```

Không đụng `presentation/` hay `app/` — `DishCard` chỉ thêm một trường, không phá vỡ gì đang render nó (TypeScript cấu trúc, trường dư không ai đọc thì không lỗi).

---

# 3. Schema — `sessionDecks`

```ts
/**
 * Tech Spec §3.1. `ordered_dish_ids` LÀ bộ khung cố định của deck — materialize
 * đúng MỘT lần (SPEC-010, TC-041). Lọc lại theo `group_dishes.state` hiện tại
 * là việc của TẦNG ĐỌC (`list-deck.ts`), không phải của bảng này — bảng chỉ
 * lưu, không tự biết dish nào còn ACTIVE.
 *
 * KHÔNG có cột `id` — khoá chính là cặp cột, cùng khuôn `final_meal_items`.
 */
export const sessionDecks = pgTable(
  'session_decks',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => selectionSessions.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    orderedDishIds: jsonb('ordered_dish_ids').$type<string[]>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.sessionId, table.userId] })],
)

export type SessionDeck = typeof sessionDecks.$inferSelect
```

Thêm `jsonb` vào danh sách import đầu file (`drizzle-orm/pg-core`), cạnh `boolean, date, index, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid`.

## 3.1 Migration `0008_session_decks.sql`

Chạy `yarn db:generate` sau khi sửa `schema.ts`, đối chiếu với bản dưới:

```sql
CREATE TABLE "session_decks" (
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"ordered_dish_ids" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_decks_session_id_user_id_pk" PRIMARY KEY("session_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "session_decks" ADD CONSTRAINT "session_decks_session_id_selection_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."selection_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_decks" ADD CONSTRAINT "session_decks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
```

Ghi nhớ tên constraint khoá chính `session_decks_session_id_user_id_pk` — dùng đúng chuỗi này ở §5.2 để bắt lỗi vi phạm race.

---

# 4. `history/application/history-repository.ts` + infra — MỚI

```ts
export type EatingDateRecord = {
  readonly globalDishId: string
  readonly eatingDate: string
}

export interface HistoryRepository {
  /**
   * SPEC-020's nguồn dữ liệu. Trả TẤT CẢ ngày ăn (không chỉ ngày gần nhất) —
   * `daysSinceLastEaten` (S1) tự lấy max, và cần đủ mảng để BR-046 Multi-source
   * Collapse có ý nghĩa (hai bản ghi cùng món cùng ngày từ hai Group).
   */
  findEatingDates(
    userId: string,
    globalDishIds: readonly string[],
  ): Promise<readonly EatingDateRecord[]>
}
```

```ts
async function findEatingDates(
  userId: string,
  globalDishIds: readonly string[],
): Promise<readonly EatingDateRecord[]> {
  if (globalDishIds.length === 0) {
    return []
  }

  return getDb()
    .select({ globalDishId: eatingHistory.globalDishId, eatingDate: eatingHistory.eatingDate })
    .from(eatingHistory)
    .where(and(eq(eatingHistory.userId, userId), inArray(eatingHistory.globalDishId, globalDishIds)))
}

export const drizzleHistoryRepository: HistoryRepository = { findEatingDates }
```

Chặn `globalDishIds.length === 0` sớm — không phải tối ưu vặt, mà tránh `IN ()` rỗng (một số driver/dialect coi đây là lỗi cú pháp, không phải "không khớp gì").

## 4.1 Integration test — `drizzle-history-repository.integration.test.ts`

```ts
it('trả đúng eatingDate cho từng globalDishId, bỏ qua dish không được hỏi tới', async () => {
  // dựng user, 2 global dish (qua createGlobalDishAndAddToPool hoặc insert thẳng),
  // 1 final meal + eating_history cho cả hai dish ở hai ngày khác nhau,
  // rồi gọi findEatingDates(userId, [dishA.id]) — chỉ phải thấy dòng của dishA.
})

it('globalDishIds rỗng: trả mảng rỗng, không lỗi', async () => {
  expect(await drizzleHistoryRepository.findEatingDates('user-1', [])).toEqual([])
})
```

---

# 5. `SelectionRepository` — thêm 2 method (E4-T3)

```ts
export interface SelectionRepository {
  // ...các method từ E1-T8/T9 giữ nguyên...

  /** `null` = chưa materialize lần nào. Mảng RỖNG (đã materialize, 0 món) là
   *  một giá trị hợp lệ KHÁC `null` — TC-102 (Group 0 món ACTIVE) đi qua đây. */
  findMaterializedDeck(sessionId: string, userId: string): Promise<readonly string[] | null>

  /**
   * INSERT một lần. `ALREADY_MATERIALIZED` (không phải lỗi) khi race: hai
   * request đồng thời cùng lần đầu mở deck. Người gọi (`list-deck.ts`) đọc lại
   * qua `findMaterializedDeck` để cả hai hội tụ về ĐÚNG MỘT thứ tự đã thắng,
   * không phải mỗi request tự tin dùng bản mình vừa tính.
   */
  materializeDeck(
    sessionId: string,
    userId: string,
    orderedDishIds: readonly string[],
  ): Promise<{ readonly outcome: 'MATERIALIZED' | 'ALREADY_MATERIALIZED' }>
}
```

`DishCard` (`domain/dish-card.ts`) thêm:
```ts
export type DishCard = {
  readonly dishId: string
  readonly globalDishId: string   // + MỚI
  readonly name: string
  readonly systemTags: readonly string[]
  readonly effectiveInteraction: InteractionType | null
}
```

---

# 6. Infra `drizzle-selection-repository.ts` — SỬA

## 6.1 `listEligibleDishCards` — thêm `globalDishId` vào SELECT

```ts
async function listEligibleDishCards(sessionId: string, participantId: string): Promise<DishCard[]> {
  const rows = await getDb()
    .select({
      dishId: groupDishes.id,
      globalDishId: globalDishes.id,   // + MỚI — đã JOIN sẵn, không tốn join mới
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

  return rows.map((row) => ({
    dishId: row.dishId,
    globalDishId: row.globalDishId,
    name: row.name,
    systemTags: [],
    effectiveInteraction: row.effectiveType,
  }))
}
```

## 6.2 `findMaterializedDeck` / `materializeDeck` — MỚI

```ts
const SESSION_DECK_PK_VIOLATION_CONSTRAINT = 'session_decks_session_id_user_id_pk'

function isSessionDeckAlreadyMaterialized(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const target: Record<string, unknown> =
    'cause' in error && typeof error.cause === 'object' && error.cause !== null
      ? (error.cause as Record<string, unknown>)
      : (error as Record<string, unknown>)

  return target.code === UNIQUE_VIOLATION && target.constraint === SESSION_DECK_PK_VIOLATION_CONSTRAINT
}

async function findMaterializedDeck(
  sessionId: string,
  userId: string,
): Promise<readonly string[] | null> {
  const rows = await getDb()
    .select({ orderedDishIds: sessionDecks.orderedDishIds })
    .from(sessionDecks)
    .where(and(eq(sessionDecks.sessionId, sessionId), eq(sessionDecks.userId, userId)))
    .limit(1)

  // `rows[0]?.orderedDishIds ?? null`: một mảng RỖNG là giá trị hợp lệ (không
  // "nullish"), nên toán tử `??` KHÔNG nhầm nó với "chưa materialize". Chỉ khi
  // `rows[0]` chính nó là `undefined` (không có dòng nào) mới trả `null`.
  return rows[0]?.orderedDishIds ?? null
}

async function materializeDeck(
  sessionId: string,
  userId: string,
  orderedDishIds: readonly string[],
): Promise<{ outcome: 'MATERIALIZED' | 'ALREADY_MATERIALIZED' }> {
  try {
    await getDb().insert(sessionDecks).values({ sessionId, userId, orderedDishIds: [...orderedDishIds] })
    return { outcome: 'MATERIALIZED' }
  } catch (error) {
    if (isSessionDeckAlreadyMaterialized(error)) {
      return { outcome: 'ALREADY_MATERIALIZED' }
    }
    throw error
  }
}
```

`UNIQUE_VIOLATION = '23505'` **đã có sẵn** ở đầu file (`drizzle-session-repository.ts` khai nó cho `isSessionUniquenessViolation`) — nhưng đó là file khác feature (`session`, không phải `selection`). Ở đây khai lại hằng số cục bộ, đúng tiền lệ mỗi file tự khai duck-typing checker của mình (`isParticipantUniquenessViolation` ở E3-S2 cũng làm vậy) — không tạo một module `shared` dùng chung cho một hằng số một dòng.

`orderedDishIds: [...orderedDishIds]` — cột `jsonb` cần một mảng thường (không phải `readonly`) để Drizzle serialize; spread rẻ hơn nới lỏng kiểu bằng `as`.

Thêm cả bốn thay đổi vào `export const drizzleSelectionRepository`.

## 6.3 Integration test — mở rộng `drizzle-selection-repository.integration.test.ts`

```ts
it('TC-041 — materializeDeck rồi findMaterializedDeck: đọc lại đúng thứ tự đã lưu', async () => {
  const outcome = await drizzleSelectionRepository.materializeDeck(session.id, user.id, ['d3', 'd1', 'd2'])
  expect(outcome.outcome).toBe('MATERIALIZED')

  const read = await drizzleSelectionRepository.findMaterializedDeck(session.id, user.id)
  expect(read).toEqual(['d3', 'd1', 'd2']) // đúng thứ tự đã ghi, không sắp lại
})

it('materialize hai lần cho cùng (session, user): lần hai ALREADY_MATERIALIZED, dữ liệu KHÔNG đổi', async () => {
  await drizzleSelectionRepository.materializeDeck(session.id, user.id, ['d1'])
  const second = await drizzleSelectionRepository.materializeDeck(session.id, user.id, ['d2'])

  expect(second.outcome).toBe('ALREADY_MATERIALIZED')
  expect(await drizzleSelectionRepository.findMaterializedDeck(session.id, user.id)).toEqual(['d1'])
})

it('findMaterializedDeck: chưa materialize trả null, KHÁC mảng rỗng', async () => {
  expect(await drizzleSelectionRepository.findMaterializedDeck(session.id, 'chua-tung-mo-deck')).toBeNull()
})

it('materialize mảng rỗng (TC-102, Group 0 món): đọc lại ra [] chứ không phải null', async () => {
  await drizzleSelectionRepository.materializeDeck(session.id, user.id, [])
  expect(await drizzleSelectionRepository.findMaterializedDeck(session.id, user.id)).toEqual([])
})
```

---

# 7. `list-deck.ts` — SỬA, nối toàn bộ luồng

```ts
import { buildDeck, computePersonalScore } from '../domain/ranking'
// ↑ computePersonalScore không dùng trực tiếp ở đây (buildDeck tự gọi nội bộ)
//   — import đúng những gì thật sự cần, xem lại khi code.
import { computeRecencyPenalty, daysSinceLastEaten } from '@/features/history/domain/recency'
import type { HistoryRepository } from '@/features/history/application/history-repository'
import { RANKING_CONFIG } from '../domain/ranking-config'
import { getDeckPage } from '../domain/deck-page'
import type { DishCard, SelectionRepository } from './selection-repository'
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

export type ListDeckDeps = {
  readonly selection: SelectionRepository
  readonly history: HistoryRepository
}

export type ListDeckInput = {
  readonly sessionId: string
  readonly userId: string
  readonly cursor: number
  readonly pageSize: number
  /**
   * Người gọi truyền `session.decisionDate` — KHÔNG tính `new Date()` ở đây.
   * Đúng kỷ luật "hàm nhận referenceDate làm tham số" mà E4-T1 (S1) đã đặt ra
   * cho `computeRecencyPenalty`; ở tầng use case thì `referenceDate` cũng
   * không tự suy ra, vì `selection` không biết timezone của Group (đó là
   * `group`, và `selection` không được import `group`).
   */
  readonly referenceDate: string
}

export type ListDeckResult = {
  readonly items: DishCard[]
  readonly nextCursor: number | null
}

const ACCEPTED_PARTICIPANT_STATES = ['ACTIVE', 'COMPLETED'] as const

function groupEatingDatesByDish(
  rows: readonly { globalDishId: string; eatingDate: string }[],
): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const row of rows) {
    const existing = map.get(row.globalDishId)
    if (existing === undefined) {
      map.set(row.globalDishId, [row.eatingDate])
    } else {
      existing.push(row.eatingDate)
    }
  }
  return map
}

export async function listDeck(
  deps: ListDeckDeps,
  input: ListDeckInput,
): Promise<Result<ListDeckResult, Failure>> {
  // TC-103 — trước MỌI truy vấn, cùng nguyên tắc "validate không chạm DB"
  // đã dùng ở `addDishToGroup`.
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

  let orderedDishIds = await deps.selection.findMaterializedDeck(input.sessionId, input.userId)

  if (orderedDishIds === null) {
    // Lần đầu mở deck — TÍNH RANKING, chỉ MỘT lần trong đời deck này.
    const eatingRows = await deps.history.findEatingDates(
      input.userId,
      eligible.map((d) => d.globalDishId),
    )
    const eatingByDish = groupEatingDatesByDish(eatingRows)

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
        // Thua race hiếm: request khác vừa materialize xong. Đọc lại để hội
        // tụ về ĐÚNG thứ tự đã thắng, không dùng bản mình vừa tính.
        : ((await deps.selection.findMaterializedDeck(input.sessionId, input.userId)) ?? built)
  }

  // R-02 (TC-108) — giao giữa thứ tự đã lưu và tập ACTIVE hiện tại. Giữ
  // nguyên thứ tự đã lưu, chỉ bớt dish không còn hợp lệ. Món mới thêm sau
  // materialize KHÔNG xuất hiện — đây là chủ ý (BR-048 Deck Stability).
  const eligibleById = new Map(eligible.map((dish) => [dish.dishId, dish]))
  const orderedCards = orderedDishIds
    .map((dishId) => eligibleById.get(dishId))
    .filter((dish): dish is DishCard => dish !== undefined)

  const page = getDeckPage(orderedCards, input.cursor, input.pageSize)
  return ok({ items: [...page.items], nextCursor: page.nextCursor })
}
```

**Điểm cần soát kỹ khi code**: import `computePersonalScore` ở dòng đầu là KHÔNG cần — `buildDeck` tự gọi nó nội bộ (đã viết ở S1). Xoá dòng import thừa đó, `tsc`/`knip`/`eslint no-unused-vars` sẽ tự bắt nếu để sót.

## 7.1 Test — mở rộng `list-deck.test.ts`

Giữ nguyên các test đã có từ E1-T9 (participant validation), thêm:

```ts
function makeDishCard(overrides: Partial<DishCard> = {}): DishCard {
  return {
    dishId: 'gd-1',
    globalDishId: 'gld-1',
    name: 'Canh chua',
    systemTags: [],
    effectiveInteraction: null,
    ...overrides,
  }
}

function makeDeps(overrides: {
  eligible?: DishCard[]
  materialized?: readonly string[] | null
  eatingRows?: { globalDishId: string; eatingDate: string }[]
} = {}) {
  const materializeDeck = vi.fn(async () => ({ outcome: 'MATERIALIZED' as const }))
  const selection: Partial<SelectionRepository> = {
    findParticipant: vi.fn(async () => ({ id: 'p-1', state: 'ACTIVE' })),
    listEligibleDishCards: vi.fn(async () => overrides.eligible ?? [makeDishCard()]),
    findMaterializedDeck: vi.fn(async () => overrides.materialized ?? null),
    materializeDeck,
  }
  const history: HistoryRepository = {
    findEatingDates: vi.fn(async () => overrides.eatingRows ?? []),
  }
  return { selection: selection as SelectionRepository, history, materializeDeck }
}

const BASE_INPUT = { sessionId: 's1', userId: 'u1', cursor: 0, pageSize: 20, referenceDate: '2026-08-19' }

describe('listDeck — E4-T3/T4', () => {
  it('TC-103 — cursor âm: ERR_VALIDATION, không chạm DB', async () => {
    const deps = makeDeps()

    const result = await listDeck(deps, { ...BASE_INPUT, cursor: -1 })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_VALIDATION')
    expect(deps.selection.findParticipant).not.toHaveBeenCalled()
  })

  it('lần đầu mở deck: gọi history, materialize đúng một lần', async () => {
    const deps = makeDeps({ eligible: [makeDishCard({ dishId: 'a' }), makeDishCard({ dishId: 'b' })] })

    await listDeck(deps, BASE_INPUT)

    expect(deps.history.findEatingDates).toHaveBeenCalledOnce()
    expect(deps.materializeDeck).toHaveBeenCalledOnce()
  })

  it('TC-041 — đã materialize: KHÔNG gọi history lại, dùng thứ tự đã lưu', async () => {
    const deps = makeDeps({
      eligible: [makeDishCard({ dishId: 'a' }), makeDishCard({ dishId: 'b' })],
      materialized: ['b', 'a'],
    })

    const result = await listDeck(deps, BASE_INPUT)

    expect(deps.history.findEatingDates).not.toHaveBeenCalled()
    expect(deps.materializeDeck).not.toHaveBeenCalled()
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items.map((d) => d.dishId)).toEqual(['b', 'a'])
  })

  it('TC-108 — món trong thứ tự đã lưu nhưng KHÔNG còn trong eligible: tự loại bỏ', async () => {
    const deps = makeDeps({
      eligible: [makeDishCard({ dishId: 'a' })], // 'b' đã bị gỡ (INACTIVE), không còn trong eligible
      materialized: ['b', 'a'],
    })

    const result = await listDeck(deps, BASE_INPUT)

    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items.map((d) => d.dishId)).toEqual(['a'])
  })

  it('TC-102 — 0 món ACTIVE: deck rỗng, không lỗi', async () => {
    const deps = makeDeps({ eligible: [] })

    const result = await listDeck(deps, BASE_INPUT)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items).toEqual([])
    expect(result.value.nextCursor).toBeNull()
  })

  it('TC-045 — 30 món, cursor=0, pageSize=20: 20 món, nextCursor=20', async () => {
    const eligible = Array.from({ length: 30 }, (_, i) => makeDishCard({ dishId: `d${i}` }))
    const deps = makeDeps({ eligible, materialized: eligible.map((d) => d.dishId) })

    const result = await listDeck(deps, { ...BASE_INPUT, pageSize: 20 })

    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items).toHaveLength(20)
    expect(result.value.nextCursor).toBe(20)
  })

  it('TC-046 — 30 món, cursor=20, pageSize=20: 10 món còn lại, nextCursor=null', async () => {
    const eligible = Array.from({ length: 30 }, (_, i) => makeDishCard({ dishId: `d${i}` }))
    const deps = makeDeps({ eligible, materialized: eligible.map((d) => d.dishId) })

    const result = await listDeck(deps, { ...BASE_INPUT, cursor: 20, pageSize: 20 })

    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items).toHaveLength(10)
    expect(result.value.nextCursor).toBeNull()
  })

  it('TC-104 — cursor vượt quá tổng số món: 0 item, nextCursor=null, không lỗi', async () => {
    const eligible = [makeDishCard()]
    const deps = makeDeps({ eligible, materialized: ['gd-1'] })

    const result = await listDeck(deps, { ...BASE_INPUT, cursor: 100 })

    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items).toEqual([])
    expect(result.value.nextCursor).toBeNull()
  })

  it('TC-047 — không phải Participant: ERR_NOT_PARTICIPANT (đã có từ E1-T9, test hồi quy)', async () => {
    const deps = makeDeps()
    deps.selection.findParticipant = vi.fn(async () => null)

    const result = await listDeck(deps, BASE_INPUT)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_NOT_PARTICIPANT')
  })
})
```

---

# 8. Rủi ro

| Rủi ro | Hậu quả | Giảm thiểu |
|---|---|---|
| Nhầm `null` với `[]` ở `findMaterializedDeck` | Deck đã materialize rỗng (TC-102) bị tính ranking lại mỗi lần mở — không sai kết quả nhưng sai lý do tồn tại của materialize | `??` chỉ bắt `undefined`/`null`, không bắt `[]` — đã kiểm ở §6.2, có test riêng ở §6.3 |
| Quên `[...orderedDishIds]` khi ghi cột `jsonb` | Drizzle serialize kiểu `readonly` có thể lỗi hoặc mất kiểu tuỳ phiên bản driver | Đã spread tường minh, §6.2 |
| Đổi `page.tsx` sang `pageSize=20` "cho khớp config" | Cắt cụt deck thật ở nhóm >20 món, không có UI "tải thêm" để bù | Quyết định rõ ràng ở §1.6 — đừng tự ý đổi call site |
| `list-deck.ts` import thừa `computePersonalScore` | `knip`/lint cảnh báo export/import không dùng | Đã cảnh báo ở §7, xoá khi code |
| Race hai request đồng thời lần đầu mở deck | Nếu không đọc lại sau `ALREADY_MATERIALIZED`, hai người xem hai thứ tự khác nhau cho CÙNG một deck | Đã xử lý — đọc lại qua `findMaterializedDeck`, §7 |

---

# 9. Test Cases coverage

| TC | Mô tả | Tầng | Nơi test |
|---|---|---|---|
| `TC-041` | Mở lại deck lần 2 → thứ tự giữ nguyên | `A`+`I` | `list-deck.test.ts`, `drizzle-selection-repository.integration.test.ts` |
| `TC-045` | 30 món, cursor=0 → 20 món, nextCursor=20 | `A` | `list-deck.test.ts` |
| `TC-046` | 30 món, cursor=20 → 10 món, nextCursor=null | `A` | `list-deck.test.ts` |
| `TC-047` | Không phải Participant → `ERR_NOT_PARTICIPANT` | `A` | `list-deck.test.ts` (hồi quy, đã có từ E1-T9) |
| `TC-102` | 0 món ACTIVE → deck rỗng, không lỗi | `A` | `list-deck.test.ts` |
| `TC-103` | cursor âm → `ERR_VALIDATION` | `A` | `list-deck.test.ts` |
| `TC-104` | cursor vượt tổng số món → 0 item | `A` | `list-deck.test.ts` |
| `TC-108` | Dish gỡ sau materialize → loại khỏi lần đọc kế | `I` | `list-deck.test.ts` (mock) + integration thật qua §10.2 |

---

# 10. Verify

## 10.1 Cổng máy

```bash
yarn verify && yarn arch:probe
yarn test:integration
```

`yarn arch:probe` đáng chú ý nhất slice này: `list-deck.ts` giờ import trực tiếp từ `@/features/history/...` — xác nhận đây đúng là chiều `ALLOWED_CROSS_FEATURE` cho phép, không phải một ngoại lệ lọt lưới.

## 10.2 Bằng chứng TC-108 qua dữ liệu thật — DoD chính của E4-T4

1. `yarn dev`, mở một deck (session `ACTIVE`, có ≥3 món). Ghi lại thứ tự 3 món đầu.
2. `yarn db:studio` → `session_decks` → xác nhận có đúng 1 dòng cho `(sessionId, userId)` của bạn, `ordered_dish_ids` đúng thứ tự vừa thấy.
3. Từ một tab khác (Admin), gỡ món đứng thứ 2 khỏi Group Dish Pool — **chưa có UI cho việc này** (F27 chưa làm, theo ghi nhận từ E2-S4 §2.1) — sửa tay `group_dishes.state = 'INACTIVE'` trong `db:studio`.
4. Tải lại trang deck. → Món vừa gỡ **biến mất**, hai món còn lại giữ nguyên thứ tự tương đối với nhau.
5. `session_decks.ordered_dish_ids` **không đổi** — vẫn còn cả 3 id cũ (bảng lưu bộ khung gốc, việc lọc là ở tầng đọc, không phải ghi đè bảng).

## 10.3 Bằng chứng TC-041 — thứ tự bất biến

1. Mở deck, ghi lại thứ tự 5 món đầu.
2. Vuốt vài món (đổi `effectiveInteraction`, KHÔNG đổi `group_dishes.state`).
3. Tải lại trang. → Thứ tự 5 món đầu **y hệt** bước 1 — chỉ trạng thái vuốt trên từng thẻ đổi, vị trí không đổi.

---

# 11. Thứ tự TDD

1. `schema.ts` (+ `sessionDecks`) → `yarn db:generate` → đối chiếu §3.1
2. `history/application/history-repository.ts` (port, không test riêng) → `drizzle-history-repository.ts` → integration test (§4.1)
3. `dish-card.ts` (+ `globalDishId`) → `drizzle-selection-repository.ts`'s `listEligibleDishCards` (§6.1)
4. `selection-repository.ts` (port, +2 method) → `drizzle-selection-repository.ts`'s `findMaterializedDeck`/`materializeDeck` (§6.2) → integration test (§6.3)
5. `list-deck.test.ts` (mở rộng, §7.1) → `list-deck.ts` (§7)
6. `yarn verify && yarn arch:probe && yarn test:integration`

---

# 12. Master Plan

Sau khi `yarn verify`/`yarn arch:probe`/`yarn test:integration` xanh và §10.2/§10.3 đã kiểm tay: tick `E4-T3` và `E4-T4` ở §6.
