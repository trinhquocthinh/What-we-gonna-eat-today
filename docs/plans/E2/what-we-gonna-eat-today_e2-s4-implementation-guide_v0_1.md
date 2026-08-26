# 📒 Implementation Guide — E2 Slice S4: Màn danh mục & UI phát hiện trùng

> **Document Metadata**
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-18`
> - **Upstream:** [Master Plan](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E2-T6`, `E2-T7`) • Mockup `docs/designs/designs/S-05 S-06 Danh muc mon.dc.html` • [Design Criteria](../../what-we-gonna-eat-today_design-criteria_v1.0.md) (`S-05`, `S-06`) • [Business Rules](../../what-we-gonna-eat-today_business-rules_v1.7.md) (`BR-001`)
> - **Tiền đề bắt buộc:** **S2 (E2-T3/T4) và S3 (E2-T5) phải code xong trước.**
>
> 📒 *Slice cuối của E2. Gần như thuần UI: ô tìm kiếm, nhóm theo nhãn, sửa tag, và khối phát hiện trùng trên sheet thêm món.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
|---|---|---|---|---|
| `E2-T6` | Màn hình danh mục món | 2 | `src/features/dish/presentation/**` | Thêm, sửa tag, tìm kiếm được trên điện thoại |
| `E2-T7` | Trạng thái phát hiện trùng trên UI | 2 | `src/features/dish/presentation/duplicate-sheet.tsx` | Nút "Dùng món này" **nổi bật hơn** "vẫn tạo mới" |

- [ ] Ô tìm `Tìm món trong nhà` lọc tức thì, bỏ dấu được (nhờ E2-T3)
- [ ] Danh sách nhóm theo nhãn, đúng thứ tự `Cơm → Món mặn → Món phụ → Canh → Tráng miệng`
- [ ] Thẻ "không khớp" hiện đúng copy khi tìm không ra
- [ ] Bấm một hàng món mở được sheet sửa nhãn (đa chọn), lưu được
- [ ] Gõ tên gần giống món đã có → khối "Nhà bạn đã có món gần giống" hiện, nút lưu bị hạ tông
- [ ] `yarn verify && yarn arch:probe` xanh

---

# 1. Thứ tự code bắt buộc: S2 → S3 → S4

Slice này gọi vào cả hai slice trước. Code S4 trước sẽ **không biên dịch được**:

| Cần từ | Thứ gì |
|---|---|
| **S2** (E2-T3/T4) | `AddDishOutcome` union (`kind: 'added' \| 'candidates'`), input `forceCreate`, use case `addExistingDishToGroup`, và bỏ dấu trong `normalizeDishName` (để tìm kiếm không dấu chạy đúng) |
| **S3** (E2-T5) | `SystemTag`, `SYSTEM_TAGS`, `SYSTEM_TAG_LABELS`, `GroupDishListItem` (món kèm nhãn), use case `setSystemTags`, `requireGroupAdminContext` |

S4 cũng là nơi **trả nợ** hai thứ hai slice trước cố ý hoãn lại:
- S2 §9 để `dishes/actions.ts` xử lý nhánh `kind: 'candidates'` bằng một câu lỗi chung chung tạm bợ → slice này thay bằng UI thật.
- S3 §12.3 hoãn `setSystemTagsAction` sang đây (viết sớm thì `knip` báo export chết) → slice này viết.

---

# 2. Ba quyết định đã chốt trước khi code

## 2.1 F27 (gỡ món khỏi pool): KHÔNG làm ở slice này

Mockup S-05 có một mục cuối danh sách:

```js
const hiddenItems = shown.filter(d => d.hidden);
if (hiddenItems.length) groups.push({
  label: "Đã gỡ khỏi nhóm", count: hiddenItems.length,
  items: hiddenItems.map(d => ({ name: d.name, meta: "Không gợi ý", fg: "#6B6259" }))
});
```

PRD cũng gán `F27 | Gỡ Dish khỏi Pool | Should | BR-005` cho chính epic này, và có hẳn US-004. **Nhưng Master Plan không có subtask nào cho F27** — E2 chỉ có T1→T7. Đã chốt: **bỏ mục "Đã gỡ khỏi nhóm" khỏi S-05**, ghi nhận là nợ.

Ba hệ quả phải nói thẳng, không giấu:
1. Không có đường nào tạo ra `GroupDish` trạng thái `INACTIVE`, nên **nhánh khôi phục của S2 (TC-020) là code chết trong thực tế** — nó đúng và có test, nhưng người dùng thật không chạm tới được.
2. `TC-065`, `TC-069`, `TC-108` đều mở đầu bằng "món vừa bị gỡ khỏi nhóm" — chưa có đường dựng dữ liệu cho ba ca này.
3. Comment sẵn có trong `dish-catalog-screen.tsx` ghi `nhóm "Đã gỡ khỏi nhóm" (F27/v1.1)` — **giữ nguyên comment đó**, đừng xoá.

## 2.2 Nguồn ứng viên trùng: hai nguồn, hai hành động khác nhau

Đây là quyết định thiết kế lớn nhất của slice, và cũng là chỗ dễ làm sai nhất.

**Mockup khớp gì** (`S-05 S-06 Danh muc mon.dc.html:188-193`, verbatim):

```js
const nd = this.norm(s.draft);
const dupeList = !s.forced && nd.length > 2 ? list.filter(d => {
  const n = this.norm(d.name);
  return n === nd || n.indexOf(nd) >= 0 || nd.indexOf(n) >= 0;
}).slice(0, 3) : [];
const exact = list.some(d => this.norm(d.name) === nd);
```

Substring **hai chiều**, cổng `độ dài > 2`, tối đa 3 — và `list` ở đây là **danh sách món của chính nhóm**.

**S2 làm gì**: `findGlobalCandidatesByNormalizedName` khớp **chính xác**, phạm vi **toàn cục** (các Global Dish trùng tên do nhóm khác tạo).

Hai thứ phục vụ hai mục đích khác nhau, và nếu chỉ giữ cái sau thì với một gia đình dùng một nhóm, panel **gần như không bao giờ hiện** — 2 giờ dựng UI ngủ đông. Đã chốt: **giữ cả hai**.

| Loại | Nguồn | `id` là gì | "Dùng món này" làm gì |
|---|---|---|---|
| `inGroup` | Lọc substring **ở client**, trên `dishes` mà `DishCatalogScreen` đã có sẵn trong bộ nhớ | `group_dishes.id` | **Không ghi gì cả** — món đã ở trong nhóm rồi. Đóng sheet + toast `Dùng lại {name} — đã có trong danh mục.` (đúng mockup dòng 219) |
| `global` | `candidates` server trả về sau khi bấm lưu | `global_dishes.id` | Gọi `addExistingDishToGroup` — thêm thật vào pool |

