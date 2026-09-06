# 🥢 Implementation Guide — E9 Slice S2: Chọn chặng và duyệt theo chặng

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-09-01`
> - **Upstream:** [Master Plan §16.4](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E9-T2`, `E9-T4`, `E9-T5`) • [SDD §8.3](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-029`, `SPEC-030`) • [Business Rules](../../what-we-gonna-eat-today_business-rules_v1.8.md) (`BR-063`, `BR-049`, `BR-050`) • [Design Criteria](../../what-we-gonna-eat-today_design-criteria_v1.0.md) • [Decision Log](../../what-we-gonna-eat-today_decision-log_v3.9.md) (`DEC-022`, `DEC-059`) • [Test Cases](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-137`, `TC-138`)
> - **Tiền đề:** `E9-S1` xong — `session_courses` ghi được, `splitIntoCourses` chạy đúng. **Và E8-S2 đã commit** (§1.1).
>
> 🥢 *Slice khép E9. Sau slice này Creator chọn chặng lúc mở phiên, và cả nhà vuốt lần lượt Cơm → Canh → Mặn thay vì một danh sách trộn lẫn.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E9-T2` | Màn chọn & sắp thứ tự chặng | 4 | `start-session-screen.tsx`, `sessions/new/page.tsx` | Creator bật chế độ chặng và sắp thứ tự ngay trên nút bắt đầu |
| `E9-T4` | `listDeck` trả ranh giới chặng | 3 | `list-deck.ts`, `selection-repository.ts` | Deck phẳng kèm mốc chia chặng; `FREE` đi đúng đường cũ |
| `E9-T5` | Giao diện duyệt theo chặng | 3 | `deck-screen.tsx` | Tiêu đề chặng, chuyển chặng khi hết, quay lại chặng trước |

- [ ] Ô chọn chặng nằm **trong** `<form>` — nếu không, giá trị không vào `FormData` (§1.2)
- [ ] Mặc định lấy từ Group Required Rule, Creator sửa được (§1.3)
- [ ] `FREE` không rẽ thêm nhánh nào ở `DeckScreen` (§1.4)
- [ ] Tiến trình đếm **theo chặng**, không theo tổng (§1.5)
- [ ] `TC-137`, `TC-138` xanh; `MS-01` chạy lại trọn vòng vẫn xanh
- [ ] `yarn verify && yarn arch:probe && yarn test:integration` xanh

---

# 1. Năm phát hiện — đọc trước khi gõ

## 1.1 Slice này phải đợi E8-S2 commit

`E9-T5` sửa [`deck-screen.tsx`](../../../src/features/selection/presentation/components/deck-screen.tsx), và E8-S2 (`E8-T5` tiến trình, `E8-T7` resume cursor) cũng sửa đúng file đó. `E9-T4` còn đổi hình dạng `ListDeckResult` mà `E8-T7` đọc.

Bắt đầu trước khi E8-S2 landed là tự chuốc merge trên file phức tạp nhất của feature. Đọc lại file sau khi nó commit, đừng viết theo guide này như thể `deck-screen.tsx` còn nguyên hình dạng cũ.

Hai thứ của E8-S2 mà `E9-T5` phải hoà vào chứ không ghi đè:

- `resumePosition(dishes)` trả `{ cursor, marks }` — chế độ chặng **không** đổi cách suy này; cursor vẫn là chỉ số trong mảng phẳng.
- `total = dishes.length` — `E9-T5` đổi cái **hiển thị** thành số thẻ của chặng hiện tại, nhưng `cursor` vẫn chạy trên mảng phẳng (§1.5).

## 1.2 Ô chọn chặng phải nằm TRONG `<form>` — hiện form chỉ có mỗi nút

[`start-session-screen.tsx`](../../../src/features/session/presentation/components/start-session-screen.tsx) hiện có cấu trúc:

```tsx
<div className="flex flex-1 flex-col gap-6 px-4 pt-3">
  {/* danh sách người ăn — NGOÀI form */}
</div>

