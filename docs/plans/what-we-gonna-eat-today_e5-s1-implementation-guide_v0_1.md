# 📏 Implementation Guide — E5 Slice S1: Quy định mâm cơm của nhóm

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-20`
> - **Upstream:** [Master Plan](../what-we-gonna-eat-today_master-plan_v1_0.md) (`E5-T1`, `E5-T1b`, `E5-T2`) • [SDD](../what-we-gonna-eat-today_sdd_v0_1.md) (`SPEC-021`) • [Tech Spec](../what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) (§3.1 dòng 159–161) • [Business Rules](../what-we-gonna-eat-today_business-rules_v1.4.md) (`BR-010`→`BR-013`) • [Test Cases](../what-we-gonna-eat-today_test-cases-specification_v0_1.md) (`TC-085`→`TC-089`) • [Design](../designs/README.md)
> - **Tiền đề:** `E2-T5` đã code (`group_dish_tags`, `SystemTag` domain), `E1-T3` đã code (`assertGroupAccess`).
>
> 📏 *Slice mở đầu E5. Sau slice này Group Admin đặt được quy định "phải có ít nhất 1 món canh" — nhưng chưa có gì kiểm tra nó. Việc kiểm tra là S2/S3.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | --- | :---: | --- |
| `E5-T1` | Schema `group_rules` và CRUD | 2 | `src/features/rule/**` | Lưu danh sách rỗng thì Group không còn rule nào |
| `E5-T1b` | Màn hình S-07 "Quy định bữa ăn" | 2 | `src/features/rule/presentation/**`, `src/app/groups/[groupId]/rules/**` | Admin đặt được rule trên điện thoại, Member không thấy nút sửa |
| `E5-T2` | Invariant của rule ép ở tầng DB | 2 | `src/shared/db/schema.ts`, migration | `unique(group_id, rule_type, system_tag)` và `check(minimum_count >= 1)` là ràng buộc THẬT trong DB |

- [ ] `TC-085`→`TC-089` pass
- [ ] `psql \d+ group_rules` in ra cả `UNIQUE` lẫn `CHECK` — không chỉ tin file schema TS
- [ ] `SystemTag` chỉ còn MỘT định nghĩa union trong `src/`, ở `shared/domain/`
- [ ] Member (không Admin) mở `/groups/<id>/rules` thì thấy danh sách nhưng không có nút "Thêm quy định"
- [ ] `yarn verify && yarn arch:probe` xanh

> [!NOTE]
> **`E5-T1b` là subtask BỔ SUNG, không có trong Master Plan v1.3.** Master Plan §7 giao `E5-T1` đúng tầng `application` và không có subtask UI nào cho màn "Quy định bữa ăn" — nghĩa là Admin không có đường nào đặt rule, và cả E5 (`E5-T3`→`E5-T9`) chạy trên một bảng vĩnh viễn rỗng. Bổ sung này đã được duyệt; §12 ghi dòng phải thêm vào Master Plan, §11 ghi block Decision Log.

---

# 1. Năm phát hiện — đọc trước khi gõ

## 1.1 `SystemTag` bị nhốt trong feature `dish`, mà `rule` cần nó

`SystemTag`, `SYSTEM_TAGS`, `isSystemTag` đang ở `src/features/dish/domain/system-tag.ts`. Bảng cross-feature trong `eslint.config.mjs` như sau:

```js
const ALLOWED_CROSS_FEATURE = {
  selection: ['history', 'dish'],
  meal: ['rule', 'history'],
}
```

Không có mục `rule`, nên `rule → dish` **bị chặn**. Và ở S3, `meal` cũng cần `SystemTag` (để so tag hiện tại của món với rule) mà `meal → dish` cũng không có trong bảng.

Ba lối đi, chọn lối thứ ba:

| Lối | Vì sao loại / chọn |
| --- | --- |
| Thêm `rule: ['dish']` và `meal: [..., 'dish']` | Nới bảng cross-feature hai chiều chỉ để lấy một union 5 phần tử. Tech Spec §2.3 cố ý giữ bảng này nhỏ. |
| Khai bản sao union trong `rule/domain` | Thành **bản sao thứ ba** (đã có `dish/domain` + `pgEnum` ở `schema.ts:165`). Hai bản đã phải kèm ghi chú "sửa một bên thì sửa cả hai"; ba bản là lúc nó bắt đầu lệch thật. |
| **Chuyển lên `shared/domain/`** ✅ | `shared/` mọi feature import được, không đụng bảng cross-feature, và số bản sao giữ nguyên ở 2. |

**Việc phải làm:** tạo `src/shared/domain/system-tag.ts` chứa `SystemTag`, `SYSTEM_TAGS`, `isSystemTag`. `src/features/dish/domain/system-tag.ts` **giữ nguyên đường dẫn** và giữ lại `readSystemTags`, `toSystemTags`, `SystemTagError` — hai hàm này là luật nhập liệu của feature `dish` (`TC-021`, `TC-100`, `TC-101`), không phải kiến thức chung — rồi `export type { SystemTag }` lại để 12 chỗ đang import không phải đổi hàng loạt.

Ghi Decision Log (§11, `DEC-040`).

## 1.2 Schema đi theo Tech Spec §3.1 nguyên văn — kể cả cột v1.0 không đọc

Tech Spec §3.1 (dòng 159–161) ghi:

```text
group_rules(id, group_id, system_tag, minimum_count, rule_type, overridable)
  unique(group_id, rule_type, system_tag)
  check(minimum_count >= 1)
```

Có hai cột mà v1.0 không có hàm nào đọc: `rule_type` (chỉ ghi `REQUIRED`; `PREFERRED` là `F22`, v1.1) và `overridable` (`BR-017` Override — `F35`, v1.2).

Điều này **nhìn giống** vi phạm nguyên tắc đã ghi ở `selection/domain/ranking.ts:5` (*"thêm một trường mà không hàm nào tính ra được giá trị thật cho nó chỉ tạo ảo giác tính năng đã có"*). Nó không phải, và lý do đáng viết ra vì nó sẽ còn tái xuất:

- **Kiểu TypeScript sửa được miễn phí.** Thêm một trường vào `RankingInput` ở v1.1 là một dòng diff. Nên chỗ đó chờ tới lúc có dữ liệu thật là đúng.
- **Cột trong DB thì không.** Migration chỉ thêm, không sửa lại; thêm cột vào bảng đang có dữ liệu ở v1.1 tốn một migration + một lần backfill + một cửa sổ mà code cũ và schema mới cùng tồn tại.
- Và `rule_type` **bắt buộc phải có ngay**: DoD của `E5-T2` đòi ràng buộc `unique(group_id, rule_type, system_tag)`, không viết được nếu thiếu cột.

Nên: schema theo Tech Spec đủ 6 cột; **kiểu ở `domain/` chỉ có `systemTag` + `minimumCount`**. Hai tầng lệch nhau có chủ ý, `infrastructure/` là chỗ chúng gặp nhau (đóng đinh `ruleType: 'REQUIRED'`).

## 1.3 `check()` của drizzle-kit phải xác minh bằng SQL sinh ra, không tin file TS

`drizzle-orm/pg-core` có export `check` (đã kiểm: `check`, `integer`, `boolean` đều có trong `drizzle-orm@0.45.2`). Nhưng đây là **ràng buộc DB đầu tiên của dự án không phải unique/PK** — chưa có tiền lệ nào trong 8 migration trước để dựa vào.

DoD của `E5-T2` là *"ràng buộc THẬT trong DB"*, nên bước xác minh không phải tuỳ chọn:

1. `yarn db:generate` → **mở file `.sql` sinh ra và đọc bằng mắt**, tìm chữ `CHECK`.
2. Nếu `drizzle-kit` không phát ra, viết tay vào chính file migration đó — `src/shared/db/migrations/**` nằm trong `.prettierignore` và trong `ignores` của ESLint, sửa tay là hợp lệ và đã có tiền lệ ở `0003`.
3. Sau `yarn db:migrate`, chạy `\d+ group_rules` trong psql và dán kết quả vào PR.

## 1.4 Thiết kế S-07 có mục "Nên có" — v1.0 không dựng

Ảnh [s07-01-quy-dinh.png](../designs/screenshots/s07-01-quy-dinh.png) vẽ hai nhóm: *"Bắt buộc — thiếu thì không chốt được"* và *"Nên có — chỉ cảnh báo"*. Nhóm thứ hai là `Preferred Rule` (`BR-014`, `F22`, **v1.1**).

Slice này dựng **đúng nhóm "Bắt buộc"**, và không dựng khung rỗng cho nhóm kia — một mục trống với tiêu đề "Nên có" là lời hứa với người dùng mà v1.0 không giữ được. Tiêu đề nhóm cũng bỏ luôn (chỉ còn một nhóm thì không cần tiêu đề phân biệt); giữ lại nguyên văn dòng chân trang *"Quy định chỉ kiểm tra lúc chốt bữa, không chặn ai vuốt"* vì nó đúng ở v1.0 (`BR-054`).

Khối giải thích "Lúc chốt bữa" trong ảnh cũng rút còn một câu, bỏ vế nói về quy định "nên có".

## 1.5 Mã màn hình trong Master Plan đánh theo TÊN FILE ẢNH, không theo catalog

Master Plan §7 ghi `E5-T7` là `S-10`, `E4-T7` là `S-09`. Nhưng bảng catalog ở [designs/README.md §4](../designs/README.md) ghi `S-09` = *Cấu hình phiên*, `S-10` = *Xem xét chốt thực đơn*, và `S-07` = *Candidate Deck*.

Đối chiếu với thư mục ảnh thì rõ: `s09-01-deck.png` (deck — đúng thứ `E4-T7` dựng), `s10-01-tong-hop.png` (tổng hợp — đúng thứ `E5-T7` dựng), `s07-01-quy-dinh.png` (quy định — slice này). **Master Plan đánh số theo tên file ảnh.** Guide E4-S4 §4 đã vấp đúng chỗ này.

Trong toàn bộ tài liệu E5, `S-07` và `S-10` hiểu theo **tên file ảnh**. Không tự sửa `designs/README.md` — đó là tài liệu Approved của một tác giả khác, ghi nhận là đủ.

---

# 2. File tree

```
src/shared/domain/
  system-tag.ts                                   + MỚI (§3)

src/features/dish/domain/
  system-tag.ts                                   ~ SỬA — bỏ union, re-export (§3)

src/shared/db/
  schema.ts                                       ~ SỬA — groupRuleType + groupRules (§4)
  migrations/0009_group_rules.sql                 + MỚI (§4.1)

src/features/rule/domain/
  group-rule.ts                                   + MỚI (§5)
  group-rule.test.ts                              + MỚI (§5.1)

src/features/rule/application/
  rule-repository.ts                              + MỚI (§6)
  set-group-rules.ts                              + MỚI (§6.1)
  set-group-rules.test.ts                         + MỚI (§6.2)
  list-group-rules.ts                             + MỚI (§6.3)

src/features/rule/infrastructure/
  drizzle-rule-repository.ts                      + MỚI (§7)
  drizzle-rule-repository.integration.test.ts     + MỚI (§7.1)

src/features/rule/presentation/components/
  group-rules-screen.tsx                          + MỚI (§8)
  group-rules-screen.test.tsx                     + MỚI (§8.2)
  add-rule-sheet.tsx                              + MỚI (§8.1)
  rule-sentence.ts                                + MỚI (§8)
  rule-sentence.test.ts                           + MỚI (§8.3)

src/app/groups/[groupId]/rules/
  page.tsx                                        + MỚI (§9)
  actions.ts                                      + MỚI (§9.1)

src/features/group/presentation/components/
  group-overview-screen.tsx                       ~ SỬA — bật hàng "Quy định bữa ăn" (§10)
```

---

# 3. `src/shared/domain/system-tag.ts` — MỚI

```ts
/**
 * SDD §2.2 — `SystemTag = STAPLE | MAIN | SIDE | SOUP | DESSERT` (BR-003).
 *
 * Ở `shared/` chứ không ở `features/dish/` vì BA feature đọc nó: `dish` (gán
 * tag), `rule` (đặt chỉ tiêu theo tag), `meal` (đối chiếu lúc chốt). Bảng
 * `ALLOWED_CROSS_FEATURE` của `eslint.config.mjs` không cho `rule → dish` hay
 * `meal → dish`, và nới bảng đó chỉ để lấy một union 5 phần tử là đổi hợp đồng
 * kiến trúc để tránh một lần chuyển file — xem DEC-040.
 *
 * Bản sao DB của union này là `pgEnum('system_tag')` trong
 * `src/shared/db/schema.ts`. Sửa một bên thì sửa cả hai; hai chỗ đó gặp nhau
 * duy nhất ở tầng `infrastructure/`.
 */
