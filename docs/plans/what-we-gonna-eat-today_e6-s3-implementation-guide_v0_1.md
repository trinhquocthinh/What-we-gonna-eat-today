# 🕳️ Implementation Guide — E6 Slice S3: Trạng thái rỗng và chặn mở phiên

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-21`
> - **Upstream:** [Master Plan](../what-we-gonna-eat-today_master-plan_v1_0.md) (`E6-T1`, `E6-T4`) • [Design Criteria §4](../what-we-gonna-eat-today_design-criteria_v0_1.md) • [SDD](../what-we-gonna-eat-today_sdd_v0_1.md) (`SPEC-007`)
> - **Tiền đề:** S1 đã code (S-11, S-12 tồn tại để quét tới), S2 đã code (`InlineError`, `messageFor`).
>
> 🕳️ *Slice đi tìm những chỗ màn hình không có gì để nói. Bắt đầu bằng một lỗi đang sống: Group Hub bảo mọi nhóm rằng họ chưa có món nào.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E6-T1` | Toàn bộ trạng thái rỗng | 4 | Mọi `presentation/` | Mỗi trạng thái rỗng nêu **việc cần làm tiếp**, không để trống trơn |
| `E6-T4` | Chặn mở phiên khi nhóm chưa có món | 2 | `src/features/session/**`, `src/app/groups/[groupId]/sessions/new/**` | Nhóm mới thấy "Thêm món" thay vì "Mở phiên" — **và server cũng từ chối** |

- [ ] Lỗi §1.1 đã sửa: nhóm có món **không** còn đọc thấy "Trước tiên hãy thêm vài món"
- [ ] Bảng §3 quét đủ 13 màn, mỗi dòng có kết luận (đã có / thêm mới / không áp dụng)
- [ ] `createSession` trả `ERR_GROUP_HAS_NO_DISH` khi nhóm 0 món ACTIVE
- [ ] `DISH_EXAMPLES` chỉ còn **một** bản trong toàn repo
- [ ] `yarn verify && yarn arch:probe` xanh

---

# 1. Bốn phát hiện — đọc trước khi gõ

## 1.1 Lỗi đang sống: Group Hub nói với MỌI nhóm rằng họ chưa có món

[group-overview-screen.tsx](../../src/features/group/presentation/components/group-overview-screen.tsx) — khối này **không** được bọc trong điều kiện nào:

```tsx
        {activeSession === null ? null : (
          … khối "Phiên đang mở" …
        )}

        <EmptyStateCard
          title="Trước tiên hãy thêm vài món nhà bạn hay ăn."
          description="Chưa có món thì chưa mở phiên chọn được. Khoảng 15–20 món là đủ để bắt đầu."
        >
```

Một nhóm 32 món, đang có phiên chạy dở, vẫn đọc thấy câu đó ngay dưới khối "Phiên đang mở". Component **có** biến `hasDishes` và dùng nó ở hai chỗ khác (nhãn hàng "Danh mục món", đích của CTA đáy) — chỉ riêng thẻ này bị bỏ quên.

Đây là việc đầu tiên của slice, và là lý do `E6-T1` không phải task trang trí: **một trạng thái rỗng hiện sai còn tệ hơn không có trạng thái rỗng nào** — nó dạy người dùng bỏ qua chỗ đó.

Bọc lại theo đúng thứ tự ưu tiên ba trạng thái loại trừ nhau của S-04:

```
finalizedMeal !== null   → thẻ "đã chốt"        (S1 đã dựng)
activeSession !== null   → thẻ "phiên đang mở"  (E3-T6)
!hasDishes               → thẻ "chưa có món"    ← chỗ đang hỏng
ngược lại                → không thẻ nào
```

## 1.2 `DISH_EXAMPLES` đang có hai bản, và Design Criteria chỉ giao nó cho MỘT màn

Cùng một mảng ba món mẫu được khai hai lần:

