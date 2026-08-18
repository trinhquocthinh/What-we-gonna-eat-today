# Decision Log — What We Gonna Eat Today

## Version 1.4

**Status:** Active  
**Created:** 2026-07-23  
**Last Updated:** 2026-08-17  
**Supersedes:** Version 1.3

Decision Log ghi lại các quyết định có ảnh hưởng đáng kể đến domain model, business rules hoặc scope. Current source of truth vẫn là Problem Definition và Business Rules phiên bản mới nhất; Decision Log giải thích **vì sao** các rule hiện tại tồn tại.

---

# DEC-001 — Selection Session Lifecycle

**Date:** 2026-07-23  
**Status:** Accepted

## Decision

Selection Session có lifecycle:

```text
Draft
  ↓ Start
Active
  ├──→ Finalized
  └──→ Invalid
```

`Cancelled` và `Timeout` được xem là invalid reasons, không phải state riêng trong MVP.

Chỉ Active hoặc Finalized Session được tính vào valid decision-flow uniqueness cho `Group + Decision Date`.

Draft và Invalid Session không block việc tạo valid Session mới cùng ngày.

Finalized Session không reopen; mọi thay đổi sau đó đi qua Final Meal Correction.

## Rationale

- Cần Draft để Creator cấu hình Participant, Chef và Session Rule trước khi bắt đầu.
- Cancel và Timeout có cùng downstream behavior: không học preference, không tạo Eating History.
- Invalid Session không nên khóa Group cả ngày.

## Affected Documents

- Problem Definition v1.3
- Business Rules v1.3

---

# DEC-002 — Participant Lifecycle and Re-entry

**Date:** 2026-07-23  
**Status:** Accepted

## Decision

Participant có progress lifecycle:

```text
Active Participation ↔ Completed
          ↓
       Removed
```

- Completed không khóa Interaction.
- Participant có thể reopen trước khi Session Finalized.
- Creator có thể remove Participant đã Completed.
- Participant chưa Completed vẫn có thể nhận Default Eating History nếu còn trong Session khi finalize.
- Nếu Participant bị remove rồi add lại, đó là fresh participation.
- Interaction cũ được giữ cho audit nhưng không restore hiệu lực.

## Rationale

Giữ UX linh hoạt nhưng tránh logic restore phức tạp khi Participant re-enter.

---

# DEC-003 — Group Membership Changes During Active Session

**Date:** 2026-07-23  
**Status:** Accepted

## Decision

- Nếu Group Member là Participant của Active Session và bị remove khỏi Group, User bị remove khỏi Participant list của các Active Session liên quan.
- Creator của Active Session không thể bị remove khỏi Group cho đến khi Session kết thúc.
- Nếu User là Chef của Active Session, User không thể bị remove khỏi Group cho đến khi Session kết thúc.

## Rationale

Bảo vệ các invariant `Creator must be Group Member` và `Chef must be Group Member` mà không cần ownership transfer hoặc dynamic Chef replacement trong MVP.

---

# DEC-004 — Persistent Chef Role and Cooking Capability

**Date:** 2026-07-23  
**Status:** Accepted

## Decision

Group membership model:

```text
Member
Member + Chef
Member + Group Admin
Member + Chef + Group Admin
```

- Member là base membership.
- Chef và Group Admin là role/capability bổ sung.
- Group Admin gán/gỡ Chef Role.
- Không thể gỡ Chef Role nếu User đang là Chef của Active Session.
- Khi Start Session phải revalidate Chef vẫn thuộc Group và còn Chef Role.
- Cooking Capability thuộc User, không thuộc Group.
- Chỉ User Chef tự chỉnh Cooking Capability trong normal flow.
- Missing Cooking Capability = `Unknown`, không phải `Cannot Cook`.

## Rationale

Chef là đặc tính tương đối ổn định trong Group, trong khi khả năng nấu thuộc về cá nhân và có thể dùng xuyên Group.

---

# DEC-005 — Session Interaction and Persistent Dish Action Semantics

**Date:** 2026-07-23  
**Status:** Accepted

## Decision

Đối với `Session + Participant + Dish`:

```text
None ↔ Swipe Right ↔ Swipe Left
```

Effective Session Interaction mới nhất thắng.

User có thể Undo về `None`.

Persistent Dish Action và Session Interaction là hai loại state khác nhau.

