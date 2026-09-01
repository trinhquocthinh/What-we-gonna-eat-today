# 🍲 Implementation Guide — E2 Slice S2: Chuẩn hoá tên món & Phát hiện trùng lặp

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-18` | **Last Updated:** `2026-08-18`
> - **Upstream:** [Master Plan](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E2-T3, E2-T4`) • [SDD](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-005`) • [Business Rules](../../what-we-gonna-eat-today_business-rules_v1.8.md) (`BR-001, BR-002`) • [Test Cases Spec](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-017→021, TC-097→099, TC-098`)
> - **Tiền đề:** `E2-S1` (Link mời) đã có guide.
>
> 📌 *Hướng dẫn kỹ thuật thi công TDD cho Slice S2 của Epic 2: Chuẩn hoá tên món bỏ dấu tiếng Việt (Level 2), phát hiện trùng lặp món ăn, cờ `forceCreate` và khôi phục Dish Inactive.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | --- | --- | --- |
| E2-T3 | Chuẩn hoá tên món bỏ dấu, hàm thuần | 2 | `features/dish/domain/normalize-name.ts` | `Ca kho` và `Cá kho` cùng `normalized_name`; backfill xong dữ liệu cũ |
| E2-T4 | Phát hiện trùng, `forceCreate`, khôi phục Dish Inactive | 3 | `features/dish/application/**` | Thêm lại Dish Inactive chuyển `ACTIVE`, không tạo Global Dish mới |

- [x] TC-098 pass: `Ca kho`/`Cá kho` cùng `normalized_name`
- [x] Script backfill chạy được, cập nhật đúng các dòng `global_dishes` cũ
- [x] TC-017, TC-018, TC-019, TC-020, TC-099 pass
- [x] `dishes/actions.ts` (từ S3) biên dịch lại được với hợp đồng trả về mới
- [x] `yarn verify && yarn arch:probe` xanh

---

# 1. Khoảng hở đã phát hiện trước khi thiết kế — đọc trước khi code

Đã đọc verbatim SPEC-005 (SDD), TC-017→021/097→099, BR-001/BR-002, US-002 (PRD), và phần "phát hiện trùng" ở cả hai design doc S-06. Có một khoảng hở thật, không phải đọc thiếu:

- **BR-001**: *"User có thể chọn Dish đã tồn tại."* **PRD US-002**: *"...hệ thống hiển thị Dish đang có và cho tôi chọn dùng lại."* **Design S-06**: nút "Dùng món này" nổi bật hơn nút tạo mới.
- **SPEC-005** (đầu vào hình thức): `{ groupId, name: string 1..120, systemTags: SystemTag[] 0..5 }` + cờ `forceCreate` (chỉ xuất hiện trong prose, không trong dòng "Đầu vào" chính thức). **Không có tham số nào** kiểu `reuseGlobalDishId` để biểu diễn "chọn dùng ứng viên nào". Test Cases cũng chỉ có đúng TC-018 (trả ứng viên, không tạo) và TC-019 (forceCreate tạo mới) — không có TC thứ ba cho "dùng lại".

**Quyết định lấp khoảng hở (ghi thành DEC-023 ở §15)**: "dùng lại một ứng viên" là một **use case riêng**, nằm ngoài hợp đồng SPEC-005, nhận thẳng `globalDishId` đã chọn thay vì `name`. Đặt ở slice này (E2-T4 là "phát hiện trùng" trong Master Plan) — S4 (E2-T6/T7) chỉ nối dây UI vào use case đã có sẵn, không tự thiết kế lại.

**Khoảng hở thứ hai**: TC-021 (`systemTags` không hợp lệ → `ERR_INVALID_SYSTEM_TAG`) nằm trong dải TC Master Plan gán cho E2-T4, nhưng cột "Xong nghĩa là" của E2-T4 không nhắc System Tag, và bảng lưu tag (`group_dish_tags`) + type `SystemTag` chỉ tồn tại từ **E2-T5**. Thêm `systemTags` làm input mà chưa có chỗ lưu là nửa vời — **quyết định dời TC-021 sang guide S3/E2-T5** (ghi thành DEC-024 ở §15), nơi nó thực sự có ý nghĩa.

---

# 2. Việc KHÔNG làm ở slice này

- TC-021 / `systemTags` / `ERR_INVALID_SYSTEM_TAG` — dời sang S3 (E2-T5).
- UI thật cho "Dùng món này" (`duplicate-sheet.tsx`, trạng thái phát hiện trùng trên S-06) — S4 (E2-T6/T7). Slice này chỉ đảm bảo `dishes/actions.ts` biên dịch được và use case đã sẵn sàng cho S4 gọi vào, KHÔNG dựng UI đẹp.
- Không đổi giới hạn 120 ký tự tên món (TC-097) — đã đúng từ E1-T5 (`dish-draft.ts`), chỉ thêm test hồi quy.
- Không làm gì với `group_dish_tags`, System Tag.

---

# 3. File tree — trước và sau slice này

