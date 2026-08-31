# 🔌 Implementation Guide — E7 Slice S2: Luồng dữ liệu ràng buộc

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-26`
> - **Upstream:** [Master Plan §16.2](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E7-T4`, `E7-T3`) • [SDD §8.1](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-024`, `SPEC-025`) • [Business Rules](../../what-we-gonna-eat-today_business-rules_v1.7.md) (`BR-034`, `BR-037`) • [Decision Log](../../what-we-gonna-eat-today_decision-log_v3.9.md) (`DEC-015`, `DEC-025`, `DEC-055`, `DEC-060`) • [Test Cases](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-113`→`TC-117`, `TC-120`)
> - **Tiền đề:** `E7-S1` xong — hai bảng chạy được, `explicitPreferenceScore` đã nối vào `computePersonalScore`, ESLint cho phép 7 chiều.
>
> 🔌 *Slice nối dây. Sau slice này ràng buộc và sở thích ghi được qua API, món `Cannot Eat` biến khỏi deck, và tương tác cũ của nó bị xoá — nhưng vẫn chưa có nút nào trên màn hình bấm được (S3 mới có).*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E7-T4` | Use case + Route Handler | 3 | `src/features/preference/**`, `src/app/api/preferences/**` | `curl` khai được ràng buộc/sở thích cho chính mình |
| `E7-T3` | Lọc deck + xoá tương tác cũ | 3 | `src/features/selection/**` | Món `Cannot Eat` không vào deck; tương tác cũ của nó biến mất khỏi $P$/$N$ |

- [ ] `TC-113`→`TC-116`, `TC-120` xanh; `TC-117` đã sửa theo §1.4 và xanh
- [ ] `TC-114` (ca then chốt) xanh: `SWIPE_RIGHT` rồi `Cannot Eat` → $P$ giảm đúng 1
- [ ] `listEligibleDishCards` nhận `userId` và lọc `NOT EXISTS` (§1.1)
- [ ] Ghi ràng buộc + xoá tương tác + ghi audit nằm trong **một** `db.batch()` (§1.3)
- [ ] `yarn verify && yarn arch:probe && yarn test:integration` xanh

---

# 1. Năm phát hiện — đọc trước khi gõ

## 1.1 `listEligibleDishCards` không có `userId` — phải đổi chữ ký

[Port hiện tại](../../../src/features/selection/application/selection-repository.ts):

```ts
listEligibleDishCards(sessionId: string, participantId: string): Promise<DishCard[]>
```

Ràng buộc `Cannot Eat` khoá theo `user_id`. Hai đường đi:

| Cách | Đánh giá |
| --- | --- |
| JOIN thêm `participants` trong SQL để suy ra `user_id` | Giữ nguyên chữ ký, nhưng giấu một phép tra cứu mà người gọi vốn không cần |
| **Đổi thành `(sessionId, participantId, userId)`** | ✅ Chọn cách này |

`list-deck.ts` **đã có sẵn** `input.userId` — nó truyền `userId` cho `history.findEatingDates` ngay phía trên. Và tiền lệ [`findEatingDates(userId, globalDishIds)`](../../../src/features/history/application/history-repository.ts) cho thấy codebase này truyền `userId` tường minh qua port chứ không suy ra trong SQL.

Mệnh đề thêm vào truy vấn:

```ts
.where(
  and(
    eq(selectionSessions.id, sessionId),
    eq(groupDishes.state, 'ACTIVE'),
    // BR-034 — Stage 1 Hard Filter. Lọc ở SQL chứ không ở tầng trên: LIMIT
    // và phân trang chạy SAU phép lọc, cùng lý lẽ DEC-055 mục 3.
    notExists(
      getDb()
        .select({ one: sql`1` })
        .from(userDishConstraints)
        .where(
          and(
            eq(userDishConstraints.userId, userId),
            eq(userDishConstraints.globalDishId, globalDishes.id),
          ),
        ),
    ),
  ),
)
```

## 1.2 Deck được tải trọn về client — lọc ở SQL KHÔNG đủ

[`sessions/[sessionId]/page.tsx`](../../../src/app/sessions/[sessionId]/page.tsx) gọi `listDeck` với `WHOLE_DECK_PAGE_SIZE = 500` rồi giao **cả mảng** cho `DeckScreen`, một client component giữ `cursor` trong `useState`.

Nghĩa là: sau khi trang đã tải, phép lọc `NOT EXISTS` **không còn chạm tới được deck đang trên tay người dùng**. Nó chỉ có tác dụng ở lần tải trang sau.

**Đừng viết `E7-T3` theo giả định "lọc ở SQL là xong".** Đúng cho phiên mới, sai cho phiên đang chạy. Việc gỡ thẻ khỏi mảng đang hiển thị thuộc S3 (`E7-T5`) và dùng đúng cơ chế của một lượt vuốt: thẻ trôi đi, `cursor` tiến một bước.

Ranh giới giữa hai slice, ghi rõ để không ai làm trùng:

| Việc | Slice |
| --- | :---: |
| SQL không trả món `Cannot Eat` ở lần dựng deck sau | S2 |
| Xoá dòng `interactions` cũ khi bật ràng buộc | S2 |
| Thẻ trôi khỏi màn hình ngay lúc bấm | S3 |

## 1.3 Nhánh `UNDO` đã làm sẵn hai phần ba việc mà `E7-T3` cần

[`applyInteraction`](../../../src/features/selection/infrastructure/drizzle-selection-repository.ts) ở nhánh `UNDO` chạy một `db.batch()` gồm đúng hai lệnh:

```ts
db.delete(interactions).where(and(/* session, participant, groupDish */)),
db.insert(interactionEvents).values({ /* …, action: 'UNDO' */ }),
```

`E7-T3` cần **đúng bộ đôi đó** cộng thêm `INSERT user_dish_constraints`, trong **một** batch. `db.batch()` của `neon-http` là giao dịch thật ([DEC-015](../../what-we-gonna-eat-today_decision-log_v3.9.md)) — không viết cơ chế xoá mới, mở rộng cái đã có.

**Nhưng có một phép tra cứu phải làm trước.** Ràng buộc khoá theo `(userId, globalDishId)`; `interactions` khoá theo `(sessionId, participantId, groupDishId)`. Không có đường nối trực tiếp. Theo đúng nguyên tắc *"đọc trước, ghi nguyên tử sau"* đã ghi ở [`finalizeSession`](../../../src/features/meal/application/finalize-session.ts) bước 7, đọc trước rồi mới batch:

```ts
/**
 * Tìm lượt vuốt đang sống của user này với món này, nếu có. `null` khi user
 * không ở trong phiên ACTIVE nào, hoặc nhóm không có món này, hoặc có mà
 * chưa vuốt — cả ba đều là trạng thái bình thường, không phải lỗi.
 */