Không tốn round-trip nào và không thêm một dòng SQL nào: màn danh mục đã nhận sẵn toàn bộ `dishes`.

**Khác biệt thời điểm** — phải hiểu để không tưởng là bug: near-match `inGroup` hiện **ngay khi đang gõ**; `global` chỉ hiện **sau khi bấm lưu một lần**.

## 2.3 Đính chính một sai sót của tôi ở guide S2

Ở S2 tôi có nói *"PRD dùng D-10 để loại fuzzy matching khỏi phạm vi"*. Kiểm lại toàn repo: **`D-10` không tồn tại** (mã quyết định trong dự án là `DEC-0xx`), và mục Out of Scope của PRD **không có dòng nào** về fuzzy matching — dòng gần nhất là *"Tự động gộp món trùng mức Global (Logical Merge / Hard Merge)"*, tức là nói về **gộp**, không phải **tìm gần giống**.

Ngược lại, BR-001 viết: *"Hệ thống tự động tìm kiếm các món có khả năng trùng **hoặc tương tự** qua thuật toán chuẩn hoá tên."* — nghiêng về phía mockup. Nên khớp substring ở §2.2 **không** đi ngược tài liệu nào; nó đúng với BR-001.

---

# 3. File tree

```
src/features/dish/
  domain/
    near-match.ts                     + MỚI
    near-match.test.ts                + MỚI
    dish-group.ts                     + MỚI (nhóm theo nhãn)
    dish-group.test.ts                + MỚI
    normalize-name.ts                 (không đụng — dùng lại)
    system-tag.ts                     (không đụng — từ S3)
  presentation/components/
    duplicate-sheet.tsx               + MỚI (tên đúng Master Plan)
    duplicate-sheet.test.tsx          + MỚI
    edit-dish-sheet.tsx               + MỚI
    edit-dish-sheet.test.tsx          + MỚI
    dish-search-field.tsx             + MỚI
    add-dish-sheet.tsx / .test.tsx    SỬA
    dish-catalog-screen.tsx / .test.tsx  SỬA (nhiều nhất)
    dish-row.tsx                      SỬA (<div> → <button>)
    system-tag-field.tsx              (từ S3 — dùng lại cho sheet thêm món)
    system-tag-label.ts               (từ S3 — dùng lại)

src/app/groups/[groupId]/dishes/
  actions.ts                          SỬA (+ 2 nhánh, + setSystemTagsAction)
  page.tsx                            SỬA (truyền action mới xuống)
```

---

# 4. `domain/near-match.ts` — MỚI

```ts
import { normalizeDishName } from './normalize-name'

/** Cổng độ dài của mockup (`nd.length > 2`): gõ "cá" chưa đủ để bới cả danh
 *  mục lên. Đếm trên chuỗi ĐÃ chuẩn hoá, đúng như mockup. */
const MIN_QUERY_LENGTH = 3

/** Mockup `.slice(0, 3)`. Thiết kế chỉ chừa chỗ cho ba thẻ. */
const MAX_CANDIDATES = 3

export type NearMatchInput = {
  readonly id: string
  readonly name: string
}

/**
 * Tìm món "gần giống" trong danh sách của CHÍNH NHÓM, đúng vị từ của mockup
 * (`S-05 S-06 Danh muc mon.dc.html:188-193`): bằng nhau, hoặc chuỗi này chứa
 * chuỗi kia — theo CẢ HAI chiều.
 *
 * BR-001 gọi đây là "các món có khả năng trùng HOẶC TƯƠNG TỰ". Nó KHÁC với
 * `findGlobalCandidatesByNormalizedName` của S2 (khớp chính xác, phạm vi toàn
 * cục) — hai thứ phục vụ hai mục đích, xem §2.2 của guide này.
 *
 * BẮT BUỘC đi qua `normalizeDishName`, không tự viết `toLowerCase().includes()`:
 * `normalize-name.ts` ghi rõ bất biến "đừng tạo hàm chuẩn hoá thứ hai". Nhờ đó
 * sau E2-T3 thì tìm gần giống tự khắc bỏ dấu — gõ `ca kho` ra `Cá kho`, miễn
 * phí, không thêm một dòng nào.
 */
export function findNearMatches<T extends NearMatchInput>(
  dishes: readonly T[],
  draft: string,
): T[] {
  const needle = normalizeDishName(draft)

  if (needle.length < MIN_QUERY_LENGTH) {
    return []
  }

  return dishes
    .filter((dish) => {
      const name = normalizeDishName(dish.name)
      return name === needle || name.includes(needle) || needle.includes(name)
    })
    .slice(0, MAX_CANDIDATES)
}
```

## 4.1 Test — `near-match.test.ts`

```ts
import { describe, expect, it } from 'vitest'

import { findNearMatches } from './near-match'

const DISHES = [
  { id: '1', name: 'Canh chua cá lóc' },
  { id: '2', name: 'Cá basa kho tiêu' },
  { id: '3', name: 'Gà chiên nước mắm' },
]

describe('findNearMatches', () => {
  it('chuỗi gõ vào NẰM TRONG tên món', () => {
    expect(findNearMatches(DISHES, 'canh chua').map((d) => d.id)).toEqual(['1'])
  })

  it('tên món NẰM TRONG chuỗi gõ vào — chiều ngược lại', () => {
    const dishes = [{ id: '1', name: 'Canh chua' }]
    expect(findNearMatches(dishes, 'canh chua cá lóc nấu me').map((d) => d.id)).toEqual(['1'])
  })

  it('khớp chính xác cũng được tính', () => {
    expect(findNearMatches(DISHES, 'Gà chiên nước mắm').map((d) => d.id)).toEqual(['3'])
  })

  it('dưới 3 ký tự thì không trả gì — tránh bới cả danh mục', () => {
    expect(findNearMatches(DISHES, 'cá')).toEqual([])
  })

  it('không khớp thì rỗng', () => {
    expect(findNearMatches(DISHES, 'bún bò Huế')).toEqual([])
  })

  it('tối đa 3 ứng viên', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ id: String(i), name: `Canh chua ${i}` }))
    expect(findNearMatches(many, 'canh chua')).toHaveLength(3)
  })

  // Chỉ pass SAU KHI E2-T3 (S2) đã bỏ dấu trong normalizeDishName.
  it('bỏ dấu: gõ không dấu vẫn ra món có dấu', () => {
    expect(findNearMatches(DISHES, 'canh chua ca loc').map((d) => d.id)).toEqual(['1'])
  })
})
```

---

# 5. `domain/dish-group.ts` — MỚI

