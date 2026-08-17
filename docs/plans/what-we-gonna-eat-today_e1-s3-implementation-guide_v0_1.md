# Implementation Guide — E1 Slice S3 / Dish thô

## Version 0.1

**Status:** Ready to code
**Created:** 2026-08-17
**Upstream:** Master Plan v1.0 §3 (E1-T5), SDD v0.2 SPEC-005 (rút gọn), Tech Spec v0.2 §2/§3.1/§3.3/§4.2/§5, Business Rules BR-001/BR-005, Design Handoff `docs/designs/README.md` S-04/S-05/S-06
**Tiền đề:** guide S1 (`..._e1-t1-...`) và guide S2 (`..._e1-s2-...`) đã thi công xong
**Lưu ý đường dẫn:** thư mục thiết kế nay là `docs/designs/` (số nhiều) và các guide nằm ở `docs/plans/`. Guide S1 và S2 đã được sửa đường dẫn theo, cùng lúc với slice này.

> Tài liệu này là hướng dẫn thi công, không phải đặc tả. Khi nó lệch với SDD / Tech Spec / Design Handoff thì **các tài liệu kia đúng**.

---

# 0. Phạm vi và điều kiện xong

| ID | Việc | Giờ | Xong nghĩa là |
|---|---|---|---|
| E1-T5 | Schema `global_dishes`, `group_dishes`, thêm món không chuẩn hoá | 2 | Thêm được món và thấy trong danh sách |

- [ ] Thêm món thật trên `/groups/<uuid>/dishes`, món hiện ngay trong danh sách
- [ ] `yarn db:studio` cho thấy `global_dishes.created_by_user_id` + `created_from_group_id` + `created_at` (BR-001) và `group_dishes.state = 'ACTIVE'` (BR-005)
- [ ] Thêm lại đúng tên đó → lỗi `Món này đã có trong danh mục rồi.` ngay dưới ô tên, **không** ghi thêm dòng nào vào DB
- [ ] Người ngoài nhóm mở `/groups/<uuid>/dishes` → 404 (SPEC-019, Tech Spec §5)
- [ ] `yarn verify` · `yarn arch:probe` · `yarn build` xanh
- [ ] PR link SPEC-005, BR-001, BR-005

**Không có TC nào của Test Cases v0.1 gán cho E1-T5.** TC-017→021 thuộc E2-T4, TC-098 thuộc E2-T3. Quy ước đặt tên `it()` cho slice này ở §13.

Màn hình dựng ở slice này: **S-05 Danh mục món** (danh sách phẳng) + **S-06 sheet "Thêm món"** (chỉ ô tên) + **bật hàng lối tắt "Danh mục món" và CTA "Thêm món đầu tiên" của S-04**.

## 0.1 Phần của SPEC-005 CỐ Ý bỏ

| Bỏ ở S3 | Về đâu |
|---|---|
| Bỏ dấu tiếng Việt trong `normalized_name` | E2-T3 |
| Phát hiện trùng phạm vi toàn cục + `existingCandidates` + `forceCreate` | E2-T4 |
| Khôi phục Group Dish `INACTIVE` về `ACTIVE` | E2-T4 |
| `systemTags`, bảng `group_dish_tags`, `ERR_INVALID_SYSTEM_TAG` | E2-T5 |
| Nhóm theo nhãn, ô tìm kiếm, thẻ "không khớp", nhóm "Đã gỡ khỏi nhóm" | E2-T6 |
| Khối "Nhà bạn đã có món gần giống" + "Dùng món này" / "vẫn tạo mới" | E2-T7 |

---

# 1. Phát hiện đã kiểm bằng lệnh — đọc trước khi gõ

Không mục nào viết theo trí nhớ. Mỗi mục ghi rõ file đã đọc.

## 1.1 `error.tsx` của Next 16 dùng prop `retry`, không phải `reset`

`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`:

> `retry` — "In most cases, you should use `retry()` instead" (mục `#reset`).

`node_modules/next/dist/client/components/error-boundary.d.ts` xác nhận cả hai tồn tại:

```ts
export type ErrorInfo = {
  error: unknown
  reset: () => void
  retry: () => void
}
```

Khác biệt thật: `reset()` chỉ xoá state của error boundary rồi render lại **cùng dữ liệu cũ**; `retry()` **fetch lại rồi render lại**. Nút "Thử lại" của thiết kế nghĩa là fetch lại → dùng `retry`.

→ `app/groups/[groupId]/dishes/error.tsx` dùng `retry`. **Guide S2 §11.3 viết `reset` — đó là chỗ sai; sửa luôn `app/groups/error.tsx` trong slice này** (một dòng, thuộc phạm vi vì cùng lỗi).

## 1.2 `refresh()` từ `next/cache` là API mới, hợp đúng ca của S3

`node_modules/next/cache.d.ts`:

```ts
export { revalidatePath, revalidateTag, updateTag, refresh } from 'next/dist/server/web/spec-extension/revalidate'
```

`03-api-reference/04-functions/refresh.md`: *"`refresh` can **only** be called from within Server Actions."* Nó làm tươi client router của **trang đang đứng**, không đụng data cache.

S2 dùng `revalidatePath('/groups')` rồi `redirect` — đúng cho luồng "ghi xong thì đi chỗ khác". S3 thì **ở lại đúng trang vừa ghi**, nên `refresh()` là API đúng nghĩa. Xem §11.3 để biết vì sao vẫn cần thêm một `revalidatePath`.

## 1.3 `revalidatePath` với route động **bắt buộc** tham số thứ hai

`04-functions/revalidatePath.md`:

> *"If `path` contains a dynamic segment, for example `/product/[slug]`, this parameter is required. If `path` is a literal path like `/product/1`, omit `type`."*

→ Viết `revalidatePath(\`/groups/${groupId}\`)` (đường dẫn **literal**, đã thay `groupId` thật, **không** truyền `'page'`). Viết `revalidatePath('/groups/[groupId]', 'page')` sẽ xoá cache trang nhóm của **mọi** nhóm — đắt và sai phạm vi.

Docs cũng cảnh báo `revalidatePath` trong Server Function hiện *"causes all previously visited pages to refresh when navigated to again"*. Đó là lý do §11.3 dùng nó **một lần duy nhất, cho đúng một đường dẫn**.

## 1.4 `notFound()` gọi được trong Server Action

`04-functions/not-found.md` dòng 15: *"`notFound()` can be invoked in Server Components, **Server Functions**, and Route Handlers."*

→ Helper `requireGroupContext()` ở §11.1 dùng chung được cho cả `page.tsx` lẫn `actions.ts`. Không phải viết hai bản.

## 1.5 `db.batch()` của neon-http vẫn là transaction thật — đã kiểm lại

`node_modules/drizzle-orm/neon-http/session.js:117-133`:

```js
async batch(queries) {
  …
  const batchResults = await this.client.transaction(builtQueries, queryConfig)
  …
}
```

và dòng 152/158 vẫn là `throw new Error("No transactions support in neon-http driver")` cho `transaction()`.

Kiểu (đọc `node_modules/drizzle-orm/neon-http/driver.d.ts:27`):

```ts
batch<U extends BatchItem<'pg'>, T extends Readonly<[U, ...U[]]>>(batch: T): Promise<BatchResponse<T>>
```

→ `createGlobalDishAndAddToPool` (2 INSERT: `global_dishes` rồi `group_dishes`) chạy nguyên tử được, thoả SDD §2.4. Batch **non-interactive** nên **cả hai id sinh tường minh bằng `uuidv7()`** — `group_dishes.global_dish_id` cần biết id của `global_dishes` trước khi câu thứ hai được dựng. Truyền **literal array 2 phần tử**, không `.map()`, không gán qua `const queries: X[]`.

## 1.6 `pgEnum` — drizzle-kit sinh cả `CREATE TYPE` lẫn `ALTER TYPE … ADD VALUE`

`node_modules/drizzle-kit/bin.cjs`:

```
23725:  let statement = `CREATE TYPE ${enumNameWithSchema} AS ENUM${valuesStatement};`
23747:  return `ALTER TYPE ${enumNameWithSchema} ADD VALUE '${value}'${before.length ? ` BEFORE '${before}'` : ''};`
```

→ Lập luận *"`pgEnum` bắt buộc migration viết tay khi thêm giá trị"* **không đúng với drizzle-kit 0.31.10**: thêm giá trị vào mảng rồi `yarn db:generate` là xong. Xem quyết định ở §2.2.

## 1.7 `index()` nhận nhiều cột

`node_modules/drizzle-orm/pg-core/indexes.d.ts`:

```ts
on(...columns: [Partial<ExtraConfigColumn> | SQL, ...Partial<ExtraConfigColumn | SQL>[]]): IndexBuilder
```

→ `index('group_dishes_group_state_idx').on(table.groupId, table.state)` hợp lệ (Tech Spec §3.3).

---

# 2. Bảy quyết định kiến trúc

## 2.1 Server Action đặt ở `src/app/`, y hệt S2 — nhưng lý do mạnh hơn

`ALLOWED_CROSS_FEATURE` trong `eslint.config.mjs` cho `dish` **không có** chiều nào ra ngoài. `CROSS_FEATURE_ZONES` sinh:

```js
{ target: './src/features/dish', from: './src/features', except: ['./dish'] }
```

→ mọi file dưới `src/features/dish/` import `@/features/auth/**` **hoặc** `@/features/group/**` đều là lỗi ESLint. Mà action cần cả hai: `getCurrentUser()` (auth) và `assertGroupAccess()` (group).

→ `addDishAction` đặt ở **`src/app/groups/[groupId]/dishes/actions.ts`**. `actions.ts` không phải tên file quy ước của Next nên nó không trở thành route.

## 2.2 `group_dishes.state` khai bằng `pgEnum`, không phải `text().$type<>()`

`users` / `groups` / `group_members` chưa có cột enum nào, nên **S3 là chỗ đặt tiền lệ cho 6 enum còn lại** (`SessionState`, `ParticipantState`, `InteractionType`, `RuleType`, `InvalidReason`, `GroupRole`).

Chọn **`pgEnum`**:

| | `pgEnum` | `text().$type<>()` |
|---|---|---|
| DB từ chối giá trị rác | ✅ | ❌ — một `'active'` viết thường lọt vào là mọi `WHERE state = 'ACTIVE'` im lặng bỏ sót |
| Kiểu TS | drizzle tự suy `'ACTIVE' \| 'INACTIVE'` từ mảng | phải viết `$type<GroupDishState>()`, tức khai hai lần |
| Thêm giá trị sau này | `ALTER TYPE … ADD VALUE`, drizzle-kit tự sinh (§1.6) | không cần migration |
| Đổi tên / xoá giá trị | thật sự đau | dễ |

`GroupDishState = ACTIVE | INACTIVE` là tập **đóng hai giá trị** ở SDD §2.2 — nó sẽ không lớn thêm, nên cột "đổi tên/xoá" không tính. Cột "DB từ chối rác" mới là cột quyết định: nếu `group_dishes.state` sai giá trị thì SPEC-010 eligible set âm thầm trả thiếu món, và đó là loại lỗi không ai phát hiện được cho tới khi có người hỏi *"sao món này không bao giờ ra?"*.

