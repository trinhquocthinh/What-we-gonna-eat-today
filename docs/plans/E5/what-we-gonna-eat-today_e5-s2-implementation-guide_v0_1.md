# 🧊 Implementation Guide — E5 Slice S2: Rule engine và Snapshot lúc Start

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-20`
> - **Upstream:** [Master Plan](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E5-T3`, `E5-T4`) • [SDD](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-016` bước 2, `SPEC-022`, §8 Independent Tag Counting) • [Tech Spec](../../what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) (§3.1 dòng 165–167) • [Business Rules](../../what-we-gonna-eat-today_business-rules_v1.8.md) (`BR-013`, `BR-015`, `BR-016`) • [Test Cases](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-072`, `TC-073`, `TC-090`→`TC-094`, `TC-110`, `TC-035`)
> - **Tiền đề:** S1 đã code (`group_rules`, `shared/domain/system-tag.ts`), `E3-T1` đã code (`startSession`).
>
> 🧊 *Slice đóng băng. Một hàm thuần trả về "còn thiếu gì", và một câu SQL chạy đúng chỗ trong giao dịch Start. Không có UI.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E5-T3` | `evaluateRequired`, independent tag counting | 3 | `src/features/rule/domain/evaluate.ts` | **Viết `TC-073` TRƯỚC khi viết hàm:** Dish mang cả `MAIN` và `SOUP` thoả cả hai rule |
| `E5-T4` | Snapshot Session Rule trong transaction Start | 2 | `src/features/rule/application/snapshot.ts`, `.../infrastructure/**` | `TC-035` pass: Start thất bại thì không có Session Rule nào được tạo |

- [ ] `TC-073` là test **đầu tiên** được commit ở slice này — Master Plan §11 xếp "viết `evaluateRequired` trước khi có `TC-073`" vào bảng rủi ro
- [ ] `TC-072`, `TC-110` pass ở tầng `D`, không một dòng mock
- [ ] `TC-090`→`TC-094` pass ở tầng `I` với DB thật
- [ ] Admin sửa Group Rule khi phiên đang `ACTIVE` → `session_rules` của phiên đó **không đổi một byte**
- [ ] `yarn verify && yarn arch:probe && yarn test:integration` xanh

---

# 1. Sáu phát hiện — đọc trước khi gõ

## 1.1 Hai tài liệu nói ngược nhau về THỜI ĐIỂM snapshot

`BR-016` (Business Rules §5.1) viết:

> Khi tạo phiên (`Draft`), Group Rules được tự động **Snapshot** sang `Session Rules`. Chỉ Creator có quyền điều chỉnh Session Rules và **chỉ được chỉnh trong giai đoạn DRAFT**.

`SPEC-022` (SDD §7) viết:

> Đóng băng bản sao các quy định mâm cơm của Group **tại thời điểm Start**.

Master Plan `E5-T4` (*"Snapshot Session Rule trong transaction Start"*) và `TC-091` (*"Start Session → Session Rule snapshot đúng 2 rules"*) đứng cùng phe với SDD.

**Theo SDD: snapshot lúc Start.** Lý do không phải "SDD thắng vì SDD mới hơn", mà vì vế thứ hai của `BR-016` — Creator chỉnh Session Rule trong Draft — là `F35` *Override Session Rule*, **v1.2** (Master Plan §13.2, `BR-017`, `BR-018`). Ở v1.0 không có màn hình nào sửa Session Rule, nên snapshot sớm chỉ tạo thêm một trạng thái phải bảo trì: một Draft mang bản sao rule mà không ai đọc, và phải nhớ làm mới nó nếu Admin đổi Group Rule trong lúc Draft còn treo.

Snapshot lúc Start còn khớp đúng ngữ nghĩa `BR-015` (*"Khi phiên bấm Start → ACTIVE, Session Rules bị đóng băng hoàn toàn"*): ở v1.0, "được tạo ra" và "bị đóng băng" là cùng một khoảnh khắc. Ghi Decision Log (§10).

## 1.2 Ghi chú ở `client.ts` nói cần driver WebSocket — không cần

`src/shared/db/client.ts` có ghi chú viết từ E1:

> Từ `E5-T4` trở đi có một chỗ bắt buộc interactive transaction (`SPEC-022` snapshot Group Rule sang Session Rule bên trong giao dịch Start — `TC-091`). Khi tới đó sẽ cần thêm driver WebSocket (`neon-serverless`) song song…

**Không đúng nữa, và phải sửa ghi chú đó trong slice này.** Interactive transaction cần thiết khi bước sau phụ thuộc *kết quả đọc về JavaScript* của bước trước. Snapshot không như vậy: nó là **một câu `INSERT … SELECT` tự chứa** — nguồn (`group_rules` của Group thuộc Session) và đích (`session_rules`) đều nằm trong DB, không có giá trị nào phải đi vòng qua Node.

Mà `db.batch()` của `neon-http` **là transaction Postgres thật** — đã verify ở E4-S2 và đang được `commitFinalize` của feature `meal` dựa vào cho `TC-109`. Nên hai câu (`INSERT … SELECT` + `UPDATE`) trong một `db.batch()` cho đúng tính nguyên tử mà `E5-T4` đòi, không cần thêm driver thứ hai.

Sửa ghi chú ở `client.ts` thành ghi nhận rằng chỗ tưởng cần thì hoá ra không, kèm lý do — xoá trắng sẽ làm người sau đặt lại đúng câu hỏi đó lần nữa.

## 1.3 THỨ TỰ hai câu trong batch quyết định bốn Test Case cùng lúc

Đây là quyết định kỹ thuật quan trọng nhất của slice.

`startDraft` hiện tại là một `UPDATE … WHERE id = $1 AND state = 'DRAFT' RETURNING …`. Thêm câu snapshot vào batch, có hai thứ tự:

**Sai — UPDATE trước, INSERT sau:** sau `UPDATE`, session đã `ACTIVE`. Câu `INSERT` không còn cách nào phân biệt "vừa được start ngay bây giờ" với "đã `ACTIVE` từ hôm qua". Một lần gọi `startDraft` lặp lại trên phiên đang chạy sẽ chép **Group Rule hiện tại** vào một phiên đang chạy — phá đúng `TC-090` và `TC-093`.

**Đúng — INSERT trước, UPDATE sau:**

```sql
INSERT INTO session_rules (session_id, rule_type, system_tag, minimum_count)
SELECT s.id, r.rule_type, r.system_tag, r.minimum_count
FROM selection_sessions s
JOIN group_rules r ON r.group_id = s.group_id
WHERE s.id = $1 AND s.state = 'DRAFT'          -- ← còn DRAFT, vì UPDATE chưa chạy
ON CONFLICT DO NOTHING;

UPDATE selection_sessions SET state = 'ACTIVE', started_at = now()
WHERE id = $1 AND state = 'DRAFT' RETURNING …;
```

Hai câu dùng **đúng cùng một điều kiện** `state = 'DRAFT'`, và câu đầu chạy khi điều kiện đó còn đúng. Bốn hành vi rơi ra từ một lựa chọn thứ tự:

| Test Case | Vì sao pass |
| --- | --- |
| `TC-091`, `TC-092` | Session `DRAFT` → `INSERT` chép đủ rule (0 rule thì chép 0 dòng, không phải lỗi), `UPDATE` chuyển `ACTIVE` |
| `TC-094` (gọi snapshot lần 2) | Session đã `ACTIVE` → `WHERE state='DRAFT'` không khớp → 0 dòng. Không cần đếm, không cần đọc trước |
| `TC-093`, `TC-090` (Admin sửa Group Rule sau Start) | Cùng lý do trên: không có đường nào chạy lại `INSERT` cho một phiên đã `ACTIVE` |
| `TC-035` (Start thất bại) | `UPDATE` vi phạm partial unique index → **cả batch rollback** → `session_rules` sạch |

`ON CONFLICT DO NOTHING` là lưới an toàn cho một ca hẹp còn lại: hai request Start đồng thời trên **cùng một** Draft — cả hai đọc `state='DRAFT'`, một bên commit trước. Không có nó, bên thua sẽ ném lỗi khoá chính thay vì trả `NOT_DRAFT` gọn gàng.

## 1.4 `session → rule` là chiều cross-feature thứ năm — cái đi qua ranh giới là CÂU LỆNH, không phải kết quả

`ALLOWED_CROSS_FEATURE` hiện có bốn chiều; không có mục nào cho `session`. Nhưng câu `INSERT … SELECT` ở trên phải nằm **trong cùng `db.batch()`** với `UPDATE` của `startDraft`, mà `startDraft` sống ở `features/session/infrastructure/`.

Ba lối, chọn lối thứ ba:

| Lối | Vì sao loại / chọn |
| --- | --- |
| Viết thẳng SQL của `session_rules` vào `drizzle-session-repository.ts` | Feature `session` sẽ sở hữu một mẩu SQL của bảng thuộc feature `rule`. Đổi schema `session_rules` ở v1.1 thì phải nhớ có một chỗ thứ hai — đúng loại nợ mà ranh giới feature sinh ra để chặn |
| Gọi `rule/application/snapshot.ts` sau khi `startDraft` trả về | Hai transaction rời nhau. `TC-035` hỏng ngay |
| **`rule/infrastructure` export một BUILDER trả về câu lệnh; `session` bỏ nó vào batch của mình** ✅ | Feature `rule` giữ toàn quyền sở hữu SQL của bảng mình; feature `session` giữ toàn quyền quyết định giao dịch của mình |

Điểm tinh tế đáng viết ra: thứ đi qua ranh giới **không phải dữ liệu, cũng không phải một câu query đã chạy** — mà là một `BatchItem` chưa thực thi. `rule` nói *"đây là việc cần làm"*, `session` quyết định *"nó chạy trong giao dịch nào"*. Không cần truyền đối tượng `tx` qua ranh giới (driver HTTP cũng không có `tx` để mà truyền).

Thêm vào `eslint.config.mjs`:

```js
const ALLOWED_CROSS_FEATURE = {
  selection: ['history', 'dish'],
  meal: ['rule', 'history'],
  session: ['rule'],   // ← MỚI, E5-T4. Xem DEC-043.
}
```

và cập nhật Tech Spec §2.3 ("đúng bốn chiều" → năm chiều). Ghi Decision Log (§10).

## 1.5 `session_rules` bỏ cột `id` — và lý do là một ràng buộc kỹ thuật thật

Tech Spec §3.1 dòng 165 ghi `session_rules(id, session_id, system_tag, minimum_count, rule_type)`.

Nhưng `INSERT … SELECT` không sinh được UUID v7 cho từng dòng: `uuidv7()` là hàm JavaScript, còn câu lệnh này chạy trọn trong Postgres. Ba lựa chọn:

1. `gen_random_uuid()` trong SQL — phá quy ước ghi ở đầu `schema.ts` (*"Khoá chính là UUID v7 (sinh ở tầng ứng dụng, không phụ thuộc phiên bản Postgres)"*).
2. Đọc `group_rules` về Node, sinh id, rồi ghi — mất tính tự chứa của câu lệnh, tức là mất §1.2, tức là phải thêm driver WebSocket.
3. **Bỏ cột `id`, khoá chính là bộ ba `(session_id, rule_type, system_tag)`.**

Chọn (3). Nó không phải thoả hiệp: `unique(session_id, rule_type, system_tag)` mà chính Tech Spec đòi **đã là khoá tự nhiên** của bảng; một dòng `session_rules` là bản sao đông cứng, không có định danh riêng và không có ai trỏ tới nó bằng khoá ngoại. Dự án đã có ba bảng cùng dạng, đều cố ý không `id`: `group_dish_tags`, `final_meal_items`, `session_decks`.

Ghi Decision Log (§10). `group_rules` (S1) **vẫn giữ `id`** — nó là bản gốc, người dùng sửa từng dòng, và nó không đi qua `INSERT … SELECT`.

## 1.6 `TC-072`/`TC-073` nằm ở dải `SPEC-016` nhưng thuộc slice này

Test Cases Spec xếp `TC-072`→`TC-075` dưới `SPEC-016` (Finalize). Master Plan lại giao `TC-072`, `TC-073`, `TC-110` cho `E5-T3` và `TC-074`, `TC-075` cho `E5-T5`. Không mâu thuẫn — ranh giới là **tầng**:

| TC | Tầng | Nội dung | Slice |
| --- | :---: | --- | :---: |
| `TC-072` | `D` | Rule `SOUP ≥ 1`, nháp thiếu → chặn | **S2** ← đây |
| `TC-073` | `D` | Món mang cả `MAIN` và `SOUP` thoả cả hai rule | **S2** ← đây |
| `TC-110` | `D` | Nháp 1 món, Rule Set rỗng → chốt được | **S2** ← đây |
| `TC-074` | `I` | Rule theo **snapshot**, không theo Group Rule hiện tại | S3 |
| `TC-075` | `I` | System Tag theo **hiện tại**, không theo lúc Start | S3 |

S2 chứng minh *hàm quyết định đúng*; S3 chứng minh *hàm được cho ăn đúng dữ liệu*. Hai việc khác nhau, hỏng theo hai kiểu khác nhau.

---

# 2. File tree

```
src/features/rule/domain/
  evaluate.ts                                     + MỚI (§3)
  evaluate.test.ts                                + MỚI (§3.1)
  group-rule.ts                                   (không đụng — S1)

src/shared/db/
  schema.ts                                       ~ SỬA — sessionRuleType + sessionRules (§4)
  migrations/0010_session_rules.sql               + MỚI (§4.1)
  client.ts                                       ~ SỬA — ghi chú driver (§1.2, §7)

src/features/rule/application/
  snapshot.ts                                     + MỚI (§5)
  rule-repository.ts                              ~ SỬA — thêm `listSessionRules` (§5)

src/features/rule/infrastructure/
  drizzle-rule-repository.ts                      ~ SỬA — buildSnapshotStatement (§6)
  drizzle-rule-repository.integration.test.ts     ~ SỬA — thêm ca snapshot (§6.1)

src/features/session/infrastructure/
  drizzle-session-repository.ts                   ~ SỬA — startDraft dùng batch (§7)
  drizzle-session-repository.integration.test.ts  ~ SỬA — TC-091→094, TC-035 (§7.1)

src/features/session/application/
  start-session.ts                                ~ SỬA — chỉ ghi chú (§7.2)

eslint.config.mjs                                 ~ SỬA — session: ['rule'] (§1.4)
```

---

# 3. `src/features/rule/domain/evaluate.ts` — MỚI (E5-T3)

```ts
import type { SystemTag } from '@/shared/domain/system-tag'

/** Một quy định đã đông cứng trong phiên. Cùng hình dạng với `GroupRuleDraft`
 *  nhưng KHÔNG dùng chung kiểu: nguồn của nó là `session_rules`, và ở v1.1 khi
 *  Preferred Rule xuất hiện thì hai bên sẽ tiến hoá khác nhau. */
