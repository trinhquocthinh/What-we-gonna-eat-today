# 🍽️ Implementation Guide — E6 Slice S1: Bữa đã chốt và lịch sử ăn

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-21`
> - **Upstream:** [Master Plan](../what-we-gonna-eat-today_master-plan_v2.1.md) (`E6-T7`, `E6-T8`) • [SDD](../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-016`, `SPEC-017`, `SPEC-018`) • [Business Rules](../what-we-gonna-eat-today_business-rules_v1.7.md) (`BR-050`, `BR-056`) • [Design Criteria §4](../what-we-gonna-eat-today_design-criteria_v1.0.md) • [Test Cases](../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`MS-01`)
> - **Ảnh tham chiếu:** [s11-01-bua-hom-nay.png](../designs/screenshots/s11-01-bua-hom-nay.png) • [s12-02-lich-su.png](../designs/screenshots/s12-02-lich-su.png) • [s04-04-da-chot.png](../designs/screenshots/s04-04-da-chot.png)
> - **Tiền đề:** E5 đã xong trọn (mốc M5) — `finalizeSession` chạy đủ 7 bước, `eating_history` có dữ liệu thật.
>
> 🍽️ *Slice mở đầu E6, và là slice duy nhất của epic này thêm màn hình mới. Lý do nó tồn tại: chốt bữa xong hiện không có chỗ nào xem lại kết quả.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E6-T7` | Màn S-11 "Bữa ăn hôm nay" + trạng thái "đã chốt" của S-04 | 3 | `src/features/meal/**`, `src/app/sessions/[sessionId]/meal/**` | Chốt xong quay về Group Hub thấy ngay mâm cơm, bấm vào xem được chi tiết |
| `E6-T8` | Màn S-12 "Lịch sử ăn" | 2.5 | `src/features/history/**`, `src/app/groups/[groupId]/history/**` | Thấy 30 ngày gần đây, nhóm theo ngày, ngày mới nhất trên cùng |

- [ ] `MS-01` chạy trọn được: tạo nhóm → thêm món → mở phiên → vuốt → chốt → **thấy thực đơn Final Meal và lịch sử ăn cá nhân**
- [ ] Group Hub ở trạng thái `FINALIZED` **không** còn hiện nút "Mở phiên" dẫn tới ngõ cụt (§1.1)
- [ ] Giờ chốt hiển thị theo **timezone của Group**, không theo giờ máy chủ (§1.3)
- [ ] Không có chuỗi "Tôi không ăn món này", "Sửa món đã chốt" nào trên màn hình (§1.2)
- [ ] `yarn verify && yarn arch:probe && yarn test:integration` xanh

> [!NOTE]
> **`E6-T7` và `E6-T8` là subtask BỔ SUNG, không có trong Master Plan v1.6.** §1.1 giải thích vì sao thiếu chúng thì `E6-T3` không hoàn thành được. §11 ghi block Decision Log, §12 ghi dòng phải thêm vào Master Plan.

---

# 1. Năm phát hiện — đọc trước khi gõ

## 1.1 `MS-01` không pass được, và Group Hub đang có một ngõ cụt thật

`E6-T3` DoD đòi chạy `MS-01`→`MS-05`. `MS-01` ghi kết quả kỳ vọng nguyên văn:

> Thấy thực đơn Final Meal **và lịch sử ăn cá nhân**

Không thứ nào trong hai thứ đó có đường vào code sau E5:

- Không route nào dưới `src/app/` cho S-11 hay S-12.
- [meal-repository.ts](../../src/features/meal/application/meal-repository.ts) chỉ có `getDraft` — đọc **nháp**, không đọc một Final Meal đã chốt kèm tên món và người chốt.
- [history-repository.ts](../../src/features/history/application/history-repository.ts) có `findEatingDates` (cho `SPEC-020`) và `countRecentEatersByDish` (cho `SPEC-014`) — cả hai trả `globalDishId`, **không trả tên món**, vì cả hai đều để tính toán chứ không để hiển thị.

Và có một ngõ cụt đang sống. [groups/[groupId]/page.tsx](../../src/app/groups/[groupId]/page.tsx) dựng `activeSessionOverview` **chỉ khi** `blockingSession.state === 'ACTIVE'`:

```ts
const [activeSessionOverview, sessionForStart] =
  blockingSession !== null && blockingSession.state === 'ACTIVE'
    ? await Promise.all([...])
    : [null, null]
```

Phiên `FINALIZED` rơi vào nhánh `[null, null]` → `GroupOverviewScreen` nhận `activeSession: null` → hiện CTA **"Mở phiên"**. Bấm vào thì `createSession` trả `ERR_SESSION_EXISTS_TODAY`, và `openSessionAction` redirect về `/sessions/<id>` — tức là màn deck của một phiên đã chốt. Người dùng vừa chốt bữa xong, quay về trang chủ, và được mời mở lại đúng cái phiên vừa chốt.

Đây không phải "thiếu màn đẹp". Đây là luồng chính bị đứt ở bước cuối.

## 1.2 Bốn thứ trong mockup S-11/S-12 thuộc v1.1/v1.2

| Trong ảnh | Là gì | Phiên bản |
| --- | --- | :---: |
| "Tôi không ăn món này" — cạnh **mỗi** món ở S-11 | `F15` Cannot Eat | v1.1 |
| "Sửa món đã chốt" — nút ở cả S-11 lẫn S-04 | `F40` Sửa Final Meal | v1.2 |
| Banner *"Bố không ăn được cá basa — Mẹ đã biết và vẫn chốt"* | `F15` + `F24` Lưu vết cảnh báo | v1.1 |
| *"Bạn đã bỏ Gà chiên nước mắm khỏi lịch sử của mình"* — S-12 | `F28` Sửa lịch sử ăn | v1.1 |

Bỏ cả bốn, cùng lối đã dùng cho mục "Nên có" ở E5-S1 §1.4 và ô "không ăn được" ở E5-S4 §1.2. Dòng chân trang *"Chỉ Mẹ sửa được món của cả nhà"* và *"Chỉ sửa được lịch sử của ngày hôm nay"* cũng đi theo — chúng chỉ có nghĩa khi có nút sửa.

**v1.0 của S-11 còn lại:** header ngày + "Bữa tối nay" + nút "Đóng"; một thẻ chứa *"Mẹ chốt lúc 17:42"*, danh sách tên món (chữ lớn) kèm nhãn tag dưới mỗi món, và dòng *"Bốn người tham gia chọn: Bạn · Mẹ · Bố · Em Trâm"*.

**v1.0 của S-12 còn lại:** header *"Nhà Bảy Hiền · 30 ngày gần đây"* + "Lịch sử ăn" + "Đóng"; mỗi ngày một thẻ, tiêu đề ngày kèm số món, bên trong là tên món.

## 1.3 "Lúc 17:42" phải đọc theo timezone của Group — đây là bẫy thật

`selection_sessions.finalized_at` là `timestamptz`. Render nó bằng `toLocaleTimeString()` trần sẽ ra giờ của **máy chủ Vercel** (UTC), không phải giờ của gia đình. Một bữa tối chốt lúc 17:42 giờ Việt Nam sẽ hiện "10:42".

Dự án đã giải đúng bài này một lần rồi cho ngày (`SPEC-018` → `resolveDecisionDate(now, group.timezone)`), nhưng chưa có helper nào cho **giờ**. Thêm `src/shared/time/format-vietnamese-time.ts`:

```ts
export function formatVietnameseTime(instant: Date, timeZone: string): string
```

`timeZone` là tham số bắt buộc, không có giá trị mặc định — cùng nguyên tắc đã ghi ở `format-vietnamese-date.ts` (*"người gọi đã quy đổi… nên ở đây không còn timezone nào len vào được và test không phải mock gì"*). `page.tsx` có sẵn `group.timezone` qua `requireGroupContext`.

Đối chiếu: `new Date('2026-08-16T10:42:00Z')` + `'Asia/Ho_Chi_Minh'` → `"17:42"`.

## 1.4 Lịch sử ăn thuộc về USER, nhưng route đặt dưới Group — và đó là lựa chọn, không phải nhầm

`BR-056` + [schema.ts](../../src/shared/db/schema.ts): `eating_history` trỏ `global_dish_id`, **không** trỏ `group_dish_id`, và không có cột `group_id`. Ghi chú trong schema nói rõ lý do: *"Eating History thuộc về User chứ không thuộc Group… để `F43` multi-group sau này collapse được"*.

Nhưng header trong mockup ghi *"Nhà Bảy Hiền · 30 ngày gần đây"*, và ở v1.0 mỗi User chỉ thuộc một Group ([DEC-004](../what-we-gonna-eat-today_decision-log_v3.9.md)).

→ Route là `/groups/[groupId]/history`; **dữ liệu vẫn truy vấn theo `userId`**, `groupId` chỉ dùng cho guard `assertGroupAccess`, tên nhóm ở header, và đường quay lại. Ghi chú điều này ngay trong `page.tsx`: khi `F43` vào v1.1+, route giữ nguyên còn truy vấn mới phải đổi — và người sửa cần biết hôm nay chúng cố ý không khớp nhau.

## 1.5 `history` không được import `dish`, nên tên món đi qua port của chính `history`

S-12 hiện **tên món**, mà tên nằm ở `global_dishes` — bảng của feature `dish`. `ALLOWED_CROSS_FEATURE` ([eslint.config.mjs](../../eslint.config.mjs)) không có `history → dish`.

Không nới bảng. Tiền lệ đã có và đúng: `MealRepository.findSystemTagsByGroupDish` (E5-S3 §1.3) đọc thẳng `group_dish_tags` mà không import feature `dish` — tầng `infrastructure` đang đọc một **bảng**, không mượn **kiến thức miền** của feature khác. `history/infrastructure` JOIN `global_dishes` và trả tên qua port của chính nó, y hệt.

---

# 2. File tree

```
src/shared/time/
  format-vietnamese-time.ts                     + MỚI (§3)
  format-vietnamese-time.test.ts                + MỚI (§3.1)

src/features/meal/application/
  meal-repository.ts                            ~ SỬA — findFinalMeal (§4)
  view-final-meal.ts                            + MỚI (§4.1)

src/features/meal/infrastructure/
  drizzle-meal-repository.ts                    ~ SỬA (§4.2)
  drizzle-meal-repository.integration.test.ts   ~ SỬA (§4.3)

src/features/meal/presentation/components/
  final-meal-screen.tsx                         + MỚI (§5)
  final-meal-screen.test.tsx                    + MỚI (§5.1)

src/app/sessions/[sessionId]/meal/
  page.tsx                                      + MỚI (§6)

src/features/group/presentation/components/
  group-overview-screen.tsx                     ~ SỬA — nhánh "đã chốt" (§7)
  group-overview-screen.test.tsx                ~ SỬA (§7.1)

src/app/groups/[groupId]/
  page.tsx                                      ~ SỬA — nhánh FINALIZED (§7.2)

src/features/history/domain/
  eating-history.ts                             + MỚI (§8)
  eating-history.test.ts                        + MỚI (§8.1)

src/features/history/application/
  history-repository.ts                         ~ SỬA — findEatingHistory (§9)
  list-eating-history.ts                        + MỚI (§9.1)

src/features/history/infrastructure/
  drizzle-history-repository.ts                 ~ SỬA (§9.2)
  drizzle-history-repository.integration.test.ts ~ SỬA

src/features/history/presentation/components/
  eating-history-screen.tsx                     + MỚI (§10)
  eating-history-screen.test.tsx                + MỚI (§10.2)
  eating-day-label.ts                           + MỚI (§10.1)
  eating-day-label.test.ts                      + MỚI (§10.2)

src/app/groups/[groupId]/history/
  page.tsx                                      + MỚI (§10.3)
```

---

# 3. `shared/time/format-vietnamese-time.ts` — MỚI

```ts
/**
 * "17:42" — giờ chốt bữa ở S-11 và ở thẻ "đã chốt" của S-04.
 *
 * `timeZone` là THAM SỐ BẮT BUỘC, không có mặc định. `finalized_at` là
 * `timestamptz`, nên render nó mà không nói rõ múi giờ sẽ ra giờ của máy chủ
 * Vercel (UTC): một bữa tối chốt lúc 17:42 giờ Việt Nam hiện thành "10:42".
 *
 * Cùng nguyên tắc với `format-vietnamese-date.ts` — người gọi truyền vào bối
 * cảnh, hàm không tự đoán, và test không phải mock gì.
 *
 * KHÔNG dùng `hour12: false` một mình: với locale `vi-VN`, `Intl` có thể trả
 * "24:05" cho nửa đêm. `hourCycle: 'h23'` mới cho đúng "00:05".
 */
