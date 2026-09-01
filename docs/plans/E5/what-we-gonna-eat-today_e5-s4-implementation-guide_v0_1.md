# 🍚 Implementation Guide — E5 Slice S4: Màn tổng hợp và chốt bữa

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-20`
> - **Upstream:** [Master Plan](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E5-T7`, `E5-T8`, `E5-T9` — **Cột mốc M5**) • [SDD](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-014`, `SPEC-015`, `SPEC-016`) • [Business Rules](../../what-we-gonna-eat-today_business-rules_v1.8.md) (`BR-050`, `BR-051`) • [Design](../../designs/README.md) • [Test Cases](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-063`→`TC-066`, `TC-061`, `TC-072`)
> - **Ảnh tham chiếu:** [s10-01-tong-hop.png](../../designs/screenshots/s10-01-tong-hop.png)
> - **Tiền đề:** S3 đã code (`listSessionRanking`, `finalizeSession` đủ 7 bước).
>
> 🍚 *Slice cuối của E5 và là mốc M5. Sau slice này một bữa cơm đi trọn vòng: mở phiên → cả nhà vuốt → Creator nhìn bảng đồng thuận → chốt → lịch sử ăn được ghi.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E5-T7` | Màn hình tổng hợp kèm số đếm thô | 2.5 | `src/features/meal/presentation/**` (xem §1.1) | Dùng `tabular-nums`; số 0 hiện **mờ** chứ không ẩn |
| `E5-T8` | Khay chọn món và dựng Final Meal | 2 | `src/features/meal/presentation/**` | Chọn được cả món trong mục "Chưa ai chọn" |
| `E5-T9` | Hiện Required Rule chưa đạt ngay trên nút chốt | 1 | Như trên | Ghi rõ `Còn thiếu: 1 món canh`, **không dùng modal** — **Cột mốc M5** |

- [ ] `TC-063`→`TC-066` pass
- [ ] Chốt được một bữa thật trên preview, `eating_history` có dòng mới
- [ ] Thiếu rule → dòng "Còn thiếu" hiện **tại chỗ**, nút vẫn bấm được, không popup nào
- [ ] Không có chuỗi "Nên có" và không có ô "không ăn được" nào trên màn hình (§1.2)
- [ ] `yarn verify && yarn arch:probe` xanh

---

# 1. Năm phát hiện — đọc trước khi gõ

## 1.1 Master Plan đặt `E5-T7` vào `selection/presentation/**` — không đặt được ở đó

`E5-T7` (bảng xếp hạng) và `E5-T8`/`E5-T9` (khay chọn + nút chốt) trong Master Plan nằm ở hai feature: `selection/presentation/**` và `meal/presentation/**`.

Nhưng ba việc đó là **một màn hình duy nhất, chia sẻ một state duy nhất**: danh sách món đang chọn. Bấm "Chọn" trên một thẻ ở phần trên phải làm đổi khay ở phần dưới, làm đổi dòng "Còn thiếu", làm đổi nút chốt — ngay lập tức, không round-trip (`BR-051` *Live Composition Feedback*).

Tách đôi thì phần trên phải import phần dưới hoặc ngược lại. Cả hai chiều đều bị chặn: `ALLOWED_CROSS_FEATURE.meal = ['rule', 'history']` (không có `selection`), và `selection = ['history', 'dish']` (không có `meal`).

**Quyết định: toàn bộ màn hình sống ở `features/meal/presentation/`.** Lý do không phải "vì `meal` tiện hơn":

- Màn này là màn **chốt bữa** — `SPEC-015` + `SPEC-016`, cả hai thuộc `meal`. Bảng xếp hạng là *dữ liệu nó hiển thị*, không phải *việc nó làm*.
- `selection` vẫn giữ trọn phần của mình: `rankSession` ở `domain/`, `listSessionRanking` ở `application/` (S3). Feature `selection` **sản xuất** bảng điểm; feature `meal` **tiêu thụ** nó.
- Chỗ nối hai bên là `app/` — đúng nơi dự án này đã đặt mọi việc lắp ráp xuyên feature (`requireGroupContext`, `assertAdmin` tiêm từ `app/`). `page.tsx` gọi `listSessionRanking` của `selection`, rồi ánh xạ kết quả sang props do `meal/presentation` tự khai. **Không** thêm chiều `meal → selection`: nếu chỉ để mượn một kiểu dữ liệu thì ánh xạ ở `app/` rẻ hơn một chiều cross-feature vĩnh viễn.

Ghi Decision Log (§9).

## 1.2 Mockup S-10 có hai thứ v1.0 không có

Đọc kỹ [s10-01-tong-hop.png](../../designs/screenshots/s10-01-tong-hop.png), mỗi thẻ món có **bốn** ô đếm:

```
3 đề xuất          0 không muốn
1 không ăn được    0 vừa ăn
```

Ô *"không ăn được"* là $X$ — `F15` Cannot Eat, **v1.1** (`SPEC-014` không có đường dữ liệu cho nó ở v1.0; xem S3 §1.4). Dựng **ba ô**, bỏ ô đó: một ô luôn hiện `0` vĩnh viễn còn tệ hơn không có ô, vì nó nói với người dùng rằng "chưa ai báo không ăn được" trong khi sự thật là "chưa hỏi ai bao giờ".

Dải chân trang trong ảnh có ba dòng quy định:

```
| Phải có ít nhất 1 món mặn · còn thiếu
| Phải có ít nhất 1 món canh · còn thiếu
| Nên có ít nhất 1 món phụ · chưa có
```

Dòng thứ ba là `Preferred Rule` (`F22`, v1.1) — bỏ, cùng lý do đã ghi ở S1 §1.4. Hai dòng đầu giữ nguyên, kể cả cột màu bên trái.

Ba ô còn lại giữ đúng chữ của mockup: **"đề xuất"** ($P$), **"không muốn"** ($N$), **"vừa ăn"** ($H$).

## 1.3 "Số 0 hiện mờ chứ không ẩn" là DoD, và nó có lý do

`E5-T7` DoD: *"Dùng `tabular-nums`; số 0 hiện mờ chứ không ẩn"*. Hai yêu cầu, cùng phục vụ một việc: **đọc lướt một cột số**.

- `tabular-nums` giữ mọi chữ số cùng bề rộng. Không có nó, `1 đề xuất` và `4 đề xuất` lệch nhau vài pixel và cột số trông gợn khi cuộn.
- Ẩn số 0 làm các ô nhảy chỗ giữa các thẻ: thẻ có `0 không muốn` sẽ mất một dòng, thẻ dưới nó trồi lên. Mắt đọc lướt mất mốc neo. Mà `0 không muốn` còn là **tin tốt** — ẩn nó đi là giấu đúng thứ người dùng cần thấy.

Cụ thể: ô có giá trị `0` dùng `text-ink-faint`, ô khác `0` dùng màu theo ngữ nghĩa (`đề xuất` → `text-yes`, `vừa ăn`/`không muốn` → `text-ink`). Viết thành **một** hàm ở `count-tone.ts` để test khẳng định được, đừng rải `count === 0 ? …` khắp JSX.

## 1.4 Dòng "Còn thiếu" phải tính ở CLIENT, và chỉ có `rule/domain` mới cho phép điều đó

`E5-T9` DoD: *"Ghi rõ `Còn thiếu: 1 món canh`, **không dùng modal**"*. Cộng với `BR-051` (*"phản hồi trực quan theo thời gian thực"*), dòng đó phải đổi **ngay khi bấm Chọn**, trước bất kỳ round-trip nào.

Nghĩa là `evaluateRequired` chạy ở client. Được: nó là hàm thuần ở `features/rule/domain/evaluate.ts`, và `meal → rule` nằm sẵn trong `ALLOWED_CROSS_FEATURE` từ E0. Không có `'use server'`, không đọc DB, không `process.env` — đúng thứ `domain/` được thiết kế để làm.

Client cần hai dữ liệu, cả hai đi qua props từ `app/`:

1. `sessionRules` — `RuleRepository.listSessionRules(sessionId)` (S2). **Session Rule, không phải Group Rule** — cùng lý do `TC-074`.
2. `systemTags` của **từng** món trong danh sách — tag hiện tại, đi kèm mỗi dòng của bảng xếp hạng.

Server vẫn đánh giá lại lúc Finalize (`finalizeSession` bước 5-6, S3). Hai lần đánh giá **không** thừa: client để phản hồi tức thì, server để đúng đắn. Chúng có thể lệch nhau nếu Admin sửa tag ngay lúc đó — và khi lệch, server thắng, người dùng thấy lỗi trả về. Đó là hành vi đúng, không phải bug.

## 1.5 "Chọn" ghi nháp ngay hay chờ tới lúc chốt?

`SPEC-015` nói nháp là thứ được lưu (`final_meals` + `final_meal_items`), và `TC-063`→`TC-066` test đúng việc lưu nháp. Nhưng nếu mỗi lần bấm "Chọn" là một round-trip thì với 8 món người dùng chờ 8 lần.

**Một form, hai nút submit, phân biệt bằng `name="intent"`** — đúng khuôn `addDishAction` đã dùng ở E2 (phân nhánh theo `formData.get('reuseGlobalDishId')`):

- Bấm "Chọn"/"Bỏ" trên thẻ → **chỉ đổi state client**, không gửi gì. Khay, dòng "Còn thiếu", nút chốt đổi ngay.
- Bấm "Chốt bữa" → submit với `intent=finalize`; action **lưu nháp rồi finalize** trong cùng một lần gọi.

Nháp vì thế được lưu đúng một lần, ngay trước khi chốt — không có "lost update", và không có trạng thái nháp nào tồn tại mà người dùng không thấy. `saveFinalMealDraft` (E1-T10) vẫn giữ nguyên vai trò và vẫn được gọi thật, nên `TC-063`→`TC-066` vẫn đúng đường đi.

> [!NOTE]
> Hệ quả: rời trang giữa chừng thì mất lựa chọn. Chấp nhận ở v1.0 — người dùng đang ngồi chọn bữa tối trong một phút, không phải soạn thảo văn bản dài. Nếu sau này cần giữ, thêm `intent=save` vào cùng action đó, không phải viết lại luồng.

---

# 2. File tree

```
src/features/meal/presentation/components/
  finalize-meal-screen.tsx            + MỚI (§4)      — E5-T7 + T8 + T9
  finalize-meal-screen.test.tsx       + MỚI (§4.4)
  dish-score-row.tsx                  + MỚI (§4.1)    — E5-T7
  dish-score-row.test.tsx             + MỚI (§4.4)
  count-tone.ts                       + MỚI (§4.2)    — E5-T7 (quy tắc số 0)
  count-tone.test.ts                  + MỚI (§4.4)
  finalize-bar.tsx                    + MỚI (§4.3)    — E5-T8 + T9
  finalize-bar.test.tsx               + MỚI (§4.4)

src/app/sessions/[sessionId]/summary/
  page.tsx                            + MỚI (§5)
  actions.ts                          + MỚI (§5.1)

src/features/session/presentation/components/
  start-session-screen.tsx            ~ SỬA — lối vào "Xem tổng hợp" (§6)
```

Không có file nào ở `features/selection/` bị đụng trong slice này — xem §1.1.

---

# 3. Hình dạng props

Khai ở `finalize-meal-screen.tsx`, **do `meal` tự sở hữu**, không import từ `selection`:

```tsx
import type { SystemTag } from '@/shared/domain/system-tag'

export type SummaryDish = {
  readonly dishId: string
  readonly name: string
  readonly systemTags: readonly SystemTag[]
  readonly proposedCount: number
  readonly rejectedCount: number
  readonly recentEaterCount: number
  /** `null` với món ở mục "Chưa ai chọn" — TC-061: chúng KHÔNG có điểm. */
  readonly score: number | null
}

