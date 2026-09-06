# 🧠 Implementation Guide — E13 Slice S1: Bộ máy học sở thích

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-09-05`
> - **Upstream:** [Master Plan §17.2](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E13-T1` → `E13-T5`) • [SDD §9.1](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-037`, `SPEC-038`, `SPEC-039`) • [Ranking Spec §2.2, §5](../../what-we-gonna-eat-today_ranking-specification_v1.3.md) • [Business Rules](../../what-we-gonna-eat-today_business-rules_v1.8.md) (`BR-035`, `BR-036`, `BR-038`, `BR-047`, `BR-048`, `BR-061`) • [Decision Log](../../what-we-gonna-eat-today_decision-log_v3.9.md) (`DEC-036`, `DEC-060`, `DEC-069`) • [Test Cases](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-159` → `TC-165`, `TC-167`, `TC-169`, `TC-170`, `TC-174`)
> - **Tiền đề:** `M4` xong (`9420ba8`). `E14` độc lập, chạy song song được.
> - **Slice sau:** `E13-S2` (`T6` → `T8`) — use case, Route Handler, hai màn giao diện.
>
> 🧠 *Slice này không thêm nút nào. Nó làm cho hệ thống bắt đầu **quan sát**: mỗi lượt vuốt trong một phiên đã chốt trở thành một tín hiệu có trọng số, phân rã theo chu kỳ 60 ngày, cộng vào điểm cá nhân ở lần dựng deck kế tiếp.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E13-T1` | Schema cờ món cá nhân + mốc quên | 3.5 | `shared/db/schema.ts`, `shared/db/migrations/**` | `user_dish_constraints` có cột `kind`, khoá chính ba cột, dòng cũ thành `'CANNOT_EAT'`; rollback chạy được |
| `E13-T2` | Hàm thuần `computeImplicitPreference` | 2.5 | `selection/domain/implicit-preference.ts` | `TC-159` → `TC-162` xanh; `yarn arch:probe` vẫn đúng bảy chiều |
| `E13-T3` | Mở rộng `RankingInput` | 1.5 | `selection/domain/ranking.ts` | $I$ có mặt trong công thức; `TC-125` → `TC-127` **vẫn** xanh |
| `E13-T4` | Truy vấn lịch sử vuốt cho $I$ | 3 | `selection/**/selection-repository.ts`, `drizzle-selection-repository.ts` | MỘT truy vấn; `TC-163` → `TC-165`, `TC-174` xanh |
| `E13-T5` | Nối vào `list-deck` | 2.5 | `selection/application/list-deck.ts`, `preference/**` | `TC-167`, `TC-169`, `TC-170` xanh; không chiều cross-feature mới |

- [x] Món `HISTORY_WHITELIST` **không** bị lọc khỏi deck (§1.1 — lỗi im lặng nguy hiểm nhất của epic)
- [x] Cả **năm** đường đọc/ghi `user_dish_constraints` đều nêu rõ `kind` (§1.2)
- [x] `computePersonalScore` không trả `NaN` cho bất kỳ món nào (§1.3)
- [x] Không hằng số mới ở bất kỳ đâu — `RANKING_CONFIG` đã có đủ (§1.4)
- [x] `ALLOWED_CROSS_FEATURE` **vẫn đúng bảy chiều**, không thêm dòng nào
- [x] Số dòng `interactions` không đổi trong suốt slice
- [x] `yarn verify && yarn arch:probe && yarn test:integration` xanh

---

# 1. Bốn phát hiện — đọc trước khi gõ

## 1.1 Stage 1 Hard Filter nằm trong SQL, không nằm ở `list-deck`

Đọc tên `listDeck` thì tưởng phép lọc `Cannot Eat` ở tầng use case. Không. Nó là một mệnh đề `notExists` bên trong [`listEligibleDishCards`](../../../src/features/selection/infrastructure/drizzle-selection-repository.ts):

```ts
notExists(
  getDb().select({ one: sql`1` }).from(userDishConstraints)
    .where(and(
      eq(userDishConstraints.userId, userId),
      eq(userDishConstraints.globalDishId, globalDishes.id),
    )),
)
```

Mệnh đề này hỏi *"user có dòng nào cho món này không"*. Hôm nay câu hỏi đó tương đương *"user có khai Cannot Eat không"*, vì bảng chỉ chứa một loại dòng.

`E13-T1` phá vỡ sự tương đương ấy. Sau khi có cột `kind`, một dòng `HISTORY_WHITELIST` cũng làm `notExists` trả `false` — và **món được Whitelist biến mất khỏi deck**. Đúng ngược lại điều `BR-036` muốn: người ta bấm "ăn hoài không chán" rồi món ấy không bao giờ hiện ra nữa.

Không cổng nào bắt được. `tsc` không bắt vì không có kiểu nào sai. ESLint không bắt. `TC-169` không bắt vì nó nằm ở tầng `D` — nó kiểm hàm thuần ép $R = 0$, không kiểm món có trong deck hay không. Chỉ `TC-167` (tầng `I`, ca Blacklist) đi qua đường này, và nó khẳng định món **bị** lọc — tức là ca đó vẫn xanh trong khi lỗi vẫn còn.

**Cho nên `TC-169` phải có một ca `I` đi kèm:** món Whitelist vẫn **có mặt** trong deck. Ghi ở §7 bước 6.

## 1.2 Năm đường chạm `user_dish_constraints`, tất cả đều phải nêu `kind`

SDD §10 viết bằng chữ: *"mọi truy vấn hiện đang đọc `user_dish_constraints` phải nêu rõ `kind`"*. Đây là danh sách đầy đủ, đã `grep` ra:

| Đường | File | Sau `E13-T1` phải là |
| --- | --- | --- |
| Stage 1 hard filter | `selection/infrastructure/drizzle-selection-repository.ts` | `kind IN ('CANNOT_EAT', 'BLACKLIST')` |
| $X$ của `SPEC-014` | `countCannotEatByDish`, cùng file | `kind = 'CANNOT_EAT'` |
| Tập ràng buộc một người | `findConstrainedGlobalDishIds`, `preference/infrastructure/**` | `kind` thành **tham số** |
| Cặp `(user, món)` lúc chốt bữa | `findCannotEatPairs`, cùng file | `kind = 'CANNOT_EAT'` |
| Đường **ghi** | `setConstraint`, cùng file | rẽ nhánh theo `kind` — `S2` |

Bốn cái đầu thuộc slice này. Cái thứ năm là `E13-T6`, slice sau — nhưng nó là chỗ nguy hiểm nhất của cả epic (`TC-166`), nên đã ghi ở đây để không ai đọc bảng này mà tưởng đã xong.

**Cách ép bằng máy thay vì bằng lời nhắc:** `findConstrainedGlobalDishIds(userId)` đổi thành `findConstrainedGlobalDishIds(userId, kind)` với `kind` **bắt buộc**. `tsc` sẽ liệt kê đủ mọi chỗ gọi. Một tham số bắt buộc là phiên bản có trình biên dịch của câu "đừng quên".

Hai hàm còn lại (`countCannotEatByDish`, `findCannotEatPairs`) tên đã nói rõ chúng chỉ nói về `Cannot Eat` — chúng nhận thêm một mệnh đề `where` cố định, không nhận tham số.

## 1.3 `computePersonalScore` được gọi bằng object literal dựng tay

[`ranking.ts`](../../../src/features/selection/domain/ranking.ts) gọi hàm này ở hai chỗ, và chỗ thứ hai không truyền cả object:

```ts
const scoreDiff =
  computePersonalScore({ recencyPenalty: b.recencyPenalty, explicit: b.explicit }, config) -
  computePersonalScore({ recencyPenalty: a.recencyPenalty, explicit: a.explicit }, config)
```

Thêm `implicit` vào `RankingInput` mà quên hai dòng này thì `input.implicit` là `undefined`, `0.25 * undefined` là `NaN`, `scoreDiff` là `NaN`, và `Array.prototype.sort` với comparator trả `NaN` cho một thứ tự **không xác định theo chuẩn** — khác nhau giữa các engine, khác nhau giữa các lần chạy.

`tsc` **có** bắt được (thiếu property trong object literal), nên đây không phải bẫy chí tử. Nó nằm ở đây vì cách sửa dễ sai: đừng vá bằng `implicit: 0` cho xong việc — đó là viết một dòng nói dối rằng $I$ đã được tính. Sửa đúng là truyền cả `a`/`b` vào, vì `DishRankingInput` sau `T3` đã là siêu tập của `RankingInput`.

## 1.4 Mọi hằng số của E13 đã nằm sẵn trong `RANKING_CONFIG`

[`ranking-config.ts`](../../../src/features/selection/domain/ranking-config.ts) chép trọn Ranking Spec §5 từ v1.0, kể cả những giá trị chưa hàm nào đọc:

```ts
personalRanking: { wExplicit: 0.3, wImplicit: 0.25, wRecency: 0.25, wChef: 0.1, wSource: 0.1 },
implicit: { halfLifeDays: 60, priorK: 3 },
```

Ba giá trị `E13` cần — `wImplicit`, `halfLifeDays`, `priorK` — đã có, đúng số, chờ sẵn. **Không khai hằng số mới ở bất kỳ đâu**, kể cả trong file test: `TC-160` canh mốc phân rã 60 ngày, và một `const HALF_LIFE = 60` thứ hai trong test là chỗ ca đó thôi canh gì cả.

Việc duy nhất phải làm ở file này là sửa doc-comment: danh sách *"v1.1 đọc năm giá trị"* nay thành sáu, và ba chú thích `Chưa hàm nào đọc` của `wImplicit`/`implicit.*` phải bỏ đi.

---

# 2. File tree

```text
src/shared/db/
├── schema.ts                                    # T1 — constraintKind, kind, PK 3 cột,
│                                                #      userPreferenceSettings, 2 index
└── migrations/
    ├── 0016_constraint_kind_and_preference_settings.sql   # T1 — MỚI
    └── meta/_journal.json                       # T1 — entry idx 16

src/features/selection/
├── domain/implicit-preference.ts                # T2 — MỚI
├── domain/implicit-preference.test.ts           # T2 — MỚI (TC-159 → TC-162)
├── domain/ranking.ts                            # T3 — RankingInput.implicit
├── domain/ranking-config.ts                     # T3 — chỉ doc-comment
├── application/selection-repository.ts          # T4 — findImplicitSwipes
├── application/list-deck.ts                     # T5 — hai nhịp Promise.all
├── infrastructure/drizzle-selection-repository.ts        # T4 + T5
└── infrastructure/drizzle-selection-repository.integration.test.ts  # T4 (TC-163→165, 174)

src/features/preference/
├── application/preference-repository.ts         # T5 — kind là tham số bắt buộc
├── infrastructure/drizzle-preference-repository.ts       # T5
└── infrastructure/drizzle-preference-repository.integration.test.ts # T1 (đếm dòng)

src/app/groups/[groupId]/dishes/page.tsx         # T5 — chỗ gọi phải nêu kind
```

---

# 3. `E13-T1` — Schema cờ món cá nhân + mốc quên

## 3.1 Schema

```ts
/**
 * BR-034 / BR-035 / BR-036 — ba cờ cá nhân cùng hình dạng `(user, món, có/không)`,
 * khác nhau ở HỆ QUẢ chứ không ở cách lưu (SDD §10).
 */