export function formatVietnameseTime(instant: Date, timeZone: string): string {
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError('formatVietnameseTime: thời điểm không hợp lệ')
  }

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant)
}
```

## 3.1 Test — `format-vietnamese-time.test.ts`

```ts
describe('formatVietnameseTime', () => {
  it('quy đổi sang giờ Việt Nam, không phải giờ UTC', () => {
    expect(formatVietnameseTime(new Date('2026-08-16T10:42:00Z'), 'Asia/Ho_Chi_Minh')).toBe('17:42')
  })

  it('nửa đêm ra 00:05 chứ không phải 24:05', () => {
    expect(formatVietnameseTime(new Date('2026-08-16T17:05:00Z'), 'Asia/Ho_Chi_Minh')).toBe('00:05')
  })

  it('cùng thời điểm ở múi giờ khác cho giờ khác', () => {
    const instant = new Date('2026-08-16T10:42:00Z')
    expect(formatVietnameseTime(instant, 'Asia/Tokyo')).toBe('19:42')
  })

  it('ngày không hợp lệ thì ném', () => {
    expect(() => formatVietnameseTime(new Date('x'), 'Asia/Ho_Chi_Minh')).toThrow(RangeError)
  })
})
```

---

# 4. `meal` — đọc một Final Meal đã chốt (E6-T7)

## 4.1 Port + use case

Thêm vào `meal-repository.ts`:

```ts
export type FinalMealView = {
  readonly decisionDate: string
  readonly finalizedAt: Date
  readonly finalizedByDisplayName: string
  readonly dishes: readonly {
    readonly groupDishId: string
    readonly name: string
    readonly systemTags: readonly SystemTag[]
  }[]
  readonly participantNames: readonly string[]
}

  /**
   * SPEC-016 phía ĐỌC — mâm cơm đã chốt, đủ để dựng S-11 trong một lần gọi.
   *
   * Trả `null` khi Session không tồn tại HOẶC chưa `FINALIZED`. Gộp hai
   * trường hợp có chủ ý: cả hai đều là "không có mâm cơm để xem ở đây", và
   * phân biệt chúng chỉ để lộ ra phiên nào tồn tại (NFR-04) mà không giúp
   * người dùng thêm được gì.
   *
   * KHÁC `getDraft`: `getDraft` đọc `final_meal_items` khi Session còn
   * `ACTIVE` để Finalize kiểm tra; hàm này đọc CÙNG bảng đó sau khi Session đã
   * `FINALIZED`, kèm tên món, tên người chốt và danh sách người tham gia. Cùng
   * dữ liệu, hai thời điểm, hai mục đích — không gộp.
   */
  findFinalMeal(sessionId: string): Promise<FinalMealView | null>
