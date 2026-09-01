# 🍚 Implementation Guide — E9 Slice S1: Dữ liệu chặng và thuật toán chia

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-09-01`
> - **Upstream:** [Master Plan §16.4](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E9-T0`, `E9-T1`, `E9-T3`) • [SDD §8.3](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-029`, `SPEC-030`) • [Business Rules](../../what-we-gonna-eat-today_business-rules_v1.8.md) (`BR-003`, `BR-062`, `BR-063`) • [Ranking Spec §2.4, §2.5](../../what-we-gonna-eat-today_ranking-specification_v1.3.md) • [Decision Log](../../what-we-gonna-eat-today_decision-log_v3.9.md) (`DEC-015`, `DEC-043`, `DEC-044`, `DEC-059`, `DEC-064`) • [Test Cases](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-131`→`TC-137`, `TC-151`, `TC-152`)
> - **Tiền đề:** E8-S1 xong — `capDeck`, `blendExploitExplore`, `isExploreEligible` đã có.
>
> 🍚 *Slice dữ liệu. Sau slice này Creator mở phiên theo chặng được và deck dựng ra đúng từng chặng — nhưng màn hình vẫn vuốt như cũ (S2 mới đổi).*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E9-T0` | Deck mang System Tag | 1 | `drizzle-selection-repository.ts`, `dish-card.ts` | Thẻ vuốt hiện đúng nhãn món, không còn "Trong danh mục" cho mọi thẻ |
| `E9-T1` | Schema chặng + snapshot lúc Start | 3 | `schema.ts`, `session/**`, `sessions/new/actions.ts` | Mở phiên `COURSE` ghi đúng `session_courses` trong cùng giao dịch |
| `E9-T3` | Chia chặng và phân bổ hạn mức | 4 | `selection/domain/course-deck.ts`, `list-deck.ts` | Chặng nào cũng có món, kể cả khi top-30 lệch hẳn về một tag |

- [ ] `TC-131`→`TC-137`, `TC-151`, `TC-152` xanh
- [ ] `TC-152` (ca then chốt): nhóm mà top-30 không có món `SOUP` nào vẫn cho chặng Canh đầy đủ (§1.2)
- [ ] Snapshot chặng mang guard `DRAFT` — hai `startDraft` song song không để lại dòng mồ côi (§1.3)
- [ ] `DishCard.systemTags` kiểu `readonly SystemTag[]`, không phải `string[]` (§1.1)
- [ ] `yarn verify && yarn arch:probe && yarn test:integration` xanh

---

# 1. Năm phát hiện — đọc trước khi gõ

## 1.1 Deck chưa bao giờ mang System Tag — và điều đó đang làm hỏng thẻ vuốt

[`listEligibleDishCards`](../../../src/features/selection/infrastructure/drizzle-selection-repository.ts) join `global_dishes`, `selection_sessions`, `interactions`, `user_dish_constraints` — **không bao giờ** join `group_dish_tags`. Dòng cuối trả thẳng `systemTags: []`.

`E9-T3` chia chặng theo System Tag, nên nếu không sửa, mọi món rơi vào "không khớp chặng nào" và mọi chặng rỗng. Đó là lý do `E9-T0` phải đứng đầu slice.

**Nhưng nó còn đang làm hỏng một thứ khác, ngay lúc này.** [`dish-swipe-card.tsx`](../../../src/features/selection/presentation/components/dish-swipe-card.tsx) render:

```tsx
<span className="rounded-chip …">{dish.systemTags[0] ?? 'Trong danh mục'}</span>
…
{dish.systemTags.length === 0 ? null : (/* khối chip nhãn */)}
```

`systemTags` luôn rỗng ⇒ **mọi thẻ vuốt đều hiện "Trong danh mục"**, và khối chip nhãn không bao giờ render. Mockup có chip nhãn; sản phẩm thì không. Không ai phát hiện vì chuỗi fallback trông như một lựa chọn thiết kế, chứ không như một trường rỗng.

**Khuôn sửa đã nằm sẵn trong chính file đó** — `countInteractionsByDish` (E7-S3):

```ts
systemTags: sql<string[]>`coalesce(json_agg(distinct ${groupDishTags.systemTag})
  filter (where ${groupDishTags.systemTag} is not null), '[]'::json)`,
