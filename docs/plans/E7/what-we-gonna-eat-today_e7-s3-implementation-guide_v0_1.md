# 🖐️ Implementation Guide — E7 Slice S3: Hiển thị và hệ quả

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-26`
> - **Upstream:** [Master Plan §16.2](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E7-T5`, `E7-T6`, `E7-T7`) • [SDD §8.1](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-014`, `SPEC-017`, `SPEC-024`, `SPEC-025`) • [Business Rules](../../what-we-gonna-eat-today_business-rules_v1.8.md) (`BR-034`, `BR-037`, `BR-043`, `BR-049`, `BR-056`) • [Design Criteria](../../what-we-gonna-eat-today_design-criteria_v1.0.md) • [Test Cases](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-121`, `TC-122`)
> - **Ảnh tham chiếu:** [Design §3, §4](../../designs/README.md)
> - **Tiền đề:** `E7-S2` xong — API ghi được, deck lọc được, tương tác cũ bị xoá đúng.
>
> 🖐️ *Slice khép E7. Sau slice này người dùng khai được từ giao diện, cột $X$ hiện ở bảng xếp hạng, và lịch sử ăn thôi ghi rằng người ta đã ăn món họ không ăn được.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E7-T5` | Giao diện khai báo | 4 | `src/features/selection/presentation/**`, `src/features/dish/presentation/**` | Bấm được trên thẻ vuốt và ở màn danh mục |
| `E7-T6` | Số hạng $X$ trong Session Ranking | 2.5 | `src/features/selection/**`, `src/features/meal/presentation/**` | Bảng tổng hợp có bốn ô đếm, ô thứ tư là "không ăn được" |
| `E7-T7` | Lịch sử ăn bỏ qua người không ăn được | 1 | `src/features/history/domain/**`, `src/features/meal/application/**` | `TC-122` xanh |

- [ ] Thẻ vuốt có đúng **một** hành động mới: "Tôi không ăn được món này" (§1.1)
- [ ] Like/Dislike **không** xuất hiện trên thẻ vuốt, chỉ ở màn danh mục (§1.1)
- [ ] Undo sau khi gỡ bằng `Cannot Eat` **không** làm điều gì sai (§1.2)
- [ ] Ô đếm thứ tư không truyền tải trạng thái chỉ bằng màu (§1.4)
- [ ] `TC-121`, `TC-122` xanh
- [ ] `MS-01` chạy lại trọn vòng vẫn xanh
- [ ] `yarn verify && yarn arch:probe && yarn test:integration` xanh

---

# 1. Năm phát hiện — đọc trước khi gõ

## 1.1 Thẻ vuốt chỉ mang `Cannot Eat`. Like/Dislike ở màn danh mục

`BR-043` phân định **cài đặt lâu dài** (`Cannot Eat`, `Blacklist`) với **tương tác nhanh trong phiên** (Swipe). Thẻ vuốt hiện có đúng hai hành động, và cả hai đều nói về *hôm nay*: vuốt phải = "đề xuất món này cho bữa nay", vuốt trái = "không phải hôm nay".

Đặt Like/Dislike lên cùng thẻ đó tạo ra bốn hành động, trong đó hai cặp trông giống nhau và có nghĩa khác nhau — người dùng sẽ đọc "vuốt phải" thành "thích món này", tức đúng sự nhầm lẫn mà `BR-043` sinh ra để ngăn. Và hậu quả không dừng ở hiểu nhầm: `Like` tác động **vĩnh viễn** lên mọi phiên sau qua $E$ với trọng số `0.3`, lớn hơn cả `wRecency`.

`Cannot Eat` là **ngoại lệ duy nhất được lên thẻ**, vì lý do thực tế: người ta chỉ nhớ ra mình không ăn được món gì **khi đang nhìn thấy nó**. Bắt họ rời phiên, vào màn danh mục, tìm lại món — là bắt họ không khai.

| Màn | `Cannot Eat` | `Like` / `Dislike` |
| --- | :---: | :---: |
| Thẻ vuốt (S-09) | ✅ | ❌ |
| Danh mục món (S-05) | ✅ | ✅ |

## 1.2 Undo sau `Cannot Eat` — một lỗ hổng tương tác thật

[`handleUndo`](../../../src/features/selection/presentation/components/deck-screen.tsx) hiện làm ba việc: lùi `cursor`, bỏ phần tử cuối của `marks`, và gửi `UNDO` cho `dishes[cursor - 1]`.

Nếu thẻ ngay trước vừa bị gỡ bằng `Cannot Eat`, cả ba việc đều sai:

- Gửi `UNDO` cho một món đã có ràng buộc — server sẽ xoá một dòng `interactions` vốn đã bị xoá, và ghi một event `UNDO` vô nghĩa.
- Lùi `cursor` đưa người dùng quay lại đúng cái thẻ họ vừa nói là không ăn được.
- Ràng buộc **không** được gỡ, vì [DEC-060](../../what-we-gonna-eat-today_decision-log_v3.9.md) đã chốt gỡ đánh dấu không khôi phục tương tác — nên trạng thái sau Undo không khớp với bất kỳ trạng thái nào trước đó.

**Cách xử lý:** `marks` lên ba giá trị `'yes' | 'no' | 'cannot'`, và `handleUndo` **bỏ qua** khi phần tử cuối là `'cannot'` — nút Undo bị vô hiệu hoá cho bước đó, kèm nhãn giải thích. Đây là hành vi trung thực: hành động ấy thật sự không hoàn tác được.

`marks` phải lên ba giá trị chứ không thể bỏ qua, vì nó là thứ giữ cho `yesCount`/`noCount` khớp với `cursor`. Đẩy `'yes'` cho một thẻ bị gỡ sẽ làm số đếm trên màn hình nói dối.

## 1.3 Thẻ trôi đi rồi, việc gửi đi sau — đúng khuôn `handleCommit`

`handleCommit` đã đặt sẵn khuôn: đổi state trước (optimistic), rồi `void sendInteractionWithRetry(...)` fire-and-forget. Việc gỡ bằng `Cannot Eat` dùng **đúng khuôn đó**, không await:

```ts
function handleCannotEat(dish: DishCard) {
  setMarks((m) => [...m, 'cannot'])
  setCursor((c) => c + 1)
  setToast(`Sẽ không hiện lại ${dish.name} với bạn.`)
  void fetch('/api/preferences/constraints', { /* PUT, globalDishId */ }).catch(() => {})
}
```

Chú ý gửi **`dish.globalDishId`**, không phải `dish.dishId`: ràng buộc khoá theo món toàn cục (`BR-034`, S1 §1.3). [`DishCard`](../../../src/features/selection/domain/dish-card.ts) đã mang sẵn cả hai trường.

**Không có nút Hoàn tác trong toast.** Nó sẽ nói dối — gỡ ràng buộc không khôi phục lượt vuốt đã bị xoá (`DEC-060`).

## 1.4 Ô đếm thứ tư đã được chừa chỗ sẵn, và nó có ràng buộc a11y

[`dish-score-row.tsx`](../../../src/features/meal/presentation/components/dish-score-row.tsx) ghi nguyên văn:

> BA ô đếm, không phải bốn: ô "không ăn được" trong mockup là $X$ (F15, v1.1) — một ô luôn hiện 0 vĩnh viễn nói dối người dùng rằng "chưa ai báo không ăn được", trong khi sự thật là chưa hỏi ai bao giờ

`E7-T6` là lúc mở ô đó. **Xoá luôn đoạn comment trên** — để lại sẽ mâu thuẫn với code ngay dưới nó.

Lưới hiện là `grid-cols-2` với ba ô; thêm ô thứ tư lấp đầy đúng hai hàng. Nhưng $X$ khác ba ô kia về ý nghĩa: nó là **cảnh báo**, không phải một số đếm trung tính. `countTone` hiện nhận `'yes' | 'neutral'`.

Ràng buộc từ `E6-T6` (mốc M6): **không thông tin nào chỉ truyền tải bằng màu sắc**. Nên $X > 0$ phải khác biệt cả bằng **chữ** — nhãn "không ăn được" đã tự làm việc đó, miễn là nó không bị ẩn đi khi giá trị bằng 0. Giữ đúng quy ước `E5-T7`: số 0 hiện **mờ** chứ không ẩn.

## 1.5 `E7-T7` sửa hàm ở `history` nhưng chỗ đọc dữ liệu nằm ở `meal`

[`buildDefaultEatingHistory`](../../../src/features/history/domain/default-eating-history.ts) là hàm **thuần** — nó nhận danh sách và trả danh sách. Tham số loại trừ cũng phải đi vào bằng đường tham số, không phải một truy vấn giấu bên trong.

Chỗ gọi nó là [`finalizeSession`](../../../src/features/meal/application/finalize-session.ts), thuộc feature `meal`. Nên chiều phụ thuộc cần thiết là **`meal → preference`** — đã khai ở S1 §1.1.

Đây là chỗ dễ đi nhầm: phản xạ đầu tiên là khai `history → preference` vì "lịch sử ăn thì thuộc history". Nhưng `history/domain` không đọc gì cả; nó chỉ tính.

`finalizeSession` đã có tiền lệ đúng khuôn cho việc này — `deps.rules: RuleRepository`, kèm comment giải thích `meal → rule` nằm sẵn trong `ALLOWED_CROSS_FEATURE` "đúng cho khoảnh khắc này". Thêm `deps.preferences` theo đúng cách đó.

---

# 2. File tree

```text
src/features/selection/presentation/components/
├── deck-screen.tsx                     # marks 3 giá trị, handleCannotEat, toast (§1.2, §1.3)
├── deck-screen.test.tsx                # +ca Undo bị chặn sau 'cannot'
├── dish-swipe-card.tsx                 # +nút "Tôi không ăn được món này"
└── dish-swipe-card.test.tsx