Đặt tên: type Postgres là `group_dish_state` (snake_case, theo SDD §2.1 dòng "Bảng/Cột"), giá trị `'ACTIVE' | 'INACTIVE'` (UPPER_SNAKE, theo dòng "Enum trong DB").

**Chỗ hai bên gặp nhau và `tsc` canh được:** `domain/group-dish.ts` khai `GroupDishState` là union thuần (domain không được import drizzle). `shared/db/schema.ts` khai `pgEnum` riêng. Chúng **không** có ràng buộc biên dịch trực tiếp — cùng lý do `factories.ts` không import type từ `features/`. Điểm gặp là `infrastructure/drizzle-dish-repository.ts`: `row.state` do drizzle suy ra literal union, gán vào biến kiểu `GroupDishState` → lệch một ký tự là `tsc` đỏ ngay tại đó. Ghi comment ở cả hai file trỏ vào nhau.

## 2.3 `normalize-name.ts` — S3 **được** tạo đúng file mà Master Plan gán cho E2-T3

Master Plan ghi cột "Phạm vi file" của E2-T3 là `features/dish/domain/normalize-name.ts`. Cột đó nói **việc rơi vào đâu**, không phải **ai được chạm trước** — S2 đã sửa `features/session/domain/decision-date.ts` (file mà Master Plan gán cho E1-T4) trong lúc làm E1-T2/T3, và ghi rõ điều đó. Tiền lệ có sẵn.

Tạo file khác tên (ví dụ `dish-name.ts`) là lựa chọn **tệ hơn**: E2-T3 khi đó phải hoặc tạo file thứ hai (hai bộ chuẩn hoá cùng tồn tại — đúng thứ SPEC-005 sợ nhất), hoặc đổi tên file + sửa mọi import (một PR "thêm bỏ dấu" biến thành một PR refactor).

Cách để E2-T3 chỉ là *"thêm một dòng vào hàm đã có"*:

```ts
// src/features/dish/domain/normalize-name.ts

/**
 * SPEC-005 — chuẩn hoá tên món. Hàm thuần, không throw, không chạm DB.
 *
 * E1 làm MỨC 1: NFC → gộp khoảng trắng → cắt hai đầu → lowercase.
 * E2-T3 thêm MỨC 2 (bỏ dấu tiếng Việt) vào ĐÚNG hàm này — xem mốc bên dưới —
 * kèm migration backfill `normalized_name`. Đừng tạo hàm thứ hai: hai bộ chuẩn
 * hoá cùng tồn tại là cách chắc chắn nhất để `Cá kho` và `Ca kho` lệch nhau ở
 * một nửa đường dẫn code.
 */

/** Dạng HIỂN THỊ: giữ nguyên hoa/thường và dấu, chỉ dọn khoảng trắng.
 *  '  Canh   Chua  ' → 'Canh Chua'. Đây là thứ ghi vào `global_dishes.name`. */
export function collapseDishName(name: string): string {
  return name.normalize('NFC').replace(/\s+/gu, ' ').trim()
}

/** Dạng SO KHỚP: ghi vào `global_dishes.normalized_name`.
 *  '  Canh   Chua  ' → 'canh chua'. */
export function normalizeDishName(name: string): string {
  // `toLowerCase()` chứ không `toLocaleLowerCase('vi')`: tiếng Việt không có
  // luật đổi hoa/thường riêng, và bản locale-sensitive làm kết quả phụ thuộc ICU.
  return collapseDishName(name).toLowerCase()

  // ↓ E2-T3 chèn vào ĐÂY, không tạo file mới:
  //   .normalize('NFD').replace(/[\u0300-\u036f]/gu, '').replaceAll('đ', 'd')
  // Kèm migration backfill — xem §15 "Rủi ro".
}
```

Hai export vì SPEC-005 cần hai giá trị khác nhau: `name` giữ cách cả nhà gọi tên (thiết kế: *"Cứ viết như cách cả nhà gọi tên"*), `normalized_name` để so khớp.

## 2.4 Một port `DishRepository`, không tách như S2

S2 tách `MembershipRepository` khỏi `GroupRepository` vì `assertGroupAccess` là **consumer cắt ngang** — nó được gọi ở mọi action, nên fake của nó bị viết đi viết lại và phải cực ngắn.

`dish` không có consumer cắt ngang nào. `addDishToGroup` cần cả đọc lẫn ghi; `listGroupDishes` cần một method. Tách đôi thì `add-dish-to-group.test.ts` vẫn phải dựng cả hai fake. Giữ **một port ba method**, đúng hình dạng `GroupRepository` của S2 (`createWithAdmin` / `listForUser` / `findById`) — và `list-group-dishes.test.ts` stub hai method còn lại bằng `throw new Error('không dùng trong test này')`, y hệt `list-groups.test.ts` đã làm.

## 2.5 Chặn trùng quyết ở **application**, không ở SQL

Áp dụng nguyên văn tiền lệ S2 §2.3.

Port trả **nguyên hàng tìm được, không lọc `state`**; SQL chỉ hỏi *"trong group này có món nào cùng `normalized_name` không"*. Use case mới là chỗ quyết định `ERR_DISH_ALREADY_IN_POOL`.

Vì sao quan trọng: E2-T4 phải phân biệt ba trường hợp — không có hàng (tạo mới), có hàng `ACTIVE` (lỗi), có hàng `INACTIVE` (chuyển lại `ACTIVE`). Nếu S3 nhét `state = 'ACTIVE'` vào `WHERE`, trường hợp thứ ba biến mất vào một mệnh đề SQL mà không tầng nào test được, và E2-T4 sẽ phải sửa cả infrastructure lẫn application. Đặt ở application thì E2-T4 chỉ thêm một nhánh `if` trong `add-dish-to-group.ts` và một trường vào kiểu trả về của port.

**Ở S3, mọi hàng tìm thấy đều là lỗi** — không có `INACTIVE` nào tồn tại được, vì tính năng gỡ món khỏi pool là F27/v1.1. Ghi comment tại chỗ.

**Không thêm unique index `(group_id, normalized_name)` ở DB.** E2-T4 cho phép `forceCreate` tạo Global Dish thứ hai cùng tên trong cùng Group; một constraint đặt hôm nay sẽ phải drop ở E2-T4. Ràng buộc DB duy nhất là `unique(group_id, global_dish_id)` theo Tech Spec §3.1.

## 2.6 `requireGroupContext()` ở `app/` — một chỗ duy nhất lắp guard

Sau S3 có **ba** nơi cùng khung *đọc session → guard → nạp group → notFound*: `app/groups/[groupId]/page.tsx`, `app/groups/[groupId]/dishes/page.tsx`, `app/groups/[groupId]/dishes/actions.ts`. Chép tay ba lần là ba chỗ có thể quên guard, và đó cũng là chỗ jscpd sẽ đỏ (rủi ro S2 §15 đã đoán trước ở dạng nhẹ hơn).

→ **`src/app/groups/[groupId]/group-access.ts`** (§11.1). Đặt ở `app/` là đúng Tech Spec §2.1 (*"`app/` chỉ lắp ráp"*) và là **cách duy nhất** hợp lệ: bất kỳ file nào dưới `features/dish/` import `@/features/group/**` đều bị ESLint chặn. Đặt dưới segment `[groupId]` để nó nằm cạnh mọi thứ nó phục vụ.

Đây là refactor có ý thức lên file của S2 — `app/groups/[groupId]/page.tsx` viết lại để gọi helper.

## 2.7 S-04: bật **một** hàng lối tắt + CTA, không bật cả ba

**Bật:** hàng "Danh mục món" (`→ /groups/[groupId]/dishes`) và CTA đáy "Thêm món đầu tiên" (cùng đích).
**Vẫn tắt:** "Quy định bữa ăn" (route thuộc E5), "Thành viên" (thuộc E2-T2).

Đánh đổi, nói thẳng:

- **Mất:** khối "Nhóm của bạn" hiện chỉ có một hàng thay vì ba — mỏng hơn thiết kế, và tỉ lệ khoảng trắng ở nửa dưới màn hình lệch so với prototype.
- **Được:** S2 để lại một ngõ cụt có chủ ý ("tạo nhóm xong rồi làm gì?"). S3 tạo ra đúng cái màn hình mà người dùng phải tới tiếp theo; không nối vào là để ngõ cụt tồn tại thêm một slice nữa mà không có lý do.
- Luật của S2 §2.6 (*"nút bấm không làm gì tệ hơn không có nút"*) vẫn là luật cứng và ở đây được **máy ép**: `typedRoutes` sẽ đỏ ở `<Link href="/groups/x/rules">` khi route chưa tồn tại. Không có cách nào "dựng dạng tĩnh" mà qua được `yarn build`.
- Phương án đã cân nhắc và **loại**: vẽ đủ ba hàng, hai hàng chưa có route thì dùng `<div>` không bấm được. Loại vì một hàng trông y hệt hai hàng kia nhưng không phản ứng là cùng một lời nói dối ở hình dạng khác.

Meta của hàng (S-04 dòng 136, đã đọc): `"Chưa có món nào"` màu `--accent` khi bằng 0, `"{n} món"` màu `--ink-muted` khi có. Nghĩa là `app/groups/[groupId]/page.tsx` phải biết số món → nó gọi thêm `listGroupDishes`. Chi phí: một truy vấn nữa mỗi lần mở trang nhóm. Chấp nhận ở quy mô này; E1-T7 sẽ gộp lại khi trang nhóm cần nhiều số liệu hơn.

CTA đáy giữ nguyên hai phần tử như thiết kế: primary "Thêm món đầu tiên" + quiet canh giữa "Nhóm của bạn" (nút quiet mà S2 đã đặt vào đúng slot `ctaAlt`).

---

# 3. Bẫy Next 16 riêng cho slice này

Guide S1 ghi 8 bẫy, guide S2 ghi bẫy 9–14. **Không lặp lại.** Bốn bẫy mới S3 chạm tới:

15. **`error.tsx` dùng `retry`, không phải `reset`** — §1.1. `reset()` render lại dữ liệu cũ, `retry()` mới là "Thử lại" theo nghĩa thiết kế. Sửa luôn `app/groups/error.tsx` của S2.
16. **`refresh()` là API mới của `next/cache`, chỉ gọi được trong Server Action** — §1.2. Đây là công cụ đúng cho "ghi xong, ở lại trang vừa ghi". Gọi ở Route Handler sẽ throw.
17. **`revalidatePath` với đường dẫn chứa `[segment]` bắt buộc tham số `type`** — §1.3. Luôn truyền đường dẫn literal đã nội suy `groupId`, và **không** truyền `'page'`.
18. **Route lồng: `params` của `/groups/[groupId]/dishes` vẫn chỉ có `{ groupId }`** — `03-file-conventions/page.md` nói `params` gom tham số động *"from the root segment down to that page"*; `dishes` là segment tĩnh nên không thêm khoá nào. Vẫn khai thủ công `{ params: Promise<{ groupId: string }> }`, vẫn **không** dùng helper `PageProps<'/groups/[groupId]/dishes'>` (bẫy 3 và 9).