- Mark `Cannot Eat` sau Swipe: effective Swipe bị clear / invalidate.
- Add `Blacklist` sau Swipe: existing effective Swipe vẫn giữ nguyên; Dish chỉ bị loại khỏi future Personal Candidate discovery của User.
- Whitelist và Explicit Preference có thể trigger Personal Ranking recalculation nhưng không clear Session Interaction.

## Rationale

`Cannot Eat` là hard constraint nên conflict trực tiếp với Swipe. Blacklist chỉ kiểm soát recommendation discovery và không có nghĩa User rút đề xuất hiện tại.

---

# DEC-006 — Eating History Source Records and Personal Correction Authority

**Date:** 2026-07-23  
**Status:** Accepted

## Decision

Eating History giữ source reference đến Final Meal đã tạo default record.

Một User có thể có nhiều source record cho cùng Dish và cùng ngày nếu tham gia nhiều Group / Final Meal.

Personal Correction có thể Add hoặc Remove Dish trong Eating History context tương ứng.

Authority:

```text
Authoritative Final Meal
        ↓
Default Eating History
        ↓
User Personal Correction
        ↓
Effective Eating History
```

Final Meal Correction chỉ cập nhật phần default-derived history mà User chưa sửa.

Personal Correction là source of truth cho phần User đã chỉnh.

Không yêu cầu correction reason trong MVP.

User có thể chỉnh historical Eating History không giới hạn thời gian trong MVP.

## Rationale

Tôn trọng thực tế một User có thể tham gia nhiều Group trong ngày và bảo vệ dữ liệu cá nhân đã được User xác nhận/correct khỏi bị Group-level correction overwrite.

---

# DEC-007 — Final Meal Correction Authority

**Date:** 2026-07-23  
**Status:** Accepted

## Decision

- Creator chỉ sửa Final Meal của Decision Date hiện tại trong normal product flow.
- System Admin có thể sửa historical Final Meal để xử lý human error hoặc data issue.
- Historical System Admin correction phải giữ audit trail tối thiểu: before, after, changed by, changed at.
- Correction reason chưa bắt buộc trong MVP.

## Rationale

Giới hạn normal flow để giảm retroactive complexity nhưng vẫn giữ đường xử lý sự cố dữ liệu thực tế.

---

# DEC-008 — Global Dish Creation Provenance and Logical Merge Strategy

**Date:** 2026-07-23  
**Status:** Accepted

## Decision

Global Dish mới phải lưu:

- `created_by_user`
- `created_from_group`
- `created_at`

User không trực tiếp chỉnh Global Dish Identity; thay đổi global identity thuộc System Admin flow.

Merge strategy:

- MVP không triển khai Full Merge.
- MVP vẫn hỗ trợ duplicate detection khi tạo Dish.
- Hướng hậu MVP là Logical Merge / Canonical Identity.
- Historical records giữ original `dish_id`; không hard rewrite toàn bộ references.
- Khi cần, application resolve original identity về canonical identity.
- Nếu nhiều Interaction resolve về cùng canonical Dish trong cùng Session, Interaction mới nhất được ưu tiên làm effective signal.
- Chỉ System Admin có quyền merge.

## Rationale

Hard merge ảnh hưởng đồng thời Group Dish Pool, Active Session, Interaction, Final Meal, Eating History và Preference, tạo complexity không cần thiết cho MVP.

Logical Merge giữ auditability và giảm migration risk.

---

# DEC-009 — Group Dish Removal and Re-add Behavior

**Date:** 2026-07-23  
**Status:** Accepted

## Decision

Group Dish relationship sử dụng trạng thái logic `Active / Inactive`.

Khi remove:

- Historical references được giữ.
- Dish bị loại khỏi Candidate và Active Session Ranking.
- Existing Interaction được giữ audit nhưng mất hiệu lực.

Khi add lại:

- Group-specific metadata có thể được restore.
- Interaction cũ trong Active Session không tự động restore hiệu lực.
- User phải tương tác lại nếu muốn tạo effective Interaction mới.

## Rationale

Cho phép undo Group Dish removal mà không mất metadata, đồng thời tránh logic khôi phục Interaction phức tạp.

---

# DEC-010 — Group Rule and Session Rule Model

**Date:** 2026-07-29  
**Status:** Accepted

## Decision