// …
.leftJoin(groupDishTags, eq(groupDishTags.groupDishId, groupDishes.id))
.groupBy(groupDishes.id, globalDishes.id, globalDishes.name)
// …
systemTags: toSystemTags(row.systemTags),
```

Ba chú ý khi chép sang `listEligibleDishCards`:

1. **`GROUP BY` phải liệt kê cả `interactions.type`** — nó là cột không gộp duy nhất còn lại. An toàn vì `interactions_session_participant_dish_unique` bảo đảm left join đó trả tối đa một dòng.
2. **Dùng [`toSystemTags`](../../../src/shared/domain/system-tag.ts)**, đừng ép kiểu. Hàm này đã tồn tại cho đúng ca này: `json_agg` trả `string[]` mà TypeScript không kiểm được, và nó **bỏ qua giá trị lạ thay vì ném** — một hàng hỏng không được làm sập cả màn deck.
3. `toSystemTags` trả về theo **thứ tự chuẩn** của `SYSTEM_TAGS`, không theo thứ tự `json_agg` — miễn phí cho `E9-T3` (§1.5) và cho chip nhãn.

Đổi `DishCard.systemTags` từ `readonly string[]` sang `readonly SystemTag[]`, và **xoá comment** *"Luôn rỗng ở S5 — `group_dish_tags` là E2-T5, chưa tồn tại"* — nó sai từ E2 và là thứ khiến trường rỗng này sống sót lâu đến vậy.

## 1.2 Cắt trần rồi mới chia chặng sẽ làm RỖNG chặng

Đây là phát hiện quan trọng nhất của cả epic, và nó cùng lớp với lỗi "cắt trần trước khi trộn Explore" của E8 — chỉ ở một tầng cao hơn.

Pipeline sau E8-S1 kết thúc bằng `blendExploitExplore` → `capDeck(30)` → `materializeDeck`. Nếu E9 chỉ chia chặng **sau** bước đó:

> Nhóm 100 món. Top-30 theo Personal Score tình cờ gồm 22 món `MAIN`, 8 món `STAPLE`, **0 món `SOUP`**. Creator cấu hình ba chặng Cơm → Canh → Mặn. Chặng "Canh" **rỗng hoàn toàn**, dù danh mục có 15 món canh.

Deck vẫn 30 thẻ, vẫn chạy, không lỗi nào. Người dùng kết luận nhà mình không có món canh nào — hoặc tệ hơn, kết luận tính năng chặng bị hỏng.

Điều này **rất dễ xảy ra** chứ không phải ca hiếm: Personal Score ở v1.1 chỉ có hai số hạng ($E$ và $R$), nên một nhóm vừa ăn canh hôm qua sẽ đẩy toàn bộ món canh xuống đuôi bảng cùng lúc.

**Trần phải cắt theo từng chặng.** Pipeline rẽ nhánh theo `deck_mode`:

```text
FREE    lọc → xếp → trộn Explore → cắt trần 30 → materialize

COURSE  lọc → xếp → chia theo tag ─┬─ chặng 1: trộn Explore → cắt hạn mức ─┐
                                   ├─ chặng 2: trộn Explore → cắt hạn mức ─┼→ nối theo
                                   └─ chặng n: trộn Explore → cắt hạn mức ─┘  thứ tự chặng
                                                                          → materialize