```
src/features/dish/
  domain/
    dish-draft.ts / .test.ts              (đã có, không đổi)
    group-dish.ts                         (đã có, không đổi)
    normalize-name.ts / .test.ts          SỬA (+ bỏ dấu, lật 1 test)
  application/
    dish-repository.ts                    SỬA (+ GroupDishLookup, GlobalDishCandidate, 3 method mới)
    add-dish-to-group.ts / .test.ts       SỬA (output đổi thành union, thêm nhánh)
    add-existing-dish-to-group.ts         + MỚI
    add-existing-dish-to-group.test.ts    + MỚI
    list-group-dishes.ts                  (đã có, không đổi)
  infrastructure/
    drizzle-dish-repository.ts            SỬA (+ 3 method, sửa 1)
    drizzle-dish-repository.integration.test.ts  + MỚI

scripts/
  backfill-normalized-name.ts             + MỚI

src/app/groups/[groupId]/dishes/
  actions.ts                              SỬA (khớp hợp đồng union mới)

package.json                              SỬA (+ script backfill:normalized-name)
```

---

# 4. E2-T3 — `src/features/dish/domain/normalize-name.ts`

Điền đúng vào chỗ đã đánh dấu sẵn từ E1 (không tạo file thứ hai — đúng cảnh báo đã ghi trong chính comment của file):

```ts
export function normalizeDishName(name: string): string {
  return collapseDishName(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .replaceAll('đ', 'd')
}
```

**Thứ tự quan trọng**: `.toLowerCase()` chạy TRƯỚC `.replaceAll('đ', 'd')` — nên chỉ cần xử lý `đ` thường, không cần `Đ` hoa (đã bị hạ thành `đ` từ bước `toLowerCase()`). `̀-ͯ` là dải Unicode "Combining Diacritical Marks" — đúng dải ký tự `NFD` tách dấu tiếng Việt ra thành base-letter + combining-mark.

## 4.1 Test — cập nhật `normalize-name.test.ts`

Guide S3 đã đánh dấu sẵn một test chờ lật (`it('E1 CỐ Ý chưa bỏ dấu — E2-T3 đổi kỳ vọng này thành toBe', ...)`). Đổi `not.toBe` thành `toBe`:

```ts
describe('normalizeDishName', () => {
  // ...(các test E1 giữ nguyên)...

  it('TC-098 — bỏ dấu tiếng Việt, "Ca kho" và "Cá kho" cùng normalized_name', () => {
    expect(normalizeDishName('Ca kho')).toBe(normalizeDishName('Cá kho'))
    expect(normalizeDishName('Cá kho')).toBe('ca kho')
  })

  it('bỏ dấu cho nguyên âm có dấu mũ + thanh điệu cùng lúc', () => {
    expect(normalizeDishName('Phở bò')).toBe('pho bo')
    expect(normalizeDishName('Bún đậu')).toBe('bun dau')
  })

  it('giữ nguyên chữ không dấu', () => {
    expect(normalizeDishName('Kho quet')).toBe('kho quet')
  })
})
```

## 4.2 Backfill — `scripts/backfill-normalized-name.ts`

Không thể làm bằng SQL thuần (hàm bỏ dấu là JS, Postgres không có `unaccent` cài sẵn theo mặc định trên Neon) — đúng cảnh báo đã ghi trong risk table của guide S3. Theo đúng khuôn `scripts/create-test-session.ts` đã có (đọc `.env.local` rồi `.env`, import thẳng từ `../src/...`, log tiếng Việt có emoji):

```ts
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'

config({ path: '.env.local', quiet: true })
config({ path: '.env', quiet: true })

import { normalizeDishName } from '../src/features/dish/domain/normalize-name'
import { getDb } from '../src/shared/db/client'
import { globalDishes } from '../src/shared/db/schema'

async function main() {
  console.log('🔤 [What We Gonna Eat Today] Backfill normalized_name (bỏ dấu tiếng Việt)...\n')

  const db = getDb()
  const rows = await db.select().from(globalDishes)

  console.log(`📦 Tổng số Global Dish: ${rows.length}`)

  let changed = 0
  for (const row of rows) {
    const recomputed = normalizeDishName(row.name)
    if (recomputed !== row.normalizedName) {
      await db
        .update(globalDishes)
        .set({ normalizedName: recomputed })
        .where(eq(globalDishes.id, row.id))
      console.log(`   ✏️  "${row.name}": "${row.normalizedName}" → "${recomputed}"`)
      changed++
    }
  }

  console.log(`\n✅ Xong. Đã cập nhật ${changed}/${rows.length} dòng.`)
}

main().catch((error) => {
  console.error('❌ Lỗi backfill:', error)
  process.exit(1)
})
```

Thêm vào `package.json`, cạnh `seed:dishes`/`session:start` đã có:

```json
"backfill:normalized-name": "tsx scripts/backfill-normalized-name.ts"
```

**Chạy thử trên Neon branch `test` trước** (`DATABASE_URL` trỏ branch test trong `.env.local` khi chạy thử) — đây là script ghi dữ liệu, không phải chỉ đọc; đừng chạy lần đầu thẳng vào `dev`/`main`.

---

# 5. E2-T4 — Port `src/features/dish/application/dish-repository.ts`

Sửa file đã có, thêm type và method mới, giữ nguyên các type/method cũ:

```ts
import type { GroupDishState } from '../domain/group-dish'

export type GroupDishSummary = {
  readonly id: string
  readonly name: string
}

/** MỚI — E2-T4 cần biết state để phân biệt ACTIVE (lỗi TC-099) và INACTIVE
 *  (khôi phục TC-020) khi tra theo tên trong group. */
export type GroupDishLookup = GroupDishSummary & {
  readonly state: GroupDishState
}

/** MỚI — ứng viên trùng ở phạm vi TOÀN CỤC (không giới hạn theo group). */
export type GlobalDishCandidate = {
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
  findInGroupByNormalizedName(groupId: string, normalizedName: string): Promise<GroupDishLookup | null>
  findGlobalCandidatesByNormalizedName(normalizedName: string): Promise<GlobalDishCandidate[]>
  createGlobalDishAndAddToPool(input: NewDishInGroup): Promise<GroupDishSummary>
  reactivateGroupDish(groupDishId: string): Promise<void>
  addExistingGlobalDishToGroup(input: {
    readonly groupId: string
    readonly globalDishId: string
  }): Promise<GroupDishSummary>
  listActiveInGroup(groupId: string): Promise<GroupDishSummary[]>
}
```

`findInGroupByNormalizedName` đổi kiểu trả về từ `GroupDishSummary | null` sang `GroupDishLookup | null` — đúng ghi chú đã để sẵn ở guide S3 ("E2-T4 thêm 'state' vào kiểu trả về; SQL không phải đổi").

---

# 6. Use case `add-dish-to-group.ts` — sửa, output đổi thành union

```ts
import { readDishDraft } from '../domain/dish-draft'
import type { DishRepository, GlobalDishCandidate, GroupDishSummary } from './dish-repository'
import { failure, type Failure } from '@/shared/errors'
import type { Result } from '@/shared/result'

export type AddDishToGroupDeps = {
  readonly dishes: DishRepository
}

export type AddDishToGroupInput = {
  readonly groupId: string
  readonly creatorUserId: string
  readonly name: string
  readonly forceCreate?: boolean
}

export type AddDishOutcome =
  | { readonly kind: 'added'; readonly dish: GroupDishSummary }
  | { readonly kind: 'candidates'; readonly candidates: GlobalDishCandidate[] }

export async function addDishToGroup(
  deps: AddDishToGroupDeps,
  input: AddDishToGroupInput,
): Promise<Result<AddDishOutcome, Failure>> {
  const draft = readDishDraft({ name: input.name })
  if (!draft.ok) {
    return { ok: false, error: failure('ERR_VALIDATION', { field: 'name' }) }
  }

  // 1. Đã có row cho tên này TRONG group này? (TC-020, TC-099)
  const existing = await deps.dishes.findInGroupByNormalizedName(
    input.groupId,
    draft.value.normalizedName,
  )
  if (existing !== null) {
    if (existing.state === 'ACTIVE') {
      return { ok: false, error: failure('ERR_DISH_ALREADY_IN_POOL') }
    }
    // INACTIVE — TC-020: khôi phục, KHÔNG tạo Global Dish mới.
    await deps.dishes.reactivateGroupDish(existing.id)
    return { ok: true, value: { kind: 'added', dish: { id: existing.id, name: existing.name } } }
  }

  // 2. Chưa có trong group này. forceCreate=true bỏ qua tra candidate, luôn tạo mới (TC-019).
  if (input.forceCreate === true) {
    const dish = await deps.dishes.createGlobalDishAndAddToPool({
      groupId: input.groupId,
      name: draft.value.name,
      normalizedName: draft.value.normalizedName,
      creatorUserId: input.creatorUserId,
    })
    return { ok: true, value: { kind: 'added', dish } }
  }

  // 3. Tra ứng viên TOÀN CỤC theo tên chuẩn hoá (TC-018).
  const candidates = await deps.dishes.findGlobalCandidatesByNormalizedName(draft.value.normalizedName)
  if (candidates.length > 0) {
    return { ok: true, value: { kind: 'candidates', candidates } }
  }

  // 4. Không candidate nào — tạo mới bình thường (TC-017).
  const dish = await deps.dishes.createGlobalDishAndAddToPool({
    groupId: input.groupId,
    name: draft.value.name,
    normalizedName: draft.value.normalizedName,
    creatorUserId: input.creatorUserId,
  })
  return { ok: true, value: { kind: 'added', dish } }
}
```

**Vì sao candidate ở bước 3 không bao giờ trùng dish đang ACTIVE trong chính group này**: một `globalDishId` ứng với đúng một `normalizedName` (bất biến của bảng `global_dishes`). Nếu một candidate đang ACTIVE trong group này dưới đúng `normalizedName` đang xét, bước 1 đã tìm thấy nó qua `findInGroupByNormalizedName` và trả lỗi/khôi phục trước khi code chạy tới bước 3. Nhờ bất biến này, `add-existing-dish-to-group.ts` (§7) không cần tự kiểm tra lại "đã active chưa" — luôn an toàn để upsert thẳng.

## 6.1 Test — mở rộng `add-dish-to-group.test.ts`

Giữ nguyên các test E1 đã có (TC-VALIDATION cũ), thêm:

```ts
import { describe, expect, it, vi } from 'vitest'

import { addDishToGroup } from './add-dish-to-group'
import type { DishRepository, GroupDishLookup } from './dish-repository'

function makeDeps(overrides: {
  existing?: GroupDishLookup | null
  candidates?: { id: string; name: string }[]
} = {}): AddDishToGroupDeps {
  const dishes: DishRepository = {
    findInGroupByNormalizedName: vi.fn(async () => overrides.existing ?? null),
    findGlobalCandidatesByNormalizedName: vi.fn(async () => overrides.candidates ?? []),
    createGlobalDishAndAddToPool: vi.fn(async (input) => ({ id: 'new-dish', name: input.name })),
    reactivateGroupDish: vi.fn(async () => undefined),
    addExistingGlobalDishToGroup: vi.fn(async () => ({ id: 'reused', name: 'x' })),
    listActiveInGroup: vi.fn(async () => []),
  }
  return { dishes }
}

describe('addDishToGroup', () => {
  it('TC-017 — chưa có Dish nào: tạo mới, normalized_name đúng', async () => {
    const deps = makeDeps()

    const result = await addDishToGroup(deps, {
      groupId: 'g1',
      creatorUserId: 'u1',
      name: '  Canh   Chua  ',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.kind).toBe('added')
    expect(deps.dishes.createGlobalDishAndAddToPool).toHaveBeenCalledWith(
      expect.objectContaining({ normalizedName: 'canh chua' }),
    )
  })

  it('TC-018 — đã có Global Dish cùng tên, không forceCreate: trả candidates, không tạo', async () => {
    const deps = makeDeps({ candidates: [{ id: 'gd1', name: 'Canh chua' }] })

    const result = await addDishToGroup(deps, { groupId: 'g1', creatorUserId: 'u1', name: 'canh chua' })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value).toEqual({ kind: 'candidates', candidates: [{ id: 'gd1', name: 'Canh chua' }] })
    expect(deps.dishes.createGlobalDishAndAddToPool).not.toHaveBeenCalled()
  })

  it('TC-019 — forceCreate=true: tạo Global Dish thứ hai dù có candidate', async () => {
    const deps = makeDeps({ candidates: [{ id: 'gd1', name: 'Canh chua' }] })

    const result = await addDishToGroup(deps, {
      groupId: 'g1',
      creatorUserId: 'u1',
      name: 'canh chua',
      forceCreate: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.kind).toBe('added')
    expect(deps.dishes.createGlobalDishAndAddToPool).toHaveBeenCalledOnce()
    expect(deps.dishes.findGlobalCandidatesByNormalizedName).not.toHaveBeenCalled()
  })

  it('TC-020 — Dish INACTIVE trong group: khôi phục ACTIVE, không tạo Global Dish mới', async () => {
    const deps = makeDeps({ existing: { id: 'gd-existing', name: 'Canh chua', state: 'INACTIVE' } })

    const result = await addDishToGroup(deps, { groupId: 'g1', creatorUserId: 'u1', name: 'canh chua' })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value).toEqual({ kind: 'added', dish: { id: 'gd-existing', name: 'Canh chua' } })
    expect(deps.dishes.reactivateGroupDish).toHaveBeenCalledWith('gd-existing')
    expect(deps.dishes.createGlobalDishAndAddToPool).not.toHaveBeenCalled()
  })

  it('TC-099 — Dish đã ACTIVE trong group: ERR_DISH_ALREADY_IN_POOL', async () => {
    const deps = makeDeps({ existing: { id: 'gd-existing', name: 'Canh chua', state: 'ACTIVE' } })

    const result = await addDishToGroup(deps, { groupId: 'g1', creatorUserId: 'u1', name: 'canh chua' })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_DISH_ALREADY_IN_POOL')
  })

  it('TC-097 (hồi quy) — tên 120 ký tự vẫn được chấp nhận', async () => {
    const deps = makeDeps()
    const longName = 'a'.repeat(120)

    const result = await addDishToGroup(deps, { groupId: 'g1', creatorUserId: 'u1', name: longName })

    expect(result.ok).toBe(true)
  })
})
```

---

# 7. Use case mới — `add-existing-dish-to-group.ts`

```ts
import type { DishRepository, GroupDishSummary } from './dish-repository'
import type { Failure } from '@/shared/errors'
import type { Result } from '@/shared/result'

export type AddExistingDishToGroupDeps = {
  readonly dishes: DishRepository
}

export type AddExistingDishToGroupInput = {
  readonly groupId: string
  readonly globalDishId: string
}

/**
 * "Dùng món này" trên S-06 (E2-T7 nối dây UI). KHÔNG thuộc hợp đồng SPEC-005
 * (vốn chỉ nhận `name`+`forceCreate`) — xem DEC-023. An toàn để luôn upsert
 * thẳng lên ACTIVE vì một candidate trả về từ `findGlobalCandidatesByNormalizedName`
 * không bao giờ trùng dish đang ACTIVE của group này (xem giải thích ở
 * `add-dish-to-group.ts`).
 */
export async function addExistingDishToGroup(
  deps: AddExistingDishToGroupDeps,
  input: AddExistingDishToGroupInput,
): Promise<Result<GroupDishSummary, Failure>> {
  const dish = await deps.dishes.addExistingGlobalDishToGroup(input)
  return { ok: true, value: dish }
}
```

Không trả `Failure` nào trong nhánh thực tế hiện tại — vẫn giữ kiểu `Result<GroupDishSummary, Failure>` (không phải trả thẳng `GroupDishSummary`) để nhất quán chữ ký với các use case khác trong feature, và để dành chỗ nếu sau này cần thêm một điều kiện lỗi (ví dụ `globalDishId` không tồn tại — hiện để FK constraint tự chặn ở tầng DB, xem §11 rủi ro).

