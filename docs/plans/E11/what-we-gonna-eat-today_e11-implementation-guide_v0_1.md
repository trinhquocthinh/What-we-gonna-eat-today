# 🧹 Implementation Guide — E11: Vận hành tối thiểu

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-09-02`
> - **Upstream:** [Master Plan §16.6](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E11-T1`, `E11-T2`) • [SDD §8.5](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-034`, `SPEC-035`) • [Business Rules](../../what-we-gonna-eat-today_business-rules_v1.8.md) (`BR-005`, `BR-008`, `BR-055`, `BR-061`) • [Decision Log](../../what-we-gonna-eat-today_decision-log_v3.9.md) (`DEC-009`, `DEC-048`) • [Test Cases](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-020`, `TC-028`, `TC-108`, `TC-141`, `TC-142`, `TC-156`→`TC-158`)
> - **Tiền đề:** E9-S2 xong (`324a197`). E10 chưa cần — E11 không đụng file nào của nó.
>
> 🧹 *Epic cuối của v1.1. Nó không thêm màn hình nào đáng kể; nó làm cho hai giá trị enum vốn không tới được trở nên tới được — và khép lại một lỗ hổng khiến bữa của hôm qua chốt được vào hôm nay.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E11-T1` | Tự động đóng phiên quá hạn | 5.5 | `shared/time/**`, `session/**`, `meal/**`, `groups/[groupId]/page.tsx` | Phiên hôm qua chuyển `INVALID`, và **không chốt được** kể cả khi quét chưa chạy |
| `E11-T2` | Gỡ Dish khỏi danh mục nhóm | 3 | `dish/**`, `groups/[groupId]/dishes/**` | Admin gỡ được món; mục "Đã gỡ khỏi nhóm" có nút "Thêm lại" |

- [ ] Phiên `ACTIVE` của ngày cũ **không chốt được** dù quét chưa chạy (§1.2, `TC-156`)
- [ ] Câu quét là **idempotent** — chạy lần hai không khớp dòng nào (§1.4)
- [ ] Tương tác của phiên `INVALID` **giữ nguyên số dòng** (§1.5, `TC-157`)
- [ ] Chỉ Admin thấy nút "Gỡ"; `DishCatalogScreen` nhận `canEdit` (§1.6)
- [ ] `TC-020` và `TC-028` chạy lại **qua đường giao diện thật**, không dựng trạng thái bằng `INSERT` (§1.1)
- [ ] `yarn verify && yarn arch:probe && yarn test:integration` xanh

---

# 1. Sáu phát hiện — đọc trước khi gõ

## 1.1 Hai giá trị enum chưa bao giờ tới được, và hai Test Case đang dựa vào chúng

`grep` toàn bộ `src/features` và `src/app`: **không chỗ nào ghi `'INACTIVE'` hay `'INVALID'`**. Chúng chỉ xuất hiện trong union kiểu và comment.

Hệ quả thứ nhất: mọi mệnh đề `where(state = 'ACTIVE')` rải khắp codebase hiện là **no-op**. Chúng đúng, nhưng chưa từng lọc bỏ dòng nào.

Hệ quả thứ hai, quan trọng hơn: `TC-020` (*"Món đang `INACTIVE` trong Group → thêm lại"*) và `TC-028` (*"Có Session `INVALID` hôm nay → tạo phiên mới thành công"*) **không dựng được tiền điều kiện qua ứng dụng**. Chúng chỉ chạy nếu test tự `INSERT` trạng thái đó vào DB — tức chúng kiểm được **truy vấn**, nhưng không kiểm được rằng ứng dụng có đường nào **tạo ra** trạng thái ấy.

E11 đóng khoảng trống đó. DoD của cả hai subtask **bắt buộc** chạy lại hai ca này bằng cách đi qua giao diện thật, không phải bằng `INSERT`.

Bằng chứng cụ thể: hai chỗ duy nhất trong `src/` ghi `'INVALID'` đều nằm trong file test —
[`drizzle-session-repository.integration.test.ts:135`](../../../src/features/session/infrastructure/drizzle-session-repository.integration.test.ts) dựng thẳng `state: 'INVALID'` để chạy `TC-028`, và `add-participant.test.ts:87` dựng nó trong một mock. Không dòng production nào.

Tin tốt cho `E11-T2`: chiều `INACTIVE → ACTIVE` **đã xây xong** — `reactivateGroupDish(groupDishId)` có sẵn trong [`DishRepository`](../../../src/features/dish/application/dish-repository.ts), và `add-dish-to-group.ts` đã có nhánh khôi phục. `F27` chỉ là nửa còn lại của một cơ chế đã có một nửa.

## 1.2 Phiên bỏ dở vẫn CHỐT được — đó là cái hại thật, không phải "dữ liệu bẩn"

[`findBlockingSessionToday`](../../../src/features/session/infrastructure/drizzle-session-repository.ts) lọc `decision_date = <hôm nay>`, và [Group Hub](../../../src/app/groups/[groupId]/page.tsx) cũng vậy. Nên phiên `ACTIVE` bỏ dở từ hôm qua:

| | |
| --- | --- |
| Hiện trên Group Hub? | **Không** |
| Chặn tạo phiên hôm nay? | **Không** — partial unique index cũng theo `(group_id, decision_date)` |
| Mở được qua `/sessions/<id>`? | **Có** |
| Vuốt được? | **Có** |
| **Chốt được?** | **Có** — [`finalizeSession`](../../../src/features/meal/application/finalize-session.ts) bước 1 chỉ kiểm `state !== 'ACTIVE'` |

Chốt nó hôm nay ghi `eating_history` với `eatingDate = session.decisionDate` = **hôm qua**. Một bữa không xảy ra được ghi là đã xảy ra, và `computeRecencyPenalty` tin vào nó suốt bảy ngày sau — trừ điểm những món mà thật ra cả nhà chưa ăn.

Đó là lý do `BR-055` tồn tại. Viết DoD theo câu này, đừng viết "dọn dữ liệu bẩn".

## 1.3 Chốt chặn cứng cần "hôm nay", mà `meal` không import được `session`

Quét lười có thể chưa chạy khi ai đó mở thẳng `/sessions/<id cũ>` từ tab cũ rồi chốt. Nên `finalizeSession` cần một chốt **độc lập với nhịp quét**: `session.decisionDate < hôm nay` → từ chối.

Nhưng nó không biết "hôm nay". Nó cần `resolveDecisionDate(now, group.timezone)`, và hàm đó nằm ở `features/session/domain/decision-date.ts` — `meal → session` **không** có trong `ALLOWED_CROSS_FEATURE`, và không nên có.

**Chuyển `resolveDecisionDate` sang `src/shared/time/decision-date.ts`.** Ba lý do, lý do đầu là đủ:

1. **Không mã nào trong `features/session/` import nó.** Cả năm chỗ gọi đều ở `app/`:

   ```text
   src/app/groups/page.tsx
   src/app/groups/[groupId]/page.tsx
   src/app/groups/[groupId]/history/page.tsx
   src/app/groups/[groupId]/sessions/new/page.tsx
   src/app/groups/[groupId]/sessions/new/actions.ts
   ```

   Nó chưa bao giờ là kiến thức miền của `session`; nó là một tiện ích thời gian đặt nhầm chỗ.

2. Nó **đã import** [`shared/time/time-zone.ts`](../../../src/shared/time/time-zone.ts), và `shared/time/` đã chứa `format-vietnamese-date.ts`, `format-vietnamese-time.ts` — cùng họ, cùng bài toán.
3. Tiền lệ đúng khuôn: [`DEC-048`](../../what-we-gonna-eat-today_decision-log_v3.9.md) chuyển `SYSTEM_TAG_LABELS` sang `shared/ui` khi nhiều feature cần nó.

Kèm theo: `SessionForMeal` thêm `groupTimeZone`. `meal/infrastructure` join thêm bảng `groups` — đúng khuôn `findSystemTagsByGroupDish` đọc `group_dish_tags` mà không import feature `dish`: *"tầng infrastructure đang đọc một BẢNG, không mượn KIẾN THỨC MIỀN của feature khác."*

**Dùng lại `ERR_SESSION_NOT_ACTIVE`**, không thêm mã lỗi mới. Với người dùng, "phiên đã hết hạn" và "phiên không còn mở" là cùng một chuyện, và [`messages.ts`](../../../src/shared/errors/messages.ts) sẽ phải nuôi thêm một câu tiếng Việt gần như trùng.

> Đường thay thế nếu không muốn chuyển file: action tự tra `session → group → timezone` rồi truyền `referenceDate` vào `finalizeSession`. Tốn hai truy vấn thêm trên đường chốt bữa, và để lại một hàm ở `session/domain` mà `session` không dùng.

## 1.4 Quét lười là một phép GHI trong render — nên nó PHẢI idempotent

[Group Hub](../../../src/app/groups/[groupId]/page.tsx) là Server Component; `requireGroupContext` đọc cookie nên trang luôn dynamic và chạy mỗi request. Đặt một `UPDATE` ở đó là đặt một side effect vào đường render — điều React nói chung không bảo đảm chạy đúng một lần.

Chấp nhận được **với đúng một điều kiện**: câu lệnh bất biến theo số lần chạy.

```sql
UPDATE selection_sessions SET state = 'INVALID'
WHERE group_id = $1 AND state IN ('DRAFT','ACTIVE') AND decision_date < $2
```

Không đọc-rồi-ghi. Không phụ thuộc trạng thái trước đó. Không cần giao dịch. Chạy lần thứ hai không khớp dòng nào. **Ghi tính chất này vào doc comment của method** — nó là lý do duy nhất khiến chỗ đặt này hợp lệ, và người đọc sau sẽ hỏi đúng câu đó.

Gọi **trước** `findBlockingSessionToday` trong `page.tsx`, để trang thấy trạng thái sau khi quét.

**Không** thêm quét vào `/sessions/[sessionId]`: đó là đường tải màn vuốt và `NFR-01` (≤2.5s) đang canh nó. Chốt chặn ở `finalizeSession` (§1.3) đã phủ ca "mở thẳng phiên cũ rồi chốt", nên quét ở đó không thêm gì ngoài một lượt ghi.

## 1.5 `BR-061` tự đúng bằng cấu trúc — chỉ cần một test ghim

`BR-061` đòi tương tác của phiên `INVALID` **không bị xoá** nhưng **không tính vào phép nào**.

Rà lại: [`countInteractionsByDish(sessionId)`](../../../src/features/selection/application/selection-repository.ts) và `listRankingParticipantUserIds(sessionId)` đều lọc theo **một** `sessionId`. Nên tương tác của phiên `INVALID` không bao giờ lọt vào bảng xếp hạng của phiên khác — kể cả trước E11.

`E11-T1` **không viết gì** cho `BR-061`. Nhưng viết một test ghim: chuyển một phiên có tương tác sang `INVALID`, rồi khẳng định `interactions` **vẫn còn nguyên số dòng**. Cùng tinh thần `E8-T4` ghim bất biến đóng băng — một quy tắc đúng-tình-cờ và một quy tắc đúng-có-bảo-đảm khác nhau ở chỗ có test hay không.

## 1.6 `DishCatalogScreen` không có prop quyền nào — và điều đó đang gây một lỗi nhỏ

[`GroupRulesScreen`](../../../src/features/rule/presentation/components/group-rules-screen.tsx) có `canEdit: boolean`, kèm comment *"Member vẫn XEM được quy định; chỉ Admin mới thấy nút sửa (BR-010)"*, và [`rules/page.tsx`](../../../src/app/groups/[groupId]/rules/page.tsx) tính nó bằng một `assertGroupAccess` thứ hai với `requiredRole: 'ADMIN'`.

[`DishCatalogScreen`](../../../src/features/dish/presentation/components/dish-catalog-screen.tsx) **không có prop nào như vậy**, và [`dishes/page.tsx`](../../../src/app/groups/[groupId]/dishes/page.tsx) chỉ gọi `requireGroupContext` (mức MEMBER).

Hệ quả đang sống: `setSystemTagsAction` **đòi Admin** ([actions.ts](../../../src/app/groups/[groupId]/dishes/actions.ts) truyền `requiredRole: 'ADMIN'`), nhưng màn hình hiện sheet sửa nhãn cho **mọi Member**. Một Member mở sheet, chọn nhãn, bấm lưu — rồi mới nhận lỗi quyền. Nút bị chặn ở server nhưng không bị ẩn ở client.

`E11-T2` cần `canEdit` cho nút "Gỡ", và thêm nó **sửa luôn** chỗ lệch trên. Chép đúng khuôn `rules/page.tsx`:

```ts
const admin = await assertGroupAccess(
  { memberships: drizzleMembershipRepository },
  { userId: user.id, groupId, requiredRole: 'ADMIN' },
)
// … <DishCatalogScreen canEdit={admin.ok} … />
```

**Không** đổi sang `requireGroupAdminContext`: một Member vào trang danh mục phải **thấy** món của nhà mình, không gặp 404 — đúng lý lẽ đã ghi ở `rules/page.tsx`.

---

# 2. File tree

```text
src/shared/time/
├── decision-date.ts              # E11-T1 — CHUYỂN TỪ features/session/domain/
└── decision-date.test.ts

src/features/session/
├── application/session-repository.ts        # E11-T1 — invalidateExpiredSessions
└── infrastructure/drizzle-session-repository.ts

src/features/meal/
├── application/meal-repository.ts           # E11-T1 — SessionForMeal.groupTimeZone
├── application/finalize-session.ts          # E11-T1 — chốt chặn bước 1
└── infrastructure/drizzle-meal-repository.ts

src/features/dish/
├── application/dish-repository.ts           # E11-T2 — deactivate + listInactive
├── application/remove-dish-from-group.ts    # E11-T2 — MỚI
├── application/remove-dish-from-group.test.ts
├── infrastructure/drizzle-dish-repository.ts
└── presentation/components/dish-catalog-screen.tsx  # E11-T2 — canEdit, mục "Đã gỡ"

src/app/groups/[groupId]/
├── page.tsx                      # E11-T1 — gọi quét lười
├── dishes/page.tsx               # E11-T2 — tính canEdit
└── dishes/actions.ts             # E11-T2 — removeDishAction, reAddDishAction
```

---

# 3. `E11-T1` — Tự động đóng phiên quá hạn

## 3.1 Chuyển `resolveDecisionDate` sang `shared/time/`

`git mv src/features/session/domain/decision-date.ts src/shared/time/decision-date.ts` (kèm file test). Sửa năm chỗ import ở §1.3 — `tsc` sẽ liệt kê đủ.

Giữ nguyên nội dung hàm. Sửa doc comment: bỏ câu ngụ ý nó thuộc `session`, thêm một dòng nói vì sao nó ở `shared/` (cả `session` lẫn `meal` đều cần, `DEC-048`).

`vitest.config.mts` đo coverage `src/shared/time/**` — file này vốn đã có test đầy đủ (`TC-004`, `TC-005`), nên chuyển sang không làm tụt ngưỡng.

## 3.2 Quét lười

```ts
/**
 * SPEC-034 / BR-055 — đóng mọi phiên quá hạn của một Group.
 *
 * IDEMPOTENT: một câu UPDATE thuần, không đọc-rồi-ghi, không phụ thuộc trạng
 * thái trước đó. Chạy lần thứ hai không khớp dòng nào. Đó là lý do DUY NHẤT
 * khiến gọi nó trong render của một Server Component là hợp lệ (Guide §1.4) —
 * đừng thêm bước đọc nào vào đây.
 *
 * `referenceDate` do người gọi quy đổi qua `resolveDecisionDate(now, group.timezone)`;
 * hàm này không tự biết timezone, cùng kỷ luật đã áp cho `computeRecencyPenalty`.
 */
