# 🍽️ Master Plan v2 — What We Gonna Eat Today

> **Định vị:** Personalized Dish Recommendation + Group Decision Support (Decision Support System, KHÔNG tự động lên thực đơn thay con người).
>
> **Stack:** React + Vite + TypeScript · Tailwind CSS + shadcn/ui · TanStack Query + Zustand · Supabase (Postgres + Auth + Realtime + **Edge Functions**) · Vercel · GitHub Actions · Vitest + RTL + Playwright + pgTAP · PWA · Sentry.
>
> **Design Pattern:** Clean Architecture (feature-based) — tổ chức code theo feature, mỗi feature tách lớp domain / application / infrastructure / presentation.
>
> **Nguồn:** Business Rules v1.2 · Problem Definition v1.1 · Tech Spec (Free-Tier $0 Stack).

---

## 0. Architecture Decision Records (ADR)

| #     | Quyết định                                                                                                                   | Lý do                                              |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| ADR-1 | **Supabase Edge Functions (Deno)** cho toàn bộ business logic phức tạp                                                       | Sát DB, dùng service role gọn, latency thấp        |
| ADR-2 | Ranking tổng hợp vote thuần → **Postgres RPC/View**; Edge Function chỉ cho Suitability Score / cold-start / merge / warnings | Query aggregate nhanh & transactional hơn          |
| ADR-3 | **Duplicate detection + Merge trong MVP** (dùng `pg_trgm`)                                                                   | Cần cho demo                                       |
| ADR-4 | **RLS = access control only**; personalization (Cannot Eat / Blacklist) lọc ở **RPC query layer**                            | Đúng bản chất; không rò rỉ candidate của user khác |
| ADR-5 | Session expiration bằng **pg_cron** (fallback: Scheduled Edge Function)                                                      | $0, chạy trong DB                                  |
| ADR-6 | `Cannot Eat` = _dietary exclusion_, **KHÔNG** phải allergy safety                                                            | Theo Business Rules 11.1 (allergy = out of scope)  |

---

## 1. Data Model / ERD đầy đủ

> Thiết kế **toàn bộ** ngay Phase 1 để tránh rework giữa chừng. Nhóm theo domain.

### 1.1 Identity & Group

- **`users`** _(mở rộng từ `auth.users`)_ — `id`, `display_name`, `avatar_url`, `default_timezone`.
- **`groups`** — `id`, `name`, `timezone`, `created_by`, `created_at`.
- **`group_members`** — `group_id`, `user_id`, `role` (`admin` / `member`), `joined_at`. _(PK kép)_
- **`group_invitations`** — `id`, `group_id`, `invited_email` / `invite_code`, `status`, `invited_by`, `expires_at`.

### 1.2 Dish & Tags (Global vs Group)

- **`global_dishes`** — `id`, `canonical_name`, `is_active`, `destination_identity_id` (nullable, cho merge), `search_vector` / `name_trgm`. _(BR 1.1, 1.2)_
- **`group_dishes`** — `id`, `group_id`, `global_dish_id`, `is_removed`, `removed_at`, group-specific metadata (`note`, ...). _(BR 2)_
- **`system_tags`** — `id`, `name` (Main / Side / Soup / Staple / Dessert ...).
- **`descriptive_tags`** — `id`, `group_id`, `name`.
- **`global_dish_system_tags`** — default tags (`global_dish_id`, `system_tag_id`). _(BR 1.3 — default)_
- **`group_dish_system_tags`** — **override layer dạng diff** (`group_dish_id`, `system_tag_id`, `action` = `add` / `remove`). Không phải replace toàn bộ: effective tags = (default tags − các row `remove`) ∪ (các row `add`). Row `remove` = _tombstone_ để xóa một default tag chỉ trong group đó. **UNIQUE(`group_dish_id`, `system_tag_id`)**. _(BR 1.3 — override không ảnh hưởng group khác)_
- **`group_dish_descriptive_tags`** — (`group_dish_id`, `descriptive_tag_id`).

### 1.3 Purchase Source _(BR 9)_

- **`global_purchase_sources`** — `id`, `name`, `is_active`, `destination_identity_id`.
- **`group_purchase_sources`** — `id`, `group_id`, `global_purchase_source_id`, metadata.
- **`dish_purchase_sources`** — link (`group_dish_id`, `group_purchase_source_id`).

### 1.4 Rules _(BR 4, 5)_

- **`group_rules`** — `group_id`, `desired_dish_count`, `required_system_tags` (jsonb), `preferred_system_tags` (jsonb), `overridable_flags` (jsonb).
- **`session_rules`** — `session_id`, các trường tương tự + `is_required` / `is_preferred`; prefill từ `group_rules`.

### 1.5 Session & Interaction _(BR 6, 7, 8, 13)_

