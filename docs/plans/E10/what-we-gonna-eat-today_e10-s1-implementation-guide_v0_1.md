# 🍜 Implementation Guide — E10 Slice S1: Luật mềm và đánh giá

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-09-02`
> - **Upstream:** [Master Plan §16.5](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E10-T1`, `E10-T2`, `E10-T3`) • [SDD §8.4](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-031`, `SPEC-032`) • [Business Rules](../../what-we-gonna-eat-today_business-rules_v1.8.md) (`BR-011`, `BR-012`, `BR-014`, `BR-015`, `BR-052`) • [Decision Log](../../what-we-gonna-eat-today_decision-log_v3.9.md) (`DEC-010`, `DEC-011`, `DEC-043`) • [Test Cases](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-139`, `TC-143`, `TC-144`, `TC-153`, `TC-154`)
> - **Tiền đề:** E9-S1 xong — `startDraft` đã nhận cấu hình và set `deck_mode` trong câu UPDATE của nó.
>
> 🍜 *Slice định nghĩa. Sau slice này nhóm khai được "nên có gì" bên cạnh "phải có gì", và hệ thống đánh giá tách bạch hai loại — nhưng màn chốt bữa vẫn chưa hiện cảnh báo nào (S2 mới hiện).*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E10-T1` | Bật Preferred Rule ở màn Luật | 4 | `rule/**`, `groups/[groupId]/rules/actions.ts` | Nhóm đặt được "nên có 2 món mặn" cạnh "phải có 1 món mặn" |
| `E10-T2` | Tách cảnh báo mềm khỏi chặn cứng | 3 | `rule/domain/evaluate.ts` | `evaluateRules` trả `{ blocking, warnings }`; thiếu Preferred **không** chặn |
| `E10-T3` | Target Dish Count | 3 | `schema.ts`, `rule/**`, `session/**` | Nhóm đặt số món mục tiêu; đông cứng vào phiên lúc Start |

- [ ] Một tag mang được **cả hai** loại luật; khoá khử trùng là cặp `(ruleType, systemTag)` (§1.2)
- [ ] `listSessionRules` trả cả `REQUIRED` lẫn `PREFERRED` (§1.1)
- [ ] **Không** migration nào cho `session_rules` — snapshot đã miễn phí (§1.1)
- [ ] Chip trong sheet thêm quy định hiện đúng nhãn khi `minimumCount ≥ 2` (§1.5)
- [ ] Cột `overridable` vẫn **không ai đọc** (§1.6)
- [ ] `TC-139`, `TC-143`, `TC-144`, `TC-153`, `TC-154` xanh
- [ ] `yarn verify && yarn arch:probe && yarn test:integration` xanh

---

# 1. Sáu phát hiện — đọc trước khi gõ

## 1.1 Snapshot Preferred là MIỄN PHÍ; chỗ phải sửa là phía ĐỌC

[`buildSnapshotStatement`](../../../src/features/rule/infrastructure/drizzle-rule-repository.ts) select `groupRules.ruleType` và `WHERE` chỉ có `session.id` + `state = 'DRAFT'` — **không lọc `ruleType`**. Nên ngay khi `group_rules` có dòng `PREFERRED`, nó tự đông cứng sang `session_rules` theo `BR-015`, không sửa một dòng SQL nào.

Ngược lại, `listSessionRules` **có** lọc:

```ts
.where(and(eq(sessionRules.sessionId, sessionId), eq(sessionRules.ruleType, 'REQUIRED')))
```

kèm doc comment ghi *"Chỉ trả rule `REQUIRED` — v1.0 không có Preferred (F22, v1.1), và người gọi (`finalizeSession`, S3) chỉ biết đánh giá Required"*.

Đó là chỗ **duy nhất** phải sửa trên đường snapshot: bỏ mệnh đề lọc, trả cả hai loại, và **xoá đoạn comment đó** — để lại thì nó mâu thuẫn với code ngay dưới nó, đúng cái bẫy đã gặp ở `dish-card.ts` (E9 §1.1) và `dish-score-row.tsx` (E7 §1.4).

Kiểu trả về đổi từ `RequiredRule[]` sang một kiểu mang `ruleType`. `TAG_ORDER` sort hiện có vẫn giữ, nhưng sort thêm một tầng theo `ruleType` để `REQUIRED` luôn đứng trước — thứ tự hiển thị ở `FinalizeBar` (S2) dựa vào đó.

**Hệ quả tốt:** `E10-T1` không cần migration, không đụng `startDraft`, không đụng `session_rules`.

## 1.2 `readGroupRules` khử trùng sai khoá

[`readGroupRules`](../../../src/features/rule/domain/group-rule.ts) dùng `seen.add(rule.systemTag)` — một tag chỉ được xuất hiện một lần trong cả rule set. DB thì khoá `UNIQUE(group_id, rule_type, system_tag)` (xem [schema.ts](../../../src/shared/db/schema.ts)).

Với `F22`, hai dòng này đều hợp lệ và là cách diễn đạt tự nhiên nhất của tính năng:

> Phải có ít nhất **1** món mặn. — Nên có **2** món mặn.

Sàn là 1, mong muốn là 2. Khoá khử trùng đổi thành `${ruleType}:${systemTag}`.

Ba kiểu phải thêm `ruleType`:

| Kiểu | File | Ghi chú |
| --- | --- | --- |
| `GroupRuleDraft` | `rule/domain/group-rule.ts` | Comment hiện ghi *"KHÔNG có `ruleType` … v1.0 chỉ đặt Required Rule"* — **sửa comment**, lý do đã hết hiệu lực |
| `RawGroupRule` | cùng file | Đầu vào thô từ form |
| `GroupRuleRecord` | `rule/application/rule-repository.ts` | Phía đọc |

`replaceGroupRules` ghi đè **toàn bộ** rule set trong một `db.batch()` (DELETE + INSERT), nên Preferred đi chung một lần ghi với Required — **không** cần đường ghi thứ hai, và `infrastructure` thôi đóng đinh `ruleType: 'REQUIRED'`.

`usedTags` trong [`group-rules-screen.tsx`](../../../src/features/rule/presentation/components/group-rules-screen.tsx) hiện là `new Set(rules.map(r => r.systemTag))`, truyền xuống `AddRuleSheet` để chặn trùng. Nó phải thành **per-type**: sheet đang thêm luật `PREFERRED` chỉ được chặn các tag đã có luật `PREFERRED`.

## 1.3 Cảnh báo có hai hình dạng — đừng ép vào một

`RuleShortfall` hiện là `{ systemTag, minimumCount, actual, missing }`, gắn chặt với một System Tag.

Lệch Target Count **không gắn tag nào**: *"bạn chọn 6 món, nhà mình thường ăn 4"*. Nhét nó vào `RuleShortfall` buộc phải bịa một `systemTag` giả, và mọi chỗ render sẽ phải rẽ nhánh trên giá trị giả đó — kể cả `ruleShortfallPhrase` vốn tra thẳng `TAG_IN_SENTENCE[systemTag]`.

Union có thẻ phân biệt:

```ts
/** Vi phạm luật Bắt buộc — CHẶN chốt bữa (BR-052). Giữ nguyên hình dạng cũ
 *  để `ruleShortfallPhrase` và `TC-072` không phải đổi. */