export type SystemTag = 'STAPLE' | 'MAIN' | 'SIDE' | 'SOUP' | 'DESSERT'

/**
 * Thứ tự CHUẨN của bữa cơm Việt: Cơm → Món mặn → Món phụ → Canh → Tráng miệng.
 * Là thứ tự của MÂM CƠM, không phải quyết định thẩm mỹ — mọi nơi đọc tag đều
 * chuẩn hoá về nó để so sánh được bằng `toEqual`. Nhãn tiếng Việt thuộc
 * presentation (`system-tag-label.ts`).
 */
export const SYSTEM_TAGS = [
  'STAPLE',
  'MAIN',
  'SIDE',
  'SOUP',
  'DESSERT',
] as const satisfies readonly SystemTag[]

export function isSystemTag(value: string): value is SystemTag {
  return (SYSTEM_TAGS as readonly string[]).includes(value)
}
```

`src/features/dish/domain/system-tag.ts` sau khi sửa: xoá ba khai báo trên, thêm ở đầu file

```ts
import { SYSTEM_TAGS, isSystemTag, type SystemTag } from '@/shared/domain/system-tag'

// Giữ đường import cũ còn hiệu lực cho 12 chỗ trong `features/dish/**` —
// chuyển nhà một kiểu dữ liệu không đáng làm bẩn 12 file diff.
export { SYSTEM_TAGS, isSystemTag }
export type { SystemTag }
```

giữ nguyên `SystemTagError`, `readSystemTags`, `toSystemTags` cùng toàn bộ ghi chú của chúng.

> [!WARNING]
> Sau bước này chạy `yarn knip` ngay. Nếu `isSystemTag` re-export mà không ai trong `features/dish/**` gọi tới, knip sẽ báo export chết — lúc đó bỏ nó khỏi dòng `export {}` và để `features/dish` import thẳng từ `@/shared/domain/system-tag`.

---

# 4. Schema — `groupRules`

Thêm vào `src/shared/db/schema.ts`, đặt **ngay sau `groupDishTags`** (cùng cụm "cấu hình của Group", trước cụm Session):

```ts
/**
 * BR-012 — `rule_type` phân biệt Required (chặn Finalize) với Preferred (chỉ
 * cảnh báo). v1.0 CHỈ ghi `REQUIRED`; `PREFERRED` là F22, v1.1.
 *
 * Cột vẫn có mặt ngay từ migration đầu vì ràng buộc `unique(group_id,
 * rule_type, system_tag)` của Tech Spec §3.1 không viết được nếu thiếu nó —
 * và vì cột DB đắt hơn kiểu TS rất nhiều khi phải thêm sau (Guide §1.2).
 */