<div className="flex flex-col gap-3 px-4 pb-8 pt-4">
  {state.blockText === null ? null : <Banner tone="danger">{state.blockText}</Banner>}
  <form action={formAction}>
    <Button type="submit" pending={pending}>…</Button>
  </form>
</div>
```

`<form>` **chỉ chứa nút submit**. Đó là lý do `openSessionAction(groupId, _previousState)` chưa từng cần `formData` — không có trường nào để đọc.

Ô chọn chặng là điều khiển tương tác (bật/tắt, sắp thứ tự) nên state phải nằm ở client. Hai cách đưa giá trị vào `FormData`:

| Cách | Đánh giá |
| --- | --- |
| Dời `<form>` lên bọc cả khối chọn chặng | Phải sắp xếp lại layout đang đúng, và khối cuộn/khối cố định đang tách nhau có chủ đích |
| **Hidden input phản chiếu state, đặt trong `<form>` hiện có** | ✅ Không đụng layout |

```tsx
<form action={formAction}>
  <input type="hidden" name="deckMode" value={courseMode ? 'COURSE' : 'FREE'} />
  {courseMode
    ? selectedCourses.map((tag) => (
        <input key={tag} type="hidden" name="courses" value={tag} />
      ))
    : null}
  <Button type="submit" pending={pending}>…</Button>
</form>
```

`FormData.getAll('courses')` trả về **theo thứ tự DOM**, nên thứ tự Creator sắp được giữ nguyên mà không cần trường `position` riêng. Đây là hợp đồng ngầm — ghi một dòng comment tại chỗ render, vì nó là thứ dễ bị "dọn dẹp" thành `join(',')` sau này.

`openSessionAction` đổi chữ ký thành `(groupId, _previousState, formData)` (S1 `E9-T1` đã làm) và đọc `formData.getAll('courses')`.

## 1.3 Mặc định từ Required Rule là GỢI Ý, không phải ràng buộc

[`NewSessionPage`](../../../src/app/groups/[groupId]/sessions/new/page.tsx) hiện đọc `listActiveMembers`. Thêm `drizzleRuleRepository.listGroupRules(groupId)`, lọc `REQUIRED`, lấy `systemTag`, truyền xuống làm `defaultCourses`.

[`DEC-059`](../../what-we-gonna-eat-today_decision-log_v3.9.md) mục 2 đã **bác bỏ** việc *suy* chặng từ Required Rule, với lý do: Required Rule trả lời *"mâm cơm hợp lệ cần gì"*, còn chặng trả lời *"tối nay muốn duyệt qua những gì"* — hai câu khác nhau đúng lúc quan trọng (bữa chỉ ăn lẩu).

Cách này **không mâu thuẫn**: giá trị lưu vào `session_courses` là thứ Creator chốt, không phải con trỏ tới `group_rules`. Bỏ bớt chặng cho bữa lẩu vẫn được, và không phải sửa luật của cả nhóm. Ghi rõ điều đó vào comment tại chỗ đọc `listGroupRules` — nếu không, người đọc sau sẽ thấy nó nghịch với `DEC-059`.

Thứ tự mặc định là **thứ tự chuẩn của mâm cơm Việt** theo [`SYSTEM_TAGS`](../../../src/shared/domain/system-tag.ts): Cơm → Món mặn → Món phụ → Canh → Tráng miệng. Creator muốn Cơm → Canh → Mặn thì tự kéo — đó là lý do có thao tác sắp thứ tự.

Nhóm **chưa cấu hình Required Rule** nào thì `defaultCourses` rỗng; bật chế độ chặng mà chưa chọn gì thì nút bắt đầu bị chặn kèm lỗi tại chỗ (`InlineError`, đã có sẵn). Không im lặng gửi lên rồi nhận `ERR_VALIDATION` từ server — đó là vòng đi thừa.

## 1.4 `listDeck` KHÔNG cần tham số `courseIndex`

[Master Plan §16.4](../../what-we-gonna-eat-today_master-plan_v2.1.md) ghi *"`listDeck` nhận `courseIndex`"*. Rà lại thì tham số đó là thừa, và thêm nó sẽ đi ngược kiến trúc đang có.

[`sessions/[sessionId]/page.tsx`](../../../src/app/sessions/[sessionId]/page.tsx) gọi `listDeck` với `WHOLE_DECK_PAGE_SIZE = 500` — **lấy trọn deck một lần** rồi giao cả mảng cho `DeckScreen`, vốn tự quản `cursor` trong `useState`. Chặng là ranh giới **bên trong** mảng đó, hệt như `cursor`.

Thêm `courseIndex` nghĩa là mỗi lần chuyển chặng phải đi mạng một vòng — cho dữ liệu đã nằm sẵn trong bộ nhớ trình duyệt.

**Cách đúng:** `ListDeckResult` mang thêm mốc chia chặng, `DeckScreen` suy chặng hiện tại từ `cursor`:

```ts
export type CourseBoundary = {
  readonly systemTag: SystemTag
  /** Số thẻ của chặng này trong mảng phẳng. */
  readonly count: number
}