export type RequiredRule = {
  readonly systemTag: SystemTag
  readonly minimumCount: number
}

/** Món trong nháp Final Meal, kèm System Tag **hiện tại** của nó (BR-052 — chứ
 *  không phải tag lúc Start; xem S3 §…). Không cần `dishId`: hàm này chỉ đếm. */
export type TaggedDish = {
  readonly systemTags: readonly SystemTag[]
}

export type RuleShortfall = {
  readonly systemTag: SystemTag
  readonly minimumCount: number
  readonly actual: number
  /** `minimumCount - actual`, luôn ≥ 1. Tính sẵn để presentation (E5-T9) không
   *  phải trừ lại — "Còn thiếu: 1 món canh" là con số này, không phải `minimumCount`. */
  readonly missing: number
}

export type RequiredEvaluation = {
  readonly satisfied: boolean
  /** Rỗng khi `satisfied`. Theo ĐÚNG thứ tự của `rules` đầu vào. */
  readonly shortfalls: readonly RuleShortfall[]
}

/**
 * SPEC-016 bước 2 + SDD §8 — đánh giá Required Rules trên một nháp Final Meal.
 *
 * **INDEPENDENT TAG COUNTING (TC-073).** Mỗi rule được đánh giá ĐỘC LẬP trên
 * toàn bộ danh sách món. Một món mang cả `MAIN` và `SOUP` (Bò kho bánh mì) đóng
 * góp trọn vẹn cho cả `Required MAIN` lẫn `Required SOUP`. SDD §8 gọi thẳng
 * tên thứ bị cấm: *"Tuyệt đối không phân bổ độc quyền kiểu slot allocation"*.
 *
 * Chỗ dễ sai nhất nằm ở cấu trúc chứ không ở phép đếm: nếu viết vòng lặp
 * NGOÀI theo `dishes` (mỗi món tìm một rule để "gán vào") thì slot allocation
 * xuất hiện gần như không tránh được. Vòng lặp ngoài PHẢI theo `rules`, và mỗi
 * lần lặp quét lại toàn bộ `dishes` từ đầu. N ≤ 5 rule × N ≤ 10 món — không có
 * gì để tối ưu ở đây.
 *
 * KHÔNG trả `boolean` trần: `E5-T9` phải in được "Còn thiếu: 1 món canh" ngay
 * trên nút chốt (không dùng modal), nên hàm phải nói THIẾU GÌ, THIẾU BAO NHIÊU.
 *
 * Rule Set rỗng → `satisfied: true` (TC-110). Không có quy định nghĩa là không
 * có gì để vi phạm — không phải "chưa cấu hình nên chặn cho chắc".
 */