```

Làm được vì `deck_mode` và `session_courses` đóng băng lúc Start — **trước** mọi lần dựng deck.

**`session_decks` KHÔNG đổi schema.** `SPEC-030` chốt một món chỉ thuộc **một** chặng, nên từ mảng phẳng + tag món + danh sách chặng là suy lại được nhóm ở mỗi lần đọc (S2, `E9-T4`) — đúng khuôn `lane` của E8 ([DEC-064](../../what-we-gonna-eat-today_decision-log_v3.9.md) mục 4). Lưu thứ tự phẳng cũng giữ nguyên bất biến đóng băng của `BR-048`.

## 1.3 Snapshot chặng phải mang guard `DRAFT` — `INSERT … VALUES` là bẫy

[`buildSnapshotStatement`](../../../src/features/rule/infrastructure/drizzle-rule-repository.ts) ghi nguyên văn:

> `WHERE state = 'DRAFT'` là toàn bộ cơ chế idempotency và cách ly — câu này PHẢI đứng TRƯỚC câu UPDATE trong batch.

Nó là `INSERT … SELECT` với guard **nằm trong SELECT**: session không còn `DRAFT` thì SELECT trả 0 dòng, INSERT ghi 0 dòng. Đó là lý do `startDraft` trả `NOT_DRAFT` mà không để lại `session_rules` mồ côi — và comment ở [`startDraft`](../../../src/features/session/infrastructure/drizzle-session-repository.ts) nói đúng điều đó.

Dữ liệu chặng đến từ **form của Creator**, nên phản xạ tự nhiên là `db.insert(sessionCourses).values([...])`. Câu đó **không có guard nào**. Hai người bấm "Bắt đầu phiên" cùng lúc: một người thắng UPDATE, người kia nhận `NOT_DRAFT` — nhưng cả hai đã ghi `session_courses`, và cấu hình của người thua có thể đè lên phiên của người thắng.

**Cách đúng** — mỗi chặng một câu `INSERT … SELECT`, `position`/`systemTag` là literal:

```ts
/**
 * SPEC-029 — snapshot chặng. `INSERT … SELECT` chứ KHÔNG `INSERT … VALUES`:
 * guard `state = 'DRAFT'` nằm trong SELECT là toàn bộ cơ chế cách ly, y hệt
 * `buildSnapshotStatement` của feature `rule` (Guide §1.3). Một câu VALUES sẽ
 * ghi cả khi session không còn DRAFT.
 *
 * Tối đa 5 câu (5 System Tag), tất cả tự chứa nên `db.batch()` của driver HTTP
 * đủ dùng — cùng ràng buộc đã ghi ở `shared/db/client.ts`.
 */
function buildCourseSnapshotStatements(db: Database, sessionId: string, courses: readonly SystemTag[]) {
  return courses.map((tag, position) =>
    db
      .insert(sessionCourses)
      .select(
        db
          .select({
            sessionId: selectionSessions.id,
            position: sql<number>`${position}`,
            systemTag: sql<SystemTag>`${tag}`,
          })
          .from(selectionSessions)
          .where(and(eq(selectionSessions.id, sessionId), eq(selectionSessions.state, 'DRAFT'))),
      )
      .onConflictDoNothing(),
  )
}
```

Đặt chúng vào **cùng `db.batch()`** với `buildSnapshotStatement` và câu UPDATE, và **trước** câu UPDATE — cùng lý do thứ tự đã ghi cho `session_rules`.

> [!NOTE]
> [`DEC-044`](../../what-we-gonna-eat-today_decision-log_v3.9.md) lập luận `session_rules` không có cột `id` vì `INSERT … SELECT` chạy trọn trong Postgres nên không sinh được UUID v7 ở tầng ứng dụng. Với `session_courses` lý lẽ đó **không áp dụng** — giá trị đến từ app, sinh `id` được. Vẫn không thêm `id`: `(session_id, position)` đã là khoá tự nhiên, và một cột thừa ở đây là một cột phải giải thích mãi mãi.

## 1.4 Ba mắt xích phải nới để cấu hình chặng đi từ form xuống DB

Chuỗi hiện tại không mắt xích nào nhận cấu hình:

```text
openSessionAction(groupId, prevState)          ← FormData nằm ở đây
  → startSession(deps, sessionId, callerId)    ← không có tham số nào cho chặng
    → sessions.startDraft(sessionId)           ← chỉ nhận sessionId