export type RuleShortfall = {
  readonly systemTag: SystemTag
  readonly minimumCount: number
  readonly actual: number
  readonly missing: number
}

/**
 * Cảnh báo MỀM — không chặn (BR-014, BR-011). Union có thẻ vì hai loại khác
 * hình dạng: thiếu Preferred gắn với một System Tag, lệch Target Count thì
 * không gắn tag nào (Guide §1.3).
 */
export type RuleWarning =
  | ({ readonly kind: 'PREFERRED_SHORTFALL' } & RuleShortfall)
  | {
      readonly kind: 'TARGET_COUNT'
      readonly direction: 'OVER' | 'UNDER'
      readonly target: number
      readonly actual: number
    }

export type RuleEvaluation = {
  readonly blocking: readonly RuleShortfall[]
  readonly warnings: readonly RuleWarning[]
}
```

**`satisfied` biến mất.** Người gọi đọc `blocking.length === 0`. Giữ nó lại thì tên trường nói dối — một nháp có `warnings` vẫn "satisfied", và ai đọc lướt sẽ tưởng ngược lại.

`evaluateRequired` đổi tên thành **`evaluateRules`**. Đổi tên chứ không thêm hàm thứ hai: hai hàm cùng quét một danh sách món theo hai tập luật là hai vòng lặp giống hệt nhau, và chúng sẽ lệch nhau ở lần sửa `Independent Tag Counting` tiếp theo.

`tsc` sẽ chỉ ra đúng hai chỗ gọi: [`FinalizeBar`](../../../src/features/meal/presentation/components/finalize-bar.tsx) và [`finalizeSession`](../../../src/features/meal/application/finalize-session.ts).

## 1.4 Independent Tag Counting áp cho CẢ HAI loại

Comment hiện có ở [`evaluate.ts`](../../../src/features/rule/domain/evaluate.ts) là phần quan trọng nhất của file, giữ nguyên và mở rộng:

> Chỗ dễ sai nhất nằm ở cấu trúc chứ không ở phép đếm: nếu viết vòng lặp NGOÀI theo `dishes` (mỗi món tìm một rule để "gán vào") thì slot allocation xuất hiện gần như không tránh được.

Với hai loại luật, cám dỗ mới là gộp một vòng lặp rồi rẽ nhánh `if (rule.ruleType === …)` bên trong. Được — miễn vòng ngoài vẫn theo `rules`. Cái **không** được là lọc `rules` thành hai mảng rồi chạy hai vòng lặp có thân giống nhau; đó là chỗ sẽ lệch.

`N ≤ 10` luật × `N ≤ 10` món. Không có gì để tối ưu.

## 1.5 Sheet thêm quy định đang cắt tiền tố bằng string replace — và nó đã sai

[`add-rule-sheet.tsx`](../../../src/features/rule/presentation/components/add-rule-sheet.tsx) render nhãn chip bằng:

```tsx
{ruleSentence({ systemTag: tag, minimumCount }).replace('Phải có ít nhất 1 ', '')}
```

Dựng cả câu rồi cắt tiền tố bằng chuỗi cứng. Hai vấn đề, và vấn đề thứ nhất **đang sống**:

1. `minimumCount` là state của sheet. Người dùng chỉnh lên `2` **trước khi** chọn tag → `ruleSentence` trả *"Phải có ít nhất 2 món canh"*, chuỗi `'Phải có ít nhất 1 '` không khớp, và chip hiện **nguyên cả câu** thay vì hai chữ "món canh".
2. `E10-T1` thêm biến thể *"Nên có ít nhất N …"* — tiền tố đổi, phép cắt hỏng nốt.

`TAG_IN_SENTENCE` trong [`system-tag-label.ts`](../../../src/shared/ui/system-tag-label.ts) đã có sẵn đúng cụm cần dùng (`SOUP → 'món canh'`). Dùng thẳng nó:

```tsx
{TAG_IN_SENTENCE[tag]}
```

Một dòng, xoá cả hai vấn đề. Đây là loại lỗi mà `E9-T0` cũng gặp: một fallback/biến đổi chuỗi trông như lựa chọn thiết kế nên không ai nghi ngờ.

## 1.6 `overridable` đang chết — đừng đánh thức nó

Cột `group_rules.overridable` (`boolean NOT NULL DEFAULT true`) **không ai đọc**: `grep` chỉ ra `schema.ts` và các file migration, không có chỗ nào khác.

Nó thuộc `F35` Override Session Rule (v1.2). E10 ngồi ngay trong bảng đó nên rất dễ vô tình gán nghĩa cho nó — ví dụ dùng `overridable = false` để biểu diễn "luật bắt buộc". **Đừng.** Loại luật đã có `ruleType`; `overridable` trả lời một câu khác (*"Creator có được phép bỏ qua luật này trong MỘT phiên cụ thể không"*), và một cột `overridable = true` trên luật `REQUIRED` vốn chặn cứng là mâu thuẫn đang ngủ.

[Tech Spec §3.1](../../what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) đã cố ý bỏ cột này khỏi `session_rules` với lý lẽ đúng: *"có cho phép Creator override không là thuộc tính của quy định GỐC, không phải của bản sao đã đóng băng"*. Giữ nguyên trạng.

---

# 2. File tree

```text
src/features/rule/
├── domain/
│   ├── group-rule.ts              # E10-T1 — +ruleType, khoá khử trùng (§1.2)
│   ├── group-rule.test.ts
│   ├── evaluate.ts                # E10-T2 — evaluateRules, RuleWarning (§1.3)
│   └── evaluate.test.ts
├── application/
│   ├── rule-repository.ts         # E10-T1 — GroupRuleRecord.ruleType
│   └── set-group-rules.ts
├── infrastructure/
│   └── drizzle-rule-repository.ts # E10-T1 — bỏ lọc REQUIRED (§1.1)
└── presentation/components/
    ├── group-rules-screen.tsx     # E10-T1 — hai nhóm, trường ghép (§2.1)
    ├── add-rule-sheet.tsx         # E10-T1 — sửa nhãn chip (§1.5)
    ├── rule-sentence.ts           # E10-T1 — biến thể "Nên có"
    └── rule-sentence.test.ts