MVP sử dụng một Group Rule set cho mỗi Group, nhưng data model phải giữ khả năng mở rộng thành nhiều preset / rule set về sau.

Group Rule hiện gồm:

- Target Dish Count — một preferred integer target.
- Required System Tag rules.
- Preferred System Tag rules.

Tag Rule structure dùng chung:

```text
System Tag
+ minimum_count >= 1
+ rule_type = Required | Preferred
+ overridable
```

Constraints:

- Không duplicate cùng `rule_type + System Tag`.
- Một System Tag không được đồng thời là Required và Preferred trong cùng effective rule set.
- Dish có nhiều System Tag được count độc lập cho từng Tag; một Dish có thể đồng thời satisfy nhiều requirement.

Permission và lifecycle:

- Chỉ Group Admin chỉnh Group Rule.
- Khi tạo Session, Group Rule được snapshot thành Session Rule.
- Chỉ Creator được chỉnh Session Rule và chỉ trong Draft.
- Session Rule bị khóa khi Session Active.
- Rule có `overridable = true` có thể được Creator modify hoặc disable trong Draft.
- Override replace inherited rule tương ứng; không cộng dồn.
- Override có thể làm rule mạnh hơn hoặc nhẹ hơn.
- Creator có thể thêm Session-only Required hoặc Preferred Rule trong Draft.
- MVP chưa cần permission riêng để hạn chế loại Session-only rule Creator được thêm.
- Session Rule không cần version number riêng trong MVP; chỉ effective state cuối trước Active cần được giữ.

## Rationale

Giữ Group Rule đủ đơn giản cho MVP nhưng cho phép Session linh hoạt theo context thực tế. Snapshot và Draft-only editing giúp Session có rule state ổn định, tránh dynamic behavior sau khi Participant đã bắt đầu tương tác.

## MVP Impact

- Group Rule configuration.
- Session creation and Draft editing.
- Final Meal validation structure.
- Data model cho rule inheritance / override.

## Future Implications

Data model không nên giả định Group chỉ có một rule set vĩnh viễn; có thể mở rộng thành named preset / rule profile sau MVP.

---

# DEC-011 — Final Meal Rule Evaluation and Warning Semantics

**Date:** 2026-07-29  
**Status:** Accepted

## Decision

Trong MVP, Meal Composition Rule không được dùng để điều chỉnh Recommendation Ranking.

- Required Rule không trực tiếp filter Personal Candidate.
- Required Rule không boost Session Ranking để hoàn thành composition.
- Preferred Rule không ảnh hưởng Personal Ranking hoặc Session Ranking.
- Target Dish Count không ảnh hưởng Personal Ranking hoặc Session Ranking.

Rule evaluation tập trung vào Final Meal flow.

Trong lúc Creator xây Final Meal, hệ thống có thể hiển thị live composition feedback, nhưng đây không phải authoritative validation.

Khi Creator bấm Finalize, hệ thống luôn revalidate từ đầu bằng:

- Current Group Dish Pool.
- Current Group-specific System Tag của Dish.
- Locked effective Session Rule.

System Tag không snapshot cùng Session trong MVP.

Finalize behavior:

- Bất kỳ Required Rule fail → reject finalize; Session vẫn Active.
- Preferred Rule fail → warning, Creator vẫn có thể finalize.
- Target Dish Count không đạt → warning, Creator vẫn có thể finalize.
- Không cần state `ValidationFailed`.

Warning mà Creator override khi finalize phải được lưu cùng Final Meal để audit, tối thiểu gồm warning type, rule/context reference và actual condition/value.

## Rationale

Tách ranking khỏi composition validation giữ MVP dễ giải thích: ranking phản ánh user evidence, còn rule engine bảo vệ Final Meal constraints. Revalidation tại finalize tránh dựa vào cached state đã lỗi thời khi Group Dish Pool hoặc System Tag thay đổi.

## MVP Impact

- Finalize validation workflow.
- Finalize warning confirmation.
- Warning audit data.
- Ranking specification: chưa dùng composition rule làm ranking signal.

## Future Implications

Sau MVP có thể nghiên cứu dùng Required/Preferred Rule để guide ranking hoặc meal candidate generation mà không thay đổi semantics của validation hiện tại.

---

# DEC-012 — Ranking Model, Cooldown and Exploration Strategy