```

Nới cả ba:

| Mắt xích | Thay đổi |
| --- | --- |
| [`openSessionAction`](../../../src/app/groups/[groupId]/sessions/new/actions.ts) | Đọc `deckMode` và `courses[]` từ `FormData`; **chữ ký hiện thiếu `formData`** — `(groupId, _previousState)` phải thành `(groupId, _previousState, formData)` |
| [`startSession`](../../../src/features/session/application/start-session.ts) | Nhận `{ deckMode, courses }`; validate; truyền xuống |
| `startDraft` | `startDraft(sessionId, { deckMode, courses })`; thêm các câu ở §1.3 và set `deck_mode` trong **chính câu UPDATE đã có** |

Validate ở **use case**, không ở Server Action: đó là chỗ `startSession` đã chạy 4 bước revalidate của `SPEC-008`, và là chỗ test tầng `A` bám vào. Hai luật:

- `deckMode === 'COURSE'` mà `courses` rỗng → `ERR_VALIDATION` (`TC-132`).
- Một System Tag xuất hiện hai lần → `ERR_VALIDATION`.

`deckMode === 'FREE'` thì bỏ qua `courses` hoàn toàn, kể cả khi form gửi lên — cùng khuôn "trường thừa bị bỏ qua" đã chốt ở `TC-117`.

## 1.5 Món đa tag vào ĐÚNG MỘT chặng, và thứ tự chuẩn cho không

`SPEC-030` chốt: món mang nhiều tag chỉ xuất hiện ở **chặng đầu tiên khớp**. Không làm vậy thì người dùng vuốt cùng một món hai lần và $P$ của `BR-049` bị đếm trùng — lỗi im lặng, bảng xếp hạng vẫn ra số hợp lệ.

"Chặng đầu tiên" tính theo **thứ tự Creator sắp**, không theo thứ tự tag trong `SYSTEM_TAGS`. Nhóm sắp Canh → Mặn thì "Bò kho bánh mì" (`MAIN`+`SOUP`) vào chặng Canh.

Thuận lợi: `toSystemTags` (§1.1) đã trả tag theo thứ tự chuẩn và **khử trùng lặp** sẵn, nên `E9-T3` không phải tự chuẩn hoá đầu vào.

`TAG_ORDER` hiện có **hai bản sao** (`drizzle-rule-repository.ts:11`, `drizzle-meal-repository.ts:20`), cả hai dựng từ `SYSTEM_TAGS`. **Đừng tạo bản thứ ba** — `E9` chỉ cần `SYSTEM_TAGS` trực tiếp, và chỉ ở tầng `app/` để dựng giá trị mặc định (S2).

---

# 2. File tree

```text
src/features/selection/
├── domain/
│   ├── dish-card.ts                   # E9-T0 — systemTags: readonly SystemTag[]
│   ├── course-deck.ts                 # E9-T3 — MỚI
│   └── course-deck.test.ts
├── application/
│   ├── selection-repository.ts        # E9-T4 (S2) — chữ ký listSessionCourses
│   └── list-deck.ts                   # E9-T3 — pipeline rẽ nhánh (§1.2)
└── infrastructure/
    └── drizzle-selection-repository.ts # E9-T0 — join group_dish_tags

src/features/session/
├── application/start-session.ts       # E9-T1 — nhận + validate cấu hình chặng
├── application/session-repository.ts  # E9-T1 — startDraft đổi chữ ký
└── infrastructure/drizzle-session-repository.ts  # E9-T1 — snapshot có guard

src/shared/db/
├── schema.ts                          # E9-T1 — deck_mode enum, session_courses
└── migrations/0013_session_courses.sql

