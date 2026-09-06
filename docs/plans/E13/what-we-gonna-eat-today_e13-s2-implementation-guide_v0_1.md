# 🎛️ Implementation Guide — E13 Slice S2: Đường ghi và giao diện

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-09-06`
> - **Upstream:** [Master Plan §17.2](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E13-T6` → `E13-T8`) • [SDD §9.1](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-038`, `SPEC-039`, `SPEC-040`) • [Business Rules](../../what-we-gonna-eat-today_business-rules_v1.8.md) (`BR-034`, `BR-035`, `BR-036`, `BR-043`, `BR-048`, `BR-061`) • [Decision Log](../../what-we-gonna-eat-today_decision-log_v3.9.md) (`DEC-022`, `DEC-055`, `DEC-060`, `DEC-069`, `DEC-070`) • [Test Cases](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-166`, `TC-168`, `TC-171` → `TC-173`)
> - **Tiền đề:** [`E13-S1`](what-we-gonna-eat-today_e13-s1-implementation-guide_v0_1.md) xong (`37ac8a5`).
>
> 🎛️ *S1 làm cho hệ thống quan sát được. S2 mở ba cái công tắc để người dùng nói lại: "đừng gợi ý món này nữa", "món này thì ăn hoài không chán", và "quên hết những gì đã học đi".*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E13-T6` | Use case + Route Handler | 2.5 | `preference/application/**`, `preference/infrastructure/**`, `app/api/preferences/**` | `setConstraint` nhận `kind`; `resetImplicitPreference` ghi mốc; `TC-166`, `TC-168` xanh |
| `E13-T7` | Hai nút mới ở màn Danh mục | 2.5 | `dish/presentation/components/**`, `app/groups/[groupId]/dishes/page.tsx` | Năm nút chia hai hàng có nhãn; trạng thái đọc được bằng **chữ** |
| `E13-T8` | Màn cài đặt cá nhân + nút Quên | 2.5 | `app/groups/[groupId]/preferences/**`, `preference/presentation/**`, `group/presentation/**` | Xác nhận hai nhịp trên chính nút; `TC-171` → `TC-173` xanh |

- [ ] Bật Blacklist giữa phiên **KHÔNG** xoá lượt vuốt, **KHÔNG** đổi $P$ (§1.1, `TC-166`)
- [ ] Nhánh `db.batch` chỉ chạy khi `kind === 'CANNOT_EAT' && enabled` — **cả hai vế**
- [ ] Ba cờ độc lập: bật/gỡ cái này không đụng hai cái kia (`TC-168`)
- [ ] Bấm Quên: `interactions` **giữ nguyên số dòng**, deck phiên đang chạy **không đổi thứ tự** (`TC-171`, `TC-172`)
- [ ] Màn Quên nói ra bằng chữ: khai báo tay được giữ, hiệu lực từ phiên sau (`TC-173`)
- [ ] `/groups/[groupId]/preferences` **tới được** từ Group Hub
- [ ] `yarn verify && yarn arch:probe && yarn test:integration` xanh

---

# 1. Ba phát hiện — đọc trước khi gõ

## 1.1 Nhánh xoá lượt vuốt là chỗ nguy hiểm nhất của cả epic

[`setConstraint`](../../../src/features/preference/infrastructure/drizzle-preference-repository.ts) hiện có một nhánh làm ba việc trong một `db.batch`:

```ts
if (input.cannotEat) {
  const swipe = await findActiveSwipeForGlobalDish({ … })
  if (swipe !== null) {
    await db.batch([
      db.insert(userDishConstraints)…,
      db.delete(interactions).where(…),                    // ← XOÁ LƯỢT VUỐT
      db.insert(interactionEvents).values({ action: 'CANNOT_EAT' }),
    ])
  }
  …
}
```

Nhánh này **đúng** cho `Cannot Eat`. `BR-034` nói *"tôi không ăn được"* — một sự thật về cơ thể — nên $P$ của phiên hôm nay phải sửa lại cho đúng: người ấy chưa bao giờ thật sự đề xuất món đó.

Nhánh này **sai** cho `Blacklist`. `BR-035` nói *"đừng gợi ý nữa"* — một sở thích — và nó **không** làm cho lượt vuốt hôm nay thành sai. Đây là điểm khác **duy nhất** giữa hai cờ, và cũng là **toàn bộ** lý do `BR-035` tách khỏi `BR-034`.

Hậu quả nếu chép nhầm: ai đó bấm "Đừng gợi ý" giữa phiên thì $P$ của món tụt, và cả nhà thấy một món **mất phiếu mà không ai bỏ phiếu chống**. Không lỗi, không cảnh báo, chỉ là bảng xếp hạng nói sai.

Điều kiện đúng là **cả hai vế**:

```ts
if (input.kind === 'CANNOT_EAT' && input.enabled) { /* nhánh batch */ }
```

Viết `if (input.enabled)` rồi mới kiểm `kind` bên trong là mời gọi một lần refactor sau này kéo nhầm nhánh ra ngoài. `TC-166` là ca canh đúng chuyện đó, và nó phải chạy **qua đường ghi thật**, không phải bằng `INSERT` trong test.

> [!NOTE]
> Hệ quả thứ hai của cùng ranh giới, đã đúng sẵn từ S1: `countCannotEatByDish` lọc `kind = 'CANNOT_EAT'`, nên Blacklist **không** trừ $-1.0$ của $X$ trong `SPEC-014`. Người dùng vẫn đề xuất được món mình đã Blacklist nếu hôm nay họ đổi ý — `SPEC-038` viết đúng câu đó.

## 1.2 Đổi body Route Handler là breaking change trên dây

`PUT /api/preferences/constraints` đổi từ `{ globalDishId, cannotEat }` sang `{ globalDishId, kind, enabled }`.

Client duy nhất là [`DishPreferenceControls`](../../../src/features/dish/presentation/components/dish-preference-controls.tsx), sửa trong cùng slice này. Không nuôi hai hình dạng body song song: đó là nuôi hai đường đọc phải giữ đồng bộ bằng tay, đúng thứ SDD §10 vừa dạy về ba bảng cùng hình dạng.

Cái gãy được: một tab đã mở trước khi deploy gửi body cũ → `ERR_VALIDATION` 400 → `sendJsonWithRetry` **không** retry (4xx), component rollback và hiện *"Chưa lưu được — thử lại giúp mình."*. Tải lại trang là xong. Với một ứng dụng gia đình chưa phát hành, đó là cái giá đúng.

## 1.3 `statusText` thôi là một chuỗi ưu tiên

Bản hiện tại là chuỗi ba tầng `? :` lồng nhau, và nó **đúng** khi chỉ có `Cannot Eat`: ba trạng thái loại trừ nhau về mặt hiển thị.

Ba cờ mới thì **độc lập** — một người vừa khai "không ăn được", vừa Blacklist, vừa Whitelist cùng một món là hợp lệ (`TC-168` khẳng định điều đó ở tầng dữ liệu). Nối thêm hai tầng `? :` nữa sẽ chỉ hiện **một** cờ và giấu hai cờ kia, tức là màn hình nói dối về trạng thái thật.

Tách thành hàm thuần `constraintStatusText` ở file riêng kèm test — khuôn `system-tag-label.ts` / `dish-explanation.ts` / `participant-status.ts` mà repo đã dùng cho đúng loại việc này. Ở đó nó cũng nằm trong phạm vi đo coverage, thay vì trốn trong một biểu thức JSX.

---

# 2. File tree

```text
src/features/preference/
├── application/preference-repository.ts        # T6 — setConstraint đổi chữ ký, +2 method
├── application/set-dish-constraint.ts          # T6 — kind + enabled
├── application/set-dish-constraint.test.ts     # T6
├── application/reset-implicit-preference.ts       # T6 — MỚI
├── application/reset-implicit-preference.test.ts  # T6 — MỚI
├── infrastructure/drizzle-preference-repository.ts             # T6
├── infrastructure/drizzle-preference-repository.integration.test.ts  # T6 (TC-166, TC-168)
└── presentation/components/
    ├── preference-settings-screen.tsx          # T8 — MỚI (presentation/ đầu tiên)
    └── preference-settings-screen.test.tsx     # T8 — MỚI