export type FinalizeMealScreenProps = {
  dateCaption: string
  /** "3 trong 4 người đã xong" — dựng ở `app/`, không tính lại ở đây. */
  progressCaption: string
  ranked: readonly SummaryDish[]
  untouched: readonly SummaryDish[]
  rules: readonly RequiredRule[]
  closeHref: string
  action: (state: FinalizeFormState, formData: FormData) => Promise<FinalizeFormState>
}
```

`RequiredRule` import từ `@/features/rule/domain/evaluate` — chiều `meal → rule` hợp lệ và đây là đúng kiểu đó dùng để làm gì.

---

# 4. Components

## 4.1 `dish-score-row.tsx` (E5-T7)

Một thẻ trong ảnh: tên món, nút "Chọn"/"Bỏ", **ba** ô đếm, nhãn tag.

```tsx
'use client'

import type { ReactElement } from 'react'

import { Button } from '@/shared/ui/button'

import { countTone } from './count-tone'
import type { SummaryDish } from './finalize-meal-screen'

export type DishScoreRowProps = {
  dish: SummaryDish
  selected: boolean
  onToggle: (dishId: string) => void
  tagLabel: string
}

/**
 * S-10, một thẻ món. BA ô đếm, không phải bốn: ô "không ăn được" trong mockup
 * là $X$ (F15, v1.1) — một ô luôn hiện 0 vĩnh viễn nói dối người dùng rằng
 * "chưa ai báo không ăn được", trong khi sự thật là chưa hỏi ai bao giờ
 * (Guide §1.2).
 *
 * KHÔNG hiện `score`. Điểm là thứ dùng để SẮP XẾP, không phải thứ để đọc:
 * "0.43" không nói gì với người đang chọn bữa tối, còn "3 đề xuất · 1 không
 * muốn" thì nói đủ. Mockup cũng không có số điểm ở đâu.
 */