- [dish-catalog-screen.tsx](../../src/features/dish/presentation/components/dish-catalog-screen.tsx) — đúng chỗ. Design Criteria §4 giao `S-05`: *"Empty state: 3 ví dụ món mẫu mờ trực quan"*.
- [group-overview-screen.tsx](../../src/features/group/presentation/components/group-overview-screen.tsx) — bản sao, đi cùng thẻ đang hỏng ở §1.1.

Design Criteria §4 giao cho `S-04` một việc **khác**: *"Nhóm chưa có món: **Chặn nút mở phiên, hướng dẫn thêm món**"* — hướng dẫn, không phải liệt kê ví dụ. Ví dụ món thuộc về nơi người dùng sắp gõ tên món.

→ Xoá `DISH_EXAMPLES` khỏi `group-overview-screen.tsx`; thẻ rỗng của S-04 chỉ còn một câu nêu tình trạng và một câu nêu việc cần làm, và CTA đáy đã là "Thêm món đầu tiên". Sau bước này `grep -rn "Cá basa kho tiêu" src` chỉ được ra một file.

## 1.3 `E6-T4` đã đạt DoD ở nửa UI — việc thật nằm ở server

DoD ghi *"Nhóm mới thấy 'Thêm món' thay vì 'Mở phiên'"*, và điều đó **đã đúng từ E1**:

```tsx
<Link href={hasDishes ? openSessionHref : dishesHref}>
  {hasDishes ? 'Mở phiên' : 'Thêm món đầu tiên'}
</Link>
```

Nhưng đó là rào bằng giao diện. [create-session.ts](../../src/features/session/application/create-session.ts) chỉ kiểm `findBlockingSessionToday`; không có điều kiện nào về số món. Ai gọi thẳng Server Action, hoặc gõ tay `/groups/<id>/sessions/new`, vẫn tạo được một phiên trên nhóm rỗng — rồi mở deck ra và thấy `TC-102` (Group 0 món ACTIVE, deck rỗng).

Ba việc cần làm, và một ràng buộc:

1. Thêm `ERR_GROUP_HAS_NO_DISH` vào `ErrorCode` **và vào `BASE_MESSAGES`** (S2 §3.2 — `satisfies` sẽ đỏ cho tới khi có câu dịch, đúng như thiết kế).
2. Thêm điều kiện vào `createSession`, **trước** `findBlockingSessionToday`: nhóm rỗng là lỗi cơ bản hơn "đã có phiên hôm nay".
3. **`session → dish` KHÔNG nằm trong `ALLOWED_CROSS_FEATURE`** ([eslint.config.mjs](../../eslint.config.mjs)). Nên phép đếm phải **tiêm từ `app/`**, đúng khuôn `assertAdmin` của `setSystemTags` (E2-T5) và `findInvalidParticipants` của `startSession` (E3-T1):

```ts
export type CreateSessionDeps = {
  readonly sessions: SessionRepository
  /** Truyền từ `app/` — `session` không được import `dish`. Cùng khuôn
   *  `findInvalidParticipants` của `startSession`. */
  readonly countActiveDishes: (groupId: string) => Promise<number>
}
```

Ở `app/groups/[groupId]/sessions/new/actions.ts`, `page.tsx` **đã** gọi `listGroupDishes` để biết `dishCount` — nhưng action thì chưa. Tiêm `async (gid) => (await listGroupDishes({ dishes: drizzleDishRepository }, gid)).length`, hoặc thêm `countActiveInGroup` vào `DishRepository` nếu muốn tránh tải cả danh sách. **Chọn cách thứ hai** — một nhóm có thể có 100 món và ta chỉ cần biết nó khác 0.

## 1.4 Design Criteria §4 là đặc tả của `E6-T1`, không phải `designs/README.md` §3

Master Plan `E6-T1` ghi nguồn tham chiếu là `[Design §3](designs/README.md)`. §3 của file đó là **Design Tokens & Typography** — không liên quan.

Đặc tả thật nằm ở [design-criteria_v0_1.md §4](../what-we-gonna-eat-today_design-criteria_v0_1.md), bảng 13 màn hình với cột *"Yêu cầu trạng thái đặc biệt"*. Đó là danh sách kiểm của slice này, chép vào §3 dưới đây.