findActiveSwipeForGlobalDish(input: {
  userId: string
  globalDishId: string
}): Promise<{ sessionId: string; participantId: string; groupDishId: string } | null>
```

Truy vấn: `participants` ⋈ `selection_sessions` (state `ACTIVE`, participant state ≠ `REMOVED`) ⋈ `group_dishes` (cùng `groupId`, `globalDishId` khớp) ⋈ `interactions`. Ở v1.0 một User thuộc đúng một Group ([DEC-004](../../what-we-gonna-eat-today_decision-log_v3.9.md)) và một Group có tối đa một phiên `ACTIVE` mỗi ngày (`BR-025`), nên kết quả tối đa một dòng. **Ghi chú điều đó ngay trong hàm** — khi `F43` multi-group vào, hàm này phải trả mảng.

## 1.4 `TC-117` đang đặc tả một API không nên tồn tại

`TC-117` (viết lúc lập kế hoạch v1.1) ghi: *"Đặt ràng buộc thay cho người khác → `ERR_FORBIDDEN`"*. Hai vấn đề:

1. `ERR_FORBIDDEN` **không có** trong [`ErrorCode`](../../../src/shared/errors/index.ts).
2. Quan trọng hơn — hành vi đó **không biểu diễn được**. Route Handler lấy `userId` từ phiên đăng nhập qua [`requireApiUser`](../../../src/app/api/api-auth.ts), đúng khuôn [`interactions/route.ts`](../../../src/app/api/sessions/[id]/interactions/route.ts). Payload không mang `userId`, nên không có đường nào để đặt ràng buộc cho người khác. Nó bị chặn bằng **cấu trúc**, không bằng một phép kiểm lúc chạy.

**Không thêm `ERR_FORBIDDEN`** — một mã lỗi không có đường nào chạm tới là mã chết, và [`messages.ts`](../../../src/shared/errors/messages.ts) sẽ phải nuôi một câu tiếng Việt không ai đọc được.

`TC-117` **đã được sửa** trong [Test Cases](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) cùng lúc với guide này — không phải việc còn tồn:

> | `TC-117` | `SPEC-024` | Biên | `A` | Payload kèm trường `userId` của người khác | Trường bị **bỏ qua**; ràng buộc ghi cho người đang đăng nhập |

Đây là ca kiểm thử có ích thật: nó khẳng định route **không** đọc `userId` từ body, và sẽ đỏ nếu về sau có người "tiện tay" thêm vào.

## 1.5 Ghi audit cho việc gỡ tương tác: đừng nói dối bằng `UNDO`

`interaction_events.action` là enum ba giá trị `SWIPE_RIGHT | SWIPE_LEFT | UNDO`. Khi `Cannot Eat` xoá một lượt vuốt, ghi `UNDO` vào audit log là sai sự thật — không ai bấm hoàn tác cả, và [DEC-025](../../what-we-gonna-eat-today_decision-log_v3.9.md) đặt bảng này ra chính là để biết **cái gì đã xảy ra**.

Thêm giá trị `'CANNOT_EAT'` vào `interactionAction` pgEnum (một migration nhỏ, `0012_*.sql`), **nhưng tách kiểu ở tầng domain**:

```ts
// selection/domain/interaction.ts
/** Ba giá trị người dùng gửi lên được qua SPEC-012. */
export type InteractionAction = 'SWIPE_RIGHT' | 'SWIPE_LEFT' | 'UNDO'