---

# 4. Cây file

```
src/
├── shared/
│   ├── db/schema.ts                                    SỬA — +groupDishState, +globalDishes, +groupDishes
│   └── testing/factories.ts                            SỬA — +makeGroupDish
│
├── features/dish/                                      ← feature MỚI
│   ├── domain/
│   │   ├── normalize-name.ts        + .test.ts         mới — SPEC-005 mức 1
│   │   ├── dish-draft.ts            + .test.ts         mới — validation 1..120
│   │   └── group-dish.ts                               mới — type GroupDishState
│   ├── application/
│   │   ├── dish-repository.ts                          mới — PORT
│   │   ├── add-dish-to-group.ts     + .test.ts         mới — acceptance của E1-T5
│   │   └── list-group-dishes.ts     + .test.ts         mới
│   ├── infrastructure/
│   │   └── drizzle-dish-repository.ts                  mới
│   └── presentation/components/
│       ├── dish-row.tsx                                mới
│       ├── dish-catalog-screen.tsx  + .test.tsx        mới — S-05, 'use client'
│       └── add-dish-sheet.tsx       + .test.tsx        mới — S-06, 'use client'
│
└── app/
    ├── groups/error.tsx                                SỬA — reset → retry (bẫy 15)
    └── groups/[groupId]/
        ├── group-access.ts                             mới — §11.1
        ├── page.tsx                                    VIẾT LẠI — dùng helper, bật hàng lối tắt
        └── dishes/
            ├── page.tsx                                mới
            ├── loading.tsx                             mới
            ├── error.tsx                               mới — 'use client'
            └── actions.ts                              mới — 'use server'

src/shared/db/migrations/0002_global_and_group_dishes.sql   sinh bởi drizzle-kit
```

**Không có** `src/features/dish/presentation/containers/` — xem §2.1.
**Không có** file nào mới trong `src/shared/ui/` — mọi primitive S3 cần (`Button` có `muted`/`pending`/`quiet`, `TextField`, `EmptyStateCard`, `Sheet`, `Skeleton`, `Banner`) đã có từ S2.

---

# 5. Domain của `dish`

## 5.1 `src/features/dish/domain/normalize-name.ts`

Nội dung ở §2.3.

`normalize-name.test.ts` — **viết trước**:

```ts
import { describe, expect, it } from 'vitest'

import { collapseDishName, normalizeDishName } from './normalize-name'

describe('SPEC-005 — chuẩn hoá tên món (mức 1)', () => {
  it('SPEC-005: gộp khoảng trắng liên tiếp và cắt hai đầu', () => {
    expect(normalizeDishName('  Canh   Chua  ')).toBe('canh chua')
  })

  it('SPEC-005: dạng hiển thị giữ nguyên hoa/thường', () => {
    expect(collapseDishName('  Canh   Chua  ')).toBe('Canh Chua')
  })

  it('SPEC-005: NFC gộp dấu tổ hợp với ký tự dựng sẵn', () => {
    // 'Cá' gõ bằng 'C' + 'a' + U+0301 phải bằng 'Cá' dựng sẵn.
    expect(normalizeDishName('Ca\u0301 basa kho tiêu')).toBe(normalizeDishName('Cá basa kho tiêu'))
  })

  it('SPEC-005: coi tab và xuống dòng là khoảng trắng', () => {
    expect(normalizeDishName('Gà\tchiên\nnước mắm')).toBe('gà chiên nước mắm')
  })

  // E2-T3 SẼ LẬT TEST NÀY. Nó tồn tại để "chưa bỏ dấu" là một quyết định có chữ
  // ký, không phải một thiếu sót ai đó vô tình vá.
  it('E1 CỐ Ý chưa bỏ dấu — E2-T3 đổi kỳ vọng này thành toBe', () => {
    expect(normalizeDishName('Cá kho')).not.toBe(normalizeDishName('Ca kho'))
  })
})
```

## 5.2 `src/features/dish/domain/dish-draft.ts`

Cùng hình dạng `group-draft.ts` của S2.

```ts
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import { collapseDishName, normalizeDishName } from './normalize-name'

/**
 * SPEC-005 — validation của "Thêm Dish". Hàm thuần, không throw, không chạm DB.
 *
 * `systemTags` CỐ Ý chưa có: E2-T5. Thêm vào đây khi tới đó, không tạo draft
 * thứ hai.
 */
export type DishDraft = {
  readonly name: string
  readonly normalizedName: string
}

export type DishDraftError = 'NAME_EMPTY' | 'NAME_TOO_LONG'

const MAX_NAME_LENGTH = 120

export function readDishDraft(input: { readonly name: string }): Result<DishDraft, DishDraftError> {
  const name = collapseDishName(input.name)

  if (name === '') {
    return err('NAME_EMPTY')
  }

  // Đếm code point chứ không dùng `.length` (đơn vị UTF-16): SPEC-005 nói
  // "1..120", và với tên tiếng Việt hai cách đếm cho ra số khác nhau.
  if (Array.from(name).length > MAX_NAME_LENGTH) {
    return err('NAME_TOO_LONG')
  }

  return ok({ name, normalizedName: normalizeDishName(name) })
}
```

`dish-draft.test.ts` — **viết trước**: tên toàn khoảng trắng → `NAME_EMPTY`; 120 ký tự `'à'` được / 121 thì `NAME_TOO_LONG`; `'  Cá basa   kho tiêu '` → `name = 'Cá basa kho tiêu'`, `normalizedName = 'cá basa kho tiêu'`.

## 5.3 `src/features/dish/domain/group-dish.ts`

```ts
/**
 * SDD §2.2 — `GroupDishState = ACTIVE | INACTIVE` (BR-005).
 *
 * Bản sao của enum `group_dish_state` trong `src/shared/db/schema.ts`. Hai chỗ
 * KHÔNG ràng buộc nhau lúc biên dịch — `domain/` không được import drizzle.
 * Chỗ chúng gặp nhau và `tsc` canh được là
 * `infrastructure/drizzle-dish-repository.ts`. Sửa một bên thì sửa cả hai.
 */
export type GroupDishState = 'ACTIVE' | 'INACTIVE'
```

Không có hàm nào ở đây tại S3 — `isActiveGroupDish()` chỉ có nghĩa khi E2-T4 phân nhánh; thêm sớm là một export không ai gọi.

---

# 6. Application của `dish`

## 6.1 `src/features/dish/application/dish-repository.ts` — PORT

```ts
import type { GroupDishState } from '../domain/group-dish'

/**
 * `id` là `group_dishes.id`, KHÔNG phải `global_dishes.id`. Mọi feature phía
 * sau tham chiếu đúng khoá này (Tech Spec §3.1: `interactions.group_dish_id`,
 * `final_meal_items.group_dish_id`).
 */
export type GroupDishSummary = {
  readonly id: string
  readonly name: string
}

export type NewDishInGroup = {
  readonly groupId: string
  readonly name: string
  readonly normalizedName: string
  readonly creatorUserId: string
}

export interface DishRepository {
  /**
   * Tìm món trong Group theo `normalized_name`. KHÔNG lọc `state`: quyết định
   * "đã có rồi" hay "khôi phục lại" thuộc về application — xem `add-dish-to-group.ts`.
   * E2-T4 thêm `state` vào kiểu trả về; SQL không phải đổi.
   */
  findInGroupByNormalizedName(
    groupId: string,
    normalizedName: string,
  ): Promise<GroupDishSummary | null>

  /**
   * Chèn `global_dishes` + `group_dishes` NGUYÊN TỬ (SDD §2.4). Global Dish mới
   * mang provenance bắt buộc của BR-001: user tạo, group tạo từ đó, thời điểm.
   * Hàng Group Dish sinh ra ở `state = 'ACTIVE'` (BR-005).
   */
  createGlobalDishAndAddToPool(input: NewDishInGroup): Promise<GroupDishSummary>

  /** Chỉ món `ACTIVE`. Thứ tự do adapter quyết định; luật sắp xếp thuộc E2-T6. */
  listActiveInGroup(groupId: string): Promise<GroupDishSummary[]>
}
```

## 6.2 `src/features/dish/application/add-dish-to-group.ts`

```ts
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { DishDraftError } from '../domain/dish-draft'
import { readDishDraft } from '../domain/dish-draft'
import type { DishRepository, GroupDishSummary } from './dish-repository'

export type AddDishToGroupDeps = {
  readonly dishes: DishRepository
}

export type AddDishToGroupInput = {
  readonly groupId: string
  readonly creatorUserId: string
  readonly name: string
}

/** `field` để presentation đặt lỗi NGAY DƯỚI đúng input (Design Criteria §12). */
const FAILURE_DETAILS: Record<DishDraftError, { field: string; reason: string }> = {
  NAME_EMPTY: { field: 'name', reason: 'Tên món không được để trống' },
  NAME_TOO_LONG: { field: 'name', reason: 'Tên món tối đa 120 ký tự' },
}

/**
 * SPEC-005 rút gọn — Thêm Dish vào Group Dish Pool.
 *
 * Thứ tự BẤT BIẾN: validate → chặn trùng → ghi. Validate chạy trước khi chạm
 * repository, nên tên rỗng/quá dài không ghi gì; chặn trùng chạy trước khi ghi,
 * nên lỗi trùng cũng không ghi gì (SDD §2.4 — "không để lại thay đổi từng phần").
 *
 * KHÔNG có ở S3, theo Plan & Scope §P1:
 * - `systemTags` + `ERR_INVALID_SYSTEM_TAG`     → E2-T5
 * - `existingCandidates` + `forceCreate`         → E2-T4
 * - nhánh INACTIVE → reactivate                  → E2-T4
 *
 * Ở S3, BẤT KỲ hàng nào tìm thấy đều là `ERR_DISH_ALREADY_IN_POOL`. Hàng
 * INACTIVE không tồn tại được vì gỡ món khỏi pool là F27/v1.1.
 */
export async function addDishToGroup(
  deps: AddDishToGroupDeps,
  input: AddDishToGroupInput,
): Promise<Result<GroupDishSummary, Failure>> {
  const draft = readDishDraft({ name: input.name })

  if (!draft.ok) {
    return err(failure('ERR_VALIDATION', FAILURE_DETAILS[draft.error]))
  }

  const existing = await deps.dishes.findInGroupByNormalizedName(
    input.groupId,
    draft.value.normalizedName,
  )

  if (existing !== null) {
    return err(
      failure('ERR_DISH_ALREADY_IN_POOL', {
        field: 'name',
        groupDishId: existing.id,
        existingName: existing.name,
      }),
    )
  }

  const created = await deps.dishes.createGlobalDishAndAddToPool({
    groupId: input.groupId,
    name: draft.value.name,
    normalizedName: draft.value.normalizedName,
    creatorUserId: input.creatorUserId,
  })

  return ok(created)
}
```