src/app/groups/[groupId]/rules/actions.ts   # E10-T1 — đọc trường ghép

src/shared/db/
├── schema.ts                      # E10-T3 — hai cột target_dish_count
└── migrations/0014_target_dish_count.sql

src/features/session/
├── application/session-repository.ts       # E10-T3 — startDraft mang targetDishCount
└── infrastructure/drizzle-session-repository.ts
```

---

# 3. `E10-T1` — Bật Preferred Rule

## 3.1 Form: ba mảng song song → một trường ghép

[`rules/actions.ts`](../../../src/app/groups/[groupId]/rules/actions.ts) hiện đọc **hai mảng song song**, kèm comment nói rõ *"ghép theo chỉ số"*:

```ts
const tags = formData.getAll('systemTag').map(String)
const counts = formData.getAll('minimumCount').map((value) => Number(value))
```

Hai mảng còn chịu được. Ba là chỗ bắt đầu cắn — chúng chỉ thẳng hàng chừng nào cả ba input được render trong **cùng một** `map`, và không ai lỡ thêm một nhánh điều kiện quanh một trong ba.

Gộp thành một trường:

```tsx
{/* MỘT trường thay vì ba mảng song song: không có thứ tự nào để lệch.
    Dấu `:` an toàn vì cả ba thành phần đều là enum hoặc số nguyên. */}