**Date:** 2026-08-14  
**Status:** Accepted

## Decision

### Personal Ranking

Personal Ranking dùng **linear weighted score, deterministic và explainable**. Không dùng ML, embedding hoặc online learning trong MVP.

```text
score = w_explicit × E
      + w_implicit × I
      + w_chef     × C
      + w_source   × S
      − w_recency  × R
```

Hard constraint (`Cannot Eat`, Blacklist, Inactive Group Dish) được xử lý bằng filter trước khi tính score, không bằng trọng số âm.

### Implicit Preference

- Exponential time decay, half-life 60 ngày.
- Smoothing prior `k = 3` để một lần swipe đơn lẻ không khoá cứng ranking.
- Chỉ học từ Session ở trạng thái `Finalized`.
- Interaction của Session đang `Active` không được dùng để tính lại ranking trong chính Session đó.
- Chỉ tính interaction có timestamp mới hơn `implicit_reset_at(user, dish)`.

### Eating History và Cooldown

- `COOLDOWN_WINDOW_DAYS = 7`, linear decay từ `1.0` xuống `0`.
- Cooldown chỉ áp dụng ở **cấp Dish**. Tag-level cooldown thuộc Out of Scope.
- Nhiều Eating History source record cho cùng `User + Dish + Date` được **collapse thành một eating event** cho mục đích ranking. Ăn cùng một Dish ở nhiều Group trong cùng ngày không tạo penalty gấp đôi.
- Whitelist đưa recency penalty về `0`.

### Exploration

Personal Candidate deck ghép theo block 5 vị trí: **4 exploit + 1 explore**, tương ứng 20% slot khám phá.

Explore Pool gồm Dish chưa từng ăn hoặc đã hơn 30 ngày chưa ăn, và không bị Explicit `Dislike`.

### Recalculation trong Active Session

- Phần deck đã xem (`index < cursor`) được đóng băng.
- Chỉ phần chưa xem được tính lại và sắp xếp lại.
- Dish vừa bị hard filter được remove khỏi phần chưa xem ngay.

### Session Ranking

Session Ranking là **evidence-only**:

```text
session_score = (a×P − b×N − c×X − d×H) / T
```

- Chuẩn hoá theo số Participant hiện tại để điểm không nhảy khi Creator thêm/bớt người.
- Creator **không** có trọng số riêng.
- Chef context và conflict với Session Rule là display-only, không cộng vào điểm.
- Dish chưa có interaction không được cho điểm; hiển thị ở section riêng để Creator vẫn có thể chọn.

## Rationale

Ở quy mô dưới 10 user và khoảng một Session mỗi ngày, mỗi User chỉ tích luỹ khoảng 30 interaction mỗi tháng. Dữ liệu này quá mỏng cho bất kỳ mô hình học nào; smoothing prior và time decay là biện pháp chống nhiễu tối thiểu và đủ.

Explore lane tồn tại vì hai mục tiêu trong Problem Definition §3 kéo ngược nhau: "giúp User khám phá nhiều Dish hơn" và "đưa Dish phù hợp lên trước để kết thúc sớm". Một hàm score thuần exploit sẽ đẩy đúng nhóm món quen lên đầu và tái tạo chính vấn đề mô tả ở §2. Tỉ lệ khám phá vì vậy phải là cấu trúc tường minh, không phải hệ quả phụ của trọng số.

Đóng băng phần deck đã xem giữ trải nghiệm swipe ổn định: thứ tự không được đổi dưới tay User trong lúc họ đang duyệt.

Chuẩn hoá Session Ranking theo `T` là bắt buộc vì Creator được phép thêm hoặc remove Participant giữa Session, khiến điểm thô mất khả năng so sánh.

## MVP Impact

- Personal Candidate generation và paging.
- Deck recalculation policy.
- Eating History aggregation.
- Session Ranking computation và hiển thị.
- Ranking config constants.

## Future Implications

Các trọng số trong config là điểm khởi đầu có chủ đích, không phải kết quả tuning; nên xem lại sau khoảng 4 tuần dữ liệu thật. Tag-level hoặc ingredient-level cooldown, Dish compatibility và meal candidate generation vẫn nằm ngoài phạm vi.

## Affected Documents

- Ranking Specification v0.1
- Business Rules v1.5
- Problem Definition v1.4

---

