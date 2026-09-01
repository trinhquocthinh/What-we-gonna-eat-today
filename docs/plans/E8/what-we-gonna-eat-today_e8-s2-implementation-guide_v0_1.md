# 🧭 Implementation Guide — E8 Slice S2: Nhịp vuốt và chỗ dừng

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-26`
> - **Upstream:** [Master Plan §16.3](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E8-T3`, `E8-T5`, `E8-T7`, `E8-T6`) • [SDD §8.2](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-027`, `SPEC-036`) • [Business Rules](../../what-we-gonna-eat-today_business-rules_v1.8.md) (`BR-047`, `BR-062` — `S1` bump lên `v1.8` khi sửa `BR-048`) • [Design Criteria](../../what-we-gonna-eat-today_design-criteria_v1.0.md) • [Test Cases](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-145`, `TC-146`) • `NFR-01`, `NFR-02`, `NFR-03`
> - **Tiền đề:** `E8-S1` xong — deck có trần 30 thẻ, `DishCard.lane` được gán ở mỗi lần đọc. **Và E7-S3 đã commit** (§1.1).
>
> 🧭 *Slice khép E8. Sau slice này người vuốt biết mình đang ở đâu, biết còn bao xa, thấy được món nào là món lâu chưa ăn — và mở lại app thì tiếp tục đúng chỗ đang dở.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E8-T3` | Chip lý do cho thẻ Explore | 2 | `dish-explanation.ts`, `dish-swipe-card.tsx` | Thẻ lâu chưa ăn nói rõ nó là món lâu chưa ăn |
| `E8-T5` | Tiến trình `x/30` và màn hết thẻ | 2 | `deck-screen.tsx` | Chữ trên màn hết thẻ không ngụ ý đã xem hết danh mục |
| `E8-T7` | Tiếp tục đúng chỗ đang vuốt (`F51`) | 2 | `resume-position.ts` (MỚI), `deck-screen.tsx` | Đóng app mở lại không phải vuốt lại từ đầu |
| `E8-T6` | Đo lại `NFR-01`, `NFR-02` | 2 | — | Có số đo thật, không phải suy đoán từ `E1-T12` |

- [ ] Chip Explore khác thẻ thường cả bằng **chữ**, không chỉ bằng màu (§1.2)
- [ ] `total` lấy từ `dishes.length`, **không** từ `RANKING_CONFIG.deck.maxCards` (§1.3)
- [ ] Cursor suy từ thẻ **cuối cùng** đã có tương tác, không phải thẻ đầu tiên chưa có (§1.4)
- [ ] `marks` suy ra đủ ba giá trị `'yes' | 'no' | 'cannot'` (§1.1)
- [ ] `TC-145`, `TC-146` xanh
- [ ] `yarn verify && yarn arch:probe && yarn test:integration` xanh

---

# 1. Năm phát hiện — đọc trước khi gõ

## 1.1 Slice này phải đợi E7-S3 commit xong

`E8-T5` và `E8-T7` đều sửa [`deck-screen.tsx`](../../../src/features/selection/presentation/components/deck-screen.tsx), và E7-S3 cũng đang sửa đúng file đó — thêm `handleCannotEat`, `toastMessage`, và mở rộng `marks` thành `'yes' | 'no' | 'cannot'`.

Bắt đầu S2 trước khi S3 commit là tự chuốc một cuộc merge trên file phức tạp nhất của feature.

Hệ quả cụ thể cho `E8-T7`: hàm suy `marks` phải sinh **ba** giá trị, không phải hai. Xem §1.4 — và đọc lại `deck-screen.tsx` sau khi S3 landed, đừng viết theo trí nhớ.

## 1.2 Chip Explore: nhãn mô tả MÓN, không mô tả Ô

`E8-S1` §1.3 đã chốt: `lane` được suy lại ở mỗi lần đọc bằng `isExploreEligible`, không lưu vào `session_decks`. Hệ quả có chủ đích — **một món đứng ở ô Exploit vẫn có thể mang nhãn `EXPLORE`**.

Đó là thứ đúng để hiển thị. Người dùng cần biết *"món này lâu rồi nhà mình chưa ăn"*, không cần biết thuật toán đã xếp nó vào rổ nào. Nếu chip chỉ hiện ở đúng 6 ô explore thì 24 thẻ còn lại sẽ im lặng về một sự thật đang đúng với vài món trong đó.

Ràng buộc từ `E6-T6` (mốc M6): **không thông tin nào chỉ truyền tải bằng màu sắc**. Nên chip phải khác **chữ**, không chỉ khác nền.

[`formatExplanation`](../../../src/features/selection/presentation/components/dish-explanation.ts) hiện trả hai câu theo `daysSinceLastEaten`. Mở rộng thành ba, ưu tiên từ cụ thể tới chung:

```ts
export function formatExplanation(
  daysSinceLastEaten: number | null,
  lane: DishLane,
): string {
  if (daysSinceLastEaten !== null && daysSinceLastEaten < RANKING_CONFIG.history.cooldownWindowDays) {
    return 'Vừa ăn gần đây.'
  }
  if (lane === 'EXPLORE') {
    return daysSinceLastEaten === null
      ? 'Nhà mình chưa ăn món này bao giờ.'
      : `Đã ${daysSinceLastEaten} ngày chưa ăn — thử đổi vị?`
  }
  return 'Món này đang có trong danh mục của nhóm.'
}
```

Thứ tự nhánh quan trọng: `Vừa ăn gần đây` đứng trước vì hai điều kiện loại trừ nhau về mặt dữ liệu ($d < 7$ thì không thể $d \ge 30$) — nhưng viết ngược lại thì một thay đổi `staleDays` trong tương lai sẽ tạo vùng chồng lấn im lặng.

Hàm vẫn đọc ngưỡng **trực tiếp** từ `RANKING_CONFIG`, không hardcode 7 hay 30 — nguyên tắc 4 của Ranking Spec §1.

## 1.3 `total` lấy từ mảng thật, không từ hằng số

Cám dỗ với `E8-T5` là hiện `${cursor + 1} / 30`. Sai, vì hai lý do:

- Nhóm có ít hơn 30 món đủ điều kiện → deck ngắn hơn trần ngay từ đầu.
- Deck co lại giữa phiên khi món bị gỡ hoặc bị khai `Cannot Eat` (`E8-S1` §1.5, và `TC-108`). Người dùng sẽ thấy `28 / 30` rồi hết thẻ ở 28 — một cái đếm không bao giờ tới đích.

`deck-screen.tsx` **đã làm đúng**: `const total = dishes.length`. `E8-T5` không được đổi chỗ này; nó chỉ đổi **chữ** trên màn hết thẻ.

Chữ hiện tại: *"Bạn đã xem hết {cursor} món."* — với deck vô hạn của v1.0 thì đúng, vì `dishes` là toàn bộ danh mục. Với trần 30 thì câu này ngụ ý sai rằng nhóm chỉ có 30 món. Đổi thành câu nói rõ đây là **tuyển chọn cho riêng người này**:

> Bạn đã xem hết {total} món được chọn cho hôm nay.

## 1.4 `F51` — suy cursor từ thẻ CUỐI đã tương tác, không phải thẻ ĐẦU chưa tương tác

`effectiveInteraction` đi từ SQL qua [`DishCard`](../../../src/features/selection/domain/dish-card.ts) ra tới client và **không ai đọc**. `cursor` khởi tạo `useState(0)`.

Hôm nay: vuốt 12 thẻ, đóng app, mở lại → về thẻ 1, vuốt lại 12 thẻ đó. Dữ liệu không hỏng (`applyInteraction` upsert có timestamp guard), nhưng người dùng đi vòng. Deck vô hạn của v1.0 che được chuyện này; `x/30` của `E8-T5` thì không — cái đếm nhảy về `1/30` mỗi lần mở lại.

**Hai cách suy, và cách thứ hai sai:**

| Cách | Ca hỏng |
| --- | --- |
| Chỉ số thẻ **đầu tiên** có `effectiveInteraction === null` | Người dùng Undo thẻ #5 rồi vuốt tiếp tới #12. Mở lại → cursor về 5, và họ phải vuốt lại #6→#12 |
| **Sau thẻ cuối cùng** có `effectiveInteraction !== null` | ✅ Undo giữa chừng vẫn tiếp tục ở #13 |

```ts
/**
 * SPEC-036 — vị trí tiếp tục khi mở lại phiên. Hàm thuần, không phụ thuộc
 * React: nhận mảng thẻ đã có `effectiveInteraction`, trả cursor và `marks`
 * tương ứng.
 *
 * Lấy vị trí SAU thẻ CUỐI CÙNG đã tương tác, không phải vị trí thẻ ĐẦU TIÊN
 * chưa tương tác — Guide §1.4. Undo một thẻ ở giữa để lại một lỗ `null`, và
 * cách thứ hai sẽ kéo người dùng lùi về cái lỗ đó rồi bắt vuốt lại toàn bộ
 * phần đuôi.
 *
 * `marks` sinh cho ĐÚNG tiền tố `[0, cursor)`, đúng bất biến mà `deck-screen`
 * dựa vào: `marks.length === cursor`.
 */