```ts
import type { SystemTag } from './system-tag'
import { SYSTEM_TAGS } from './system-tag'

export type TaggedDish = {
  readonly id: string
  readonly name: string
  readonly systemTags: readonly SystemTag[]
}

/** `tag: null` là nhóm cuối — món chưa gắn nhãn nào. */
export type DishGroup<T extends TaggedDish> = {
  readonly tag: SystemTag | null
  readonly dishes: readonly T[]
}

/**
 * Nhóm món theo nhãn hệ thống, đúng thứ tự `SYSTEM_TAGS` (Cơm → Món mặn →
 * Món phụ → Canh → Tráng miệng). Nhóm rỗng bị loại, đúng mockup
 * (`.filter(g => g.items.length)`).
 *
 * MỘT MÓN NHIỀU NHÃN THÌ XUẤT HIỆN Ở NHIỀU NHÓM. Đây là chủ ý, khớp nguyên tắc
 * "Independent Tag Counting" của SDD §8: món mang cả `MAIN` lẫn `SOUP` đóng góp
 * độc lập cho cả hai quy định, nên nó cũng phải NHÌN THẤY được ở cả hai chỗ.
 * Hệ quả: tổng số đếm của các nhóm có thể LỚN HƠN số ở header. Không phải lỗi.
 */
export function groupDishesByTag<T extends TaggedDish>(dishes: readonly T[]): DishGroup<T>[] {
  const groups: DishGroup<T>[] = []

  for (const tag of SYSTEM_TAGS) {
    const inTag = dishes.filter((dish) => dish.systemTags.includes(tag))
    if (inTag.length > 0) {
      groups.push({ tag, dishes: inTag })
    }
  }

  const untagged = dishes.filter((dish) => dish.systemTags.length === 0)
  if (untagged.length > 0) {
    groups.push({ tag: null, dishes: untagged })
  }

  return groups
}
```

**Món không nhãn — chỗ này KHÔNG có nguồn thiết kế.** 12 món mẫu trong mockup đều có nhãn, nên mockup không trả lời ca này. Nhưng model cho phép 0 nhãn (`TC-023`), và mọi món tạo từ E1 đều chưa có nhãn. Nhãn tiếng Việt cho nhóm này (`Chưa phân nhãn`, xem §7.3) là **chữ tôi tự đặt** — nếu bạn thấy chữ khác hợp hơn thì đổi, không có tài liệu nào bị vi phạm.

## 5.1 Test — `dish-group.test.ts`

```ts
import { describe, expect, it } from 'vitest'

import { groupDishesByTag } from './dish-group'

describe('groupDishesByTag', () => {
  it('nhóm theo đúng thứ tự mâm cơm, không theo thứ tự dữ liệu', () => {
    const dishes = [
      { id: '1', name: 'Chè', systemTags: ['DESSERT'] as const },
      { id: '2', name: 'Cơm trắng', systemTags: ['STAPLE'] as const },
      { id: '3', name: 'Canh chua', systemTags: ['SOUP'] as const },
    ]

    expect(groupDishesByTag(dishes).map((g) => g.tag)).toEqual(['STAPLE', 'SOUP', 'DESSERT'])
  })

  it('nhóm rỗng bị loại', () => {
    const dishes = [{ id: '1', name: 'Canh chua', systemTags: ['SOUP'] as const }]
    expect(groupDishesByTag(dishes)).toHaveLength(1)
  })

  it('món nhiều nhãn xuất hiện ở nhiều nhóm (SDD §8)', () => {
    const dishes = [{ id: '1', name: 'Bò kho bánh mì', systemTags: ['MAIN', 'SOUP'] as const }]
    const groups = groupDishesByTag(dishes)

    expect(groups.map((g) => g.tag)).toEqual(['MAIN', 'SOUP'])
    expect(groups[0]?.dishes[0]?.id).toBe('1')
    expect(groups[1]?.dishes[0]?.id).toBe('1')
  })

  it('món chưa có nhãn dồn về nhóm cuối', () => {
    const dishes = [
      { id: '1', name: 'Canh chua', systemTags: ['SOUP'] as const },
      { id: '2', name: 'Món lạ', systemTags: [] as const },
    ]
    const groups = groupDishesByTag(dishes)

    expect(groups.at(-1)?.tag).toBeNull()
    expect(groups.at(-1)?.dishes[0]?.id).toBe('2')
  })
})
```

---

# 6. `duplicate-sheet.tsx` — MỚI (E2-T7)

Master Plan đặt tên file này. Nó là **khối bên trong** `AddDishSheet`, không phải một sheet riêng — mockup vẽ nó nằm giữa ô tên và hàng chip nhãn. Giữ tên file đúng Master Plan, đừng đổi.

```tsx
'use client'

import type { ReactElement } from 'react'

import { Button } from '@/shared/ui/button'

/**
 * Hai loại ứng viên, hai hành động khác hẳn nhau — xem §2.2 guide S4.
 *
 * - `inGroup`: món ĐÃ ở trong danh mục nhóm (lọc gần giống ở client).
 *   "Dùng món này" KHÔNG ghi gì — chỉ đóng sheet và báo. `id` là `group_dishes.id`.
 * - `global`: Global Dish trùng tên do nhóm khác tạo (server trả về sau khi bấm
 *   lưu). "Dùng món này" gọi `addExistingDishToGroup`. `id` là `global_dishes.id`.
 */
export type DuplicateCandidate = {
  readonly kind: 'inGroup' | 'global'
  readonly id: string
  readonly name: string
  /** Nhãn hệ thống, ví dụ "Món mặn". Rỗng với ứng viên `global` (server chưa
   *  trả nhãn — món chưa thuộc nhóm nào của mình nên chưa có nhãn để trả). */
  readonly meta: string
}

export type DuplicateSheetProps = {
  candidates: readonly DuplicateCandidate[]
  /** Ứng viên `inGroup` — thuần client, không round-trip. */
  onUseInGroup: (name: string) => void
  /** "Đây là món khác, vẫn tạo mới" — mở khoá nút lưu. */
  onForceCreate: () => void
}

/**
 * S-06, trạng thái phát hiện trùng.
 *
 * DoD của E2-T7: nút "Dùng món này" phải NỔI BẬT HƠN "vẫn tạo mới". Ở đây điều
 * đó được thực hiện bằng ba thứ cùng lúc, đúng mockup:
 *   1. "Dùng món này" là `variant="primary"` (nền `--accent`);
 *   2. "vẫn tạo mới" là chữ gạch chân `--ink-muted`, cỡ nhỏ hơn, không nền;
 *   3. nút "Thêm vào danh mục" của form bị hạ xuống `muted` — làm ở
 *      `add-dish-sheet.tsx`, không phải ở đây.
 * Đừng "cân bằng lại" cho đẹp: sự lệch tông này là chủ ý thiết kế.
 */
export function DuplicateSheet({
  candidates,
  onUseInGroup,
  onForceCreate,
}: DuplicateSheetProps): ReactElement {
  return (
    <div className="flex flex-col gap-3 rounded-control bg-surface-sunken p-4">
      <h3 className="text-subtitle font-semibold text-ink">Nhà bạn đã có món gần giống</h3>

      <ul className="flex flex-col gap-2">
        {candidates.map((candidate) => (
          <li
            key={`${candidate.kind}-${candidate.id}`}
            className="flex items-center justify-between gap-3 rounded-control bg-surface-raised p-3"
          >
            <span className="flex flex-col">
              <span className="text-subtitle font-semibold text-ink">{candidate.name}</span>
              {candidate.meta === '' ? null : (
                <span className="text-caption font-medium text-ink-muted">{candidate.meta}</span>
              )}
            </span>

            {candidate.kind === 'global' ? (
              // Submit mang theo tên+giá trị của chính nút: `addDishAction` thấy
              // `reuseGlobalDishId` thì rẽ sang nhánh dùng lại. HTML thuần, không
              // cần state trung gian nào.
              <Button
                type="submit"
                name="reuseGlobalDishId"
                value={candidate.id}
                variant="primary"
                size="sm"
                className="flex-none"
              >
                Dùng món này
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="flex-none"
                onClick={() => onUseInGroup(candidate.name)}
              >
                Dùng món này
              </Button>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onForceCreate}
        className="min-h-11 self-start bg-transparent text-body font-medium text-ink-muted underline"
      >
        Đây là món khác, vẫn tạo mới
      </button>
    </div>
  )
}
```