`add-dish-to-group.test.ts` — **viết trước. Đây là acceptance của E1-T5.**

```ts
import { describe, expect, it } from 'vitest'

import { makeGroup, makeUser } from '@/shared/testing/factories'

import type { DishRepository, GroupDishSummary, NewDishInGroup } from './dish-repository'
import { addDishToGroup } from './add-dish-to-group'

type Row = NewDishInGroup & { id: string }

/** Cổng giả là object thuần, không auto-mock (Test Cases §1.3). */
function makeFakeDishRepository(seed: Row[] = []) {
  const rows: Row[] = [...seed]

  const repository: DishRepository = {
    async findInGroupByNormalizedName(groupId, normalizedName) {
      const found = rows.find(
        (row) => row.groupId === groupId && row.normalizedName === normalizedName,
      )
      return found === undefined ? null : { id: found.id, name: found.name }
    },
    async createGlobalDishAndAddToPool(input) {
      const id = `group-dish-${rows.length + 1}`
      rows.push({ ...input, id })
      return { id, name: input.name }
    },
    async listActiveInGroup(): Promise<GroupDishSummary[]> {
      return rows.map((row) => ({ id: row.id, name: row.name }))
    },
  }

  return { repository, rows }
}

const GROUP_ID = makeGroup().id
const CREATOR = makeUser().id

describe('SPEC-005 rút gọn — Thêm Dish vào Group Dish Pool', () => {
  it('SPEC-005: thêm "  Cá basa   kho tiêu " thì lưu tên đã dọn và normalized_name', async () => {
    const fake = makeFakeDishRepository()

    const result = await addDishToGroup(
      { dishes: fake.repository },
      { groupId: GROUP_ID, creatorUserId: CREATOR, name: '  Cá basa   kho tiêu ' },
    )

    expect(result.ok).toBe(true)
    expect(fake.rows).toHaveLength(1)
    expect(fake.rows[0]?.name).toBe('Cá basa kho tiêu')
    expect(fake.rows[0]?.normalizedName).toBe('cá basa kho tiêu')
  })

  it('BR-001: provenance đi kèm mọi Global Dish mới', async () => {
    const fake = makeFakeDishRepository()

    await addDishToGroup(
      { dishes: fake.repository },
      { groupId: GROUP_ID, creatorUserId: CREATOR, name: 'Canh chua cá lóc' },
    )

    expect(fake.rows[0]?.creatorUserId).toBe(CREATOR)
    expect(fake.rows[0]?.groupId).toBe(GROUP_ID)
  })

  it('SPEC-005: món đã có trong pool thì ERR_DISH_ALREADY_IN_POOL và KHÔNG ghi thêm', async () => {
    const fake = makeFakeDishRepository([
      {
        id: 'group-dish-1',
        groupId: GROUP_ID,
        name: 'Canh chua cá lóc',
        normalizedName: 'canh chua cá lóc',
        creatorUserId: CREATOR,
      },
    ])

    const result = await addDishToGroup(
      { dishes: fake.repository },
      { groupId: GROUP_ID, creatorUserId: CREATOR, name: '  canh   CHUA cá lóc  ' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_DISH_ALREADY_IN_POOL')
    expect(fake.rows).toHaveLength(1)
  })

  it('BR-005: cùng tên ở Group KHÁC vẫn thêm được — pool là của từng Group', async () => {
    const fake = makeFakeDishRepository([
      {
        id: 'group-dish-1',
        groupId: GROUP_ID,
        name: 'Canh chua cá lóc',
        normalizedName: 'canh chua cá lóc',
        creatorUserId: CREATOR,
      },
    ])

    const result = await addDishToGroup(
      { dishes: fake.repository },
      { groupId: 'group-khac', creatorUserId: CREATOR, name: 'Canh chua cá lóc' },
    )

    expect(result.ok).toBe(true)
    expect(fake.rows).toHaveLength(2)
  })

  it('SPEC-005: tên toàn khoảng trắng thì ERR_VALIDATION và KHÔNG chạm repository', async () => {
    const fake = makeFakeDishRepository()

    const result = await addDishToGroup(
      { dishes: fake.repository },
      { groupId: GROUP_ID, creatorUserId: CREATOR, name: '   ' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_VALIDATION')
    expect(result.ok === false && result.error.details?.['field']).toBe('name')
    expect(fake.rows).toHaveLength(0)
  })

  it('SPEC-005: 120 ký tự thì được, 121 thì ERR_VALIDATION', async () => {
    const fake = makeFakeDishRepository()
    const deps = { dishes: fake.repository }

    expect((await addDishToGroup(deps, { groupId: GROUP_ID, creatorUserId: CREATOR, name: 'à'.repeat(120) })).ok).toBe(true)

    const tooLong = await addDishToGroup(deps, {
      groupId: GROUP_ID,
      creatorUserId: CREATOR,
      name: 'à'.repeat(121),
    })
    expect(tooLong.ok === false && tooLong.error.code).toBe('ERR_VALIDATION')
  })
})
```

## 6.3 `src/features/dish/application/list-group-dishes.ts`

```ts
import type { DishRepository, GroupDishSummary } from './dish-repository'

export type ListGroupDishesDeps = {
  readonly dishes: DishRepository
}

/**
 * Trả mảng trực tiếp chứ không phải `Result`: đọc danh sách không có trạng thái
 * thất bại nghiệp vụ nào. Lỗi hạ tầng để nổi lên cho `dishes/error.tsx`.
 *
 * Mỏng nhưng có lý do tồn tại: E2-T5/E2-T6 thêm nhóm theo System Tag và lọc
 * theo từ khoá vào đúng chỗ này, và khi đó nó có test riêng.
 */
export async function listGroupDishes(
  deps: ListGroupDishesDeps,
  groupId: string,
): Promise<GroupDishSummary[]> {
  return deps.dishes.listActiveInGroup(groupId)
}
```

Test: mảng rỗng khi chưa có món; giữ nguyên thứ tự port trả về (comment: E2-T6 thêm luật sắp xếp).

## 6.4 `src/shared/testing/factories.ts` — thêm

```ts
export type TestGroupDish = {
  id: string
  name: string
}

/**
 * Test Cases §1.4 nêu `makeGroupDish({ systemTags: ['MAIN'] })`. Trường
 * `systemTags` CỐ Ý chưa có ở đây: bảng `group_dish_tags` và use case gán tag
 * thuộc E2-T5, nên một trường không test nào dùng được là dữ liệu giả không ai
 * kiểm chứng — mà factory này không import type từ `features/` (khớp cấu trúc,
 * `tsc` chỉ bắt được tại CHỖ DÙNG), nên không có lưới nào đỡ.
 *
 * E2-T5: thêm `systemTags: SystemTag[]` mặc định `[]`.
 */
export function makeGroupDish(overrides: Partial<TestGroupDish> = {}): TestGroupDish {
  return {
    id: '01920000-0000-7000-8000-0000000000d1',
    name: 'Cá basa kho tiêu',
    ...overrides,
  }
}
```

**Không thêm `makeGlobalDish`.** Ở S3 không test nào cần một Global Dish tách rời — fake repository làm việc trên `NewDishInGroup` và `GroupDishSummary`. Một factory không ai gọi là mã chết mà knip lại **không** canh được (`src/shared/testing/**` nằm trong `ignore`). Thêm khi E2-T4 cần dựng ứng viên trùng.

---

# 7. Schema, migration, infrastructure

## 7.1 `src/shared/db/schema.ts` — thêm

Import thêm `pgEnum` từ `drizzle-orm/pg-core` (`index` đã có từ S2).

```ts
/**
 * SDD §2.2 `GroupDishState = ACTIVE | INACTIVE`. Khai bằng `pgEnum` chứ không
 * `text().$type<>()`: Postgres từ chối giá trị rác, và drizzle tự suy kiểu
 * literal union nên không phải khai hai lần. Thêm giá trị sau này chỉ cần sửa
 * mảng rồi `yarn db:generate` — drizzle-kit sinh `ALTER TYPE … ADD VALUE`.
 *
 * Bản sao ở tầng domain: `src/features/dish/domain/group-dish.ts`.
 */
export const groupDishState = pgEnum('group_dish_state', ['ACTIVE', 'INACTIVE'])

/** Tech Spec §3.1. BR-001: mọi Global Dish mới phải mang provenance tối thiểu —
 *  user đã tạo, group tạo từ đó, thời điểm tạo. Ba cột dưới KHÔNG được nullable. */
export const globalDishes = pgTable(
  'global_dishes',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),

    /** Dạng hiển thị, giữ nguyên hoa/thường và dấu — 'Cá basa kho tiêu'. */
    name: text('name').notNull(),

    /** SPEC-005. E1 = NFC + gộp khoảng trắng + trim + lowercase.
     *  E2-T3 thêm bỏ dấu VÀ phải backfill cột này. */
    normalizedName: text('normalized_name').notNull(),

    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id),
    createdFromGroupId: uuid('created_from_group_id')
      .notNull()
      .references(() => groups.id),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Tech Spec §3.1. KHÔNG unique: E2-T4 cho `forceCreate` tạo Global Dish
    // thứ hai cùng tên khi người dùng xác nhận đó là món khác (BR-001).
    index('global_dishes_normalized_name_idx').on(table.normalizedName),
  ],
)

export const groupDishes = pgTable(
  'group_dishes',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id),
    globalDishId: uuid('global_dish_id')
      .notNull()
      .references(() => globalDishes.id),

    // BR-005: gỡ khỏi pool là chuyển INACTIVE, KHÔNG xoá dòng — historical
    // reference phải còn. Vì vậy không có `onDelete: 'cascade'` ở đâu cả.
    state: groupDishState('state').notNull().default('ACTIVE'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('group_dishes_group_global_unique').on(table.groupId, table.globalDishId),
    // Đường nóng Tech Spec §3.3: SPEC-010 eligible set.
    index('group_dishes_group_state_idx').on(table.groupId, table.state),
  ],
)

export type GlobalDish = typeof globalDishes.$inferSelect
export type GroupDish = typeof groupDishes.$inferSelect
```

**`group_dish_tags` KHÔNG làm ở S3** — E2-T5.

## 7.2 Migration

```bash
yarn db:generate --name=global_and_group_dishes
yarn db:migrate
```

Sinh `src/shared/db/migrations/0002_global_and_group_dishes.sql` + `meta/0002_snapshot.json` + cập nhật `_journal.json`. **Không sửa tay.**

Mở file `.sql` đọc lại và **khẳng định bằng mắt** ba điều:
1. `CREATE TYPE "public"."group_dish_state" AS ENUM('ACTIVE', 'INACTIVE');` đứng **trước** `CREATE TABLE "group_dishes"`.
2. `global_dishes` có đủ `created_by_user_id`, `created_from_group_id`, `created_at` ở dạng `NOT NULL`.
3. Có `group_dishes_group_state_idx` trên `("group_id","state")`.