Cùng loại trôi tham chiếu đã ghi nhận ở E5-S1 §1.5 (mã màn hình S-07/S-09/S-10 đánh theo tên file ảnh). Không tự sửa Master Plan trong lúc code — §11 ghi dòng cần sửa, làm cùng commit.

---

# 2. File tree

```
src/features/group/presentation/components/
  group-overview-screen.tsx      ~ SỬA — §1.1, §1.2
  group-overview-screen.test.tsx ~ SỬA — ca chống hồi quy (§4.1)
  group-list-screen.tsx          ~ SỬA — S-02 (§3.1)
  group-list-screen.test.tsx     ~ SỬA

src/features/rule/presentation/components/
  group-rules-screen.tsx         ~ SỬA — S-07 nêu HỆ QUẢ (§3.2)

src/features/meal/presentation/components/
  finalize-meal-screen.tsx       ~ SỬA — S-10 khi deck chưa ai vuốt (§3.3)
  final-meal-screen.tsx          ~ SỬA — S-11 (S1 đã đặt chỗ)

src/features/history/presentation/components/
  eating-history-screen.tsx      ~ SỬA — S-12 (S1 đã đặt chỗ)

src/shared/errors/
  index.ts                       ~ SỬA — ERR_GROUP_HAS_NO_DISH
  messages.ts                    ~ SỬA — câu dịch cho mã mới

src/features/dish/application/
  dish-repository.ts             ~ SỬA — countActiveInGroup (§5)
src/features/dish/infrastructure/
  drizzle-dish-repository.ts     ~ SỬA

src/features/session/application/
  create-session.ts              ~ SỬA — §5
  create-session.test.ts         ~ SỬA

src/app/groups/[groupId]/sessions/new/
  actions.ts                     ~ SỬA — tiêm countActiveDishes
```

---

# 3. Danh sách kiểm 13 màn — chép từ Design Criteria §4

Quét đủ bảng này và ghi kết luận cho **từng** dòng vào PR. Dòng "đã có" cũng phải mở màn hình ra nhìn, không suy từ trí nhớ.

| Màn | Yêu cầu (Design Criteria §4) | Hiện trạng | Việc |
| :---: | --- | --- | --- |
| `S-01` | Thông báo lỗi nếu đăng nhập fail | Chưa kiểm | Kiểm `login-screen.tsx`; lỗi OAuth dùng `InlineError` (S2) |
| `S-02` | Empty state: nút "Tạo nhóm" **&** "Dùng link mời" | Thẻ rỗng có, CTA "Dùng link mời" **thiếu** | §3.1 |
| `S-03` | Tự nhận diện múi giờ thiết bị | Đã có (`time-zone-field`) | Không đụng |
| `S-04` | Nhóm chưa có món: chặn nút mở phiên, hướng dẫn thêm món | **Hỏng** — thẻ hiện vô điều kiện | §1.1, §1.2 |
| `S-05` | Empty state: 3 ví dụ món mẫu mờ | Đã có, đúng | Không đụng |
| `S-06` | Phát hiện trùng: "Dùng món này" nổi bật hơn | Đã có (E2-T7) | Không đụng |
| `S-07` | Empty state nêu rõ **hệ quả** nếu không đặt rule | Có thẻ, nhưng nêu **lợi ích** chứ không nêu hệ quả | §3.2 |
| `S-08` | Lỗi thành viên rời nhóm hiện tại hàng | Đã có (E3-T2) | Đổi sang `InlineError` (S2 §4.2) |
| `S-09` | Hết món: gợi ý "Tôi chọn xong"; mất mạng: retry nền | Đã có (E4-T9, E4-T6) | Không đụng |
| `S-10` | Thiếu món bắt buộc: cảnh báo trên nút chốt | Đã có (E5-T9) | Thêm trạng thái "chưa ai vuốt" (§3.3) |
| `S-11` | Hiển thị danh sách món chính thức | S1 đã dựng | Hoàn thiện thẻ rỗng |
| `S-12` | Giải thích cơ chế lưu lịch sử để tránh lặp món | S1 đã dựng | Thẻ rỗng phải **giải thích cơ chế**, không chỉ nói "chưa có gì" |
| `S-13` | Hiện token hash và ngày hết hạn | Đã có (E2-T1) | Không đụng |