`Button` với `size="sm"` cho `min-h-11` (44px) — đúng vùng chạm tối thiểu của mockup. Link "vẫn tạo mới" viết tay `<button>` chứ không dùng `Button variant="quiet"`: nó cần gạch chân và **không** cần `rounded-control`/`font-semibold` mà `Button` luôn áp.

---

# 7. `dish-catalog-screen.tsx` — SỬA (phần lớn của E2-T6)

## 7.1 Ô tìm — `dish-search-field.tsx`

`TextField` hardcode `type="text"` nên không dùng lại được. Tiền lệ đúng là `time-zone-picker-sheet.tsx` — chép nguyên class của nó:

```tsx
'use client'

import type { ReactElement } from 'react'

export type DishSearchFieldProps = {
  value: string
  onChange: (value: string) => void
}

/**
 * 48px = `min-h-12`, đúng con số mockup. Class chép từ ô tìm của
 * `time-zone-picker-sheet.tsx` — cùng vai trò, cùng hình dạng.
 *
 * KHÔNG debounce. Không có tiền lệ debounce nào trong repo (ô tìm múi giờ lọc
 * 418 mục mỗi phím bấm, danh mục món chỉ ~20), và thêm nó vào sẽ phá idiom test
 * `await userEvent.type(...)` rồi assert ngay mà cả repo đang dùng.
 */
export function DishSearchField({ value, onChange }: DishSearchFieldProps): ReactElement {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Tìm món trong nhà"
      aria-label="Tìm món trong nhà"
      className="min-h-12 w-full rounded-chip border border-border bg-surface-raised px-4 py-3 text-body-lg text-ink placeholder:text-ink-faint"
    />
  )
}
```

`type="search"` + `aria-label` ⇒ test truy vấn bằng `getByRole('searchbox', { name: 'Tìm món trong nhà' })`, đúng như `time-zone-picker-sheet.test.tsx` đang làm.

## 7.2 Lọc — dùng lại `findNearMatches`? KHÔNG

Ô tìm ở S-05 lọc theo **một chiều** (`tên CHỨA truy vấn`), khác vị từ hai chiều của khối phát hiện trùng. Mockup dòng 178: `list.filter(d => this.norm(d.name).indexOf(q) >= 0)`. Viết riêng, vẫn đi qua `normalizeDishName`:

```ts
const visible = useMemo(() => {
  const needle = normalizeDishName(query)
  return needle === '' ? dishes : dishes.filter((d) => normalizeDishName(d.name).includes(needle))
}, [dishes, query])
```

Đặt thẳng trong component (một biểu thức, không đáng tách file domain riêng). `needle === ''` trả nguyên mảng gốc để giữ referential identity — đúng như ô tìm múi giờ.

## 7.3 Cấu trúc màn hình

Thứ tự từ trên xuống, đúng mockup:

```tsx
<header>
  <span>{groupName}</span>
  <h1>Danh mục món</h1>
  <span className="tabular-nums">{hasDishes ? `${dishes.length} món` : ''}</span>
  {hasDishes ? <DishSearchField value={query} onChange={setQuery} /> : null}
</header>
```

Ô tìm **ẩn hoàn toàn khi chưa có món nào** (mockup bọc nó trong `sc-if hasDishes`) — số đếm cũng là chuỗi rỗng lúc đó. Cả hai đã đúng trong code hiện tại, chỉ thêm ô tìm.

Vùng cuộn, ba trạng thái loại trừ nhau:

```tsx
{!hasDishes ? (
  <EmptyStateCard title="Chưa có món nào." description="..." >…</EmptyStateCard>
) : noMatch ? (
  <div className="flex flex-col gap-2 rounded-control border border-border bg-surface-raised p-4">
    <span className="text-subtitle font-semibold text-ink">
      {`Không có món nào khớp “${query}”.`}
    </span>
    <span className="text-body font-normal text-ink-muted">
      Thêm nó vào danh mục bằng nút bên dưới.
    </span>
  </div>
) : (
  groups.map((group) => (
    <section key={group.tag ?? 'untagged'} className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-caption font-medium text-ink-muted">
          {group.tag === null ? 'Chưa phân nhãn' : SYSTEM_TAG_LABELS[group.tag]}
        </span>
        <span className="text-caption font-medium tabular-nums text-ink-muted">
          {group.dishes.length}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {group.dishes.map((dish) => (
          <DishRow
            key={dish.id}
            name={dish.name}
            meta=""
            onClick={() => setEditingDish(dish)}
          />
        ))}
      </ul>
    </section>
  ))
)}
```

Bốn điểm dễ sai:

1. **Nháy cong.** `“` và `”` (U+201C/U+201D), không phải `"`. Mockup dùng nháy cong, test sẽ so khớp chuỗi chính xác.
2. **`noMatch` đòi `hasDishes`** — mockup: `noMatch: !!(q && shown.length === 0 && list.length)`. Trạng thái rỗng-hoàn-toàn không bao giờ hiện thẻ "không khớp".
3. **`meta=""` chứ không phải nhãn.** Nhãn đã nằm ở heading nhóm rồi; mockup **không** vẽ chip nhãn trên từng hàng (bản prompt `claude-design-prompts` §4.4 có nói "danh sách món kèm chip nhãn" nhưng mockup mới là nguồn có thật, và nó đặt nhãn ở heading). Ô `meta` giờ để dành cho F27 sau này (`Không gợi ý`).
4. **`Chưa phân nhãn` là chữ tôi tự đặt** — xem §5.