Sinh migration ở **commit riêng, cuối cùng**, ngay trước khi mở PR — `_journal.json` là chỗ merge conflict dễ xảy ra nhất.

## 7.3 `src/features/dish/infrastructure/drizzle-dish-repository.ts`

```ts
import { and, asc, eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { getDb } from '@/shared/db/client'
import { globalDishes, groupDishes } from '@/shared/db/schema'

import type {
  DishRepository,
  GroupDishSummary,
  NewDishInGroup,
} from '../application/dish-repository'
import type { GroupDishState } from '../domain/group-dish'

// `tsc` canh chỗ này: nếu enum DB và union domain lệch nhau thì phép gán đỏ.
// Đây là ràng buộc biên dịch DUY NHẤT giữa `schema.ts` và `domain/group-dish.ts`.
const ACTIVE: GroupDishState = 'ACTIVE'

/** KHÔNG lọc `state`: application quyết định — xem `add-dish-to-group.ts`. */
async function findInGroupByNormalizedName(
  groupId: string,
  normalizedName: string,
): Promise<GroupDishSummary | null> {
  const rows = await getDb()
    .select({ id: groupDishes.id, name: globalDishes.name })
    .from(groupDishes)
    .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
    .where(and(eq(groupDishes.groupId, groupId), eq(globalDishes.normalizedName, normalizedName)))
    .limit(1)

  return rows[0] ?? null
}

/**
 * `db.batch([...])` của driver neon-http LÀ một transaction Postgres thật —
 * `neon-http/session.js` gọi `client.transaction(builtQueries)`. (Còn
 * `db.transaction()` thì ném "No transactions support in neon-http driver".)
 *
 * Batch non-interactive: không đọc được id ở giữa. Vì vậy CẢ HAI id sinh tường
 * minh ở đây — câu INSERT thứ hai cần `globalDishId` trước khi được dựng.
 *
 * Kiểu của `batch` là tuple `Readonly<[U, ...U[]]>` — truyền literal array,
 * đừng build bằng `.map()` hay gán vào `const queries: X[]`.
 */
async function createGlobalDishAndAddToPool(input: NewDishInGroup): Promise<GroupDishSummary> {
  const db = getDb()
  const globalDishId = uuidv7()
  const groupDishId = uuidv7()

  await db.batch([
    db.insert(globalDishes).values({
      id: globalDishId,
      name: input.name,
      normalizedName: input.normalizedName,
      // BR-001 — provenance. Ba giá trị này là điều kiện tồn tại của Global Dish.
      createdByUserId: input.creatorUserId,
      createdFromGroupId: input.groupId,
    }),
    db.insert(groupDishes).values({
      id: groupDishId,
      groupId: input.groupId,
      globalDishId,
      state: ACTIVE,
    }),
  ])

  return { id: groupDishId, name: input.name }
}

async function listActiveInGroup(groupId: string): Promise<GroupDishSummary[]> {
  // `state = 'ACTIVE'` ở đây là câu hỏi "lấy dòng nào", không phải quyết định
  // nghiệp vụ — cùng ngoại lệ có chủ ý mà `listForUser` của S2 đã ghi.
  return getDb()
    .select({ id: groupDishes.id, name: globalDishes.name })
    .from(groupDishes)
    .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
    .where(and(eq(groupDishes.groupId, groupId), eq(groupDishes.state, ACTIVE)))
    .orderBy(asc(groupDishes.createdAt))
}

export const drizzleDishRepository: DishRepository = {
  findInGroupByNormalizedName,
  createGlobalDishAndAddToPool,
  listActiveInGroup,
}
```

Không unit test (Tech Spec §8.2). Chứng minh ở smoke test §14.2.

---

# 8. Copy tiếng Việt

| Chỗ | Chuỗi |
|---|---|
| Tiêu đề S-05 | `Danh mục món` |
| Caption trên tiêu đề | tên nhóm |
| Số đếm | `{n} món` · rỗng thì chuỗi trống |
| Empty h2 | `Chưa có món nào.` |
| Empty body | `Thêm những món nhà bạn thật sự hay ăn. Cứ viết như cách cả nhà gọi tên.` |
| Ba ví dụ | `Cá basa kho tiêu` · `Canh chua cá lóc` · `Gà chiên nước mắm` |
| CTA đáy | `Thêm món` khi có món · `Thêm món đầu tiên` khi rỗng |
| Caption đáy | `Khoảng 15–20 món là đủ để bắt đầu` — **chỉ khi đã có món** |
| Toast | `Đã thêm {name} vào danh mục.` |
| Tiêu đề sheet | `Thêm món` |
| Nút đóng sheet | `Đóng` |
| Label ô tên | `Tên món` |
| Placeholder | `Ví dụ: Cá basa kho tiêu` |
| Nút lưu | `Thêm vào danh mục` |
| Lỗi tên rỗng | `Nhập tên món trước đã.` |
| **Lỗi trùng (mới)** | **`Món này đã có trong danh mục rồi.`** |
| Lỗi hạ tầng khi thêm | `Không thêm được món. Thử lại giúp mình.` |
| `dishes/error.tsx` | `Không tải được danh mục món.` + nút `Thử lại` |

**Vì sao `Món này đã có trong danh mục rồi.`** — prototype không có câu này vì nó chạy luồng phát hiện trùng khác (E2-T4/T7). Giọng hiện có: `Đặt tên để cả nhà nhận ra nhóm.` · `Nhập tên món trước đã.` · `Không đăng nhập được. Thử lại giúp mình.` — câu ngắn, nói tình trạng chứ không kết tội, có dấu chấm.

Đã cân nhắc và loại:
- `Nhà bạn đã có món này.` — hay, nhưng E2-T7 dùng `Nhà bạn đã có món gần giống` cho khối **khác hẳn**; hai câu mở đầu giống nhau cho hai luồng khác nhau là bẫy đọc.
- `Món này đã có rồi.` — cụt, và không nói "ở đâu".
- `Món này đã có trong nhóm.` — "nhóm" ở sản phẩm này nghĩa là Group; câu dễ đọc thành "nhóm nhãn".

Chọn câu có cả *"đã có"* lẫn *"trong danh mục"* để nó tự chỉ chỗ người dùng cần nhìn (danh sách ngay sau lưng sheet).

---

# 9. Component

## 9.1 `src/features/dish/presentation/components/dish-row.tsx`

```tsx
import type { ReactElement } from 'react'

export type DishRowProps = {
  name: string
  /** Cột phải của hàng. Ở S3 luôn rỗng; E2-T5 đưa nhãn hệ thống vào đây. */
  meta: string
}

/**
 * Hàng món ở S-05.
 *
 * Prototype vẽ nó là `<button>`. Ở S3 CHƯA CÓ màn hình chi tiết món (E2-T6),
 * nên đây là `<div>` trong `<li>`, không phải control:
 * - `<button disabled>` được screen reader đọc là "nút, không khả dụng" — một
 *   lời hứa app chưa giữ được, tệ hơn không có nút.
 * - `<button>` bật mà không có handler thì tệ hơn nữa (S2 §2.6).
 * Vì không còn là control, hai class trạng thái `hover:border-border-strong` và
 * `active:bg-surface-sunken` cũng bỏ luôn — trạng thái nghỉ giữ nguyên từng
 * pixel. E2-T6 đổi `<div>` thành `<button>` và trả lại hai class đó.
 */
export function DishRow({ name, meta }: DishRowProps): ReactElement {
  return (
    <li className="flex min-h-14 items-center justify-between gap-3 rounded-control border border-border bg-surface-raised p-4 text-left">
      <span className="text-subtitle font-semibold text-ink">{name}</span>
      <span className="flex-none text-caption font-medium text-ink-muted">{meta}</span>
    </li>
  )
}
```

## 9.2 `dish-catalog-screen.tsx` — S-05, `'use client'`

Chủ sở hữu ba mẩu state: sheet mở/đóng, `useActionState` của form, và toast (suy ra, không lưu).

```tsx
'use client'

import type { ReactElement } from 'react'
import { useActionState, useEffect, useState } from 'react'

import { Button } from '@/shared/ui/button'
import { EmptyStateCard } from '@/shared/ui/empty-state-card'

import { AddDishSheet } from './add-dish-sheet'
import { DishRow } from './dish-row'

const DISH_EXAMPLES = ['Cá basa kho tiêu', 'Canh chua cá lóc', 'Gà chiên nước mắm']

/** Không optional property nào — `exactOptionalPropertyTypes` không có chỗ nổ.
 *  Cùng hình dạng `CreateGroupFormState` của S2. */
export type AddDishFormState = {
  readonly nameError: string | null
  readonly addedDishName: string | null
}

export const ADD_DISH_INITIAL_STATE: AddDishFormState = { nameError: null, addedDishName: null }

export type DishCatalogScreenProps = {
  groupName: string
  dishes: { id: string; name: string }[]
  action: (state: AddDishFormState, formData: FormData) => Promise<AddDishFormState>
}

/**
 * S-05. Là client component vì bốn thứ dưới đây là MỘT khối tương tác: nhãn
 * CTA, số đếm, toast, và sheet. Tách chúng ra thì state phải nâng lên một
 * wrapper — đúng thứ này đang là. Cùng hình dạng `CreateGroupForm` của S2:
 * một màn hình client nhận Server Action qua prop.
 *
 * CỐ Ý chưa có ở S3: ô tìm kiếm (E2-T6), nhóm theo nhãn (E2-T5/T6), thẻ "không
 * khớp" (E2-T6), nhóm "Đã gỡ khỏi nhóm" (F27/v1.1).
 */
export function DishCatalogScreen({
  groupName,
  dishes,
  action,
}: DishCatalogScreenProps): ReactElement {
  const [state, formAction, pending] = useActionState(action, ADD_DISH_INITIAL_STATE)
  const [isSheetOpen, setSheetOpen] = useState(false)

  // Thêm thành công thì sheet đóng. Chỉ đóng khi có tên trả về — thất bại phải
  // giữ sheet mở để lỗi hiện đúng chỗ.
  useEffect(() => {
    if (state.addedDishName !== null) {
      setSheetOpen(false)
    }
  }, [state])

  // Toast SUY RA từ state, không lưu riêng: mở sheet lại là toast biến mất,
  // đúng như prototype (`openSheet` đặt `toast: ""`). Không thêm useState nào.
  const toast = isSheetOpen ? null : state.addedDishName

  const hasDishes = dishes.length > 0

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex flex-col gap-3 px-4 pb-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-caption font-medium text-ink-muted">{groupName}</span>
            <h1 className="text-title font-semibold text-ink">Danh mục món</h1>
          </div>
          <span className="pt-[22px] text-caption font-semibold tabular-nums text-ink-muted">
            {hasDishes ? `${dishes.length} món` : ''}
          </span>
        </div>
        {/* E2-T6: ô tìm "Tìm món trong nhà" 48px vào đây. */}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-4 pb-2 pt-1">
        {hasDishes ? (
          <ul className="flex flex-col gap-2">
            {dishes.map((dish) => (
              <DishRow key={dish.id} name={dish.name} meta="" />
            ))}
          </ul>
        ) : (
          <EmptyStateCard
            title="Chưa có món nào."
            description="Thêm những món nhà bạn thật sự hay ăn. Cứ viết như cách cả nhà gọi tên."
          >
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              {DISH_EXAMPLES.map((example) => (
                <span key={example} className="text-body-lg font-normal text-ink-faint">
                  {example}
                </span>
              ))}
            </div>
          </EmptyStateCard>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-surface px-4 pb-8 pt-4">
        {toast === null ? null : (
          <div role="status" className="flex items-start gap-2 rounded-control bg-yes-soft p-3">
            <span aria-hidden className="w-hairline self-stretch rounded-full bg-yes" />
            <span className="text-pretty text-body font-medium text-ink">
              {`Đã thêm ${toast} vào danh mục.`}
            </span>
          </div>
        )}

        <Button type="button" onClick={() => setSheetOpen(true)}>
          {hasDishes ? 'Thêm món' : 'Thêm món đầu tiên'}
        </Button>

        {hasDishes ? (
          <span className="self-center text-caption font-medium text-ink-muted">
            Khoảng 15–20 món là đủ để bắt đầu
          </span>
        ) : null}
      </div>

      {isSheetOpen ? (
        <AddDishSheet
          formAction={formAction}
          nameError={state.nameError}
          pending={pending}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}
    </main>
  )
}
```