```

`view-final-meal.ts` — mỏng, cùng khuôn `list-group-rules.ts` (E5-S1):

```ts
import type { FinalMealView, MealRepository } from './meal-repository'

/**
 * SPEC-016 phía đọc. KHÔNG guard ở đây: `assertGroupAccess` chạy ở `app/`
 * trước khi use case được gọi (Tech Spec §5), và MỌI Member của Group đều
 * được xem mâm cơm nhà mình — `BR-050` không hạn chế quyền xem, chỉ hạn chế
 * quyền chọn (Creator).
 */
export async function viewFinalMeal(
  deps: { readonly meal: MealRepository },
  sessionId: string,
): Promise<FinalMealView | null> {
  return deps.meal.findFinalMeal(sessionId)
}
```

## 4.2 Infrastructure

Ba câu, không cố nhồi thành một — `final_meal_items` → tên món, `group_dish_tags` → nhãn (tái dùng `findSystemTagsByGroupDish` đã có), `participants` → tên người:

```ts
async function findFinalMeal(sessionId: string): Promise<FinalMealView | null> {
  const db = getDb()

  const sessionRows = await db
    .select({
      decisionDate: selectionSessions.decisionDate,
      finalizedAt: selectionSessions.finalizedAt,
      finalizedByDisplayName: users.displayName,
    })
    .from(selectionSessions)
    .innerJoin(users, eq(users.id, selectionSessions.creatorUserId))
    .where(
      and(eq(selectionSessions.id, sessionId), eq(selectionSessions.state, 'FINALIZED')),
    )
    .limit(1)

  const session = sessionRows[0]
  // `finalizedAt` nullable trong schema nhưng KHÔNG BAO GIỜ null khi state là
  // FINALIZED — `commitFinalize` set cả hai trong một UPDATE. Kiểm tường minh
  // thay vì `!` để tsc bắt được nếu giả định này hỏng sau này.
  if (session === undefined || session.finalizedAt === null) {
    return null
  }

  const dishRows = await db
    .select({ groupDishId: finalMealItems.groupDishId, name: globalDishes.name })
    .from(finalMealItems)
    .innerJoin(finalMeals, eq(finalMeals.id, finalMealItems.finalMealId))
    .innerJoin(groupDishes, eq(groupDishes.id, finalMealItems.groupDishId))
    .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
    .where(eq(finalMeals.sessionId, sessionId))
    .orderBy(globalDishes.name)

  const tagsByDish = await findSystemTagsByGroupDish(dishRows.map((row) => row.groupDishId))

  const participantRows = await db
    .select({ displayName: users.displayName })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId))
    .where(and(eq(participants.sessionId, sessionId), ne(participants.state, 'REMOVED')))

  return {
    decisionDate: session.decisionDate,
    finalizedAt: session.finalizedAt,
    finalizedByDisplayName: session.finalizedByDisplayName,
    dishes: dishRows.map((row) => ({
      ...row,
      systemTags: tagsByDish.get(row.groupDishId) ?? [],
    })),
    participantNames: participantRows.map((row) => row.displayName),
  }
}
```

> [!NOTE]
> `creatorUserId` chứ không phải một cột `finalized_by` riêng: chỉ Creator mới chốt được (`SPEC-016` bước 2), nên "ai chốt" suy ra được, không cần cột mới. Nếu `F40` (v1.2) cho người khác sửa mâm cơm thì lúc đó mới cần cột — và lúc đó nó là cột của việc SỬA, không phải của việc chốt.

`ne(participants.state, 'REMOVED')` khớp `BR-026` và khớp đúng tập người đã nhận Default Eating History ở `listActiveParticipantUserIds` — hai chỗ phải cùng một luật, nếu không S-11 sẽ kể tên một người mà lịch sử ăn của họ không có bữa này.

## 4.3 Integration test

| Ca | Khẳng định |
| --- | --- |
| Đã chốt | Session `FINALIZED` 3 món → trả đủ 3 tên món, `finalizedAt` khác null, tên Creator đúng |
| Chưa chốt | Session `ACTIVE` có nháp 3 món → trả `null` |
| Không tồn tại | `sessionId` ngẫu nhiên → trả `null` |
| Nhãn món | Món có `MAIN`+`SOUP` → `systemTags` theo thứ tự mâm cơm |
| Participant `REMOVED` | Không xuất hiện trong `participantNames` |

---

# 5. `final-meal-screen.tsx` (S-11)

```tsx
import Link from 'next/link'
import type { ReactElement } from 'react'