src/app/groups/[groupId]/sessions/new/actions.ts  # E9-T1 — đọc FormData
```

---

# 3. `E9-T0` — Deck mang System Tag

Chép khuôn §1.1 vào `listEligibleDishCards`. Kiểu `DishCard.systemTags` đổi sang `readonly SystemTag[]`; `tsc` sẽ chỉ ra mọi chỗ dựng `DishCard` trong test cần cập nhật (`deck-screen.test.tsx`, `dish-swipe-card.test.tsx`, `resume-position.test.ts`).

### Test — `TC-151` (tầng `I`)

Nhóm có món "Bún chả" gắn `STAPLE`+`MAIN` và món "Canh chua" gắn `SOUP`. Gọi `listEligibleDishCards`:

- "Bún chả" trả `['STAPLE', 'MAIN']` — **đúng thứ tự chuẩn**, không phải thứ tự chèn.
- "Canh chua" trả `['SOUP']`.
- Món chưa gắn tag nào trả `[]` (không phải `null`, không ném).

Cộng một ca component: `DishSwipeCard` với `systemTags: ['SOUP']` hiện **"Canh"**, không hiện "Trong danh mục".

---

# 4. `E9-T1` — Schema và snapshot

## 4.1 Schema

```ts
/** BR-063 — hai chế độ duyệt. `FREE` là mặc định: phiên tạo bằng đường cũ
 *  chạy y như trước, không migration dữ liệu nào. */
export const deckMode = pgEnum('deck_mode', ['FREE', 'COURSE'])
```

`selection_sessions` thêm `deckMode: deckMode('deck_mode').notNull().default('FREE')`.

```ts
/**
 * SPEC-029 — bản sao đông cứng danh sách chặng tại thời điểm Start, cùng khuôn
 * `session_rules` (DEC-044): không cột `id`, khoá tự nhiên `(session_id, position)`.
 *
 * `position` bắt đầu từ 0 và liên tục — thứ tự Creator sắp, KHÔNG phải thứ tự
 * chuẩn của SYSTEM_TAGS.
 */
export const sessionCourses = pgTable(
  'session_courses',
  {
    sessionId: uuid('session_id').notNull().references(() => selectionSessions.id),
    position: integer('position').notNull(),
    systemTag: systemTag('system_tag').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.position] }),
    // Một tag không được xuất hiện hai lần trong cùng phiên — nếu không,
    // quy tắc "chặng đầu tiên khớp" (§1.5) có hai đáp án.
    uniqueIndex('session_courses_session_tag_unique').on(table.sessionId, table.systemTag),
  ],
)
```

Migration `0013_session_courses.sql`. **Đọc lại SQL sinh ra** trước khi `db:migrate` — thêm cột có `DEFAULT` vào bảng đang có dữ liệu là chỗ drizzle-kit đôi khi sinh thừa.

## 4.2 Snapshot và ba mắt xích

Theo §1.3 và §1.4.

`db.batch()` của `startDraft` thành: `[buildSnapshotStatement, ...buildCourseSnapshotStatements, UPDATE]`. Câu UPDATE thêm `deckMode` vào `.set({ … })` đã có — không thêm câu thứ hai.

### Test

| Ca | Tầng | Kỳ vọng |
| --- | :---: | --- |
| `TC-131` | `I` | Start `COURSE` 3 chặng → `session_courses` đúng 3 dòng, `position` 0→2, ghi cùng giao dịch với `session_rules` |
| `TC-132` | `A` | `COURSE` + `courses` rỗng → `ERR_VALIDATION`, không ghi gì |
| `TC-133` | `I` | Đổi Group Rule sau khi phiên `ACTIVE` → `session_courses` không đổi |
| — | `A` | Tag trùng trong `courses` → `ERR_VALIDATION` |
| — | `I` | **`startDraft` trên session đã `ACTIVE`** → `NOT_DRAFT` và **không** dòng `session_courses` nào được ghi (§1.3) |

Ca cuối là ca canh guard. Viết nó bằng cách gọi `startDraft` hai lần liên tiếp và đếm dòng `session_courses` sau lần thứ hai.

---

# 5. `E9-T3` — Chia chặng và phân bổ hạn mức

## 5.1 `course-deck.ts` — MỚI

```ts
export type CourseDeck = {
  readonly systemTag: SystemTag
  readonly dishIds: readonly string[]
}

