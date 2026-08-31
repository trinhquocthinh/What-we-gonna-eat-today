# 🏗️ Tech Spec & Architecture — What We Gonna Eat Today

> **Document Metadata**
>
> - **Version:** `1.2` | **Status:** `Approved`
> - **Created:** `2026-08-14` | **Last Updated:** `2026-08-14`
> - **Upstream:** [SDD](what-we-gonna-eat-today_sdd_v1.3.md) • [Diagrams](what-we-gonna-eat-today_diagrams_v1.1.md) • [PRD](what-we-gonna-eat-today_prd_v1.5.md) • [Business Rules](what-we-gonna-eat-today_business-rules_v1.7.md) • [Ranking Spec](what-we-gonna-eat-today_ranking-specification_v1.3.md)
> - **Downstream:** [Master Plan](what-we-gonna-eat-today_master-plan_v2.1.md) • [Test Cases](what-we-gonna-eat-today_test-cases-specification_v1.1.md) • [Setup & Ops Guide](what-we-gonna-eat-today_setup-and-ops-guide_v1.2.md)
>
> 📌 *Tài liệu đặc tả kiến trúc kỹ thuật, ranh giới tầng, mô hình dữ liệu, cơ chế API và cổng chất lượng cho 17 tính năng cốt lõi của phiên bản v1.0.*

---

## 📑 Mục lục (Table of Contents)

