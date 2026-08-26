# 🏷️ Implementation Guide — E2 Slice S3: System Tag

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-18`
> - **Upstream:** [Master Plan](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E2-T5`) • [SDD](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-006`, §2.2) • [Business Rules](../../what-we-gonna-eat-today_business-rules_v1.7.md) (`BR-003`, `BR-008`) • [Test Cases](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-022→025`, `TC-100`, `TC-101`, + `TC-021` theo DEC-024)
> - **Tiền đề:** `E1-T5` đã code xong (đúng phụ thuộc Master Plan ghi cho E2-T5 — **không** phụ thuộc E2-T4).
>
> 🏷️ *Gán System Tag cho món trong Group: ghi đè toàn bộ, cách ly theo Group, 5 giá trị cố định.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | --- | --- | --- |
| `E2-T5` | Gán System Tag, ghi đè toàn bộ, cách ly theo Group | 3 | `src/features/dish/**` | Đổi tag ở Group A không ảnh hưởng Group B |

- [ ] `group_dish_tags` có trong schema + migration mới (xem §1.4 về số thứ tự)
- [ ] `TC-022` (ghi đè thành đúng 2 tag), `TC-023` (gán `[]` → hết tag), `TC-100` (đủ 5 giá trị), `TC-101` (khử trùng lặp) pass ở tầng `A`
- [ ] `TC-024` pass ở tầng `I` — cùng Global Dish ở 2 Group, đổi tag Group A thì Group B giữ nguyên
- [ ] `TC-025` pass — Member (không phải Admin) đổi tag → `ERR_NOT_GROUP_ADMIN`
- [ ] `TC-021` pass — `systemTags = ["BREAKFAST"]` → `ERR_INVALID_SYSTEM_TAG` (nhận từ E2-T4 theo DEC-024)
- [ ] `yarn verify && yarn arch:probe` xanh

---

# 1. Bốn mâu thuẫn giữa tài liệu — đã đối chiếu verbatim, đã chốt

Slice này là chỗ tài liệu lệch nhau nhiều nhất từ đầu dự án tới giờ. Cả bốn đều đã kiểm bằng cách đọc nguyên văn từng file, không suy đoán.

## 1.1 Cách viết 5 giá trị tag — SDD thắng, PRD là ngoại lệ

| Tài liệu | Viết là |
| --- | --- |
| SDD §2.2 dòng 95 | `SystemTag = STAPLE \| MAIN \| SIDE \| SOUP \| DESSERT` |
| SDD dòng 86 (bảng quy ước đặt tên) | **Database Enum → `UPPER_SNAKE`** |
| BR-003 | `MAIN`, `SIDE`, `SOUP`, `STAPLE`, `DESSERT` |
| Test Cases TC-022 | `[MAIN, SOUP]` |
| PRD §9 mục 2 | `Staple`, `Main`, `Side`, `Soup`, `Dessert` ← **PascalCase, lệch** |

**Chốt: `UPPER_SNAKE`.** Bốn nguồn khớp nhau và chính SDD có bảng quy ước bắt buộc điều đó; PRD §9 là chỗ duy nhất lệch, và §9 là mục "quyết định sản phẩm" chứ không phải đặc tả kỹ thuật. Không cần sửa PRD — chỉ cần biết nó không phải nguồn sự thật cho định danh.

## 1.2 Chọn một tag hay nhiều tag — API và UI trả lời KHÁC nhau, có chủ ý

| Nguồn | Nói gì |
| --- | --- |
| BR-003 | *"Một món có thể mang **nhiều System Tag cùng lúc**."* |
| TC-022 | Gán `[MAIN, SOUP]` → đúng 2 tag |
| TC-023 | Gán `[]` → không còn tag nào |
| TC-100 | Đủ 5 giá trị → chấp nhận |
| Mockup `S-05 S-06 Danh muc mon.dc.html` dòng 130 | `Nhãn — chọn một` |
| Cùng file, dòng 222 | `pick: () => this.setState({ tag: t })` — lưu **một giá trị đơn**, không phải mảng |
| Cùng file, dòng 232 | `if (!s.draft.trim() \|\| !s.tag \|\| ...) return` — **không lưu được nếu chưa chọn tag** |

**Chốt (bạn đã quyết):**

- **API / domain / DB: `0..5`, đúng spec.** `TC-022`, `TC-023`, `TC-100` là hợp đồng hình thức, không nhân nhượng.
- **Sheet "Thêm món" (S-06): chọn một, bắt buộc — giữ đúng mockup.** Sheet là lối nhập nhanh, và câu nhắc trong chính mockup nói rõ lý do: *"Chọn một nhãn để quy định bữa ăn kiểm tra được."* Đây là **nudge UX**, không phải ràng buộc dữ liệu.
- **Multi-select đầy đủ để dành cho S4 (E2-T6)** — Master Plan ghi thẳng "Xong nghĩa là: Thêm, **sửa tag**, tìm kiếm được trên điện thoại" cho E2-T6. Đó mới là nơi sửa chi tiết.

Hệ quả cần nhớ khi code: `setSystemTags` (SPEC-006) nhận mảng và ghi đè toàn bộ; sheet chỉ tình cờ luôn gửi mảng một phần tử. **Đừng để cái "một" của UI rò xuống dưới port.**

## 1.3 SPEC-006 KHÔNG liệt kê mã lỗi nào

SPEC-006 (SDD dòng 212–216) chỉ có 4 gạch đầu dòng, **không có mục "Kịch bản", không có `ERR_*` nào**:

```
### SPEC-006 — Gán System Tag cho Dish trong Group
- **Nguồn:** `US-003`, `F04`, BR-003
- **Đầu vào:** `{ groupId, dishId, systemTags: SystemTag[] }` (Yêu cầu quyền Group Admin)
- **Đầu ra:** `GroupDish` | `Failure`
- **Quy tắc:** Ghi đè toàn bộ tag của món ăn trong Group hiện tại; hoàn toàn độc lập và không ảnh hưởng Group khác.
```

Ba mã lỗi slice này dùng đến từ ba nguồn khác nhau, mức chắc chắn khác nhau — nói rõ để bạn biết chỗ nào là spec, chỗ nào là suy luận:

| Mã lỗi | Căn cứ | Mức chắc chắn |
| --- | --- | --- |
| `ERR_NOT_GROUP_ADMIN` | TC-025 nói thẳng, BR-008 nói Admin mới được sửa tag | **Chắc — có test case** |
| `ERR_INVALID_SYSTEM_TAG` | TC-021 nói thẳng (chuyển sang slice này theo DEC-024) | **Chắc — có test case** |
| `ERR_DISH_NOT_IN_POOL` | Không tài liệu nào nói gì cho SPEC-006. Có sẵn trong bảng mã lỗi SDD (409, *"Món ăn này không còn hoạt động trong nhóm"*) | **Suy luận** — xem §8.2 |

## 1.4 Số thứ tự migration — guide S1 đã cũ, đừng chép theo

Repo hiện có `0000` → `0005` (bạn đã code xong E1 S4–S6). **Guide E2-S1 (link mời) ghi `0003_group_invites.sql` — số đó đã bị chiếm**, viết lúc repo mới tới `0002`. Khi code S1, đổi thành số trống kế tiếp.

Số trống kế tiếp **tuỳ thứ tự bạn code**:

| Nếu code slice này… | Migration tag |
| --- | --- |
| Trước S1 (link mời) | `0006_group_dish_tags` |
| Sau S1 | `0007_group_dish_tags` |

Cách chắc chắn nhất: chạy `yarn db:generate` sau khi sửa `schema.ts` và để Drizzle Kit tự đánh số + tự ghi `meta/_journal.json` + snapshot. Đừng đặt tay cả ba.

---

# 2. Việc đã verify (để bạn không phải verify lại)

- **`db.batch([câuLiteral, ...mảngMap])` HỢP LỆ.** Đã chạy `tsc --noEmit` thật trên repo này với cả hai chiều:
  - `db.batch([del, ...inserts])` với `inserts = ids.map(...)` → **xanh, không lỗi**.
  - `db.batch(inserts)` (mảng thuần từ `.map()`) → **đỏ**: `TS2345 ... Source provides no match for required element at position 0 in target`.

  Comment sẵn có trong `drizzle-dish-repository.ts` viết *"truyền literal array, đừng build bằng `.map()`"* — câu đó đúng nhưng dễ đọc nhầm thành "không bao giờ được dùng `.map()`". **Luật chính xác:** kiểu là `Readonly<[U, ...U[]]>`, nên **phần tử vị trí 0 phải là literal**; phần đuôi spread từ `.map()` thì thoải mái. Đây chính là thứ làm "ghi đè toàn bộ" (1 DELETE + N INSERT, N = 0..5) làm được trong **một** transaction mà không cần driver WebSocket.