## 7.4 Ô tìm prefill vào sheet, và xoá sau khi lưu

Mockup dòng 212: `openSheet` đặt `draft: s.query`. Dòng 170: `save()` đặt `query: ""`.

```tsx
// mở sheet
<Button type="button" onClick={() => setSheetOpen(true)}>{addLabel}</Button>
// AddDishSheet nhận initialName={query}

// sau khi thêm thành công (khối đã có sẵn xử lý state !== prevActionState)
if (state.addedDishName !== null || state.reusedDishName !== null) {
  setSheetOpen(false)
  setQuery('')      // ← thêm dòng này
}
```

Từ trạng thái "không khớp", bấm `Thêm món` là sheet đã có sẵn chữ vừa gõ — đúng ý thiết kế: người dùng tìm không ra thì thêm luôn, không phải gõ lại.

## 7.5 Toast

Hai loại, dùng chung khối `role="status"` đã có:

```tsx
const toast = isSheetOpen
  ? null
  : state.addedDishName !== null
    ? `Đã thêm ${state.addedDishName} vào danh mục.`
    : state.reusedDishName !== null
      ? `Dùng lại ${state.reusedDishName} — đã có trong danh mục.`
      : null
```

Dấu `—` là em-dash (U+2014), đúng mockup dòng 219.

---

# 8. `dish-row.tsx` — SỬA thành `<button>`

Comment trong chính file đã hẹn slice này: *"E2-T6 đổi `<div>` thành `<button>` và trả lại hai class đó"*.

```tsx
export type DishRowProps = {
  name: string
  meta: string
  onClick: () => void
}

export function DishRow({ name, meta, onClick }: DishRowProps): ReactElement {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-control border border-border bg-surface-raised p-4 text-left hover:border-border-strong active:bg-surface-sunken"
      >
        <span className="text-subtitle font-semibold text-ink">{name}</span>
        <span className="flex-none text-caption font-medium text-ink-muted">{meta}</span>
      </button>
    </li>
  )
}
```

`<button>` nằm **trong** `<li>`, không phải `<li>` biến thành button — đúng khuôn `time-zone-picker-sheet.tsx`. `onClick` là prop bắt buộc (không optional): giờ đã có màn sửa món để mở, nên không còn ca "nút không làm gì" mà comment cũ cảnh báo.

Cập nhật comment đầu file: xoá đoạn giải thích vì sao nó là `<div>`, thay bằng một dòng ngắn nói nó mở sheet sửa món.

---

# 9. `edit-dish-sheet.tsx` — MỚI (phần "sửa tag" của DoD E2-T6)

Đây là chỗ **DEC-025 hẹn multi-select đầy đủ 0..5**. Sheet thêm món giữ chọn-một (đúng mockup); sheet sửa món mới là nơi mô hình đầy đủ lộ ra.

Chip đa chọn ⇒ **checkbox**, không phải radio:

```tsx
'use client'

import type { ReactElement } from 'react'
import { useState } from 'react'

import { SYSTEM_TAGS, type SystemTag } from '../../domain/system-tag'
import { Button } from '@/shared/ui/button'
import { Sheet } from '@/shared/ui/sheet'

import { SYSTEM_TAG_LABELS } from './system-tag-label'

export type EditDishSheetProps = {
  dishId: string
  dishName: string
  initialTags: readonly SystemTag[]
  formAction: (formData: FormData) => void
  pending: boolean
  onClose: () => void
}

/**
 * Sửa nhãn cho một món đã có. ĐA CHỌN 0..5 — khác hẳn sheet thêm món (chọn một,
 * bắt buộc). Không phải bất nhất: xem DEC-025. Sheet thêm là lối nhập nhanh,
 * đây mới là chỗ sửa chi tiết, và Master Plan giao "sửa tag" đúng cho E2-T6.
 *
 * Checkbox chứ không radio: nhiều lựa chọn cùng lúc. Cùng `name="systemTag"`
 * nên `formData.getAll('systemTag')` trả về đúng mảng đã tick.
 */
export function EditDishSheet({
  dishId,
  dishName,
  initialTags,
  formAction,
  pending,
  onClose,
}: EditDishSheetProps): ReactElement {
  const [tags, setTags] = useState<readonly SystemTag[]>(initialTags)

  function toggle(tag: SystemTag): void {
    setTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    )
  }

  return (
    <Sheet title="Sửa nhãn món" onClose={onClose}>
      <h2 className="text-title font-semibold text-ink">{dishName}</h2>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="groupDishId" value={dishId} />

        <fieldset className="flex flex-col gap-2 border-0 p-0">
          <legend className="text-caption font-medium text-ink-muted">
            Nhãn — chọn bao nhiêu cũng được
          </legend>

          <div className="flex flex-wrap gap-2">
            {SYSTEM_TAGS.map((tag) => {
              const selected = tags.includes(tag)
              return (
                <label
                  key={tag}
                  className={`flex min-h-11 cursor-pointer items-center rounded-chip px-4 text-body font-medium ${
                    selected
                      ? 'bg-accent text-on-accent'
                      : 'border border-border bg-surface-raised text-ink'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="systemTag"
                    value={tag}
                    checked={selected}
                    onChange={() => toggle(tag)}
                    className="sr-only"
                  />
                  {SYSTEM_TAG_LABELS[tag]}
                </label>
              )
            })}
          </div>
        </fieldset>

        <Button type="submit" pending={pending}>
          {pending ? 'Đang lưu…' : 'Lưu nhãn'}
        </Button>
      </form>
    </Sheet>
  )
}
```

Bỏ tick hết → gửi mảng rỗng → `setSystemTags` xoá sạch nhãn. Đó chính là `TC-023` đi qua đường giao diện thật.

> **Lưu ý `sr-only`**: repo hiện chưa dùng utility này ở đâu (đã grep). Nó là utility chuẩn của Tailwind nên chạy được ngay, nhưng đây là lần đầu — nếu bạn muốn giữ repo tuyệt đối nhất quán thì thay bằng `appearance-none absolute opacity-0`. `sr-only` vẫn là lựa chọn đúng hơn về khả năng truy cập (giữ được focus bàn phím), nên guide chọn nó.

---

# 10. `app/groups/[groupId]/dishes/actions.ts` — SỬA

## 10.1 `AddDishFormState` mở rộng

```ts
export type AddDishFormState = {
  readonly nameError: string | null
  readonly systemTagError: string | null      // từ S3
  readonly addedDishName: string | null
  readonly reusedDishName: string | null      // MỚI — toast "Dùng lại …"
  readonly candidates: readonly { readonly id: string; readonly name: string }[]  // MỚI
}
```

Tất cả `readonly`, tất cả `| null` chứ không optional — `exactOptionalPropertyTypes` đang bật, và đây là hợp đồng dùng chung giữa `actions.ts` và component.

## 10.2 `addDishAction` — ba nhánh

```ts
export async function addDishAction(
  groupId: string,
  _previousState: AddDishFormState,
  formData: FormData,
): Promise<AddDishFormState> {
  const { user } = await requireGroupContext(groupId)

  // Nhánh 1 — "Dùng món này" trên một ứng viên `global`. Giá trị tới từ
  // name/value của chính nút submit trong duplicate-sheet.tsx.
  const reuseId = formData.get('reuseGlobalDishId')
  if (typeof reuseId === 'string' && reuseId !== '') {
    const reused = await addExistingDishToGroup(
      { dishes: drizzleDishRepository },
      { groupId, globalDishId: reuseId },
    )
    if (!reused.ok) {
      return { ...EMPTY, nameError: 'Không dùng lại được món này. Thử lại giúp mình.' }
    }
    revalidatePath(`/groups/${groupId}`)
    refresh()
    return { ...EMPTY, reusedDishName: reused.value.name }
  }

  const forceCreate = formData.get('forceCreate') === 'true'

  // Nhánh 2 — client báo đang hiện ứng viên gần giống mà người dùng chưa xử lý.
  //
  // Đây là CỔNG XÁC NHẬN UX, KHÔNG phải kiểm soát bảo mật: cờ do client gửi
  // lên, giả mạo được dễ dàng, và hậu quả xấu nhất chỉ là tạo một món đáng lẽ
  // nên dùng lại. Đặt ở server để `add-dish-sheet.tsx` không phải chặn submit
  // bằng `preventDefault` + dò `event.submitter` — thứ jsdom không hứa hỗ trợ,
  // sẽ làm test giòn.
  if (!forceCreate && formData.get('hasNearMatch') === 'true') {
    return { ...EMPTY, nameError: 'Chọn “Dùng món này”, hoặc xác nhận đây là món khác.' }
  }

  // Nhánh 3 — thêm bình thường.
  const rawTag = formData.get('systemTag')
  const result = await addDishToGroup(
    { dishes: drizzleDishRepository },
    {
      groupId,
      creatorUserId: user.id,
      name: String(formData.get('name') ?? ''),
      systemTags: typeof rawTag === 'string' && rawTag !== '' ? [rawTag] : [],
      forceCreate,
    },
  )

  if (!result.ok) {
    const message = toVietnameseMessage(result.error)
    return result.error.code === 'ERR_INVALID_SYSTEM_TAG'
      ? { ...EMPTY, systemTagError: message }
      : { ...EMPTY, nameError: message }
  }

  // Server tìm thấy Global Dish trùng tên chính xác ở nhóm khác (S2, TC-018).
  if (result.value.kind === 'candidates') {
    return { ...EMPTY, candidates: result.value.candidates }
  }

  revalidatePath(`/groups/${groupId}`)
  refresh()
  return { ...EMPTY, addedDishName: result.value.dish.name }
}
```

với `const EMPTY: AddDishFormState = { nameError: null, systemTagError: null, addedDishName: null, reusedDishName: null, candidates: [] }` đặt ở đầu file. `{ ...EMPTY, x }` giữ mọi nhánh trả về đủ 5 khoá mà không phải liệt kê lại — và `tsc` vẫn bắt được nếu ai thêm khoá thứ 6.

Nhớ xoá comment `TODO(E2-T7)` mà S2 §9 đã đặt — nợ đó trả xong ở đây.

## 10.3 `setSystemTagsAction` — MỚI

```ts
export type EditDishFormState = { readonly error: string | null; readonly savedAt: number | null }

export async function setSystemTagsAction(
  groupId: string,
  _previousState: EditDishFormState,
  formData: FormData,
): Promise<EditDishFormState> {
  // ADMIN, không phải MEMBER — BR-008/TC-025. `requireGroupAdminContext` tới từ
  // guide S1 §11 hoặc S3 §12.1, tuỳ slice nào bạn code trước.
  const { user } = await requireGroupAdminContext(groupId)

  const result = await setSystemTags(
    {
      dishes: drizzleDishRepository,
      assertAdmin: ({ userId, groupId: gid }) =>
        assertGroupAccess(
          { memberships: drizzleMembershipRepository },
          { userId, groupId: gid, requiredRole: 'ADMIN' },
        ),
    },
    {
      groupId,
      groupDishId: String(formData.get('groupDishId') ?? ''),
      // `getAll` chứ không `get`: checkbox cùng name gửi lên nhiều giá trị.
      systemTags: formData.getAll('systemTag').map(String),
      requestedByUserId: user.id,
    },
  )

  if (!result.ok) {
    return { error: 'Không lưu được nhãn. Thử lại giúp mình.', savedAt: null }
  }

  revalidatePath(`/groups/${groupId}/dishes`)
  refresh()
  return { error: null, savedAt: Date.now() }
}
```

`savedAt: Date.now()` chứ không `saved: true`: lưu hai lần liên tiếp cùng giá trị `true` thì `useActionState` không đổi tham chiếu, component không biết là đã lưu lần hai. Một con số tăng dần thì luôn khác.

**Guard chạy hai lớp** (`requireGroupAdminContext` ở action, `assertAdmin` bên trong use case) — không thừa: use case phải tự bảo vệ được khi có người gọi nó từ chỗ khác, còn action phải guard vì Server Action POST thẳng được. Đúng nguyên tắc Tech Spec §5 mà `addDishAction` đang theo.

---

# 11. Test — theo đúng idiom repo, và hai cái bẫy

## 11.1 Idiom bắt buộc (đã grep xác nhận trên toàn repo)

- **`userEvent`, không bao giờ `fireEvent`** (0 lần xuất hiện trong repo).
- **Không gọi `userEvent.setup()`** — dùng API trực tiếp `await userEvent.click(...)`.
- **Không `waitFor`, không `act`** — bất đồng bộ thì `await screen.findByRole(...)`.
- **Không `vi.mock`** — Server Action truyền vào như một hàm async thường qua prop.
- Assert trong feature `dish` dùng `toBeDefined()` / `toBeNull()` (khớp file anh em), string tiếng Việt verbatim.

## 11.2 Bẫy 1 — "Đóng" nhập nhằng

Scrim của `Sheet` là `<button type="button" aria-label="Đóng">` phủ kín `inset-0`. Sheet nào có thêm nút "Đóng" riêng (như `AddDishSheet`) thì `getByRole('button', { name: 'Đóng' })` khớp **hai** phần tử và ném lỗi. `add-dish-sheet.test.tsx` hiện tại né đúng chỗ này — đừng vô tình phá.

Trong `EditDishSheet` (§9) tôi **không** thêm nút "Đóng" riêng, nên ở sheet đó `getByRole('button', { name: 'Đóng' })` là duy nhất và dùng được để test đóng bằng scrim.

## 11.3 Bẫy 2 — sheet đóng đồng bộ trong test

`Sheet` có nhánh `if (process.env.NODE_ENV === 'test') { onClose() }` vì jsdom không bắn `animationend`. Nghĩa là sau `await userEvent.click(...)` thì sheet đã đóng ngay, assert được luôn, **không cần** `findBy`.

## 11.4 Test cần viết

`duplicate-sheet.test.tsx`:
```tsx
it('ứng viên inGroup: bấm "Dùng món này" gọi onUseInGroup, không submit', async () => {
  const onUseInGroup = vi.fn()
  render(
    <DuplicateSheet
      candidates={[{ kind: 'inGroup', id: '1', name: 'Canh chua cá lóc', meta: 'Canh' }]}
      onUseInGroup={onUseInGroup}
      onForceCreate={vi.fn()}
    />,
  )

  await userEvent.click(screen.getByRole('button', { name: 'Dùng món này' }))
  expect(onUseInGroup).toHaveBeenCalledWith('Canh chua cá lóc')
})