## 7.1 Test — `add-existing-dish-to-group.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest'

import { addExistingDishToGroup } from './add-existing-dish-to-group'
import type { DishRepository } from './dish-repository'

describe('addExistingDishToGroup', () => {
  it('gọi thẳng addExistingGlobalDishToGroup, trả dish', async () => {
    const dishes: Partial<DishRepository> = {
      addExistingGlobalDishToGroup: vi.fn(async () => ({ id: 'gd1', name: 'Canh chua' })),
    }

    const result = await addExistingDishToGroup(
      { dishes: dishes as DishRepository },
      { groupId: 'g1', globalDishId: 'global-1' },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value).toEqual({ id: 'gd1', name: 'Canh chua' })
    expect(dishes.addExistingGlobalDishToGroup).toHaveBeenCalledWith({
      groupId: 'g1',
      globalDishId: 'global-1',
    })
  })
})
```

---

# 8. Infra — `src/features/dish/infrastructure/drizzle-dish-repository.ts` — sửa + mở rộng

```ts
import { and, asc, eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { getDb } from '@/shared/db/client'
import { globalDishes, groupDishes } from '@/shared/db/schema'

import type { DishRepository, GroupDishLookup, GlobalDishCandidate, NewDishInGroup } from '../application/dish-repository'

async function findInGroupByNormalizedName(
  groupId: string,
  normalizedName: string,
): Promise<GroupDishLookup | null> {
  const db = getDb()
  const rows = await db
    .select({
      id: groupDishes.id,
      name: globalDishes.name,
      state: groupDishes.state,
    })
    .from(groupDishes)
    .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
    .where(and(eq(groupDishes.groupId, groupId), eq(globalDishes.normalizedName, normalizedName)))
    .limit(1)

  return rows[0] ?? null
}

/**
 * Phạm vi TOÀN CỤC — không lọc theo group. Giới hạn 3 ứng viên theo đúng
 * thiết kế S-06 ("liệt kê tối đa 3 ứng viên"), cũ nhất trước (ưu tiên Global
 * Dish đã tồn tại lâu hơn — lựa chọn hợp lý mặc định, SPEC-005 không quy định
 * thứ tự).
 */
async function findGlobalCandidatesByNormalizedName(
  normalizedName: string,
): Promise<GlobalDishCandidate[]> {
  const db = getDb()
  return db
    .select({ id: globalDishes.id, name: globalDishes.name })
    .from(globalDishes)
    .where(eq(globalDishes.normalizedName, normalizedName))
    .orderBy(asc(globalDishes.createdAt))
    .limit(3)
}

async function reactivateGroupDish(groupDishId: string): Promise<void> {
  const db = getDb()
  await db.update(groupDishes).set({ state: 'ACTIVE' }).where(eq(groupDishes.id, groupDishId))
}

/**
 * Upsert trên unique index `group_dishes_group_global_unique(groupId, globalDishId)`
 * đã có từ E1-T5. Xử lý gọn cả "chưa từng có row" (INSERT bình thường) và "có
 * row nhưng INACTIVE" (ON CONFLICT chuyển ACTIVE) trong một câu — không cần
 * đọc trước để phân nhánh, vì cả hai kết quả mong muốn giống nhau.
 */
async function addExistingGlobalDishToGroup(input: {
  groupId: string
  globalDishId: string
}) {
  const db = getDb()
  const id = uuidv7()

  await db
    .insert(groupDishes)
    .values({ id, groupId: input.groupId, globalDishId: input.globalDishId, state: 'ACTIVE' })
    .onConflictDoUpdate({
      target: [groupDishes.groupId, groupDishes.globalDishId],
      set: { state: 'ACTIVE' },
    })

  // onConflictDoUpdate().returning() chỉ trả cột của groupDishes, không có
  // tên món — join riêng để lấy `name` cho toast phía UI.
  const [dish] = await db
    .select({ id: groupDishes.id, name: globalDishes.name })
    .from(groupDishes)
    .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
    .where(and(eq(groupDishes.groupId, input.groupId), eq(groupDishes.globalDishId, input.globalDishId)))
    .limit(1)

  if (dish === undefined) {
    throw new Error('addExistingGlobalDishToGroup: không tìm thấy dòng vừa upsert — không nên xảy ra')
  }

  return dish
}

export const drizzleDishRepository: DishRepository = {
  findInGroupByNormalizedName,
  findGlobalCandidatesByNormalizedName,
  createGlobalDishAndAddToPool, // giữ nguyên từ E1-T5, không đổi
  reactivateGroupDish,
  addExistingGlobalDishToGroup,
  listActiveInGroup, // giữ nguyên từ E1-T5, không đổi
}
```

`createGlobalDishAndAddToPool` và `listActiveInGroup` giữ nguyên y hệt từ guide S3 — chỉ trích lại tên trong export, không chép lại thân hàm ở đây, xem file gốc.

## 8.1 Integration test — `drizzle-dish-repository.integration.test.ts`

```ts
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'

import { getDb } from '@/shared/db/client'
import { globalDishes, groupDishes, groups, users } from '@/shared/db/schema'
import { makeGroup, makeUser } from '@/shared/testing/factories'
import { normalizeDishName } from '@/features/dish/domain/normalize-name'

import { drizzleDishRepository } from './drizzle-dish-repository'

describe('drizzleDishRepository — E2-T4', () => {
  beforeEach(async () => {
    const db = getDb()
    await db.delete(groupDishes)
    await db.delete(globalDishes)
    await db.delete(groups)
    await db.delete(users)
  })

  it('addExistingGlobalDishToGroup — chưa có row: tạo mới ACTIVE', async () => {
    const db = getDb()
    const user = makeUser()
    const group = makeGroup()
    await db.insert(users).values(user)
    await db.insert(groups).values(group)
    const dish = await drizzleDishRepository.createGlobalDishAndAddToPool({
      groupId: group.id,
      name: 'Canh chua',
      normalizedName: normalizeDishName('Canh chua'),
      creatorUserId: user.id,
    })
    // Gỡ khỏi group để test nhánh "chưa có row" cho group thứ hai giả lập
    const group2 = makeGroup({ id: '01920000-0000-7000-8000-0000000000a2', name: 'Nhà khác' })
    await db.insert(groups).values(group2)

    const result = await drizzleDishRepository.addExistingGlobalDishToGroup({
      groupId: group2.id,
      globalDishId: (
        await db.select().from(globalDishes).where(eq(globalDishes.normalizedName, 'canh chua'))
      )[0]!.id,
    })

    expect(result.name).toBe('Canh chua')
    const rows = await db.select().from(groupDishes).where(eq(groupDishes.groupId, group2.id))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.state).toBe('ACTIVE')
  })

  it('addExistingGlobalDishToGroup — có row INACTIVE: chuyển ACTIVE, không tạo row mới', async () => {
    const db = getDb()
    const user = makeUser()
    const group = makeGroup()
    await db.insert(users).values(user)
    await db.insert(groups).values(group)
    const dish = await drizzleDishRepository.createGlobalDishAndAddToPool({
      groupId: group.id,
      name: 'Canh chua',
      normalizedName: normalizeDishName('Canh chua'),
      creatorUserId: user.id,
    })
    await drizzleDishRepository.reactivateGroupDish(dish.id) // no-op nhưng đảm bảo tồn tại
    const [globalDish] = await db.select().from(globalDishes)
    await db.update(groupDishes).set({ state: 'INACTIVE' }).where(eq(groupDishes.id, dish.id))

    await drizzleDishRepository.addExistingGlobalDishToGroup({
      groupId: group.id,
      globalDishId: globalDish!.id,
    })

    const rows = await db.select().from(groupDishes).where(eq(groupDishes.groupId, group.id))
    expect(rows).toHaveLength(1) // KHÔNG tạo row thứ hai
    expect(rows[0]?.state).toBe('ACTIVE')
  })
})
```

---

# 9. Sửa `src/app/groups/[groupId]/dishes/actions.ts` (từ S3) — bắt buộc để còn biên dịch

Hợp đồng trả về của `addDishToGroup` đổi từ `GroupDishSummary` trực tiếp sang union `AddDishOutcome`. File S3 đọc `result.value.name` trực tiếp — vỡ compile nếu không sửa. Sửa tối thiểu, không dựng UI đẹp (đó là S4):

```ts
'use server'