export const constraintKind = pgEnum('constraint_kind', [
  'CANNOT_EAT',
  'BLACKLIST',
  'HISTORY_WHITELIST',
])
```

`userDishConstraints` thêm `kind: constraintKind('kind').notNull().default('CANNOT_EAT')`, khoá chính đổi sang `primaryKey({ columns: [table.userId, table.globalDishId, table.kind] })`.

`DEFAULT 'CANNOT_EAT'` ở tầng cột chính là phép backfill: `ALTER TABLE … ADD COLUMN … NOT NULL DEFAULT` điền sẵn cho mọi dòng cũ trong một câu. Không cần `UPDATE` riêng.

Bảng mới:

```ts
export const userPreferenceSettings = pgTable('user_preference_settings', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  implicitResetAt: timestamp('implicit_reset_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

`implicitResetAt` **nullable**: chưa bấm Quên bao giờ là trạng thái bình thường, không phải giá trị sentinel. Bảng chỉ có dòng cho người đã bấm — cùng lý lẽ `userDishPreferences` không có dòng `NEUTRAL`.

Hai index:

```ts
index('participants_user_id_idx').on(table.userId)          // participants
index('interactions_participant_id_idx').on(table.participantId)  // interactions
```

Vì sao chúng thuộc `T1` chứ không thuộc lúc đo hiệu năng: truy vấn của `T4` đi **ngược** mọi đường truy cập hiện có. Cả hai bảng chỉ có index theo `session_id` — hợp với "cho tôi mọi tương tác của phiên này". Câu của `T4` hỏi "cho tôi mọi tương tác của **người này**, xuyên mọi phiên", và không index nào phục vụ nó. Thêm sau, lúc `TC-174` đã đỏ, là thêm khi đã mất một vòng đo.

**Viết lại doc-comment ở `schema.ts` phía trên `userDishConstraints`** — đoạn hiện tại nói *"KHÔNG có cột `kind`: Blacklist (BR-035) là v1.2 và có ngữ nghĩa khác hẳn"*. Lý do đó nay đã hết hiệu lực; để nguyên là để lại một lời chỉ dẫn sai cho người đọc sau.

## 3.2 Migration `0016` — và cách nó chạy được cả hai chiều

`drizzle-kit` không sinh down-migration. Cách dự án này giữ được lời hứa "chạy được cả hai chiều" là viết khối rollback thành comment SQL ở **đầu** file `0016`, ngay chỗ người ta sẽ tìm khi cần nó.

Chiều xuôi, theo thứ tự bắt buộc:

```sql
CREATE TYPE "public"."constraint_kind" AS ENUM('CANNOT_EAT', 'BLACKLIST', 'HISTORY_WHITELIST');
ALTER TABLE "user_dish_constraints" ADD COLUMN "kind" "constraint_kind" DEFAULT 'CANNOT_EAT' NOT NULL;
ALTER TABLE "user_dish_constraints" DROP CONSTRAINT "user_dish_constraints_user_id_global_dish_id_pk";
ALTER TABLE "user_dish_constraints" ADD CONSTRAINT "user_dish_constraints_user_id_global_dish_id_kind_pk"
  PRIMARY KEY("user_id","global_dish_id","kind");
CREATE TABLE "user_preference_settings" (…);
CREATE INDEX "participants_user_id_idx" ON "participants" ("user_id");
CREATE INDEX "interactions_participant_id_idx" ON "interactions" ("participant_id");
```

Chiều ngược, và **bước đầu tiên không được bỏ**:

```sql
DELETE FROM "user_dish_constraints" WHERE "kind" <> 'CANNOT_EAT';
ALTER TABLE "user_dish_constraints" DROP CONSTRAINT "user_dish_constraints_user_id_global_dish_id_kind_pk";
ALTER TABLE "user_dish_constraints" ADD CONSTRAINT "user_dish_constraints_user_id_global_dish_id_pk"
  PRIMARY KEY("user_id","global_dish_id");
ALTER TABLE "user_dish_constraints" DROP COLUMN "kind";
DROP TABLE "user_preference_settings";
DROP INDEX "participants_user_id_idx";
DROP INDEX "interactions_participant_id_idx";
DROP TYPE "public"."constraint_kind";
```

Bỏ `DELETE` thì bước khôi phục khoá chính cũ **đổ**: một người vừa khai `Cannot Eat` vừa Blacklist cùng một món có hai dòng cùng `(user_id, global_dish_id)`, và khoá hai cột không nhận. Rollback đổ ở giữa chừng nguy hiểm hơn hẳn không rollback được — bảng ở lại trạng thái không schema nào mô tả.

Rồi thêm entry vào `meta/_journal.json`: `{ "idx": 16, "version": "7", "when": …, "tag": "0016_constraint_kind_and_preference_settings", "breakpoints": true }`.

## 3.3 Test — chốt chặn rủi ro số 1 của §17.4

Rủi ro đầu bảng của [Master Plan §17.4](../../what-we-gonna-eat-today_master-plan_v2.1.md) là *"đổi khoá chính làm rơi `Cannot Eat`"*, và phương án xử lý đã ghi sẵn: đếm số dòng **trước** khi chạy migration, khẳng định số dòng `kind = 'CANNOT_EAT'` sau đó bằng đúng số cũ.

Chạy trên Neon branch UAT trước. Không chạy thẳng production.

Test ghim đi kèm, trong `drizzle-preference-repository.integration.test.ts`: hai dòng cùng `(user, món)` khác `kind` **cùng tồn tại** được, và xoá một cái không đụng cái kia. Đó là `TC-168`, nhưng phần schema của nó kiểm được ngay ở slice này.

---

# 4. `E13-T2` — Hàm thuần `computeImplicitPreference`

> **Chạy `yarn arch:probe` TRƯỚC dòng code đầu tiên.** Không phải nghi thức: rủi ro số 2 của §17.4 nói rằng ESLint *có* bắt việc đặt sai feature, nhưng bắt **sau khi** code đã viết xong. Chạy probe trước là xác nhận bảy chiều còn nguyên, để nếu sau này ESLint đỏ thì biết chắc lỗi ở mã mới chứ không ở cấu hình.

File **mới** `src/features/selection/domain/implicit-preference.ts`. Nó thuộc `selection` chứ không phải `preference`: $I$ **suy ra** từ `interactions` — bảng của `selection` — rồi tiêu thụ ngay bởi ranking của `selection`. `preference` sở hữu thứ người dùng **khai**; `selection` sở hữu thứ hệ thống **quan sát**.

```ts
export type ImplicitSwipe = {
  readonly globalDishId: string
  readonly type: 'SWIPE_RIGHT' | 'SWIPE_LEFT'
  /** `selection_sessions.decision_date`, KHÔNG phải `interactions.updated_at`. */
  readonly decisionDate: string
}

export function computeImplicitPreference(
  input: {
    readonly swipes: readonly ImplicitSwipe[]
    readonly referenceDate: string
  },
  config: RankingConfig,
): Map<string, number>
```

Khuôn viết bám sát [`history/domain/recency.ts`](../../../src/features/history/domain/recency.ts):

- `toUtcMidnight` với `new Date(\`${date}T00:00:00Z\`)`, `MS_PER_DAY = 86_400_000`, ngày sai → `throw new RangeError`. Hai mốc đều là nửa đêm UTC nên hiệu luôn là bội số nguyên của một ngày.
- `ageDays = Math.max(0, …)`. `recency.ts` chặn trên bằng `Math.min(1, …)` vì cùng một lý do: hợp đồng $I \in [-1, 1]$ do spec tự tuyên bố, và một `decision_date` ở tương lai (lệch timezone giữa hai nhóm) cho trọng số > 1 làm $|I|$ vượt 1. Rẻ hơn nhiều so với việc đi tìm một điểm số vô lý trong `buildDeck`.
- Món không có lượt vuốt nào **không có mặt** trong Map — người gọi dùng `?? 0`, cùng khuôn `countRecentEatersByDish` của `SPEC-014`.
- `domain/` chỉ import `./ranking-config` (kiểu). Tech Spec §2.4.

Nhận `config: RankingConfig` chứ không nhận `halfLifeDays`/`priorK` rời. Khác `computeRecencyPenalty` — và khác có lý do: `recency.ts` nhận số rời **vì** `history` không được import `selection` (doc-comment của nó viết đúng câu đó). Ràng buộc ấy không áp ở đây, và hai hàm hàng xóm cùng file (`computePersonalScore`, `computeSessionScore`) đều nhận `config`.

Công thức, nguyên văn Ranking Spec §2.2:

$$\text{Weight}(t) = 0.5^{\text{AgeDays}(t)/60}, \quad I = \frac{R_w - L_w}{R_w + L_w + 3}$$

$R_w = L_w = 0$ cho $I = 0$ **theo cấu trúc**, không cần nhánh `if`: mẫu số luôn $\ge K_{\text{prior}} = 3$. Đừng viết `if (total === 0) return 0` — nó gợi ý rằng phép chia có thể chạm 0, điều không đúng, và ai đọc sau sẽ đi tìm ca đó.

**Test `TC-159` → `TC-162`** (tầng `D`, không mock, `RANKING_CONFIG` thật):

| TC | Ca | Kỳ vọng |
| --- | --- | --- |
| `TC-159` | 1 phải hôm nay, không trái | $1/(1+0+3) = 0.25$ — **không** phải `1.0` |
| `TC-160` | 1 phải cách **đúng 60 ngày** vs 1 phải hôm nay | trọng số `0.5` vs `1.0`; $I = 1.5/(1.5+3) = 1/3$ |
| `TC-161` | Không lượt nào | `0`, **không** `NaN` |
| `TC-162` | $R_w = L_w$ | `0` |

`TC-160` là ca then chốt: sai `HALF_LIFE_DAYS` thì $I$ vẫn ra số hợp lệ, deck vẫn chạy, chỉ là hệ thống nhớ dai hoặc quên nhanh hơn thiết kế — không tầng nào phía trên bắt được.

---

# 5. `E13-T3` — Mở rộng `RankingInput`

Bốn chỗ trong `ranking.ts`, không được sót:

1. `RankingInput` thêm `readonly implicit: number` với doc `$I \in [-1, 1]$ từ computeImplicitPreference (SPEC-037)`.
2. `computePersonalScore` thêm `+ config.personalRanking.wImplicit * input.implicit`.
3. `DishRankingInput` thêm `readonly implicit: number`.
4. Hai object literal trong `buildDeck` (§1.3).

Doc-comment đầu file hiện viết *"Ba số hạng còn lại — `implicit` (F30), `chef` (F33), `source` (F36) — vẫn cố ý vắng mặt"*. Sửa thành hai (`chef`, `source`); `implicit` thôi vắng mặt.

`isExploreEligible` **không đổi**. `BR-047` chỉ loại trừ `explicit < 0` — nó nói về thứ người dùng đã khai ra, không về thứ hệ thống suy ra. Một món $I$ âm mà người ta chưa từng Dislike vẫn đủ điều kiện vào luồng Explore, và đó là đúng: luồng ấy tồn tại để thử lại những thứ đã lâu không ăn.

DoD: `TC-125` → `TC-127` (blend Explore) **vẫn** xanh.

---

# 6. `E13-T4` — Truy vấn lịch sử vuốt

## 6.1 Port

```ts
/**
 * SPEC-037 — nguyên liệu thô của $I$: mọi lượt vuốt CÒN HIỆU LỰC của một người
 * trong các phiên đã `FINALIZED`, gắn theo `global_dishes.id`.
 *
 * MỘT truy vấn — mốc `implicit_reset_at` (SPEC-040) được áp NGAY TRONG câu này
 * chứ không phải một lượt đọc thứ hai. Xem DEC-070.
 */
findImplicitSwipes(
  userId: string,
  globalDishIds: readonly string[],
): Promise<ImplicitSwipe[]>
```

## 6.2 Truy vấn

Khuôn `countRecentEatersByDish` (history repo) + `countInteractionsByDish` (cùng file):

- Short-circuit `globalDishIds.length === 0` → `[]` trước khi chạm DB.
- Đường join: `interactions → participants (user_id = ?) → selection_sessions (state = 'FINALIZED') → group_dishes → global_dishes (id IN …)`.
- `[...globalDishIds]` (spread) vì `inArray` cần mảng mutable.
- Trả `decisionDate` thô, **không** tính trọng số trong SQL. Phép toán ở `domain/` là chỗ `TC-159` → `TC-162` kiểm được mà không cần DB; đẩy `POWER(0.5, …)` xuống Postgres là đẩy công thức ra khỏi tầm với của bốn ca đó.

Bốn quy tắc `SPEC-037` mà câu này phải mang:

| Quy tắc | Cách thể hiện | Ca canh |
| --- | --- | --- |
| Chỉ phiên `FINALIZED` | `eq(selectionSessions.state, 'FINALIZED')` | `TC-163` |
| Đọc `interactions`, không `interaction_events` | join bảng nào thì rõ | `TC-164` |
| Tuổi theo `decision_date` | `select` cột đó, không `updated_at` | `TC-160` (gián tiếp) |
| Gắn theo `global_dishes.id` | join qua `group_dishes` rồi lấy `global_dish_id` | `TC-165` |

Mốc quên, gộp vào cùng câu:

```sql
decision_date > coalesce(
  (select implicit_reset_at at time zone 'UTC'
     from user_preference_settings where user_id = $1)::date,
  '-infinity'::date)
```

> **Ghi vào `DEC-070`.** `SPEC-037` liệt kê `implicitResetAt` như một **đầu vào của hàm thuần**; ở đây nó được áp trong SQL và hàm thuần chỉ nhận danh sách đã lọc. Kèm theo một xấp xỉ có chủ ý: `decision_date` là `date`, `implicit_reset_at` là `timestamptz`, nên phép so sánh quy về `::date` ở UTC. Sai lệch tối đa một ngày, quanh đúng thời điểm bấm nút, cho một tính năng mà ngưỡng chính xác không mang nghĩa nghiệp vụ nào — người bấm "quên" không có kỳ vọng nào về việc phiên lúc 23h hôm qua có được tính hay không.

## 6.3 Test

`TC-163` (then chốt): cùng một món, ba lượt vuốt ở ba phiên `FINALIZED` / `ACTIVE` / `INVALID` → **chỉ** lượt của phiên `FINALIZED` trả về. Học từ phiên đang chạy nghĩa là deck tự sắp lại mình theo chính những lượt vừa vuốt — người dùng thấy thẻ nhảy dưới tay, đúng thứ `BR-048` sinh ra để ngăn.

`TC-164`: vuốt phải rồi Undo trong một phiên đã `FINALIZED` → không có dòng nào trả về. Đúng theo cấu trúc, vì Undo xoá dòng khỏi `interactions` và chỉ để lại dấu ở `interaction_events` — nhưng phải có ca ghim, vì "chọn đúng bảng" là một quyết định vô hình trong diff.

`TC-165`: cùng một Global Dish qua hai `group_dishes` ở hai Group → hai dòng, cùng `globalDishId`.

`TC-174`: 150 món, 500 lượt vuốt lịch sử → còn trong ngưỡng `NFR-01`. Đây là ca canh hai index của `T1`.

---

# 7. `E13-T5` — Nối vào `list-deck`

## 7.1 Port `preference` — `kind` thành tham số bắt buộc

```ts
findConstrainedGlobalDishIds(
  userId: string,
  kind: ConstraintKind,
): Promise<ReadonlySet<string>>
```

`tsc` liệt kê đủ mọi chỗ gọi (§1.2). `ConstraintKind` khai ở `preference/domain/`, cạnh `PreferenceKind` — nó là từ vựng nghiệp vụ, không phải chi tiết lưu trữ, và `explicit-preference.ts` đã đặt tiền lệ đúng chỗ đó.

## 7.2 Stage 1

```ts
inArray(userDishConstraints.kind, ['CANNOT_EAT', 'BLACKLIST'])
```

thêm vào mệnh đề `notExists` (§1.1). Đây là toàn bộ `SPEC-038` ở phía đọc: Blacklist lọc cứng **cùng chỗ** với `Cannot Eat`, không phải hạ điểm.

## 7.3 Stage 2 — hai nhịp `Promise.all`

`list-deck.ts` hiện đọc ba thứ song song **ngoài** nhánh materialize, vì `eatingRows` và `preferences` còn được dùng lại ở phần tính `lane` chạy mỗi lần đọc. $I$ và Whitelist **không** thuộc nhóm đó — chúng chỉ dùng lúc dựng deck lần đầu.

Nên chia làm hai nhịp:

```ts
// Nhịp 1 — mọi lần đọc đều cần
const [eatingRows, preferences, sessionDeckConfig, materialized] = await Promise.all([
  deps.history.findEatingDates(...),
  deps.preferences.findPreferencesByGlobalDish(...),
  deps.selection.findSessionCourses(...),
  deps.selection.findMaterializedDeck(...),
])

let orderedDishIds = materialized
if (orderedDishIds === null) {
  // Nhịp 2 — CHỈ lần dựng deck đầu tiên của phiên
  const [swipes, whitelisted] = await Promise.all([
    deps.selection.findImplicitSwipes(input.userId, globalDishIds),
    deps.preferences.findConstrainedGlobalDishIds(input.userId, 'HISTORY_WHITELIST'),
  ])
  …
}
```

Đặt cả năm vào một nhịp là bắt **mọi** lần lật trang trả tiền cho hai truy vấn không ai đọc — đúng rủi ro *"$I$ làm chậm đường tải deck"* của §17.4. `findMaterializedDeck` được kéo **vào** nhịp 1 để bù lại đúng vòng round-trip mà nhịp 2 thêm vào: đường ấm giữ nguyên chi phí hôm nay.

Trong `rankingInputs`:

```ts
implicit: implicitByDish.get(dish.globalDishId) ?? 0,
recencyPenalty: whitelisted.has(dish.globalDishId)
  ? 0                                    // SPEC-039 — ÉP R = 0, không cộng điểm
  : computeRecencyPenalty({ … }),
```

`SPEC-039` viết rõ Whitelist **không** phải lọc và **không** cộng điểm — nó chỉ gỡ một hình phạt. Món phở của người ngày nào ăn cũng được thôi bị Cooldown đẩy xuống, nhưng cũng không vì thế mà nhảy lên đầu.

## 7.4 Test

| TC | Tầng | Ca |
| --- | :---: | --- |
| `TC-167` | `I` | Bật Blacklist rồi tải lại deck → món bị lọc cứng ở Stage 1 |
| — | `I` | Bật Whitelist rồi tải lại deck → món **VẪN CÓ** trong deck (§1.1) |
| `TC-169` | `D`/`A` | Món ăn hôm qua ($R = 0.86$) có trong Whitelist → $R$ ép về 0 |
| `TC-170` | `A` | Whitelist **và** `Like` → $E = +1$ vẫn cộng, $R = 0$ vẫn gỡ phạt |

Ca thứ hai không có mã TC trong đặc tả — nó là ca §1.1 sinh ra, và không có nó thì lỗi im lặng nguy hiểm nhất của epic không có gì canh.

---

# 8. Rủi ro

| Rủi ro | Dấu hiệu nhận biết sớm | Xử lý |
| --- | --- | --- |
| Whitelist lọc món khỏi deck | Bấm "ăn hoài không chán" xong món biến mất | §1.1, ca `I` ở §7.4 |
| Đổi khoá chính làm rơi `Cannot Eat` | Món đã khai "không ăn được" hiện lại trong deck | §3.3 — đếm dòng trước/sau |
| Rollback đổ giữa chừng | `ADD CONSTRAINT … PRIMARY KEY` báo trùng khoá | §3.2 — `DELETE` là bước đầu tiên |
| $I$ đặt nhầm feature | ESLint đỏ sau khi code đã viết xong | §4 — `yarn arch:probe` trước dòng đầu |
| `NaN` lọt vào `buildDeck` | Thứ tự deck vô lý, không test nào đỏ | §1.3 — sửa cả hai object literal |
| $I$ làm chậm đường tải deck | Deck lần đầu vượt 2.5s trên 4G | §3.1 hai index + §7.3 hai nhịp |
| Học từ phiên đang chạy | Thẻ nhảy thứ tự dưới tay giữa lượt vuốt | `TC-163` — chỉ `FINALIZED` |
| Hằng số thứ hai trong test | `TC-160` thôi canh mốc phân rã | §1.4 — chỉ `RANKING_CONFIG` |
| Đẩy công thức xuống SQL | `TC-159`→`162` phải có DB mới chạy được | §6.2 — trả `decisionDate` thô |

---

# 9. Test Cases coverage

`TC-159` → `TC-162` §4 • `TC-163` → `TC-165`, `TC-174` §6.3 • `TC-167`, `TC-169`, `TC-170` §7.4 • `TC-168` (phần schema) §3.3 • `TC-125` → `TC-127` — không đụng, phải **vẫn** xanh (§5).

`TC-166`, `TC-171` → `TC-173` thuộc `E13-S2`.

---

# 10. Thứ tự TDD

1. `yarn arch:probe` — xác nhận đúng bảy chiều **trước** khi gõ gì.
2. `T1`: schema + migration `0016` + entry journal → `yarn db:migrate` trên Neon UAT → test đếm dòng (§3.3).
3. `T2`: `TC-159` → `TC-162` đỏ → viết `computeImplicitPreference` → xanh. `yarn arch:probe` lại.
4. `T3`: thêm `implicit` vào ba kiểu + hai object literal → `TC-125` → `TC-127` **vẫn** xanh.
5. `T4`: `TC-163` → `TC-165` đỏ → viết `findImplicitSwipes` → xanh. `TC-174` cuối cùng.
6. `T5`: đổi chữ ký `findConstrainedGlobalDishIds` → `tsc` liệt kê chỗ gọi → sửa từng chỗ. Rồi Stage 1, rồi hai nhịp `Promise.all`. Ca Whitelist-vẫn-trong-deck viết **trước** khi sửa Stage 1 (nó phải đỏ).
7. `yarn verify && yarn arch:probe && yarn test:integration`.

Bước 6 có thứ tự trong lòng nó, và thứ tự ấy quan trọng: đổi chữ ký port **trước** khi viết logic mới, để `tsc` làm việc liệt kê thay vì `grep`.

---

# 11. Verify

## 11.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn test:integration
```

Ba cạm bẫy đã biết: `jscpd` với khối validate lặp (bọc `/* jscpd:ignore-start/end */`); `knip --production` với export chưa ai import — nối `computeImplicitPreference` vào `list-deck` **trong cùng commit**, hoặc khai vào `knip.jsonc` kèm comment `GỠ Ở E13-T5`; ngưỡng coverage `domain` là 80.

## 11.2 Bằng chứng $I$ chạy đúng — điểm kiểm tra §17.4

Không thay được bằng test tự động, vì thứ nó kiểm là **cả chuỗi** từ lượt vuốt tới thứ tự thẻ:

1. Vuốt **phải** cùng một món qua **ba** phiên `FINALIZED` liên tiếp (dùng `yarn session:start`, chốt bữa mỗi phiên).
2. Mở phiên thứ tư, **không** đặt `Like` cho món đó.
3. Món ấy phải nổi lên **đầu deck**.

Không nổi lên nghĩa là `F30` chưa chạy đúng — và một `F30` không chạy đúng chỉ là một truy vấn tốn thời gian trên đường tải deck.

## 11.3 Bằng chứng migration đảo được

Trên Neon branch UAT, `yarn db:studio`:

1. Ghi lại `select count(*) from user_dish_constraints`.
2. Chạy `yarn db:migrate` → `select count(*) … where kind = 'CANNOT_EAT'` bằng đúng số cũ.
3. Thêm tay một dòng `BLACKLIST` cho cùng `(user, món)` với một dòng `CANNOT_EAT` đang có → **thành công** (đây là `TC-168` phía schema).
4. Chạy khối rollback §3.2 → bảng về đúng hình dạng cũ, số dòng bằng bước 1.

Bước 3 đứng giữa hai bước migration có chủ đích: nó chứng minh khoá chính mới thật sự cho phép hai cờ cùng tồn tại, chứ không chỉ chứng minh câu `ALTER` chạy xong.

## 11.4 Bằng chứng Whitelist không bị lọc

1. Bấm Whitelist cho một món (chưa có giao diện ở `S1` — gọi thẳng repo trong integration test, hoặc `INSERT` qua `db:studio`).
2. Mở phiên mới → món **vẫn có** trong deck.
3. Cho món đó một dòng `eating_history` hôm qua → mở phiên mới nữa → món **không** bị đẩy xuống.

Bước 2 và bước 3 kiểm hai chuyện khác nhau: bước 2 là §1.1 (không bị lọc), bước 3 là `SPEC-039` (ép $R = 0$). Một cái đúng không suy ra cái kia.

---

# 12. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v3.9.md`

```markdown
# DEC-070 — Mốc Quên Áp Trong SQL; `kind` Là Tham Số Bắt Buộc; Hai Nhịp Đọc Ở `list-deck`

- **Ngày:** 2026-09-05
- **Trạng thái:** Accepted
- **Bối cảnh:** E13-S1

## Quyết định

1. `implicit_reset_at` (`SPEC-040`) được áp NGAY TRONG truy vấn `findImplicitSwipes`,
   không truyền vào hàm thuần như `SPEC-037` mô tả. Phép so sánh quy về `::date`
   ở UTC.
2. `findConstrainedGlobalDishIds` đổi chữ ký thành `(userId, kind)` với `kind`
   BẮT BUỘC.
3. `computeImplicitPreference` nhận `config: RankingConfig`, không nhận
   `halfLifeDays`/`priorK` rời như `computeRecencyPenalty`.
4. Truy vấn trả `decisionDate` thô; phép tính trọng số nằm ở `domain/`, không ở SQL.
5. `list-deck` chia làm HAI nhịp `Promise.all`; `findMaterializedDeck` chuyển
   vào nhịp thứ nhất.

## Rationale

1. DoD của `E13-T4` viết "MỘT truy vấn gộp". Đọc mốc quên riêng là hai lượt
   round-trip tới Neon trên đường mà `NFR-01` đang canh, để lấy một giá trị chỉ
   dùng làm mệnh đề `where`. Xấp xỉ `::date` ở UTC sai lệch tối đa một ngày,
   quanh đúng thời điểm bấm nút — người bấm "quên" không có kỳ vọng nào về việc
   phiên lúc 23h hôm qua có được tính hay không.
2. SDD §10 yêu cầu mọi truy vấn nêu rõ `kind`. Một tham số bắt buộc là phiên
   bản có trình biên dịch của yêu cầu đó; một lời nhắc trong tài liệu thì không.
   `tsc` liệt kê đủ chỗ gọi, `grep` thì không đảm bảo.
3. `recency.ts` nhận số rời VÌ `history` không được import `selection` —
   doc-comment của nó viết đúng câu đó. Ràng buộc ấy không áp cho một hàm nằm
   trong `selection`, và hai hàm hàng xóm cùng file đều nhận `config`.
4. Đẩy `POWER(0.5, …)` xuống Postgres đưa công thức ra khỏi tầm với của
   `TC-159`→`TC-162` — bốn ca tầng `D` chạy không cần DB. Chi phí: 500 dòng thô
   thay vì 150 dòng đã gộp, trên một tải nhỏ đã đo bằng `TC-174`.
5. $I$ và Whitelist chỉ dùng lúc DỰNG deck; phần tính `lane` chạy mỗi lần đọc
   thì không cần chúng. Gộp cả năm vào một nhịp là bắt mọi lần lật trang trả
   tiền cho hai truy vấn không ai đọc. Kéo `findMaterializedDeck` lên nhịp một
   bù lại đúng vòng round-trip mà nhịp hai thêm vào.

## Consequence

- `SPEC-037` §9.1 phải ghi lại chữ ký thật: hàm thuần nhận `swipes` đã lọc, không
  nhận `implicitResetAt`.
- `ALLOWED_CROSS_FEATURE` giữ nguyên bảy chiều — `E13` không mở chiều thứ tám.
- `user_dish_constraints` đổi khoá chính; rollback BẮT BUỘC xoá dòng
  `kind <> 'CANNOT_EAT'` trước khi khôi phục khoá cũ, nếu không câu
  `ADD CONSTRAINT` đổ giữa chừng.
- Hai index mới (`participants(user_id)`, `interactions(participant_id)`) phục vụ
  một đường truy cập NGƯỢC với mọi đường hiện có.
```

---

# 13. Master Plan

[§17.2](../../what-we-gonna-eat-today_master-plan_v2.1.md): tick `[x]` cho `E13-T1` → `E13-T5` khi slice xong. DoD của `E13-T5` bổ sung một dòng theo §1.1 — món `HISTORY_WHITELIST` phải **vẫn có mặt** trong deck, đây là ca không có mã TC trong đặc tả gốc.