export function evaluateRequired(input: {
  readonly rules: readonly RequiredRule[]
  readonly dishes: readonly TaggedDish[]
}): RequiredEvaluation {
  const shortfalls: RuleShortfall[] = []

  for (const rule of input.rules) {
    const actual = input.dishes.filter((dish) => dish.systemTags.includes(rule.systemTag)).length

    if (actual < rule.minimumCount) {
      shortfalls.push({
        systemTag: rule.systemTag,
        minimumCount: rule.minimumCount,
        actual,
        missing: rule.minimumCount - actual,
      })
    }
  }

  return { satisfied: shortfalls.length === 0, shortfalls }
}
```

## 3.1 Test — `evaluate.test.ts`

> [!IMPORTANT]
> **`TC-073` viết trước tiên, commit trước cả `evaluate.ts`.** Master Plan §11 đưa "viết `evaluateRequired` trước khi có `TC-073`" vào bảng rủi ro với phương án xử lý *"Bắt buộc viết test case `TC-073` trước theo TDD"*. Đây là chỗ duy nhất trong cả dự án mà kế hoạch chỉ đích danh một test phải đi trước.

```ts
import { describe, expect, it } from 'vitest'

import { evaluateRequired } from './evaluate'

const MAIN = { systemTag: 'MAIN', minimumCount: 1 } as const
const SOUP = { systemTag: 'SOUP', minimumCount: 1 } as const