import { SYSTEM_TAG_LABELS } from '@/features/dish/presentation/components/system-tag-label'
import type { SystemTag } from '@/shared/domain/system-tag'
import { EmptyStateCard } from '@/shared/ui/empty-state-card'

export type FinalMealScreenProps = {
  dateCaption: string
  /** "Mẹ chốt lúc 17:42" — dựng ở `app/`, nơi biết timezone của Group (§1.3). */
  finalizedCaption: string
  dishes: readonly { name: string; systemTags: readonly SystemTag[] }[]
  participantNames: readonly string[]
  closeHref: string
}
```

Điểm phải đúng:

- **Tên món là chữ lớn nhất trên màn hình** (`text-title`/`hero` theo Design Criteria §3.2). Mâm cơm là nội dung, mọi thứ khác là chú thích.
- Nhãn tag dùng `SYSTEM_TAG_LABELS` của feature `dish` — `meal → dish` **không** được phép ở cấp feature. **Nhân bản bảng nhãn** vào `meal/presentation/components/system-tag-label.ts`, hoặc tốt hơn: chuyển `SYSTEM_TAG_LABELS` sang `src/shared/ui/system-tag-label.ts` — cùng lý lẽ đã dùng cho `SystemTag` ở E5-S1 §1.1 (`DEC-040`), và giờ đã có feature thứ ba cần nó. **Chọn cách chuyển sang `shared/`**, ghi Decision Log.
- Dòng người tham gia đọc thành câu: `Bốn người tham gia chọn` — số đếm bằng chữ như mockup. Một hàm nhỏ `countInWords(n)` phủ 1→8 rồi rơi về chữ số; test riêng. Nhóm gia đình không quá 8 người, và "Bốn người" đọc tự nhiên hơn "4 người" trong câu văn.
- Trạng thái rỗng: `dishes.length === 0` không xảy ra (`ERR_EMPTY_FINAL_MEAL` chặn từ E5-S3) nhưng vẫn dựng `EmptyStateCard` — `E6-T1` sẽ rà tới đây và tìm nó.

## 5.1 Test

| Ca | Khẳng định |
| --- | --- |
| Ba món | Ba tên món hiện đủ, mỗi món kèm nhãn tiếng Việt |
| Không có v1.1/v1.2 | `queryByText(/Tôi không ăn món này/)` và `/Sửa món đã chốt/` đều `null` (§1.2) |
| Người tham gia | 4 tên → thấy "Bốn người tham gia chọn" |
| Nút Đóng | Là `<Link>` tới `closeHref`, không phải `history.back()` |

---

# 6. `app/sessions/[sessionId]/meal/page.tsx`

Khuôn đọc dữ liệu giống [sessions/[sessionId]/summary/page.tsx](../../src/app/sessions/[sessionId]/summary/page.tsx): đọc Session → `assertGroupAccess` (MEMBER) → use case → `notFound()` nếu `null`.

Khác một điểm: trang này cần **`group.timezone`** để dựng `finalizedCaption` (§1.3), mà `assertGroupAccess` không trả về Group. Dùng `drizzleGroupRepository.findById(session.groupId)` — cùng thứ `requireGroupContext` làm, chỉ khác là route này phẳng (không có `groupId` trong URL) nên không dùng lại được helper đó.

```tsx
const finalizedCaption = `${meal.finalizedByDisplayName} chốt lúc ${formatVietnameseTime(
  meal.finalizedAt,
  group.timezone,
)}`
```

---

# 7. Trạng thái "đã chốt" của S-04 (E6-T7)

## 7.1 `group-overview-screen.tsx`

Thêm prop:

```tsx
  /** `null` khi hôm nay chưa chốt. Loại trừ nhau với `activeSession` —
   *  một Group không thể vừa có phiên đang chạy vừa có phiên đã chốt trong
   *  cùng một Decision Date (BR-025, partial unique index). */
  finalizedMeal: {
    finalizedCaption: string
    dishNames: readonly string[]
    mealHref: string
  } | null