export function DishScoreRow({
  dish,
  selected,
  onToggle,
  tagLabel,
}: DishScoreRowProps): ReactElement {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-raised p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-subtitle font-semibold text-ink">{dish.name}</h3>
        <Button
          type="button"
          variant={selected ? 'quietAccent' : 'quiet'}
          size="sm"
          aria-pressed={selected}
          onClick={() => onToggle(dish.dishId)}
        >
          {selected ? 'Bỏ' : 'Chọn'}
        </Button>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        <Count value={dish.proposedCount} label="đề xuất" tone="yes" />
        <Count value={dish.rejectedCount} label="không muốn" tone="neutral" />
        <Count value={dish.recentEaterCount} label="vừa ăn" tone="neutral" />
      </dl>

      <p className="text-caption text-ink-muted">{tagLabel}</p>
    </div>
  )
}

function Count({
  value,
  label,
  tone,
}: {
  value: number
  label: string
  tone: 'yes' | 'neutral'
}): ReactElement {
  return (
    <div className={`flex gap-1 text-body tabular-nums ${countTone(value, tone)}`}>
      <dt className="sr-only">{label}</dt>
      <dd aria-label={`${value} ${label}`}>
        {value} {label}
      </dd>
    </div>
  )
}
```

## 4.2 `count-tone.ts` (E5-T7 — quy tắc số 0)

```ts
/**
 * E5-T7 DoD: "số 0 hiện MỜ chứ không ẩn".
 *
 * Ẩn số 0 làm các ô nhảy chỗ giữa các thẻ và mắt đọc lướt mất mốc neo. Mà
 * "0 không muốn" còn là TIN TỐT — ẩn nó đi là giấu đúng thứ người dùng cần
 * thấy nhất (Guide §1.3).
 *
 * Một hàm thay vì rải `value === 0 ? …` khắp JSX: quy tắc này là DoD, nên phải
 * có một chỗ để test khẳng định nó.
 *
 * KHÔNG dùng màu đỏ cho "không muốn" — cùng ràng buộc Design Criteria đã áp
 * cho vuốt trái ở E4-T7. Người không muốn ăn món này không phải đang báo lỗi.
 */