invalidateExpiredSessions(groupId: string, referenceDate: string): Promise<void>
```

Gọi trong `groups/[groupId]/page.tsx` ngay sau khi có `decisionDate`, **trước** `findBlockingSessionToday`.

## 3.3 Chốt chặn cứng ở `finalizeSession`

`SessionForMeal` thêm `groupTimeZone: string`; `findSessionForMeal` join `groups`.

Bước 1 hiện là:

```ts
if (session === null || session.state !== 'ACTIVE') {
  return err(failure('ERR_SESSION_NOT_ACTIVE', { sessionId: input.sessionId }))
}
```

Thêm một điều kiện vào **cùng** nhánh đó — không thêm nhánh thứ hai với mã lỗi khác (§1.3):

```ts
const today = resolveDecisionDate(new Date(), session.groupTimeZone)
if (session === null || session.state !== 'ACTIVE' || session.decisionDate < today) {
  return err(failure('ERR_SESSION_NOT_ACTIVE', { sessionId: input.sessionId }))
}
```

So sánh chuỗi `YYYY-MM-DD` trùng với so sánh thời gian — cùng nhận xét đã ghi ở [`recency.ts`](../../../src/features/history/domain/recency.ts), không cần parse.

> [!NOTE]
> `new Date()` trong một use case là ngoại lệ có chủ đích, không phải sơ suất. Mọi hàm `domain/` vẫn nhận `now`/`referenceDate` qua tham số; `finalizeSession` là `application/`, và ở đây "hôm nay" là **một phần của phép kiểm quyền chốt**, không phải một tham số nghiệp vụ mà người gọi được chọn. Cho phép caller truyền `now` vào chính là cho phép nó bỏ qua chốt chặn.

## 3.4 Test

| Ca | Tầng | Kỳ vọng |
| --- | :---: | --- |
| `TC-141` | `I` | Phiên `ACTIVE` của hôm qua + mở Group Hub → phiên chuyển `INVALID`; phiên hôm nay tạo được |
| `TC-156` | `A` | Phiên `ACTIVE`, `decisionDate` = hôm qua, quét **chưa chạy** → `finalizeSession` trả `ERR_SESSION_NOT_ACTIVE`, `commitFinalize` **không** được gọi |
| `TC-157` | `I` | Phiên có 5 dòng `interactions` → quét → `state = 'INVALID'` và `interactions` **vẫn đúng 5 dòng** (`BR-061`, §1.5) |
| `TC-028` | `I` | **Qua giao diện thật:** để phiên hôm qua treo, mở Group Hub (quét chạy), rồi tạo phiên hôm nay → thành công (§1.1) |
| — | `I` | Gọi `invalidateExpiredSessions` hai lần liên tiếp → lần hai không đổi gì (§1.4) |
| — | `I` | Phiên `FINALIZED` của hôm qua → quét **không** đụng tới |

Ca cuối canh mệnh đề `state IN ('DRAFT','ACTIVE')`: một bữa đã chốt hôm qua là dữ liệu đúng, không phải rác.

---

# 4. `E11-T2` — Gỡ Dish khỏi danh mục

## 4.1 Port

```ts
/** BR-005 — gỡ món khỏi nhóm. KHÔNG xoá dòng: lịch sử ăn và tương tác cũ vẫn
 *  phải tra ngược được (DEC-009). Chiều ngược đã có sẵn: `reactivateGroupDish`. */