1. [Ngăn xếp công nghệ (Tech Stack)](#1-ngăn-xếp-công-nghệ-tech-stack)
2. [Kiến trúc & Ranh giới tầng (Architecture & Boundaries)](#2-kiến-trúc--ranh-giới-tầng-architecture--boundaries)
3. [Mô hình dữ liệu (Database Schema)](#3-mô-hình-dữ-liệu-database-schema)
4. [Thiết kế API & Giao thức (API Design)](#4-thiết-kế-api--giao-thức-api-design)
5. [Xác thực & Phân quyền (Auth & Authorization)](#5-xác-thực--phân-quyền-auth--authorization)
6. [Môi trường & Triển khai (Deployment & Environments)](#6-môi-trường--triển-khai-deployment--environments)
7. [Ước tính chi phí (Cost Estimation)](#7-ước-tính-chi-phí-cost-estimation)
8. [Cổng chất lượng & Kỷ luật kiểm thử (Quality Gates)](#8-cổng-chất-lượng--kỷ-luật-kiểm-thử-quality-gates)
9. [Bảng rủi ro kỹ thuật (Technical Risks)](#9-bảng-rủi-ro-kỹ-thuật-technical-risks)
10. [Lịch sử thay đổi (Change History)](#10-lịch-sử-thay-đổi-change-history)

---

# 1. Ngăn xếp công nghệ (Tech Stack)

| Hạng mục | Lựa chọn | Lý do quyết định | Chi phí | Lựa chọn đã cân nhắc |
| :--- | :--- | :--- | :---: | :--- |
| **Package Manager** | `yarn Berry` (v4) qua `corepack` | Baseline chuẩn hóa môi trường | 0 ₫ | `pnpm` |
| **Framework** | `Next.js App Router` + `TypeScript Strict` | Fullstack trong 1 repo, tối ưu cho Vercel | 0 ₫ | `Remix`, `SvelteKit` |
| **Hosting** | `Vercel Hobby` | Triển khai nhanh, preview deployment tự động | 0 ₫ | `Cloudflare Pages`, `Netlify` |
| **Database** | `Neon Postgres Serverless` (Free) | Hỗ trợ DB branching và Partial Unique Index | 0 ₫ | `Supabase`, `Turso` |
| **ORM** | `Drizzle ORM` | Bundle siêu nhẹ cho serverless, SQL migration minh bạch | 0 ₫ | `Prisma` |
| **Authentication** | `Auth.js` (Google OAuth) | Đơn giản, gia đình đều có sẵn tài khoản Google | 0 ₫ | `Magic link`, `Clerk` |
| **Testing** | `Vitest` + `Testing Library` | Khởi động nhanh, cấu hình tối giản, tương thích TS | 0 ₫ | `Jest` |
| **CI / Automation** | `GitHub Actions` | Miễn phí cho public repository | 0 ₫ | `GitLab CI` |

### 1.1 Những điều đã chấp nhận đánh đổi (Trade-offs)

> [!NOTE]
> Mọi lựa chọn công nghệ đều đi kèm chi phí cơ hội:
>
> - **Vercel Hobby:** Giới hạn sử dụng phi thương mại; cronjob tối đa 1 lần/ngày.
> - **Neon Free:** Compute tự ngủ sau 5 phút idle; request đầu tiên chịu cold start (0.5 – 2.0s).
> - **Drizzle thay Prisma:** Chấp nhận hệ sinh thái công cụ nhỏ hơn để đổi lấy bundle size nhẹ và SQL migration dễ đọc.
> - **Google OAuth:** Chỉ hỗ trợ tài khoản Google (phù hợp với quy mô gia đình).
> - **TypeScript Strict:** Chấp nhận đầu tư viết type chặt chẽ lúc đầu để chống lỗi schema âm thầm về sau.

---

# 2. Kiến trúc & Ranh giới tầng (Architecture & Boundaries)

## 2.1 Cấu trúc thư mục (Feature-First)

```text
src/
├── features/
│   ├── auth/             # Xác thực OIDC & phiên đăng nhập
│   ├── group/            # Quản lý nhóm, thành viên & link mời
│   ├── dish/             # Global Dish Catalog, Group Dish Pool, System Tags
│   ├── rule/             # Group Rules & Session Rule Snapshot
│   ├── session/          # Vòng đời phiên chọn món & danh sách Participant
│   ├── selection/        # Candidate Deck, tương tác Swipe & Session Ranking
│   ├── meal/             # Final Meal composition & Finalize validation
│   └── history/          # Eating History & Recency Penalty
├── shared/               # Kiểu dữ liệu chung, tiện ích, DB client, UI primitives
└── app/                  # Next.js App Router (chỉ làm nhiệm vụ lắp ráp và route guard)
```

## 2.2 Quy tắc phụ thuộc nghiêm ngặt (Dependency Rule)

```text
presentation ──► application ──► domain
                      ▲
infrastructure ───────┘
```

> [!IMPORTANT]
> **Ranh giới bất biến:**
>
> - `domain/` là hàm thuần túy: **KHÔNG** import React, **KHÔNG** import Drizzle, **KHÔNG** đọc `process.env`, **KHÔNG** import feature khác.
> - `application/` định nghĩa ports dưới dạng interface; `infrastructure/` hiện thực hóa các ports đó.
> - `app/` chỉ làm nhiệm vụ lắp ráp (composition root), không chứa business logic.

Ranh giới này được kiểm soát tự động bởi ESLint (`import/no-restricted-paths`):

```javascript
// eslint.config.mjs — trích đoạn cấu hình
'import/no-restricted-paths': ['error', {
  zones: [
    { target: './src/features/*/domain', from: './src/features/*/application' },
    { target: './src/features/*/domain', from: './src/features/*/infrastructure' },
    { target: './src/features/*/domain', from: './src/features/*/presentation' },
    { target: './src/features/*/application', from: './src/features/*/presentation' },
    { target: './src/features/*/domain', from: './node_modules/react' },
  ]
}]
```

## 2.3 Quan hệ phụ thuộc giữa các Feature

Chỉ có đúng **7 chiều quan hệ** được phép (tất cả đều đi qua Application Port hoặc unexecuted statement builder, không import chéo Domain):

```text
selection ────► history    (Lấy dữ liệu tính Recency Penalty)
selection ────► dish       (Lấy tập món hợp lệ của nhóm)
selection ────► preference (Lấy sở thích cá nhân E và lọc cứng Cannot Eat — DEC-060)
meal      ────► rule       (Thực thi Rule Validation khi finalize)
meal      ────► history    (Tự động sinh Default Eating History)
meal      ────► preference (Ngoại lệ BR-056 cho lịch sử ăn khi finalize — DEC-060)
session   ────► rule       (Dựng BatchItem snapshot Group Rule sang Session Rule lúc Start — DEC-043)
```

*(Mọi chiều import chéo khác đều bị cấm hoàn toàn).*

## 2.4 Vị trí của logic Ranking

Tại `src/features/selection/domain/ranking.ts`:

```typescript
export function computePersonalScore(input: RankingInput, config: RankingConfig): number;
export function buildDeck(eligible: DishRankingInput[], config: RankingConfig): string[];
export function computeSessionScore(evidence: SessionEvidence, config: RankingConfig): number;
```

> [!TIP]
> `RankingConfig` được tập trung tại **một module hằng số duy nhất**. Các hàm trong `domain/` có độ bao phủ test (coverage) cao nhất và không sử dụng bất kỳ mock nào.

---

# 3. Mô hình dữ liệu (Database Schema)

Cơ sở dữ liệu: **PostgreSQL**. Sử dụng **UUID v7** cho khóa chính, `timestamptz` cho mốc thời gian và `date` cho ngày lịch.

## 3.1 Cấu trúc các bảng

```sql
users(id, provider, provider_subject, email, display_name, created_at)
  unique(provider, provider_subject)

groups(id, name, timezone, created_at)

group_members(id, group_id, user_id, is_admin, joined_at, removed_at)
  unique(group_id, user_id)

group_invites(id, group_id, token_hash, expires_at, used_at, used_by_user_id, created_at)
  unique(token_hash)

global_dishes(id, name, normalized_name, created_by_user_id, created_from_group_id, created_at)
  index(normalized_name)

group_dishes(id, group_id, global_dish_id, state, created_at)
  unique(group_id, global_dish_id)

group_dish_tags(group_dish_id, system_tag)
  primary key(group_dish_id, system_tag)

group_rules(id, group_id, system_tag, minimum_count, rule_type, overridable)
  unique(group_id, rule_type, system_tag)
  check(minimum_count >= 1)

selection_sessions(id, group_id, decision_date, creator_user_id, state, created_at, started_at, finalized_at)

session_rules(session_id, rule_type, system_tag, minimum_count)
  primary key(session_id, rule_type, system_tag)
  check(minimum_count >= 1)

participants(id, session_id, user_id, state, joined_at)
  unique(session_id, user_id)

interactions(id, session_id, participant_id, group_dish_id, type, updated_at)
  unique(session_id, participant_id, group_dish_id)

interaction_events(id, session_id, participant_id, group_dish_id, action, created_at)

session_decks(session_id, user_id, ordered_dish_ids jsonb, created_at)
  primary key(session_id, user_id)

final_meals(id, session_id, created_at)
  unique(session_id)

final_meal_items(final_meal_id, group_dish_id)
  primary key(final_meal_id, group_dish_id)

eating_history(id, user_id, global_dish_id, eating_date, source_final_meal_id, created_at)
  unique(user_id, global_dish_id, eating_date, source_final_meal_id)
```

## 3.2 Ba quyết định thiết kế quan trọng

1. **Ràng buộc duy nhất của Session được ép ở tầng DB ([BR-025](what-we-gonna-eat-today_business-rules_v1.7.md)):**

   ```sql
   CREATE UNIQUE INDEX selection_sessions_active_per_group_date
     ON selection_sessions(group_id, decision_date)
     WHERE state IN ('ACTIVE', 'FINALIZED');
   ```

   *Ngăn chặn hoàn toàn race-condition khi hai thành viên cùng bấm mở phiên một lúc.*

2. **Tách biệt `interactions` (Effective State) và `interaction_events` (Append-only Audit Log):**
   *Bảng `interactions` phục vụ tính điểm Ranking nhanh gọn; bảng events lưu vết đầy đủ lịch sử thao tác.*

3. **`eating_history` liên kết tới `global_dish_id` (không phải `group_dish_id`):**
   *Lịch sử ăn uống thuộc về cá nhân User, sẵn sàng cho tính năng một User tham gia nhiều nhóm (`F43`) trong tương lai.*

## 3.3 Danh mục Database Index trọng yếu

| Tên Index | Mục đích phục vụ |
| :--- | :--- |
| `eating_history(user_id, global_dish_id, eating_date DESC)` | Tính toán Recency Penalty khi dựng Candidate Deck |
| `interactions(session_id)` | Tổng hợp bảng điểm Session Ranking |
| `group_dishes(group_id, state)` | Lọc danh sách món hợp lệ của nhóm |
| `selection_sessions(group_id, decision_date)` | Kiểm tra sự tồn tại của phiên trong ngày |

---

# 4. Thiết kế API & Giao thức (API Design)

## 4.1 Phân bổ cơ chế giao tiếp

- **Server Actions:** Dùng cho hầu hết các thao tác mutation (Tạo nhóm, mở phiên, thêm món, chốt bữa). Đơn giản, an toàn kiểu dữ liệu end-to-end.
- **Route Handler riêng (`POST /api/sessions/:id/interactions`):** Dùng riêng cho thao tác vuốt thẻ (Swipe).
  > [!NOTE]
  > React Server Actions mặc định thực thi tuần tự (serialise). Người dùng vuốt 10 thẻ trong 5 giây sẽ tạo hàng đợi nghẽn mạng. Route Handler cho phép gửi song song với Optimistic UI, đạt độ trễ phản hồi $< 100\text{ms}$ theo [NFR-02](what-we-gonna-eat-today_prd_v1.5.md).

## 4.2 Chuẩn hóa cấu trúc lỗi (Error Handling)

Tất cả thất bại nghiệp vụ đều trả về dạng dữ liệu chuẩn ([SDD §2.5](what-we-gonna-eat-today_sdd_v1.3.md)):

```typescript
type Failure = {
  code: ErrorCode;
  details?: Record<string, unknown>; // Vd: { missingTag: 'SOUP', requiredCount: 1 }
};
```

Không ném Exception qua ranh giới tầng: `application/` trả về `Result<T, Failure>`, `presentation/` tra cứu bảng mã để hiển thị thông báo tiếng Việt tương ứng.

---

# 5. Xác thực & Phân quyền (Auth & Authorization)

- **Auth.js:** Xác thực Google OAuth, quản lý phiên qua Cookie JWT thời hạn 30 ngày.
- **Khóa định danh người dùng:** `provider + provider_subject` (không dùng email làm khóa chính).
- **Phân quyền trong nhóm (RBAC tối giản):** `Member` và `Group Admin`.
- **Authorization Guard ([SPEC-019](what-we-gonna-eat-today_sdd_v1.3.md)):** Mọi Server Action và Route Handler bắt buộc gọi `assertGroupAccess(userId, groupId, role)` trước khi gọi use case.
- **Không sử dụng Postgres RLS:** Kiểm soát quyền tại Application Layer để giữ kiến trúc đơn giản và nhất quán.

---

# 6. Môi trường & Triển khai (Deployment & Environments)

| Môi trường | Nhánh Git | Neon Database Branch | Vercel Deployment |
| :--- | :--- | :--- | :--- |
| **Production** | `main` | Branch `main` | Production URL |
| **Preview** | Pull Request | Branch tách từ `main` (Copy-on-write) | Preview URL độc lập |
| **Local Dev** | Local branch | Branch `dev` | `http://localhost:3000` |

---

# 7. Ước tính chi phí (Cost Estimation)

| Dịch vụ | Gói | Hạn mức Free Tier | Mức sử dụng dự kiến | Trạng thái chi phí |
| :--- | :---: | :--- | :--- | :---: |
| **Vercel** | Hobby | 100 GB Transfer, 1M Edge Requests | $< 1\%$ dung lượng | **0 ₫** |
| **Neon Postgres** | Free | 100 CU-hours/tháng, 0.5 GB Storage | $\approx 5\text{ CU-hours}$, $< 50\text{ MB}$ | **0 ₫** |
| **Auth.js** | OSS | Tự host trong mã nguồn | Không giới hạn | **0 ₫** |
| **GitHub Actions** | Free | Public repo miễn phí | Vài phút / PR | **0 ₫** |
| | | | **TỔNG CHI PHÍ HẰNG THÁNG** | **0 ₫ / tháng** |

---

# 8. Cổng chất lượng & Kỷ luật kiểm thử (Quality Gates)

## 8.1 Bộ công cụ kiểm soát chất lượng (`yarn verify`)

```text
yarn verify ──► tsc --noEmit (Kiểm tra kiểu dữ liệu)
            ──► eslint (Linting & Luật ranh giới tầng kiến trúc)
            ──► prettier (Định dạng mã nguồn chuẩn)
            ──► jscpd (Phát hiện trùng lặp mã: threshold 3%)
            ──► knip (Phát hiện file, export, dependency thừa)
            ──► vitest (Bộ kiểm thử tự động)
```

## 8.2 Ngưỡng bao phủ kiểm thử (Test Coverage Targets)

| Tầng kiến trúc | Loại kiểm thử | Ngưỡng Coverage cam kết |
| :--- | :--- | :---: |
| `domain/` | Unit test thuần túy (Tuyệt đối không mock) | **$\ge 80\%$** |
| `application/` | Unit test với Port mocks | **$\ge 80\%$** |
| `infrastructure/` | Integration test với test DB | Không đặt ngưỡng cứng |
| `presentation/` | Component & User Interaction test | Không đặt ngưỡng cứng |

---

# 9. Bảng rủi ro kỹ thuật (Technical Risks)

| Mã | Rủi ro kỹ thuật | Mức độ | Phương án phòng ngừa & Xử lý |
| :---: | :--- | :---: | :--- |
| `R-01` | Neon cold start (0.5–2s) sau 5 phút ngủ ảnh hưởng [NFR-01](what-we-gonna-eat-today_prd_v1.5.md) | **Cao** | Render vỏ shell tĩnh trước, stream dữ liệu sau; đo số liệu thực tế trước khi tối ưu sâu |
| `R-02` | Deck trong `session_decks` lệch khi Admin gỡ Dish giữa phiên | **Trung bình** | Lọc lại theo `group_dishes.state` lúc đọc trang thay vì tin tưởng tuyệt đối vào deck lưu |
| `R-03` | Race condition khi 2 người cùng Start phiên | **Trung bình** | Ép khóa `Partial Unique Index` tại Postgres; bắt mã lỗi trả `ERR_SESSION_EXISTS_TODAY` |
| `R-04` | Vuốt thẻ quá nhanh gây ghi đè sai thứ tự | **Trung bình** | Upsert theo `updated_at` phía server; bỏ qua bản ghi có timestamp cũ hơn |
| `R-05` | Chưa có `Cannot Eat` ở v1.0 gây sai lệch lịch sử ăn | **Trung bình** | Đã định lượng trong kế hoạch; ưu tiên tính năng `F15` lên đầu phiên bản v1.1 |

---

# 10. Lịch sử thay đổi (Change History)

| Version | Ngày | Phần tác động | Nội dung thay đổi | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- | :--- |
| `0.2` | 2026-08-14 | §3 Schema | Đổi tên `sessions` thành `selection_sessions`; loại bỏ `invalid_reason` ở v1.0 | [Diagrams §3.2](what-we-gonna-eat-today_diagrams_v1.1.md) |
| `0.1` | 2026-08-14 | Toàn bộ | Bản thảo Tech Spec đầu tiên; xác minh hạn mức Free Tier | Khởi tạo baseline kiến trúc |