export function countTone(value: number, tone: 'yes' | 'neutral'): string {
  if (value === 0) {
    return 'text-ink-faint'
  }
  return tone === 'yes' ? 'text-yes font-medium' : 'text-ink'
}
```

## 4.3 `finalize-bar.tsx` (E5-T8 + E5-T9)

Dải dính đáy màn hình: câu tóm tắt khay → các dòng quy định → nút chốt.

```tsx
'use client'

import type { ReactElement } from 'react'

import { evaluateRequired, type RequiredRule } from '@/features/rule/domain/evaluate'
import { ruleSentence, ruleShortfallPhrase } from '@/features/rule/presentation/components/rule-sentence'
import { Button } from '@/shared/ui/button'
import type { SystemTag } from '@/shared/domain/system-tag'

export type FinalizeBarProps = {
  selectedDishes: readonly { dishId: string; name: string; systemTags: readonly SystemTag[] }[]
  rules: readonly RequiredRule[]
  pending: boolean
  error: string | null
}

/**
 * S-10 dải đáy. E5-T8 (khay) + E5-T9 (quy định chưa đạt) trong một component
 * vì chúng là MỘT câu nói với người dùng: "đây là những gì bạn chọn, và đây là
 * chỗ còn thiếu".
 *
 * `evaluateRequired` chạy Ở ĐÂY, tại client, mỗi lần render — BR-051 Live
 * Composition Feedback đòi dòng "Còn thiếu" đổi NGAY khi bấm Chọn, không chờ
 * round-trip. Hàm thuần ở `rule/domain` nên chạy được ở client; chiều
 * `meal → rule` đã có sẵn trong ALLOWED_CROSS_FEATURE từ E0 (Guide §1.4).
 *
 * Server VẪN đánh giá lại lúc Finalize (finalize-session.ts bước 5-6). Hai lần
 * không thừa: client cho tức thì, server cho đúng. Lệch nhau thì server thắng.
 *
 * KHÔNG MODAL (E5-T9 DoD). Mọi thứ hiện tại chỗ, ngay trên nút.
 */