src/features/dish/presentation/components/
├── dish-preference-controls.tsx                # T7 — hai hàng, 5 nút
├── dish-preference-controls.test.tsx           # T7
├── constraint-status.ts                        # T7 — MỚI (§1.3)
└── constraint-status.test.ts                   # T7 — MỚI

src/features/group/presentation/components/
├── group-overview-screen.tsx                   # T8 — preferencesHref
└── group-overview-screen.test.tsx              # T8

src/app/api/preferences/
├── constraints/route.ts + route.test.ts        # T6 — body { kind, enabled }
└── implicit-reset/route.ts + route.test.ts     # T6 — MỚI, POST

src/app/groups/[groupId]/
├── page.tsx                                    # T8 — preferencesHref
├── dishes/page.tsx                             # T7 — đọc ba loại cờ
└── preferences/page.tsx                        # T8 — MỚI
```

---

# 3. `E13-T6` — Use case + Route Handler

## 3.1 Port

```ts
setConstraint(input: {
  userId: string
  globalDishId: string
  kind: ConstraintKind
  enabled: boolean
}): Promise<{ removedInteraction: boolean }>

/** SPEC-040 — ghi MỘT mốc, KHÔNG xoá dòng nào. */
resetImplicitPreference(userId: string): Promise<{ implicitResetAt: string }>