/**
 * SPEC-030 + BR-063 — chia danh sách đã sắp thành các chặng, cắt hạn mức
 * TRONG TỪNG CHẶNG.
 *
 * Cắt theo chặng chứ không cắt chung rồi chia (Guide §1.2): top-30 của một
 * nhóm vừa ăn canh hôm qua có thể không còn món canh nào, và chặng Canh sẽ
 * rỗng dù danh mục có 15 món.
 *
 * Món mang nhiều tag vào ĐÚNG MỘT chặng — chặng đầu tiên khớp theo thứ tự
 * Creator sắp (§1.5). Hai chặng cùng chứa một món nghĩa là người dùng vuốt nó
 * hai lần và P của BR-049 bị đếm trùng.
 */
export function splitIntoCourses(input: {
  /** Đã sắp theo Personal Score, chưa trộn Explore, chưa cắt trần. */
  readonly orderedDishIds: readonly string[]
  readonly tagsByDishId: ReadonlyMap<string, readonly SystemTag[]>
  /** Thứ tự Creator sắp. */
  readonly courses: readonly SystemTag[]
  readonly maxCards: number
}): CourseDeck[]
```

**Phân bổ hạn mức** — hai bước, và bước hai phải lặp:

1. Hạn mức cơ sở mỗi chặng $= \lfloor \text{maxCards} / n \rfloor$.
2. Chặng nào có ít món hơn hạn mức thì phần dư chia lại cho các chặng còn thiếu. **Lặp** cho tới khi không phân bổ được nữa — một vòng là không đủ: chia lại có thể làm một chặng khác chạm trần của nó và sinh dư mới.

> Ba chặng, 30 thẻ ⇒ cơ sở 10/10/10. Chặng `SOUP` chỉ có 4 món ⇒ dư 6, chia cho hai chặng kia thành 13/13. Nếu chặng `STAPLE` chỉ có 5 món thì vòng hai lại dư 8 cho chặng `MAIN`.

Phần dư không chia hết cho số chặng còn lại thì chặng đứng **trước** nhận phần lẻ — xác định, không random.

Món **không khớp chặng nào** (tag không nằm trong danh sách chặng, hoặc chưa gắn tag) bị **loại khỏi deck** ở chế độ `COURSE`. Đó là hệ quả có chủ đích của việc Creator chọn chặng: chọn ba chặng nghĩa là tối nay chỉ duyệt ba loại món đó.

## 5.2 Nối vào `list-deck.ts`

Trong nhánh `orderedDishIds === null`, rẽ theo `deckMode`:

```ts
const built =
  session.deckMode === 'COURSE'
    ? splitIntoCourses({
        orderedDishIds: ordered,
        tagsByDishId,
        courses,
        maxCards: RANKING_CONFIG.deck.maxCards,
      })
        // Trộn Explore TRONG TỪNG CHẶNG, rồi nối theo thứ tự chặng.
        .flatMap((course) =>
          blendExploitExplore({
            exploit: course.dishIds,
            explore: course.dishIds.filter((id) => isExploreEligible(byId.get(id)!, RANKING_CONFIG)),
            blockSize: RANKING_CONFIG.explore.blockSize,
          }),
        )
    : capDeck(
        blendExploitExplore({ exploit: ordered, explore, blockSize: RANKING_CONFIG.explore.blockSize }),
        RANKING_CONFIG.deck.maxCards,
      )