export function FinalizeBar({
  selectedDishes,
  rules,
  pending,
  error,
}: FinalizeBarProps): ReactElement {
  const evaluation = evaluateRequired({ rules, dishes: selectedDishes })
  const isEmpty = selectedDishes.length === 0

  return (
    <div className="sticky bottom-0 flex flex-col gap-3 border-t border-border bg-surface-raised px-4 pb-6 pt-4">
      <p className="text-body text-ink-muted">
        {isEmpty
          ? 'Chưa chọn món nào cho bữa này.'
          : selectedDishes.map((dish) => dish.name).join(' · ')}
      </p>

      {rules.length === 0 ? null : (
        <ul className="flex flex-col gap-1">
          {rules.map((rule) => {
            const shortfall = evaluation.shortfalls.find((s) => s.systemTag === rule.systemTag)
            return (
              <li
                key={rule.systemTag}
                className={`border-l-2 pl-3 text-caption ${
                  shortfall === undefined ? 'border-yes text-ink-muted' : 'border-border-strong text-ink'
                }`}
              >
                {ruleSentence(rule)} ·{' '}
                {shortfall === undefined
                  ? 'đã đủ'
                  : `còn thiếu ${ruleShortfallPhrase({ systemTag: shortfall.systemTag, missing: shortfall.missing })}`}
              </li>
            )
          })}
        </ul>
      )}

      {error === null ? null : (
        <p role="alert" className="text-body text-no">
          {error}
        </p>
      )}

      {/* `muted` chứ KHÔNG `disabled`: nút chưa đủ điều kiện vẫn bấm được để
          bấm ra lỗi — Design Criteria §5, và `Button` đã có sẵn prop này. Một
          nút chết không nói cho người dùng biết vì sao nó chết. */}
      <input type="hidden" name="intent" value="finalize" />
      <Button type="submit" pending={pending} muted={isEmpty || !evaluation.satisfied}>
        {pending ? 'Đang chốt…' : isEmpty ? 'Chọn món để chốt' : 'Chốt bữa'}
      </Button>
    </div>
  )
}
```

> [!IMPORTANT]
> Dòng quy định dùng **cả màu lẫn chữ** (`· đã đủ` / `· còn thiếu 1 món canh`). `E6-T6` sẽ rà "không thông tin nào chỉ truyền tải bằng màu sắc" — viết đúng ngay từ đây rẻ hơn sửa sau.

## 4.4 Component chính và test

`finalize-meal-screen.tsx` giữ state `selectedIds: Set<string>`, render header (`progressCaption` + `dateCaption` + link "Đóng"), mục **"Cả nhà nghiêng về"** (`ranked`), mục **"Chưa ai chọn"** (`untouched`), rồi `FinalizeBar`. Cả hai mục dùng chung `DishScoreRow` — `E5-T8` DoD *"Chọn được cả món trong mục 'Chưa ai chọn'"* đúng nghĩa là **không** có nhánh riêng nào cho mục dưới.

Mỗi món đang chọn phát một `<input type="hidden" name="dishId" value={id} />` trong form, để action đọc bằng `formData.getAll('dishId')`.

Test:

| File | Ca | Khẳng định |
| --- | --- | --- |
| `count-tone.test.ts` | 0 → mờ | `countTone(0, 'yes')` chứa `text-ink-faint` |
| | ≠0 | `countTone(3, 'yes')` chứa `text-yes`; `countTone(1, 'neutral')` không chứa `text-ink-faint` |
| | không đỏ | Không giá trị nào trả về chuỗi chứa `no`/`red` |
| `dish-score-row.test.tsx` | ba ô | Thấy `0 không muốn` (**không** bị ẩn); **không** thấy `không ăn được` |
| | `tabular-nums` | Phần tử chứa số có class `tabular-nums` |
| | không hiện điểm | `queryByText(/0\.\d/)` là `null` |
| `finalize-bar.test.tsx` | `TC-072` | rule `SOUP≥1`, chọn 1 món `MAIN` → thấy `còn thiếu 1 món canh` |
| | đủ rule | thêm món `SOUP` → dòng đổi thành `đã đủ` |
| | không modal | `queryByRole('dialog')` là `null` |
| | rỗng | Không chọn gì → nút ghi `Chọn món để chốt`, **vẫn bấm được** (`toBeEnabled`) |
| `finalize-meal-screen.test.tsx` | `TC-066`/`E5-T8` | Bấm "Chọn" trên một món ở mục "Chưa ai chọn" → tên nó xuất hiện ở khay đáy |
| | `TC-061` | Món `score: null` nằm dưới tiêu đề "Chưa ai chọn" |
| | phản hồi tức thì | Bấm Chọn → dòng "Còn thiếu" đổi mà **không** cần `action` được gọi |

---

# 5. `src/app/sessions/[sessionId]/summary/page.tsx` — MỚI

Khuôn đọc dữ liệu giống `app/sessions/[sessionId]/page.tsx` (đọc Session → `assertGroupAccess` → use case), thêm bước **ánh xạ** của §1.1:

```tsx
export default async function SummaryPage({ params }: SummaryPageProps) {
  const { sessionId } = await params

  const user = await getCurrentUser()
  if (user === null) redirect('/')

  const session = await drizzleSessionRepository.findById(sessionId)
  if (session === null) notFound()

  const access = await assertGroupAccess(
    { memberships: drizzleMembershipRepository },
    { userId: user.id, groupId: session.groupId, requiredRole: 'MEMBER' },
  )
  if (!access.ok) notFound()

  // SPEC-014 "Yêu cầu Creator" — use case tự kiểm (TC-062); ở đây chỉ dịch
  // thất bại thành 404, không lộ ra phiên có tồn tại hay không (NFR-04).
  const ranking = await listSessionRanking(
    { selection: drizzleSelectionRepository, history: drizzleHistoryRepository },
    { sessionId, userId: user.id, referenceDate: session.decisionDate },
  )
  if (!ranking.ok) notFound()

  const [rules, overview] = await Promise.all([
    drizzleRuleRepository.listSessionRules(sessionId),
    drizzleSessionRepository.findSessionOverview(sessionId),
  ])

  const participants = overview?.participants ?? []
  const done = participants.filter((p) => p.state === 'COMPLETED').length

  // ÁNH XẠ — đây là chỗ `selection` và `meal` gặp nhau, và là lý do KHÔNG cần
  // chiều cross-feature `meal → selection` (Guide §1.1, DEC-046).
  const toSummaryDish = (dish: RankedDish | SessionDishInput, score: number | null) => ({
    dishId: dish.dishId,
    name: dish.name,
    systemTags: dish.systemTags,
    proposedCount: dish.proposedCount,
    rejectedCount: dish.rejectedCount,
    recentEaterCount: dish.recentEaterCount,
    score,
  })

  return (
    <FinalizeMealScreen
      dateCaption={formatVietnameseDateShort(session.decisionDate)}
      progressCaption={`${done} trong ${participants.length} người đã xong`}
      ranked={ranking.value.ranked.map((d) => toSummaryDish(d, d.score))}
      untouched={ranking.value.untouched.map((d) => toSummaryDish(d, null))}
      rules={rules}
      closeHref={`/groups/${session.groupId}`}
      action={finalizeMealAction.bind(null, sessionId)}
    />
  )
}
```

> [!WARNING]
> `systemTags` phải có trong đầu ra của `listSessionRanking` để dòng "Còn thiếu" tính được ở client. S3 §5.1 khai `countInteractionsByDish` **chưa** trả tag. Bổ sung `systemTags` vào câu SQL đó (một `json_agg` trên `group_dish_tags`, cùng khuôn `listActiveInGroup` của feature `dish`) và vào `SessionDishInput`. Đây là thay đổi ngược về S3 — nếu S3 đã landed, nó là một sửa nhỏ ở `selection`, không phải một chiều cross-feature mới.

## 5.1 `actions.ts`

```ts
'use server'