export function resumePosition(dishes: readonly DishCard[]): {
  readonly cursor: number
  readonly marks: Array<'yes' | 'no' | 'cannot'>
}
```

Thẻ nào trong tiền tố có `effectiveInteraction === null` (đã Undo) thì `marks` ghi gì? Không có giá trị nào đúng — người ấy đã xem thẻ nhưng không để lại ý kiến. Chọn `'no'` sẽ đếm sai `noCount`. **Dùng `'cannot'`**: nó là giá trị duy nhất trong ba giá trị không góp vào `yesCount` lẫn `noCount`, và ngữ nghĩa "đã đi qua, không tính vào số đếm" khớp chính xác. Ghi rõ điều này vào comment — nếu không nó trông như một lỗi copy-paste.

> [!NOTE]
> Thẻ bị gỡ bằng `Cannot Eat` không nằm trong mảng `dishes` (nó đã bị `listEligibleDishCards` lọc từ SQL), nên nó không tham gia vào phép suy này. Không cần xử lý riêng.

## 1.5 `E8-T6` — số cũ của `E1-T12` không dùng lại được

Deck ngắn hơn ~5 lần và `list-deck.ts` nay đọc thêm một bảng (`user_dish_preferences`, E7). Hai thay đổi ngược chiều nhau: ít thẻ hơn thì nhẹ hơn, thêm một truy vấn thì nặng hơn.

Nên `NFR-01` phải **đo lại**, không suy đoán. Đo đúng điều kiện `MS-05` đã định: điện thoại thật, 4G, sau khi Neon DB đã ngủ $\ge 10$ phút — cold start là ca xấu nhất và cũng là ca người dùng gặp mỗi tối.

`NFR-02` (≤100ms cho mỗi lượt vuốt) không bị E8 đụng tới — đường vuốt vẫn là Route Handler fire-and-forget. Đo lại để xác nhận chứ không phải để sửa.

Ghi kết quả vào [Setup & Ops Guide](../../what-we-gonna-eat-today_setup-and-ops-guide_v1.2.md) cạnh số cũ, giữ cả hai để so sánh được.

---

# 2. File tree

```text
src/features/selection/presentation/components/
├── dish-explanation.ts          # E8-T3 — formatExplanation nhận lane
├── dish-explanation.test.ts
├── dish-swipe-card.tsx          # E8-T3 — chip đổi theo lane
├── dish-swipe-card.test.tsx
├── resume-position.ts           # E8-T7 — MỚI
├── resume-position.test.ts
├── deck-screen.tsx              # E8-T5, E8-T7
└── deck-screen.test.tsx
```

Không file `domain/` nào đổi ở slice này — `lane` đã có từ S1.

---

# 3. `E8-T3` — Chip lý do

## 3.1 `formatExplanation`

Chữ ký và thân hàm ở §1.2. Kiểu `DishLane` export từ [`dish-card.ts`](../../../src/features/selection/domain/dish-card.ts) (S1 đã thêm).

### Test — `dish-explanation.test.ts`

| Đầu vào | Kỳ vọng |
| --- | --- |
| `d = 3`, `lane = 'EXPLORE'` | `'Vừa ăn gần đây.'` — nhánh cooldown thắng |
| `d = null`, `lane = 'EXPLORE'` | `'Nhà mình chưa ăn món này bao giờ.'` |
| `d = 45`, `lane = 'EXPLORE'` | `'Đã 45 ngày chưa ăn — thử đổi vị?'` |
| `d = 45`, `lane = 'EXPLOIT'` | Câu chung — món lâu chưa ăn nhưng bị `Dislike` |

Ca cuối là ca dễ quên: `lane` đã tính cả điều kiện `Dislike`, nên `d` lớn **không** đủ để ra câu Explore.

## 3.2 Chip trên thẻ

[`dish-swipe-card.tsx`](../../../src/features/selection/presentation/components/dish-swipe-card.tsx) hiện render `explanation` như một dòng chữ dưới `lastEatenLabel`. Thêm một chip nhỏ cạnh nhóm System Tag khi `dish.lane === 'EXPLORE'`:

```tsx
{dish.lane === 'EXPLORE' ? (
  <span className="rounded-full bg-accent-soft px-3 py-1.5 text-caption font-medium text-accent">
    Đổi vị
  </span>
) : null}
```

Chữ "Đổi vị" là thứ mang thông tin; màu chỉ nhấn thêm — thoả `E6-T6`.

Test: render thẻ `lane = 'EXPLORE'` và thẻ `lane = 'EXPLOIT'`, khẳng định chuỗi `'Đổi vị'` chỉ có ở thẻ đầu.

---

# 4. `E8-T5` — Tiến trình và màn hết thẻ

`progress`, `progressPercent`, `total` **giữ nguyên** — chúng đã đúng (§1.3). Chỉ đổi chữ trên khối `isEmpty`:

```tsx
<h2 className="text-title font-semibold text-ink">
  Bạn đã xem hết {total} món được chọn cho hôm nay.