```

Hai điểm dễ sai:

- **Nhánh `COURSE` không gọi `capDeck` lần nữa.** `splitIntoCourses` đã cắt theo hạn mức; cắt thêm 30 ở ngoài là vô hại về số lượng nhưng che mất lỗi nếu phân bổ sai — để nó lộ ra.
- **`blendExploitExplore` chạy trong từng chặng**, nên một chặng 10 thẻ cho 8 Exploit + 2 Explore, không phải 4+1 rồi hết. Tỉ lệ `BR-047` giữ nguyên vì nó là tỉ lệ theo khối, không theo deck.

`list-deck.ts` cần thêm `deckMode` và `courses` — đọc qua `selection` port (`findSessionCourses(sessionId)`), không import feature `session`.

## 5.3 Test — `course-deck.test.ts`

| Ca | Nội dung | Kỳ vọng |
| --- | --- | --- |
| `TC-134` | 3 chặng, mỗi chặng dư món | Mỗi chặng đúng 10 thẻ |
| `TC-135` | 3 chặng, `SOUP` chỉ có 4 món | 4 + 13 + 13 = 30 |
| `TC-136` | Món `STAPLE`+`MAIN`, cả hai đều là chặng | Xuất hiện ở **đúng một** chặng — chặng đầu tiên theo thứ tự Creator |
| `TC-152` | **Then chốt** — 100 món, top-30 không có `SOUP` nào; chặng Canh có 15 món ở đuôi bảng | Chặng Canh **có món**, không rỗng (§1.2) |
| — | Hai chặng cùng chạm trần rồi một chặng thứ ba thiếu | Vòng phân bổ lại lặp đúng, tổng vẫn ≤ 30 |
| — | Món không khớp chặng nào | Bị loại, không rơi vào chặng cuối |
| — | Toàn bộ kết quả | `new Set(flat).size === flat.length` — không món nào lặp |

`TC-152` là ca không thể suy ra từ `TC-135`: `TC-135` kiểm phân bổ khi một chặng **nghèo món**, `TC-152` kiểm rằng chặng **giàu món nhưng điểm thấp** vẫn được phục vụ. Hai chuyện khác nhau, và chỉ ca thứ hai bắt được lỗi "cắt trần trước khi chia".

---

# 6. Rủi ro

| Rủi ro | Dấu hiệu | Xử lý |
| --- | --- | --- |
| Chia chặng sau `capDeck` | Một chặng rỗng dù danh mục đầy món loại đó | §1.2 — `TC-152` |
| `INSERT … VALUES` cho chặng | Dòng `session_courses` mồ côi khi hai người bấm cùng lúc | §1.3 — guard trong SELECT |
| Món đa tag vào hai chặng | $P$ lớn hơn số người tham gia | §1.5 — `TC-136` |
| Phân bổ dư chỉ chạy một vòng | Tổng thẻ < 30 khi có hai chặng nghèo món | §5.1 — lặp |
| Quên `GROUP BY interactions.type` | Postgres báo lỗi cột không gộp | §1.1 |
| Ép kiểu `as SystemTag[]` | Một tag lạ trong DB làm hỏng chia chặng im lặng | §1.1 — `toSystemTags` |
| Tạo bản sao thứ ba của `TAG_ORDER` | `jscpd` đỏ, hoặc ba nguồn sự thật | §1.5 — dùng `SYSTEM_TAGS` |

---

# 7. Test Cases coverage

`TC-131`→`TC-133` §4.2 • `TC-134`→`TC-136`, `TC-152` §5.3 • `TC-137` → **S2** (`E9-T4`) • `TC-151` §3.

---

# 8. Thứ tự TDD

1. `E9-T0` — `TC-151` (đỏ) → join + `toSystemTags` (xanh) → `tsc` chỉ ra test nào dựng `DishCard` cần sửa.
2. `course-deck.test.ts` gồm `TC-152` và ca khử trùng (đỏ) → `splitIntoCourses` (xanh). Chưa nối vào `list-deck.ts`.
3. Schema + migration `0013` → đọc SQL → `db:migrate`.
4. `startSession` validate (`TC-132`, tag trùng) ở tầng `A` với port mock (đỏ → xanh).
5. `startDraft` + snapshot có guard; ca "gọi hai lần" (đỏ → xanh).
6. `openSessionAction` đọc `FormData` — chưa có UI gửi lên, test bằng `FormData` dựng tay.
7. Nối `splitIntoCourses` vào `list-deck.ts` (§5.2).
8. `yarn verify && yarn arch:probe && yarn test:integration`.

Bước 2 đặt trước bước 3 có chủ đích: `splitIntoCourses` là hàm thuần và chứa toàn bộ phần khó nghĩ của slice; đẩy migration ra sau giữ cho vòng lặp TDD không phải chờ database.

---

# 9. Verify

## 9.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn test:integration
```

## 9.2 Bằng chứng chặng không rỗng

```bash
yarn vitest run src/features/selection/domain/course-deck.test.ts
```