/**
 * MỘT action, phân nhánh theo `intent` — cùng khuôn `addDishAction` (E2-S4).
 * v1.0 chỉ có `finalize`; `save` để dành cho lúc cần giữ nháp qua reload
 * (Guide §1.5).
 *
 * Lưu nháp RỒI chốt trong cùng một lần gọi: `finalizeSession` đọc nháp từ DB
 * (SPEC-016 bước 3), nên nháp phải có mặt trước. Hai lệnh, hai giao dịch —
 * KHÔNG cần nguyên tử: nháp là dữ liệu người dùng ghi đè thoải mái, còn phần
 * cần nguyên tử (FINALIZED + eating_history) nằm trọn trong `commitFinalize`.
 */
export async function finalizeMealAction(
  sessionId: string,
  _previousState: FinalizeFormState,
  formData: FormData,
): Promise<FinalizeFormState> {
  const user = await getCurrentUser()
  if (user === null) redirect('/')

  const dishIds = formData.getAll('dishId').map(String)

  const saved = await saveFinalMealDraft(
    { meal: drizzleMealRepository },
    { sessionId, userId: user.id, dishIds },
  )
  if (!saved.ok) {
    return { error: toVietnameseMessage(saved.error), finalized: false }
  }

  const finalized = await finalizeSession(
    { meal: drizzleMealRepository, rules: drizzleRuleRepository },
    { sessionId, userId: user.id },
  )
  if (!finalized.ok) {
    return { error: toVietnameseMessage(finalized.error), finalized: false }
  }

  revalidatePath(`/sessions/${sessionId}`)
  refresh()
  return { error: null, finalized: true }
}
```

Bảng dịch lỗi (tạm ở đây, `E6-T2` gom về một chỗ):

| Mã | Thông điệp |
| --- | --- |
| `ERR_EMPTY_FINAL_MEAL` | `Chọn ít nhất một món trước đã.` |
| `ERR_REQUIRED_RULE_FAILED` | Dựng từ `details.shortfalls`: `Còn thiếu 1 món canh.` — **không** viết chung chung |
| `ERR_DISH_NOT_IN_POOL` | `Có món vừa bị gỡ khỏi nhóm. Chọn lại giúp mình.` |
| `ERR_SESSION_NOT_ACTIVE` | `Bữa này chốt rồi.` |
| `ERR_NOT_SESSION_CREATOR` | `Chỉ người mở phiên mới chốt được bữa.` |

`ERR_REQUIRED_RULE_FAILED` từ server là ca *"client và server lệch nhau"* của §1.4 — dịch nó bằng đúng dữ liệu server trả về chứ không bằng thứ client vừa tính, nếu không người dùng sẽ thấy hai câu khác nhau nói về cùng một sự việc.

---

# 6. Lối vào màn tổng hợp

`start-session-screen.tsx` (E3-T6, màn phiên của Creator) thêm nút "Xem tổng hợp" trỏ `/sessions/<id>/summary` — chỉ hiện với Creator, và chỉ khi phiên `ACTIVE`.

Không thêm lối vào từ `DeckScreen`: người đang vuốt là Participant, không nhất thiết là Creator, và `listSessionRanking` sẽ trả `ERR_NOT_SESSION_CREATOR` (`TC-062`) — một nút dẫn tới 404 là lời hứa hỏng.

---

# 7. Rủi ro

| Rủi ro | Dấu hiệu sớm | Xử lý |
| --- | --- | --- |
| `systemTags` thiếu ở đầu ra S3 | Dòng "Còn thiếu" luôn báo thiếu | §5 warning — bổ sung vào `countInteractionsByDish` |
| Ô "không ăn được" bị chép từ mockup | Thấy chuỗi đó trong DOM | Test `dish-score-row.test.tsx` khẳng định **không** có |
| Số 0 bị ẩn "cho gọn" | Ô nhảy chỗ giữa các thẻ | `count-tone.test.ts` là hàng rào |
| Client và server lệch kết quả rule | Bấm chốt lại ra lỗi dù dòng ghi "đã đủ" | Đúng như thiết kế (§1.4) — miễn là thông điệp lỗi dựng từ `details.shortfalls` của server |
| Nút chốt bị `disabled` | Không bấm được để bấm ra lỗi | Dùng `muted`, không `disabled` (§4.3) |
| Mất lựa chọn khi reload | — | Đã biết và chấp nhận (§1.5) |

---

# 8. Test Cases coverage

| TC | Tầng | Ở đâu |
| --- | :---: | --- |
| `TC-063` | `A` | Đã xanh từ `E1-T10`; slice này nối `saveFinalMealDraft` vào action thật (§5.1) |
| `TC-064`, `TC-065` | `A`/`I` | Đã xanh từ `E1-T10` — chạy lại |
| `TC-066` | `A` + UI | §4.4 "Chọn món ở mục Chưa ai chọn" |
| `TC-061` | UI | §4.4 "Món `score: null` nằm dưới Chưa ai chọn" |
| `TC-072` | UI | §4.4 `finalize-bar.test.tsx` |

---

# 9. Thứ tự TDD

1. `count-tone.test.ts` (đỏ) → `count-tone.ts` (xanh).
2. `dish-score-row.test.tsx` (đỏ) → `dish-score-row.tsx` (xanh).
3. `finalize-bar.test.tsx` (đỏ) → `finalize-bar.tsx` (xanh).
4. `finalize-meal-screen.test.tsx` (đỏ) → `finalize-meal-screen.tsx` (xanh).
5. Bổ sung `systemTags` vào `countInteractionsByDish` (S3) + integration test.
6. `page.tsx`, `actions.ts`, nút "Xem tổng hợp" — nối dây.

---

# 10. Verify

## 10.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn test:integration
```