/**
 * Những gì có thể xuất hiện trong `interaction_events.action`. RỘNG HƠN
 * `InteractionAction`: `CANNOT_EAT` do hệ thống ghi khi BR-034 xoá một lượt
 * vuốt, KHÔNG phải một hành động client gửi lên được.
 */
export type InteractionEventAction = InteractionAction | 'CANNOT_EAT'
```

`VALID_ACTIONS` trong [`interactions/route.ts`](../../../src/app/api/sessions/[id]/interactions/route.ts) **giữ nguyên ba giá trị** và vẫn kiểu theo `InteractionAction` — nới enum ở CSDL không được phép nới ô cửa nhận dữ liệu từ ngoài vào.

---

# 2. File tree

```text
src/features/preference/
├── application/
│   ├── preference-repository.ts                  # mở rộng port từ S1
│   ├── set-dish-constraint.ts                    # MỚI — E7-T4
│   ├── set-dish-constraint.test.ts
│   ├── set-dish-preference.ts                    # MỚI — E7-T4
│   └── set-dish-preference.test.ts
└── infrastructure/
    ├── drizzle-preference-repository.ts          # MỚI
    └── drizzle-preference-repository.integration.test.ts

src/app/api/preferences/
├── constraints/route.ts                          # MỚI — PUT
└── preferences/route.ts                          # MỚI — PUT

src/features/selection/
├── application/selection-repository.ts           # đổi chữ ký (§1.1)
├── application/list-deck.ts                      # truyền userId + explicit thật
└── infrastructure/drizzle-selection-repository.ts # NOT EXISTS (§1.1)

src/features/selection/domain/interaction.ts      # +InteractionEventAction (§1.5)
src/shared/db/schema.ts                           # +'CANNOT_EAT' vào interactionAction
src/shared/db/migrations/0012_cannot_eat_event.sql # MỚI
```

---

# 3. `E7-T4` — Port, use case, Route Handler

## 3.1 Port

```ts
export interface PreferenceRepository {
  /** BR-034. Bật/tắt ràng buộc. Trả `true` nếu có một lượt vuốt bị xoá kèm
   *  theo — người gọi cần biết để quyết định thông điệp (S3). */
  setConstraint(input: {
    userId: string
    globalDishId: string
    cannotEat: boolean
  }): Promise<{ removedInteraction: boolean }>