it('ứng viên global: nút là submit mang theo reuseGlobalDishId', () => {
  render(
    <DuplicateSheet
      candidates={[{ kind: 'global', id: 'gd-1', name: 'Canh chua', meta: '' }]}
      onUseInGroup={vi.fn()}
      onForceCreate={vi.fn()}
    />,
  )

  const button = screen.getByRole('button', { name: 'Dùng món này' })
  expect(button.getAttribute('type')).toBe('submit')
  expect(button.getAttribute('name')).toBe('reuseGlobalDishId')
  expect(button.getAttribute('value')).toBe('gd-1')
})

it('E2-T7 DoD — "vẫn tạo mới" mờ hơn và không phải nút chính', () => { … })
```

`dish-catalog-screen.test.tsx` (thêm vào các test đã có):
```tsx
it('gõ vào ô tìm thì lọc danh sách ngay', async () => {
  render(<DishCatalogScreen groupName="Nhà Bảy Hiền" dishes={DISHES} action={vi.fn()} />)

  await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm món trong nhà' }), 'canh')

  expect(screen.getByText('Canh chua cá lóc')).toBeDefined()
  expect(screen.queryByText('Gà chiên nước mắm')).toBeNull()
})

it('tìm không ra thì hiện thẻ không khớp, đúng nháy cong', async () => {
  render(<DishCatalogScreen groupName="Nhà Bảy Hiền" dishes={DISHES} action={vi.fn()} />)

  await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm món trong nhà' }), 'phở')

  expect(screen.getByText('Không có món nào khớp “phở”.')).toBeDefined()
  expect(screen.getByText('Thêm nó vào danh mục bằng nút bên dưới.')).toBeDefined()
})

it('rỗng thì không có ô tìm', () => {
  render(<DishCatalogScreen groupName="Nhà Bảy Hiền" dishes={[]} action={vi.fn()} />)
  expect(screen.queryByRole('searchbox')).toBeNull()
})

it('nhóm theo nhãn, đúng thứ tự mâm cơm', () => { … })
it('bấm một hàng món mở sheet sửa nhãn', async () => { … })
it('ô tìm prefill vào sheet khi mở', async () => { … })
```

---

# 12. Rủi ro

| Rủi ro | Hậu quả | Giảm thiểu |
|---|---|---|
| Code S4 trước S2/S3 | Không biên dịch được, hàng loạt lỗi import | §1 — thứ tự bắt buộc |
| Nhầm `id` giữa hai loại ứng viên | Gửi `group_dishes.id` vào `addExistingDishToGroup` → lỗi khoá ngoại | `kind` là trường bắt buộc trong `DuplicateCandidate`; ứng viên `inGroup` không có đường nào tới server |
| Copy sai nháy thẳng/cong | Test so khớp chuỗi đỏ, hoặc UI lệch thiết kế | Chép nguyên `“ ”` và `—` từ §7.3/§7.5; đừng gõ tay |
| `jscpd` đỏ vì ô tìm thứ ba trùng class | `yarn verify` đỏ dù code đúng | Ô tìm mới đã tách thành `dish-search-field.tsx`; nếu vẫn đỏ, cân nhắc để `time-zone-picker-sheet` dùng lại chính component đó |
| Món nhiều nhãn hiện ở nhiều nhóm, tổng số đếm > số ở header | Trông như đếm sai | Đã ghi trong doc-comment của `groupDishesByTag`; nếu thấy khó chịu thật thì bỏ số đếm ở heading nhóm, đừng bỏ việc hiện món ở nhiều nhóm |
| Cờ `hasNearMatch` do client gửi | Bỏ qua được bằng cách sửa request | Là cổng xác nhận UX, không phải kiểm soát bảo mật — đã ghi rõ ở §10.2. Hậu quả xấu nhất: tạo một món đáng lẽ nên dùng lại |

---

# 13. Thứ tự TDD

1. `near-match.test.ts` → `near-match.ts`
2. `dish-group.test.ts` → `dish-group.ts`
3. `duplicate-sheet.test.tsx` → `duplicate-sheet.tsx`
4. `dish-search-field.tsx` (quá mỏng để test riêng — phủ qua test màn danh mục)
5. `dish-row.tsx` → `<button>`
6. `dish-catalog-screen.test.tsx` (mở rộng) → `dish-catalog-screen.tsx`
7. `add-dish-sheet.test.tsx` (mở rộng) → `add-dish-sheet.tsx`
8. `edit-dish-sheet.test.tsx` → `edit-dish-sheet.tsx`
9. `actions.ts` + `page.tsx`
10. `yarn verify && yarn arch:probe`, rồi `yarn dev` thử tay theo §14.2

---

# 14. Verify

## 14.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn build
```

`yarn test` phải in các nhóm mới: `findNearMatches`, `groupDishesByTag`, `DuplicateSheet`, `EditDishSheet`, và các test đã mở rộng của `DishCatalogScreen` (ô tìm, thẻ không khớp, nhóm theo nhãn) và `AddDishSheet`.