/** Mốc hiện tại cho màn cài đặt. `null` = chưa bấm Quên bao giờ. */
findImplicitResetAt(userId: string): Promise<string | null>
```

`ConstraintKind` đã khai ở `preference/domain/explicit-preference.ts` từ S1 — dùng lại, không khai lần hai.

## 3.2 Repository

`setConstraint` rẽ ba nhánh, theo đúng thứ tự đọc:

| Điều kiện | Việc |
| --- | --- |
| `kind === 'CANNOT_EAT' && enabled` | Nhánh `db.batch` hiện có (§1.1) — giữ nguyên từng dòng |
| `enabled` (kind khác) | **Chỉ** `insert … onConflictDoNothing()`. `removedInteraction: false` |
| `!enabled` | `delete` có `eq(kind, …)` — mệnh đề `kind` đã thêm ở S1 |

`resetImplicitPreference` — upsert rồi `.returning()`:

```ts
const rows = await db
  .insert(userPreferenceSettings)
  .values({ userId, implicitResetAt: sql`now()` })
  .onConflictDoUpdate({
    target: userPreferenceSettings.userId,
    set: { implicitResetAt: sql`now()`, updatedAt: sql`now()` },
  })
  .returning({ implicitResetAt: userPreferenceSettings.implicitResetAt })