## 3.1 `S-02` — "Dùng link mời" không thể là một cái nút

[group-list-screen.tsx](../../src/features/group/presentation/components/group-list-screen.tsx) có sẵn một chỗ đặt trước đã cũ:

```tsx
{/* E2-T2: "Tôi có link mời" bật lên khi SPEC-004 có màn hình. */}
```

`SPEC-004` đã landed ở E2 — route `/join/[token]` tồn tại. Nhưng **không có màn "dán link mời"**: luồng tham gia bắt đầu bằng việc mở URL chứa token từ tin nhắn, không bằng việc gõ gì vào app.

Nên một nút "Dùng link mời" sẽ trỏ đi đâu? Không đâu cả. Dựng một nút dẫn tới ngõ cụt là đúng thứ `E6-T1` sinh ra để dọn.

→ Thay bằng **một câu chú thích** dưới nút "Tạo nhóm": *"Được mời rồi? Mở link trong tin nhắn là vào thẳng."* Nó trả lời đúng câu hỏi mà Design Criteria muốn trả lời (*"tôi được mời thì làm gì?"*) bằng phương tiện đúng với luồng thật. Xoá comment đặt chỗ — đặt chỗ đã hết việc thì phải đi.

## 3.2 `S-07` — nêu hệ quả, không nêu lợi ích

Câu hiện tại (E5-S1): *"Thêm quy định để lúc chốt bữa hệ thống nhắc bạn nếu mâm cơm còn thiếu món."* — đó là **lợi ích của việc đặt rule**.

Design Criteria §4 đòi *"nêu rõ **hệ quả** nếu không đặt rule"*. Hai câu khác nhau về hướng, và hướng "hệ quả" đúng hơn cho một trạng thái rỗng: người đang nhìn màn hình rỗng cần biết **hiện tại đang ra sao**, rồi mới cân nhắc có đổi không.

→ *"Chưa có quy định nào. Lúc chốt bữa sẽ không có gì được kiểm tra — thiếu canh hay thiếu món mặn cũng chốt được."*

Đây cũng là câu đúng về mặt sự thật: `evaluateRequired` với Rule Set rỗng trả `satisfied: true` (`TC-110`).

## 3.3 `S-10` — trạng thái "cả nhà chưa ai vuốt"

`finalize-meal-screen` (E5-S4) có mục "Chưa ai chọn" cho **từng món**, nhưng chưa có trạng thái cho tình huống **cả hai mục đều rỗng**: Creator mở màn tổng hợp ngay sau khi Start, chưa ai vuốt gì.

Hôm nay màn đó hiện hai tiêu đề mục trống trơn và một dải đáy ghi "Chưa chọn món nào" — không sai, nhưng không nói việc cần làm tiếp.

→ `ranked.length === 0 && untouched.length === 0` → `EmptyStateCard`: *"Chưa ai vuốt món nào. Đợi cả nhà chọn xong rồi quay lại, hoặc tự chọn món ngay bây giờ."* Giữ nguyên khay và nút chốt bên dưới — Creator **được** chốt mà không cần ai vuốt (`SPEC-015`: *"Cho phép chọn bất kỳ món nào trong nhóm, kể cả món chưa ai vuốt"*).

---

# 4. Sửa `group-overview-screen.tsx`

Ba trạng thái loại trừ nhau (§1.1). Viết thành một biến duy nhất thay vì ba điều kiện rải rác — ba điều kiện độc lập là cách trạng thái thứ tư ("hiện cả hai thẻ") lẻn vào:

```tsx
type HubState = 'finalized' | 'active' | 'no-dishes' | 'ready'

/**
 * BỐN trạng thái LOẠI TRỪ NHAU của S-04. Tính một lần, dùng ở cả thân màn
 * hình lẫn CTA đáy — E6-T1 sửa đúng lỗi sinh ra từ việc để chúng độc lập:
 * thẻ "chưa có món" từng render vô điều kiện, nên nhóm 32 món vẫn đọc thấy
 * "Trước tiên hãy thêm vài món".
 *
 * Thứ tự ưu tiên là thứ tự khẩn cấp của HÔM NAY: bữa đã chốt là tin quan
 * trọng nhất; phiên đang chạy là việc đang cần làm; chưa có món là rào cản;
 * còn lại là sẵn sàng mở phiên.
 */
function hubState(props: GroupOverviewScreenProps): HubState {
  if (props.finalizedMeal !== null) return 'finalized'
  if (props.activeSession !== null) return 'active'
  if (props.dishCount === 0) return 'no-dishes'
  return 'ready'
}
```

CTA đáy đọc từ cùng biến đó:

| `hubState` | Nhãn CTA | Đích |
| --- | --- | --- |
| `finalized` | Xem bữa hôm nay | `mealHref` |
| `active` | Vào lượt của bạn | `/sessions/<id>` |
| `no-dishes` | Thêm món đầu tiên | `dishesHref` |
| `ready` | Mở phiên | `openSessionHref` |

## 4.1 Test — ca chống hồi quy phải viết TRƯỚC

```tsx
it('nhóm CÓ món thì không hiện thẻ "chưa có món" — hồi quy E6-T1', () => {
  render(<GroupOverviewScreen {...baseProps} dishCount={32} />)

  expect(screen.queryByText(/Trước tiên hãy thêm vài món/)).toBeNull()
})

it('nhóm có món và đang có phiên thì cũng không hiện thẻ đó', () => {
  render(<GroupOverviewScreen {...baseProps} dishCount={32} activeSession={someSession} />)

  expect(screen.queryByText(/Trước tiên hãy thêm vài món/)).toBeNull()
  expect(screen.getByText('Phiên đang mở')).toBeInTheDocument()
})

it('nhóm 0 món vẫn hiện thẻ và CTA "Thêm món đầu tiên"', () => {
  render(<GroupOverviewScreen {...baseProps} dishCount={0} />)

  expect(screen.getByText(/Trước tiên hãy thêm vài món/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Thêm món đầu tiên' })).toBeInTheDocument()
})

it('không còn ví dụ món mẫu ở S-04 — chúng thuộc về S-05', () => {
  render(<GroupOverviewScreen {...baseProps} dishCount={0} />)

  expect(screen.queryByText('Cá basa kho tiêu')).toBeNull()
})
```

Ca đầu tiên **phải đỏ trước khi sửa**. Nếu nó xanh ngay, bạn đang render với `dishCount` mặc định bằng 0 — sửa `baseProps`.

---

# 5. `E6-T4` — nửa server

```ts
export type CreateSessionDeps = {
  readonly sessions: SessionRepository
  readonly countActiveDishes: (groupId: string) => Promise<number>
}

export async function createSession(deps, input) {
  // BR/SPEC-007 — nhóm rỗng không mở phiên được. Kiểm TRƯỚC
  // `findBlockingSessionToday`: "nhà chưa có món nào" là lỗi cơ bản hơn "hôm
  // nay đã có phiên rồi", và trả đúng lỗi cơ bản nhất là cách người dùng biết
  // phải làm gì tiếp.
  //
  // Rào ở UI đã có từ E1 (nút đổi thành "Thêm món đầu tiên"), nhưng đó là rào
  // giao diện: gõ tay `/groups/<id>/sessions/new` vẫn đi qua được. E6-T4 đóng
  // nốt đường đó.
  if ((await deps.countActiveDishes(input.groupId)) === 0) {
    return err(failure('ERR_GROUP_HAS_NO_DISH', { groupId: input.groupId }))
  }

  const blocking = await deps.sessions.findBlockingSessionToday(…)
  …
}
```

`DishRepository.countActiveInGroup(groupId): Promise<number>` — một câu `COUNT(*) … WHERE group_id = $1 AND state = 'ACTIVE'`. **Không** dùng lại `listActiveInGroup(groupId).length`: một nhóm có thể có hàng trăm món và câu hỏi ở đây chỉ là "có món nào không". Nhớ `Number()` cho `bigint` (bẫy đã ghi ở E5-S3 §6).