```

Theo [s04-04-da-chot.png](../designs/screenshots/s04-04-da-chot.png): thẻ trên cùng với chip *"Đã chốt lúc 17:42 · Mẹ chốt"*, dòng nhỏ *"Tối nay nhà mình ăn"*, rồi tên món **chữ lớn**; CTA đáy màn hình đổi thành **"Xem bữa hôm nay"**.

Ba việc phải đúng cùng lúc, và cả ba là cùng một lỗi §1.1 nếu bỏ sót:

1. `finalizedMeal !== null` → CTA đáy là "Xem bữa hôm nay" trỏ `mealHref`, **không** phải "Mở phiên".
2. `finalizedMeal !== null` → **không** hiện `EmptyStateCard` "Thêm món đầu tiên" và không hiện khối "Phiên đang mở".
3. Nút "Sửa món đã chốt" trong mockup **không dựng** (`F40`, v1.2 — §1.2).

## 7.2 `app/groups/[groupId]/page.tsx`

Nhánh `FINALIZED` hiện đang rơi vào `[null, null]`. Sửa thành ba nhánh tường minh: `ACTIVE` → overview như cũ; `FINALIZED` → `viewFinalMeal`; `null` → cả hai `null`.

```ts
const finalized =
  blockingSession?.state === 'FINALIZED'
    ? await viewFinalMeal({ meal: drizzleMealRepository }, blockingSession.id)
    : null