export const groupRuleType = pgEnum('group_rule_type', ['REQUIRED', 'PREFERRED'])

/**
 * Tech Spec §3.1 dòng 159–161, chép đủ 6 cột.
 *
 * `overridable` là cột thứ hai chưa ai đọc ở v1.0 (BR-017 Override là F35,
 * v1.2). `session_rules` ở S2 CỐ Ý KHÔNG có cột này — Tech Spec §3.1 dòng 165
 * bỏ nó, và đúng: một quy định đã snapshot thì "có cho phép override hay
 * không" là câu hỏi của bản gốc, không phải của bản sao.
 *
 * `unique` + `check` là ràng buộc THẬT trong DB, không phải chỉ ở `readGroupRules`:
 * DoD của E5-T2. Hàm thuần bắt lỗi để báo cho người dùng tử tế; DB bắt lỗi để
 * dữ liệu không bao giờ sai kể cả khi có đường ghi khác (script seed, sửa tay).
 */
export const groupRules = pgTable(
  'group_rules',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id),
    systemTag: systemTag('system_tag').notNull(),
    minimumCount: integer('minimum_count').notNull(),
    ruleType: groupRuleType('rule_type').notNull().default('REQUIRED'),
    overridable: boolean('overridable').notNull().default(true),
  },
  (table) => [
    uniqueIndex('group_rules_group_type_tag_unique').on(
      table.groupId,
      table.ruleType,
      table.systemTag,
    ),
    check('group_rules_minimum_count_positive', sql`${table.minimumCount} >= 1`),
  ],
)

export type GroupRule = typeof groupRules.$inferSelect
```

Import cần thêm vào khối `drizzle-orm/pg-core` đầu file: `check`, `integer`. `boolean`, `sql`, `uuid`, `uniqueIndex`, `pgEnum` đã có sẵn.

## 4.1 Migration `0009_group_rules.sql`

```bash
yarn db:generate
```

Đọc file `.sql` sinh ra. Nó phải chứa **cả ba** thứ sau — nếu thiếu dòng `CHECK`, thêm tay:

```sql
CREATE TYPE "public"."group_rule_type" AS ENUM('REQUIRED', 'PREFERRED');--> statement-breakpoint
CREATE TABLE "group_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"system_tag" "system_tag" NOT NULL,
	"minimum_count" integer NOT NULL,
	"rule_type" "group_rule_type" DEFAULT 'REQUIRED' NOT NULL,
	"overridable" boolean DEFAULT true NOT NULL,
	CONSTRAINT "group_rules_minimum_count_positive" CHECK ("group_rules"."minimum_count" >= 1)
);
--> statement-breakpoint
ALTER TABLE "group_rules" ADD CONSTRAINT "group_rules_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_rules_group_type_tag_unique" ON "group_rules" USING btree ("group_id","rule_type","system_tag");
```

Đổi tên file thành `0009_group_rules.sql` cho đọc được (khuôn `0001`→`0006`), và **sửa cả `meta/_journal.json`** cho khớp — `0007`/`0008` đang mang tên máy sinh, đừng để lệch thêm.

---

# 5. `src/features/rule/domain/group-rule.ts` — MỚI (E5-T1)

```ts
import { isSystemTag, type SystemTag } from '@/shared/domain/system-tag'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

/**
 * SPEC-021 — validation của "Cấu hình Group Required Rules". Hàm thuần, không
 * throw, không chạm DB, cùng khuôn `readSystemTags` (E2-T5) và `readMealDraft`
 * (E1-T10).
 *
 * KHÔNG có `ruleType` và `overridable`: v1.0 chỉ đặt Required Rule, và tầng
 * `domain/` không nên mang một trường mà mọi giá trị của nó đều bằng nhau.
 * `infrastructure/` đóng đinh `ruleType: 'REQUIRED'` khi ghi (Guide §1.2).
 */
export type GroupRuleDraft = {
  readonly systemTag: SystemTag
  readonly minimumCount: number
}

export type GroupRuleError = 'INVALID_SYSTEM_TAG' | 'INVALID_MINIMUM_COUNT' | 'DUPLICATE_RULE'

export type RawGroupRule = {
  readonly systemTag: string
  readonly minimumCount: number
}

/**
 * THỨ TỰ KIỂM CỐ ĐỊNH: tag hợp lệ → `minimumCount` hợp lệ → không trùng tag.
 * Cố định vì mỗi ca âm trong Test Cases Spec chỉ khẳng định ĐÚNG MỘT mã lỗi
 * (TC-086 `ERR_INVALID_MINIMUM_COUNT`, TC-087 `ERR_DUPLICATE_RULE`); nếu thứ
 * tự trôi thì một input sai hai chỗ sẽ đổi mã lỗi tuỳ phiên bản.
 *
 * `minimumCount` phải là SỐ NGUYÊN ≥ 1: `1.5` không lọt được qua
 * `check(minimum_count >= 1)` của DB nhưng cũng chẳng có nghĩa gì
 * ("phải có ít nhất 1.5 món canh"), nên chặn ở đây với thông điệp tử tế thay
 * vì để Postgres ném ra một lỗi kiểu.
 *
 * Danh sách RỖNG là hợp lệ, không phải ca lỗi — TC-088: lưu `[]` nghĩa là gỡ
 * hết quy định của Group.
 */
export function readGroupRules(
  rules: readonly RawGroupRule[],
): Result<GroupRuleDraft[], GroupRuleError> {
  const drafts: GroupRuleDraft[] = []
  const seen = new Set<string>()

  for (const rule of rules) {
    if (!isSystemTag(rule.systemTag)) {
      return err('INVALID_SYSTEM_TAG')
    }
    if (!Number.isInteger(rule.minimumCount) || rule.minimumCount < 1) {
      return err('INVALID_MINIMUM_COUNT')
    }
    if (seen.has(rule.systemTag)) {
      return err('DUPLICATE_RULE')
    }

    seen.add(rule.systemTag)
    drafts.push({ systemTag: rule.systemTag, minimumCount: rule.minimumCount })
  }

  return ok(drafts)
}
```

## 5.1 Test — `group-rule.test.ts`

```ts
import { describe, expect, it } from 'vitest'

import { readGroupRules } from './group-rule'

describe('readGroupRules', () => {
  // TC-085 — Admin đặt `REQUIRED SOUP >= 1`.
  it('nhận một rule hợp lệ', () => {
    const result = readGroupRules([{ systemTag: 'SOUP', minimumCount: 1 }])

    expect(result).toEqual({ ok: true, value: [{ systemTag: 'SOUP', minimumCount: 1 }] })
  })

  // TC-088 — lưu danh sách rỗng để gỡ hết quy định.
  it('nhận danh sách rỗng', () => {
    expect(readGroupRules([])).toEqual({ ok: true, value: [] })
  })

  // TC-086.
  it('từ chối minimumCount = 0', () => {
    const result = readGroupRules([{ systemTag: 'MAIN', minimumCount: 0 }])

    expect(result).toEqual({ ok: false, error: 'INVALID_MINIMUM_COUNT' })
  })

  it('từ chối minimumCount không nguyên', () => {
    const result = readGroupRules([{ systemTag: 'MAIN', minimumCount: 1.5 }])

    expect(result).toEqual({ ok: false, error: 'INVALID_MINIMUM_COUNT' })
  })

  // TC-087 — hai rule cùng tag.
  it('từ chối hai rule trùng System Tag', () => {
    const result = readGroupRules([
      { systemTag: 'MAIN', minimumCount: 1 },
      { systemTag: 'MAIN', minimumCount: 2 },
    ])

    expect(result).toEqual({ ok: false, error: 'DUPLICATE_RULE' })
  })

  it('từ chối System Tag lạ', () => {
    const result = readGroupRules([{ systemTag: 'DRINK', minimumCount: 1 }])

    expect(result).toEqual({ ok: false, error: 'INVALID_SYSTEM_TAG' })
  })

  // Thứ tự kiểm cố định — input sai cả hai chỗ vẫn ra INVALID_MINIMUM_COUNT.
  it('báo minimumCount trước khi báo trùng lặp', () => {
    const result = readGroupRules([
      { systemTag: 'MAIN', minimumCount: 1 },
      { systemTag: 'MAIN', minimumCount: 0 },
    ])

    expect(result).toEqual({ ok: false, error: 'INVALID_MINIMUM_COUNT' })
  })

  it('giữ nguyên thứ tự người dùng gửi lên', () => {
    const result = readGroupRules([
      { systemTag: 'SOUP', minimumCount: 1 },
      { systemTag: 'MAIN', minimumCount: 2 },
    ])

    expect(result.ok && result.value.map((r) => r.systemTag)).toEqual(['SOUP', 'MAIN'])
  })
})
```

> [!NOTE]
> Ca cuối cố ý **khác** `readSystemTags` (hàm đó chuẩn hoá về thứ tự mâm cơm). Ở đây thứ tự người dùng gửi lên được giữ vì danh sách rule là thứ Admin tự sắp; màn hình sắp lại theo `SYSTEM_TAGS` lúc hiển thị (§8) chứ không phải hàm thuần này.

---

# 6. Tầng application

## 6.1 `rule-repository.ts` — port

```ts
import type { SystemTag } from '@/shared/domain/system-tag'