# DEC-013 — Auth.js Beta Dependency

**Date:** 2026-08-17
**Status:** Accepted

## Decision

`next-auth@5.0.0-beta.32` (pulling `@auth/core@0.41.3`) is pinned as an exact dependency for E1-T1, without an adapter.

## Rationale

It is the only `next-auth` line with peer support for Next.js 16 and React 19. No stable release supports Next 16 at time of writing.

## Review Trigger

Revisit this pin once `next-auth` publishes a stable v5 release, or when upgrading Next.js/React surfaces a peer dependency conflict.

## Affected Documents

- Setup & Ops Guide v0.1 §1

---

# DEC-014 — `provisionUser` Failure Surfaces as Exception at the Auth.js Boundary

**Date:** 2026-08-17
**Status:** Accepted

## Decision

`features/auth/infrastructure/auth.ts` throws inside `callbacks.jwt` when `provisionUser` returns a `Failure`, instead of returning `null`.

## Rationale

Auth.js treats a `null` return from `callbacks.jwt` as "clear the cookie, then still redirect to `callbackUrl`" — the user loops back into the login screen with no visible error. Throwing is the only way to surface `pages.error`. This is the one place in the codebase where a `Result` is converted to an exception, and it is deliberately scoped to the outer framework boundary, not a layer boundary: `application/` still returns `Result` everywhere else.

## Consequence

Anyone "cleaning up" this throw to match the `Result` convention elsewhere reintroduces the silent redirect loop. Do not change it without also changing the `pages.error` handling in `app/page.tsx`.

## Affected Documents

- SDD v0.2 §2.5 (error code table — no code exists for this case, and none should be added here)

---

# DEC-015 — neon-http `db.batch()` Is a Real Transaction; `db.transaction()` Is Not

**Date:** 2026-08-17
**Status:** Accepted

## Decision

`GroupRepository.createWithAdmin` inserts `groups` and `group_members` via `db.batch([...])`. Verified in `node_modules/drizzle-orm/neon-http/session.js`: `batch()` calls `client.transaction(builtQueries)` (Neon sends a `Neon-Batch-Isolation-Level` header), while `db.transaction()` throws `"No transactions support in neon-http driver"`. `batch()` is non-interactive — no reading an id back mid-batch — so `groupId` is generated explicitly with `uuidv7()` in infrastructure rather than left to the schema's `$defaultFn`.

## Rationale

This satisfies SDD §2.4 ("a failed write leaves no partial change") for E1-T2 without adding a new driver. `batch()`'s type is a tuple `Readonly<[U, ...U[]]>`, so the array must be a literal, not built via `.map()` or stored in a `const queries: X[]`.

## Consequence

E1-T7 and E1-T11 need read-then-write inside the same transaction — `batch()` cannot do that. Those slices must add the `neon-serverless` (WebSocket) driver instead of trying to force it through `batch()`.

## Affected Documents

- Tech Spec v0.2 §2 (data access), SDD v0.2 §2.4

---

# DEC-016 — Canonical IANA Time Zone Stored, Not User Input

**Date:** 2026-08-17
**Status:** Accepted

## Decision

`readGroupDraft` (SPEC-002) canonicalizes the timezone with `Intl.DateTimeFormat(...).resolvedOptions().timeZone` before it reaches `GroupRepository.createWithAdmin`. `groups.timezone` always holds the canonical form (e.g. `Asia/Saigon`), never the raw browser-reported string.

## Rationale

Verified on ICU 77 (Node 22) and ICU 78 (Node 24): `Intl.supportedValuesOf('timeZone')` has 418 entries and does **not** include `Asia/Ho_Chi_Minh`, only its canonical alias `Asia/Saigon`. Firefox reports `Asia/Ho_Chi_Minh`; Chrome/V8 reports `Asia/Saigon`. Storing the raw value means a Firefox-created Group and a Chrome-created Group can hold two different strings for the same real timezone, and any code that matches against the `supportedValuesOf()` list (e.g. the time zone picker) would silently fail to highlight the Firefox one.

## Consequence

`isValidTimeZone` (`shared/time/time-zone.ts`) must not be implemented as `supportedValuesOf().includes(tz)` — that rejects `Asia/Ho_Chi_Minh` outright, which is also the exact value TC-004/TC-005 exercise. It must use a try/catch around `Intl.DateTimeFormat`, plus an explicit reject of offset-like strings (`'+07:00'`), which `Intl` otherwise accepts despite not being an IANA identifier.