- `ERR_NOT_GROUP_ADMIN`, `ERR_INVALID_SYSTEM_TAG`, `ERR_DISH_NOT_IN_POOL` **đã có sẵn** trong `src/shared/errors.ts`; `src/shared/http-error.ts` đã map `409`/`400`. Không phải sửa hai file đó.
- **Khoá chính ghép đã có tiền lệ trong repo**: `finalMealItems` (`schema.ts:351`) dùng `primaryKey({ columns: [table.finalMealId, table.groupDishId] })`, không có cột `id`. `group_dish_tags` theo đúng khuôn đó — Tech Spec §3.1 dòng 153–154 ghi `group_dish_tags(group_dish_id, system_tag)` + `primary key(group_dish_id, system_tag)`.
- **`presentation/components` ĐƯỢC import `domain`.** Đọc `eslint.config.mjs:63-69`: zone chặn `presentation/components` chỉ liệt kê `application`, `infrastructure`, `./src/shared/db` — **không có `domain`**. Nên hằng số `SYSTEM_TAGS` đặt ở domain vẫn dùng thẳng được trong component.
- Repo dùng helper `ok()` / `err()` từ `@/shared/result` (xem `add-dish-to-group.ts` thật), **không** viết literal `{ ok: true, value }`. Guide này theo đúng helper. *(Guide E2-S2 có vài chỗ viết literal — vẫn typecheck nhưng lệch phong cách; sửa lại thành `ok()`/`err()` khi code.)*
- Tech Spec §3.1 **không** có index nào cho `group_dish_tags` ngoài khoá chính ghép. Không tự thêm.

---

# 3. File tree

```
src/features/dish/
  domain/
    system-tag.ts                     + MỚI
    system-tag.test.ts                + MỚI
    dish-draft.ts / .test.ts          SỬA  (+ systemTags, bỏ comment "CỐ Ý chưa có")
    normalize-name.ts                 (không đụng — đó là E2-T3)
    group-dish.ts                     (không đụng)
  application/
    dish-repository.ts                SỬA  (+ 3 method, + GroupDishListItem)
    add-dish-to-group.ts / .test.ts   SỬA  (+ systemTags → TC-021)
    set-system-tags.ts                + MỚI (SPEC-006)
    set-system-tags.test.ts           + MỚI
    list-group-dishes.ts / .test.ts   SỬA  (trả kèm tag)
  infrastructure/
    drizzle-dish-repository.ts        SỬA  (+ replaceTags, findActiveInGroup, list kèm tag)
    drizzle-dish-repository.integration.test.ts   + MỚI  (TC-024)
  presentation/components/
    system-tag-field.tsx              + MỚI (chip radio, S-06)
    system-tag-field.test.tsx         + MỚI
    system-tag-label.ts               + MỚI (nhãn tiếng Việt + thứ tự hiển thị)
    add-dish-sheet.tsx / .test.tsx    SỬA  (+ hàng chip)
    dish-catalog-screen.tsx / .test.tsx SỬA (+ systemTagError, meta cho DishRow)
    dish-row.tsx                      (không đụng — chỉ truyền `meta` khác)

src/shared/db/schema.ts               SỬA  (+ groupDishTags, enum system_tag)
src/shared/db/migrations/000X_group_dish_tags.sql   + MỚI (§1.4)
src/shared/testing/factories.ts       SỬA  (+ systemTags cho makeGroupDish)

src/app/groups/[groupId]/
  group-access.ts                     SỬA  (+ requireGroupAdminContext — xem §12.1)
  dishes/actions.ts                   SỬA  (+ systemTag từ FormData, + setSystemTagsAction)
```

---

# 4. `src/features/dish/domain/system-tag.ts` — MỚI

```ts
/**
 * SDD §2.2 — `SystemTag = STAPLE | MAIN | SIDE | SOUP | DESSERT` (BR-003).
 *
 * Bản sao của enum `system_tag` trong `src/shared/db/schema.ts`, cùng lý do và
 * cùng ràng buộc như `group-dish.ts`: `domain/` không được import drizzle, nên
 * hai chỗ chỉ gặp nhau ở `infrastructure/drizzle-dish-repository.ts`. Sửa một
 * bên thì sửa cả hai.
 */
export type SystemTag = 'STAPLE' | 'MAIN' | 'SIDE' | 'SOUP' | 'DESSERT'

/**
 * Thứ tự CHUẨN của bữa cơm Việt, lấy từ mockup S-05/S-06
 * (`designs/S-05 S-06 Danh muc mon.dc.html:164`): Cơm → Món mặn → Món phụ →
 * Canh → Tráng miệng.
 *
 * Đặt ở `domain/` chứ không phải `presentation/` vì đây là thứ tự của MÂM CƠM,
 * không phải quyết định thẩm mỹ: E2-T6 nhóm danh sách món theo đúng thứ tự này,
 * và mọi chỗ đọc tag đều chuẩn hoá về nó để so sánh được bằng `toEqual`.
 * Nhãn tiếng Việt thì thuộc presentation — xem `system-tag-label.ts`.
 */
export const SYSTEM_TAGS = ['STAPLE', 'MAIN', 'SIDE', 'SOUP', 'DESSERT'] as const satisfies
  readonly SystemTag[]

export function isSystemTag(value: string): value is SystemTag {
  return (SYSTEM_TAGS as readonly string[]).includes(value)
}

export type SystemTagError = 'INVALID_SYSTEM_TAG'

/**
 * NGHIÊM — dùng cho dữ liệu KHÔNG tin được (FormData, body request).
 * Một giá trị lạ là `ERR_INVALID_SYSTEM_TAG` (TC-021), không im lặng bỏ qua.
 *
 * Khử trùng lặp (TC-101) và trả về theo THỨ TỰ CHUẨN, không theo thứ tự người
 * dùng gửi lên — nhờ vậy `toEqual([...])` trong test là xác định, và khoá chính
 * ghép `(group_dish_id, system_tag)` không bao giờ bị chèn trùng trong cùng một
 * batch.
 *
 * Không cần kiểm "tối đa 5": chỉ có đúng 5 giá trị hợp lệ, nên sau khi khử
 * trùng lặp thì độ dài tự khắc ≤ 5. TC-100 pass mà không cần luật riêng.
 */
export function readSystemTags(values: readonly string[]): Result<SystemTag[], SystemTagError> {
  const seen = new Set<string>()

  for (const value of values) {
    if (!isSystemTag(value)) {
      return err('INVALID_SYSTEM_TAG')
    }
    seen.add(value)
  }

  return ok(SYSTEM_TAGS.filter((tag) => seen.has(tag)))
}

/**
 * KHOAN DUNG — dùng cho dữ liệu ĐỌC TỪ DB, nơi `array_agg` trả về `string[]`
 * mà TypeScript không kiểm được (xem §10.3). Bỏ qua giá trị lạ thay vì ném:
 * một hàng hỏng không được làm sập cả trang danh mục món.
 */
export function toSystemTags(values: readonly string[]): SystemTag[] {
  const seen = new Set(values)
  return SYSTEM_TAGS.filter((tag) => seen.has(tag))
}
```

Nhớ thêm `import type { Result } from '@/shared/result'` và `import { err, ok } from '@/shared/result'` ở đầu file (đúng khuôn `dish-draft.ts` hiện có).

## 4.1 Test — `system-tag.test.ts`