describe('evaluateRequired', () => {
  // TC-073 — VIẾT TRƯỚC. Independent Tag Counting, SDD §8.
  it('một món mang cả MAIN và SOUP thoả CẢ HAI rule', () => {
    const result = evaluateRequired({
      rules: [MAIN, SOUP],
      dishes: [{ systemTags: ['MAIN', 'SOUP'] }], // Bò kho bánh mì
    })

    expect(result).toEqual({ satisfied: true, shortfalls: [] })
  })

  // TC-072 — thiếu canh.
  it('trả shortfall khi nháp thiếu món canh', () => {
    const result = evaluateRequired({
      rules: [SOUP],
      dishes: [{ systemTags: ['MAIN'] }, { systemTags: ['SIDE'] }],
    })

    expect(result).toEqual({
      satisfied: false,
      shortfalls: [{ systemTag: 'SOUP', minimumCount: 1, actual: 0, missing: 1 }],
    })
  })

  // TC-110 — Rule Set rỗng.
  it('Rule Set rỗng thì luôn thoả', () => {
    const result = evaluateRequired({ rules: [], dishes: [{ systemTags: [] }] })

    expect(result).toEqual({ satisfied: true, shortfalls: [] })
  })

  it('nháp rỗng và Rule Set rỗng cũng thoả', () => {
    expect(evaluateRequired({ rules: [], dishes: [] }).satisfied).toBe(true)
  })

  it('đếm đủ số lượng khi minimumCount lớn hơn 1', () => {
    const result = evaluateRequired({
      rules: [{ systemTag: 'MAIN', minimumCount: 2 }],
      dishes: [{ systemTags: ['MAIN'] }],
    })

    expect(result.shortfalls).toEqual([
      { systemTag: 'MAIN', minimumCount: 2, actual: 1, missing: 1 },
    ])
  })

  it('món không mang tag nào không đóng góp cho rule nào', () => {
    const result = evaluateRequired({ rules: [MAIN], dishes: [{ systemTags: [] }] })

    expect(result.satisfied).toBe(false)
  })

  it('giữ nguyên thứ tự rule trong shortfalls', () => {
    const result = evaluateRequired({
      rules: [SOUP, MAIN],
      dishes: [],
    })

    expect(result.shortfalls.map((s) => s.systemTag)).toEqual(['SOUP', 'MAIN'])
  })

  // Ca chống-hồi-quy cho slot allocation: nếu ai đó "phân bổ" mỗi món cho đúng
  // một rule, ca này sẽ ra satisfied=false.
  it('hai món hai tag chồng nhau vẫn thoả ba rule', () => {
    const result = evaluateRequired({
      rules: [MAIN, SOUP, { systemTag: 'SIDE', minimumCount: 1 }],
      dishes: [{ systemTags: ['MAIN', 'SOUP'] }, { systemTags: ['SOUP', 'SIDE'] }],
    })

    expect(result).toEqual({ satisfied: true, shortfalls: [] })
  })
})
```

---

# 4. Schema — `sessionRules`

Thêm vào `src/shared/db/schema.ts` **ngay sau `participants`** (cùng cụm Session):

```ts
/**
 * Tech Spec §3.1 dòng 165–167 — bản sao đông cứng của `group_rules` tại thời
 * điểm Start (SPEC-022).
 *
 * KHÔNG có `overridable`: Tech Spec bỏ cột đó ở bảng này, và đúng — "có cho
 * phép Creator override không" là thuộc tính của quy định GỐC, không phải của
 * bản sao đã đóng băng.
 *
 * KHÔNG có `id` — lệch Tech Spec §3.1 có chủ ý, xem DEC-044: câu snapshot là
 * `INSERT … SELECT` chạy trọn trong Postgres nên không sinh được UUID v7 ở
 * tầng ứng dụng, mà bộ ba `(session_id, rule_type, system_tag)` vốn đã là khoá
 * tự nhiên. Cùng khuôn `group_dish_tags`, `final_meal_items`, `session_decks`.
 *
 * Dùng LẠI `groupRuleType` chứ không khai enum thứ hai: hai bảng nói về đúng
 * cùng một khái niệm, và một `pgEnum` trùng nội dung là hai kiểu Postgres phải
 * cast qua lại trong chính câu `INSERT … SELECT` của snapshot.
 */
export const sessionRules = pgTable(
  'session_rules',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => selectionSessions.id),
    ruleType: groupRuleType('rule_type').notNull(),
    systemTag: systemTag('system_tag').notNull(),
    minimumCount: integer('minimum_count').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.ruleType, table.systemTag] }),
    check('session_rules_minimum_count_positive', sql`${table.minimumCount} >= 1`),
  ],
)