export type GroupRuleRecord = {
  readonly id: string
  readonly systemTag: SystemTag
  readonly minimumCount: number
}

export interface RuleRepository {
  /** SPEC-021. Theo thứ tự mâm cơm (`SYSTEM_TAGS`), không theo thứ tự chèn. */
  listGroupRules(groupId: string): Promise<GroupRuleRecord[]>

  /**
   * SPEC-021 — GHI ĐÈ TOÀN BỘ, không cộng dồn (TC-088: mảng rỗng xoá sạch).
   * DELETE + INSERT trong MỘT `db.batch()`: không có ai đọc giữa hai bước, và
   * một request hỏng giữa chừng không được để Group ở trạng thái "đã xoá rule
   * cũ, chưa có rule mới".
   */
  replaceGroupRules(
    groupId: string,
    rules: readonly { systemTag: SystemTag; minimumCount: number }[],
  ): Promise<void>
}
```

## 6.2 `set-group-rules.ts`

```ts
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import { readGroupRules, type GroupRuleError, type RawGroupRule } from '../domain/group-rule'
import type { RuleRepository } from './rule-repository'

export type SetGroupRulesDeps = {
  readonly rules: RuleRepository
  /** Truyền từ `app/` — `features/rule` không được import `features/group`.
   *  Cùng khuôn `setSystemTags` (E2-T5) và `startSession` (E3-T1). */
  readonly assertAdmin: (input: {
    readonly userId: string
    readonly groupId: string
  }) => Promise<Result<void, Failure>>
}

export type SetGroupRulesInput = {
  readonly groupId: string
  readonly rules: readonly RawGroupRule[]
  readonly requestedByUserId: string
}

const ERROR_BY_DOMAIN: Record<GroupRuleError, Failure['code']> = {
  INVALID_SYSTEM_TAG: 'ERR_INVALID_SYSTEM_TAG',
  INVALID_MINIMUM_COUNT: 'ERR_INVALID_MINIMUM_COUNT',
  DUPLICATE_RULE: 'ERR_DUPLICATE_RULE',
}

/**
 * SPEC-021 — ghi đè toàn bộ Rule Set của một Group.
 *
 * Thứ tự BẤT BIẾN: quyền → validate thuần → ghi. Hai vòng đầu không chạm dữ
 * liệu, nên mọi nhánh lỗi đều không để lại thay đổi từng phần (SDD §2.4).
 */
export async function setGroupRules(
  deps: SetGroupRulesDeps,
  input: SetGroupRulesInput,
): Promise<Result<void, Failure>> {
  // TC-089 — BR-010: chỉ Group Admin.
  const access = await deps.assertAdmin({
    userId: input.requestedByUserId,
    groupId: input.groupId,
  })
  if (!access.ok) {
    return access
  }

  // TC-086, TC-087.
  const parsed = readGroupRules(input.rules)
  if (!parsed.ok) {
    return err(failure(ERROR_BY_DOMAIN[parsed.error], { field: 'rules' }))
  }

  // TC-085, TC-088.
  await deps.rules.replaceGroupRules(input.groupId, parsed.value)

  return ok(undefined)
}
```

`list-group-rules.ts` mỏng, không cần test riêng (`TC-085` đã phủ qua integration test của repo):

```ts
import type { GroupRuleRecord, RuleRepository } from './rule-repository'

/** SPEC-021 phía đọc. Không guard Admin: MỌI Member đều được XEM quy định của
 *  nhóm mình (BR-010 chỉ hạn chế quyền SỬA). Trang `/rules` ẩn nút sửa dựa
 *  trên `canEdit`, xem §9. */
export async function listGroupRules(
  deps: { readonly rules: RuleRepository },
  groupId: string,
): Promise<GroupRuleRecord[]> {
  return deps.rules.listGroupRules(groupId)
}
```

## 6.3 Test — `set-group-rules.test.ts`

Dùng fake repo trong bộ nhớ, cùng khuôn `set-system-tags.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

import { ok, err } from '@/shared/result'
import { failure } from '@/shared/errors'

import { setGroupRules } from './set-group-rules'
import type { RuleRepository } from './rule-repository'

function fakeRepository() {
  const replaceGroupRules = vi.fn(async () => {})
  const repository: RuleRepository = {
    listGroupRules: async () => [],
    replaceGroupRules,
  }
  return { repository, replaceGroupRules }
}

const allowAdmin = async () => ok(undefined)
const denyAdmin = async () => err(failure('ERR_NOT_GROUP_ADMIN'))

describe('setGroupRules', () => {
  // TC-085.
  it('lưu đúng một rule', async () => {
    const { repository, replaceGroupRules } = fakeRepository()

    const result = await setGroupRules(
      { rules: repository, assertAdmin: allowAdmin },
      { groupId: 'g1', rules: [{ systemTag: 'SOUP', minimumCount: 1 }], requestedByUserId: 'u1' },
    )

    expect(result.ok).toBe(true)
    expect(replaceGroupRules).toHaveBeenCalledWith('g1', [{ systemTag: 'SOUP', minimumCount: 1 }])
  })

  // TC-088 — mảng rỗng vẫn phải GỌI repo (xoá sạch), không được "tối ưu" bỏ qua.
  it('gọi repo với mảng rỗng để gỡ hết quy định', async () => {
    const { repository, replaceGroupRules } = fakeRepository()

    await setGroupRules(
      { rules: repository, assertAdmin: allowAdmin },
      { groupId: 'g1', rules: [], requestedByUserId: 'u1' },
    )

    expect(replaceGroupRules).toHaveBeenCalledWith('g1', [])
  })

  // TC-086.
  it('trả ERR_INVALID_MINIMUM_COUNT và không ghi gì', async () => {
    const { repository, replaceGroupRules } = fakeRepository()

    const result = await setGroupRules(
      { rules: repository, assertAdmin: allowAdmin },
      { groupId: 'g1', rules: [{ systemTag: 'MAIN', minimumCount: 0 }], requestedByUserId: 'u1' },
    )

    expect(result).toEqual({ ok: false, error: { code: 'ERR_INVALID_MINIMUM_COUNT', details: { field: 'rules' } } })
    expect(replaceGroupRules).not.toHaveBeenCalled()
  })

  // TC-087.
  it('trả ERR_DUPLICATE_RULE và không ghi gì', async () => {
    const { repository, replaceGroupRules } = fakeRepository()

    const result = await setGroupRules(
      { rules: repository, assertAdmin: allowAdmin },
      {
        groupId: 'g1',
        rules: [
          { systemTag: 'MAIN', minimumCount: 1 },
          { systemTag: 'MAIN', minimumCount: 1 },
        ],
        requestedByUserId: 'u1',
      },
    )

    expect(result.ok).toBe(false)
    expect(replaceGroupRules).not.toHaveBeenCalled()
  })

  // TC-089 — Member không phải Admin. Guard chạy TRƯỚC validate: input sai
  // cũng không được lộ ra là sai, vì người này không có quyền hỏi.
  it('trả ERR_NOT_GROUP_ADMIN trước cả khi validate', async () => {
    const { repository, replaceGroupRules } = fakeRepository()

    const result = await setGroupRules(
      { rules: repository, assertAdmin: denyAdmin },
      { groupId: 'g1', rules: [{ systemTag: 'MAIN', minimumCount: 0 }], requestedByUserId: 'u9' },
    )

    expect(result).toEqual({ ok: false, error: { code: 'ERR_NOT_GROUP_ADMIN' } })
    expect(replaceGroupRules).not.toHaveBeenCalled()
  })
})
```

---

# 7. `drizzle-rule-repository.ts` — MỚI

```ts
import { eq } from 'drizzle-orm'