```

## 7.3 Test — `group-overview-screen.test.tsx`

| Ca | Khẳng định |
| --- | --- |
| Đã chốt | CTA đáy ghi "Xem bữa hôm nay"; **không** có chữ "Mở phiên" ở đâu trên màn hình |
| Đã chốt | Ba tên món hiện ra; chip có chuỗi "Đã chốt lúc" |
| Đã chốt + 0 món trong nhóm | Vẫn không hiện `EmptyStateCard` thêm món (ưu tiên trạng thái đã chốt) |
| Chưa chốt | Hành vi cũ giữ nguyên — test hiện có phải vẫn xanh |

---

# 8. `history/domain/eating-history.ts` (E6-T8)

```ts
export type EatingRecord = {
  readonly eatingDate: string
  readonly dishName: string
}

export type EatingDay = {
  readonly eatingDate: string
  readonly dishNames: readonly string[]
}

/**
 * SPEC-017 phía đọc — gom bản ghi phẳng thành từng ngày, ngày mới nhất trước.
 *
 * Hàm thuần, không chạm DB, không biết hôm nay là ngày nào. Nhãn tương đối
 * ("Hôm qua · Thứ Hai 15/8") là việc của presentation (§10.1) — nó phụ thuộc
 * "hôm nay", mà "hôm nay" phụ thuộc timezone của Group, thứ `domain/` của
 * `history` không được biết.
 *
 * Khử trùng lặp tên món trong cùng một ngày: BR-046 Multi-source Collapse —
 * cùng một User ăn cùng một món trong cùng một ngày từ hai nguồn vẫn là MỘT
 * lần ăn. Ở v1.0 chưa có nguồn thứ hai, nhưng luật đã đúng và rẻ.
 */
export function groupEatingHistory(records: readonly EatingRecord[]): EatingDay[] {
  const byDate = new Map<string, Set<string>>()

  for (const record of records) {
    const names = byDate.get(record.eatingDate)
    if (names === undefined) {
      byDate.set(record.eatingDate, new Set([record.dishName]))
    } else {
      names.add(record.dishName)
    }
  }

  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([eatingDate, names]) => ({
      eatingDate,
      dishNames: [...names].sort((a, b) => a.localeCompare(b, 'vi')),
    }))
}
```

## 8.1 Test

| Ca | Khẳng định |
| --- | --- |
| Gom theo ngày | 5 bản ghi / 2 ngày → 2 phần tử |
| Thứ tự | Ngày mới nhất đứng đầu |
| `BR-046` | Cùng ngày cùng tên món 2 bản ghi → 1 tên |
| Rỗng | `[]` → `[]` |
| Sắp tên | Tên món trong ngày sắp theo `localeCompare('vi')` — "Ăn" trước "Bò" |

---

# 9. `history` — port, use case, infrastructure

```ts
  /**
   * SPEC-017 phía ĐỌC, cho S-12. Trả bản ghi PHẲNG kèm TÊN MÓN; gom theo ngày
   * là việc của `groupEatingHistory` ở `domain/`.
   *
   * Trả tên món chứ không chỉ `globalDishId` — khác hẳn `findEatingDates` và
   * `countRecentEatersByDish`, vốn để TÍNH TOÁN nên không cần tên. Tên lấy
   * bằng JOIN `global_dishes` ngay trong `history/infrastructure`: đọc một
   * BẢNG, không import feature `dish` (Guide §1.5).
   *
   * `from`/`to` là ngày lịch dạng `YYYY-MM-DD`, đã quy đổi theo timezone Group
   * bởi người gọi — cùng khuôn `countRecentEatersByDish`.
   */
  findEatingHistory(input: {
    readonly userId: string
    readonly from: string
    readonly to: string
  }): Promise<EatingRecord[]>
```

`list-eating-history.ts`:

```ts
/** S-12 — 30 ngày gần đây. Cửa sổ là hằng số của màn hình này, không phải của
 *  thuật toán: KHÔNG dùng `RANKING_CONFIG.history.cooldownWindowDays` (7 ngày,
 *  của SPEC-020). Hai con số nói về hai việc khác nhau và không được nối vào
 *  nhau — nếu ai đó chỉnh cooldown xuống 3 ngày, lịch sử ăn không được co lại
 *  theo. */
export const HISTORY_WINDOW_DAYS = 30
```

Infrastructure: một câu `SELECT eating_date, g.name FROM eating_history eh JOIN global_dishes g ON g.id = eh.global_dish_id WHERE eh.user_id = $1 AND eh.eating_date BETWEEN $2 AND $3`.

---

# 10. Presentation S-12

## 10.1 `eating-day-label.ts`

```ts
/**
 * "Hôm qua · Thứ Hai 15/8" cho ngày liền trước, "Chủ Nhật 14/8" cho các ngày
 * còn lại, "Hôm nay · …" cho chính hôm nay.
 *
 * Nhận `today` làm THAM SỐ. Ở presentation nên có thể đọc `new Date()`, nhưng
 * không: `today` ở đây là Decision Date theo timezone Group, không phải ngày
 * của trình duyệt. Một người mở app lúc 0h30 giờ Nhật vẫn phải thấy "Hôm nay"
 * theo lịch của nhà mình.
 */