  /** BR-037. `kind: null` = xoá dòng, KHÔNG ghi 'NEUTRAL' (S1 §1.2, TC-120). */
  setPreference(input: {
    userId: string
    globalDishId: string
    kind: PreferenceKind | null
  }): Promise<void>

  /** SPEC-024 — tập món user không ăn được, để `list-deck` và `finalizeSession`
   *  dùng. Trả `Set` chứ không mảng: cả hai người gọi đều chỉ hỏi "có hay không". */
  findConstrainedGlobalDishIds(userId: string): Promise<ReadonlySet<string>>

  /** SPEC-025 — $E$ theo món, cho Stage 2. Món không có dòng KHÔNG có mặt
   *  trong Map; người gọi dùng `?? null`. Cùng khuôn `countRecentEatersByDish`. */
  findPreferencesByGlobalDish(
    userId: string,
    globalDishIds: readonly string[],
  ): Promise<Map<string, PreferenceKind>>
}
```

## 3.2 Use case

Cả hai mỏng — không có luật nghiệp vụ nào ngoài validate, vì quyền sở hữu đã được cấu trúc đảm bảo (§1.4). Giữ chúng mỏng chứ đừng bỏ hẳn: chúng là chỗ `tsc` ép Route Handler gọi đúng kiểu, và là chỗ test tầng `A` bám vào.

```ts
export async function setDishConstraint(
  deps: { readonly preferences: PreferenceRepository },
  input: { readonly userId: string; readonly globalDishId: string; readonly cannotEat: boolean },
): Promise<Result<{ removedInteraction: boolean }, Failure>>
```

Validate `globalDishId` là chuỗi không rỗng → `ERR_VALIDATION`. Không kiểm món có tồn tại: khoá ngoại đã làm việc đó, và một `SELECT` thêm chỉ mở ra một cửa sổ race.

## 3.3 Route Handler

`PUT` chứ không `POST` — đặt trạng thái, không tạo tài nguyên; gọi hai lần cùng payload cho cùng kết quả.

```ts
// src/app/api/preferences/constraints/route.ts
export async function PUT(request: Request) {
  const auth = await requireApiUser()
  if (!auth.ok) return auth.response
  // … đọc body, validate, gọi use case, map lỗi qua httpStatusForErrorCode
}
```

**Route Handler chứ không Server Action**, cùng lý lẽ [DEC-055](../../what-we-gonna-eat-today_decision-log_v3.9.md) mục 1 và Tech Spec §4.1: React serialise các Server Action liên tiếp, mà hành động này bắn ra ngay giữa nhịp vuốt.

Dùng [`requireApiUser`](../../../src/app/api/api-auth.ts), **không** lặp lại khối `getCurrentUser` + `Response.json` như `interactions/route.ts` đang làm — `requireApiUser` sinh ra sau nó chính là để thay khối đó, và `jscpd` sẽ báo trùng nếu chép lại.

### Test — `TC-117` (§1.4)

Gửi body `{ globalDishId: 'X', cannotEat: true, userId: '<id người khác>' }`, khẳng định ràng buộc được ghi cho **người đăng nhập**.

---

# 4. `E7-T3` — Lọc deck và xoá tương tác

## 4.1 Lọc (`SPEC-024` Stage 1)

Đổi chữ ký port theo §1.1, thêm `notExists` vào truy vấn, `list-deck.ts` truyền `input.userId` xuống.

## 4.2 Số hạng $E$ có nguồn dữ liệu thật

S1 để `list-deck.ts` truyền `explicit: 0`. Giờ thay bằng dữ liệu thật:

```ts
const preferences = await deps.preferences.findPreferencesByGlobalDish(
  input.userId,
  eligible.map((d) => d.globalDishId),
)
// …trong rankingInputs:
explicit: explicitPreferenceScore(preferences.get(dish.globalDishId) ?? null),
```

Đọc **cùng lúc** với `history.findEatingDates` bằng `Promise.all` — hai lần đi mạng tuần tự trên đường dựng deck là thứ `NFR-01` (≤2.5s) không có chỗ chứa.

> [!CAUTION]
> Deck được **materialize một lần** vào `session_decks` (`SPEC-028`). Nghĩa là $E$ chỉ tác động tới thứ tự ở **lần dựng đầu tiên** của phiên; đổi Like/Dislike giữa phiên không sắp lại deck. Đó là hành vi đúng theo `BR-048` (Deck Stability), không phải thiếu sót — nhưng phải ghi vào comment tại chỗ, vì nó sẽ trông như một lỗi với người đọc sau.

## 4.3 Xoá tương tác cũ (`TC-114` — ca then chốt)

Trong `drizzle-preference-repository.setConstraint`, khi `cannotEat === true`:

```ts
const swipe = await findActiveSwipeForGlobalDish({ userId, globalDishId })  // §1.3