deactivateGroupDish(groupDishId: string): Promise<void>

/** BR-005 — món đã gỡ, cho mục "Đã gỡ khỏi nhóm" của S-05.
 *
 *  RIÊNG method chứ không thêm tham số vào `listActiveInGroup`: tên hàm đó nói
 *  đúng thứ nó làm, và mọi chỗ gọi hiện tại đều muốn đúng tập ACTIVE. Hai truy
 *  vấn thay vì một `WHERE state = ANY(...)` là chuyện không đo được ở quy mô
 *  một nhóm gia đình. */
listInactiveInGroup(groupId: string): Promise<GroupDishListItem[]>
```

`countActiveInGroup` **không đổi** — gỡ hết món thì đúng là không mở phiên được nữa (`ERR_GROUP_HAS_NO_DISH` của `createSession`).

## 4.2 Use case

```ts
export async function removeDishFromGroup(
  deps: { readonly dishes: DishRepository; readonly assertAdmin: (…) => Promise<Result<void, Failure>> },
  input: { readonly groupId: string; readonly groupDishId: string; readonly requestedByUserId: string },
): Promise<Result<void, Failure>>
```

Thứ tự bất biến: quyền → tồn tại & đang ACTIVE → ghi. Đúng khuôn [`setSystemTags`](../../../src/features/dish/application/set-system-tags.ts), kể cả cách `assertAdmin` được truyền từ `app/` (feature `dish` không import `group`).

Món không tồn tại hoặc đã `INACTIVE` → `ERR_DISH_NOT_IN_POOL`. Gỡ một món đã gỡ là thao tác không làm gì, nhưng trả lỗi rõ vẫn tốt hơn im lặng thành công — người dùng đang nhìn một danh sách cũ.

Thêm lại thì **không** cần use case mới: `reactivateGroupDish` đã có, và nút "Thêm lại" gọi qua một action mỏng cũng đòi Admin.

> [!CAUTION]
> **Gỡ món KHÔNG được đụng `group_dish_tags`.** [`reactivateGroupDish`](../../../src/features/dish/infrastructure/drizzle-dish-repository.ts) chỉ lật `state`; `deactivateGroupDish` phải đối xứng. Xoá nhãn khi gỡ sẽ khiến món thêm lại rơi vào "Chưa phân nhãn" — đúng thứ [`DEC-053`](../../what-we-gonna-eat-today_decision-log_v3.9.md) đã chống cho luồng dùng lại món ở `M1-T2`.
>
> `SPEC-035` trước E11 ghi *"Thêm lại là tạo dòng mới, không khôi phục tag cũ"*. Câu đó **sai**: `group_dishes_group_global_unique(group_id, global_dish_id)` khiến dòng thứ hai không tồn tại được, và `TC-020` khẳng định ngược lại. Spec đã được sửa cùng lúc với guide này.

## 4.3 Giao diện

`DishCatalogScreen` thêm `canEdit: boolean` (§1.6) và `inactiveDishes: GroupDishListItem[]`.

- Nút **"Gỡ"** trên mỗi món ACTIVE, chỉ khi `canEdit`.
- Mục **"Đã gỡ khỏi nhóm"** dưới danh sách chính, mỗi dòng có nút **"Thêm lại"** (chỉ khi `canEdit`). Mục ẩn hẳn khi rỗng — không dựng `EmptyStateCard` riêng.
- **Xoá comment** *"CỐ Ý chưa có: nhóm 'Đã gỡ khỏi nhóm' (F27/v1.1)"* ở đầu file.
- Sheet sửa nhãn cũng đặt sau `canEdit` — sửa luôn chỗ lệch ở §1.6.

Vùng chạm ≥ 44px (`NFR-03`); trạng thái không truyền tải chỉ bằng màu (`E6-T6`) — mục "Đã gỡ" có **tiêu đề chữ**, không chỉ tô nhạt.

## 4.4 Món bị gỡ giữa phiên — không viết gì thêm

Deck materialize một lần; `list-deck.ts` lọc qua `eligibleById` nên món hết `ACTIVE` rơi khỏi trang đọc kế tiếp. `TC-108` đã canh chuyện này từ v1.0 và `SPEC-028` đã ghi.

`E11-T2` **không** đụng `selection`. Nếu thấy mình đang sửa `list-deck.ts`, đã đi lạc.

## 4.5 Test

| Ca | Tầng | Kỳ vọng |
| --- | :---: | --- |
| `TC-142` | `I` | Gỡ món → `state = 'INACTIVE'`, dòng **vẫn còn**; thêm lại → dòng cũ chuyển `ACTIVE`, **không** dòng mới |
| — | `A` | Member (không Admin) gọi `removeDishFromGroup` → `ERR_NOT_GROUP_ADMIN`, không ghi gì |
| — | `A` | Gỡ món đã `INACTIVE` → `ERR_DISH_NOT_IN_POOL` |
| `TC-020` | `I` | **Qua giao diện thật:** gỡ món, rồi thêm lại bằng ô tìm kiếm → không tạo Global Dish mới (§1.1) |
| — | component | `canEdit = false` → **không** có nút "Gỡ", **không** có nút "Thêm lại", **không** mở được sheet sửa nhãn |
| — | `I` | Gỡ hết món của nhóm → `createSession` trả `ERR_GROUP_HAS_NO_DISH` |

Ca cuối canh việc `countActiveInGroup` giữ nguyên nghĩa (§4.1).

---

# 5. Rủi ro

| Rủi ro | Dấu hiệu | Xử lý |
| --- | --- | --- |
| Chỉ quét, không chốt chặn | Mở tab cũ rồi chốt vẫn ghi lịch sử ăn ngày hôm qua | §1.3, `TC-156` |
| Quét không idempotent | Thêm một bước đọc vào method, hoặc dùng giao dịch | §1.4 |
| Thêm mã lỗi mới cho phiên hết hạn | `messages.ts` nuôi thêm một câu gần trùng | §1.3 — dùng `ERR_SESSION_NOT_ACTIVE` |
| Quét chạm cả `FINALIZED` | Bữa đã chốt hôm qua bị đánh dấu `INVALID` | §3.4 ca cuối |
| Nới `listActiveInGroup` thành `listInGroup(state?)` | Mọi chỗ gọi phải rẽ nhánh trên một tham số | §4.1 |
| Quên `canEdit` cho sheet sửa nhãn | Member vẫn mở sheet rồi nhận lỗi quyền — lỗi cũ còn nguyên | §1.6 |
| Sửa `list-deck.ts` cho món bị gỡ | Trùng việc với `TC-108` | §4.4 |
| Dựng `TC-020`/`TC-028` bằng `INSERT` | Vẫn không chứng minh được ứng dụng tạo ra trạng thái đó | §1.1 |

---

# 6. Test Cases coverage

`TC-141`, `TC-156`, `TC-157`, `TC-028` §3.4 • `TC-142`, `TC-020`, `TC-158` §4.5 • `TC-108` — không đụng, đã có (§4.4).

---

# 7. Thứ tự TDD

1. `git mv` `decision-date.ts` sang `shared/time/`; sửa 5 import → `yarn verify` xanh trở lại. Chưa đổi hành vi nào.
2. `invalidateExpiredSessions` + integration `TC-141`, ca idempotent, ca `FINALIZED` (đỏ → xanh).
3. Gọi quét trong Group Hub; chạy `TC-028` qua giao diện.
4. `SessionForMeal.groupTimeZone` → chốt chặn ở `finalizeSession` → `TC-156` (đỏ → xanh).
5. `TC-157` ghim `BR-061`.
6. `deactivateGroupDish` + `listInactiveInGroup` + `removeDishFromGroup` với test tầng `A` (đỏ → xanh).
7. `canEdit` + mục "Đã gỡ" + hai action; test component.
8. `TC-020` qua giao diện; `TC-142`.
9. `yarn verify && yarn arch:probe && yarn test:integration`.

Bước 1 đứng riêng và đi trước có chủ đích: nó là một phép di chuyển thuần, không đổi hành vi, và trộn nó vào một commit có logic mới sẽ làm diff không đọc được.

---

# 8. Verify

## 8.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn test:integration
```