export function eatingDayLabel(eatingDate: string, today: string): string
```

Tái dùng `formatVietnameseDateShort` cho phần "Thứ Hai 15/8". Tính "hôm qua" bằng so sánh chuỗi ngày sau khi trừ một ngày — **không** dùng `Date` số học trên giờ địa phương.

## 10.2 Test

`eating-day-label.test.ts`: hôm nay / hôm qua / 3 ngày trước / qua mốc đầu tháng (`2026-09-01` vs `2026-08-31`).

`eating-history-screen.test.tsx`: 3 ngày → 3 thẻ; số món mỗi ngày hiện đúng (`tabular-nums`); rỗng → `EmptyStateCard` nêu việc cần làm tiếp (*"Chốt bữa đầu tiên rồi lịch sử sẽ tự hiện ở đây"*); **không** có chuỗi "Bạn đã bỏ" (§1.2).

## 10.3 Route

`app/groups/[groupId]/history/page.tsx` — `requireGroupContext` (MEMBER), `resolveDecisionDate(new Date(), group.timezone)` làm `to`, `to - 30 ngày` làm `from`, truy vấn theo `user.id` (§1.4). Thêm hàng "Lịch sử ăn" vào Group Hub cạnh "Danh mục món" / "Quy định bữa ăn".

---

# 11. Rủi ro

| Rủi ro | Dấu hiệu sớm | Xử lý |
| --- | --- | --- |
| Giờ chốt hiện sai múi | "10:42" thay vì "17:42" trên preview | §3 — `timeZone` là tham số bắt buộc, không có mặc định |
| Quên nhánh `FINALIZED` ở Group Hub | Chốt xong vẫn thấy "Mở phiên" | §7.3 ca "Đã chốt … không có chữ Mở phiên" |
| Chép "Tôi không ăn món này" từ mockup | Chuỗi đó trong DOM | Test §5.1 khẳng định không có |
| `SYSTEM_TAG_LABELS` kéo `meal → dish` | `yarn lint` đỏ | §5 — chuyển sang `shared/ui/` |
| Lịch sử lọc theo Group | Người dùng chuyển nhóm ở v1.1 thấy mất lịch sử | §1.4 — truy vấn theo `userId`, ghi chú ngay trong `page.tsx` |
| Cửa sổ 30 ngày nối vào `RANKING_CONFIG` | — | §9 — hằng số riêng, có ghi chú lý do |

---

# 12. Test Cases coverage

Slice này **không có `TC-xxx` nào** — Test Cases Spec không có ca nào cho hai màn hình này, đúng như Master Plan không có subtask nào cho chúng. Nó phục vụ `MS-01` (smoke test thủ công) và được phủ bằng test đơn vị/thành phần liệt kê ở §3.1, §4.3, §5.1, §7.3, §8.1, §10.2.

Ghi vào guide S4: `MS-01` chỉ chạy được **sau** slice này.

---

# 13. Thứ tự TDD

1. `format-vietnamese-time.test.ts` (đỏ) → `format-vietnamese-time.ts` (xanh).
2. Chuyển `SYSTEM_TAG_LABELS` sang `shared/ui/` → `yarn verify` xanh trước khi đi tiếp.
3. `eating-history.test.ts` (đỏ) → `groupEatingHistory` (xanh).
4. `eating-day-label.test.ts` (đỏ) → `eatingDayLabel` (xanh).
5. Port `findFinalMeal` → integration test (đỏ) → infrastructure (xanh).
6. `final-meal-screen.test.tsx` (đỏ) → component (xanh) → route.
7. `group-overview-screen.test.tsx` ca "đã chốt" (đỏ) → sửa screen + `page.tsx` (xanh).
8. Port `findEatingHistory` → integration → `eating-history-screen` → route → hàng ở Group Hub.

---

# 14. Verify

## 14.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn test:integration
```

## 14.2 Bằng chứng `MS-01` đi trọn vòng — DoD chính của slice

Trên preview, một mạch không dừng, bằng điện thoại thật:

1. Tạo nhóm → thêm 5 món → mở phiên → vuốt hết → chốt bữa.
2. Sau khi chốt, **quay về Group Hub**: thấy thẻ "Đã chốt lúc HH:mm · <tên> chốt" và tên các món; CTA đáy ghi "Xem bữa hôm nay". **Không** thấy nút "Mở phiên".
3. Bấm "Xem bữa hôm nay" → S-11 hiện đủ món, nhãn tag, dòng "N người tham gia chọn".
4. Vào "Lịch sử ăn" → thấy đúng bữa vừa chốt dưới nhãn "Hôm nay · …".

Bước 2 là chỗ §1.1 nói tới. Nếu nó vẫn hiện "Mở phiên", slice chưa xong bất kể test có xanh.

## 14.3 Bằng chứng múi giờ

Đổi timezone của Group sang `Asia/Tokyo` trong DB rồi tải lại S-11: giờ chốt phải **đổi theo**, không đứng yên. Nếu nó đứng yên thì `formatVietnameseTime` đang bị gọi với hằng số hoặc với giờ máy chủ.