```ts
import { describe, expect, it } from 'vitest'

import { isSystemTag, readSystemTags, SYSTEM_TAGS, toSystemTags } from './system-tag'

describe('readSystemTags', () => {
  it('TC-100 — đủ 5 giá trị khác nhau đều hợp lệ', () => {
    const result = readSystemTags(['DESSERT', 'MAIN', 'STAPLE', 'SOUP', 'SIDE'])

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    // Trả về theo THỨ TỰ CHUẨN, không theo thứ tự gửi lên.
    expect(result.value).toEqual(['STAPLE', 'MAIN', 'SIDE', 'SOUP', 'DESSERT'])
  })

  it('TC-101 — giá trị lặp lại bị khử trùng trước khi lưu', () => {
    const result = readSystemTags(['MAIN', 'MAIN', 'SOUP', 'MAIN'])

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value).toEqual(['MAIN', 'SOUP'])
  })

  it('TC-021 — giá trị ngoài enum bị từ chối', () => {
    const result = readSystemTags(['BREAKFAST'])

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error).toBe('INVALID_SYSTEM_TAG')
  })

  it('TC-021 — một giá trị lạ lẫn giữa các giá trị hợp lệ vẫn bị từ chối', () => {
    expect(readSystemTags(['MAIN', 'BREAKFAST', 'SOUP']).ok).toBe(false)
  })

  it('TC-023 — mảng rỗng là hợp lệ', () => {
    const result = readSystemTags([])

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value).toEqual([])
  })
})

describe('toSystemTags', () => {
  it('bỏ qua giá trị lạ thay vì ném', () => {
    expect(toSystemTags(['MAIN', 'BREAKFAST'])).toEqual(['MAIN'])
  })

  it('chuẩn hoá về thứ tự chuẩn', () => {
    expect(toSystemTags(['SOUP', 'STAPLE'])).toEqual(['STAPLE', 'SOUP'])
  })
})

describe('isSystemTag', () => {
  it('đúng cho cả 5 giá trị', () => {
    for (const tag of SYSTEM_TAGS) {
      expect(isSystemTag(tag)).toBe(true)
    }
  })

  it('sai cho chữ thường — DB enum là UPPER_SNAKE (SDD dòng 86)', () => {
    expect(isSystemTag('main')).toBe(false)
  })
})
```

---

# 5. `src/features/dish/domain/dish-draft.ts` — SỬA

Comment sẵn có trong file nói rõ: *"`systemTags` CỐ Ý chưa có: E2-T5. Thêm vào đây khi tới đó, **không tạo draft thứ hai**."* Làm đúng vậy — mở rộng `readDishDraft`, không tạo file mới:

```ts
import { readSystemTags, type SystemTag } from './system-tag'

export type DishDraft = {
  readonly name: string
  readonly normalizedName: string
  readonly systemTags: readonly SystemTag[]
}

export type DishDraftError = 'NAME_EMPTY' | 'NAME_TOO_LONG' | 'INVALID_SYSTEM_TAG'

export function readDishDraft(input: {
  readonly name: string
  readonly systemTags: readonly string[]
}): Result<DishDraft, DishDraftError> {
  const name = collapseDishName(input.name)

  if (name === '') {
    return err('NAME_EMPTY')
  }

  if (Array.from(name).length > MAX_NAME_LENGTH) {
    return err('NAME_TOO_LONG')
  }

  // Tên trước, tag sau: tên rỗng là lỗi người dùng thấy ngay, tag lạ gần như
  // chỉ tới từ request giả mạo. Thứ tự này giữ nguyên trải nghiệm S-06.
  const systemTags = readSystemTags(input.systemTags)
  if (!systemTags.ok) {
    return err('INVALID_SYSTEM_TAG')
  }

  return ok({ name, normalizedName: normalizeDishName(name), systemTags: systemTags.value })
}
```

`systemTags` là **bắt buộc** trong input (không optional): `exactOptionalPropertyTypes` đang bật, và để nó optional nghĩa là mọi call site phải nghĩ về `undefined`. Người gọi truyền `[]` khi không có tag — rõ ràng hơn hẳn.

---

# 6. Schema + migration

## 6.1 `src/shared/db/schema.ts`

Thêm enum và bảng (đặt cạnh `groupDishes` để đọc theo cụm):

```ts
/** SDD §2.2 — bản sao DB của `SystemTag` ở `features/dish/domain/system-tag.ts`. */
export const systemTag = pgEnum('system_tag', ['STAPLE', 'MAIN', 'SIDE', 'SOUP', 'DESSERT'])

/**
 * Tech Spec §3.1 dòng 153–154. KHÔNG có cột `id` — khoá chính là cặp cột, cùng
 * khuôn `final_meal_items`.
 *
 * Khoá chính ghép LÀ luật khử trùng lặp của TC-101 ở mức DB: cùng một tag không
 * gắn hai lần vào một món. `readSystemTags` khử trước ở tầng domain, nên câu
 * INSERT không bao giờ chạm vào ràng buộc này — nó là lưới an toàn, không phải
 * đường đi chính.
 *
 * Trỏ `group_dish_id` chứ KHÔNG phải `global_dish_id`: đó chính là cơ chế cách
 * ly theo Group của TC-024. Cùng một Global Dish ở hai Group là hai hàng
 * `group_dishes` khác nhau, nên tag của chúng không có đường nào ảnh hưởng nhau
 * — cách ly là tính chất CẤU TRÚC, không phải điều kiện `WHERE` ai đó phải nhớ.
 */
export const groupDishTags = pgTable(
  'group_dish_tags',
  {
    groupDishId: uuid('group_dish_id')
      .notNull()
      .references(() => groupDishes.id),
    systemTag: systemTag('system_tag').notNull(),
  },
  (table) => [primaryKey({ columns: [table.groupDishId, table.systemTag] })],
)

export type GroupDishTag = typeof groupDishTags.$inferSelect
```

Kiểm import ở đầu `schema.ts` đã có `pgEnum` và `primaryKey` chưa (đã có `primaryKey` từ `finalMealItems`, `pgEnum` từ `groupDishState`) — nhiều khả năng đủ cả hai, không phải sửa dòng import.

## 6.2 Migration

Chạy `yarn db:generate`. Kết quả nên khớp bản dưới (dùng để **đối chiếu**, không phải chép tay):

```sql
CREATE TYPE "public"."system_tag" AS ENUM('STAPLE', 'MAIN', 'SIDE', 'SOUP', 'DESSERT');--> statement-breakpoint
CREATE TABLE "group_dish_tags" (
 "group_dish_id" uuid NOT NULL,
 "system_tag" "system_tag" NOT NULL,
 CONSTRAINT "group_dish_tags_group_dish_id_system_tag_pk" PRIMARY KEY("group_dish_id","system_tag")
);
--> statement-breakpoint
ALTER TABLE "group_dish_tags" ADD CONSTRAINT "group_dish_tags_group_dish_id_group_dishes_id_fk" FOREIGN KEY ("group_dish_id") REFERENCES "public"."group_dishes"("id") ON DELETE no action ON UPDATE no action;
```

---

# 7. Port — `src/features/dish/application/dish-repository.ts`

```ts
import type { SystemTag } from '../domain/system-tag'

/** Món trong danh mục kèm tag — dùng cho S-05. Tách khỏi `GroupDishSummary` để
 *  `createGlobalDishAndAddToPool` không phải trả về thứ nó không biết. */
export type GroupDishListItem = GroupDishSummary & {
  readonly systemTags: readonly SystemTag[]
}

export type NewDishInGroup = {
  readonly groupId: string
  readonly name: string
  readonly normalizedName: string
  readonly creatorUserId: string
  readonly systemTags: readonly SystemTag[]   // + MỚI
}

export interface DishRepository {
  findInGroupByNormalizedName(groupId, normalizedName): Promise<GroupDishSummary | null>  // không đổi
  createGlobalDishAndAddToPool(input: NewDishInGroup): Promise<GroupDishSummary>          // input đổi
  listActiveInGroup(groupId: string): Promise<GroupDishListItem[]>                        // trả kèm tag

  /**
   * Xác nhận món ĐANG ACTIVE trong ĐÚNG group này.
   *
   * Nhận CẢ HAI id là có chủ ý bảo mật: nếu chỉ nhận `groupDishId`, một Admin
   * của Group A gửi thẳng `groupDishId` của Group B sẽ qua được vòng kiểm
   * `assertGroupAccess` (vốn chỉ kiểm quyền trên Group A) rồi sửa tag của Group
   * B. Điều kiện `AND group_id = ?` ở đây là thứ chặn đúng chuyện đó.
   */
  findActiveGroupDish(input: {
    readonly groupId: string
    readonly groupDishId: string
  }): Promise<GroupDishSummary | null>

  /** Ghi đè TOÀN BỘ tag của một món, nguyên tử. Mảng rỗng = xoá sạch (TC-023). */
  replaceSystemTags(input: {
    readonly groupDishId: string
    readonly systemTags: readonly SystemTag[]
  }): Promise<void>
}
```

---

# 8. Use case `set-system-tags.ts` — MỚI (SPEC-006)