src/features/dish/presentation/components/
├── dish-catalog-screen.tsx             # +Like/Dislike/Cannot Eat mỗi món
└── dish-catalog-screen.test.tsx

src/features/selection/
├── domain/ranking.ts                   # SessionScoreInput.cannotEatCount (E7-T6)
├── domain/ranking.test.ts              # +TC-121
├── application/selection-repository.ts # +đếm X
├── application/list-session-ranking.ts
└── infrastructure/drizzle-selection-repository.ts

src/features/meal/
├── presentation/components/finalize-meal-screen.tsx  # SummaryDish.cannotEatCount
├── presentation/components/dish-score-row.tsx        # ô thứ tư (§1.4)
└── application/finalize-session.ts                   # deps.preferences (§1.5)

src/features/history/domain/default-eating-history.ts # +tập loại trừ (E7-T7)
```

---

# 3. `E7-T5` — Giao diện

## 3.1 Thẻ vuốt

Nút đặt trong `DishSwipeCard`, **nửa dưới thẻ**, vùng chạm ≥ 44px (`NFR-03`). Prop mới:

```ts
onCannotEat: (dish: DishCard) => void
```

Kiểu dáng: nút mờ (`variant="quiet"`), không cạnh tranh thị giác với hai nút vuốt chính — đây là hành động hiếm, không phải hành động chính.

## 3.2 `DeckScreen`

Theo §1.2 và §1.3: `marks` lên `Array<'yes' | 'no' | 'cannot'>`, thêm `handleCannotEat`, thêm state `toast`, và `handleUndo` chặn khi phần tử cuối là `'cannot'`.

Toast dùng lại khuôn `role="status"` đã có sẵn trong [`dish-catalog-screen.tsx`](../../../src/features/dish/presentation/components/dish-catalog-screen.tsx) — một `<div role="status">` suy ra từ state, đặt ở dải dưới cùng. **Không dựng hệ thống toast toàn cục**; hai màn hình dùng cùng một khuôn là đủ, và một provider toàn cục sẽ là hạ tầng cho một nhu cầu chưa tồn tại.

### Test — `deck-screen.test.tsx`

| Ca | Khẳng định |
| --- | --- |
| Bấm "không ăn được" | `cursor` tiến 1, thẻ kế tiếp hiện ra, toast mang tên món |
| Bấm "không ăn được" rồi bấm Undo | Undo **không** gọi `fetch`, `cursor` **không** lùi |
| Bấm "không ăn được" | `yesCount` và `noCount` **không** đổi |

Ca thứ ba canh đúng lý do `marks` phải lên ba giá trị (§1.2).

## 3.3 Màn danh mục món

Mỗi món có ba trạng thái độc lập: `Like`/`Dislike` (loại trừ nhau, `null` = chưa đặt) và `Cannot Eat` (bật/tắt).

`DishCatalogScreen` đã là client component giữ nhiều state, nên thêm vào đó là đúng chỗ. Gửi qua cùng hai Route Handler của S2.

**Trạng thái phải đọc được không cần màu** (`E6-T6`): dùng `aria-pressed` trên nút và nhãn chữ, không chỉ tô nền. Khuôn `aria-pressed` đã có sẵn ở [`dish-score-row.tsx`](../../../src/features/meal/presentation/components/dish-score-row.tsx).

---

# 4. `E7-T6` — Số hạng $X$

## 4.1 Domain

```ts
export type SessionScoreInput = {
  readonly proposedCount: number
  readonly rejectedCount: number
  /** $X$ — SỐ NGƯỜI trong phiên đã khai `Cannot Eat` món này (BR-034). */
  readonly cannotEatCount: number
  readonly recentEaterCount: number
}
```

`computeSessionScore` trừ thêm `cCannotEat * X` — trọng số `1.0` **đã nằm sẵn** trong [`RANKING_CONFIG`](../../../src/features/selection/domain/ranking-config.ts) từ E4. Xoá luôn đoạn comment giải thích vì sao $X$ vắng mặt, cùng lý do §1.4.

$$\text{Score} = \frac{1.0 \cdot P - 0.7 \cdot N - 1.0 \cdot X - 0.3 \cdot H}{T}$$

**`untouched` vẫn chỉ xét $P$ và $N$.** Một món chưa ai vuốt nhưng có người khai không ăn được vẫn là "chưa ai tương tác" — cùng lý lẽ đã áp cho $H$ ở `TC-061`. Cho nó một điểm âm rồi xếp cuối bảng `ranked` là nói với cả nhà rằng "mọi người không thích món này", trong khi sự thật là chưa ai vuốt.

### Test — `TC-121`

Món có $X = 2$, $T = 4$, $P = 2$, $N = 0$, $H = 0$ → $\text{Score} = (2 - 2) / 4 = 0$.

## 4.2 Port và truy vấn

Thêm phép đếm cạnh `countInteractionsByDish`. Đếm **số người trong phiên** đã khai, không phải tổng số dòng ràng buộc — cùng khuôn `countRecentEatersByDish` của `HistoryRepository`:

```ts
/** $X$ của SPEC-014 — với mỗi món, ĐẾM SỐ NGƯỜI trong phiên đã khai Cannot
 *  Eat. Món không ai khai KHÔNG có mặt trong Map; người gọi dùng `?? 0`. */