Slice này **không thêm integration test nào** — không có truy vấn DB mới (near-match chạy ở client, nhóm theo nhãn là hàm thuần). `yarn test:integration` vẫn phải xanh nguyên trạng, coi như test hồi quy cho S2/S3.

Ba cổng dễ đỏ nhất ở slice này, biết trước để không mất thời gian:

| Lệnh | Đỏ vì gì | Sửa |
| --- | --- | --- |
| `yarn knip` | `setSystemTagsAction` hoặc `DuplicateSheet` export mà chưa ai import | Nối dây xong hẵng chạy — đừng viết action trước component dùng nó |
| `yarn dup` (jscpd) | `dish-search-field.tsx` trùng class với ô tìm của `time-zone-picker-sheet.tsx` | Xem §12 "Rủi ro" — nếu vượt ngưỡng thì cho ô tìm múi giờ dùng lại `DishSearchField` |
| `yarn arch:probe` | `presentation/components` lỡ import `application/` (ví dụ import thẳng `setSystemTags`) | Use case chỉ được gọi từ `app/`; component nhận Server Action qua prop |

## 14.2 Thử tay trên trình duyệt

```bash
yarn dev
```

1. Thêm `Canh chua cá lóc`, chọn nhãn `Canh`. → toast `Đã thêm …`.
2. Mở sheet, gõ `canh chua`. → khối `Nhà bạn đã có món gần giống` hiện **ngay khi gõ**, nút `Thêm vào danh mục` hạ tông xám.
3. Bấm `Thêm vào danh mục` lúc này. → lỗi dưới ô tên: `Chọn “Dùng món này”, hoặc xác nhận đây là món khác.`
4. Bấm `Dùng món này`. → sheet đóng, toast `Dùng lại Canh chua cá lóc — đã có trong danh mục.`, danh mục **không** thêm dòng nào.
5. Mở lại, gõ `canh chua`, bấm `Đây là món khác, vẫn tạo mới`. → nút lưu sáng lại, lưu được.
6. Gõ `ca loc` (không dấu) vào ô tìm. → vẫn ra `Canh chua cá lóc` (nhờ E2-T3).
7. Bấm vào hàng món. → sheet sửa nhãn, tick thêm `Món mặn`, lưu. → món hiện ở **cả hai** nhóm `Món mặn` và `Canh`.
8. Bỏ tick hết, lưu. → món rơi xuống nhóm `Chưa phân nhãn`.

Tám bước trên chỉ chạm được ứng viên `inGroup`. Ứng viên `global` cần **hai nhóm** — xem §14.3.

## 14.3 Ứng viên `global` — đường duy nhất để thử

Đây là nhánh dễ bị bỏ sót nhất: với một nhóm duy nhất nó không bao giờ hiện (đúng lý do đã ghi ở §2.2). Dựng đủ điều kiện:

1. Tạo **Nhóm A**, thêm món `Bún chả` (nhãn bất kỳ).
2. Tạo **Nhóm B** (cùng tài khoản cũng được — `createGroup` không cấm một người có nhiều nhóm).
3. Vào danh mục món của **Nhóm B**, gõ đúng `Bún chả`, chọn nhãn, bấm `Thêm vào danh mục`.
4. → Khối trùng hiện **sau khi bấm lưu** (không phải khi đang gõ — đây là ứng viên server, khác thời điểm với `inGroup`), liệt kê `Bún chả`.
5. Bấm `Dùng món này`. → Nhóm B có `Bún chả`, và trong `yarn db:studio`, `global_dishes` vẫn **đúng một dòng** `Bún chả` — hai hàng `group_dishes` cùng trỏ về nó. Đây chính là mục đích chống trùng toàn cục của SPEC-005.
6. Đối chiếu: nếu bước 5 tạo ra **hai** dòng `global_dishes`, tức là nút `Dùng món này` đã đi nhầm sang nhánh tạo mới — kiểm lại `name`/`value` của nút submit trong `duplicate-sheet.tsx` (§6) và thứ tự ba nhánh trong `addDishAction` (§10.2).

---

# 15. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v3.9.md`

```markdown
# DEC-026 — Duplicate Candidates Come From Two Sources With Different Actions

**Date:** 2026-08-18
**Status:** Accepted

## Decision

The S-06 "Nhà bạn đã có món gần giống" panel merges two kinds of candidate:

- `inGroup` — near-matches found client-side by bidirectional substring over the
  group's own already-loaded dish list. "Dùng món này" performs no mutation; the
  dish is already in the pool, so the sheet simply closes with a toast.
- `global` — Global Dishes with an exactly equal `normalized_name` created by
  another group, returned by the server after a save attempt. "Dùng món này"
  calls `addExistingDishToGroup`.

## Rationale

The mockup and the backend disagreed, and each was right about a different
thing. `S-05 S-06 Danh muc mon.dc.html:188-193` matches bidirectional substrings
against the group's own list; SPEC-005 / E2-T4 matches exact normalized names
across the global pool. The first prevents a household from adding "Canh chua"
when it already has "Canh chua cá lóc"; the second prevents duplicate Global
Dishes across households. Keeping only the second would have left the panel
permanently empty for a single-group deployment — two hours of dormant UI.

Client-side matching costs nothing: `DishCatalogScreen` already holds the full
dish list, so no query and no round-trip were added.

BR-001 supports the substring behaviour directly: "các món có khả năng trùng
**hoặc tương tự**".

## Correction to an earlier claim

The E2-S2 guide discussion asserted that PRD decision "D-10" placed fuzzy
matching out of scope. No such identifier exists in the repository (decision
ids are `DEC-0xx`), and the PRD's Out of Scope section contains no
fuzzy-matching entry — only automatic *merging* of duplicate Global Dishes.
Nothing in the documents forbids near-match detection.

## Consequence

`DuplicateCandidate.kind` is required and load-bearing: `inGroup` ids are
`group_dishes.id`, `global` ids are `global_dishes.id`. Mixing them produces a
foreign-key error.

## Affected Documents

- SDD SPEC-005 (documents that near-match is a UI affordance, not part of the
  formal candidate contract)
- Master Plan §4 (E2-T7)
```

---

# 16. Master Plan

Sau khi `yarn verify` và `yarn arch:probe` xanh và thử tay §14.2–§14.3 xong: tick `E2-T6` và `E2-T7` ở §4.

**E2 kết thúc tại đây.** Master Plan ghi *"Điểm kiểm tra sau E2: đạt cột mốc M3 khi kết hợp với E3"* — nên M3 chưa đạt ở slice này, còn chờ E3. Nợ đã ghi nhận khi khép epic: **F27 (gỡ món khỏi pool)** chưa làm (§2.1), kéo theo TC-020 chưa có đường đi thật và TC-065/069/108 chưa dựng được dữ liệu.