- **`sessions`** — `id`, `group_id`, `decision_date` (theo group tz), `creator_id`, `status` (`active` / `finalized` / `invalid_timeout`), `chef_mode_enabled`, `deadline_at`, `created_at`. **UNIQUE(`group_id`, `decision_date`)**. _(BR 6, 22.1)_
- **`session_participants`** — `session_id`, `user_id`, `is_active`, `joined_at`, `removed_at`. _(BR 7)_
- **`session_chefs`** — `session_id`, `user_id`. _Locked khi session start._ _(BR 8)_
- **`cooking_capabilities`** — `user_id`, `global_dish_id`, `can_cook` (**nullable boolean, 3 trạng thái**: `true` = xác nhận nấu được / `false` = xác nhận KHÔNG nấu được / `NULL` hoặc thiếu row = **Unknown**, chưa biết). Mặc định khi chưa tương tác = Unknown; ranking coi Unknown khác với `false` (chỉ trừ điểm khi `false` rõ ràng). _(BR 8 — khả năng nấu thuộc về User)_
- **`session_interactions`** — `id`, `session_id`, `user_id`, `group_dish_id`, `type` (`swipe_right` / `swipe_left` — **chỉ 2 giá trị, không có `neutral`**), `created_at`, **`is_counted`** (cờ validity: false nếu participant removed / session invalid / dish removed). **UNIQUE(`session_id`, `user_id`, `group_dish_id`)** (upsert). **Un-swipe (rút lại quyết định) = `DELETE` hẳn row** → absence = chưa quyết định; không dùng giá trị `none`/`neutral`. _(BR 13, 21, 22.5)_

### 1.6 Persistent User Signals _(BR 11, 12)_

- **`user_dietary_restrictions`** (Cannot Eat) — `user_id`, `global_dish_id`. _(BR 11.1)_
- **`user_blacklist`** — `user_id`, `global_dish_id`. _(BR 11.2)_
- **`user_dish_whitelist`** — whitelist theo **Dish** (`user_id`, `global_dish_id`). FK chặt tới `global_dishes`. _(BR 11.3)_
- **`user_tag_whitelist`** — whitelist theo **Tag** (`user_id`, `system_tag_id`). FK chặt tới `system_tags`. _(BR 11.3)_
  > **Quyết định:** tách **2 bảng riêng** thay vì 1 bảng 2 cột nullable + CHECK — để giữ FK integrity chặt nhất, index gọn, tránh row nửa-nullable mơ hồ.
- **`user_explicit_preferences`** — `user_id`, `global_dish_id`, `value` (`like` / `dislike` / `neutral`). _(BR 12.1)_
- **`user_implicit_preferences`** — `user_id`, `global_dish_id`, `score`, `updated_at`, `is_reset`. _(BR 12.2)_

### 1.7 Final Meal & History _(BR 16, 19, 20)_

- **`final_meals`** — `id`, `group_id`, `decision_date`, `session_id`, `finalized_by`, `finalized_at`. **UNIQUE(`group_id`, `decision_date`)**.
- **`final_meal_items`** — `final_meal_id`, `group_dish_id`. **UNIQUE(`final_meal_id`, `group_dish_id`)** (mỗi món 1 lần). _(BR 16, 22.2)_
- **`final_meal_history`** — audit các lần chỉnh Final Meal. _(BR 20)_
- **`eating_history`** — `user_id`, `global_dish_id`, `eaten_date`, `source` (`default` / `correction`), `group_id`. **Authority: `correction` > `default`.** Hàm `correct_final_meal` (Creator) **bắt buộc SKIP** mọi row có `source = correction` của bất kỳ user trong ngày đó — không được ghi đè để bảo vệ Personal Correction. **UNIQUE(`user_id`, `global_dish_id`, `eaten_date`)**. _(BR 19, 20, 22.6)_

**Invariants cứng (DB constraints / triggers):** BR 22.1–22.7 — 1 session & 1 final meal / (group, date); món trong final meal thuộc group pool tại thời điểm finalize; món bị remove khỏi pool loại khỏi ranking nhưng giữ audit.

---

## 2. Roadmap chi tiết (9 tuần)

### 🧱 Phase 0 — Foundation & DevEx _(Tuần 1)_

1. Khởi tạo repo: **React + Vite + TypeScript** (SPA). Áp dụng **Clean Architecture (feature-based)**: `src/features/<feature>/{domain,application,infrastructure,presentation}` + shared `src/{components,hooks,lib,types,tests}`.
2. Cài **Tailwind CSS + shadcn/ui**, thiết lập theme + design tokens.
3. **Code quality:** `eslint` + `prettier` + `husky` + `lint-staged` → `.husky/pre-commit` chạy lint + `vitest related --run` trên file staged.
4. **Testing framework:** `Vitest` + `@testing-library/react` + `jsdom`; `Playwright` cho E2E; `pgTAP` cho DB.
5. **Supabase local dev:** `supabase init` + Docker local + migrations + seed file (skeleton).
6. **CI/CD:** GitHub Actions (lint → typecheck → unit test → build) + **Vercel Git Integration**: merge vào branch `main` → **tự động deploy production** lên Vercel; mỗi PR → preview deploy tự động.
7. Viết ADR-1..6 vào `docs/adr/`.