```

`now()` của Postgres chứ không `new Date()` của Node: mốc này được **đọ với `decision_date`** trong `findImplicitSwipes` (`DEC-070`), nên nó phải cùng đồng hồ với dữ liệu nó lọc. Lấy lại giá trị bằng `.returning()` thay vì đoán — đó là con số thật sẽ có hiệu lực.

**KHÔNG `DELETE` dòng nào.** `TC-171` khẳng định số dòng `interactions` không đổi. Xoá thật sẽ phá Session Ranking của các phiên cũ (`SPEC-014` đọc cùng bảng) và vi phạm `BR-061`.

## 3.3 Use case

`set-dish-constraint.ts` — `SetDishConstraintInput` thành `{ userId, globalDishId, kind, enabled }`. Validate `kind` theo mảng hằng, khuôn `VALID_KINDS` của `set-dish-preference.ts`.

**Mới** `reset-implicit-preference.ts` — `(deps, { userId })` → `Result<{ implicitResetAt: string }, Failure>`. Mỏng, chỉ validate `userId`; không kiểm người dùng có tồn tại (khoá ngoại DB lo, và kiểm ở đây là mở một cửa sổ race).

## 3.4 Route Handler

Khuôn nguyên xi `constraints/route.ts`: `requireApiUser()` dòng đầu, `body['x']` qua index signature (`noPropertyAccessFromIndexSignature`), `{ code, details }` + `httpStatusForErrorCode`, `/* jscpd:ignore */` bọc khối lặp, `userId` **luôn** từ phiên đăng nhập (`TC-117`).

- `PUT /api/preferences/constraints` — body `{ globalDishId, kind, enabled }`.
- **Mới** `POST /api/preferences/implicit-reset` → `{ implicitResetAt }`. **POST chứ không PUT**: mỗi lần bấm dời mốc tới `now()` nên nó không idempotent, và một `PUT` không idempotent là nói dối về động từ.

Không `ErrorCode` mới — `ERR_VALIDATION` đủ.

## 3.5 Test

| TC | Tầng | Ca |
| --- | :---: | --- |
| `TC-166` | `I` | Có `SWIPE_RIGHT` cho X trong phiên `ACTIVE` → bật Blacklist X → `interactions` **giữ nguyên số dòng**, `countInteractionsByDish` cho X **không đổi** $P$ |
| — | `I` | Cùng tiền đề, nhưng bật `Cannot Eat` → lượt vuốt **bị xoá**, $P$ giảm. Ca đối chứng: không có nó thì `TC-166` xanh cả khi nhánh batch chết hẳn |
| `TC-168` | `I` | Ba cờ cùng `(user, món)`; gỡ từng cái một, hai cái kia còn nguyên |
| `TC-171` | `A`+`I` | `resetImplicitPreference` → `interactions` không đổi số dòng; `findImplicitSwipes` trả `[]` |
| — | `A` | `setDishConstraint` với `kind` lạ → `ERR_VALIDATION`, không ghi gì |
| — | route | 401 chưa đăng nhập · body không phải JSON · `kind` sai · `userId` trong body **bị bỏ qua** |

Ca đối chứng ở dòng hai là bắt buộc. `TC-166` khẳng định một thứ **không** xảy ra, và một ca như thế luôn xanh khi cơ chế bị gỡ mất hoàn toàn.

---

# 4. `E13-T7` — Hai nút mới ở màn Danh mục

## 4.1 Bố cục hai hàng có nhãn

```text
Hôm nay & lâu dài   [Thích] [Không thích]
Gợi ý               [Không ăn được] [Đừng gợi ý] [Ăn hoài không chán]
```

Năm nút trên một hàng `flex-wrap` sẽ tự xuống dòng theo bề rộng màn hình, và chỗ ngắt sẽ rơi vào giữa hai nhóm có ý nghĩa khác hẳn nhau — tuỳ máy. Hai hàng có nhãn làm ranh giới ấy **cố định và đọc được**: hàng trên cộng/trừ $E$ (`BR-037`), hàng dưới lọc cứng hoặc gỡ phạt $R$ (`BR-034`/`BR-035`/`BR-036`).

Nhãn hai cờ mới bám chữ của chính tài liệu: `BR-035` viết *"không muốn thấy món này xuất hiện trong danh sách gợi ý"* → **"Đừng gợi ý"**; `SPEC-039` viết *"món ăn hoài không chán"* → **"Ăn hoài không chán"**.

> [!CAUTION]
> **Đừng đặt nhãn Whitelist là "Luôn gợi ý".** Nó hứa sai: `SPEC-039` nói rõ Whitelist **không** phải lọc và **không** cộng điểm — nó chỉ gỡ một hình phạt. Món phở của người ngày nào ăn cũng được thôi bị Cooldown đẩy xuống, nhưng cũng không vì thế mà nhảy lên đầu. Một nhãn hứa nhiều hơn cơ chế là một báo lỗi sẽ tới sau vài ngày dùng.

## 4.2 Component

- Props thêm `blacklisted: boolean`, `historyWhitelisted: boolean`.
- Khai **lại tại chỗ** `type DishConstraintKind`, **không** import từ `features/preference` — header file đã ghi sẵn luật này cho `DishPreferenceKind`: `dish` không có chiều cross-feature nào, và đây là chuỗi hợp đồng HTTP chứ không phải kiến thức miền đi mượn.
- Ba handler cờ gộp thành **một** `saveConstraint(kind, next)` với một `Record<DishConstraintKind, boolean>` làm state. Ba handler gần trùng sẽ đụng `yarn dup`, và gộp cũng là cách duy nhất để rollback lạc quan không phải viết ba lần.
- `aria-pressed` + `aria-label` + dòng chữ (`NFR-03`, `E6-T6`): màu không bao giờ là tín hiệu duy nhất.
- `sendJsonWithRetry` với rollback — **không** fire-and-forget.

## 4.3 `constraint-status.ts`

```ts
export function constraintStatusText(input: {
  readonly preference: DishPreferenceKind | null
  readonly flags: Readonly<Record<DishConstraintKind, boolean>>
}): string
```

Nối các mệnh đề đang bật bằng ` · `, thứ tự cố định: Không ăn được → Đừng gợi ý → Ăn hoài không chán → Đang thích / Đang không thích. Không bật gì thì trả `''`.

Thứ tự cố định chứ không theo thứ tự bấm: một dòng chữ đổi thứ tự giữa hai lần render là một dòng chữ khó đọc.

## 4.4 `dishes/page.tsx`

Gọi `findConstrainedGlobalDishIds` **ba lần** trong `Promise.all` sẵn có. Ba truy vấn có index trên một bảng nhỏ, chạy ở server component — **không** nằm trên đường nóng của deck mà `NFR-01` đang canh. Việc đọc preference nằm ở `app/` chứ không ở `dish` là có chủ ý (tránh khai chiều `dish → preference`), giữ nguyên.

## 4.5 Test

Khuôn `dish-preference-controls.test.tsx` hiện có: stub `fetch` **toàn cục**, không stub `sendJsonWithRetry`.

Ca lỗi dùng `status: 400`. Dùng `5xx` là bắt test chờ **7 giây** qua ba vòng retry của `RETRY_DELAYS_MS` — đây là bẫy đã có trong file, giữ nguyên cách né.

- Bấm "Đừng gợi ý" → `PUT /api/preferences/constraints` với body `{ globalDishId, kind: 'BLACKLIST', enabled: true }`
- Bấm lại → `enabled: false`
- Hai cờ bật cùng lúc → `statusText` hiện **cả hai**, không giấu cái nào (§1.3)
- Lỗi 400 → rollback trạng thái nút **và** hiện *"Chưa lưu được"*

---

# 5. `E13-T8` — Màn cài đặt cá nhân + nút Quên

## 5.1 Page

`src/app/groups/[groupId]/preferences/page.tsx` — server component:

```ts
// Khai kiểu THỦ CÔNG, KHÔNG dùng helper `PageProps` (bẫy đã ghi ở E2-S4).
type PreferencesPageProps = { params: Promise<{ groupId: string }> }
```

`requireGroupContext(groupId)` chạy trước (guard ở mọi cửa vào — Tech Spec §5), rồi `findImplicitResetAt(user.id)`.

## 5.2 Screen

`preference/presentation/components/preference-settings-screen.tsx` — thư mục `presentation/` **đầu tiên** của feature này.

Luật tầng: `presentation/components` **không** import được `application/`, `infrastructure/` hay `shared/db`. Component nhận `initialImplicitResetAt` qua props và tự `fetch` Route Handler — đúng khuôn `DishPreferenceControls` đang làm, không phải ngoại lệ.

**Xác nhận hai nhịp trên chính nút**, khuôn `armed` của [`finalize-bar.tsx`](../../../src/features/meal/presentation/components/finalize-bar.tsx). **Không modal** — `design-invariants.test.ts` chặn `role="dialog"` ngoài `shared/ui/sheet.tsx`.

Khác `finalize-bar` đúng một điểm: đây là `type="button"` gọi `fetch`, không phải `type="submit"` trong `<form>`, nên nhịp 1 chỉ `setArmed(true)` — **không cần** `e.preventDefault()`.

Nhãn nút nói ra hệ quả, không thêm dòng "bạn có chắc không":

```text
nhịp 1:  Quên sở thích đã học
nhịp 2:  Chắc chắn quên · có hiệu lực từ phiên sau
```

## 5.3 Chữ trên màn

`SPEC-040` yêu cầu màn hình nói ra hai điều, và `TC-173` canh điều thứ nhất:

1. **Khai báo tự tay được giữ nguyên** — Thích, Không thích, Không ăn được, Đừng gợi ý, Ăn hoài không chán. Chỉ thứ hệ thống **tự suy ra** từ lịch sử vuốt bị bỏ qua.
2. **Deck phiên đang chạy không đổi** (`BR-048` — deck đã materialize). Hiệu lực bắt đầu từ phiên kế tiếp.

Hiện mốc đã quên lần trước nếu có, dùng `formatVietnameseDate` sẵn có ở `shared/time/`.

Không `bg-gradient`, không `animate-spin` — `design-invariants.test.ts` quét mã nguồn và sẽ đỏ.

## 5.4 Đường vào màn hình

`GroupOverviewScreen` thêm prop `preferencesHref` và một dòng `Link` trong khối "Nhóm của bạn". **Không có bước này thì màn `/preferences` không tới được từ đâu cả** — và một màn hình không tới được là một màn hình chưa giao.

> Bốn dòng `Link` hiện có gần trùng nhau; dòng thứ năm có thể làm `yarn dup` đỏ. Nếu đỏ thì tách một component `NavRow` trong cùng file — **không** bọc `jscpd:ignore` để né, vì ở đây trùng lặp là thật.

## 5.5 Test

- Nhịp 1: bấm → **không** gọi `fetch`, nhãn đổi
- Nhịp 2: bấm lại → gọi `POST /api/preferences/implicit-reset` đúng một lần
- `TC-173`: màn hình chứa chữ khẳng định khai báo tay được giữ
- `TC-172`: màn hình chứa chữ nói hiệu lực từ phiên sau
- Lỗi → hiện thông điệp, nút về nhịp 1 (bấm lại được)

---

# 6. Rủi ro

| Rủi ro | Dấu hiệu nhận biết sớm | Xử lý |
| --- | --- | --- |
| Blacklist mang hành vi Cannot Eat | $P$ giảm khi ai đó bấm "Đừng gợi ý" giữa phiên | §1.1 — `kind === 'CANNOT_EAT' && enabled` |
| `TC-166` xanh vì cơ chế chết hẳn | Không dấu hiệu nào | §3.5 — ca đối chứng Cannot Eat |
| `statusText` giấu bớt cờ | Bật ba cờ, màn chỉ hiện một | §1.3 — hàm thuần kèm test |
| Nhãn Whitelist hứa sai | Người dùng báo "bấm rồi mà món không lên đầu" | §4.1 — "Ăn hoài không chán" |
| "Quên" cài bằng `DELETE` | Session Ranking phiên cũ đổi theo | §3.2 — chỉ ghi mốc, `TC-171` đếm dòng |
| Mốc lệch đồng hồ | Phiên hôm nay vẫn được tính sau khi Quên | §3.2 — `now()` của Postgres, không `new Date()` |
| Màn mới không tới được | Không ai báo, vì không ai thấy | §5.4 — `preferencesHref` |
| Coverage `presentation/` tụt dưới 70 | `yarn test` đỏ ở ngưỡng | Slice này gần như toàn `presentation/`; viết test component song song, không dồn cuối |

---

# 7. Test Cases coverage

`TC-166`, `TC-168` §3.5 • `TC-171` §3.5 + §5.5 • `TC-172`, `TC-173` §5.5 • `TC-117` (khuôn `userId` từ phiên đăng nhập) §3.5.

`TC-167`, `TC-169`, `TC-170` và ca Whitelist-vẫn-trong-deck đã xanh từ S1 — S2 **không** đụng, nhưng lần đầu chúng đi qua nút thật ở §8.2.

---

# 8. Thứ tự TDD

1. `T6` port + repo: `TC-166` + ca đối chứng (integration, đỏ trước) → rẽ nhánh `setConstraint` → xanh. `TC-168` qua đường ghi thật.
2. `T6` `resetImplicitPreference` + `findImplicitResetAt` → `TC-171`.
3. `T6` use case (`tsc` sẽ liệt kê chỗ gọi khi đổi chữ ký) → Route Handler + test.
4. `T7` `constraint-status.ts` + test (thuần, nhanh) → component test → component.
5. `T7` nối `dishes/page.tsx`.
6. `T8` screen test → screen → page.
7. `T8` `preferencesHref` + `group-overview-screen.test.tsx`.
8. `yarn verify && yarn arch:probe && yarn test:integration`.

Bước 4 đặt hàm thuần **trước** component có chủ đích: `statusText` là chỗ duy nhất của slice có logic thật sự, và nó rẻ nhất để kiểm khi còn đứng riêng.

---

# 9. Verify

## 9.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn test:integration
```