```ts
import { assertGroupAccess } from '@/features/group/application/assert-group-access'
import type { MembershipRepository } from '@/features/group/application/membership-repository'
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import { readSystemTags } from '../domain/system-tag'
import type { DishRepository, GroupDishSummary } from './dish-repository'

export type SetSystemTagsDeps = {
  readonly dishes: DishRepository
  readonly memberships: MembershipRepository
}

export type SetSystemTagsInput = {
  readonly groupId: string
  /** `group_dishes.id` — KHÔNG phải `global_dishes.id`. Tag gắn theo Group. */
  readonly groupDishId: string
  readonly systemTags: readonly string[]
  readonly requestedByUserId: string
}

/**
 * SPEC-006 — ghi đè toàn bộ tag của một món TRONG một Group.
 *
 * Thứ tự BẤT BIẾN: quyền → validate → tồn tại → ghi. Ba vòng kiểm đầu không
 * chạm gì tới dữ liệu, nên mọi nhánh lỗi đều không để lại thay đổi từng phần
 * (SDD §2.4).
 */
export async function setSystemTags(
  deps: SetSystemTagsDeps,
  input: SetSystemTagsInput,
): Promise<Result<GroupDishSummary, Failure>> {
  // TC-025 — BR-008: chỉ Group Admin mới chỉnh System Tag.
  const access = await assertGroupAccess(
    { memberships: deps.memberships },
    { userId: input.requestedByUserId, groupId: input.groupId, requiredRole: 'ADMIN' },
  )
  if (!access.ok) {
    return access
  }

  // TC-021 / TC-100 / TC-101 — khử trùng lặp và chuẩn hoá thứ tự nằm ở đây.
  const systemTags = readSystemTags(input.systemTags)
  if (!systemTags.ok) {
    return err(failure('ERR_INVALID_SYSTEM_TAG', { field: 'systemTags' }))
  }

  const dish = await deps.dishes.findActiveGroupDish({
    groupId: input.groupId,
    groupDishId: input.groupDishId,
  })
  if (dish === null) {
    return err(failure('ERR_DISH_NOT_IN_POOL', { groupDishId: input.groupDishId }))
  }

  // TC-022 / TC-023 — ghi đè, không cộng dồn. Mảng rỗng xoá sạch.
  await deps.dishes.replaceSystemTags({ groupDishId: dish.id, systemTags: systemTags.value })

  return ok(dish)
}
```

## 8.1 Vì sao `assertGroupAccess` gọi được từ `features/dish/`

`ALLOWED_CROSS_FEATURE` trong `eslint.config.mjs` **không** cho `dish` import `group`. Nên **không** import trực tiếp như đoạn trên — đó là bẫy. Hai lối thoát:

**Cách chọn: nhận `assertGroupAccess` như một dependency.** Đổi `SetSystemTagsDeps` thành:

```ts
export type SetSystemTagsDeps = {
  readonly dishes: DishRepository
  /** Truyền từ `app/` — `features/dish` không được import `features/group`
   *  (`eslint.config.mjs` → `ALLOWED_CROSS_FEATURE`). Cùng lý do khiến
   *  `requireGroupContext` phải sống ở `app/groups/[groupId]/group-access.ts`. */
  readonly assertAdmin: (input: {
    readonly userId: string
    readonly groupId: string
  }) => Promise<Result<void, Failure>>
}
```

rồi trong use case gọi `await deps.assertAdmin({ userId: input.requestedByUserId, groupId: input.groupId })`. Server Action ở `app/` truyền vào bản hiện thực nối tới `assertGroupAccess` với `requiredRole: 'ADMIN'`.

Cách này còn làm test tầng `A` cho TC-025 nhẹ hẳn: chỉ cần `assertAdmin: async () => err(failure('ERR_NOT_GROUP_ADMIN'))`, không phải dựng `MembershipRepository` giả.

> **Chạy `yarn arch:probe` ngay sau khi viết file này.** Đây là chỗ dễ vi phạm ranh giới feature nhất trong cả slice.

## 8.2 `ERR_DISH_NOT_IN_POOL` là suy luận, không phải spec

Không tài liệu nào nói SPEC-006 phải làm gì khi `dishId` không nằm trong pool. Ba lý do vẫn làm:

1. Mã lỗi đã có sẵn trong bảng SDD với đúng nghĩa cần dùng (`409`, *"Món ăn này không còn hoạt động trong nhóm"*).
2. Không có vòng kiểm này thì `replaceSystemTags` sẽ gắn tag cho một `groupDishId` bất kỳ — kể cả của Group khác (xem lý do bảo mật ở §7).
3. Nó khớp SPEC-005, nơi `ERR_DISH_NOT_IN_POOL` đã được dùng cho đúng ý "món không còn hoạt động".

Nếu sau này Test Cases bổ sung một TC mâu thuẫn với lựa chọn này, sửa ở đây là một dòng.

## 8.3 Test — `set-system-tags.test.ts`

Phủ TC-022, TC-023, TC-025, TC-100, TC-101 ở tầng `A`:

```ts
import { describe, expect, it, vi } from 'vitest'

import { failure } from '@/shared/errors'
import { err, ok } from '@/shared/result'

import { setSystemTags } from './set-system-tags'
import type { DishRepository } from './dish-repository'

function makeDeps(overrides: { isAdmin?: boolean; dish?: { id: string; name: string } | null } = {}) {
  const replaceSystemTags = vi.fn(async () => undefined)
  const dishes = {
    findActiveGroupDish: vi.fn(async () =>
      overrides.dish === undefined ? { id: 'gd1', name: 'Canh chua' } : overrides.dish,
    ),
    replaceSystemTags,
  } as unknown as DishRepository

  const assertAdmin = vi.fn(async () =>
    overrides.isAdmin === false ? err(failure('ERR_NOT_GROUP_ADMIN')) : ok(undefined),
  )

  return { deps: { dishes, assertAdmin }, replaceSystemTags }
}

const BASE_INPUT = {
  groupId: 'g1',
  groupDishId: 'gd1',
  requestedByUserId: 'u1',
}

describe('setSystemTags', () => {
  it('TC-022 — ghi đè [MAIN] thành [MAIN, SOUP]: đúng 2 tag', async () => {
    const { deps, replaceSystemTags } = makeDeps()

    const result = await setSystemTags(deps, { ...BASE_INPUT, systemTags: ['MAIN', 'SOUP'] })

    expect(result.ok).toBe(true)
    expect(replaceSystemTags).toHaveBeenCalledWith({
      groupDishId: 'gd1',
      systemTags: ['MAIN', 'SOUP'],
    })
  })

  it('TC-023 — gán [] thì món không còn tag nào', async () => {
    const { deps, replaceSystemTags } = makeDeps()

    const result = await setSystemTags(deps, { ...BASE_INPUT, systemTags: [] })

    expect(result.ok).toBe(true)
    expect(replaceSystemTags).toHaveBeenCalledWith({ groupDishId: 'gd1', systemTags: [] })
  })

  it('TC-025 — Member không phải Admin: ERR_NOT_GROUP_ADMIN, không ghi gì', async () => {
    const { deps, replaceSystemTags } = makeDeps({ isAdmin: false })

    const result = await setSystemTags(deps, { ...BASE_INPUT, systemTags: ['MAIN'] })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_NOT_GROUP_ADMIN')
    expect(replaceSystemTags).not.toHaveBeenCalled()
  })

  it('TC-021 — tag ngoài enum: ERR_INVALID_SYSTEM_TAG, không ghi gì', async () => {
    const { deps, replaceSystemTags } = makeDeps()

    const result = await setSystemTags(deps, { ...BASE_INPUT, systemTags: ['BREAKFAST'] })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_INVALID_SYSTEM_TAG')
    expect(replaceSystemTags).not.toHaveBeenCalled()
  })

  it('TC-100 — đủ 5 tag: chấp nhận, lưu theo thứ tự chuẩn', async () => {
    const { deps, replaceSystemTags } = makeDeps()

    await setSystemTags(deps, {
      ...BASE_INPUT,
      systemTags: ['DESSERT', 'SOUP', 'SIDE', 'MAIN', 'STAPLE'],
    })

    expect(replaceSystemTags).toHaveBeenCalledWith({
      groupDishId: 'gd1',
      systemTags: ['STAPLE', 'MAIN', 'SIDE', 'SOUP', 'DESSERT'],
    })
  })

  it('TC-101 — tag lặp: khử trùng trước khi lưu', async () => {
    const { deps, replaceSystemTags } = makeDeps()

    await setSystemTags(deps, { ...BASE_INPUT, systemTags: ['MAIN', 'MAIN', 'MAIN'] })

    expect(replaceSystemTags).toHaveBeenCalledWith({ groupDishId: 'gd1', systemTags: ['MAIN'] })
  })

  it('món không còn ACTIVE trong group: ERR_DISH_NOT_IN_POOL', async () => {
    const { deps, replaceSystemTags } = makeDeps({ dish: null })

    const result = await setSystemTags(deps, { ...BASE_INPUT, systemTags: ['MAIN'] })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_DISH_NOT_IN_POOL')
    expect(replaceSystemTags).not.toHaveBeenCalled()
  })
})
```