## 10.2 Mốc M5 — một bữa đi trọn vòng trên preview

Trên điện thoại thật, một mạch không dừng:

1. Đặt quy định `MAIN ≥ 1`, `SOUP ≥ 1` (S-07).
2. Mở phiên với 2 người, cả hai vuốt vài món.
3. Creator mở "Xem tổng hợp" → thấy đúng `1 trong 2 người đã xong`, thấy các số đếm thô, thấy mục "Chưa ai chọn".
4. Chọn đúng một món mặn → dải đáy ghi `Phải có ít nhất 1 món canh · còn thiếu 1 món canh`, nút ghi "Chốt bữa" nhưng mờ.
5. **Bấm nút mờ đó** → hiện lỗi tại chỗ, **không có popup nào**, phiên vẫn `ACTIVE`.
6. Chọn thêm một món canh → dòng đổi thành `· đã đủ` **ngay lập tức**, không có khoảng chờ mạng.
7. Bấm Chốt → thành công.
8. `psql -c "SELECT * FROM eating_history WHERE source_final_meal_id = '<id>'"` → có đủ dòng cho từng Participant.

Bước 5 và bước 6 là hai DoD quan trọng nhất của slice: *không dùng modal* và *phản hồi thời gian thực*.

## 10.3 Bằng chứng khả năng tiếp cận