</h2>
```

Test: dựng deck 3 thẻ, vuốt hết, khẳng định màn hết thẻ hiện `'3 món được chọn cho hôm nay'` — và **không** hiện chuỗi ngụ ý đã xem hết danh mục nhóm.

---

# 5. `E8-T7` — Tiếp tục đúng chỗ

## 5.1 `resume-position.ts`

Chữ ký ở §1.4. Hàm thuần, không import React — test không cần render.

## 5.2 Nối vào `deck-screen.tsx`

```ts
const initial = resumePosition(dishes)
const [cursor, setCursor] = useState(initial.cursor)
const [marks, setMarks] = useState(initial.marks)
```

`useState` nhận giá trị khởi tạo, **không** dùng `useEffect` để set sau khi mount — cùng nguyên tắc [DEC-022](../../what-we-gonna-eat-today_decision-log_v3.9.md) (*"đồng bộ state khi render, tránh Effect thừa"*) đã áp cho `view` ở E3-T5.

`initialParticipantState === 'COMPLETED'` vẫn thắng: người đã bấm "xong lượt" thì thấy màn `done`, không thấy deck. Logic `view` không đổi.

## 5.3 Test — `resume-position.test.ts`

| Ca | Đầu vào | Kỳ vọng |
| --- | --- | --- |
| `TC-145` | 30 thẻ, 12 thẻ đầu có `effectiveInteraction` | `cursor = 12`, `marks.length = 12` |
| `TC-146` | Thẻ #5 `null` (đã Undo), #1→#12 còn lại có tương tác | `cursor = 12`, **không** phải `4`; `marks[4] === 'cannot'` (§1.4) |
| — | Chưa vuốt thẻ nào | `cursor = 0`, `marks = []` |
| — | Vuốt hết 30 thẻ | `cursor = 30` → màn hết thẻ hiện ngay |
| — | `SWIPE_RIGHT` / `SWIPE_LEFT` | `marks` ra `'yes'` / `'no'` tương ứng |

`TC-146` là ca đáng viết nhất — nó là toàn bộ lý do chọn "thẻ cuối đã tương tác" thay vì "thẻ đầu chưa tương tác".

---

# 6. `E8-T6` — Đo NFR

Theo §1.5. Ghi vào Setup & Ops Guide bảng ba cột: `NFR`, số đo `E1-T12` (v1.0), số đo `E8-T6` (v1.1).

Nếu `NFR-01` trượt ngưỡng 2.5s: nghi can đầu tiên **không** phải deck ngắn đi mà là truy vấn `user_dish_preferences` mới thêm ở E7 — kiểm bằng cách so thời gian `Promise.all` trong `list-deck.ts` trước/sau. Phương án đã ghi sẵn ở [Master Plan §11](../../what-we-gonna-eat-today_master-plan_v2.1.md): render shell tĩnh trước, stream dữ liệu sau.

---

# 7. Rủi ro

| Rủi ro | Dấu hiệu | Xử lý |
| --- | --- | --- |
| Bắt đầu trước khi E7-S3 commit | Xung đột trên `deck-screen.tsx` | §1.1 — đợi, rồi đọc lại file |
| `total` lấy từ `maxCards` | Người dùng thấy `28 / 30` rồi hết thẻ ở 28 | §1.3 — `dishes.length` |
| Suy cursor từ thẻ đầu tiên chưa tương tác | Undo giữa chừng làm mất phần đuôi đã vuốt | §1.4 — `TC-146` |
| `marks` chỉ hai giá trị | `tsc` đỏ sau khi S3 landed, hoặc `noCount` đếm sai | §1.4 — dùng `'cannot'` cho lỗ Undo |
| Chip chỉ khác màu | Vi phạm ràng buộc `E6-T6` | §3.2 — chữ "Đổi vị" |
| `useEffect` để set cursor | Nháy một khung hình ở thẻ #1 rồi nhảy | §5.2 — giá trị khởi tạo của `useState` |

---

# 8. Test Cases coverage

`TC-145`, `TC-146` §5.3 • bốn ca `formatExplanation` §3.1 • một ca chip §3.2 • một ca màn hết thẻ §4 • ba ca `resumePosition` không mã §5.3.

---

# 9. Thứ tự TDD

1. Xác nhận E7-S3 đã commit; `git pull`/đọc lại `deck-screen.tsx` (§1.1).
2. `resume-position.test.ts` gồm `TC-146` (đỏ) → `resumePosition` (xanh). Chưa nối vào component.
3. `dish-explanation.test.ts` bốn ca (đỏ) → `formatExplanation` (xanh) → `tsc` chỉ ra chỗ gọi trong `deck-screen.tsx` thiếu tham số `lane`.
4. Chip trên thẻ + test.
5. Đổi chữ màn hết thẻ + test.
6. Nối `resumePosition` vào `deck-screen.tsx` (§5.2) → test component.
7. `E8-T6` đo NFR trên máy thật.
8. `yarn verify && yarn arch:probe && yarn test:integration`.

Bước 2 làm trước bước 6 có chủ đích: `resumePosition` là hàm thuần và là chỗ chứa toàn bộ phần khó nghĩ; nối vào component chỉ còn là hai dòng.

---

# 10. Verify

## 10.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn test:integration
```