---

# 9. `add-dish-to-group.ts` — SỬA (nhận TC-021 theo DEC-024)

Hai thay đổi, không hơn:

```ts
export type AddDishToGroupInput = {
  readonly groupId: string
  readonly creatorUserId: string
  readonly name: string
  readonly systemTags: readonly string[]   // + MỚI, bắt buộc (truyền [] nếu không có)
}

/** `field` để presentation đặt lỗi NGAY DƯỚI đúng input (Design Criteria §12). */
const FAILURE_FOR: Record<DishDraftError, { code: ErrorCode; field: string; reason: string }> = {
  NAME_EMPTY: { code: 'ERR_VALIDATION', field: 'name', reason: 'Tên món không được để trống' },
  NAME_TOO_LONG: { code: 'ERR_VALIDATION', field: 'name', reason: 'Tên món tối đa 120 ký tự' },
  // TC-021 — mã riêng, KHÔNG gộp vào ERR_VALIDATION.
  INVALID_SYSTEM_TAG: {
    code: 'ERR_INVALID_SYSTEM_TAG',
    field: 'systemTag',
    reason: 'Nhãn hệ thống không hợp lệ',
  },
}
```

rồi ở nhánh lỗi:

```ts
const draft = readDishDraft({ name: input.name, systemTags: input.systemTags })

if (!draft.ok) {
  const { code, field, reason } = FAILURE_FOR[draft.error]
  return err(failure(code, { field, reason }))
}
```

và truyền tag xuống repository:

```ts
const created = await deps.dishes.createGlobalDishAndAddToPool({
  groupId: input.groupId,
  name: draft.value.name,
  normalizedName: draft.value.normalizedName,
  creatorUserId: input.creatorUserId,
  systemTags: draft.value.systemTags,
})
```

Nhớ xoá dòng `` * - `systemTags` + `ERR_INVALID_SYSTEM_TAG`     → E2-T5 `` trong khối comment đầu hàm — nó đã xong.

---

# 10. Infrastructure — `drizzle-dish-repository.ts`

## 10.1 `replaceSystemTags` — chỗ dùng phát hiện ở §2

```ts
/**
 * Ghi đè toàn bộ = XOÁ HẾT rồi CHÈN LẠI, trong MỘT transaction.
 *
 * Đây là chỗ khai thác đúng hình dạng của `Readonly<[U, ...U[]]>`: phần tử vị
 * trí 0 là câu DELETE viết thẳng (literal), phần đuôi spread từ `.map()`. Đã
 * kiểm bằng `tsc` thật — `db.batch([del, ...inserts])` xanh, còn
 * `db.batch(inserts)` thì đỏ `TS2345`. Comment ở `createGlobalDishAndAddToPool`
 * dặn "đừng build bằng .map()" là nói về CẢ mảng, không cấm phần đuôi.
 *
 * `systemTags` rỗng (TC-023) thì batch còn đúng một câu DELETE — vẫn hợp lệ,
 * vì tuple chỉ đòi TỐI THIỂU một phần tử.
 *
 * Không cần đọc trước để so sánh: ghi đè không quan tâm trạng thái cũ, nên đây
 * KHÔNG phải ca đọc-rồi-ghi, và không cần driver WebSocket (cùng lý lẽ
 * DEC-018/DEC-020).
 */
async function replaceSystemTags(input: {
  groupDishId: string
  systemTags: readonly SystemTag[]
}): Promise<void> {
  const db = getDb()

  const remove = db.delete(groupDishTags).where(eq(groupDishTags.groupDishId, input.groupDishId))

  const add = input.systemTags.map((tag) =>
    db.insert(groupDishTags).values({ groupDishId: input.groupDishId, systemTag: tag }),
  )

  await db.batch([remove, ...add])
}
```

## 10.2 `findActiveGroupDish`

```ts
async function findActiveGroupDish(input: {
  groupId: string
  groupDishId: string
}): Promise<GroupDishSummary | null> {
  const rows = await getDb()
    .select({ id: groupDishes.id, name: globalDishes.name })
    .from(groupDishes)
    .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
    .where(
      and(
        eq(groupDishes.id, input.groupDishId),
        // Điều kiện làm nên vòng chặn chéo-Group ở §7 — đừng bỏ.
        eq(groupDishes.groupId, input.groupId),
        eq(groupDishes.state, ACTIVE),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}
```

## 10.3 `listActiveInGroup` — trả kèm tag

```ts
/**
 * `array_agg ... FILTER (WHERE ...)` để món KHÔNG có tag nào vẫn ra một hàng
 * với mảng rỗng — `LEFT JOIN` thuần sẽ cho `[null]` thay vì `[]`.
 *
 * `sql<string[]>` là một LỜI KHAI, không phải một phép kiểm: TypeScript tin
 * bạn, Postgres thì không hứa gì. Vì vậy kết quả đi qua `toSystemTags()` — bản
 * khoan dung — để một giá trị lạ trong DB không làm sập trang danh mục. Đây
 * cũng là chỗ mảng được sắp về THỨ TỰ CHUẨN, vì `array_agg` không đảm bảo thứ
 * tự.
 */
async function listActiveInGroup(groupId: string): Promise<GroupDishListItem[]> {
  const rows = await getDb()
    .select({
      id: groupDishes.id,
      name: globalDishes.name,
      systemTags: sql<string[]>`coalesce(array_agg(${groupDishTags.systemTag}) filter (where ${groupDishTags.systemTag} is not null), '{}')`,
    })
    .from(groupDishes)
    .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
    .leftJoin(groupDishTags, eq(groupDishTags.groupDishId, groupDishes.id))
    .where(and(eq(groupDishes.groupId, groupId), eq(groupDishes.state, ACTIVE)))
    .groupBy(groupDishes.id, globalDishes.name, groupDishes.createdAt)
    .orderBy(asc(groupDishes.createdAt))

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    systemTags: toSystemTags(row.systemTags),
  }))
}
```

`groupBy` phải liệt kê **cả `groupDishes.createdAt`** vì `orderBy` dùng cột đó — Postgres đòi mọi cột không-tổng-hợp xuất hiện trong `GROUP BY`. Quên là lỗi lúc chạy, không phải lúc biên dịch.

## 10.4 `createGlobalDishAndAddToPool` — batch dài thêm

```ts
await db.batch([
  db.insert(globalDishes).values({ /* ...như cũ... */ }),
  db.insert(groupDishes).values({ id: groupDishId, groupId: input.groupId, globalDishId, state: ACTIVE }),
  ...input.systemTags.map((tag) => db.insert(groupDishTags).values({ groupDishId, systemTag: tag })),
])
```

Vẫn nguyên tử, vẫn không đọc-giữa-chừng: `groupDishId` đã sinh tường minh từ trước nên các câu tag dựng được ngay.

## 10.5 Integration test — TC-024 (cách ly theo Group)

Đây là test **quan trọng nhất** của slice — đúng câu "Xong nghĩa là" của Master Plan.