countCannotEatByDish(sessionId: string): Promise<Map<string, number>>
```

Một câu `COUNT(*) … GROUP BY global_dish_id` join `participants` — **không** gọi `findConstrainedGlobalDishIds` N lần cho N người. Lý lẽ đã ghi sẵn ở `countRecentEatersByDish`.

## 4.3 Presentation

`SummaryDish` thêm `cannotEatCount: number`; `dish-score-row.tsx` thêm ô thứ tư theo §1.4:

```tsx
<Count value={dish.cannotEatCount} label="không ăn được" tone="neutral" />
```

---

# 5. `E7-T7` — Lịch sử ăn

## 5.1 Domain

```ts
export function buildDefaultEatingHistory(input: {
  readonly participantUserIds: readonly string[]
  readonly globalDishIds: readonly string[]
  readonly decisionDate: string
  readonly finalMealId: string
  /**
   * BR-056 ngoại lệ (DEC-060). Khoá `${userId}:${globalDishId}` — cặp, không
   * phải một trong hai: người B không ăn được cá vẫn được ghi là đã ăn canh
   * trong cùng bữa đó.
   */
  readonly cannotEatPairs: ReadonlySet<string>
}): DefaultEatingHistoryRow[]
```

Trong hai vòng lặp, bỏ qua khi `input.cannotEatPairs.has(`${userId}:${globalDishId}`)`.

Sửa cả đoạn comment đầu file — nó đang ghi *"Ở v1.0 KHÔNG có ngoại lệ `Cannot Eat` (F15 chưa có)"*.

## 5.2 `finalizeSession`

Thêm `preferences: PreferenceRepository` vào `FinalizeSessionDeps` (§1.5), đọc ở **bước 7** cùng chỗ với `listActiveParticipantUserIds` — tức trước `commitFinalize`, đúng nguyên tắc *"đọc trước, ghi nguyên tử sau"* mà bước 7 đã ghi sẵn.

Dựng `cannotEatPairs` từ tập ràng buộc của từng participant. `findConstrainedGlobalDishIds(userId)` hỏi một người mỗi lần; với một nhóm gia đình đây là 3–5 lần đọc và chấp nhận được, nhưng **gói trong `Promise.all`** chứ không tuần tự — chốt bữa là thao tác người dùng đang đứng chờ.

### Test — `TC-122` (tầng `I`)

1. Phiên có hai người; người B đã khai `Cannot Eat` món X.
2. Chốt bữa gồm món X và món Y.
3. Khẳng định: `eating_history` có `(A, X)`, `(A, Y)`, `(B, Y)` — và **không** có `(B, X)`.

Điểm cần khẳng định rõ là dòng `(B, Y)` **vẫn phải tồn tại**: ngoại lệ áp cho một **cặp**, không loại người B khỏi cả bữa.

---

# 6. Rủi ro

| Rủi ro | Dấu hiệu | Xử lý |
| --- | --- | --- |
| Like/Dislike lọt lên thẻ vuốt | Thẻ có 4 hành động | §1.1 — `BR-043` |
| Undo sau `Cannot Eat` | Thẻ vừa gỡ quay trở lại | §1.2 — chặn Undo khi mark cuối là `'cannot'` |
| Gửi `dishId` thay `globalDishId` | Ràng buộc không có tác dụng ở phiên sau | §1.3 — `BR-034` khoá theo món toàn cục |
| Món $X > 0$ rơi khỏi `untouched` | Món chưa ai vuốt bị xếp cuối `ranked` với điểm âm | §4.1 — `untouched` chỉ xét $P$, $N$ |
| Ngoại lệ `BR-056` loại người khỏi cả bữa | `TC-122` thiếu dòng `(B, Y)` | §5.1 — khoá là **cặp** |
| Khai `history → preference` | ESLint xanh nhưng chiều thật sự cần vẫn bị chặn | §1.5 — chiều đúng là `meal → preference` |
| Ô đếm thứ tư chỉ khác bằng màu | Vi phạm ràng buộc `E6-T6` | §1.4 |

---

# 7. Test Cases coverage

`TC-121` §4.1 • `TC-122` §5.2 • ba ca giao diện §3.2 (không có mã `TC`, thuộc kiểm thử component như `deck-screen.test.tsx` hiện có).

---

# 8. Thứ tự TDD

1. `E7-T7` trước — nhỏ nhất, thuần nhất, và là lý do E7 tồn tại. `TC-122` đỏ → sửa domain + `finalizeSession` → xanh.
2. `E7-T6`: `TC-121` đỏ → `SessionScoreInput` + `computeSessionScore` → xanh → port + truy vấn → presentation.
3. `E7-T5`: test `deck-screen.test.tsx` ba ca (đỏ) → `marks` ba giá trị + `handleCannotEat` + chặn Undo → xanh → nút trên thẻ → màn danh mục.
4. `MS-01` chạy tay trọn vòng.
5. `yarn verify && yarn arch:probe && yarn test:integration`.

Đặt `E7-T7` trước có chủ đích: nó là subtask vá rủi ro `R-05`, và nếu hết thời gian giữa chừng thì thứ đã xong phải là thứ đó chứ không phải một cái nút.

---

# 9. Verify

## 9.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn test:integration
```