---

# 15. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v3.9.md`

```markdown
# DEC-047 — E6 Adds E6-T7 and E6-T8: the Two Read-Only Screens MS-01 Requires

- **Ngày:** 2026-08-21
- **Trạng thái:** Accepted
- **Bối cảnh:** E6-S1

## Quyết định

Thêm `E6-T7` (màn S-11 "Bữa ăn hôm nay" + trạng thái "đã chốt" của S-04, 3h) và `E6-T8`
(màn S-12 "Lịch sử ăn", 2.5h) vào Master Plan §8. Cả hai đi TRƯỚC `E6-T1` và `E6-T6` trong
thứ tự slice.

## Rationale

`MS-01` — smoke test mà chính `E6-T3` phải chạy — ghi kết quả kỳ vọng là "Thấy thực đơn Final
Meal và lịch sử ăn cá nhân". Sau E5 không có route nào cho cả hai, và `MealRepository` chỉ có
`getDraft` còn `HistoryRepository` chỉ trả `globalDishId` không kèm tên món. Không có hai màn
này thì `E6-T3` không hoàn thành được, tức là M6 không đạt.

Ngoài ra `app/groups/[groupId]/page.tsx` chỉ xử lý `state === 'ACTIVE'`; phiên `FINALIZED` rơi
vào nhánh null và Group Hub hiện lại CTA "Mở phiên" dẫn tới `ERR_SESSION_EXISTS_TODAY`. Luồng
chính đang đứt ở bước cuối.

Đi trước `E6-T1`/`E6-T6` vì cả hai là thao tác QUÉT trên toàn bộ màn hình; quét khi tập màn
hình chưa đủ thì phải quét lại lần hai, mà `E6-T6` chính là mốc M6.

## Consequence

- E6 lên 8 subtask, 20.5 giờ cơ sở (từ 6 subtask, 15 giờ).
- Hai màn dựng bản v1.0: bỏ `F15` (Cannot Eat), `F40` (Sửa Final Meal), `F24` (Lưu vết cảnh
  báo), `F28` (Sửa lịch sử ăn) khỏi mockup.

## Affected Documents

- Master Plan §1 (giờ của E6), §8 (thêm hai dòng).
```

```markdown
# DEC-048 — SYSTEM_TAG_LABELS Moves to shared/ui; Eating History Is Queried by User, Routed by Group

- **Ngày:** 2026-08-21
- **Trạng thái:** Accepted
- **Bối cảnh:** E6-S1

## Quyết định

1. `SYSTEM_TAG_LABELS` chuyển từ `features/dish/presentation/components/system-tag-label.ts`
   sang `src/shared/ui/system-tag-label.ts`.
2. Màn S-12 đặt ở route `/groups/[groupId]/history` nhưng TRUY VẤN theo `userId`; `groupId`
   chỉ dùng cho guard, tên nhóm ở header và đường quay lại.

## Rationale

1. Feature thứ ba (`meal`, cho S-11) cần bảng nhãn này, mà `meal → dish` không nằm trong
   `ALLOWED_CROSS_FEATURE`. Cùng lý lẽ đã áp cho `SystemTag` ở DEC-040: chuyển lên tầng dùng
   chung rẻ hơn nới bảng cross-feature hoặc nhân bản lần thứ ba.
2. `eating_history` trỏ `global_dish_id` và không có cột `group_id` (BR-056) — lịch sử thuộc
   về User. Nhưng header trong mockup ghi tên nhóm, và ở v1.0 mỗi User chỉ thuộc một Group
   (DEC-004). Route theo Group cho header và điều hướng; truy vấn theo User cho đúng dữ liệu.
   Khi F43 vào v1.1+, route giữ nguyên còn truy vấn phải đổi — ghi chú đã đặt sẵn trong
   `page.tsx`.

## Consequence

- `features/dish/presentation/components/system-tag-label.ts` re-export để 4 chỗ đang import
  không phải đổi; nếu knip báo export chết thì đổi import thẳng.
- S-12 không lọc theo Group: một User (giả định) thuộc hai Group sẽ thấy cả hai — đúng ý đồ
  BR-046 Multi-source Collapse.

## Affected Documents

- Design Criteria §5 — `TagChip` nay lấy nhãn từ `shared/ui`.
```

---

# 16. Master Plan

Sau khi slice xanh, thêm vào §8:

```markdown
| `[x] E6-T7` | Màn S-11 "Bữa ăn hôm nay" + trạng thái "đã chốt" của S-04 | `S-11`, `S-04`, `MS-01` | 3 | `E5-T9` | Chốt xong quay về Group Hub thấy ngay mâm cơm | `src/features/meal/**` |
| `[x] E6-T8` | Màn S-12 "Lịch sử ăn" | `S-12`, `MS-01` | 2.5 | `E6-T7` | 30 ngày gần đây, nhóm theo ngày | `src/features/history/**` |
```

và §1: dòng `E6` thành `8 subtask / 20.5 giờ`, trạng thái `⏳ Đang làm (2/8)`.