export type ListDeckResult = {
  readonly items: DishCard[]
  readonly nextCursor: number | null
  /**
   * `null` khi `deck_mode = FREE` — người gọi không phải rẽ nhánh, chỉ cần
   * kiểm `=== null` một lần ở tầng presentation (TC-137).
   */
  readonly courses: readonly CourseBoundary[] | null
}
```

Suy ở **read time** từ mảng phẳng + tag món + `session_courses` — đúng khuôn `lane` của E8 và `DEC-064` mục 4. `session_decks` không đổi schema.

## 1.5 Tiến trình đếm theo chặng, nhưng `cursor` vẫn chạy trên mảng phẳng

E8-T5 đặt `total = dishes.length` và `progress = ${cursor+1} / ${total}`. Ở chế độ chặng, con số đó vô nghĩa với người đang vuốt: họ cần biết còn bao nhiêu thẻ **của chặng này**.

Nhưng **đừng đổi `cursor` thành chỉ số trong chặng.** `cursor` là thứ `resumePosition` (E8-T7) suy ra, là thứ `handleUndo` lùi, và là thứ ánh xạ 1–1 với `dishes[]`. Đổi nó thành hai chiều (chặng, vị trí trong chặng) là nhân đôi số trạng thái phải giữ đồng bộ.

Giữ `cursor` phẳng; suy chặng hiện tại từ nó:

```ts
/**
 * Chặng đang đứng và tiến trình trong chặng, suy từ `cursor` phẳng.
 * `courses === null` (chế độ FREE) → `null`, và màn hình dùng tiến trình tổng
 * như E8-T5 đã làm.
 */
export function currentCourse(
  courses: readonly CourseBoundary[] | null,
  cursor: number,
): { index: number; total: number; systemTag: SystemTag; position: number; count: number } | null
```

Hàm thuần, đặt cạnh [`resume-position.ts`](../../../src/features/selection/presentation/components/resume-position.ts) trong `presentation/`, test không cần render.

Nhãn chặng dùng [`SYSTEM_TAG_LABELS`](../../../src/shared/ui/system-tag-label.ts) — *"Chặng 2/3 · Canh"*. Đừng viết chuỗi tiếng Việt mới; nhãn `STAPLE` là `'Cơm · Bún · Phở'` và nó **chứa dấu `·`**, nên tiêu đề phải dùng dấu phân cách khác hoặc xuống dòng — cùng cái bẫy `DEC-052` đã ghi cho `add-dish-sheet` và `finalize-meal-screen`.

---

# 2. File tree

```text
src/features/session/presentation/components/
├── start-session-screen.tsx        # E9-T2 — công tắc + danh sách chặng + hidden input
└── start-session-screen.test.tsx

src/app/groups/[groupId]/sessions/new/
└── page.tsx                        # E9-T2 — đọc listGroupRules làm mặc định

src/features/selection/
├── application/list-deck.ts        # E9-T4 — trả CourseBoundary[]
├── application/selection-repository.ts  # E9-T4 — findSessionCourses
└── presentation/components/
    ├── current-course.ts           # E9-T5 — MỚI
    ├── current-course.test.ts
    ├── deck-screen.tsx             # E9-T5
    └── deck-screen.test.tsx