> Toast dùng `<div role="status">` viết tay chứ không `Banner`: `Banner` chỉ có tone `danger | warning`. Thêm tone `success` vào `Banner` là mở rộng một primitive dùng chung cho đúng một chỗ gọi — Design Handoff §9 nói `--yes` chỉ xuất hiện ở ba chỗ đã liệt kê, nên tone chung sẽ mời gọi dùng sai. Nếu chỗ thứ hai xuất hiện ở E3 thì rút lên `Banner` khi đó.

## 9.3 `add-dish-sheet.tsx` — S-06, `'use client'`

```tsx
'use client'

import type { ReactElement } from 'react'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'
import { Sheet } from '@/shared/ui/sheet'
import { TextField } from '@/shared/ui/text-field'

export type AddDishSheetProps = {
  formAction: (formData: FormData) => void
  nameError: string | null
  pending: boolean
  onClose: () => void
}

/**
 * S-06 rút gọn: chỉ ô tên.
 *
 * CỐ Ý chưa có: khối "Nhà bạn đã có món gần giống" (E2-T7) và hàng chip
 * "Nhãn — chọn một" (E2-T5).
 *
 * `name` là state CỤC BỘ của sheet: sheet bị unmount khi đóng, nên thêm thành
 * công là ô tên tự sạch cho lần mở sau — không phải viết lệnh reset nào. Trong
 * lúc sheet còn mở (trường hợp lỗi), input controlled giữ nguyên chữ đã gõ qua
 * vòng action, đúng như S2 §2.5 đã ghi.
 */
export function AddDishSheet({
  formAction,
  nameError,
  pending,
  onClose,
}: AddDishSheetProps): ReactElement {
  const [name, setName] = useState('')

  return (
    <Sheet title="Thêm món" onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-title font-semibold text-ink">Thêm món</h2>
        <Button
          type="button"
          variant="quiet"
          size="sm"
          className="-mr-3 -mt-3"
          onClick={onClose}
        >
          Đóng
        </Button>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <TextField
          label="Tên món"
          name="name"
          value={name}
          placeholder="Ví dụ: Cá basa kho tiêu"
          error={nameError}
          onChange={setName}
        />

        {/* `muted` chứ không `disabled`: thiết kế cho bấm khi tên trống để HIỆN
            lỗi. Nút disabled không nói được vì sao nó disabled. */}
        <Button type="submit" pending={pending} muted={name.trim() === ''}>
          {pending ? 'Đang thêm…' : 'Thêm vào danh mục'}
        </Button>
      </form>
    </Sheet>
  )
}
```

> Nút chính trong sheet **không có box-shadow** theo thiết kế, nhưng `Button variant="primary"` có `shadow-button`. Khử bằng `className="shadow-none"` — Tailwind sinh `box-shadow: none` và utility đứng sau nên thắng. Nếu thứ tự stylesheet gây bất định (đúng lo ngại đã ghi ở S2 §9.1 về `quietAccent`), thêm variant `primaryFlat` vào `button.tsx` thay vì đấu specificity.

**Lệch có ý thức so với prototype, giống hệt S2 §2.5:** prototype kiểm tên trống ngay ở client (state `tried`, 0ms). Guide này để **server** validate. Một nguồn sự thật là `readDishDraft` ở domain; nhân bản luật sang client là đúng thứ sẽ lệch nhau sau ba tháng. Hình ảnh cuối khớp thiết kế 100%, chỉ khác thời điểm (~200–400ms, nút ở trạng thái `pending`).

## 9.4 Test component

`dish-catalog-screen.test.tsx`:
- rỗng → có `Chưa có món nào.`, có câu mô tả, ba ví dụ, nút `Thêm món đầu tiên`, **không** có caption `Khoảng 15–20 món…`, số đếm là chuỗi trống
- có 2 món → tên món hiện, nút `Thêm món`, caption `Khoảng 15–20 món là đủ để bắt đầu`, số đếm `2 món`, không còn empty state
- bấm CTA → sheet mở (`getByRole('dialog')`), toast không hiện
- action trả `{ nameError: null, addedDishName: 'Cá basa kho tiêu' }` → sheet đóng và toast `Đã thêm Cá basa kho tiêu vào danh mục.` hiện

`add-dish-sheet.test.tsx`:
- nút `Thêm vào danh mục` **enabled** khi tên trống
- `nameError="Nhập tên món trước đã."` → hiện dưới input và nối bằng `aria-describedby` (đã có sẵn từ `TextField`)
- `nameError="Món này đã có trong danh mục rồi."` → hiện đúng chỗ đó, không phải banner ở đầu màn

---

# 10. Route và lắp ráp

## 10.1 `src/app/groups/[groupId]/group-access.ts`

```ts
import { notFound, redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import type { AuthenticatedUser } from '@/features/auth/domain/provider-identity'
import { assertGroupAccess } from '@/features/group/application/assert-group-access'
import type { GroupSummary } from '@/features/group/application/group-repository'
import {
  drizzleGroupRepository,
  drizzleMembershipRepository,
} from '@/features/group/infrastructure/drizzle-group-repository'

export type GroupContext = {
  readonly user: AuthenticatedUser
  readonly group: GroupSummary
}

/**
 * Lắp ráp dùng chung cho MỌI thứ dưới `/groups/[groupId]` — page, page con, và
 * Server Action. Tech Spec §5: guard chạy TRƯỚC business logic, ở mọi cửa vào.
 *
 * Đặt ở `app/` là bắt buộc, không phải tiện: `CROSS_FEATURE_ZONES` chặn
 * `features/dish/**` import cả `auth` lẫn `group`. Đây đúng chỗ mà comment
 * trong `eslint.config.mjs` nói tới.
 *
 * Ba nơi gọi hàm này là ba nơi có thể quên guard nếu chép tay — và cũng là chỗ
 * jscpd sẽ đỏ.
 *
 * `notFound()` chứ không `forbidden()`: (a) `forbidden()` cần
 * `experimental.authInterrupts`; (b) NFR-04 — không lộ nhóm có tồn tại hay
 * không. `notFound()` gọi được cả trong Server Action (docs
 * `04-functions/not-found.md`).
 *
 * Cả `redirect` lẫn `notFound` đều hoạt động bằng cách throw, nên kiểu trả về
 * `Promise<GroupContext>` là thật — người gọi không phải kiểm null.
 */
export async function requireGroupContext(groupId: string): Promise<GroupContext> {
  const user = await getCurrentUser()
  if (user === null) {
    redirect('/')
  }

  const access = await assertGroupAccess(
    { memberships: drizzleMembershipRepository },
    { userId: user.id, groupId, requiredRole: 'MEMBER' },
  )
  if (!access.ok) {
    notFound()
  }

  const group = await drizzleGroupRepository.findById(groupId)
  if (group === null) {
    notFound()
  }

  return { user, group }
}
```

## 10.2 `src/app/groups/[groupId]/page.tsx` — viết lại

```tsx
import { listGroupDishes } from '@/features/dish/application/list-group-dishes'
import { drizzleDishRepository } from '@/features/dish/infrastructure/drizzle-dish-repository'
import { GroupOverviewScreen } from '@/features/group/presentation/components/group-overview-screen'
import { resolveDecisionDate } from '@/features/session/domain/decision-date'
import { formatVietnameseDate } from '@/shared/time/format-vietnamese-date'

import { requireGroupContext } from './group-access'

type GroupPageProps = {
  params: Promise<{ groupId: string }>
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { groupId } = await params
  const { group } = await requireGroupContext(groupId)

  // E1-T5 bật hàng lối tắt "Danh mục món", nên trang này phải biết số món.
  // E1-T7 gộp truy vấn khi trang nhóm cần thêm số liệu phiên.
  const dishes = await listGroupDishes({ dishes: drizzleDishRepository }, groupId)

  const decisionDate = resolveDecisionDate(new Date(), group.timezone)

  return (
    <GroupOverviewScreen
      groupName={group.name}
      dateCaption={formatVietnameseDate(decisionDate)}
      dishCount={dishes.length}
      dishesHref={`/groups/${groupId}/dishes`}
    />
  )
}
```

`group-overview-screen.tsx` (file của S2) đổi: nhận thêm `dishCount: number` và `dishesHref: string`; thay khối đáy bằng

- khối `gap-2` với caption `Nhóm của bạn` (`text-caption font-medium text-ink-muted pl-1`) rồi **một** hàng `<Link>` "Danh mục món", meta `Chưa có món nào` màu `text-accent` khi `dishCount === 0`, ngược lại `{n} món` màu `text-ink-muted`, cả hai `tabular-nums`;
- đáy: `<Link>` styled primary 56px `Thêm món đầu tiên` (khi `dishCount === 0`) / `Thêm món` (khi có món) + quiet canh giữa `Nhóm của bạn` → `/groups`;
- comment cập nhật: `// E2-T2 + E5-T1: thêm hai hàng "Thành viên" và "Quy định bữa ăn" khi hai route đó tồn tại.`

Thêm test cho `group-overview-screen.test.tsx`: `dishCount={0}` → hiện `Chưa có món nào` và nút `Thêm món đầu tiên`; `dishCount={7}` → `7 món`.

## 10.3 `src/app/groups/[groupId]/dishes/page.tsx`