## Affected Documents

- SDD v0.2 SPEC-002, SPEC-018

---

# DEC-017 — `DISPLAY_TIME_ZONE_FALLBACK` Is Display-Only, Never a Group Default

**Date:** 2026-08-17
**Status:** Accepted

## Decision

`shared/time/time-zone.ts` exports `DISPLAY_TIME_ZONE_FALLBACK = 'Asia/Ho_Chi_Minh'`, used only to render the date caption on `/groups` (a screen with no Group context yet). It must never be used as the timezone written for a new Group, nor passed into `resolveDecisionDate` for any Session-related calculation.

## Rationale

SPEC-018 states there is no hidden default timezone — creating a Group must always set one explicitly. Reusing the display fallback as a silent default would violate that and make every Group's Decision Date depend on an assumption nobody chose.

## Consequence

Any new call site that needs a Group's actual timezone must read it from `groups.timezone`, never from `DISPLAY_TIME_ZONE_FALLBACK`. Reviewers should treat a new import of this constant outside a Group-less display context as a bug.

## Affected Documents

- SDD v0.2 SPEC-018

---

# DEC-018 — Database Enums Defined with `pgEnum`

**Date:** 2026-08-18  
**Status:** Accepted

## Decision

`group_dishes.state` (and subsequent DB enums) uses `pgEnum('group_dish_state', ['ACTIVE', 'INACTIVE'])` rather than `text().$type<GroupDishState>()`.

## Rationale

1. Postgres rejects invalid enum values directly at the DB boundary, avoiding subtle bugs where lower-cased or typos (e.g. `'active'`) get skipped in `WHERE state = 'ACTIVE'`.
2. Drizzle automatically infers the TS literal union `'ACTIVE' | 'INACTIVE'`.
3. Verified in drizzle-kit: adding values to the array produces `ALTER TYPE ... ADD VALUE` in migrations automatically without manual SQL scripts.
4. Domain types maintain clean decoupling (`domain/group-dish.ts` defines a pure union type; drizzle repository acts as compile-time assertion boundary).

## Affected Documents

- SDD v0.2 §2.1, §2.2; Tech Spec v0.2 §3.1, §3.3

---

# DEC-019 — Dish Name Normalization: Level 1 in E1, Diacritics Removal Deferred to E2-T3 with Backfill

**Date:** 2026-08-18  
**Status:** Accepted

## Decision

`normalizeDishName` in E1 performs Level 1 normalization: NFC canonical composition, whitespace collapsing/trimming, and lowercase. Vietnamese diacritics removal (Level 2) is deferred to E2-T3 and will be added directly into `src/features/dish/domain/normalize-name.ts` along with a required migration backfill script.

## Rationale

Creating `normalize-name.ts` with Level 1 normalization in E1 prevents code duplication and keeps a single source of truth for dish name matching. Deferring Level 2 keeps E1 walking skeleton minimal while explicitly establishing that E2-T3 must backfill `global_dishes.normalized_name`.

## Affected Documents

- SDD v0.2 SPEC-005, Master Plan v1.0 §3/§4

---

# DEC-020 — Route Revalidation and Client Router Refresh in Server Actions

**Date:** 2026-08-18  
**Status:** Accepted

## Decision

In `addDishAction`, `revalidatePath('/groups/${groupId}')` is called with the literal path (omitting type parameter) to invalidate the stale parent group overview page cache, and `refresh()` from `next/cache` is called to refresh the client router for the current page where the user stays.

## Rationale

`refresh()` is the designated Next.js 16 Server Action API for "read-your-own-writes" when remaining on the active page without invalidating unrelated data caches. `revalidatePath` with dynamic route segments requires a literal path to prevent blowing away the cache for all groups.

## Affected Documents

- Tech Spec v0.2 §2.1, Next.js 16 conventions

---

# DEC-021 — Error Boundary Components Use `retry` Prop in Next.js 16

**Date:** 2026-08-18  
**Status:** Accepted

## Decision

Error boundary components (`app/**/error.tsx`) accept `{ retry: () => void }` instead of `reset`.

## Rationale