```

---

# 3. `E9-T2` — Màn chọn chặng

## 3.1 Props và state

```ts
export type StartSessionScreenProps = {
  dateCaption: string
  participants: readonly ParticipantRow[]
  /** Tag của Group Required Rule, thứ tự chuẩn. Rỗng nếu nhóm chưa đặt luật. */
  defaultCourses: readonly SystemTag[]
  blockText: string | null
  action: (state: StartSessionFormState, formData: FormData) => Promise<StartSessionFormState>
}
```

State client: `courseMode: boolean` (mặc định `false`) và `selectedCourses: SystemTag[]` (khởi tạo `defaultCourses`).

Khởi tạo bằng giá trị của `useState`, **không** `useEffect` — [`DEC-022`](../../what-we-gonna-eat-today_decision-log_v3.9.md).

## 3.2 Giao diện

Đặt ngay trên khối nút, dưới danh sách người ăn:

- Một công tắc *"Vuốt theo chặng"* kèm câu phụ giải thích: *"Cả nhà duyệt lần lượt từng loại món."*
- Khi bật: danh sách `selectedCourses` với nút lên/xuống để sắp thứ tự và nút bỏ; cộng một hàng "Thêm chặng" cho các tag chưa chọn.

**Nút lên/xuống, không kéo-thả.** Kéo-thả trên mobile cần thư viện hoặc pointer-event thủ công, và ứng dụng này chưa có phụ thuộc nào cho việc đó. Hai nút mũi tên đạt `NFR-03` (vùng chạm ≥ 44px) và đọc được bằng trình đọc màn hình mà không cần ARIA drag pattern.

Trạng thái phải đọc được không chỉ bằng màu (`E6-T6`): dùng `aria-pressed` trên công tắc và nhãn chữ cho thứ tự (*"1."*, *"2."*).

## 3.3 Hidden input

Theo §1.2. Ghi comment tại chỗ render về hợp đồng thứ tự DOM.

## 3.4 Chặn tại chỗ khi bật chế độ mà chưa chọn chặng

Nút submit `disabled` khi `courseMode && selectedCourses.length === 0`, kèm `InlineError` — không gửi lên để nhận `ERR_VALIDATION` (§1.3). Server vẫn giữ phép kiểm đó (S1 `E9-T1`): client chặn cho êm, server chặn cho đúng.

## 3.5 Test — `start-session-screen.test.tsx`

| Ca | Kỳ vọng |
| --- | --- |
| Mặc định | Công tắc tắt; không có hidden input `courses` nào |
| Bật công tắc, `defaultCourses = [STAPLE, MAIN, SOUP]` | Ba hidden input, `value` đúng thứ tự đó |
| Bấm mũi tên xuống ở chặng đầu | Thứ tự hidden input đổi tương ứng |
| Bật công tắc, bỏ hết chặng | Nút submit `disabled`, có `InlineError` |
| Nhóm chưa có Required Rule (`defaultCourses = []`) | Bật công tắc → danh sách rỗng, nút bị chặn, vẫn thêm chặng được |

---

# 4. `E9-T4` — `listDeck` trả ranh giới chặng

## 4.1 Port

```ts
/** SPEC-029 — chặng đã đóng băng của phiên, theo `position` tăng dần.
 *  Mảng RỖNG = phiên FREE (không có dòng nào), khác `null`. */