export type SessionRule = typeof sessionRules.$inferSelect
```

## 4.1 Migration `0010_session_rules.sql`

Như S1 §4.1: `yarn db:generate`, **đọc file `.sql`**, xác nhận có `CHECK`, đổi tên file thành `0010_session_rules.sql`, sửa `meta/_journal.json`.

```sql
CREATE TABLE "session_rules" (
	"session_id" uuid NOT NULL,
	"rule_type" "group_rule_type" NOT NULL,
	"system_tag" "system_tag" NOT NULL,
	"minimum_count" integer NOT NULL,
	CONSTRAINT "session_rules_session_id_rule_type_system_tag_pk" PRIMARY KEY("session_id","rule_type","system_tag"),
	CONSTRAINT "session_rules_minimum_count_positive" CHECK ("session_rules"."minimum_count" >= 1)
);
--> statement-breakpoint
ALTER TABLE "session_rules" ADD CONSTRAINT "session_rules_session_id_selection_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."selection_sessions"("id") ON DELETE no action ON UPDATE no action;
```

---

# 5. `rule/application` — port và hợp đồng snapshot

Thêm vào `rule-repository.ts` (S1):

```ts
import type { RequiredRule } from '../domain/evaluate'

export interface RuleRepository {
  // … listGroupRules, replaceGroupRules (S1) …

  /**
   * SPEC-022 phía đọc. Chỉ trả rule `REQUIRED` — v1.0 không có Preferred
   * (F22, v1.1), và người gọi (`finalizeSession`, S3) chỉ biết đánh giá
   * Required. Lọc ở SQL chứ không ở caller: đây là kiến thức của feature
   * `rule` về chính bảng của mình.
   */
  listSessionRules(sessionId: string): Promise<RequiredRule[]>
}
```

`snapshot.ts` — nơi ghi hợp đồng, không phải nơi chạy SQL:

```ts
/**
 * SPEC-022 — hợp đồng của bước snapshot. Bản thân câu lệnh do
 * `rule/infrastructure/drizzle-rule-repository.ts` dựng, và do
 * `session/infrastructure` THỰC THI bên trong `db.batch()` của `startDraft`
 * (DEC-043). File này tồn tại để hợp đồng có một chỗ đọc được mà không phải
 * lần theo SQL.
 *
 * BA BẤT BIẾN, cả ba do một lựa chọn thứ tự trong batch bảo đảm — xem
 * Implementation Guide E5-S2 §1.3:
 *
 * 1. CHỈ chép khi Session còn `DRAFT`. Câu snapshot chạy TRƯỚC câu UPDATE
 *    trong cùng giao dịch, nên nó nhìn thấy state cũ.
 * 2. IDEMPOTENT (TC-094). Gọi lần hai trên Session đã `ACTIVE` chép 0 dòng —
 *    vì điều kiện `state = 'DRAFT'` không còn khớp, không phải vì có ai đếm.
 * 3. NGUYÊN TỬ với Start (TC-035). Cùng `db.batch()`, nên `UPDATE` hỏng thì
 *    snapshot cũng biến mất.
 *
 * Hệ quả trực tiếp: Admin sửa Group Rule sau khi Start không chạm được vào
 * phiên đang chạy (TC-090, TC-093) — không phải vì có luật nào cấm, mà vì
 * không tồn tại đường code nào chạy lại câu snapshot cho một Session `ACTIVE`.
 */
export const SESSION_RULE_SNAPSHOT_CONTRACT = 'SPEC-022'
```

> [!NOTE]
> Một hằng số chuỗi chỉ để treo ghi chú là mùi lạ, và knip sẽ hỏi. Nếu `yarn knip` báo export chết, **bỏ file này đi** và chuyển trọn khối ghi chú lên đầu `buildSnapshotStatement` ở §6 — hợp đồng phải sống cạnh code thực thi hơn là sống trong một file rỗng. Master Plan chỉ định `src/features/rule/application/snapshot.ts` nhưng chỉ định đó có trước khi biết snapshot không cần một use case nào cả.

---

# 6. `drizzle-rule-repository.ts` — thêm builder

```ts
import { and, eq } from 'drizzle-orm'

import type { Database } from '@/shared/db/client'
import { groupRules, selectionSessions, sessionRules } from '@/shared/db/schema'

/**
 * SPEC-022 — DỰNG câu lệnh snapshot, KHÔNG chạy nó.
 *
 * Trả về một `BatchItem<'pg'>` để `session/infrastructure` bỏ vào `db.batch()`
 * của `startDraft`. Thứ đi qua ranh giới feature là VIỆC CẦN LÀM, không phải
 * dữ liệu và cũng không phải một query đã chạy: feature `rule` giữ toàn quyền
 * sở hữu SQL của bảng mình, feature `session` giữ toàn quyền quyết định giao
 * dịch của mình (DEC-043).
 *
 * `WHERE state = 'DRAFT'` là toàn bộ cơ chế idempotency và cách ly — câu này
 * PHẢI đứng TRƯỚC câu UPDATE trong batch. Đổi thứ tự hai câu sẽ làm TC-090 và
 * TC-093 hỏng mà không test nào ở tầng D bắt được.
 *
 * `INSERT … SELECT` chứ không đọc-về-rồi-ghi: giữ câu lệnh tự chứa là điều kiện
 * để `db.batch()` (driver HTTP) đủ dùng, không phải thêm driver WebSocket —
 * xem ghi chú ở `shared/db/client.ts`.
 */
export function buildSnapshotStatement(db: Database, sessionId: string) {
  return db
    .insert(sessionRules)
    .select(
      db
        .select({
          sessionId: selectionSessions.id,
          ruleType: groupRules.ruleType,
          systemTag: groupRules.systemTag,
          minimumCount: groupRules.minimumCount,
        })
        .from(selectionSessions)
        .innerJoin(groupRules, eq(groupRules.groupId, selectionSessions.groupId))
        .where(
          and(eq(selectionSessions.id, sessionId), eq(selectionSessions.state, 'DRAFT')),
        ),
    )
    .onConflictDoNothing()
}