```ts
import { and, eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'

import { getDb } from '@/shared/db/client'
import { globalDishes, groupDishes, groupDishTags, groups, users } from '@/shared/db/schema'
import { makeGroup, makeUser } from '@/shared/testing/factories'

import { drizzleDishRepository } from './drizzle-dish-repository'

describe('drizzleDishRepository — System Tag (E2-T5)', () => {
  beforeEach(async () => {
    const db = getDb()
    await db.delete(groupDishTags)
    await db.delete(groupDishes)
    await db.delete(globalDishes)
    await db.delete(groups)
    await db.delete(users)
  })

  it('TC-024 — cùng món ở 2 Group: đổi tag Group A, Group B giữ nguyên', async () => {
    const db = getDb()
    const user = makeUser()
    const groupA = makeGroup({ id: '01920000-0000-7000-8000-0000000000a1', name: 'Nhà A' })
    const groupB = makeGroup({ id: '01920000-0000-7000-8000-0000000000a2', name: 'Nhà B' })
    await db.insert(users).values(user)
    await db.insert(groups).values([groupA, groupB])

    // Group A tạo món, mang sẵn tag MAIN.
    const dishA = await drizzleDishRepository.createGlobalDishAndAddToPool({
      groupId: groupA.id,
      name: 'Canh chua',
      normalizedName: 'canh chua',
      creatorUserId: user.id,
      systemTags: ['MAIN'],
    })

    // Group B dùng CÙNG Global Dish, nhưng gắn tag SOUP.
    const [globalDish] = await db.select().from(globalDishes)
    const groupDishB = '01920000-0000-7000-8000-0000000000b1'
    await db.insert(groupDishes).values({
      id: groupDishB,
      groupId: groupB.id,
      globalDishId: globalDish!.id,
      state: 'ACTIVE',
    })
    await drizzleDishRepository.replaceSystemTags({
      groupDishId: groupDishB,
      systemTags: ['SOUP'],
    })

    // Đổi tag ở Group A.
    await drizzleDishRepository.replaceSystemTags({
      groupDishId: dishA.id,
      systemTags: ['STAPLE', 'DESSERT'],
    })

    const listA = await drizzleDishRepository.listActiveInGroup(groupA.id)
    const listB = await drizzleDishRepository.listActiveInGroup(groupB.id)

    expect(listA[0]?.systemTags).toEqual(['STAPLE', 'DESSERT'])
    expect(listB[0]?.systemTags).toEqual(['SOUP'])   // ← GIỮ NGUYÊN
  })

  it('TC-023 — replaceSystemTags([]) xoá sạch tag', async () => {
    const db = getDb()
    const user = makeUser()
    const group = makeGroup()
    await db.insert(users).values(user)
    await db.insert(groups).values(group)
    const dish = await drizzleDishRepository.createGlobalDishAndAddToPool({
      groupId: group.id,
      name: 'Canh chua',
      normalizedName: 'canh chua',
      creatorUserId: user.id,
      systemTags: ['MAIN', 'SOUP'],
    })

    await drizzleDishRepository.replaceSystemTags({ groupDishId: dish.id, systemTags: [] })

    const rows = await db
      .select()
      .from(groupDishTags)
      .where(eq(groupDishTags.groupDishId, dish.id))
    expect(rows).toHaveLength(0)
    const list = await drizzleDishRepository.listActiveInGroup(group.id)
    expect(list[0]?.systemTags).toEqual([])   // món không tag vẫn ra một hàng
  })

  it('findActiveGroupDish chặn truy cập chéo Group', async () => {
    const db = getDb()
    const user = makeUser()
    const groupA = makeGroup({ id: '01920000-0000-7000-8000-0000000000a1' })
    const groupB = makeGroup({ id: '01920000-0000-7000-8000-0000000000a2', name: 'Nhà B' })
    await db.insert(users).values(user)
    await db.insert(groups).values([groupA, groupB])
    const dishA = await drizzleDishRepository.createGlobalDishAndAddToPool({
      groupId: groupA.id,
      name: 'Canh chua',
      normalizedName: 'canh chua',
      creatorUserId: user.id,
      systemTags: [],
    })

    const stolen = await drizzleDishRepository.findActiveGroupDish({
      groupId: groupB.id,          // Admin của B…
      groupDishId: dishA.id,       // …nhắm vào món của A
    })

    expect(stolen).toBeNull()
  })
})
```

---

# 11. Presentation

## 11.1 `system-tag-label.ts` — MỚI

```ts
import type { SystemTag } from '../../domain/system-tag'

/**
 * Nhãn tiếng Việt, lấy nguyên văn mockup S-05/S-06
 * (`designs/S-05 S-06 Danh muc mon.dc.html:164`).
 *
 * Nằm ở presentation vì đây là CHỮ HIỂN THỊ; còn THỨ TỰ nằm ở
 * `domain/system-tag.ts` (`SYSTEM_TAGS`) vì đó là thứ tự mâm cơm, không phải
 * thẩm mỹ. E6-T2 gom mọi chuỗi tiếng Việt về một chỗ thì mang cả file này đi.
 */
export const SYSTEM_TAG_LABELS: Record<SystemTag, string> = {
  STAPLE: 'Cơm',
  MAIN: 'Món mặn',
  SIDE: 'Món phụ',
  SOUP: 'Canh',
  DESSERT: 'Tráng miệng',
}
```

## 11.2 `system-tag-field.tsx` — MỚI

Dùng `<input type="radio">` thật, không phải `<Button>`:

- Chọn-một-trong-nhiều **là** ngữ nghĩa radio. Screen reader đọc đúng "nhóm nút chọn, 1 trong 5" mà không cần một dòng ARIA nào.
- Radio có `name` nên `FormData` tự mang giá trị đi — Server Action đọc `formData.get('systemTag')`, không cần state đồng bộ vào hidden input.
- `<Button>` render ra `<button>`; đặt 5 cái `<button>` trong `<form>` sẽ biến chúng thành nút submit — sai hoàn toàn.

```tsx
'use client'

import type { ReactElement } from 'react'

import { SYSTEM_TAGS, type SystemTag } from '../../domain/system-tag'
import { SYSTEM_TAG_LABELS } from './system-tag-label'

export type SystemTagFieldProps = {
  value: SystemTag | null
  error: string | null
  onChange: (tag: SystemTag) => void
}

/**
 * S-06 — hàng chip "Nhãn — chọn một".
 *
 * CHỌN MỘT là quyết định của riêng màn này (mockup dòng 130/222/232), KHÔNG
 * phải giới hạn của mô hình: `group_dish_tags` và `setSystemTags` nhận 0..5
 * (BR-003, TC-022, TC-100). Màn sửa tag đa chọn là E2-T6. Đừng "sửa cho nhất
 * quán" bằng cách bóp mô hình xuống một tag.
 *
 * Chiều cao 44px lấy từ mockup — cũng vừa đúng ngưỡng vùng chạm tối thiểu.
 */
export function SystemTagField({ value, error, onChange }: SystemTagFieldProps): ReactElement {
  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0">
      <legend className="text-caption font-medium text-ink-muted">Nhãn — chọn một</legend>

      <div className="flex flex-wrap gap-2">
        {SYSTEM_TAGS.map((tag) => {
          const selected = value === tag
          return (
            <label
              key={tag}
              className={`flex min-h-11 cursor-pointer items-center rounded-chip px-4 text-body font-medium transition-colors ${
                selected
                  ? 'bg-accent text-on-accent'
                  : 'border border-border bg-surface-raised text-ink hover:border-border-strong'
              }`}
            >
              {/* `sr-only` chứ không `hidden`: input vẫn nhận được focus bàn
                  phím và vẫn nằm trong FormData. `hidden` thì mất cả hai. */}
              <input
                type="radio"
                name="systemTag"
                value={tag}
                checked={selected}
                onChange={() => onChange(tag)}
                className="sr-only"
              />
              {SYSTEM_TAG_LABELS[tag]}
            </label>
          )
        })}
      </div>

      {error === null ? null : (
        <span role="alert" className="text-caption font-medium text-danger">
          {error}
        </span>
      )}
    </fieldset>
  )
}
```

Kiểm `rounded-chip`, `text-danger`, `bg-accent`, `text-on-accent` có trong `@theme` của `src/app/globals.css` không trước khi code — các token này lấy từ quy ước đã ghi ở guide S1/S2 của E1, không phải đọc lại lần này.

## 11.3 `add-dish-sheet.tsx` — SỬA

```tsx
const [name, setName] = useState('')
const [tag, setTag] = useState<SystemTag | null>(null)

// ...trong <form>, GIỮA TextField và nút submit:
<SystemTagField value={tag} error={systemTagError} onChange={setTag} />

// Nút submit: `muted` khi THIẾU BẤT KỲ thứ nào trong hai (mockup dòng 232 —
// không lưu được nếu chưa chọn nhãn). Vẫn `muted` chứ không `disabled`, giữ
// đúng lý lẽ sẵn có: bấm được thì mới hiện được lỗi.
<Button type="submit" pending={pending} muted={name.trim() === '' || tag === null}>
```

`AddDishSheetProps` thêm `systemTagError: string | null`. Cập nhật khối comment cuối file: xoá `` hàng chip "Nhãn — chọn một" (E2-T5) `` khỏi danh sách "CỐ Ý chưa có", giữ lại mục E2-T7.

## 11.4 `dish-catalog-screen.tsx` — SỬA

```ts
export type AddDishFormState = {
  readonly nameError: string | null
  readonly systemTagError: string | null   // + MỚI
  readonly addedDishName: string | null
}

const ADD_DISH_INITIAL_STATE: AddDishFormState = {
  nameError: null,
  systemTagError: null,
  addedDishName: null,
}

export type DishCatalogScreenProps = {
  groupName: string
  dishes: { id: string; name: string; systemTags: readonly SystemTag[] }[]   // + tag
  action: (state: AddDishFormState, formData: FormData) => Promise<AddDishFormState>
}
```