listSessionCourses(sessionId: string): Promise<readonly SystemTag[]>
```

`deckMode` đọc kèm trong `findSessionForRanking`/`findParticipant` hiện có, hoặc thêm vào truy vấn `listEligibleDishCards` — **không** thêm một round-trip riêng chỉ để đọc một cột enum.

## 4.2 Suy ranh giới ở read time

Sau khi có `orderedDishIds` (dù từ `session_decks` hay vừa dựng), nhóm mảng phẳng theo chặng bằng **cùng quy tắc** `splitIntoCourses` dùng: chặng đầu tiên khớp theo thứ tự Creator (`SPEC-030`, S1 §1.5).

Tách vị từ đó thành một hàm dùng chung ngay từ S1 nếu chưa — hai bản sao của "món này thuộc chặng nào" là chỗ chúng sẽ lệch nhau, cùng lý lẽ `isExploreEligible` của E8.

`deckMode === 'FREE'` → `courses: null`, không tính gì (`TC-137`).

## 4.3 Test

| Ca | Tầng | Kỳ vọng |
| --- | :---: | --- |
| `TC-137` | `A` | `FREE` → `courses === null`; `items` y hệt trước E9 |
| — | `A` | `COURSE` 3 chặng → `courses` 3 phần tử, tổng `count` = `items.length` |
| — | `A` | Món bị `Cannot Eat` giữa phiên → `count` của chặng chứa nó giảm 1, các chặng khác không đổi |

Ca cuối canh chỗ nối giữa E7 và E9: deck co lại thì mốc chia chặng phải co theo, vì nó được suy ở read time chứ không lưu.

---

# 5. `E9-T5` — Giao diện duyệt theo chặng

## 5.1 `current-course.ts`

Chữ ký ở §1.5. Hàm thuần.

## 5.2 `DeckScreen`

- Tiêu đề chặng thay cho dòng `Bữa tối · {dateCaption}` khi `courses !== null`: *"Chặng 2/3 · Canh"*, và `dateCaption` xuống dòng phụ.
- Thanh tiến trình và số `x/N` dùng số của **chặng hiện tại** (§1.5).
- Hết chặng thì **tự sang chặng kế** — không có màn trung gian. `cursor` cứ tiến, `currentCourse` trả chặng mới, tiêu đề đổi. Một `role="status"` báo *"Sang chặng Canh"* cho trình đọc màn hình.
- Nút "Quay lại chặng trước" chỉ hiện khi `cursor` đã vượt mốc chặng đầu; nó đặt `cursor` về đầu chặng trước đó. **Không** gửi request nào — nó chỉ đổi vị trí đọc, không đổi tương tác.

> [!IMPORTANT]
> `handleUndo` của E7-S3 **không** đổi: nó lùi một thẻ, kể cả qua ranh giới chặng. "Quay lại chặng trước" là thao tác điều hướng, "Undo" là thao tác sửa dữ liệu — hai thứ khác nhau, và gộp chúng sẽ làm nút Undo xoá tương tác của một thẻ người dùng tưởng chỉ đang đi ngang qua.

## 5.3 Chốt bữa không đổi một dòng nào

`rankSession`, `finalizeSession`, `BR-049`, `BR-050` **không** biết chế độ nào đang bật. Chặng kết thúc ở tầng dựng và hiển thị deck.

`TC-138` là ca hồi quy canh điều này: chốt bữa sau một phiên `COURSE` phải chạy y hệt phiên `FREE`. Nếu thấy mình đang sửa `finalize-session.ts` thì đã đi lạc — [`DEC-059`](../../what-we-gonna-eat-today_decision-log_v3.9.md) mục 4.

## 5.4 Test

| Ca | Kỳ vọng |
| --- | --- |
| `courses === null` | Màn hình y hệt trước E9 — không tiêu đề chặng, tiến trình tổng |
| 3 chặng `[2, 3, 2]` thẻ, `cursor = 0` | Tiêu đề *"Chặng 1/3"*, tiến trình `1 / 2` |
| Vuốt tới `cursor = 2` | Tiêu đề *"Chặng 2/3"*, tiến trình `1 / 3` |
| `cursor = 4`, bấm "Quay lại chặng trước" | `cursor = 2`, **không** gọi `fetch` |
| Vuốt hết 7 thẻ | Màn hết thẻ, không kẹt ở ranh giới chặng cuối |

---

# 6. Rủi ro

| Rủi ro | Dấu hiệu | Xử lý |
| --- | --- | --- |
| Bắt đầu trước khi E8-S2 commit | Xung đột trên `deck-screen.tsx` | §1.1 |
| Ô chọn chặng ngoài `<form>` | `formData.getAll('courses')` rỗng, mọi phiên thành `FREE` | §1.2 — hidden input |
| Thêm `courseIndex` vào `listDeck` | Một round-trip mỗi lần chuyển chặng | §1.4 |
| `cursor` đổi thành hai chiều | `resumePosition` và `handleUndo` lệch nhau | §1.5 — giữ `cursor` phẳng |
| Gộp "quay lại chặng" với Undo | Undo xoá tương tác của thẻ người dùng chỉ đi ngang qua | §5.2 |
| Viết chuỗi nhãn tag mới | Lệch với `SYSTEM_TAG_LABELS`, và dấu `·` của `STAPLE` phá tiêu đề | §1.5 — `DEC-052` |
| Hai bản sao vị từ "món thuộc chặng nào" | Deck dựng một kiểu, hiển thị một kiểu | §4.2 |

---

# 7. Test Cases coverage

`TC-137` §4.3 • `TC-138` §5.3 • năm ca `start-session-screen` §3.5 • ba ca `listDeck` §4.3 • năm ca `deck-screen`/`current-course` §5.4.

---

# 8. Thứ tự TDD

1. Xác nhận E8-S2 đã commit; đọc lại `deck-screen.tsx` (§1.1).
2. `current-course.test.ts` (đỏ) → `currentCourse` (xanh). Chưa nối vào component.
3. `listDeck` trả `courses` — test tầng `A` gồm `TC-137` (đỏ) → port + suy ranh giới (xanh).
4. `start-session-screen.test.tsx` năm ca (đỏ) → công tắc + sắp thứ tự + hidden input (xanh).
5. `NewSessionPage` đọc `listGroupRules` làm mặc định.
6. Nối `currentCourse` vào `DeckScreen`; tiêu đề, tiến trình, quay lại chặng.
7. `TC-138` hồi quy chốt bữa.
8. `MS-01` chạy tay trọn vòng ở cả hai chế độ.
9. `yarn verify && yarn arch:probe && yarn test:integration`.

Bước 2 và 3 làm trước bước 6 có chủ đích: cả phần khó nghĩ nằm trong hai hàm thuần; nối vào component chỉ còn là thay vài chuỗi.

---

# 9. Verify

## 9.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn test:integration
```