import { refresh, revalidatePath } from 'next/cache'

import { addDishToGroup } from '@/features/dish/application/add-dish-to-group'
import { drizzleDishRepository } from '@/features/dish/infrastructure/drizzle-dish-repository'
import type { AddDishFormState } from '@/features/dish/presentation/components/dish-catalog-screen'
import type { Failure } from '@/shared/errors'

import { requireGroupContext } from '../group-access'

function toVietnameseMessage(error: Failure): string {
  if (error.code === 'ERR_DISH_ALREADY_IN_POOL') {
    return 'Món này đã có trong danh mục rồi.'
  }
  if (error.code === 'ERR_VALIDATION' && error.details?.['field'] === 'name') {
    return 'Nhập tên món trước đã.'
  }
  return 'Không thêm được món. Thử lại giúp mình.'
}

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
      forceCreate: formData.get('forceCreate') === 'true',
    },
  )

  if (!result.ok) {
    return { nameError: toVietnameseMessage(result.error), addedDishName: null }
  }

  // TODO(E2-T7): kind === 'candidates' hiện chỉ báo lỗi chung, chưa có UI
  // "Dùng món này" / "vẫn tạo mới" thật — S4 sẽ thay bằng duplicate-sheet.tsx
  // thật (S-06), gọi addExistingDishToGroupAction cho nhánh "Dùng món này".
  if (result.value.kind === 'candidates') {
    return {
      nameError: 'Nhà bạn đã có món gần giống, xem lại danh mục trước khi thêm.',
      addedDishName: null,
    }
  }

  revalidatePath(`/groups/${groupId}`)
  refresh()

  return { nameError: null, addedDishName: result.value.dish.name }
}
```

Thêm field ẩn `forceCreate` vào form của `add-dish-sheet.tsx` (S3) nếu muốn cho phép "vẫn tạo mới" hoạt động tối thiểu ngay ở slice này — không bắt buộc cho compile, nhưng nếu bỏ qua thì TC-019's path không có cách nào kích hoạt từ UI cho tới khi S4 xong. Quyết định để tuỳ bạn khi code: thêm ngay một checkbox ẩn tối giản, hoặc để trống và chấp nhận TC-019 chỉ kiểm được qua test tầng A cho tới S4.

---

# 10. Thứ tự TDD đề xuất

1. `normalize-name.test.ts` (lật test cũ + TC-098) → `normalize-name.ts`
2. `scripts/backfill-normalized-name.ts` — chạy thử trên branch `test`
3. `dish-repository.ts` (port, mở rộng type — không có test riêng)
4. `add-dish-to-group.test.ts` (mở rộng) → `add-dish-to-group.ts`
5. `add-existing-dish-to-group.test.ts` → `add-existing-dish-to-group.ts`
6. `drizzle-dish-repository.ts` (mở rộng) + integration test
7. Sửa `dishes/actions.ts` để biên dịch lại
8. `yarn verify && yarn arch:probe && yarn test:integration`

---

# 11. Rủi ro

| Rủi ro | Hậu quả | Giảm thiểu |
| --- | --- | --- |
| `addExistingGlobalDishToGroup` không validate `globalDishId` tồn tại trước khi insert | `globalDishId` giả/cũ → lỗi FK constraint (`DatabaseError`, không phải `Failure` có kiểm soát) | Chấp nhận cho slice này — đường vào duy nhất của giá trị này là danh sách `candidates` do chính hệ thống trả ra, không phải input người dùng gõ tay; validate thêm là phòng thủ cho kịch bản không thể xảy ra qua UI thật |
| `dishes/actions.ts` sau khi sửa chưa có UI thật cho `forceCreate` | TC-019 khó kiểm chứng qua UI thật cho tới S4 | Đã ghi rõ ở §9; test tầng A đã phủ đầy đủ hành vi, không chặn merge |
| Backfill chạy nhầm lên `dev`/`main` trước khi test kỹ trên `test` | Sửa dữ liệu thật ngoài ý muốn (dù chỉ là UPDATE một cột, không phá huỷ) | Nhắc rõ ở §4.2 — chạy `test` trước |
| `findGlobalCandidatesByNormalizedName` giới hạn 3, thứ tự theo `createdAt` | Nếu về sau cần thứ tự khác (ví dụ phổ biến nhất), phải sửa query | Chấp nhận — SPEC-005 không quy định thứ tự, giới hạn 3 lấy từ design S-06, không phải quyết định tuỳ tiện |

---

# 12. Test Cases coverage

| TC | Mô tả | Nơi test |
| --- | --- | --- |
| TC-017 | Chưa có Dish — tạo mới, `normalized_name` đúng | `add-dish-to-group.test.ts` |
| TC-018 | Đã có Global Dish, không forceCreate — trả candidates, không tạo | `add-dish-to-group.test.ts` |
| TC-019 | forceCreate=true — tạo Global Dish thứ hai | `add-dish-to-group.test.ts` |
| TC-020 | Dish INACTIVE trong Group — khôi phục ACTIVE | `add-dish-to-group.test.ts` + `drizzle-dish-repository.integration.test.ts` |
| TC-021 | `systemTags` không hợp lệ | **Dời sang S3/E2-T5** — xem §1 |
| TC-097 | Tên 120 ký tự | `add-dish-to-group.test.ts` (hồi quy) |
| TC-098 | Bỏ dấu, `Ca kho`/`Cá kho` cùng `normalized_name` | `normalize-name.test.ts` |
| TC-099 | Dish đã ACTIVE — `ERR_DISH_ALREADY_IN_POOL` | `add-dish-to-group.test.ts` |

---

# 13. Config changes

| File | Thay đổi |
| --- | --- |
| `src/features/dish/domain/normalize-name.ts` | Thêm bước bỏ dấu vào `normalizeDishName` |
| `src/features/dish/application/dish-repository.ts` | + `GroupDishLookup`, `GlobalDishCandidate`, 3 method mới, sửa 1 kiểu trả về |
| `src/features/dish/application/add-dish-to-group.ts` | Output đổi thành `AddDishOutcome` union, thêm nhánh reactivate/candidates/forceCreate |
| `src/features/dish/application/add-existing-dish-to-group.ts` | Mới |
| `src/features/dish/infrastructure/drizzle-dish-repository.ts` | + 3 method, sửa `findInGroupByNormalizedName` |
| `src/app/groups/[groupId]/dishes/actions.ts` | Khớp lại hợp đồng union mới |
| `scripts/backfill-normalized-name.ts` | Mới |
| `package.json` | + script `backfill:normalized-name` |

---

# 14. Verify

## 14.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn build
yarn test:integration
```