## 10.2 Bằng chứng đi trọn vòng — DoD chính của E8

Trên máy thật, nhóm có **hơn 30 món**:

1. Mở phiên, vuốt. Chỉ báo hiện `1 / 30` — **không** phải `1 / 150`.
2. Trong 30 thẻ, có ít nhất vài thẻ mang chip **"Đổi vị"**, và câu giải thích của chúng nói số ngày cụ thể.
3. Vuốt 12 thẻ. **Đóng hẳn app**, mở lại, vào cùng phiên.
4. Chỉ báo hiện `13 / 30` và thẻ đang hiện là thẻ thứ 13 — không phải thẻ đầu.
5. Vuốt tới hết. Màn cuối nói *"Bạn đã xem hết 30 món được chọn cho hôm nay."*

Bước 4 là bằng chứng của `F51`, và cũng là thứ không test đơn lẻ nào chứng minh được — nó cần một vòng đời trình duyệt thật.

## 10.3 Bằng chứng luồng Explore thật sự có mặt

Vuốt ba phiên liên tiếp trên ba ngày khác nhau. Nếu không phiên nào đưa ra một món bạn quên mất là nhà mình có, thì `E8-T2` chưa chạy đúng — và khi đó `F49` chỉ là một cái trần chặn người dùng khỏi chính danh mục của họ. Đây là điểm kiểm tra đã ghi sẵn ở [Master Plan §16.7](../../what-we-gonna-eat-today_master-plan_v2.1.md).