## 9.2 Bằng chứng đi trọn vòng — DoD chính của E9

Trên máy thật, nhóm có món đủ ba loại:

1. Mở phiên, bật **"Vuốt theo chặng"**. Danh sách gợi ý sẵn theo luật của nhóm.
2. Kéo thành **Cơm → Canh → Mặn**, bắt đầu phiên.
3. Thẻ đầu tiên là một món cơm/bún, tiêu đề *"Chặng 1/3 · Cơm · Bún · Phở"*.
4. Vuốt hết chặng 1 → tiêu đề tự đổi thành *"Chặng 2/3 · Canh"*, và **mọi thẻ trong chặng này đều là món canh**.
5. Bấm "Quay lại chặng trước" → về đầu chặng Cơm, không mất tương tác nào.
6. Vuốt hết ba chặng, Creator chốt bữa — bảng xếp hạng và luồng chốt **y hệt** một phiên thường.

Bước 4 là bằng chứng của `E9-S1` §1.2 (chặng không rỗng, đúng loại món) và bước 6 là bằng chứng của `DEC-059` mục 4 (chặng không đụng luồng chốt).

## 9.3 Bằng chứng chế độ tự do không suy suyển

Mở một phiên **không** bật chế độ chặng. Màn deck phải giống hệt trước E9: không tiêu đề chặng, tiến trình tổng, không nút quay lại chặng. Đây là ca dễ vỡ nhất vì `FREE` là đường mọi nhóm đang dùng.

---

# 10. Master Plan

[§16.4](../../what-we-gonna-eat-today_master-plan_v2.1.md): gắn nhãn `S2` cho `E9-T2`, `E9-T4`, `E9-T5`; sửa DoD của `E9-T4` — **không** nhận `courseIndex`, trả ranh giới chặng (§1.4); ghi tiền đề "S2 bắt đầu sau khi E8-S2 commit".