Tắt màn hình, dùng screen reader duyệt một thẻ món: phải nghe được `3 đề xuất`, `0 không muốn`, `0 vừa ăn` — kể cả các số 0 — rồi tới nút `Chọn`. Nếu số 0 không được đọc lên thì `sr-only`/`aria-label` ở §4.1 đang sai.

---

# 11. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v3.9.md`

```markdown
# DEC-046 — The Finalize Screen Lives Entirely in features/meal; app/ Maps the Ranking

- **Ngày:** 2026-08-20
- **Trạng thái:** Accepted
- **Bối cảnh:** E5-S4

## Quyết định

Toàn bộ màn S-10 (bảng xếp hạng + khay chọn + nút chốt) đặt ở
`features/meal/presentation/`, lệch chỉ định của Master Plan cho E5-T7
(`features/selection/presentation/**`). `app/sessions/[sessionId]/summary/page.tsx` gọi
`listSessionRanking` của `selection` rồi ánh xạ kết quả sang props do `meal/presentation` tự
khai. KHÔNG thêm chiều `meal → selection`.

## Rationale

E5-T7, E5-T8, E5-T9 là một màn hình duy nhất chia sẻ một state duy nhất: danh sách món đang
chọn. BR-051 đòi khay, dòng "Còn thiếu" và nút chốt đổi ngay khi bấm Chọn, không round-trip —
nên chúng không tách được thành hai component ở hai feature. Cả hai chiều import đều bị
ALLOWED_CROSS_FEATURE chặn.

Đặt ở `meal` vì màn này LÀ màn chốt bữa (SPEC-015 + SPEC-016, cả hai thuộc `meal`); bảng xếp
hạng là dữ liệu nó hiển thị, không phải việc nó làm. `selection` vẫn giữ trọn phần của mình:
`rankSession` ở domain, `listSessionRanking` ở application. Ánh xạ ở `app/` — đúng nơi dự án
đã đặt mọi việc lắp ráp xuyên feature — rẻ hơn một chiều cross-feature vĩnh viễn chỉ để mượn
một kiểu dữ liệu.

## Consequence

- Master Plan E5-T7 cột "File tác động" đổi sang `src/features/meal/presentation/**`.
- `countInteractionsByDish` (S3) phải trả thêm `systemTags` để client đánh giá rule được.

## Affected Documents

- Master Plan §7 — cột "File tác động" của E5-T7.
```

---

# 12. Master Plan

```markdown
| `[x] E5-T7` | Màn hình tổng hợp kèm số đếm thô | `S-10` | 2.5 | `E5-T6` | … | `src/features/meal/presentation/**` |
| `[x] E5-T8` | Khay chọn món và dựng Final Meal | … |
| `[x] E5-T9` | Hiện Required Rule chưa đạt ngay trên nút chốt | … — **Cột mốc M5** |
```

và §1: `E5` chuyển sang `[x] ✅ Xong`.