import { getDb } from '@/shared/db/client'
import { groupRules } from '@/shared/db/schema'
import { SYSTEM_TAGS, type SystemTag } from '@/shared/domain/system-tag'

import type { GroupRuleRecord, RuleRepository } from '../application/rule-repository'

const TAG_ORDER = new Map<SystemTag, number>(SYSTEM_TAGS.map((tag, index) => [tag, index]))

async function listGroupRules(groupId: string): Promise<GroupRuleRecord[]> {
  const rows = await getDb()
    .select({
      id: groupRules.id,
      systemTag: groupRules.systemTag,
      minimumCount: groupRules.minimumCount,
    })
    .from(groupRules)
    .where(eq(groupRules.groupId, groupId))

  // Sắp ở TS chứ không ORDER BY: thứ tự mâm cơm là thứ tự của `SYSTEM_TAGS`,
  // không phải thứ tự bảng chữ cái mà Postgres sẽ dùng cho kiểu enum nếu ai đó
  // thêm giá trị mới không đúng chỗ. Một Group có tối đa 5 rule Required.
  return rows.sort((a, b) => (TAG_ORDER.get(a.systemTag) ?? 0) - (TAG_ORDER.get(b.systemTag) ?? 0))
}

/**
 * GHI ĐÈ TOÀN BỘ trong MỘT `db.batch()` — batch của neon-http LÀ transaction
 * Postgres thật (đã verify ở E4-S2, xem guide E4-S2 §1.1). Khác `saveDraft`
 * của `meal` (DELETE rồi INSERT ở hai round-trip): ở đó bước sau cần
 * `finalMealId` của bước trước; ở đây không, nên gộp được, và gộp là đúng —
 * DELETE thành công rồi INSERT hỏng sẽ để Group mất sạch quy định.
 *
 * `ruleType: 'REQUIRED'` đóng đinh tại đây: đây là chỗ duy nhất tầng domain
 * (chỉ biết `systemTag` + `minimumCount`) gặp schema đủ 6 cột — Guide §1.2.
 */
async function replaceGroupRules(
  groupId: string,
  rules: readonly { systemTag: SystemTag; minimumCount: number }[],
): Promise<void> {
  const db = getDb()
  const remove = db.delete(groupRules).where(eq(groupRules.groupId, groupId))

  if (rules.length === 0) {
    // TC-088. `db.batch` cần tuple ≥ 1 phần tử, và ở đây chỉ có một câu.
    await remove
    return
  }

  await db.batch([
    remove,
    db.insert(groupRules).values(
      rules.map((rule) => ({
        groupId,
        systemTag: rule.systemTag,
        minimumCount: rule.minimumCount,
        ruleType: 'REQUIRED' as const,
      })),
    ),
  ])
}

export const drizzleRuleRepository: RuleRepository = {
  listGroupRules,
  replaceGroupRules,
}
```

## 7.1 Integration test — `drizzle-rule-repository.integration.test.ts`

Khuôn lấy từ `drizzle-dish-repository.integration.test.ts` (cùng cách dựng dữ liệu qua `src/shared/testing/factories.ts`). Bốn ca:

| Ca | Khẳng định |
| --- | --- |
| Ghi đè | Lưu `[MAIN 1, SOUP 1]`, rồi lưu `[SOUP 2]` → còn đúng 1 hàng, `minimum_count = 2` |
| `TC-088` | Lưu `[]` sau khi đã có 2 rule → `listGroupRules` trả `[]` |
| Thứ tự | Lưu `[SOUP, STAPLE, MAIN]` → đọc ra `[STAPLE, MAIN, SOUP]` |
| **Ràng buộc DB** | `INSERT` thẳng qua `getDb()` hai hàng cùng `(group_id, 'REQUIRED', 'MAIN')` → **ném lỗi**; `INSERT` một hàng `minimum_count = 0` → **ném lỗi** |

Ca cuối là ca chứng minh DoD `E5-T2`. Nó **không đi qua `replaceGroupRules`** — phải chèn thẳng bằng drizzle để chứng minh ràng buộc nằm ở DB chứ không ở hàm thuần:

```ts
it('DB chặn rule trùng và minimum_count = 0, không phụ thuộc hàm thuần', async () => {
  const groupId = await createGroup()

  await getDb()
    .insert(groupRules)
    .values({ groupId, systemTag: 'MAIN', minimumCount: 1, ruleType: 'REQUIRED' })

  await expect(
    getDb()
      .insert(groupRules)
      .values({ groupId, systemTag: 'MAIN', minimumCount: 2, ruleType: 'REQUIRED' }),
  ).rejects.toThrow()

  await expect(
    getDb()
      .insert(groupRules)
      .values({ groupId, systemTag: 'SOUP', minimumCount: 0, ruleType: 'REQUIRED' }),
  ).rejects.toThrow()
})
```

---

# 8. Presentation — màn S-07 (E5-T1b)

Ảnh tham chiếu: [s07-01-quy-dinh.png](../designs/screenshots/s07-01-quy-dinh.png), [s07-02-sheet-them-quy-dinh.png](../designs/screenshots/s07-02-sheet-them-quy-dinh.png).

`rule-sentence.ts` — chuyển một rule thành câu tiếng Việt, tách riêng vì **S4 dùng lại** (dòng "Còn thiếu: 1 món Canh" trên nút chốt):

```ts
import type { SystemTag } from '@/shared/domain/system-tag'

/** Nhãn dùng TRONG CÂU, viết thường — "Phải có ít nhất 1 món canh". Khác
 *  `SYSTEM_TAG_LABELS` của feature `dish` (nhãn đứng một mình trên chip, viết
 *  hoa đầu). Hai bảng khác nhau vì hai ngữ cảnh khác nhau, không phải trùng
 *  lặp — E6-T2 gom mọi chuỗi tiếng Việt thì mang cả hai đi cùng. */
const TAG_IN_SENTENCE: Record<SystemTag, string> = {
  STAPLE: 'món cơm',
  MAIN: 'món mặn',
  SIDE: 'món phụ',
  SOUP: 'món canh',
  DESSERT: 'món tráng miệng',
}

/** "Phải có ít nhất 1 món canh" — nguyên văn mockup S-07. */
export function ruleSentence(rule: { systemTag: SystemTag; minimumCount: number }): string {
  return `Phải có ít nhất ${rule.minimumCount} ${TAG_IN_SENTENCE[rule.systemTag]}`
}