`TC-152` phải xanh. Nếu nó đỏ với chặng Canh rỗng, pipeline đang cắt trần trước khi chia — không phải test sai.

## 9.3 Bằng chứng thẻ vuốt hiện đúng nhãn

Mở một phiên thật trên nhóm có món đã gắn nhãn. Thẻ vuốt hiện **"Canh"** hoặc **"Món mặn"** — không phải "Trong danh mục" cho mọi thẻ. Đây là thứ đã hỏng từ E1 và `E9-T0` là lúc nó được sửa.

## 9.4 Bằng chứng snapshot có guard

```bash
yarn db:studio
```

Mở phiên `COURSE` ba chặng: `session_courses` có đúng 3 dòng, `position` 0/1/2, `selection_sessions.deck_mode = 'COURSE'`. Bấm "Bắt đầu phiên" lần hai trên cùng phiên: **vẫn đúng 3 dòng**.

---

# 10. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v3.9.md`

```markdown
# DEC-066 — Chế Độ Chặng Cắt Trần TRONG TỪNG CHẶNG, Không Cắt Chung Rồi Chia

- **Ngày:** 2026-09-01
- **Trạng thái:** Accepted
- **Bối cảnh:** E9 Slice S1

## Quyết định

1. Pipeline dựng deck rẽ nhánh theo `deck_mode`. `COURSE` chia theo tag TRƯỚC,
   rồi trộn Explore và cắt hạn mức TRONG TỪNG CHẶNG.
2. `session_decks` vẫn lưu một mảng id phẳng; nhóm theo chặng suy lại ở mỗi
   lần đọc.
3. Món không khớp chặng nào bị loại khỏi deck ở chế độ `COURSE`.
4. Snapshot `session_courses` dùng `INSERT … SELECT` với guard `state='DRAFT'`,
   không dùng `INSERT … VALUES`.

## Rationale

1. Personal Score ở v1.1 chỉ có hai số hạng ($E$, $R$), nên một nhóm vừa ăn
   canh hôm qua sẽ đẩy TOÀN BỘ món canh xuống đuôi bảng cùng lúc. Cắt trần 30
   trước khi chia thì chặng Canh rỗng, dù danh mục có 15 món canh. Deck vẫn
   chạy, vẫn đủ thẻ — đây là lỗi im lặng, cùng lớp với "cắt trần trước khi trộn
   Explore" của `DEC-058`, chỉ ở một tầng cao hơn.
2. Lưu phẳng giữ nguyên bất biến đóng băng của `BR-048`/`DEC-064` và không cần
   migration cho `session_decks`. `SPEC-030` đã chốt một món chỉ thuộc một
   chặng, nên phép nhóm là xác định — suy lại rẻ hơn lưu thêm.
3. Chọn ba chặng nghĩa là tối nay chỉ duyệt ba loại món đó. Nhét món không
   khớp vào cuối là phá chính điều Creator vừa yêu cầu.
4. Guard nằm trong SELECT là toàn bộ cơ chế cách ly của `startDraft`
   (`buildSnapshotStatement` nói rõ). Một câu VALUES ghi cả khi session không
   còn DRAFT — hai người bấm cùng lúc thì cấu hình của người thua đè lên phiên
   của người thắng.

## Consequence

- `list-deck.ts` có đúng một chỗ rẽ nhánh theo `deck_mode`; mọi tầng trên không
  biết chế độ nào đang bật.
- `blendExploitExplore` chạy trong từng chặng, nên tỉ lệ 4+1 của `BR-047` là tỉ
  lệ theo KHỐI chứ không theo deck — đã đúng theo định nghĩa, ghi lại cho rõ.
- `SPEC-030` và Ranking Spec §2.5 phải sửa: cả hai đang mô tả "chia deck đã cắt
  trần", tức đúng cách làm sinh ra chặng rỗng.
```

---

# 11. Master Plan

[§16.4](../../what-we-gonna-eat-today_master-plan_v2.1.md): gắn nhãn `S1` cho `E9-T0`, `E9-T1`, `E9-T3`; thêm `E9-T0` (1h); E9 17h → 18h.