const statements = [
  db.insert(userDishConstraints)
    .values({ userId, globalDishId })
    .onConflictDoNothing(),
]

if (swipe !== null) {
  statements.push(
    db.delete(interactions).where(and(
      eq(interactions.sessionId, swipe.sessionId),
      eq(interactions.participantId, swipe.participantId),
      eq(interactions.groupDishId, swipe.groupDishId),
    )),
    db.insert(interactionEvents).values({
      id: uuidv7(),
      sessionId: swipe.sessionId,
      participantId: swipe.participantId,
      groupDishId: swipe.groupDishId,
      action: 'CANNOT_EAT',   // §1.5 — KHÔNG phải 'UNDO'
    }),
  )
}

await db.batch(statements)
return { removedInteraction: swipe !== null }
```

`onConflictDoNothing` chứ không `onConflictDoUpdate`: bật lại một ràng buộc đã bật là thao tác không làm gì cả, và không được phép làm mới `created_at`.

**`TC-114` là ca đáng viết nhất của cả slice** (tầng `I`, integration):

1. Tạo phiên `ACTIVE`, hai người tham gia, cùng `SWIPE_RIGHT` món X → $P = 2$.
2. Người thứ nhất đánh dấu `Cannot Eat` món X.
3. Khẳng định `countInteractionsByDish` trả $P = 1$ cho món X.

Vì sao nó then chốt: giữ lại lượt vuốt cũ khiến $+1.0$ của $P$ và $-1.0$ của $X$ (S3) triệt tiêu nhau. Cả nhà nhìn thấy một món trung tính, trong khi sự thật là có người không ăn được. Không ca nào ở tầng trên bắt được — điểm số vẫn là một con số hợp lệ.

## 4.4 Gỡ ràng buộc không khôi phục gì (`TC-115`)

Khi `cannotEat === false`: chỉ `DELETE FROM user_dish_constraints`. Không đụng `interactions`, không ghi `interaction_events`.

[DEC-060](../../what-we-gonna-eat-today_decision-log_v3.9.md) đã chốt điều này. Lý do nằm ở chỗ dữ liệu: lượt vuốt cũ đã bị xoá hẳn, `interaction_events` giữ được *đã từng có một lượt vuốt* nhưng phục hồi nó nghĩa là suy ra trạng thái từ audit log — và audit log là bản ghi những gì đã xảy ra, không phải nguồn để dựng lại trạng thái.

---

# 5. Rủi ro

| Rủi ro | Dấu hiệu | Xử lý |
| --- | --- | --- |
| Lọc ở tầng `application` thay vì SQL | `list-deck.ts` có `.filter(...)` trên `eligible` | §1.1 — lọc phải ở SQL, cùng lý lẽ `DEC-055` mục 3 |
| Ghi `'UNDO'` cho việc gỡ do `Cannot Eat` | Audit log không phân biệt được hai nguyên nhân | §1.5 — thêm `'CANNOT_EAT'` vào enum CSDL, giữ `VALID_ACTIONS` ba giá trị |
| Thêm `ERR_FORBIDDEN` | Mã lỗi không đường nào chạm tới, `messages.ts` phải nuôi một câu chết | §1.4 |
| Hai lần đi mạng tuần tự khi dựng deck | `NFR-01` trượt ngưỡng 2.5s | §4.2 — `Promise.all` |
| Chép khối auth từ `interactions/route.ts` | `yarn dup` (jscpd) đỏ | §3.3 — dùng `requireApiUser` |
| Làm luôn phần gỡ thẻ khỏi màn hình | Trùng việc với `E7-T5` | §1.2 — bảng ranh giới slice |

---

# 6. Test Cases coverage

`TC-113` §4.1 • `TC-114` §4.3 • `TC-115` §4.4 • `TC-116` §4.1 (cùng món hai Group) • `TC-117` §3.3 (đã sửa) • `TC-120` §3.1.

---

# 7. Thứ tự TDD

1. `interaction.ts` + `schema.ts` enum + migration `0012` (§1.5).
2. Port mở rộng → `set-dish-constraint.test.ts` / `set-dish-preference.test.ts` (đỏ, mock port) → use case (xanh).
3. `drizzle-preference-repository.integration.test.ts` gồm `TC-114`, `TC-115`, `TC-120` (đỏ) → infrastructure (xanh).
4. Đổi chữ ký `listEligibleDishCards` → `tsc` chỉ ra mọi chỗ gọi → sửa → `NOT EXISTS` → `TC-113`, `TC-116` xanh.
5. `list-deck.ts` đọc $E$ thật (§4.2).
6. Route Handler + `TC-117`.
7. `yarn verify && yarn arch:probe && yarn test:integration`.

Bước 4 dùng `tsc` như một danh sách việc: đổi chữ ký trước, để trình biên dịch liệt kê chỗ phải sửa thay vì tự đi tìm.

---

# 8. Verify

## 8.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn test:integration
```