**Deliverable:** repo build được, CI xanh, deploy preview chạy, pre-commit chặn code lỗi.

### 🗄️ Phase 1 — ERD, Constraints & RLS _(Tuần 2–3)_

1. Viết migrations tạo **toàn bộ bảng mục 1** (chia file theo domain).
2. Bật extension `pg_trgm`, tạo index trigram trên `global_dishes.canonical_name` cho duplicate detection.
3. Unique constraints + FK + check constraints (invariants 22.x).
4. **RLS policies (access only):** member chỉ đọc/ghi dữ liệu group mình; `global_dishes` đọc chung; admin-only cho remove group dish & chỉnh system tag. _(BR 3)_
5. **RPC skeleton** (chưa logic): `get_personalized_candidates`, `get_session_ranking`, `finalize_meal`.
6. **pgTAP tests:** phủ RLS (member vs non-member vs admin) + constraint (double session / final meal, duplicate final meal item).
7. Seed cold-start dishes (20–30 món phổ biến + system tags).

**Deliverable:** DB schema đầy đủ, RLS test xanh, seed chạy.

### 🔐 Phase 2 — Auth, Membership & CRUD _(Tuần 4)_

1. **Supabase Auth** (Google + Email/Password) → JWT.
2. **Group membership flow:** tạo group, mời qua invite code, join, phân quyền admin/member.
3. **TanStack Query + Zustand:** setup query client, auth store, group context store.
4. **CRUD qua PostgREST:** tạo/sửa group, thêm dish vào pool (kèm gọi duplicate check), quản lý tags, set explicit preference, Cannot Eat, Blacklist, Whitelist.
5. **Testing:** mỗi data hook (`useGroupDishes`, `useAddDish`, `useCannotEat`...) có unit test mock `loading / error / success`.

### 🔎 Phase 2.5 — Global Dish Duplicate & Merge _(Tuần 5, đầu tuần)_ — **MVP**

1. **Edge Function `dish-duplicate-check`:** nhận tên món → trả candidate trùng (`pg_trgm` similarity). _(BR 1.1)_
2. UI: khi thêm món, hiện gợi ý "món này đã tồn tại?" → chọn dish cũ **hoặc** xác nhận tạo mới.
3. **Edge Function `merge-global-dish`** (admin / quy trình riêng): set `destination_identity_id`, mark inactive, chuyển group reference, hợp nhất historical reference, **giữ group-specific metadata**. _(BR 1.2)_
4. **Testing:** unit test similarity threshold; integration test merge giữ nguyên metadata + reference.

### 🗳️ Phase 3 — Selection Session & Real-time Voting _(Tuần 5–6)_

1. **Tạo Session** theo Decision Date (group tz) — chặn nếu đã có session/ngày (unique). Prefill Session Rule từ Group Rule. Bật/tắt Chef Mode + khóa chef list. _(BR 6, 8)_
2. **Personalized Candidate qua RPC `get_personalized_candidates`:** từ Group Dish Pool, **loại Cannot Eat + Blacklist ở query layer**, sort theo explicit/implicit preference, eating-history cooldown, chef context, purchase source. _(BR 10, 14 — KHÔNG dùng RLS để lọc)_
3. **Supabase Realtime (WebSocket):** subscribe kênh session; broadcast interaction + ranking update tới participant & creator.
4. **Swipe Right/Left** → upsert `session_interactions` (optimistic UI). Dish Card hiển thị group context ("1 participant Cannot Eat món này"). _(BR 10, 13)_
5. **Participant lifecycle:** creator add/remove participant khi Active; cập nhật `is_counted` + statistics real-time. _(BR 7)_
6. **Testing:** integration test tạo session + lọc candidate theo hard constraint; E2E swipe 2-client; test participant remove → interaction ngừng đếm.

### ⚙️ Phase 4 — Edge Functions & Business Logic _(Tuần 7)_