```tsx
import { listGroupDishes } from '@/features/dish/application/list-group-dishes'
import { drizzleDishRepository } from '@/features/dish/infrastructure/drizzle-dish-repository'
import { DishCatalogScreen } from '@/features/dish/presentation/components/dish-catalog-screen'

import { requireGroupContext } from '../group-access'
import { addDishAction } from './actions'

// Khai kiểu thủ công, KHÔNG dùng helper `PageProps<…>` (bẫy 3/9). Segment
// `dishes` là tĩnh nên `params` vẫn chỉ có `groupId` (bẫy 18).
type DishesPageProps = {
  params: Promise<{ groupId: string }>
}

export default async function DishesPage({ params }: DishesPageProps) {
  const { groupId } = await params
  const { group } = await requireGroupContext(groupId)

  const dishes = await listGroupDishes({ dishes: drizzleDishRepository }, groupId)

  return (
    <DishCatalogScreen
      groupName={group.name}
      dishes={dishes}
      action={addDishAction.bind(null, groupId)}
    />
  )
}
```

> `bind` để đưa `groupId` vào action (docs `02-guides/forms.md` §"Passing additional arguments"). Chọn `bind` chứ không `<input type="hidden" name="groupId">`: giá trị hidden nằm trong HTML và **không được mã hoá**, còn closure của Server Function thì Next mã hoá trước khi gửi xuống client. Dù sao thì `requireGroupContext` cũng validate lại ở server, nên đây là phòng thủ theo lớp chứ không phải nguồn tin cậy — nhưng `bind` rẻ hơn và bớt một input rác.
>
> Thứ tự tham số sau `bind`: `addDishAction(groupId, previousState, formData)`.

## 10.4 `src/app/groups/[groupId]/dishes/actions.ts`

```ts
'use server'

import { refresh, revalidatePath } from 'next/cache'

import { addDishToGroup } from '@/features/dish/application/add-dish-to-group'
import { drizzleDishRepository } from '@/features/dish/infrastructure/drizzle-dish-repository'
import type { AddDishFormState } from '@/features/dish/presentation/components/dish-catalog-screen'
import type { Failure } from '@/shared/errors'

import { requireGroupContext } from '../group-access'

// E6-T2 chuyển bảng này sang `shared/errors/messages.ts`. Ở đây chỉ có đúng
// những câu S-06 cần.
function toVietnameseMessage(error: Failure): string {
  if (error.code === 'ERR_DISH_ALREADY_IN_POOL') {
    return 'Món này đã có trong danh mục rồi.'
  }
  if (error.code === 'ERR_VALIDATION' && error.details?.['field'] === 'name') {
    return 'Nhập tên món trước đã.'
  }
  return 'Không thêm được món. Thử lại giúp mình.'
}

/**
 * Lắp ráp cho SPEC-005 rút gọn — không chứa business logic.
 *
 * Server Action gọi được bằng POST trực tiếp, không chỉ qua UI, nên
 * `requireGroupContext` chạy Ở ĐÂY chứ không dựa vào việc page đã guard
 * (Tech Spec §5).
 *
 * `groupId` tới từ `.bind()` ở page — vẫn không tin được, nên guard vẫn chạy
 * đủ trên chính giá trị đó.
 */
export async function addDishAction(
  groupId: string,
  _previousState: AddDishFormState,
  formData: FormData,
): Promise<AddDishFormState> {
  const { user } = await requireGroupContext(groupId)

  const result = await addDishToGroup(
    { dishes: drizzleDishRepository },
    {
      groupId,
      creatorUserId: user.id,
      name: String(formData.get('name') ?? ''),
    },
  )

  if (!result.ok) {
    return { nameError: toVietnameseMessage(result.error), addedDishName: null }
  }

  // Trang nhóm hiện meta "{n} món" ở hàng lối tắt — số đó vừa cũ đi. Đường dẫn
  // LITERAL (đã nội suy groupId), KHÔNG truyền 'page': truyền '/groups/[groupId]'
  // sẽ xoá cache trang nhóm của MỌI nhóm (docs revalidatePath.md).
  revalidatePath(`/groups/${groupId}`)

  // Người dùng ở lại đúng trang vừa ghi. `refresh()` (mới ở Next 16, chỉ gọi
  // được trong Server Action) làm tươi client router của trang hiện tại — đúng
  // ca "read-your-own-writes" mà không đụng data cache của đường dẫn nào khác.
  refresh()

  return { nameError: null, addedDishName: result.value.name }
}
```

> **Không `redirect`** ở đây — khác S2. Người dùng phải thấy toast và thêm món tiếp; điều hướng đi rồi quay lại là ba lần chạm cho mỗi món, mà thiết kế nói rõ mục tiêu là gõ 15–20 món một lượt.

## 10.5 `dishes/loading.tsx` và `dishes/error.tsx`

```tsx
// loading.tsx
import { Skeleton } from '@/shared/ui/skeleton'

/** Design Criteria §13: khung xương, không vòng quay. Ba khung 56px = ba hàng
 *  món, khớp `min-h-14` của `DishRow`. Lệch pha để không nhấp nháy đồng loạt. */
export default function DishesLoading() {
  return (
    <div className="mx-auto flex w-full max-w-app flex-col gap-2 px-4 pt-24">
      <Skeleton className="h-14" />
      <Skeleton className="h-14 [animation-delay:150ms]" />
      <Skeleton className="h-14 [animation-delay:300ms]" />
    </div>
  )
}
```

```tsx
// error.tsx
'use client'

import { Banner } from '@/shared/ui/banner'
import { Button } from '@/shared/ui/button'

/** Prop là `retry`, KHÔNG phải `reset` (bẫy 15): `reset()` render lại dữ liệu
 *  cũ, `retry()` mới là "Thử lại" theo nghĩa thiết kế. */
export default function DishesError({ retry }: { error: Error; retry: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-app flex-col gap-3 px-4 pt-24">
      <Banner tone="danger">Không tải được danh mục món.</Banner>
      <Button type="button" variant="secondary" size="md" className="self-start" onClick={retry}>
        Thử lại
      </Button>
    </div>
  )
}
```

Đồng thời sửa `src/app/groups/error.tsx` (S2) từ `reset` sang `retry` — cùng một lỗi, một dòng.

---

# 11. Cấu hình phải sửa

| File | Sửa gì |
|---|---|
| `src/shared/db/schema.ts` | +`groupDishState` (pgEnum), +`globalDishes`, +`groupDishes`; import thêm `pgEnum` |
| migrations | `yarn db:generate --name=global_and_group_dishes` → `0002_*.sql` + `meta/0002_snapshot.json` + `_journal.json`. **Không sửa tay** |
| `src/shared/testing/factories.ts` | +`makeGroupDish` (**không** `systemTags`, **không** `makeGlobalDish` — §6.4) |
| `docs/..._decision-log_v1.1.md` | 4 mục: (a) enum DB dùng `pgEnum`, kèm phát hiện drizzle-kit sinh `ALTER TYPE … ADD VALUE`; (b) `normalized_name` mức 1 ở E1, bỏ dấu ở E2-T3 **kèm nghĩa vụ backfill**; (c) `refresh()` cho "ở lại trang", `revalidatePath` literal cho "trang khác vừa cũ đi"; (d) `error.tsx` dùng `retry` |
| `docs/..._master-plan_v1_0.md` | tick E1-T5; ghi chú ở E2-T3 rằng `normalize-name.ts` đã tồn tại và việc là *thêm bước bỏ dấu + backfill*, không phải tạo file |

**Không sửa** — kiểm chứng từng cái:

| File | Vì sao không |
|---|---|
| `knip.jsonc` | Mọi file mới đều có importer production qua `app/`. Dòng ignore `decision-date.ts` đã bị S2 gỡ. `groupDishState` là export của file entry (`schema.ts!`) nên knip không xét. |
| `vitest.config.mts` | `coverage.include` đã phủ `src/features/*/domain/**` và `application/**`. S3 không thêm gì vào `shared/` cần ngưỡng. |
| `.jscpd.json` | Nếu đỏ thì sửa mã (đã có sẵn `requireGroupContext`), **không** hạ `threshold` hay nâng `minTokens`. |
| `eslint.config.mjs` | `'dish'` đã có trong `FEATURES`. `dish` không cần chiều cross-feature nào — mọi thứ lắp ở `app/`. |
| `src/app/globals.css` | Mọi token cần đã có từ S1: `bg-yes-soft`, `bg-yes`, `w-hairline`, `rounded-control`, `rounded-card`, `text-title/subtitle/body/body-lg/caption`, `max-w-app`, `animate-skeleton`, `bg-scrim`. |
| `package.json` | **Không thêm dependency nào** (Design Handoff ràng buộc §4). |
| `drizzle.config.ts`, `next.config.ts`, `.prettierignore`, `.github/workflows/ci.yml` | không liên quan |

---

# 12. Thứ tự thực hiện (TDD)

Nhánh `feat/dish-minimum`. Conventional Commits, scope `dish` / `db` / `app` / `ui` / `docs`.

| # | Việc | Test viết TRƯỚC | Tick |
|---|---|---|---|
| 0 | `yarn verify && yarn arch:probe && yarn build` xanh trên baseline S2 | — | |
| 1 | `dish/domain/normalize-name.ts` | **`normalize-name.test.ts` ĐỎ trước** (§5.1) | |
| 2 | `dish/domain/dish-draft.ts` + `group-dish.ts` | **`dish-draft.test.ts` ĐỎ trước** (§5.2) | |
| 3 | `schema.ts` → `yarn db:generate --name=global_and_group_dishes` → `yarn db:migrate` | đọc `.sql` sinh ra, đối chiếu ba điểm ở §7.2 | |
| 4 | port `dish-repository.ts` + `add-dish-to-group.ts` + `makeGroupDish` | **`add-dish-to-group.test.ts` ĐỎ trước — acceptance của E1-T5** | **E1-T5 (logic)** |
| 5 | `list-group-dishes.ts` | **ĐỎ trước** (§6.3) | |
| 6 | `infrastructure/drizzle-dish-repository.ts` | không unit test (Tech Spec §8.2) | |
| 7 | `presentation/components/{dish-row,add-dish-sheet,dish-catalog-screen}.tsx` | **ĐỎ trước** (§9.4) | |
| 8 | `app/groups/[groupId]/group-access.ts` + viết lại `[groupId]/page.tsx` | 4 test hiện có của `group-overview-screen` phải **vẫn xanh** trước khi thêm 2 test mới | |
| 9 | `app/groups/[groupId]/dishes/{page,loading,error,actions}.tsx` | không unit test; kiểm ở §13 | **E1-T5 (UI)** |
| 10 | Sửa `app/groups/error.tsx`: `reset` → `retry` | `yarn typecheck` | |
| 11 | decision log, master plan | `yarn verify && yarn arch:probe && yarn build` | |
| 12 | Smoke thủ công (§13) → PR | | |

Sau bước 5: `yarn test:coverage` — `normalize-name.ts`, `dish-draft.ts`, `add-dish-to-group.ts` phải ≥80% dòng.

---

# 13. Verify

