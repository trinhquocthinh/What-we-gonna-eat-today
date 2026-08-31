# 🧱 Implementation Guide — E7 Slice S1: Nền tảng ràng buộc và sở thích

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-26`
> - **Upstream:** [Master Plan §16.2](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E7-T1`, `E7-T2`) • [SDD §8.1](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-024`, `SPEC-025`) • [Business Rules](../../what-we-gonna-eat-today_business-rules_v1.7.md) (`BR-034`, `BR-037`, `BR-043`) • [Ranking Spec §2.2](../../what-we-gonna-eat-today_ranking-specification_v1.3.md) • [Test Cases](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-118`, `TC-119`, `TC-120`)
> - **Tiền đề:** `E7-T0` đã vá xong 64 link gãy, `yarn verify` xanh.
>
> 🧱 *Slice mở đầu E7. Không có gì hiện lên màn hình sau slice này — nó dựng bảng, dựng feature thứ chín, và mở khoá số hạng $E$ đã nằm im trong `RANKING_CONFIG` từ E4.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E7-T1` | Schema ràng buộc & sở thích cá nhân | 2.5 | `src/shared/db/schema.ts`, `src/shared/db/migrations/**` | Hai bảng chạy migration được cả trên nhánh DB sạch |
| `E7-T2` | Domain sở thích và số hạng $E$ | 3 | `src/features/preference/domain/**`, `src/features/selection/domain/ranking.ts` | `computePersonalScore` cộng `wExplicit * E`, `LIKE` đẩy món lên trước |

- [ ] `ALLOWED_CROSS_FEATURE` có đúng **7 chiều**, `yarn arch:probe` bắt 6 vi phạm và không báo nhầm chiều hợp lệ (§1.1)
- [ ] `preference_kind` **không** có giá trị `NEUTRAL` (§1.2)
- [ ] `TC-118`, `TC-119`, `TC-120` xanh
- [ ] `computePersonalScore` có test khẳng định `DISLIKE` **hạ điểm nhưng không loại** món (§1.4)
- [ ] `yarn verify && yarn arch:probe` xanh — `knip --production` không báo export chết (§1.5)

> [!IMPORTANT]
> Ba việc ở §1.1 phải làm **trước** dòng code đầu tiên của `E7-T2`. Bỏ qua thì ESLint chặn đúng lúc code đã viết xong, và cách sửa lúc đó là quay lại đúng ba việc này.

---

# 1. Năm phát hiện — đọc trước khi gõ

## 1.1 `preference` là feature thứ chín, và nó cần HAI chiều chứ không phải một

[eslint.config.mjs](../../../eslint.config.mjs) hiện khai đúng 5 chiều:

```js
const ALLOWED_CROSS_FEATURE = {
  selection: ['history', 'dish'],
  meal: ['rule', 'history'],
  session: ['rule'],
}
```

E7 mở thêm **hai** chiều:

| Chiều | Vì sao | Dùng ở |
| --- | --- | :---: |
| `selection → preference` | `listDeck` lọc cứng món `Cannot Eat` và đọc $E$ để tính điểm | S2, và §4 của guide này |
| `meal → preference` | `finalizeSession` cần tập người đã khai `Cannot Eat` để áp ngoại lệ `BR-056` | S3 (`E7-T7`) |

**Chiều thứ hai là chiều dễ bị bỏ sót.** Lịch sử ăn thuộc feature `history`, nên phản xạ đầu tiên là khai `history → preference`. Nhưng [`buildDefaultEatingHistory`](../../../src/features/history/domain/default-eating-history.ts) là hàm **thuần** — nó *nhận* dữ liệu qua tham số chứ không tự truy vấn. Chỗ thật sự phải đọc bảng là [`finalizeSession`](../../../src/features/meal/application/finalize-session.ts), tức feature `meal`. Khai nhầm `history → preference` thì ESLint vẫn xanh nhưng chiều đó không ai dùng, còn chiều thật sự cần thì vẫn bị chặn.

Ba việc phải làm, theo thứ tự:

1. Sửa `ALLOWED_CROSS_FEATURE` thành:

   ```js
   const ALLOWED_CROSS_FEATURE = {
     selection: ['history', 'dish', 'preference'],
     meal: ['rule', 'history', 'preference'],
     session: ['rule'],
   }
   ```

   `preference` **không** có mục riêng — nó không được import feature nào. Đây là chủ đích: `preference` là feature lá, giống `rule`.

2. Sửa thông điệp lỗi trong cùng file: `"Năm chiều hợp lệ ghi ở Tech Spec §2.3"` → `"Bảy chiều hợp lệ ghi ở Tech Spec §2.3"`.

3. Thêm probe vào [scripts/probe-architecture.sh](../../../scripts/probe-architecture.sh) — **một chiều hợp lệ mới và một chiều bị cấm mới**:

   ```bash
   # Chiều ĐƯỢC PHÉP mới theo §2.3: selection -> preference. Không được báo lỗi.
   cat > src/features/selection/domain/_probe-ok-2.ts <<'EOF'
   import { probeValue } from '../../preference/domain/_probe-pref-target'
   export const okPref = probeValue
   EOF

   # 6. cross-feature bị cấm: preference -> selection (preference là feature lá)
   cat > src/features/preference/domain/_probe-6.ts <<'EOF'
   import type { ProbePort } from '../../selection/application/_probe-port'
   export const f: ProbePort | null = null
   EOF
   ```

   Rồi trong khối `node --input-type=module`: `EXPECTED` từ `5` → `6`, regex `/^_probe-[1-4]\.ts$/` → `/^_probe-[1-6]\.ts$/`, và điều kiện báo nhầm đổi từ `name === '_probe-ok.ts'` sang `name.startsWith('_probe-ok')`. Nhớ thêm cả 3 file mới vào mảng `PROBES` để `cleanup` xoá được chúng.

4. [Tech Spec §2.3](../../what-we-gonna-eat-today_tech-spec-architecture_v1.2.md): *"đúng **5 chiều** quan hệ"* → **7 chiều**, thêm hai dòng vào sơ đồ. [README](../../../README.md) §2 cũng liệt kê danh sách này.

> [!CAUTION]
> `yarn arch:probe` **không** nằm trong `yarn verify`. Phải chạy tay. Nếu chỉ chạy `verify`, một cấu hình zone sai vẫn xanh — đúng thứ mà chính script này sinh ra để ngăn (xem đầu file `probe-architecture.sh`).

## 1.2 `preference_kind` không có `NEUTRAL`, và đó là tiền lệ chứ không phải sáng tạo

[`interaction.ts`](../../../src/features/selection/domain/interaction.ts) ghi nguyên văn:

> `InteractionType` KHÔNG có giá trị `NONE` — "None" được biểu diễn bằng việc KHÔNG tồn tại row

`preference` dùng đúng khuôn đó: `pgEnum('preference_kind', ['LIKE', 'DISLIKE'])`, và "Neutral" = không có dòng.

Vì sao không thêm `NEUTRAL` cho tiện: một enum ba giá trị cho phép hai cách biểu diễn cùng một trạng thái (`NEUTRAL` và không-có-dòng), nên mọi truy vấn sau này phải xử lý cả hai, và sớm muộn sẽ có chỗ chỉ xử lý một. `TC-120` canh đúng chỗ này: đặt `preference = null` khi đang là `LIKE` phải **xoá dòng**, không phải ghi `NEUTRAL`.

## 1.3 `Cannot Eat` và `Like/Dislike` là hai bảng, không phải một bảng ba trạng thái

Đã cân nhắc gộp thành một bảng `user_dish_preferences` với enum bốn giá trị `LIKE | DISLIKE | CANNOT_EAT`. Bác bỏ, vì `BR-043` phân định chúng là hai loại khác nhau và hành vi chứng minh điều đó:

| | `Cannot Eat` (`BR-034`) | `Like/Dislike` (`BR-037`) |
| --- | --- | --- |
| Tác động lên deck | **Lọc cứng** ở Stage 1 | Chỉ đổi điểm ở Stage 2 |
| Tác động lên tương tác đang có | **Xoá** | Không |
| Tác động lên Session Ranking | Số hạng $X$, hệ số $-1.0$ | Không |
| Tác động lên lịch sử ăn | Ngoại lệ `BR-056` | Không |

Bốn dòng khác nhau. Gộp lại thành một cột enum nghĩa là mọi chỗ đọc nó đều phải rẽ nhánh `if (kind === 'CANNOT_EAT')` — tức là hai bảng, chỉ là giả trang thành một.

Ngoài ra `user_dish_constraints` **không cần cột kind**: `Blacklist` (`BR-035`) là v1.2 và khi vào sẽ có ngữ nghĩa riêng (không xoá tương tác). Thêm cột enum một-giá-trị hôm nay là đoán trước một thiết kế chưa chốt.

## 1.4 `DISLIKE` hạ điểm nhưng KHÔNG loại món — và test phải nói ra điều đó

`BR-037` nguyên văn: *"`Dislike` chỉ hạ điểm xếp hạng cá nhân, **không** lọc cứng món khỏi Deck."*

Đây là ranh giới dễ trôi nhất của cả slice: `wExplicit = 0.3` là **trọng số lớn nhất** trong `RANKING_CONFIG.personalRanking` (lớn hơn cả `wRecency = 0.25`), nên một món `DISLIKE` sẽ tụt rất sâu và trông y như đã bị lọc. Không có test nói rõ thì không ai phát hiện nếu về sau có người "tối ưu" bằng cách lọc luôn nó ở SQL.

`TC-119` là ca canh chỗ này, và nó phải khẳng định **món vẫn có mặt trong danh sách trả về**, chứ không phải khẳng định điểm của nó thấp.

## 1.5 `knip --production` báo export chết trong cùng slice

Cấu hình [knip.jsonc](../../../knip.jsonc) chạy `--production` và có `ignoreExportsUsedInFile: true`. Hệ quả cụ thể cho slice này: nếu `E7-T2` export `explicitPreferenceScore` mà chưa hàm nào ngoài file gọi tới, `yarn knip` đỏ.

**Cách làm đúng:** `E7-T2` phải nối thẳng vào `computePersonalScore` **trong cùng slice**, không để dành tới S2. Nghĩa là `RankingInput` nhận thêm trường `explicit` ngay ở đây, và [`buildDeck`](../../../src/features/selection/domain/ranking.ts) truyền giá trị đó xuống — dù ở S1 mọi giá trị thật vẫn là `0` vì chưa có đường ghi dữ liệu (S2 mới có).

Truyền hằng `0` không vi phạm nguyên tắc *"đừng thêm trường mà không hàm nào tính ra giá trị thật"* đã ghi ở đầu `ranking.ts`: ở đây hàm tính **đã có** (`explicitPreferenceScore`), chỉ là nguồn dữ liệu tới ở slice sau. Khác hẳn `wImplicit`/`wChef` — những thứ chưa có cả hàm lẫn nguồn.

---

# 2. File tree

```text
src/features/preference/                          # MỚI — feature thứ chín
├── domain/
│   ├── explicit-preference.ts                    # E7-T2 — ánh xạ LIKE/DISLIKE/null → E
│   └── explicit-preference.test.ts
└── application/
    └── preference-repository.ts                  # port; S2 mới có hiện thực

src/shared/db/
├── schema.ts                                     # E7-T1 — +2 bảng, +1 enum
└── migrations/0011_user_preferences.sql          # MỚI

src/features/selection/domain/
├── ranking.ts                                    # E7-T2 — RankingInput.explicit
└── ranking.test.ts                               # +TC-118, TC-119, TC-120

eslint.config.mjs                                 # §1.1 — 5 → 7 chiều
scripts/probe-architecture.sh                     # §1.1 — EXPECTED 5 → 6
vitest.config.mts                                 # §5 — exclude port mới
```

---

# 3. `E7-T1` — Schema

Thêm vào [schema.ts](../../../src/shared/db/schema.ts), đặt **sau** `globalDishes` và trước `groupRules` — cùng chỗ với các bảng nói về món.

```ts
/**
 * BR-034 — Cannot Eat. Khoá theo `global_dishes.id` chứ KHÔNG theo
 * `group_dishes.id`: người dị ứng tôm thì dị ứng ở mọi nhóm, và DEC-009 đã
 * chốt "thêm lại món là tạo dòng group_dishes mới" — gắn vào đó thì mỗi lần
 * nhóm gỡ rồi thêm lại, người ta phải khai lại.
 *
 * KHÔNG có cột `kind`: `Blacklist` (BR-035) là v1.2 và có ngữ nghĩa khác hẳn
 * (không xoá tương tác đang có). Một cột enum một-giá-trị hôm nay là đoán
 * trước một thiết kế chưa chốt — xem Guide §1.3.
 */