---

# 11. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v3.9.md`

```markdown
# DEC-065 — Vị Trí Tiếp Tục Suy Ở Client, Không Lưu Server

- **Ngày:** 2026-08-26
- **Trạng thái:** Accepted
- **Bối cảnh:** E8 Slice S2 — `F51`

## Quyết định

1. `cursor` và `marks` ban đầu suy từ `effectiveInteraction` đã có sẵn trên
   `DishCard`. KHÔNG thêm cột `cursor` vào `session_decks`.
2. Lấy vị trí SAU thẻ CUỐI CÙNG đã tương tác, không phải thẻ ĐẦU TIÊN chưa
   tương tác.
3. Thẻ trong tiền tố có `effectiveInteraction === null` (đã Undo) được đánh
   `'cannot'` trong `marks`.

## Rationale

1. Dữ liệu đã đi từ SQL ra tới client ở mỗi lần tải trang từ E1 — chỉ là chưa
   ai đọc. Lưu cursor phía server nghĩa là thêm một lượt ghi vào MỖI lượt vuốt,
   tức vào đúng đường nóng mà `NFR-02` (≤100ms) và lựa chọn Route Handler thay
   Server Action (Tech Spec §4.1) đang bảo vệ — để giải quyết một chuyện đã có
   sẵn câu trả lời trong dữ liệu.
2. Undo để lại một lỗ `null` ở giữa. Suy theo "thẻ đầu tiên chưa tương tác" sẽ
   kéo người dùng lùi về cái lỗ đó và bắt vuốt lại toàn bộ phần đuôi — biến một
   thao tác sửa sai thành một hình phạt.
3. Ba giá trị của `marks`, chỉ `'cannot'` là giá trị không góp vào `yesCount`
   lẫn `noCount`. Một thẻ đã xem nhưng không còn ý kiến thì đúng là không nên
   góp vào con số nào. Dùng `'no'` sẽ làm màn tổng kết nói dối.

## Consequence

- Không migration. Không request mới.
- Đa thiết bị: hai máy cùng lúc vẫn suy ra cùng một cursor sau mỗi lần tải
  trang, vì cả hai đọc cùng một `effectiveInteraction`. Không đồng bộ tức thời
  giữa hai máy đang mở — chấp nhận được ở quy mô một gia đình.
- `F51` là tính năng thứ 12 của v1.1, thêm vào PRD §4 sau `F50`.
```

---

# 12. Master Plan

[§16.3](../../what-we-gonna-eat-today_master-plan_v2.1.md): gắn nhãn `S2` cho `E8-T3`, `E8-T5`, `E8-T7`, `E8-T6`; ghi tiền đề "S2 bắt đầu sau khi E7-S3 commit".