<input
  type="hidden"
  name="rule"
  value={`${rule.ruleType}:${rule.systemTag}:${rule.minimumCount}`}
/>
```

Action tách với kiểm nghiêm ngặt — **không** dùng `split(':')` trần rồi tin vào chỉ số:

```ts
const rules = formData.getAll('rule').map(String).map(parseRuleField)
```

`parseRuleField` trả `RawGroupRule` với `ruleType`/`systemTag` để nguyên dạng chuỗi và `minimumCount` là `Number(...)`. **Không validate ở đây** — `readGroupRules` là chỗ validate, và nó đã có ba mã lỗi cho ba ca sai. Chuỗi hỏng (`split` ra ≠ 3 phần) đi vào `readGroupRules` như một tag không hợp lệ và ra `ERR_INVALID_SYSTEM_TAG`, đúng chỗ.

## 3.2 Màn Luật: hai nhóm

[`group-rules-screen.tsx`](../../../src/features/rule/presentation/components/group-rules-screen.tsx) ghi ở đầu file:

> CHỈ dựng nhóm "Bắt buộc" — nhóm "Nên có" trong mockup là Preferred Rule (F22, v1.1), và một mục trống mang tiêu đề "Nên có" là lời hứa v1.0 không giữ được

`E10-T1` là lúc dựng nó. **Xoá đoạn comment đó.**

Hai nhóm, mỗi nhóm một tiêu đề và một nút "Thêm quy định" riêng — nút phải biết nó đang thêm loại nào, và `usedTags` truyền xuống sheet là tập tag **của loại đó** (§1.2).

Nhóm rỗng thì ẩn hẳn, **không** hiện `EmptyStateCard` riêng cho từng nhóm: `EmptyStateCard` hiện tại nói về cả rule set (*"Lúc chốt bữa sẽ không có gì được kiểm tra"*) và câu đó chỉ đúng khi **cả hai** nhóm rỗng.

## 3.3 `ruleSentence` hai biến thể

```ts
export function ruleSentence(rule: {
  systemTag: SystemTag
  minimumCount: number
  ruleType: 'REQUIRED' | 'PREFERRED'
}): string {
  const prefix = rule.ruleType === 'REQUIRED' ? 'Phải có ít nhất' : 'Nên có ít nhất'
  return `${prefix} ${rule.minimumCount} ${TAG_IN_SENTENCE[rule.systemTag]}`
}
```

Và sửa `add-rule-sheet.tsx` theo §1.5 — nhãn chip dùng thẳng `TAG_IN_SENTENCE[tag]`, thôi cắt tiền tố.

## 3.4 Test

| Ca | Tầng | Kỳ vọng |
| --- | :---: | --- |
| `TC-153` | `A` | `[REQUIRED:MAIN:1, PREFERRED:MAIN:2]` → hợp lệ, ghi đủ hai dòng |
| — | `D` | `[REQUIRED:MAIN:1, REQUIRED:MAIN:2]` → `DUPLICATE_RULE` |
| `TC-154` | `I` | Nhóm có 1 Required + 1 Preferred → Start phiên → `session_rules` có **đủ hai dòng**, không sửa đường ghi nào |
| — | `I` | `listSessionRules` trả cả hai loại, `REQUIRED` đứng trước |
| — | `D` | `ruleSentence` với `PREFERRED` → *"Nên có ít nhất 2 món mặn"* |
| — | component | Sheet với `minimumCount = 2` → chip hiện **"món canh"**, không phải cả câu (§1.5) |

---

# 4. `E10-T2` — Tách cảnh báo mềm khỏi chặn cứng

## 4.1 `evaluateRules`

Kiểu ở §1.3. Chữ ký:

```ts
export function evaluateRules(input: {
  readonly rules: readonly SessionRule[]        // cả REQUIRED lẫn PREFERRED
  readonly dishes: readonly TaggedDish[]
  /** `null` = nhóm chưa đặt Target Count → không sinh cảnh báo nào (E10-T3). */
  readonly targetDishCount: number | null
}): RuleEvaluation
```

- `REQUIRED` thiếu → `blocking`.
- `PREFERRED` thiếu → `warnings` với `kind: 'PREFERRED_SHORTFALL'`.
- `targetDishCount !== null` và `dishes.length !== target` → `warnings` với `kind: 'TARGET_COUNT'`.

Thứ tự trong `warnings`: các `PREFERRED_SHORTFALL` theo đúng thứ tự `rules` (giữ hợp đồng cũ của `shortfalls`), rồi `TARGET_COUNT` cuối cùng — nó nói về cả mâm chứ không về một tag, nên đứng sau.

## 4.2 Hai chỗ gọi

`tsc` chỉ ra đúng hai:

- [`finalizeSession`](../../../src/features/meal/application/finalize-session.ts) bước 6 — đổi `!evaluation.satisfied` thành `evaluation.blocking.length > 0`, và `shortfalls: evaluation.shortfalls` thành `evaluation.blocking`. `warnings` **chưa dùng ở S1** (S2 mới ghi vết) — nhưng đừng bỏ qua nó bằng `void`; để `tsc` nhắc khi S2 tới.
- [`FinalizeBar`](../../../src/features/meal/presentation/components/finalize-bar.tsx) — S1 chỉ đổi cho biên dịch được, phần hiển thị cảnh báo thuộc S2. Giữ nguyên hành vi nhìn thấy được.

> [!NOTE]
> `FinalizeBar` gọi hàm này **ở client, mỗi lần render** (`BR-051` Live Composition Feedback). Nên `evaluateRules` phải giữ nguyên tính thuần tuyệt đối — không đọc `Date`, không đọc config toàn cục. Comment tại chỗ đã nói *"client cho tức thì, server cho đúng. Lệch nhau thì server thắng."*

## 4.3 Test — `TC-139`

Thiếu 1 `REQUIRED` và 1 `PREFERRED` → `blocking` có đúng 1 phần tử, `warnings` có đúng 1, và **chỉ** `blocking` chặn Finalize.

Cộng: Independent Tag Counting với món hai tag đóng góp cho cả một luật `REQUIRED MAIN` lẫn một luật `PREFERRED SOUP` (§1.4).

---

# 5. `E10-T3` — Target Dish Count

## 5.1 Hai cột

```ts
// groups
targetDishCount: integer('target_dish_count'),          // NULL = chưa đặt