export const userDishConstraints = pgTable(
  'user_dish_constraints',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    globalDishId: uuid('global_dish_id')
      .notNull()
      .references(() => globalDishes.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.globalDishId] })],
)

/**
 * SDD §2.2 khuôn `interactions`. KHÔNG có giá trị `NEUTRAL` — "Neutral" là
 * việc KHÔNG tồn tại row, đúng như `InteractionType` không có `NONE`.
 */
export const preferenceKind = pgEnum('preference_kind', ['LIKE', 'DISLIKE'])

/** BR-037 — Explicit Preference. Cùng lý lẽ khoá theo `global_dishes.id`. */
export const userDishPreferences = pgTable(
  'user_dish_preferences',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    globalDishId: uuid('global_dish_id')
      .notNull()
      .references(() => globalDishes.id),
    kind: preferenceKind('kind').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.globalDishId] })],
)

export type UserDishConstraint = typeof userDishConstraints.$inferSelect
export type UserDishPreference = typeof userDishPreferences.$inferSelect
```

**Khoá chính tổ hợp, không cột `id`** — cùng khuôn `group_dish_tags`, `session_rules`, `final_meal_items` ([DEC-044](../../what-we-gonna-eat-today_decision-log_v3.9.md)): `(user_id, global_dish_id)` vốn đã là khoá tự nhiên, và mỗi cặp chỉ có đúng một dòng.

Sinh migration bằng `yarn db:generate`, đổi tên file thành `0011_user_preferences.sql` cho đọc được — cùng cách `0009_group_rules.sql` và `0010_session_rules.sql` đã làm. **Đọc lại file SQL sinh ra** trước khi chạy `yarn db:migrate`: drizzle-kit đôi khi sinh `DROP` không mong muốn khi nó hiểu nhầm một bảng là đổi tên.

---

# 4. `E7-T2` — Domain và số hạng $E$

## 4.1 `preference/domain/explicit-preference.ts` — MỚI

```ts
/**
 * BR-037 — Explicit Preference. `null` = Neutral (không có dòng trong
 * `user_dish_preferences`), KHÔNG phải một giá trị enum thứ ba (Guide §1.2).
 */