`yarn test` phải in `normalizeDishName` (có TC-098), `addDishToGroup` (TC-017, TC-018, TC-019, TC-020, TC-099, TC-097), `addExistingDishToGroup`. `yarn test:integration` in hai ca upsert của `addExistingGlobalDishToGroup`.

**Một test cũ PHẢI đổi màu, không phải PHẢI xanh.** Guide E1-S3 để lại một test đánh dấu sẵn `E1 CỐ Ý chưa bỏ dấu — E2-T3 đổi kỳ vọng này thành toBe`. Nếu nó vẫn xanh mà bạn chưa sửa dòng nào trong nó, tức là `normalizeDishName` **chưa** thật sự bỏ dấu — xem lại §4.

## 14.2 Backfill — chạy trên branch `test` trước, không phải `dev`

Script này **ghi dữ liệu**, không chỉ đọc. Trình tự an toàn:

```bash
# .env.local trỏ DATABASE_URL sang Neon branch `test`
yarn backfill:normalized-name
```

Đọc kỹ output: mỗi dòng `✏️` là một bản ghi bị đổi, dạng `"Cá kho": "cá kho" → "ca kho"`. Ba thứ phải đúng:

1. **Số dòng đổi khớp kỳ vọng** — chỉ những món có dấu mới đổi. Món viết không dấu sẵn (`Kho quet`) phải **không** xuất hiện trong output.
2. **Chạy lần hai in `Đã cập nhật 0/N dòng`** — script phải idempotent. Nếu lần hai vẫn đổi tiếp, phép so sánh trước khi ghi bị sai.
3. `yarn db:studio` → `global_dishes.normalized_name` không còn dấu nào, còn `name` thì **vẫn nguyên dấu** (cột hiển thị không được đụng tới).