và hàng món cuối cùng có `meta` thật — đúng lời hứa trong comment của `dish-row.tsx` (*"Ở S3 luôn rỗng; E2-T5 đưa nhãn hệ thống vào đây"*):

```tsx
<DishRow
  key={dish.id}
  name={dish.name}
  meta={dish.systemTags.map((tag) => SYSTEM_TAG_LABELS[tag]).join(' · ')}
/>
```

Món chưa có tag → `meta=""` → hàng hiện y như cũ. `dish-row.tsx` **không phải sửa một dòng nào**.

Comment "CỐ Ý chưa có ở S3" ở đầu component: bỏ `nhóm theo nhãn (E2-T5/T6)` → đổi thành `(E2-T6)`, vì phần E2-T5 đã xong.

---

# 12. `app/` — nối dây

## 12.1 `requireGroupAdminContext` — trùng với guide S1, đừng viết hai lần

Guide E2-S1 (§11) cũng thêm đúng hàm này vào `group-access.ts`. **Slice nào code trước thì viết; slice sau chỉ dùng lại.** Nội dung y hệt `requireGroupContext` nhưng `requiredRole: 'ADMIN'`.

Nếu S1 chưa code, chép từ guide S1 §11 sang. Nếu đã code rồi, bỏ qua bước này hoàn toàn.

## 12.2 `dishes/actions.ts` — SỬA

`addDishAction` đọc thêm tag từ `FormData`:

```ts
const rawTag = formData.get('systemTag')

const result = await addDishToGroup(
  { dishes: drizzleDishRepository },
  {
    groupId,
    creatorUserId: user.id,
    name: String(formData.get('name') ?? ''),
    // Chưa chọn thì gửi mảng RỖNG, không phải [''] — chuỗi rỗng sẽ thành
    // ERR_INVALID_SYSTEM_TAG và làm người dùng thấy sai thông điệp.
    systemTags: typeof rawTag === 'string' && rawTag !== '' ? [rawTag] : [],
  },
)
```

và `toVietnameseMessage` thêm nhánh, cùng việc tách lỗi về đúng field:

```ts
if (!result.ok) {
  const message = toVietnameseMessage(result.error)
  return result.error.code === 'ERR_INVALID_SYSTEM_TAG'
    ? { nameError: null, systemTagError: message, addedDishName: null }
    : { nameError: message, systemTagError: null, addedDishName: null }
}
```

```ts
// thêm vào toVietnameseMessage:
if (error.code === 'ERR_INVALID_SYSTEM_TAG') {
  return 'Chọn một nhãn để quy định bữa ăn kiểm tra được.'
}
```

Câu đó lấy nguyên văn mockup (dòng 227) — không tự nghĩ câu khác.

## 12.3 `setSystemTagsAction` — có nên làm ở slice này không?

**Chưa.** Master Plan giao màn sửa tag cho E2-T6 (S4), và chưa có màn hình nào để bấm. Viết một Server Action chưa ai gọi thì `knip` sẽ báo export chết và `yarn verify` đỏ.

`setSystemTags` (use case) vẫn được test đầy đủ ở tầng `A` — S4 chỉ việc nối dây. Khi tới đó, chỗ nối là:

```ts
const result = await setSystemTags(
  {
    dishes: drizzleDishRepository,
    assertAdmin: ({ userId, groupId }) =>
      assertGroupAccess(
        { memberships: drizzleMembershipRepository },
        { userId, groupId, requiredRole: 'ADMIN' },
      ),
  },
  { groupId, groupDishId, systemTags, requestedByUserId: user.id },
)
```

> Nếu `knip` báo `setSystemTags` là export không dùng ngay trong slice này: đó là báo đúng. Xử lý bằng cách để S4 nối dây sớm, hoặc thêm ngoại lệ tạm trong `knip.json` kèm comment trỏ tới E2-T6 — **đừng** viết một action giả để dỗ công cụ.

---

# 13. Quan hệ với S2 (E2-T3/T4) — hai slice cùng đụng `add-dish-to-group.ts`

E2-T5 phụ thuộc **E1-T5**, không phụ thuộc E2-T4 (Master Plan ghi rõ). Nên code slice này trước hay sau S2 đều được. Nhưng hai slice sửa chồng lên nhau ở ba file:

| File | S2 (E2-T4) làm gì | S3 (E2-T5) làm gì | Gộp thế nào |
| --- | --- | --- | --- |
| `add-dish-to-group.ts` | Đổi output thành union `AddDishOutcome`; thêm nhánh reactivate/candidates | Thêm input `systemTags`; đổi `FAILURE_DETAILS` → `FAILURE_FOR` | Không đụng nhau — một bên input, một bên output. Gộp thẳng. |
| `dish-repository.ts` | + `GroupDishLookup`, `findGlobalCandidates…`, `reactivateGroupDish`, `addExistingGlobalDishToGroup` | + `GroupDishListItem`, `findActiveGroupDish`, `replaceSystemTags`; `NewDishInGroup` thêm `systemTags` | Chỉ cùng thêm method vào một interface. Gộp thẳng. |
| `dishes/actions.ts` | Xử lý nhánh `kind: 'candidates'` | Đọc `systemTag` từ FormData, tách `systemTagError` | Gộp thẳng. |

**Một điểm cần quyết khi code slice đến sau**: nhánh **reactivate** của S2 (Dish `INACTIVE` được thêm lại) hiện không đụng gì tới tag — món quay lại với bộ tag cũ. Nhưng sheet S-06 vừa bắt người dùng chọn một nhãn, nên bỏ qua lựa chọn đó là im lặng nuốt mất thao tác.

Khuyến nghị: nhánh reactivate gọi thêm `replaceSystemTags` với tag vừa chọn. Không tài liệu nào nói phải thế (SPEC-005 im lặng về tag khi khôi phục) — ghi lại quyết định nếu bạn làm khác.

---

# 14. Ngoài phạm vi Master Plan, nhưng rẻ — deck hiện tag thật

`src/features/selection/domain/dish-card.ts:6-7` đang có:

```ts
/** Luôn rỗng ở S5 — `group_dish_tags` là E2-T5, chưa tồn tại. */
readonly systemTags: readonly string[]
```

và `drizzle-selection-repository.ts:70` hardcode `systemTags: []`, trong khi `dish-swipe-card.tsx` **đã render sẵn** chip tag. Sau slice này, bảng đã tồn tại nên chỗ hardcode đó nối được — `ALLOWED_CROSS_FEATURE` cho phép `selection → dish`.

**Nhưng cột "File" của E2-T5 trong Master Plan là `src/features/dish/**`**, không có `selection`. Nên đây là việc **tuỳ chọn, ngoài phạm vi**: làm thì deck đẹp hơn ngay, không làm thì không nợ gì cả. Nếu làm, chỉ cần thêm `LEFT JOIN group_dish_tags` + `array_agg` vào `listEligibleDishCards` đúng khuôn §10.3, và đổi kiểu `readonly string[]` → `readonly SystemTag[]`.

Ghi ở đây để bạn **quyết**, không phải để lặng lẽ làm.

---

# 15. Rủi ro

| Rủi ro | Hậu quả | Giảm thiểu |
| --- | --- | --- |
| `features/dish` import thẳng `features/group` để dùng `assertGroupAccess` | `yarn arch:probe` đỏ; ranh giới feature vỡ | §8.1 — tiêm `assertAdmin` qua deps. Chạy `arch:probe` NGAY sau khi viết `set-system-tags.ts` |
| `sql<string[]>` ở `array_agg` là lời khai, `tsc` không kiểm được | Enum lạ trong DB làm vỡ kiểu lúc chạy | Đi qua `toSystemTags()` khoan dung (§10.3); integration test là chỗ kiểm thật |
| Quên `groupDishes.createdAt` trong `groupBy` | Lỗi Postgres lúc chạy, không phải lúc build | §10.3 đã ghi; integration test bắt được ngay |
| Số migration đặt trùng (`0003` theo guide S1 cũ) | `drizzle-kit migrate` lệch thứ tự, build Vercel đỏ | §1.4 — dùng `yarn db:generate`, đừng đặt tay |
| "Chọn một" của UI rò xuống port | `setSystemTags` mất khả năng nhận 0..5, TC-022/TC-100 vỡ khi S4 làm màn sửa tag | Comment cảnh báo đã đặt sẵn trong `system-tag-field.tsx`; test tầng A của `setSystemTags` giữ hợp đồng |
| `knip` báo `setSystemTags` export chết vì chưa ai gọi | `yarn verify` đỏ dù code đúng | §12.3 — đừng viết action giả; để S4 nối, hoặc ngoại lệ tạm có comment |