## 8.2 Bằng chứng phiên hôm qua không chốt được

Cần dữ liệu của "hôm qua". Đặt `decision_date` lùi một ngày bằng `yarn db:studio` trên một phiên `ACTIVE` thật, rồi:

1. Mở thẳng `/sessions/<id>` — trang vẫn vào được (chưa quét).
2. Chọn món, bấm "Chốt bữa" → **bị chặn**, thông điệp "phiên không còn mở".
3. Về `/groups/<id>` — quét chạy. `yarn db:studio`: phiên đó nay `INVALID`, và bảng `interactions` **vẫn nguyên số dòng**.
4. Mở phiên mới hôm nay → thành công.

Bước 2 là bằng chứng chốt chặn hoạt động **độc lập với quét** — nó là thứ không suy ra được từ bước 3.

## 8.3 Bằng chứng gỡ và thêm lại

1. Vào danh mục bằng tài khoản **Member** (không Admin): **không** thấy nút "Gỡ", **không** mở được sheet sửa nhãn.
2. Đổi sang Admin: gỡ "Canh chua" → món biến khỏi danh sách chính, xuất hiện dưới **"Đã gỡ khỏi nhóm"**.
3. Mở một phiên mới: "Canh chua" **không** có trong deck.
4. Bấm "Thêm lại" → món về danh sách chính. `yarn db:studio`: `group_dishes` **vẫn đúng một dòng** cho món đó, `state` quay lại `ACTIVE`.