In Next.js 16 (`03-file-conventions/error.md`), `reset()` merely clears the React error boundary state and re-renders the old data, whereas `retry()` refetches data from the server and re-renders, matching the design intent of the "Thử lại" (Retry) action.

## Affected Documents

- Tech Spec v0.2 §2.1, S-02/S-05 error designs

---

# DEC-022 — State Adjustment During Render for Server Action State Transitions

**Date:** 2026-08-18  
**Status:** Accepted

## Decision

Client components handling Server Action state transitions (`DishCatalogScreen`) use React's official "adjust state during render" pattern (`if (state !== prevActionState) { setPrevActionState(state); if (state.addedDishName !== null) setSheetOpen(false); }`) instead of `useEffect([state])`.

## Rationale

1. Completely avoids React Compiler ESLint warning `react-hooks/set-state-in-effect` (cascading renders).
2. Avoids the stale state / duplicate string comparison trap noted in guide §14 (where adding two dishes with identical names consecutively would fail to trigger effects that compare primitive string values).
3. Executes synchronously before browser paint without an extra delayed render pass.

## Affected Documents

- Presentation layer components (`DishCatalogScreen`, S-05)

---

# DEC-023 — Animated Sheet Exit via `useSheetClose` Context

**Date:** 2026-08-18  
**Status:** Accepted

## Decision

`Sheet` exposes `useSheetClose()` via React Context to allow child components (e.g. "Đóng" button in `AddDishSheet`) as well as scrim clicks and `Escape` key events to trigger the `sheet-slide-down` and `scrim-fade-out` CSS animations before `onClose()` is invoked to unmount the sheet.

## Rationale

Calling `onClose()` directly from child buttons immediately unmounts the sheet from the DOM without playing exit animations. Managing the closing state (`isClosing`) internally and firing `onClose()` on `animationend` provides a polished, smooth slide-down exit while preserving a clean declarative API for callers.

## Affected Documents

- Shared UI (`Sheet`), Presentation components (`AddDishSheet`, S-06)

---

# DEC-024 — E1-T7's Minimal `startSession` Does Not Need the WebSocket Driver

**Date:** 2026-08-18  
**Status:** Accepted

## Decision

DEC-015's consequence section claimed E1-T7 needs read-then-write inside a transaction, requiring the `neon-serverless` driver. This is corrected: E1-T7 implements only SPEC-007 (create) plus a minimal `startSession` — a single `UPDATE selection_sessions SET state='ACTIVE', started_at=now() WHERE id=$1 AND state='DRAFT'`. Postgres wraps a single statement in an implicit transaction; the partial unique index `selection_sessions_active_per_group_date` catches the BR-025 race at commit time.

*Implementation Note on Error Catching:* Drizzle ORM wraps query errors inside `Error("Failed query: ...", { cause })`, and the Neon HTTP driver surfaces driver errors as `NeonDbError` rather than `DatabaseError`. Hence, `infrastructure/drizzle-session-repository.ts` catches this via `isSessionUniquenessViolation` which inspects `target.code === '23505'` and `target.constraint === 'selection_sessions_active_per_group_date'` on the error/cause rather than a fragile `instanceof DatabaseError`.

`createSession`'s two inserts (session + participant) remain atomic via `db.batch()`, same pattern as `GroupRepository.createWithAdmin`.

## Rationale

Master Plan assigns E1-T7 only `SPEC-007, TC-026→029, TC-107` — not SPEC-008. Full SPEC-008 (5-step revalidation, Group Rule → Session Rule snapshot in one transaction) is E3-T1's scope. Conflating the two led DEC-015 to over-provision infrastructure for a slice that doesn't need it.

## Consequence

The `neon-serverless` (WebSocket) driver is deferred to **E3-T1**, where snapshotting Group Rule into Session Rule is a genuine read-then-write inside one transaction. `client.ts`'s comment is retargeted to E3-T1 explicitly.

## Affected Documents

- Decision Log DEC-015 (amended by this entry, not superseded)
- Tech Spec v0.2 §3.2, §4.1

---

# Decision Index