Chỉ khi cả ba đúng mới chạy trên branch `dev`.

## 14.3 TC-098 — bằng chứng "Ca kho" và "Cá kho" là một

Sau backfill, trên `yarn dev`:

1. Thêm món `Cá kho`. → thành công.
2. Thêm món `Ca kho` (không dấu). → **không** tạo món mới. Ở slice này chưa có UI đẹp cho ứng viên trùng (đó là S4), nên biểu hiện đúng là thông báo lỗi/chung chung mà §9 đã dặn — điều quan trọng là `db:studio` cho thấy `global_dishes` vẫn chỉ có **một** dòng.

## 14.4 TC-020 — khôi phục Dish `INACTIVE`

F27 (gỡ món khỏi pool) chưa được lên lịch ở epic nào, nên **không có đường nào trong giao diện tạo ra `INACTIVE`**. Dựng bằng tay để kiểm nhánh này:

1. Thêm món `Canh chua`, xác nhận `group_dishes` có một dòng `state = 'ACTIVE'`.
2. Trong `yarn db:studio`, sửa dòng đó thành `state = 'INACTIVE'`.
3. Thêm lại đúng `Canh chua` qua giao diện.
4. → Dòng cũ quay về `'ACTIVE'`; `group_dishes` vẫn **một** dòng; `global_dishes` vẫn **một** dòng. Nếu số dòng tăng, nhánh reactivate ở §6 chưa chạy.

---

# 15. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v3.9.md`

```markdown
# DEC-023 — Reusing a Duplicate Candidate Is a Separate Use Case, Outside SPEC-005

**Date:** 2026-08-18
**Status:** Accepted

## Decision

"Reuse an existing dish from the duplicate-candidate list" (the "Dùng món này"
button on S-06) is implemented as its own use case, `addExistingDishToGroup`,
taking `{groupId, globalDishId}` directly — not as an extension of SPEC-005's
`addDishToGroup` (`{groupId, name, forceCreate}`).

## Rationale

BR-001 and PRD US-002 both narratively describe a "pick an existing dish"
capability, and the S-06 design shows a "Dùng món này" button for it. But
SPEC-005's formal input contract, and TC-017 through TC-021, never define
this action's request shape — TC-018 only asserts candidates are returned
uncreated; TC-019 only covers `forceCreate`. There is no third documented
test case for reuse. Rather than stretch SPEC-005's contract to cover an
action it was never specified to handle, reuse is treated as what it actually
is: adding a known, already-existing Global Dish to a group's pool — simpler
than "create or find by name," and safe to upsert unconditionally because a
returned candidate is provably never already-ACTIVE in the requesting group
(see comment in `add-dish-to-group.ts`).

## Consequence

E2-T6/E2-T7 (S4) wire the S-06 "Dùng món này" button to `addExistingDishToGroup`,
not to `addDishToGroup` with some new parameter.

## Affected Documents

- SDD SPEC-005 (documents the gap, does not change the spec itself)
- Master Plan §4 (E2-T4 scope note)
```

```markdown
# DEC-024 — TC-021 (System Tag Validation) Deferred to E2-T5

**Date:** 2026-08-18
**Status:** Accepted

## Decision

TC-021 (`systemTags` containing an invalid value → `ERR_INVALID_SYSTEM_TAG`)
is implemented in E2-T5, not E2-T4, despite being listed in E2-T4's TC range
(TC-017→021) in the Master Plan.

## Rationale

The `SystemTag` type and its storage (`group_dish_tags`) do not exist until
E2-T5 (SPEC-006). Accepting a `systemTags` input on `addDishToGroup` (E2-T4)
that is validated but has nowhere to be persisted would be half-built. E2-T5
is where this type and its storage are introduced together with the
validation that gives it meaning.

## Affected Documents

- Master Plan §4 (TC range note for E2-T4/E2-T5)
- Test Cases Specification (coverage table — TC-021 mapped to E2-T5's guide)
```

---

# 16. Master Plan

Sau khi code xong và `yarn verify`/`yarn arch:probe`/`yarn test:integration` xanh, tick E2-T3 và E2-T4 trong `docs/what-we-gonna-eat-today_master-plan_v2.1.md` §4.

---

# 17. Lịch sử thay đổi (Change History)

| Version | Ngày | Phần tác động | Nội dung thay đổi | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- | :--- |
| `0.1` | 2026-08-18 | Toàn bộ | Khởi tạo Implementation Guide cho E2-S2 (E2-T3, E2-T4) | Kế hoạch Epic E2 |