// selection_sessions — bản đông cứng lúc Start (BR-015)
targetDishCount: integer('target_dish_count'),
```

Cả hai **nullable**, không `default`. `NULL` là *"nhóm chưa đặt"*, và khi `NULL` thì `evaluateRules` im lặng (`TC-144`). Một `DEFAULT 0` sẽ biến "chưa đặt" thành "mục tiêu 0 món" và cảnh báo mọi bữa.

Thêm `check('groups_target_dish_count_positive', sql\`target_dish_count >= 1\`)` — cùng khuôn `group_rules_minimum_count_positive` đã có.

## 5.2 Đông cứng lúc Start

`startDraft` đã nhận cấu hình từ E9 và có sẵn một câu UPDATE với `.set({ state, startedAt, deckMode })`. Thêm `targetDishCount` vào **chính câu đó** — không thêm câu lệnh nào vào `db.batch()`.

Giá trị lấy từ `groups.target_dish_count` tại thời điểm Start. Vì nó không đến từ form (khác `deck_mode`), đọc nó bằng một `SELECT` trong cùng batch không được — `db.batch()` không cho câu sau đọc kết quả câu trước. Hai đường:

| Cách | Đánh giá |
| --- | --- |
| Đọc `groups.target_dish_count` **trước** batch rồi truyền vào | ✅ Đúng nguyên tắc *"đọc trước, ghi nguyên tử sau"* đã ghi ở `finalizeSession` bước 7 |
| `UPDATE … SET target_dish_count = (SELECT … FROM groups …)` | Tự chứa, nhưng nhét một subquery vào câu UPDATE vốn đang làm ba việc |

Chọn cách thứ nhất. `startSession` đọc `group` không được (`session` không import `group`) — nên giá trị đi vào qua `deps`, cùng khuôn `findInvalidParticipants` đã có.

## 5.3 Cấu hình ở màn Luật

Một ô số ngay dưới hai nhóm luật, nhãn *"Số món thường ăn mỗi bữa"* kèm câu phụ *"Để trống nếu nhà mình không cố định"*. Gửi lên cùng form (`name="targetDishCount"`, chuỗi rỗng = `null`).

`setGroupRules` nhận thêm `targetDishCount: number | null` và ghi cùng `replaceGroupRules` — hai bảng khác nhau nên là hai lệnh, nhưng cùng một `db.batch()`: người dùng bấm "Lưu quy định" một lần thì hoặc cả hai đổi, hoặc không cái nào.

## 5.4 Test

| Ca | Tầng | Kỳ vọng |
| --- | :---: | --- |
| `TC-143` | `D` | `target = 4`, nháp 6 món → `warnings` có `TARGET_COUNT` với `direction: 'OVER'`; `blocking` rỗng |
| `TC-144` | `D` | `target = null` → không sinh cảnh báo nào |
| — | `D` | `target = 4`, nháp 4 món → không cảnh báo |
| — | `I` | Đặt `target = 4`, Start phiên, đổi `groups.target_dish_count = 6` → `selection_sessions.target_dish_count` **vẫn là 4** (`BR-015`) |

Ca cuối là ca canh việc đông cứng, và là lý do duy nhất cột thứ hai tồn tại.

---

# 6. Rủi ro

| Rủi ro | Dấu hiệu | Xử lý |
| --- | --- | --- |
| Sửa `buildSnapshotStatement` cho Preferred | Một migration hoặc một câu SQL không cần thiết | §1.1 — snapshot đã miễn phí |
| Giữ `satisfied` | Nháp có cảnh báo vẫn báo "satisfied" | §1.3 — đọc `blocking.length` |
| Hai vòng lặp cho hai loại luật | Chúng lệch nhau ở lần sửa Tag Counting tiếp theo | §1.4 — một vòng ngoài theo `rules` |
| `usedTags` không tách theo loại | Không thêm được Preferred cho tag đã có Required | §1.2 |
| Gán nghĩa cho `overridable` | Mâu thuẫn với `ruleType` | §1.6 |
| `DEFAULT 0` cho Target Count | Mọi bữa đều cảnh báo | §5.1 — nullable |
| Ba mảng song song trong form | Lệch hàng khi có nhánh điều kiện | §3.1 — trường ghép |
| Giữ `.replace('Phải có ít nhất 1 ', '')` | Chip hiện cả câu khi `minimumCount ≥ 2` | §1.5 |

---

# 7. Test Cases coverage

`TC-139` §4.3 • `TC-143`, `TC-144` §5.4 • `TC-153`, `TC-154` §3.4 • bốn ca không mã: khử trùng theo cặp, `ruleSentence` biến thể, chip sheet, đông cứng Target Count.

---

# 8. Thứ tự TDD

1. `evaluate.test.ts` — `TC-139` + ca Tag Counting hai loại (đỏ) → `evaluateRules` (xanh). `tsc` đỏ ở hai chỗ gọi; sửa cho biên dịch được, chưa đổi hành vi nhìn thấy.
2. `group-rule.test.ts` — `TC-153` + ca trùng cặp (đỏ) → `readGroupRules` (xanh).
3. `listSessionRules` bỏ lọc; integration `TC-154`.
4. `rule-sentence.test.ts` + sửa `add-rule-sheet.tsx` (§1.5).
5. Màn Luật hai nhóm + trường ghép + action.
6. Schema Target Count + migration `0014` → đọc SQL → `db:migrate`.
7. `startDraft` mang `targetDishCount`; integration ca đông cứng.
8. Nhánh `TARGET_COUNT` trong `evaluateRules` (`TC-143`, `TC-144`).
9. `yarn verify && yarn arch:probe && yarn test:integration`.

Bước 1 đứng đầu vì `evaluateRules` là hợp đồng mà mọi thứ còn lại bám vào; đổi nó sớm để `tsc` dẫn đường phần còn lại.

---

# 9. Verify

## 9.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn test:integration
```

## 9.2 Bằng chứng luật mềm tồn tại

Trên máy thật:

1. Vào màn Quy định, thêm *"Phải có ít nhất 1 món mặn"* và *"Nên có ít nhất 2 món mặn"* — **cả hai cùng tag, cùng lưu được**.
2. Đặt *"Số món thường ăn mỗi bữa"* = 4, lưu.
3. Mở phiên. `yarn db:studio`: `session_rules` có **hai** dòng cho `MAIN` (một `REQUIRED`, một `PREFERRED`); `selection_sessions.target_dish_count = 4`.
4. Đổi `groups.target_dish_count` thành 6, tải lại phiên đang chạy: `selection_sessions.target_dish_count` **vẫn 4**.

Bước 3 là bằng chứng snapshot miễn phí (§1.1); bước 4 là bằng chứng `BR-015`.

## 9.3 Bằng chứng chốt bữa chưa đổi hành vi

Màn chốt bữa sau S1 phải **giống hệt** trước E10: thiếu Required vẫn chặn, thiếu Preferred **chưa** hiện gì. Cảnh báo là việc của S2. Nếu thấy chữ lạ trên `FinalizeBar` sau slice này, `E10-T2` đã làm quá phần của nó.

---

# 10. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v3.9.md`

```markdown
# DEC-067 — Cảnh Báo Mềm Là Union Có Thẻ; `satisfied` Biến Mất; Một Tag Mang Được Hai Loại Luật

- **Ngày:** 2026-09-02
- **Trạng thái:** Accepted
- **Bối cảnh:** E10 Slice S1

## Quyết định

1. `evaluateRequired` đổi tên thành `evaluateRules`, trả `{ blocking, warnings }`.
   Trường `satisfied` bị xoá.
2. `RuleWarning` là union có thẻ: `PREFERRED_SHORTFALL` (gắn tag) và
   `TARGET_COUNT` (không gắn tag).
3. Một System Tag mang được đồng thời một luật `REQUIRED` và một luật
   `PREFERRED`; khoá khử trùng của `readGroupRules` đổi sang `(ruleType, systemTag)`.
4. Target Dish Count có HAI cột: `groups.target_dish_count` để cấu hình và
   `selection_sessions.target_dish_count` đông cứng lúc Start.
5. Cột `group_rules.overridable` vẫn không ai đọc; E10 không gán nghĩa cho nó.

## Rationale

1. `satisfied` nói dối khi có hai loại kết quả: một nháp có `warnings` vẫn
   "satisfied", và ai đọc lướt sẽ tưởng ngược lại. `blocking.length === 0` nói
   đúng thứ nó nói.
2. Lệch Target Count không gắn tag nào. Nhét nó vào `RuleShortfall` buộc phải
   bịa một `systemTag` giả, và `ruleShortfallPhrase` tra thẳng
   `TAG_IN_SENTENCE[systemTag]` sẽ in ra một cụm từ vô nghĩa.
3. "Phải có ít nhất 1 món mặn, nên có 2" là cách diễn đạt tự nhiên nhất của
   `F22` — sàn và mong muốn là hai con số khác nhau. DB đã khoá theo bộ ba từ
   E5; chỉ tầng domain khử trùng theo tag đơn, và đó là chỗ lệch.
4. `BR-015` đã chốt nguyên tắc cho Session Rule: Admin đổi cấu hình giữa phiên
   không được đổi luật của phiên đang chạy. Target Count là cùng loại cấu hình;
   đọc live tạo ra một ngoại lệ không giải thích được.
5. `overridable` trả lời câu KHÁC `ruleType` — "Creator có được bỏ qua luật này
   trong MỘT phiên cụ thể không" (`F35`, v1.2). Dùng nó để biểu diễn loại luật
   là làm hỏng cả hai khái niệm.

## Consequence

- `evaluateRules` chạy ở CẢ client (`FinalizeBar`, `BR-051`) lẫn server
  (`finalizeSession` bước 6), nên phải giữ tính thuần tuyệt đối.
- Snapshot Preferred không tốn gì: `buildSnapshotStatement` vốn không lọc
  `ruleType`. Chỗ sửa duy nhất là `listSessionRules` phía đọc.
- Form màn Luật đổi từ hai mảng song song sang một trường giá trị ghép — thêm
  mảng thứ ba là chỗ chúng bắt đầu lệch hàng.
```

---

# 11. Master Plan

[§16.5](../../what-we-gonna-eat-today_master-plan_v2.1.md): gắn nhãn `S1` cho `E10-T1`, `E10-T2`, `E10-T3`; DoD của `E10-T1` bỏ phần snapshot (§1.1); DoD của `E10-T2` nói rõ hai hình dạng cảnh báo.