/** "1 món canh" — mảnh dùng trong dòng "Còn thiếu: …" ở S4 (E5-T9). */
export function ruleShortfallPhrase(shortfall: {
  systemTag: SystemTag
  missing: number
}): string {
  return `${shortfall.missing} ${TAG_IN_SENTENCE[shortfall.systemTag]}`
}
```

`group-rules-screen.tsx` — Client Component, giữ danh sách rule ở state và submit **cả danh sách** một lần (đúng ngữ nghĩa "ghi đè toàn bộ" của `SPEC-021`, và làm nút "Gỡ" không cần một Server Action riêng):

```tsx
'use client'

import { useActionState, useState, type ReactElement } from 'react'

import type { SystemTag } from '@/shared/domain/system-tag'
import { Button } from '@/shared/ui/button'
import { EmptyStateCard } from '@/shared/ui/empty-state-card'

import { AddRuleSheet } from './add-rule-sheet'
import { ruleSentence } from './rule-sentence'

export type RuleFormState = { error: string | null; savedAt: number | null }

export type GroupRulesScreenProps = {
  groupName: string
  initialRules: readonly { systemTag: SystemTag; minimumCount: number }[]
  /** Member vẫn XEM được quy định; chỉ Admin mới thấy nút sửa (BR-010). */
  canEdit: boolean
  action: (state: RuleFormState, formData: FormData) => Promise<RuleFormState>
}

const EMPTY_STATE: RuleFormState = { error: null, savedAt: null }

/**
 * S-07. CHỈ dựng nhóm "Bắt buộc" — nhóm "Nên có" trong mockup là Preferred
 * Rule (F22, v1.1), và một mục trống mang tiêu đề "Nên có" là lời hứa v1.0
 * không giữ được (Guide §1.4).
 *
 * Danh sách rule sống ở state client, submit một lần cho cả danh sách: SPEC-021
 * là "ghi đè toàn bộ", nên "Gỡ" và "Thêm" là hai cách sửa CÙNG một giá trị chứ
 * không phải hai thao tác server khác nhau.
 */
export function GroupRulesScreen({
  groupName,
  initialRules,
  canEdit,
  action,
}: GroupRulesScreenProps): ReactElement {
  const [rules, setRules] = useState(initialRules)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [state, formAction, pending] = useActionState(action, EMPTY_STATE)

  const usedTags = new Set(rules.map((rule) => rule.systemTag))

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex flex-col gap-1 px-4 pb-3 pt-6">
        <span className="text-caption font-medium text-ink-muted">{groupName}</span>
        <h1 className="text-title font-semibold text-ink">Quy định bữa ăn</h1>
      </header>

      <form action={formAction} className="flex flex-1 flex-col gap-4 px-4">
        {rules.map((rule) => (
          <div
            key={rule.systemTag}
            className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface-raised px-5 py-4"
          >
            <input type="hidden" name="systemTag" value={rule.systemTag} />
            <input type="hidden" name="minimumCount" value={rule.minimumCount} />
            <span className="text-subtitle font-semibold text-ink">{ruleSentence(rule)}</span>
            {canEdit ? (
              <Button
                type="button"
                variant="quiet"
                size="sm"
                onClick={() => setRules((current) => current.filter((r) => r !== rule))}
              >
                Gỡ
              </Button>
            ) : null}
          </div>
        ))}

        {rules.length === 0 ? (
          <EmptyStateCard
            title="Chưa có quy định nào"
            description="Thêm quy định để lúc chốt bữa hệ thống nhắc bạn nếu mâm cơm còn thiếu món."
          />
        ) : null}

        <p className="text-caption text-ink-muted">
          Quy định chỉ kiểm tra lúc chốt bữa, không chặn ai vuốt.
        </p>

        {state.error === null ? null : (
          <p role="alert" className="text-body text-no">
            {state.error}
          </p>
        )}

        {canEdit ? (
          <div className="mt-auto flex flex-col gap-3 pb-6 pt-3">
            <Button type="button" variant="secondary" onClick={() => setSheetOpen(true)}>
              Thêm quy định
            </Button>
            <Button type="submit" pending={pending}>
              {pending ? 'Đang lưu…' : 'Lưu quy định'}
            </Button>
          </div>
        ) : null}
      </form>

      {sheetOpen ? (
        <AddRuleSheet
          usedTags={usedTags}
          onAdd={(rule) => {
            setRules((current) => [...current, rule])
            setSheetOpen(false)
          }}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}
    </main>
  )
}
```

## 8.1 `add-rule-sheet.tsx`

Sheet chọn **một** tag + một số lượng. Tag đã có rule bị loại khỏi danh sách chọn — đó là cách chặn `ERR_DUPLICATE_RULE` ngay trên UI, còn `readGroupRules` và ràng buộc DB là hai lưới an toàn phía sau.

```tsx
'use client'

import { useState, type ReactElement } from 'react'

import { SYSTEM_TAGS, type SystemTag } from '@/shared/domain/system-tag'
import { Button } from '@/shared/ui/button'
import { Sheet } from '@/shared/ui/sheet'

import { ruleSentence } from './rule-sentence'

export type AddRuleSheetProps = {
  usedTags: ReadonlySet<SystemTag>
  onAdd: (rule: { systemTag: SystemTag; minimumCount: number }) => void
  onClose: () => void
}