---

# 16. Test Cases coverage

| TC | Nội dung | Tầng | Nơi test |
| --- | --- | --- | --- |
| `TC-021` | `systemTags = ["BREAKFAST"]` → `ERR_INVALID_SYSTEM_TAG` | A | `system-tag.test.ts`, `set-system-tags.test.ts`, `add-dish-to-group.test.ts` |
| `TC-022` | Ghi đè `[MAIN]` → `[MAIN, SOUP]`, đúng 2 tag | A | `set-system-tags.test.ts` |
| `TC-023` | Gán `[]` → không còn tag | A + I | `set-system-tags.test.ts`, integration |
| `TC-024` | Đổi tag Group A, Group B giữ nguyên | I | `drizzle-dish-repository.integration.test.ts` |
| `TC-025` | Member đổi tag → `ERR_NOT_GROUP_ADMIN` | A | `set-system-tags.test.ts` |
| `TC-100` | Đủ 5 giá trị khác nhau → hợp lệ | A | `system-tag.test.ts`, `set-system-tags.test.ts` |
| `TC-101` | Giá trị lặp → khử trùng trước khi lưu | A | `system-tag.test.ts`, `set-system-tags.test.ts` |

---

# 17. Thứ tự TDD

1. `system-tag.test.ts` → `system-tag.ts`
2. `dish-draft.test.ts` (mở rộng) → `dish-draft.ts`
3. `schema.ts` + `yarn db:generate`
4. `dish-repository.ts` (port — chỉ type, không test riêng)
5. `set-system-tags.test.ts` → `set-system-tags.ts` → **`yarn arch:probe` ngay**
6. `add-dish-to-group.test.ts` (mở rộng) → `add-dish-to-group.ts`
7. `drizzle-dish-repository.ts` → integration test (TC-024)
8. `system-tag-field.test.tsx` → `system-tag-field.tsx` + `system-tag-label.ts`
9. `add-dish-sheet.tsx`, `dish-catalog-screen.tsx`, `dishes/actions.ts`
10. `yarn verify && yarn arch:probe && yarn test:integration`

---

# 18. Verify

## 18.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn build
yarn test:integration
```

`yarn test` phải in `readSystemTags` (TC-021, TC-023, TC-100, TC-101), `toSystemTags`, `isSystemTag`, `setSystemTags` (TC-022, TC-023, TC-025, TC-100, TC-101), `SystemTagField`. `yarn test:integration` in ba ca của `drizzleDishRepository — System Tag (E2-T5)`, trong đó **TC-024 là ca quan trọng nhất của cả slice**.

**`yarn arch:probe` phải chạy ngay sau khi viết `set-system-tags.ts`**, đừng để tới cuối. `features/dish` không được import `features/group`, mà use case này lại cần `assertGroupAccess` — nếu bạn lỡ import thẳng thì đây là chỗ nó đỏ, và sửa sớm rẻ hơn sửa sau khi đã viết xong presentation (§8.1).

Hai cổng dễ đỏ ngoài dự đoán:

| Lệnh | Đỏ vì gì | Sửa |
| --- | --- | --- |
| `yarn knip` | `setSystemTags` export mà chưa ai gọi — S4 mới nối dây | §12.3 đã bàn: để S4 nối sớm, hoặc thêm ngoại lệ tạm có comment trỏ E2-T6. **Đừng** viết một Server Action giả để dỗ công cụ |
| `yarn build` | `groupBy` thiếu `groupDishes.createdAt` | Lỗi Postgres lúc chạy chứ không phải lúc biên dịch — chỉ integration test bắt được (§10.3) |

## 18.2 TC-024 — bằng chứng cách ly theo Group

Đây là câu "Xong nghĩa là" của Master Plan cho E2-T5: *"Đổi tag ở Group A không ảnh hưởng Group B."* Integration test đã phủ, nhưng nên nhìn tận mắt một lần vì đây là bất biến quan trọng nhất của bảng `group_dish_tags`:

1. Tạo **Nhóm A**, thêm món `Canh chua`, chọn nhãn `Canh`.
2. Tạo **Nhóm B**. Thêm đúng `Canh chua` — vì cùng `normalized_name`, nó dùng lại đúng Global Dish đó (hoặc tạo mới nếu S2 chưa code; cả hai đều được cho phép kiểm này). Chọn nhãn `Món mặn`.
3. `yarn db:studio` → `group_dish_tags`:
   - **Hai dòng**, mỗi dòng một `group_dish_id` khác nhau, `system_tag` khác nhau.
   - Không dòng nào trỏ `global_dish_id` — cột đó **không tồn tại** trong bảng này. Đó chính là lý do cách ly là tính chất cấu trúc, không phải điều kiện `WHERE` ai đó phải nhớ (§6.1).
4. Đổi nhãn món ở Nhóm A. → Dòng của Nhóm B **không đổi một ký tự nào**.

## 18.3 Gán tag khi chưa có UI sửa tag

Màn sửa nhãn là E2-T6 (S4), nên ở slice này chỉ có **một** đường gán tag qua giao diện: chip "Nhãn — chọn một" trong sheet thêm món.

- **Kiểm được qua UI**: thêm món có chọn nhãn → `group_dish_tags` có đúng một dòng; danh mục hiện nhãn ở cột phải của hàng món (§11.4).
- **Chưa kiểm được qua UI**: `setSystemTags` với nhiều nhãn (TC-022), với mảng rỗng (TC-023), và ca Member-không-phải-Admin (TC-025). Ba ca này chỉ có test tầng `A` và integration cho tới khi S4 dựng `edit-dish-sheet.tsx`. **Đừng viết Server Action tạm chỉ để thử tay** — nó sẽ thành export chết mà `knip` bắt, và S4 sẽ phải xoá đi viết lại.

## 18.4 Backfill nhãn cho món cũ? Không cần

Khác E2-T3 (đổi `normalized_name` của dữ liệu đã có nên **bắt buộc** backfill), slice này chỉ **thêm** một bảng rỗng. Món tạo từ E1 đơn giản là chưa có nhãn — hợp lệ theo TC-023, và hiển thị bình thường với `meta` rỗng. Không có script backfill nào cho E2-T5.

---

# 19. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v3.9.md`

```markdown
# DEC-025 — System Tag: Model Accepts 0..5, Add-Dish Sheet Enforces Exactly One

**Date:** 2026-08-18
**Status:** Accepted

## Decision

`group_dish_tags`, the `setSystemTags` use case (SPEC-006), and `addDishToGroup`
all accept 0 to 5 System Tags. The S-06 "add dish" sheet, however, presents a
single-select required chip row, sending exactly one tag. Multi-select editing
arrives with E2-T6's dish catalog screen.

## Rationale

The documents genuinely disagree. BR-003 states a dish may carry multiple tags;
TC-022 assigns two, TC-023 assigns zero, TC-100 assigns five. The S-06 mockup
(`designs/S-05 S-06 Danh muc mon.dc.html`) does the opposite: line 130 labels the
row "Nhãn — chọn một", line 222 stores a scalar, line 232 refuses to save without
one.

Resolved by scope rather than compromise: the data model and every port follow
the formal spec, because TC-022/023/100 are binding contracts. The sheet follows
the mockup, because it is a quick-entry path and the mockup states its own reason
("Chọn một nhãn để quy định bữa ăn kiểm tra được") — a nudge toward tagging so
Required Rules can see the dish, not a data constraint. Master Plan already
assigns "sửa tag" to E2-T6, which is where full multi-select belongs.

## Consequence

`SystemTagField` carries an explicit warning against "fixing the inconsistency"
by narrowing the model to one tag. E2-T6 must add multi-select editing without
touching the port.

## Affected Documents

- SDD SPEC-006 (no change; documents that it carries no cardinality annotation)
- Design README §S-06 (describes plural "System Tags"; mockup enforces one)
- Master Plan §4 (E2-T5 / E2-T6 boundary)
```

Ngoài ra, cân nhắc ghi thêm hai điều chỉnh nhỏ vào phần "Affected Documents" của **DEC-024** đã có: Master Plan dòng 131 (dải TC của E2-T5) vẫn chưa liệt kê `TC-021`, và bảng coverage của Test Cases cũng chưa đổi. Cả hai là sửa một dòng.

---

# 20. Master Plan

Sau khi `yarn verify`, `yarn arch:probe`, `yarn test:integration` xanh: tick `E2-T5` ở §4, và thêm `TC-021` vào cột "Nguồn" của dòng đó (theo DEC-024).