## 8.2 Bằng chứng bằng tay

Chưa có giao diện, nên dùng `curl` với cookie phiên thật:

```bash
curl -X PUT localhost:3000/api/preferences/constraints -H 'Content-Type: application/json' -b "$COOKIE" -d '{"globalDishId":"<id>","cannotEat":true}'
```

Rồi tải lại `/sessions/<id>`: món đó **không** còn trong deck. Mở `yarn db:studio` xác nhận dòng `interactions` cũ đã biến mất và `interaction_events` có một dòng `CANNOT_EAT`.

---

# 9. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v3.9.md`

```markdown
# DEC-063 — Audit Log Ghi `CANNOT_EAT`, Và Enum CSDL Rộng Hơn Ô Cửa Nhận Dữ Liệu

- **Ngày:** 2026-08-26
- **Trạng thái:** Accepted
- **Bối cảnh:** E7 Slice S2

## Quyết định

1. `interaction_events.action` thêm giá trị `'CANNOT_EAT'`.
2. Domain tách hai kiểu: `InteractionAction` (ba giá trị, client gửi lên được)
   và `InteractionEventAction` (bốn giá trị, những gì có thể nằm trong bảng).
3. `VALID_ACTIONS` của Route Handler `SPEC-012` giữ nguyên ba giá trị.

## Rationale

1. Ghi `'UNDO'` cho một lượt vuốt bị xoá do `BR-034` là sai sự thật — không ai
   bấm hoàn tác. `DEC-025` đặt bảng này ra để biết cái gì đã xảy ra; một audit
   log nói dối tệ hơn không có audit log.
2. **Nới enum ở CSDL không được phép nới ô cửa nhận dữ liệu từ ngoài.** Nếu
   dùng chung một kiểu, `VALID_ACTIONS` sẽ tự động chấp nhận `CANNOT_EAT` từ
   client — cho phép bỏ qua toàn bộ đường `setConstraint` và xoá một lượt vuốt
   mà không ghi ràng buộc nào. Hai kiểu là hàng rào giữa hai việc khác nhau.

## Consequence

- Migration `0012_cannot_eat_event.sql` chỉ thêm giá trị enum, không đụng dữ liệu.
- `TC-117` đổi nghĩa: từ "chặn đặt hộ người khác" thành "bỏ qua `userId` trong
  body" — hành vi cũ không biểu diễn được vì `userId` lấy từ phiên đăng nhập.
- Không thêm `ERR_FORBIDDEN` vào `ErrorCode`.
```

---

# 10. Master Plan

[§16.2](../../what-we-gonna-eat-today_master-plan_v2.1.md): gắn nhãn `S2` cho `E7-T4`, `E7-T3`; ghi rõ thứ tự `T4` trước `T3`.