export type PreferenceKind = 'LIKE' | 'DISLIKE'

/** $E \in \{-1, 0, +1\}$ của Ranking Spec §2.2. */
export function explicitPreferenceScore(kind: PreferenceKind | null): number {
  if (kind === 'LIKE') return 1
  if (kind === 'DISLIKE') return -1
  return 0
}
```

Hàm thuần, không phụ thuộc gì — nằm trong phạm vi đo coverage và phải đạt 100% một cách tự nhiên (ba nhánh, ba ca).

### Test — `explicit-preference.test.ts` (`TC-118`)

```ts
it('LIKE → +1, không đặt → 0, DISLIKE → -1', () => {
  expect(explicitPreferenceScore('LIKE')).toBe(1)
  expect(explicitPreferenceScore(null)).toBe(0)
  expect(explicitPreferenceScore('DISLIKE')).toBe(-1)
})
```

## 4.2 `selection/domain/ranking.ts` — mở rộng

`RankingInput` hiện chỉ có `recencyPenalty`, kèm ghi chú giải thích vì sao nó cố ý thiếu `explicit`. **Sửa cả ghi chú đó**, đừng chỉ thêm trường — một comment nói "cố ý chưa có `explicit`" nằm ngay trên một kiểu đã có `explicit` là thứ khiến người đọc sau này mất mười phút.

```ts
/**
 * Ranking Spec §2.2 + SDD SPEC-010. Ở v1.1 CÓ HAI số hạng có dữ liệu thật:
 * `recencyPenalty` (từ E4) và `explicit` (từ E7-S2). Ba số hạng còn lại —
 * `implicit` (F30), `chef` (F33), `source` (F36) — vẫn cố ý vắng mặt: thêm
 * một trường mà không hàm nào tính ra được giá trị thật cho nó chỉ tạo ảo
 * giác tính năng đã có.
 */