## 13.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn build
```

`yarn test` phải in nhóm `SPEC-005 rút gọn — Thêm Dish vào Group Dish Pool` với 6 `it`, cộng `SPEC-005 — chuẩn hoá tên món (mức 1)` với 5 `it`. Đính output vào PR.

**Ghi thẳng vào mô tả PR:** *"Test Cases v0.1 không có TC nào gán cho E1-T5 (TC-017→021 thuộc E2-T4, TC-098 thuộc E2-T3). Các `it` của slice này mở đầu bằng `SPEC-005:` / `BR-001:` / `BR-005:` thay cho TC-ID, theo tinh thần §1.2 (`it` tra ngược được về tài liệu mà không cần đọc code). Đã cân nhắc và loại hai phương án: (a) đặt id namespace riêng `E1-T5-01…` — phải nuôi mãi mãi một hệ id thứ hai; (b) mượn TC-017→021 — chúng sẽ xanh sớm và che mất acceptance thật của E2-T4."*

## 13.2 Local, DevTools 390×844

```bash
yarn db:migrate
yarn dev
```

1. `/groups/<uuid>` → hàng **"Danh mục món"** hiện, meta `Chưa có món nào` màu `--accent`; CTA đáy `Thêm món đầu tiên`. **Không** có hàng "Quy định bữa ăn" hay "Thành viên".
2. Bấm CTA → `/groups/<uuid>/dishes` = S-05 **rỗng**: caption tên nhóm, `<h1>` "Danh mục món", số đếm **trống**, thẻ trắng bo 20 với `Chưa có món nào.` + ba ví dụ `--ink-faint`, đáy chỉ có nút `Thêm món đầu tiên` (**không** có caption "Khoảng 15–20 món…"). Đối chiếu từng con số với prototype dòng 33–100.
3. Bấm `Thêm món đầu tiên` → sheet trượt từ đáy, focus rơi vào phần tử đầu, `Esc` đóng được, bấm scrim đóng được. Nút `Thêm vào danh mục` nền `--surface-sunken`, chữ `--ink-faint`, **vẫn bấm được**.
4. Bấm khi ô tên trống → `Nhập tên món trước đã.` hiện dưới input, viền input `--danger`, **sheet vẫn mở**.
5. Gõ `  Cá basa   kho tiêu ` → bấm → sheet đóng, danh sách có đúng một hàng **`Cá basa kho tiêu`** (khoảng trắng đã gộp), số đếm `1 món`, caption `Khoảng 15–20 món là đủ để bắt đầu` xuất hiện, toast `Đã thêm Cá basa kho tiêu vào danh mục.` nền `--yes-soft` với thanh dọc 3px `--yes`, nhãn nút chuyển `Thêm món`.
6. Mở sheet lại → **toast biến mất**, ô tên trống.
7. Gõ `canh   CHUA cá lóc` rồi `Canh chua cá lóc` — món thứ hai bị chặn: `Món này đã có trong danh mục rồi.` dưới input. `yarn db:studio` xác nhận `global_dishes` vẫn đúng 2 dòng.
8. **`yarn db:studio` — bằng chứng BR-001 + BR-005 ở tầng thật:**
   - `global_dishes`: `name = 'Cá basa kho tiêu'`, `normalized_name = 'cá basa kho tiêu'` (**còn dấu** — E1 mức 1), `created_by_user_id` khớp `users.id` của bạn, `created_from_group_id` khớp `groups.id`, `created_at` có giá trị.
   - `group_dishes`: `state = 'ACTIVE'`, `group_id` + `global_dish_id` đúng cặp.
9. Quay lại `/groups/<uuid>` → hàng "Danh mục món" meta `2 món` màu `--ink-muted`, CTA đáy đổi thành `Thêm món`. (Đây là bằng chứng `revalidatePath` chạy.)
10. **Bằng chứng nguyên tử (SDD §2.4):** trong `db:studio` tạm đổi `global_dishes.created_from_group_id` thành một UUID không tồn tại → không được (FK chặn). Thay vào đó: tạm `ALTER TABLE group_dishes ADD CONSTRAINT tmp_fail CHECK (false);` rồi thêm một món → phải thất bại **và** `global_dishes` không có dòng mới. `DROP CONSTRAINT tmp_fail` sau đó. Nếu thấy dòng mồ côi ở `global_dishes` thì `db.batch` không chạy như mong đợi — dừng và mở lại §1.5.
11. **Bằng chứng SPEC-019 chạy thật:** trong `db:studio` đặt `group_members.removed_at = now()` → refresh `/groups/<uuid>/dishes` → **404, không lộ tên nhóm**. `SET removed_at = NULL` để khôi phục.
12. **Bằng chứng guard trong Server Action:** với `removed_at` đang đặt, mở DevTools → Network, gọi lại POST của action bằng "Replay XHR" (hoặc `fetch` thủ công tới cùng URL với header `Next-Action`) → phải trả 404, **không** ghi món nào. Đây là chỗ duy nhất chứng minh guard không dựa vào việc ẩn nút.
13. Cửa sổ ẩn danh → `/groups/<uuid>/dishes` → đẩy về `/`.

## 13.3 Preview Vercel

Env scope Preview trỏ Neon branch của PR; migration chạy trong bước build. Chạy lại kịch bản 1–9 **trên điện thoại thật** (Setup Guide §5.1). Chú ý riêng: sheet + bàn phím ảo — ô tên phải còn nhìn thấy khi bàn phím mở (`max-height: 88%` của `Sheet` cộng `overflow:auto`).

---

# 14. Rủi ro

| Rủi ro | Dấu hiệu | Làm gì |
|---|---|---|
| drizzle-kit đặt `CREATE TYPE` **sau** `CREATE TABLE` | `yarn db:migrate` đỏ `type "group_dish_state" does not exist` | Đọc `0002_*.sql` **trước khi** migrate (§7.2 điểm 1). Nếu sai thứ tự: đổi cột sang `text('state').$type<GroupDishState>().notNull().default('ACTIVE')`, ghi lý do vào decision log, và mở issue cho E2 thêm `CHECK` |
| `db.batch` cần tuple ≥1 phần tử | `tsc`: "not assignable to tuple" | Truyền literal array 2 phần tử, không `.map()`, không gán qua biến `X[]` (§1.5) |
| Quên sinh `globalDishId` tường minh | `group_dishes.global_dish_id` là `undefined` / FK vi phạm | Batch non-interactive — cả hai `uuidv7()` gọi ở infrastructure, không dựa vào `$defaultFn` |
| jscpd đỏ vì ba page cùng khung guard | `yarn dup` ≥3% | Đã phòng bằng `requireGroupContext` (§10.1). Nếu vẫn đỏ, ứng viên tiếp theo là hai `page.tsx` cùng khối `await params` + `listGroupDishes` — rút thành một helper `readGroupDishes(groupId)` ở `app/groups/[groupId]/`. **Không** hạ threshold |
| knip báo component chưa dùng | `yarn knip` đỏ | Nghĩa là bước 9 chưa nối `page.tsx` vào. Sửa page, **đừng** thêm dòng ignore |
| `typedRoutes` không chịu `` `/groups/${id}/dishes` `` | `tsc` đỏ ở `page.tsx` / `group-overview-screen.tsx` | Cùng escape hatch S2 §10.1: `` as Route ``, hoặc `href={{ pathname: '/groups/[groupId]/dishes', query: { groupId: id } }}`. Thử cách đơn giản trước |
| `refresh()` không có sẵn / hành xử lạ | `yarn build` đỏ ở import, hoặc danh sách không tươi sau khi thêm | Đã kiểm export ở `node_modules/next/cache.d.ts`. Fallback: thay bằng `revalidatePath(\`/groups/${groupId}/dishes\`)` (đường dẫn literal, không `type`) |
| `useActionState` + `exactOptionalPropertyTypes` | `tsc`: "Type 'undefined' is not assignable" | `AddDishFormState` có **hai** trường bắt buộc kiểu `X \| null`, không optional property nào (§9.2) |
| Sheet không đóng sau khi thêm | thêm xong sheet vẫn mở, toast không hiện | `useEffect` phụ thuộc `[state]` (object mới mỗi vòng action), không phải `[state.addedDishName]` — hai lần thêm cùng tên sẽ không đổi giá trị chuỗi |
| Nút chính trong sheet vẫn có bóng | lệch thiết kế | `className="shadow-none"`; nếu thứ tự stylesheet bất định thì thêm variant `primaryFlat` vào `button.tsx` (§9.3) |
| **E2-T3 phải backfill `normalized_name`** | `Cá kho` và `Ca kho` vẫn là hai món sau khi E2-T3 lên | Đã ghi vào decision log ở §11. Backfill **không** làm bằng SQL được (hàm bỏ dấu là JS): E2-T3 cần một script `scripts/backfill-normalized-name.ts` đọc từng dòng rồi `UPDATE`. Ở quy mô một gia đình đây là vài chục dòng — rẻ, nhưng phải nằm trong ước lượng 2 giờ của E2-T3, nếu không nó sẽ trượt |
| Hàng "Danh mục món" đơn độc trông lệch thiết kế | review UI kêu | Đã cân nhắc và chấp nhận (§2.7). Nếu người đặt hàng không chịu, phương án dự phòng là **tắt luôn cả hàng lối tắt**, chỉ giữ CTA đáy — đừng vẽ hàng chết |
| Node mặc định v22 nhưng `.nvmrc` = 24 | "chạy được ở máy tôi" | `nvm use` trước mọi lệnh |

---

## Điểm còn là giả định (chưa kiểm được ở phiên đọc-only)

Ghi rõ để người thi công kiểm ngay ở bước tương ứng:

1. **Thứ tự câu lệnh trong `0002_*.sql`** — §1.6 chỉ chứng minh drizzle-kit *có* sinh `CREATE TYPE`; chưa chạy `yarn db:generate` nên chưa thấy thứ tự thật. Kiểm ở bước 3.
2. **`refresh()` chạy đúng ở runtime** — export đã xác nhận ở `node_modules/next/cache.d.ts`; hành vi thật chưa chạy. Kiểm ở §13.2 bước 5.
3. **`typedRoutes` với template literal route lồng** — S2 đã gặp ở route một tầng; hai tầng chưa thử.
4. **`shadow-none` thắng `shadow-button`** trong Tailwind v4 với thứ tự utility hiện tại — chưa dựng CSS để xác nhận.
5. **jscpd sau khi có `requireGroupContext`** — chưa chạy `yarn dup` trên mã chưa tồn tại.
6. **S1 đã landed thật** (kiểm lúc 2026-08-17: `src/features/auth/**`, `src/shared/{result,errors,ui/button,ui/banner,testing/factories}`, `src/app/{api/auth,groups/page.tsx}`, `postcss.config.mjs` đều có). **S2 thì CHƯA** — chưa có `src/features/group/**`, `src/shared/time/**`, `src/shared/ui/{skeleton,text-field,empty-state-card,sheet}.tsx`, `app/groups/{new,[groupId]}`, và `migrations/` mới chỉ có `0000`. Guide này giả định S2 đã landed đúng như guide S2. **Làm S2 trước S3** — S3 phụ thuộc `assertGroupAccess`, `drizzleGroupRepository`, `Sheet`, `TextField`, `EmptyStateCard`, `Skeleton`, và `Button` bản đã mở rộng (`size` / `quiet` / `muted`).

---