export function AddRuleSheet({ usedTags, onAdd, onClose }: AddRuleSheetProps): ReactElement {
  const available = SYSTEM_TAGS.filter((tag) => !usedTags.has(tag))
  const [systemTag, setSystemTag] = useState<SystemTag | null>(available[0] ?? null)
  const [minimumCount, setMinimumCount] = useState(1)

  return (
    <Sheet title="Thêm quy định" onClose={onClose}>
      <h2 className="text-title font-semibold text-ink">Thêm quy định</h2>

      {systemTag === null ? (
        <p className="text-body text-ink-muted">Mọi nhãn đều đã có quy định rồi.</p>
      ) : (
        <>
          <fieldset className="flex flex-col gap-2 border-0 p-0">
            <legend className="text-caption font-medium text-ink-muted">Nhãn món</legend>
            <div className="flex flex-wrap gap-2">
              {available.map((tag) => (
                <label
                  key={tag}
                  className={`flex min-h-11 cursor-pointer items-center rounded-chip px-4 text-body font-medium ${
                    tag === systemTag
                      ? 'bg-accent text-on-accent'
                      : 'border border-border bg-surface-raised text-ink'
                  }`}
                >
                  <input
                    type="radio"
                    name="newRuleTag"
                    value={tag}
                    checked={tag === systemTag}
                    onChange={() => setSystemTag(tag)}
                    className="sr-only"
                  />
                  {ruleSentence({ systemTag: tag, minimumCount }).replace('Phải có ít nhất 1 ', '')}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center justify-between gap-3">
            <span className="text-body text-ink">Ít nhất bao nhiêu món</span>
            <input
              type="number"
              min={1}
              max={9}
              value={minimumCount}
              onChange={(event) => setMinimumCount(Number(event.target.value))}
              className="min-h-11 w-20 rounded-control border border-border bg-surface-raised px-3 text-right text-body tabular-nums text-ink"
            />
          </label>

          <p className="text-caption text-ink-muted">{ruleSentence({ systemTag, minimumCount })}</p>

          <Button
            type="button"
            muted={!Number.isInteger(minimumCount) || minimumCount < 1}
            onClick={() => onAdd({ systemTag, minimumCount })}
          >
            Thêm vào danh sách
          </Button>
        </>
      )}
    </Sheet>
  )
}
```

> [!WARNING]
> Nút dùng `muted` chứ **không** `disabled`: Design Criteria §5 (và `Button` đã có sẵn prop này) — nút chưa đủ điều kiện vẫn bấm được để bấm ra lỗi. Ở đây `min={1}` của input đã chặn phần lớn, `muted` là chỉ dấu thị giác chứ không phải khoá.

## 8.2 Test — `group-rules-screen.test.tsx`

| Ca | Khẳng định |
| --- | --- |
| Hiển thị | 2 rule → thấy đúng hai câu "Phải có ít nhất 1 món mặn" / "…1 món canh" |
| `canEdit=false` | Không có nút "Thêm quy định", không có nút "Gỡ", không có nút "Lưu" |
| Gỡ | Bấm "Gỡ" ở hàng đầu → hàng biến mất, submit gửi lên chỉ còn 1 cặp hidden input |
| Rỗng | `initialRules=[]` → thấy `EmptyStateCard`, **không** thấy tiêu đề nhóm "Nên có" |
| Không có "Nên có" | `expect(screen.queryByText(/Nên có/)).toBeNull()` — bảo vệ tĩnh cho §1.4 |

## 8.3 Test — `rule-sentence.test.ts`

Năm tag → năm câu; `minimumCount = 2` → "Phải có ít nhất 2 món canh"; `ruleShortfallPhrase({ systemTag: 'SOUP', missing: 1 })` → `"1 món canh"`.

---

# 9. `src/app/groups/[groupId]/rules/page.tsx` — MỚI

```tsx
import { listGroupRules } from '@/features/rule/application/list-group-rules'
import { drizzleRuleRepository } from '@/features/rule/infrastructure/drizzle-rule-repository'
import { GroupRulesScreen } from '@/features/rule/presentation/components/group-rules-screen'
import { assertGroupAccess } from '@/features/group/application/assert-group-access'
import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'

import { requireGroupContext } from '../group-access'
import { setGroupRulesAction } from './actions'

// Khai kiểu thủ công, KHÔNG dùng helper `PageProps` (bẫy đã ghi ở E2-S4).
type RulesPageProps = {
  params: Promise<{ groupId: string }>
}

export default async function RulesPage({ params }: RulesPageProps) {
  const { groupId } = await params
  const { user, group } = await requireGroupContext(groupId)

  const rules = await listGroupRules({ rules: drizzleRuleRepository }, groupId)

  // MEMBER xem được, ADMIN mới sửa được (BR-010). Không `requireGroupAdminContext`
  // ở đây: một Member vào trang này phải THẤY quy định của nhà mình, không phải
  // gặp 404.
  const admin = await assertGroupAccess(
    { memberships: drizzleMembershipRepository },
    { userId: user.id, groupId, requiredRole: 'ADMIN' },
  )

  return (
    <GroupRulesScreen
      groupName={group.name}
      initialRules={rules}
      canEdit={admin.ok}
      action={setGroupRulesAction.bind(null, groupId)}
    />
  )
}
```

## 9.1 `actions.ts`

```ts
'use server'

import { refresh, revalidatePath } from 'next/cache'

import { assertGroupAccess } from '@/features/group/application/assert-group-access'
import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import { setGroupRules } from '@/features/rule/application/set-group-rules'
import { drizzleRuleRepository } from '@/features/rule/infrastructure/drizzle-rule-repository'
import type { RuleFormState } from '@/features/rule/presentation/components/group-rules-screen'
import type { Failure } from '@/shared/errors'

import { requireGroupAdminContext } from '../group-access'

function toVietnameseMessage(error: Failure): string {
  if (error.code === 'ERR_INVALID_MINIMUM_COUNT') {
    return 'Số lượng phải từ 1 trở lên.'
  }
  if (error.code === 'ERR_DUPLICATE_RULE') {
    return 'Mỗi nhãn chỉ đặt được một quy định.'
  }
  if (error.code === 'ERR_NOT_GROUP_ADMIN') {
    return 'Chỉ người quản lý nhóm mới sửa được quy định.'
  }
  return 'Không lưu được quy định. Thử lại giúp mình.'
}

export async function setGroupRulesAction(
  groupId: string,
  _previousState: RuleFormState,
  formData: FormData,
): Promise<RuleFormState> {
  const { user } = await requireGroupAdminContext(groupId)

  // `getAll` chứ không `get`: form gửi lên N cặp (systemTag, minimumCount) —
  // hai mảng song song, ghép theo chỉ số. Cùng khuôn `setSystemTagsAction`.
  const tags = formData.getAll('systemTag').map(String)
  const counts = formData.getAll('minimumCount').map((value) => Number(value))

  const result = await setGroupRules(
    {
      rules: drizzleRuleRepository,
      assertAdmin: ({ userId, groupId: gid }) =>
        assertGroupAccess(
          { memberships: drizzleMembershipRepository },
          { userId, groupId: gid, requiredRole: 'ADMIN' },
        ),
    },
    {
      groupId,
      rules: tags.map((systemTag, index) => ({
        systemTag,
        minimumCount: counts[index] ?? 0,
      })),
      requestedByUserId: user.id,
    },
  )

  if (!result.ok) {
    return { error: toVietnameseMessage(result.error), savedAt: null }
  }

  revalidatePath(`/groups/${groupId}/rules`)
  refresh()
  return { error: null, savedAt: Date.now() }
}
```

> [!NOTE]
> Hai mảng song song ghép theo chỉ số là chỗ dễ lệch nếu trình duyệt đổi thứ tự field. Nó không đổi: HTML form gửi field theo đúng thứ tự DOM, và hai `<input hidden>` của cùng một rule nằm cạnh nhau trong cùng một `<div>`. `counts[index] ?? 0` là lưới an toàn — `0` rơi thẳng vào `ERR_INVALID_MINIMUM_COUNT` thay vì âm thầm thành `NaN`.

---

# 10. Bật hàng "Quy định bữa ăn" ở Group Hub

`group-overview-screen.tsx:31` đang có sẵn comment chờ:

```
 * E5-T1: thêm hàng "Quy định bữa ăn" khi route đó tồn tại.
```

Thêm prop `rulesHref: string` và một hàng cùng khuôn hàng "Danh mục món" / "Mời thành viên"; phụ đề đọc từ `ruleCount`: `0` → *"Chưa có quy định nào"*, `n` → *"n quy định"*. Xoá dòng comment sau khi làm xong — comment chờ đã hết việc thì phải đi, để lại là nợ.

`src/app/groups/[groupId]/page.tsx` truyền `rulesHref={/groups/${groupId}/rules}` và `ruleCount` từ `listGroupRules`.

---

# 11. Rủi ro

| Rủi ro | Dấu hiệu sớm | Xử lý |
| --- | --- | --- |
| `drizzle-kit` không phát ra `CHECK` | File `.sql` sinh ra không có chữ `CHECK` | Viết tay vào migration (§1.3). Đừng bỏ qua rồi tự nhủ "hàm thuần đã chặn" — DoD là ràng buộc DB |
| Chuyển `SystemTag` làm vỡ 12 import | `tsc` đỏ hàng loạt sau §3 | Đúng như dự tính: `dish/domain/system-tag.ts` re-export nên KHÔNG được đỏ. Nếu đỏ, kiểm lại dòng `export type { SystemTag }` |
| knip báo export chết | `yarn knip` đỏ ở `shared/domain/system-tag.ts` | Xem ghi chú cuối §3 |
| Hai mảng song song lệch chỉ số | Rule lưu ra sai số lượng | Test §8.2 ca "Gỡ" phủ đúng chỗ này: gỡ hàng GIỮA rồi submit |
| Form submit khi đang mở Sheet | Enter trong ô `number` submit cả form ngoài | `AddRuleSheet` nằm NGOÀI `<form>` trong cây DOM của §8 — giữ nguyên vị trí đó |

---

# 12. Test Cases coverage

| TC | Tầng | Ở đâu |
| --- | --- | --- |
| `TC-085` | `A` | §6.3 "lưu đúng một rule" + §7.1 integration |
| `TC-086` | `I`→`D`/`A` | §5.1 "từ chối minimumCount = 0" + §6.3 + §7.1 ca ràng buộc DB |
| `TC-087` | `I`→`D`/`A` | §5.1 "hai rule trùng" + §6.3 + §7.1 ca ràng buộc DB |
| `TC-088` | `A` | §5.1 "danh sách rỗng" + §6.3 "gọi repo với mảng rỗng" + §7.1 |
| `TC-089` | `A` | §6.3 "trả ERR_NOT_GROUP_ADMIN trước cả khi validate" |

`TC-090` (Admin đổi Group Rule khi phiên đang ACTIVE → Session Rule không đổi) thuộc **S2** — cần bảng `session_rules`, chưa tồn tại ở slice này.

---

# 13. Thứ tự TDD

1. `shared/domain/system-tag.ts` + sửa `dish/domain/system-tag.ts` → `yarn typecheck && yarn knip` xanh trước khi đi tiếp.
2. `group-rule.test.ts` (đỏ) → `group-rule.ts` (xanh).
3. `schema.ts` + `yarn db:generate` → **đọc `.sql`** → `yarn db:migrate` → `\d+ group_rules`.
4. `rule-repository.ts` (port) → `set-group-rules.test.ts` (đỏ) → `set-group-rules.ts` (xanh).
5. `drizzle-rule-repository.integration.test.ts` (đỏ) → `drizzle-rule-repository.ts` (xanh).
6. `rule-sentence.test.ts` → `rule-sentence.ts`.
7. `group-rules-screen.test.tsx` (đỏ) → `add-rule-sheet.tsx` + `group-rules-screen.tsx` (xanh).
8. `page.tsx`, `actions.ts`, bật hàng ở Group Hub — nối dây, không test riêng.

---

# 14. Verify

## 14.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn test:integration
```

## 14.2 Bằng chứng ràng buộc DB — DoD chính của `E5-T2`

```bash
psql "$DATABASE_URL" -c '\d+ group_rules'
```

Kết quả phải có **cả hai** dòng, dán vào PR:

```text
Indexes:
    "group_rules_group_type_tag_unique" UNIQUE, btree (group_id, rule_type, system_tag)
Check constraints:
    "group_rules_minimum_count_positive" CHECK (minimum_count >= 1)
```

## 14.3 Bằng chứng trên điện thoại

1. Đăng nhập bằng tài khoản Admin → Group Hub → hàng "Quy định bữa ăn" → thêm "Phải có ít nhất 1 món canh" → Lưu → tải lại trang, rule vẫn còn.
2. Gỡ hết rule → Lưu → trang hiện trạng thái rỗng (DoD `E5-T1`: *"Lưu danh sách rỗng thì Group không còn rule nào"*).
3. Đăng nhập bằng tài khoản Member (không Admin) của cùng nhóm → mở `/groups/<id>/rules` → **thấy** danh sách, **không thấy** nút "Thêm quy định"/"Gỡ"/"Lưu".

---

# 15. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v1.1.md`

```markdown
# DEC-040 — SystemTag Moves to shared/domain; Schema Follows Tech Spec §3.1 Verbatim

- **Ngày:** 2026-08-20
- **Trạng thái:** Accepted
- **Bối cảnh:** E5-S1

## Quyết định

1. `SystemTag`, `SYSTEM_TAGS`, `isSystemTag` chuyển từ `features/dish/domain/system-tag.ts`
   sang `shared/domain/system-tag.ts`. `features/dish/domain/system-tag.ts` giữ nguyên đường
   dẫn, giữ `readSystemTags`/`toSystemTags`/`SystemTagError`, và re-export ba tên đã chuyển.
2. Bảng `group_rules` chép đủ 6 cột của Tech Spec §3.1 kể cả `rule_type` và `overridable`,
   trong khi `GroupRuleDraft` ở `domain/` chỉ có `systemTag` + `minimumCount`.

## Rationale

1. Ba feature cần `SystemTag`: `dish` (gán), `rule` (đặt chỉ tiêu), `meal` (đối chiếu lúc
   chốt). `ALLOWED_CROSS_FEATURE` không cho `rule → dish` cũng như `meal → dish`. Nới bảng
   cross-feature hai chiều để lấy một union 5 phần tử là đổi hợp đồng kiến trúc (Tech Spec
   §2.3) nhằm tránh một lần chuyển file. Khai bản sao trong `rule/domain` sẽ thành bản sao
   thứ ba của cùng một union.
2. Nguyên tắc "không thêm trường chưa ai đọc" (DEC-036, `ranking.ts`) áp cho KIỂU TS, không
   áp cho SCHEMA. Thêm một trường vào kiểu ở v1.1 là một dòng diff; thêm một cột vào bảng
   đang có dữ liệu là một migration cộng một lần backfill cộng một cửa sổ mà code cũ chạy
   trên schema mới. Ngoài ra `rule_type` bắt buộc phải có ngay vì ràng buộc
   `unique(group_id, rule_type, system_tag)` mà E5-T2 đòi không viết được nếu thiếu nó.

## Consequence

- `shared/domain/` là thư mục mới; mọi kiến thức miền dùng chung từ nay đặt ở đó.
- `session_rules` (S2) KHÔNG có `overridable` — theo đúng Tech Spec §3.1 dòng 165.
- v1.1 bật Preferred Rule chỉ cần ghi giá trị `'PREFERRED'`, không cần migration.

## Affected Documents

- Tech Spec §2.2 — thêm `shared/domain/` vào mô tả cây thư mục.
```

```markdown
# DEC-041 — E5 Adds Subtask E5-T1b: the Group Rules Screen

- **Ngày:** 2026-08-20
- **Trạng thái:** Accepted
- **Bối cảnh:** E5-S1

## Quyết định

Thêm `E5-T1b` "Màn hình S-07 Quy định bữa ăn" (2 giờ) vào Master Plan §7, nằm trong Slice S1
cùng `E5-T1` và `E5-T2`.

## Rationale

Master Plan v1.3 giao `E5-T1` đúng tầng `application` và không có subtask UI nào cho màn
"Quy định bữa ăn" — trong khi thư mục thiết kế đã có sẵn `s07-01-quy-dinh.png` và
`s07-02-sheet-them-quy-dinh.png`. Không có màn hình thì Admin không có đường nào đặt rule,
`group_rules` vĩnh viễn rỗng, và toàn bộ E5-T3→E5-T9 chạy trên một bảng không bao giờ có dữ
liệu. Checkpoint §12 của Master Plan hỏi *"Nếu phải dừng dự án ngay ngày mai, phần đã làm có
dùng được không?"* — không có S-07 thì câu trả lời cho E5 là KHÔNG.

## Consequence

- E5 lên 10 subtask, 23 giờ cơ sở (từ 9 subtask, 21 giờ).
- Màn hình chỉ dựng nhóm "Bắt buộc"; nhóm "Nên có" trong mockup là F22 (v1.1).

## Affected Documents

- Master Plan §1 (giờ của E5), §7 (thêm dòng `E5-T1b`).
```

---

# 16. Master Plan

Sau khi slice xanh, sửa [Master Plan](../what-we-gonna-eat-today_master-plan_v1_0.md) §7:

```markdown
| `[x] E5-T1` | Schema `group_rules` và CRUD | … |
| `[x] E5-T1b` | Màn hình S-07 "Quy định bữa ăn" | `S-07`, [Design §4](designs/README.md) | 2 | `E5-T1` | Admin đặt được rule trên điện thoại; Member chỉ xem | `src/features/rule/presentation/**` |
| `[x] E5-T2` | Invariant của rule ép ở tầng DB | … |
```

và §1: dòng `E5` thành `10 subtask / 23 giờ`, trạng thái `⏳ Đang làm (3/10)`.