Bước 4 là bằng chứng `DEC-009` được giữ: thêm lại là hồi sinh dòng cũ, không tạo dòng mới.

---

# 9. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v3.9.md`

```markdown
# DEC-068 — `resolveDecisionDate` Về `shared/time/`; Quét Lười Ở Group Hub Kèm Chốt Chặn Ở Finalize

- **Ngày:** 2026-09-02
- **Trạng thái:** Accepted
- **Bối cảnh:** E11

## Quyết định

1. `resolveDecisionDate` chuyển từ `features/session/domain/` sang `shared/time/`.
2. Phiên quá hạn được đóng bằng một phép quét LƯỜI ở Group Hub, cộng một CHỐT
   CHẶN độc lập trong `finalizeSession`.
3. Câu quét là một `UPDATE` idempotent; không cron, không tiến trình nền.
4. Phiên hết hạn dùng lại `ERR_SESSION_NOT_ACTIVE`, không thêm mã lỗi mới.
5. `listInactiveInGroup` là method riêng, không nới `listActiveInGroup`.

## Rationale

1. Không mã nào trong `features/session/` import hàm đó — cả năm chỗ gọi đều ở
   `app/`. Nó đã import `shared/time/time-zone.ts` và ngồi cùng họ với
   `format-vietnamese-date.ts`. Giữ nó ở `session/domain` là lý do duy nhất
   khiến `meal` không kiểm được "hôm nay", và nới `ALLOWED_CROSS_FEATURE` thêm
   chiều `meal → session` để lấy một hàm quy đổi ngày là đổi hợp đồng kiến trúc
   để tránh một lần chuyển file — đúng thứ `DEC-040` đã bác bỏ một lần.
2. Quét đơn thuần không đủ: ai mở tab cũ rồi chốt vẫn ghi `eating_history` mang
   ngày hôm qua, và Cooldown tin vào nó bảy ngày. Chốt chặn giữ đúng đắn KHÔNG
   phụ thuộc nhịp quét; quét giữ dữ liệu sạch mà không cần ai chốt.
   Group Hub được ghé thường xuyên hơn hẳn "mở phiên mới"; trang phiên thì
   không đặt quét vì `NFR-01` đang canh đường đó.
3. Quy mô sản phẩm là vài nhóm gia đình. Một tiến trình nền cho việc mà một câu
   UPDATE trong render làm được là hạ tầng cho một nhu cầu chưa tồn tại — miễn
   câu lệnh bất biến theo số lần chạy.
4. Với người dùng, "phiên đã hết hạn" và "phiên không còn mở" là cùng một
   chuyện. Một mã lỗi thứ hai buộc `messages.ts` nuôi một câu gần trùng.
5. `listActiveInGroup` nói đúng thứ nó làm và mọi chỗ gọi đều muốn tập ACTIVE.
   Thêm tham số `state?` bắt tất cả rẽ nhánh để phục vụ đúng một chỗ gọi mới.

## Consequence

- `TC-020` và `TC-028` lần đầu dựng được tiền điều kiện qua ứng dụng thật, thay
  vì bằng `INSERT` trong test.
- `SessionForMeal` thêm `groupTimeZone`; `meal/infrastructure` join bảng `groups`
  — đọc một BẢNG, không mượn kiến thức miền, cùng khuôn `findSystemTagsByGroupDish`.
- `DishCatalogScreen` nhận `canEdit`, và điều đó sửa luôn một lệch có sẵn: sheet
  sửa nhãn đang hiện cho mọi Member trong khi `setSystemTagsAction` đòi Admin.
- `new Date()` xuất hiện trong `finalizeSession` — ngoại lệ có chủ đích, vì
  "hôm nay" ở đây là một phần của phép kiểm quyền chốt, không phải tham số
  nghiệp vụ mà người gọi được chọn.
```

---

# 10. Master Plan

[§16.6](../../what-we-gonna-eat-today_master-plan_v2.1.md): `E11-T1` 5h → 5.5h (phép chuyển `resolveDecisionDate`); DoD hai subtask viết lại theo §1.2 và §1.6; ghi rõ `TC-020`/`TC-028` phải chạy qua giao diện thật.