1. **Session Ranking** (`get_session_ranking` RPC/view + Edge cho phần nặng): đếm đề xuất / từ chối / Cannot Eat / đã ăn gần đây, conflict với Session Rule, trừ điểm nếu Chef không nấu được (khi Chef Mode), cộng implicit preference, segment theo System Tag. _(BR 15)_
2. **Edge Function `compute-suitability-score`** — thuật toán chính (weights: explicit, implicit, history cooldown, chef, purchase source). _(BR 14)_
3. **Cold-start** đã seed ở Phase 1; Edge Function `seed-group-pool` inject 20–30 món khi tạo group.
4. **Rule validation Edge Function `validate-final-meal`:** Required rule validate trên **toàn bộ** Final Meal theo System Tag; Preferred → warning. Warning khi món vi phạm Cannot Eat của participant. _(BR 5, 16, 17, 22.3)_
5. **Testing:** **100% coverage cho hàm thuật toán** (suitability, ranking, date/timezone, rule validation). Pragmatic cho phần còn lại.

### 🏁 Phase 5 — Finalization, Eating History & Expiration _(Tuần 8)_

1. **Finalize Final Meal** (`finalize_meal` RPC): validate Required Rule, đảm bảo món thuộc pool tại thời điểm finalize, mỗi món 1 lần. _(BR 16)_
2. **Eating History authority:** `Authoritative Final Meal → Default Eating History → Personal Correction`. Auto-ghi cho participant hiện tại **trừ** món họ Cannot Eat; participant bị remove không nhận history. _(BR 19, 22.6)_
3. **Final Meal Correction** (`correct_final_meal`): chỉ cập nhật/ghi đè row `source = default`; **bắt buộc SKIP mọi row `source = correction`** của mọi user trong cùng `eaten_date` để bảo vệ authority Personal Correction; giữ audit. _(BR 20, 22.6)_
4. **Session Expiration (pg_cron):** hết deadline / cuối Decision Date → `invalid_timeout`; không tạo history; interaction không dùng cho learning; giữ audit tối thiểu. _(BR 18, 21)_
5. **Testing:** integration test finalize + history authority + Cannot Eat exclusion; test cron đánh dấu timeout đúng theo timezone.

### 📱 Phase 6 — PWA, Observability & UAT _(Tuần 9)_

1. **PWA:** Service Worker + manifest ("Add to Home Screen"), offline shell, cache TanStack Query.
2. **Sentry** (frontend + Edge Functions) + **UptimeRobot**.
3. Product analytics tối thiểu cho invalid/timeout sessions.
4. **UAT** với 1–2 group thật; checklist theo Core Invariants (BR 22).
5. Hardening: rate limit Edge Functions, kiểm tra RLS lần cuối (OWASP: broken access control), audit input validation.

---

## 3. Danh sách Supabase Edge Functions

| Function                          | Nhiệm vụ                             | Phase |
| --------------------------------- | ------------------------------------ | ----- |
| `dish-duplicate-check`            | Fuzzy search món trùng (pg_trgm)     | 2.5   |
| `merge-global-dish`               | Merge identity, giữ metadata         | 2.5   |
| `seed-group-pool`                 | Cold-start inject 20–30 món          | 4     |
| `compute-suitability-score`       | Thuật toán ranking cá nhân           | 4     |
| `validate-final-meal`             | Required / Preferred rule + warnings | 4     |
| _(pg_cron job)_ `expire-sessions` | Timeout theo group timezone          | 5     |

---

## 4. Testing Matrix

| Loại                  | Công cụ            | Phạm vi                                          |
| --------------------- | ------------------ | ------------------------------------------------ |
| Unit (utils / algo)   | Vitest             | Suitability, date/tz, rule validation → **100%** |
| Unit (hooks)          | Vitest + RTL       | loading / error / success mọi data hook          |
| Integration (feature) | Vitest + RTL       | tạo session, vote, finalize, history             |
| DB / RLS              | pgTAP              | access control + invariants                      |
| Edge Functions        | Deno test / Vitest | duplicate, merge, ranking, validate              |
| E2E                   | Playwright         | swipe 2-client, realtime, finalize flow          |

---

## 5. Rủi ro & Giảm thiểu

| Rủi ro                        | Giảm thiểu                            |
| ----------------------------- | ------------------------------------- |
| ERD phức tạp → rework         | Thiết kế đầy đủ ngay Phase 1          |
| Nhầm RLS làm personalization  | ADR-4: personalization ở RPC layer    |
| Timezone bug (Decision Date)  | Chuẩn hóa group tz + test cron        |
| Realtime 200 conn free tier   | Đủ MVP; theo dõi qua analytics        |
| Merge làm hỏng reference      | Audit + integration test giữ metadata |
| "100% coverage" phản tác dụng | Chỉ bắt buộc cho critical algorithm   |

---

## 6. Scope Boundaries _(bám Problem Definition §11)_

**Không làm trong MVP:** Surprise Me · Automatic Dish Selection · Automatic Meal Candidate Generation · Meal planning tương lai · Phân món theo bữa · Inventory nguyên liệu · Nutrition optimization · Allergy safety management · Recipe management · Delivery ordering · Real-time restaurant availability · Dish compatibility phức tạp · Tự động quyết định thay Creator.