## 9.2 Bằng chứng đi trọn vòng — DoD chính của E7

Trên máy thật, hai tài khoản:

1. A và B cùng vào phiên, cùng vuốt phải món "Cá basa kho tiêu".
2. B bấm **"Tôi không ăn được món này"** trên chính thẻ đó → thẻ trôi đi, toast hiện tên món.
3. A mở bảng tổng hợp: món đó hiện **1 đề xuất · 1 không ăn được** — không phải 2 đề xuất.
4. A chốt bữa gồm món đó và một món khác.
5. Mở lịch sử ăn của B: **chỉ có món kia**, không có "Cá basa kho tiêu".
6. Hôm sau mở phiên mới: món đó **không** xuất hiện trong deck của B, vẫn xuất hiện trong deck của A.

Bước 3 và bước 5 là hai bằng chứng không thể suy ra từ test đơn lẻ — chúng chứng minh $X$ và ngoại lệ `BR-056` nối đúng nhau.

## 9.3 Bằng chứng Undo trung thực

Bấm "không ăn được" rồi bấm Undo: nút không phản hồi, và có nhãn nói vì sao. Không có trạng thái nào quay lại.

---

# 10. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v3.9.md`

```markdown
# DEC-062 — Thẻ Vuốt Chỉ Mang `Cannot Eat`; Like/Dislike Sống Ở Màn Danh Mục

- **Ngày:** 2026-08-26
- **Trạng thái:** Accepted
- **Bối cảnh:** E7 Slice S3

## Quyết định

1. Thẻ vuốt (S-09) có đúng MỘT hành động bền vững: "Tôi không ăn được món này".
2. `Like` / `Dislike` chỉ đặt được ở màn danh mục món (S-05).
3. Gỡ thẻ bằng `Cannot Eat` không hoàn tác được; nút Undo bị chặn cho bước đó.

## Rationale

1. `BR-043` phân định cài đặt lâu dài với tương tác nhanh trong phiên. Thẻ vuốt
   hiện có hai hành động và cả hai đều nói về HÔM NAY. Thêm Like/Dislike thành
   bốn hành động, trong đó hai cặp trông giống nhau và có nghĩa khác nhau —
   người dùng sẽ đọc "vuốt phải" thành "thích món này". Hậu quả không dừng ở
   hiểu nhầm: `Like` tác động vĩnh viễn lên mọi phiên sau qua $E$ với trọng số
   `0.3`, lớn hơn cả `wRecency`.
2. `Cannot Eat` là ngoại lệ vì lý do thực tế: người ta chỉ nhớ ra mình không ăn
   được món gì KHI ĐANG NHÌN THẤY NÓ. Bắt họ rời phiên đi tìm lại món là bắt họ
   không khai — và không khai chính là rủi ro `R-05`.
3. Undo bị chặn thay vì "hoàn tác được": `DEC-060` đã chốt gỡ ràng buộc không
   khôi phục lượt vuốt đã xoá. Một nút Undo hiện lên rồi đưa về một trạng thái
   khác trạng thái trước đó là nói dối; chặn nó là trung thực.

## Consequence

- `marks` của `DeckScreen` lên ba giá trị `'yes' | 'no' | 'cannot'` — cần thiết
  để `yesCount`/`noCount` không đếm nhầm thẻ bị gỡ.
- Toast không có nút Hoàn tác.
- `F31` Blacklist (v1.2) khi vào sẽ đi theo đúng khuôn này: màn danh mục, không
  lên thẻ vuốt.
```

---

# 11. Master Plan

[§16.2](../../what-we-gonna-eat-today_master-plan_v2.1.md): gắn nhãn `S3` cho `E7-T5`, `E7-T6`, `E7-T7`; ghi thứ tự thi công `T7 → T6 → T5` (§8).