async function listSessionRules(sessionId: string): Promise<RequiredRule[]> {
  const rows = await getDb()
    .select({ systemTag: sessionRules.systemTag, minimumCount: sessionRules.minimumCount })
    .from(sessionRules)
    .where(and(eq(sessionRules.sessionId, sessionId), eq(sessionRules.ruleType, 'REQUIRED')))

  return rows.sort((a, b) => (TAG_ORDER.get(a.systemTag) ?? 0) - (TAG_ORDER.get(b.systemTag) ?? 0))
}
```

> [!WARNING]
> `db.insert(t).select(q)` được `drizzle-orm@0.45.2` hỗ trợ (`PgInsertBase.select`, bốn overload) và `PgInsertBase` hiện thực `RunnableQuery<…, 'pg'>` — tức là hợp lệ làm `BatchItem`. Đã kiểm trong `node_modules/drizzle-orm/pg-core/query-builders/insert.d.ts`. Nếu `tsc` vẫn từ chối, overload nhận callback `select((qb) => qb.select({…}).from(…))` là lối thoát; **đừng** rơi về `db.execute(sql\`…\`)` — `PgRaw` không phải `RunnableQuery`, batch sẽ không nhận.

## 6.1 Integration test — thêm vào `drizzle-rule-repository.integration.test.ts`

| Ca | Khẳng định |
| --- | --- |
| `TC-091` | Group có 2 rule, Session `DRAFT` → chạy statement → `session_rules` có đúng 2 dòng, khớp `minimum_count` |
| `TC-092` | Group không rule → chạy statement → 0 dòng, không ném lỗi |
| `TC-094` | Chạy statement lần 2 khi Session đã `ACTIVE` → vẫn 2 dòng (không nhân đôi) |
| `TC-093` | Sau snapshot, `replaceGroupRules` đổi Group Rule → `listSessionRules` không đổi |
| Lọc `REQUIRED` | Chèn tay một dòng `PREFERRED` vào `session_rules` → `listSessionRules` không trả nó |

---

# 7. `drizzle-session-repository.ts` — `startDraft` dùng batch

```ts
import { buildSnapshotStatement } from '@/features/rule/infrastructure/drizzle-rule-repository'

/**
 * SPEC-008 + SPEC-022. HAI câu, MỘT giao dịch, THỨ TỰ CỐ ĐỊNH:
 *
 *   1. Snapshot Group Rule → Session Rule, guard `state = 'DRAFT'`.
 *   2. UPDATE state → ACTIVE, guard `state = 'DRAFT'`.
 *
 * Câu 1 PHẢI đứng trước câu 2: nó dựa vào việc state chưa đổi để phân biệt
 * "vừa start ngay bây giờ" với "đã ACTIVE từ trước". Đảo thứ tự làm TC-090 và
 * TC-093 hỏng — xem Implementation Guide E5-S2 §1.3.
 *
 * `db.batch()` của neon-http LÀ transaction Postgres thật (verify từ E4-S2,
 * `commitFinalize` đang dựa vào cho TC-109). Cả hai câu tự chứa nên KHÔNG cần
 * interactive transaction, tức KHÔNG cần driver WebSocket — ghi chú cũ ở
 * `client.ts` dự đoán ngược, đã sửa lại.
 *
 * Khối `catch` giữ NGUYÊN vai trò từ E1-T7: UPDATE vi phạm partial unique
 * index khi commit (TC-107). Điểm mới là batch rollback kéo theo cả snapshot —
 * đó chính là TC-035.
 */
async function startDraft(sessionId: string): Promise<StartDraftOutcome> {
  const db = getDb()

  try {
    const [, rows] = await db.batch([
      buildSnapshotStatement(db, sessionId),
      db
        .update(selectionSessions)
        .set({ state: 'ACTIVE', startedAt: new Date() })
        .where(and(eq(selectionSessions.id, sessionId), eq(selectionSessions.state, 'DRAFT')))
        .returning({
          id: selectionSessions.id,
          groupId: selectionSessions.groupId,
          decisionDate: selectionSessions.decisionDate,
        }),
    ])

    const updated = rows[0]
    if (updated === undefined) {
      // WHERE không khớp: session không tồn tại HOẶC không còn DRAFT. Câu
      // snapshot ở trên cũng không khớp vì cùng điều kiện — không có dòng
      // session_rules mồ côi nào được tạo.
      return { outcome: 'NOT_DRAFT' }
    }

    return { outcome: 'STARTED', session: { ...updated, state: 'ACTIVE' } }
  } catch (error) {
    if (isUniqueViolation(error, SESSION_UNIQUENESS_CONSTRAINT)) {
      return { outcome: 'ALREADY_EXISTS_TODAY' }
    }
    throw error
  }
}
```

## 7.1 Integration test — thêm vào `drizzle-session-repository.integration.test.ts`

| Ca | TC | Khẳng định |
| --- | :---: | --- |
| Start có rule | `TC-091` | Group 2 rule → `startDraft` → `session_rules` 2 dòng |
| Start không rule | `TC-092` | Group 0 rule → `startDraft` → `outcome: 'STARTED'`, `session_rules` 0 dòng |
| Start lần hai | `TC-094` | Gọi `startDraft` lại trên Session `ACTIVE` → `NOT_DRAFT`, `session_rules` vẫn 2 dòng |
| Đổi rule sau Start | `TC-090`, `TC-093` | `replaceGroupRules` với bộ rule khác → `session_rules` của phiên **không đổi** |
| **Start hỏng** | `TC-035` | Group đã có Session `ACTIVE` hôm nay + một Draft thứ hai → `startDraft(draft2)` trả `ALREADY_EXISTS_TODAY` và `session_rules` của `draft2` **rỗng** |

Ca cuối là DoD của `E5-T4`. Nó chỉ chứng minh được với DB thật — không có cách nào giả lập rollback của một giao dịch Postgres bằng mock:

```ts
it('TC-035 — Start thất bại thì không có Session Rule nào được tạo', async () => {
  const { groupId, decisionDate } = await seedGroupWithRules([
    { systemTag: 'MAIN', minimumCount: 1 },
    { systemTag: 'SOUP', minimumCount: 1 },
  ])

  const first = await createDraft({ groupId, decisionDate })
  const second = await createDraft({ groupId, decisionDate })

  expect((await drizzleSessionRepository.startDraft(first)).outcome).toBe('STARTED')

  const outcome = await drizzleSessionRepository.startDraft(second)
  expect(outcome.outcome).toBe('ALREADY_EXISTS_TODAY')

  const orphaned = await getDb()
    .select()
    .from(sessionRules)
    .where(eq(sessionRules.sessionId, second))
  expect(orphaned).toEqual([])
})
```

## 7.2 Ghi chú phải sửa

`src/features/session/application/start-session.ts` đang viết:

> Bước 5 (snapshot Group Rule → Session Rule) KHÔNG thuộc phạm vi hàm này — bảng `group_rules`/`session_rules` chưa tồn tại (tạo ở E5-T1, sau cả E3). `E5-T4` sẽ chèn bước snapshot vào ĐÚNG giao dịch `startDraft` bên dưới khi bảng đã có.

Thay bằng ghi chú đã hoàn tất: bước 5 **vẫn không nằm trong hàm này** (nó ở trong `startDraft` của infrastructure, đúng như dự báo), và `start-session.ts` không cần biết gì về rule — nói rõ điều đó để người sau không đi tìm.

`src/shared/db/client.ts`: sửa khối ghi chú theo §1.2 — dự đoán "E5-T4 cần driver WebSocket" đã sai, ghi lại lý do (câu lệnh tự chứa nên `db.batch()` đủ) để nó không được đặt lại.

---

# 8. Rủi ro

| Rủi ro | Dấu hiệu sớm | Xử lý |
| --- | --- | --- |
| Slot allocation lẻn vào `evaluateRequired` | Vòng lặp ngoài chạy theo `dishes` | Ca cuối §3.1 ("hai món hai tag chồng nhau") bắt được. Viết `TC-073` trước là hàng rào chính |
| Đảo thứ tự hai câu trong batch | Không test `D` nào đỏ | Chỉ `TC-090`/`TC-093` ở tầng `I` bắt được — đừng bỏ qua chúng vì "integration chạy chậm" |
| `insert().select()` không lọt kiểu | `tsc` đỏ ở §6 | Dùng overload callback; **không** rơi về `db.execute` (§6 warning) |
| `db.batch` đổi ngữ nghĩa | `TC-035` đỏ | Nếu batch hoá ra không rollback, `TC-035` là chỗ phát hiện — lúc đó mới bàn tới `neon-serverless`, và ghi chú cũ ở `client.ts` sống lại |
| Quên `session: ['rule']` | `yarn lint` đỏ ở `drizzle-session-repository.ts` | Đúng như thiết kế — ESLint là thứ bắt, không phải trí nhớ |

---

# 9. Test Cases coverage

| TC | Tầng | Ở đâu |
| --- | :---: | --- |
| `TC-072` | `D` | §3.1 "trả shortfall khi nháp thiếu món canh" |
| `TC-073` | `D` | §3.1 ca đầu tiên — **viết trước tiên** |
| `TC-110` | `D` | §3.1 "Rule Set rỗng thì luôn thoả" |
| `TC-090` | `I` | §7.1 "Đổi rule sau Start" |
| `TC-091` | `I` | §6.1 + §7.1 "Start có rule" |
| `TC-092` | `I` | §6.1 + §7.1 "Start không rule" |
| `TC-093` | `I` | §6.1 + §7.1 "Đổi rule sau Start" |
| `TC-094` | `I` | §6.1 + §7.1 "Start lần hai" |
| `TC-035` | `I` | §7.1 ca cuối — DoD của `E5-T4` |

---

# 10. Thứ tự TDD

1. **`evaluate.test.ts` với đúng ca `TC-073`** (đỏ) → `evaluate.ts` (xanh). Commit riêng nếu muốn có bằng chứng thứ tự.
2. Bổ sung các ca còn lại của §3.1 → sửa `evaluate.ts` nếu đỏ.
3. `schema.ts` + `yarn db:generate` → đọc `.sql` → `yarn db:migrate` → `\d+ session_rules`.
4. `eslint.config.mjs` thêm `session: ['rule']` → `yarn arch:probe`.
5. `drizzle-rule-repository.integration.test.ts` (đỏ) → `buildSnapshotStatement` + `listSessionRules` (xanh).
6. `drizzle-session-repository.integration.test.ts` ca `TC-035` (đỏ) → `startDraft` dùng batch (xanh).
7. Sửa ghi chú ở `start-session.ts` và `client.ts`.

---

# 11. Verify

## 11.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn test:integration
```

## 11.2 Bằng chứng đóng băng — DoD lớn nhất của slice

Trên DB `dev`, làm tay theo đúng thứ tự này và ghi lại kết quả:

```bash
psql "$DATABASE_URL" -c "SELECT rule_type, system_tag, minimum_count FROM session_rules WHERE session_id = '<id>' ORDER BY system_tag"
```

1. Đặt Group Rule `MAIN ≥ 1`, `SOUP ≥ 1` (qua màn S-07 của S1).
2. Mở phiên → Start → chạy câu trên: **2 dòng**.
3. Quay lại S-07, gỡ hết rule, Lưu.
4. Chạy lại câu trên với cùng `session_id`: **vẫn 2 dòng, y nguyên**.

Bước 4 là `TC-090` + `TC-093` bằng tay. Nếu nó ra 0 dòng, snapshot đang đọc `group_rules` lúc chốt chứ không phải lúc Start.

## 11.3 Đối chiếu tay `evaluateRequired`

| `rules` | `dishes` | Kỳ vọng |
| --- | --- | --- |
| `[MAIN≥1, SOUP≥1]` | `[{MAIN,SOUP}]` | `satisfied: true` |
| `[MAIN≥1, SOUP≥1]` | `[{MAIN}, {MAIN}]` | thiếu `SOUP`, `missing: 1` |
| `[MAIN≥2]` | `[{MAIN,SOUP}]` | thiếu `MAIN`, `actual: 1`, `missing: 1` |
| `[]` | `[{}]` | `satisfied: true` |

---

# 12. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v3.9.md`

```markdown
# DEC-042 — Session Rules Snapshot at Start, Not at Draft Creation

- **Ngày:** 2026-08-20
- **Trạng thái:** Accepted
- **Bối cảnh:** E5-S2

## Quyết định

Snapshot `group_rules → session_rules` xảy ra bên trong giao dịch Start (`DRAFT → ACTIVE`),
theo SPEC-022, chứ không lúc tạo Draft như BR-016 mô tả.

## Rationale

BR-016 gắn snapshot-lúc-Draft với quyền "Creator chỉnh Session Rules trong giai đoạn DRAFT".
Quyền đó là F35 Override Session Rule — v1.2. Không có màn hình nào sửa Session Rule ở v1.0,
nên snapshot sớm chỉ tạo thêm một trạng thái phải bảo trì: một Draft mang bản sao rule mà
không ai đọc, và phải làm mới nếu Admin đổi Group Rule trong lúc Draft còn treo. Snapshot lúc
Start khớp đúng BR-015 ("khi bấm Start, Session Rules bị đóng băng hoàn toàn") — ở v1.0, tạo
ra và đóng băng là cùng một khoảnh khắc.

## Consequence

- `TC-091`→`TC-094` viết trên đường đi của `startDraft`, không của `createDraftWithCreatorParticipant`.
- Khi F35 vào v1.2, snapshot dời về lúc tạo Draft và cần thêm bước "làm mới lúc Start" cho
  phần rule chưa bị override.

## Affected Documents

- Business Rules §5.1 (`BR-016`) — đánh dấu "một phần; vế Draft Editing thuộc v1.2".
```

```markdown
# DEC-043 — session → rule Is the Fifth Cross-Feature Edge; What Crosses Is an Unexecuted Statement

- **Ngày:** 2026-08-20
- **Trạng thái:** Accepted
- **Bối cảnh:** E5-S2

## Quyết định

Thêm `session: ['rule']` vào `ALLOWED_CROSS_FEATURE`. `rule/infrastructure` export
`buildSnapshotStatement(db, sessionId)` trả về một `BatchItem` CHƯA thực thi;
`session/infrastructure.startDraft` bỏ nó vào `db.batch()` của mình.

## Rationale

E5-T4 đòi snapshot nguyên tử với Start (TC-035), nên hai câu phải nằm trong cùng một giao
dịch, mà giao dịch đó do `startDraft` sở hữu. Viết thẳng SQL của `session_rules` vào
`drizzle-session-repository.ts` sẽ để feature `session` sở hữu một mẩu schema của feature
`rule`. Gọi snapshot như một use case rời sau `startDraft` phá TC-035.

Điểm khiến chiều thứ năm này chấp nhận được: thứ đi qua ranh giới không phải dữ liệu và cũng
không phải một query đã chạy, mà là mô tả việc cần làm. `rule` giữ quyền sở hữu SQL của bảng
mình; `session` giữ quyền quyết định giao dịch của mình. Không có đối tượng `tx` nào bị
truyền qua ranh giới — driver HTTP cũng không có `tx`.

## Consequence

- Tech Spec §2.3 chuyển từ "đúng bốn chiều" sang năm chiều.
- Mẫu "export câu lệnh, không export kết quả" là tiền lệ cho mọi lần sau cần ghi chéo feature
  trong một giao dịch.

## Affected Documents

- Tech Spec §2.3 — bảng chiều cross-feature.
- `src/shared/db/client.ts` — ghi chú "E5-T4 cần driver WebSocket" đã sai, sửa lại.
```

```markdown
# DEC-044 — session_rules Has No Surrogate id

- **Ngày:** 2026-08-20
- **Trạng thái:** Accepted
- **Bối cảnh:** E5-S2

## Quyết định

`session_rules` không có cột `id`; khoá chính là `(session_id, rule_type, system_tag)` —
lệch Tech Spec §3.1 dòng 165.

## Rationale

Snapshot là một câu `INSERT … SELECT` chạy trọn trong Postgres (điều kiện để `db.batch()` đủ
dùng, xem DEC-043). Câu đó không gọi được `uuidv7()` của JavaScript, nên giữ cột `id` buộc
phải chọn một trong hai: dùng `gen_random_uuid()` — phá quy ước "UUID v7 sinh ở tầng ứng dụng"
ghi ở đầu `schema.ts`; hoặc đọc `group_rules` về Node rồi ghi — mất tính tự chứa và kéo theo
nhu cầu driver WebSocket.

Bỏ `id` không mất gì: `unique(session_id, rule_type, system_tag)` mà chính Tech Spec đòi đã là
khoá tự nhiên, một dòng `session_rules` không có định danh riêng và không bảng nào trỏ tới nó.
Dự án đã có ba bảng cùng dạng: `group_dish_tags`, `final_meal_items`, `session_decks`.

## Consequence

- `group_rules` vẫn giữ `id` — bản gốc, người dùng sửa từng dòng, không đi qua `INSERT … SELECT`.

## Affected Documents

- Tech Spec §3.1 dòng 165 — bỏ `id` khỏi mô tả `session_rules`.
```

---

# 13. Master Plan

Sau khi slice xanh, tick §7:

```markdown
| `[x] E5-T3` | `evaluateRequired`, independent tag counting | … |
| `[x] E5-T4` | Snapshot Session Rule trong transaction Start | … |
```