Cạm bẫy: `jscpd` (khối validate ở route handler mới + dòng `Link` thứ năm); `knip --production` (export chưa ai import — nối trong cùng commit); ngưỡng coverage `presentation/` là **70**.

## 9.2 Bằng chứng `TC-166` — ranh giới Blacklist ↔ Cannot Eat

Chạy tay, và chạy **cả hai vế** cạnh nhau, vì cái được kiểm là sự KHÁC NHAU:

1. Mở phiên, vuốt phải món X. Mở Session Ranking, ghi lại $P$ của X.
2. Vào Danh mục, bấm **"Đừng gợi ý"** cho X. Về Session Ranking: $P$ **giữ nguyên**.
3. Tải lại deck (phiên mới): X **biến khỏi** deck.
4. Làm lại từ đầu với món Y, nhưng bấm **"Không ăn được"**: $P$ của Y **giảm**, lượt vuốt biến mất.

Bước 2 và bước 4 là hai nửa của cùng một bằng chứng. Chỉ chạy bước 2 thì không phân biệt được "Blacklist đúng" với "cả hai cờ đều chết".

## 9.3 Bằng chứng nút Quên

1. Vuốt phải một món qua vài phiên đã chốt (như điểm kiểm tra §17.4 của S1).
2. Mở phiên mới, xác nhận món đó lên đầu deck.
3. **Trong khi phiên đó đang chạy**, vào `/groups/<id>/preferences`, bấm Quên (hai nhịp).
4. Về deck: thứ tự **KHÔNG đổi** (`TC-172` — `BR-048`, deck đã materialize).
5. `yarn db:studio`: `select count(*) from interactions` bằng đúng số trước khi bấm (`TC-171`).
6. Hôm sau mở phiên mới: món đó **không còn** ở đầu deck.
7. Vào Danh mục: Thích / Không thích / ba cờ **còn nguyên** (`TC-173`).