export type RankingInput = {
  readonly recencyPenalty: number
  /** $E \in \{-1, 0, +1\}$ từ `explicitPreferenceScore` (SPEC-025). */
  readonly explicit: number
}

/** $\text{score} = w_{\text{explicit}} \times E - w_{\text{recency}} \times R$ — SPEC-010, v1.1. */
export function computePersonalScore(input: RankingInput, config: RankingConfig): number {
  return (
    config.personalRanking.wExplicit * input.explicit -
    config.personalRanking.wRecency * input.recencyPenalty
  )
}
```

`DishRankingInput` cũng nhận thêm `explicit: number`, và `buildDeck` truyền nó vào `computePersonalScore` ở cả hai vế của phép so sánh.

Ở S1 người gọi duy nhất là [`list-deck.ts`](../../../src/features/selection/application/list-deck.ts) và nó truyền `explicit: 0` — nguồn dữ liệu thật tới ở S2 (§1.5). Ghi một dòng comment tại chỗ truyền `0` nói rõ điều đó, kèm `E7-T4`.

### Test — `ranking.test.ts`

| Ca | Nội dung | Khẳng định |
| --- | --- | --- |
| `TC-119` | Hai món cùng `recencyPenalty`, một `DISLIKE` một Neutral | Món `DISLIKE` **vẫn có mặt** trong mảng `buildDeck` trả về, chỉ xếp sau |
| — | `LIKE` (+1) vs Neutral (0), cùng $R$ | `LIKE` xếp trước; hiệu số điểm đúng bằng `0.3` |
| — | `DISLIKE` ($E = -1$, $R = 0$) vs Neutral vừa ăn hôm qua ($E = 0$, $R = 0.86$) | Món vừa ăn xếp **sau** — $0.3 > 0.25 \times 0.86$, tức `wExplicit` đủ mạnh để lật thứ tự |

Ca thứ ba là ca đáng viết nhất: nó biến một quan hệ giữa hai hằng số thành một khẳng định. Đổi `wExplicit` hay `wRecency` về sau sẽ làm nó đỏ, và đó chính là lúc cần dừng lại nghĩ.

> [!NOTE]
> `TC-120` (đặt `null` khi đang `LIKE` thì xoá dòng) là ca ở tầng `application`/`infrastructure`, **không** thuộc slice này — nó thuộc S2 cùng `setDishPreference`. Ghi ở đây để không ai đi tìm nó trong `domain/`.

---

# 5. `vitest.config.mts`

`preference-repository.ts` là port thuần kiểu, biên dịch ra JavaScript rỗng. Nó đã khớp sẵn mẫu `exclude` hiện có:

```
'src/features/*/application/*-repository.ts'
```

→ **không phải sửa gì.** Kiểm lại bằng `yarn test:coverage` và xác nhận `preference-repository.ts` không xuất hiện trong báo cáo.

`explicit-preference.ts` **nằm trong** phạm vi đo (`src/features/*/domain/**`) và phải đạt 100%.

---

# 6. Rủi ro

| Rủi ro | Dấu hiệu | Xử lý |
| --- | --- | --- |
| Quên `arch:probe` | `yarn verify` xanh nhưng `yarn arch:probe` đỏ ở lần chạy tay đầu tiên | Chạy `arch:probe` ngay sau khi sửa `eslint.config.mjs`, trước khi viết code |
| Khai nhầm `history → preference` | ESLint xanh, nhưng S3 bị chặn ở `finalizeSession` | §1.1 — chiều đúng là `meal → preference` |
| `knip` báo `explicitPreferenceScore` chết | `yarn knip` đỏ cuối slice | §1.5 — nối vào `computePersonalScore` ngay trong S1 |
| `drizzle-kit generate` sinh `DROP` lạ | File `0011_*.sql` có `DROP TABLE` | Đọc SQL trước khi `db:migrate`; xoá file và sinh lại nếu sai |
| Thêm `NEUTRAL` cho tiện | `preference_kind` có 3 giá trị | §1.2 — hai cách biểu diễn cùng một trạng thái |

---

# 7. Test Cases coverage

`TC-118` (§4.1) • `TC-119` (§4.2) • `TC-120` → **S2**, ghi chú ở §4.2.

---

# 8. Thứ tự TDD

1. `eslint.config.mjs` + `probe-architecture.sh` + Tech Spec §2.3 + README → `yarn arch:probe` xanh với 6 vi phạm.
2. `explicit-preference.test.ts` (đỏ) → `explicit-preference.ts` (xanh).
3. `ranking.test.ts` ba ca mới (đỏ) → sửa `RankingInput` + `computePersonalScore` (xanh).
4. Sửa `list-deck.ts` truyền `explicit: 0` → `yarn test` xanh trở lại.
5. `schema.ts` + `yarn db:generate` → đọc SQL → `yarn db:migrate`.
6. `yarn verify && yarn arch:probe`.

Bước 5 đặt **sau** bước 2–4 có chủ đích: `E7-T2` không cần bảng tồn tại để chạy test (toàn hàm thuần), nên đẩy migration ra sau giữ cho vòng lặp TDD không phải chờ database.

---

# 9. Verify

## 9.1 Cổng máy

```bash
yarn verify && yarn arch:probe
```

## 9.2 Bằng chứng $E$ thật sự tác động tới thứ tự

Không có giao diện ở slice này, nên bằng chứng nằm ở test. Chạy riêng và đọc kết quả:

```bash
yarn vitest run src/features/selection/domain/ranking.test.ts
```

Ca *"`DISLIKE` xếp sau món vừa ăn hôm qua"* phải xanh. Nếu nó đỏ, `wExplicit` chưa được nối vào công thức — chứ không phải test sai.

## 9.3 Bằng chứng schema

```bash
yarn db:studio
```

Hai bảng `user_dish_constraints` và `user_dish_preferences` có mặt, mỗi bảng có khoá chính tổ hợp hai cột và **không** có cột `id`.

---

# 10. Master Plan — dòng phải cập nhật

[Master Plan §16.2](../../what-we-gonna-eat-today_master-plan_v2.1.md): gắn nhãn `S1` cho `E7-T1`, `E7-T2`; thêm cột link tới guide này. Bảng §1 giữ nguyên `E7 = 19 giờ` (chia slice không đổi tổng).