| ID | Decision | Status | Primary Impact |
|---|---|---|---|
| DEC-001 | Selection Session Lifecycle | Accepted | Session state, uniqueness |
| DEC-002 | Participant Lifecycle and Re-entry | Accepted | Participation, Interaction validity |
| DEC-003 | Group Membership Changes During Active Session | Accepted | Membership invariants |
| DEC-004 | Persistent Chef Role and Cooking Capability | Accepted | Group roles, Chef Mode |
| DEC-005 | Interaction vs Persistent Action Semantics | Accepted | Ranking, constraint behavior |
| DEC-006 | Eating History and Personal Correction Authority | Accepted | History model, recommendation input |
| DEC-007 | Final Meal Correction Authority | Accepted | Correction and audit |
| DEC-008 | Global Dish Provenance and Logical Merge | Accepted | Dish identity, MVP scope |
| DEC-009 | Group Dish Removal and Re-add | Accepted | Group Dish lifecycle |
| DEC-010 | Group Rule and Session Rule Model | Accepted | Rule structure, snapshot, override |
| DEC-011 | Final Meal Rule Evaluation and Warning Semantics | Accepted | Validation, warning, ranking boundary |
| DEC-012 | Ranking Model, Cooldown and Exploration Strategy | Accepted | Personal Ranking, Session Ranking, Eating History aggregation |
| DEC-013 | Auth.js Beta Dependency | Accepted | `next-auth` version pin |
| DEC-014 | `provisionUser` Failure Surfaces as Exception at the Auth.js Boundary | Accepted | Auth.js callback error handling |
| DEC-015 | neon-http `db.batch()` Is a Real Transaction; `db.transaction()` Is Not | Accepted | `GroupRepository` write path, future driver choice |
| DEC-016 | Canonical IANA Time Zone Stored, Not User Input | Accepted | Group timezone storage, time zone picker matching |
| DEC-017 | `DISPLAY_TIME_ZONE_FALLBACK` Is Display-Only, Never a Group Default | Accepted | `/groups` date caption vs. Group/Session timezone |
| DEC-018 | Database Enums Defined with `pgEnum` | Accepted | Schema enum definitions, DB rejection of invalid values |
| DEC-019 | Dish Name Normalization: Level 1 in E1, Diacritics Removal in E2-T3 with Backfill | Accepted | `normalize-name.ts`, backfill obligation |
| DEC-020 | Route Revalidation and Client Router Refresh in Server Actions | Accepted | `refresh()`, literal `revalidatePath` |
| DEC-021 | Error Boundary Components Use `retry` Prop in Next.js 16 | Accepted | `error.tsx` retry semantics |
| DEC-022 | State Adjustment During Render for Server Action State Transitions | Accepted | `DishCatalogScreen`, no cascading `useEffect` |
| DEC-023 | Animated Sheet Exit via `useSheetClose` Context | Accepted | `Sheet`, `AddDishSheet`, slide-down transition |
| DEC-024 | E1-T7's Minimal `startSession` Does Not Need the WebSocket Driver | Accepted | `startSession` implementation, partial unique index race handling |

---

# Change History

| Version | Date | Change |
|---|---|---|
| 1.7 | 2026-08-18 | Added DEC-024 for E1-T7 (S4 Minimal Session): correcting DEC-015 regarding WebSocket driver deferral to E3-T1 |
| 1.6 | 2026-08-18 | Added DEC-022 (adjust state during render for Server Actions) and DEC-023 (animated sheet exit via useSheetClose) |
| 1.5 | 2026-08-18 | Added DEC-018 through DEC-021 for E1-T5 (S3 Dish thô): pgEnum DB enums, Level 1 normalize-name, refresh()/revalidatePath in Server Actions, and error.tsx retry prop |
| 1.4 | 2026-08-17 | Added DEC-015 through DEC-017 for E1-T2/E1-T3/E1-T4: neon-http batch transaction semantics, canonical timezone storage, and display-only fallback timezone |
| 1.3 | 2026-08-17 | Added DEC-013 for the `next-auth` beta pin and DEC-014 for the `provisionUser` throw-at-boundary behavior in E1-T1 |
| 1.2 | 2026-08-14 | Added DEC-012 for ranking model, implicit preference smoothing, 7-day cooldown, 20% exploration and evidence-only Session Ranking |
| 1.1 | 2026-07-29 | Added DEC-010 for Group Rule / Session Rule structure, snapshot and override semantics |
| 1.1 | 2026-07-29 | Added DEC-011 for finalize validation, warning audit and ranking boundary |
| 1.0 | 2026-07-23 | Initial decision log with DEC-001 through DEC-009 |