Bước 4 và bước 6 kiểm hai chuyện khác nhau — một cái là "không đụng phiên đang chạy", một cái là "có hiệu lực thật". Một cái đúng không suy ra cái kia.

## 9.4 Bằng chứng Whitelist qua nút thật

S1 đã ghim ở tầng `I`; đây là lần đầu đi qua giao diện:

1. Bấm **"Ăn hoài không chán"** cho một món vừa ăn hôm qua.
2. Mở phiên mới: món **vẫn có** trong deck (không bị lọc) **và không** bị Cooldown đẩy xuống.

---

# 10. Decision Log

Chỉ thêm `DEC-071` **nếu** có gì lệch đặc tả khi thi công. Dự kiến hai ứng viên: đổi body Route Handler thành breaking change (§1.2), và `constraintStatusText` tách thành hàm thuần (§1.3). Nếu cả hai đều nằm gọn trong khuôn đã có thì **không thêm DEC** — một ADR ghi lại việc làm đúng như kế hoạch là một ADR rỗng.

---

# 11. Master Plan

[§17.2](../../what-we-gonna-eat-today_master-plan_v2.1.md): tick `[x]` cho `E13-T6` → `E13-T8`; §13.2 đổi `E13` sang hoàn thành. DoD của `E13-T8` bổ sung một dòng: `GroupOverviewScreen` phải có đường vào màn mới (§5.4) — Master Plan gốc không liệt kê file đó.