Câu dịch (S2 §3.2): `ERR_GROUP_HAS_NO_DISH: 'Thêm vài món vào nhóm trước khi mở phiên.'`

Test `create-session.test.ts`:

| Ca | Khẳng định |
| --- | --- |
| Nhóm 0 món | `ERR_GROUP_HAS_NO_DISH`; `findBlockingSessionToday` **không** được gọi |
| Nhóm có món | Hành vi cũ giữ nguyên — các test hiện có phải vẫn xanh |
| Thứ tự | Nhóm 0 món **và** đã có phiên hôm nay → vẫn trả `ERR_GROUP_HAS_NO_DISH` |

---

# 6. Rủi ro

| Rủi ro | Dấu hiệu sớm | Xử lý |
| --- | --- | --- |
| Sửa thẻ rỗng nhưng quên CTA đáy | Nhóm đã chốt vẫn thấy nút "Mở phiên" | §4 — một biến `hubState` cho cả hai |
| Quét "bằng trí nhớ" | Bảng §3 có dòng không ghi kết luận | Mở từng màn hình ra nhìn; dán ảnh vào PR nếu cần |
| `ERR_GROUP_HAS_NO_DISH` thiếu câu dịch | `tsc` đỏ ở `satisfies` của S2 | Đúng như thiết kế |
| `countActiveDishes` tải cả danh sách | — | `countActiveInGroup` ở repo, không `.length` (§5) |
| Đổi câu S-07 làm test E5 đỏ | `group-rules-screen.test.tsx` | Sửa test theo câu mới — thay đổi có chủ ý (§3.2) |

---

# 7. Test Cases coverage

| TC | Tầng | Ở đâu |
| --- | :---: | --- |
| `TC-026`→`TC-029` | `A` | `create-session.test.ts` — **chạy lại**, phải vẫn xanh |
| — | UI | §4.1 bốn ca hồi quy `E6-T1` |
| — | `A` | §5 ba ca `E6-T4` |

Test Cases Spec không có ca nào cho "nhóm rỗng không mở được phiên" — `E6-T4` là yêu cầu tới từ Design Criteria §4 chứ không từ một `SPEC-xxx`. Ghi nhận, không bịa mã `TC` mới.

---

# 8. Thứ tự TDD

1. `group-overview-screen.test.tsx` bốn ca §4.1 (ca đầu **phải đỏ**) → sửa component (xanh).
2. Xoá `DISH_EXAMPLES` khỏi `group-overview-screen.tsx` → `grep -rn "Cá basa kho tiêu" src` chỉ ra một file.
3. Thêm `ERR_GROUP_HAS_NO_DISH` vào `ErrorCode` → `tsc` đỏ ở `messages.ts` → thêm câu dịch (xanh).
4. `create-session.test.ts` ba ca §5 (đỏ) → `countActiveInGroup` + `createSession` + tiêm ở `actions.ts` (xanh).
5. Quét bảng §3 theo thứ tự `S-01` → `S-13`, mỗi màn một commit nhỏ nếu muốn.

---

# 9. Verify

## 9.1 Cổng máy

```bash
yarn verify && yarn arch:probe
```

## 9.2 Bằng chứng lỗi §1.1 đã chết hẳn

```bash
grep -rn "Cá basa kho tiêu" src
```

Chỉ được ra `dish-catalog-screen.tsx`. Rồi mở preview bằng một nhóm có món: câu *"Trước tiên hãy thêm vài món"* phải **không** xuất hiện ở bất kỳ trạng thái nào của Group Hub.

## 9.3 Bằng chứng `E6-T4` chặn ở cả hai tầng

1. Tạo nhóm mới, chưa thêm món nào. Group Hub hiện "Thêm món đầu tiên" — nửa UI.
2. Gõ tay `/groups/<id>/sessions/new` rồi bấm nút mở phiên → thấy *"Thêm vài món vào nhóm trước khi mở phiên."*, **không** có Session nào được tạo.

Bước 2 là phần `E6-T4` thật sự thêm vào. Nếu nó vẫn tạo được phiên, DoD chưa đạt bất kể nút ở bước 1 hiển thị đúng.

## 9.4 Đối chiếu bảng 13 màn

Dán bảng §3 vào PR với cột "Việc" đã điền kết luận cho từng dòng. Dòng nào ghi "không đụng" phải kèm một câu nói vì sao đã đủ.

---

# 10. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v1.1.md`

```markdown
# DEC-050 — S-04 Has Four Mutually Exclusive States; "Dùng link mời" Becomes a Caption, Not a Button

- **Ngày:** 2026-08-21
- **Trạng thái:** Accepted
- **Bối cảnh:** E6-S3

## Quyết định

1. `GroupOverviewScreen` tính MỘT biến `hubState: 'finalized' | 'active' | 'no-dishes' | 'ready'`
   dùng cho cả thân màn hình lẫn CTA đáy, thay cho các điều kiện độc lập.
2. Ví dụ món mẫu (`DISH_EXAMPLES`) chỉ còn ở S-05; S-04 nêu hướng dẫn, không liệt kê ví dụ.
3. Yêu cầu "nút Dùng link mời" của Design Criteria §4 cho S-02 dựng thành một CÂU CHÚ THÍCH,
   không phải nút.
4. `createSession` nhận dep `countActiveDishes` tiêm từ `app/`, trả `ERR_GROUP_HAS_NO_DISH`.

## Rationale

1. Thẻ "chưa có món" từng render vô điều kiện, nên nhóm 32 món vẫn đọc thấy "Trước tiên hãy
   thêm vài món". Ba điều kiện độc lập là cách trạng thái thứ tư lẻn vào; một biến thì không.
2. Design Criteria §4 giao ví dụ món cho S-05 ("3 ví dụ món mẫu mờ trực quan") và giao cho
   S-04 một việc khác ("chặn nút mở phiên, hướng dẫn thêm món"). Ví dụ thuộc về nơi người dùng
   sắp gõ tên món.
3. v1.0 không có màn "dán link mời" — luồng tham gia bắt đầu bằng việc mở URL từ tin nhắn. Một
   nút "Dùng link mời" sẽ không trỏ đi đâu cả. Câu chú thích trả lời đúng câu hỏi ("tôi được
   mời thì làm gì?") bằng phương tiện đúng với luồng thật.
4. Rào ở UI đã có từ E1 nhưng chỉ là rào giao diện; gõ tay URL vẫn tạo được phiên trên nhóm
   rỗng. `session → dish` không nằm trong ALLOWED_CROSS_FEATURE nên phép đếm tiêm từ `app/`,
   cùng khuôn `assertAdmin` (E2-T5) và `findInvalidParticipants` (E3-T1).

## Consequence

- `ErrorCode` lên 23 mã; `satisfies` của `messages.ts` ép có câu dịch ngay.
- Câu trạng thái rỗng của S-07 đổi từ nêu lợi ích sang nêu hệ quả, theo đúng chữ của
  Design Criteria §4.

## Affected Documents

- Master Plan §8 — `E6-T1` và `E6-T6` đang trỏ `designs/README.md` §3/§7; nguồn đúng là
  `design-criteria_v0_1.md` §4 và §8.
```

---

# 11. Master Plan

```markdown
| `[x] E6-T1` | Toàn bộ trạng thái rỗng (Empty States) | [Design Criteria §4](what-we-gonna-eat-today_design-criteria_v0_1.md) | … |
| `[x] E6-T4` | Chặn mở phiên khi nhóm chưa có món | `S-04`, [Design Criteria §4](what-we-gonna-eat-today_design-criteria_v0_1.md) | … |
```

Sửa luôn cột "Nguồn tham chiếu" của `E6-T1` (đang là `[Design §3](designs/README.md)`) và của `E6-T6` (đang là `[Design §7]`) — cả hai trỏ sai file, xem §1.4.
