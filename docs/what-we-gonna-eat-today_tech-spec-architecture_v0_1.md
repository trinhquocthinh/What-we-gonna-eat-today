# Tech Spec & Architecture — What We Gonna Eat Today

## Version 0.2

**Status:** Draft — Awaiting review
**Created:** 2026-08-14
**Last Updated:** 2026-08-14
**Upstream:** SDD v0.2, Diagrams v0.1, PRD v0.4, Business Rules v1.6, Ranking Specification v0.2
**Downstream:** Diagrams, Test Cases Specification, Setup & Ops Guide, Master Plan

Phạm vi: 17 tính năng của v1.0 (SDD §1.1). Hạn mức free tier được xác minh ngày 2026-08-14, không chép từ trí nhớ.

---

# 1. Tech stack

| Hạng mục | Lựa chọn | Vì sao | Chi phí | Đã cân nhắc |
|---|---|---|---|---|
| Package manager | yarn Berry qua corepack | Baseline bắt buộc | 0 | pnpm |
| Framework | Next.js App Router + TypeScript strict | Fullstack một repo, khớp Vercel | 0 | Remix, SvelteKit |
| Hosting | Vercel Hobby | Mặc định baseline; không có lý do rời | 0 | Cloudflare Pages, Netlify |
| Database | Neon Postgres Free | Vercel không có DB bền vững; Postgres cho partial unique index | 0 | Supabase, Turso |
| ORM | Drizzle | Migration bằng SQL đọc được, bundle nhỏ hợp serverless | 0 | Prisma |
| Auth | Auth.js, chỉ Google | Dưới 10 user, mọi người đều có sẵn tài khoản Google | 0 | Magic link, Clerk |
| Test | Vitest + Testing Library | Nhanh, cấu hình ít | 0 | Jest |
| E2E | Không có ở v1.0 | Chỉ một luồng quan trọng, chưa đáng chi phí bảo trì | 0 | Playwright |
| CI | GitHub Actions | Free cho repo public | 0 | — |

## 1.1 Từ bỏ điều gì

Không lựa chọn nào miễn phí. Ghi rõ cái giá của từng cái:

- **Vercel Hobby** — từ bỏ quyền thương mại hoá. Điều khoản Hobby giới hạn dùng cá nhân, phi thương mại. Ngày dự án này thu tiền, dù một đồng, là ngày phải lên Pro. Cũng từ bỏ cron dày hơn một lần mỗi ngày, xem §6.3.
- **Neon Free** — từ bỏ độ trễ ổn định. Compute tự ngủ sau 5 phút không hoạt động, và request đầu tiên sau đó chịu cold start. Xem rủi ro R-01.
- **Drizzle thay Prisma** — từ bỏ hệ sinh thái công cụ lớn hơn và Prisma Studio. Đổi lại là bundle nhỏ và migration là SQL thuần, dễ soi khi lệch schema.
- **Chỉ Google OAuth** — từ bỏ người dùng không có tài khoản Google. Ở quy mô một gia đình, đây là rủi ro có thể kiểm tra trước bằng một câu hỏi.
- **Không Playwright ở v1.0** — từ bỏ mạng lưới an toàn cho luồng swipe trên thiết bị thật. Chấp nhận vì luồng này sẽ được người dùng thật chạy hằng ngày, phản hồi đến rất nhanh.
- **TypeScript strict** — từ bỏ tốc độ viết nhanh lúc đầu để đổi lấy việc đổi schema không âm thầm làm hỏng chỗ khác.

---

# 2. Kiến trúc

## 2.1 Cấu trúc thư mục

```
src/
├── features/
│   ├── auth/
│   ├── group/            # Group, membership, invite
│   ├── dish/             # Global Dish, Group Dish Pool, System Tag
│   ├── rule/             # Group Rule, Session Rule snapshot
│   ├── session/          # Session lifecycle, Participant
│   ├── selection/        # Deck, Interaction, Session Ranking
│   ├── meal/             # Final Meal, finalize validation
│   └── history/          # Eating History, recency penalty
├── shared/               # type, util, ui nguyên thuỷ, db client
└── app/                  # routing Next.js, chỉ lắp ráp
```

Mỗi feature có bốn tầng `domain / application / infrastructure / presentation`.

Chia theo feature trước, theo tầng sau. Một feature phải xoá được mà không làm hỏng feature khác — trừ các phụ thuộc khai báo ở §2.3.

## 2.2 Luật phụ thuộc

```text
presentation → application → domain
infrastructure → application
```

Không mũi tên nào đi ngược.

- `domain/` không import React, không import Drizzle, không đọc `process.env`, không import feature khác.
- `application/` định nghĩa port dưới dạng interface; `infrastructure/` hiện thực chúng.
- `app/` chỉ lắp ráp, không chứa business logic.

Luật này được máy chặn bằng ESLint `import/no-restricted-paths`, không dựa vào kỷ luật cá nhân:

```js
// eslint.config.js — trích
'import/no-restricted-paths': ['error', { zones: [
  { target: './src/features/*/domain',      from: './src/features/*/application' },
  { target: './src/features/*/domain',      from: './src/features/*/infrastructure' },
  { target: './src/features/*/domain',      from: './src/features/*/presentation' },
  { target: './src/features/*/application',  from: './src/features/*/presentation' },
  { target: './src/features/*/domain',      from: './node_modules/react' },
]}]
```

## 2.3 Phụ thuộc giữa các feature

Cho phép đúng bốn chiều, tất cả đi qua application port, không import chéo domain:

```text
selection  → history   (recency penalty)
selection  → dish      (eligible set)
meal       → rule      (finalize validation)
meal       → history   (sinh Default Eating History)
```

Mọi chiều khác bị cấm. Cụ thể `history` không được biết đến `selection`, và `dish` không được biết đến `session`.

## 2.4 Vị trí của logic ranking

`selection/domain/ranking.ts` chứa hàm thuần:

```ts
computePersonalScore(input: RankingInput, config: RankingConfig): number
buildDeck(eligible: DishRankingInput[], config: RankingConfig): string[]
computeSessionScore(evidence: SessionEvidence, config: RankingConfig): number
```

`RankingConfig` được đọc từ một module hằng số duy nhất, không rải rác. Đây là điều kiện để Ranking Specification §5 có ý nghĩa và để F16/F18 gắn vào sau này chỉ là thêm số hạng, không phải viết lại.

Hàm thuần trong `domain/` là nơi coverage phải cao nhất và test không được mock gì.

---

# 3. Mô hình dữ liệu

Postgres. UUID v7 cho khoá chính. `timestamptz` cho thời điểm, `date` cho ngày lịch.

## 3.1 Bảng

```sql
users(id, provider, provider_subject, email, display_name, created_at)
  unique(provider, provider_subject)

groups(id, name, timezone, created_at)

group_members(id, group_id, user_id, is_admin, joined_at, removed_at)
  unique(group_id, user_id)

group_invites(id, group_id, token_hash, expires_at, used_at, used_by_user_id, created_at)
  unique(token_hash)

global_dishes(id, name, normalized_name, created_by_user_id,
              created_from_group_id, created_at)
  index(normalized_name)

group_dishes(id, group_id, global_dish_id, state, created_at)
  unique(group_id, global_dish_id)

group_dish_tags(group_dish_id, system_tag)
  primary key(group_dish_id, system_tag)

group_rules(id, group_id, system_tag, minimum_count, rule_type, overridable)
  unique(group_id, rule_type, system_tag)
  check(minimum_count >= 1)

selection_sessions(id, group_id, decision_date, creator_user_id, state,
                   created_at, started_at, finalized_at)

session_rules(id, session_id, system_tag, minimum_count, rule_type)
  unique(session_id, rule_type, system_tag)
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

eating_history(id, user_id, global_dish_id, eating_date,
               source_final_meal_id, created_at)
  unique(user_id, global_dish_id, eating_date, source_final_meal_id)
```

## 3.2 Ba quyết định đáng giải thích

**Session uniqueness được ép ở tầng DB, không ở tầng application.**

```sql
create unique index selection_sessions_active_per_group_date
  on selection_sessions(group_id, decision_date)
  where state in ('ACTIVE', 'FINALIZED');
```

BR-025 là invariant quan trọng nhất của hệ thống. Kiểm tra bằng `SELECT` rồi `INSERT` ở application có race condition ngay cả với hai người dùng. Partial unique index làm Postgres từ chối, và đây là lý do chính chọn Postgres thay vì một store không có partial index.

**`interactions` là bảng effective state, `interaction_events` là append-only audit.**

Hai bảng tách biệt vì hai mục đích khác nhau. SDD SPEC-012 upsert vào `interactions`, luôn append vào `interaction_events`. Session Ranking chỉ đọc `interactions`. Nếu gộp làm một, mọi truy vấn ranking phải tự tìm bản ghi mới nhất theo timestamp — đắt và dễ sai.

**`eating_history` trỏ tới `global_dish_id`, không phải `group_dish_id`.**

Eating History thuộc về User chứ không thuộc Group (BR-056). Khi F43 multi-group vào, cùng một User ăn cùng một món ở hai Group phải collapse được thành một eating event — chỉ làm được nếu khoá là global dish. Đây là chỗ duy nhất trong schema tôi thiết kế cho tương lai, và lý do là đổi về sau sẽ cần migrate toàn bộ lịch sử.

Cùng nguyên tắc đó loại bỏ cột `invalid_reason`: trạng thái `INVALID` không thể tới được ở v1.0 vì F26 và F41 đều ở v1.2. Giá trị `INVALID` vẫn nằm trong enum `SessionState` để máy trạng thái đầy đủ, nhưng cột lưu lý do thì chưa có gì để lưu.

Hai cột `group_id` và `decision_date` cũng bị bỏ khỏi `final_meals`, vì cả hai suy ra được qua `session_id` và không có ràng buộc nào giữ chúng đồng bộ với `selection_sessions`. Ngược lại `eating_history.eating_date` phải giữ, vì nó là dữ liệu ở cấp User và bị Personal Correction sửa độc lập từ v1.1.

Ngược lại, cột `is_chef` **không** được thêm vào `group_members` dù F33 chắc chắn sẽ cần. Thêm một cột boolean sau này là migration tầm thường. Còn `rule_type` và `overridable` thì có mặt ngay từ v1.0, không phải để dành cho tương lai mà vì unique constraint của BR-012 định nghĩa trên `rule_type + system_tag`; bỏ cột đi thì constraint sai ngay hôm nay.

## 3.3 Index cho đường nóng

| Index | Phục vụ |
|---|---|
| `eating_history(user_id, global_dish_id, eating_date desc)` | SPEC-020 tính recency penalty, gọi một lần cho mỗi Dish khi dựng deck |
| `interactions(session_id)` | SPEC-014 Session Ranking |
| `group_dishes(group_id, state)` | SPEC-010 eligible set |
| `selection_sessions(group_id, decision_date)` | SPEC-007 kiểm tra tồn tại |

Deck của một Group ~30–100 Dish. Không phân trang ở tầng DB; dựng deck một lần rồi lưu `session_decks`, phân trang trong bộ nhớ. Với quy mô này, tối ưu thêm là tối ưu sớm.

---

# 4. Thiết kế API

## 4.1 Hai cơ chế, có lý do

**Server Actions** cho mọi mutation trừ swipe. Đơn giản, không cần viết client fetch, type an toàn từ đầu đến cuối.

**Route Handler** riêng cho swipe:

```
POST /api/sessions/:sessionId/interactions
```

Lý do: React serialise các Server Action liên tiếp. Người dùng vuốt nhanh 10 món trong 5 giây sẽ tạo 10 action xếp hàng, và NFR-02 yêu cầu phản hồi UI dưới 100ms. Route Handler cho phép gửi song song với optimistic update, kèm retry khi mạng chập chờn theo NFR-05.

Đây là chỗ duy nhất lệch khỏi Server Action, và lệch vì một yêu cầu phi chức năng đo được, không vì sở thích.

## 4.2 Danh sách

| Thao tác | Cơ chế | SPEC |
|---|---|---|
| Đăng nhập | Auth.js route | SPEC-001 |
| Tạo Group | Server Action | SPEC-002 |
| Tạo link mời | Server Action | SPEC-003 |
| Tham gia bằng link | Server Action | SPEC-004 |
| Thêm Dish | Server Action | SPEC-005 |
| Gán System Tag | Server Action | SPEC-006 |
| Cấu hình Group Rule | Server Action | SPEC-021 |
| Tạo Session | Server Action | SPEC-007 |
| Start Session | Server Action | SPEC-008, SPEC-022 |
| Thêm Participant | Server Action | SPEC-009 |
| Lấy trang deck | RSC | SPEC-010, SPEC-011 |
| Ghi swipe / undo | `POST /api/sessions/:id/interactions` | SPEC-012 |
| Completed | Server Action | SPEC-013 |
| Session Ranking | RSC | SPEC-014 |
| Lưu Final Meal nháp | Server Action | SPEC-015 |
| Finalize | Server Action | SPEC-016, SPEC-017 |

## 4.3 Hình dạng lỗi

Mọi thất bại trả về cùng một hình dạng, dùng đúng mã trong SDD §2.5:

```ts
type Failure = {
  code: ErrorCode
  details?: Record<string, unknown>  // ví dụ: rule chưa đạt, userId không hợp lệ
}
```

Không ném exception qua ranh giới tầng. `application/` trả `Result<T, Failure>`; `presentation/` dịch `code` sang thông điệp tiếng Việt bằng một bảng tra duy nhất.

---

# 5. Xác thực và phân quyền

- Auth.js, chỉ Google provider. Session lưu dạng cookie JWT, hạn 30 ngày.
- Khoá định danh là `provider + provider_subject`, không phải email (SPEC-001).
- Phân quyền chỉ có hai mức trong Group: Member và Admin. Không có RBAC nhiều tầng.
- Mọi Server Action và Route Handler gọi `assertGroupAccess(userId, groupId, role)` (SPEC-019) **trước** business logic. Không dựa vào việc ẩn nút trên UI.
- Kiểm tra Creator của Session làm riêng ở từng use case, không gộp vào guard chung, vì Creator là thuộc tính của Session chứ không phải của Group.
- Không có System Admin trong ứng dụng (F44). Thao tác ngoại lệ làm trực tiếp trên DB.

Cách ly dữ liệu theo NFR-04 được thực thi ở tầng application, không dùng Postgres RLS. Lý do: RLS thêm một tầng logic phân quyền thứ hai phải giữ đồng bộ với tầng thứ nhất, và ở dưới 10 user thì chi phí đó lớn hơn lợi ích.

---

# 6. Triển khai

## 6.1 Môi trường

| Môi trường | Nguồn | DB |
|---|---|---|
| Production | nhánh `main` | Neon branch `main` |
| Preview | mỗi PR | Neon branch tách từ `main` |
| Local | `yarn dev` | Neon branch `dev` |

Neon branching cho phép mỗi PR có DB riêng gần như miễn phí về dung lượng vì copy-on-write.

## 6.2 Migration

Drizzle Kit sinh SQL, commit vào repo. Migration chạy trong bước build của Vercel. Không có migration tự động khi runtime khởi động.

## 6.3 Cron — giới hạn cần biết trước

Hobby chỉ cho cron **một lần mỗi ngày**, và thời điểm chỉ được đảm bảo trong khoảng một giờ, luôn theo UTC. Deploy sẽ **thất bại ngay lúc build** nếu biểu thức cron chạy dày hơn.

v1.0 không có cron nào. Nhưng F26 (Session timeout) ở v1.1 sẽ đụng giới hạn này: một cron chạy 17:00 UTC đóng Session quá hạn là đủ cho một Group ở `Asia/Ho_Chi_Minh`, nhưng không đủ nếu về sau có nhiều Group ở nhiều timezone. Khi đó có hai đường: dùng scheduler ngoài gọi vào một Route Handler, hoặc đánh giá hết hạn **lười** ngay lúc đọc Session thay vì dùng job. Đường thứ hai không tốn hạ tầng nào và nên được cân nhắc trước.

---

# 7. Chi phí

Hạn mức xác minh ngày 2026-08-14. Free tier thay đổi thường xuyên; kiểm tra lại trước khi dựa vào bảng này.

| Dịch vụ | Gói | Hạn mức | Ước lượng của dự án | Vượt thì sao |
|---|---|---|---|---|
| Vercel | Hobby | 100 GB data transfer, 1M function invocation, 1M edge request, 4 CPU-hour mỗi tháng | Dưới 1% mọi hạn mức | Tính năng bị tạm dừng khoảng 30 ngày, không phát sinh hoá đơn |
| Neon | Free | 100 CU-hour mỗi project mỗi tháng, 0.5 GB storage, 5 GB network transfer, tự ngủ sau 5 phút | ~5 CU-hour, dưới 50 MB | Compute bị treo tới kỳ sau |
| Auth.js | — | Tự host trong app | — | — |
| GitHub Actions | Free (repo public) | — | Vài phút mỗi PR | — |

**Tổng: 0 ₫/tháng.**

Cách ra con số Neon: một gia đình dùng khoảng 15 phút mỗi ngày, compute ngủ sau 5 phút không hoạt động, nên khoảng 0.33 giờ hoạt động mỗi ngày ở mức 0.25 CU → khoảng 2.5 CU-hour mỗi tháng. Nhân đôi cho preview branch vẫn dưới 5. Biên an toàn rất rộng.

Dung lượng: một Group 5 người, 100 Dish, một Session mỗi ngày sinh khoảng 500 dòng `eating_history` và 3000 dòng `interaction_events` mỗi năm. Không tới 50 MB trong nhiều năm.

**Điều kiện phá vỡ mức 0 ₫:** dự án chuyển sang thương mại. Đó là ranh giới điều khoản, không phải ranh giới kỹ thuật, và nó vỡ ngay ở đồng doanh thu đầu tiên chứ không phải khi vượt hạn mức nào.

---

# 8. Chất lượng

## 8.1 Cổng

| Công cụ | Chạy khi | Chặn |
|---|---|---|
| `tsc --noEmit` | pre-push, CI | Lỗi kiểu |
| ESLint | pre-commit qua lint-staged, CI | Lỗi lint, vi phạm luật tầng §2.2 |
| Prettier | pre-commit | Định dạng |
| commitlint | commit-msg | Commit không theo Conventional Commits |
| jscpd | pre-push, CI | Trùng lặp mã, `threshold: 3`, tối thiểu 50 token |
| Knip | pre-push, CI | File, export, dependency không dùng, chạy `--production` |
| Vitest | pre-push, CI | Test đỏ |

Gộp thành `yarn verify`.

## 8.2 Kỷ luật test

| Tầng | Loại test | Ngưỡng |
|---|---|---|
| `domain/` | Unit, không mock | 80% dòng |
| `application/` | Unit, mock port | 80% dòng |
| `infrastructure/` | Integration, chỉ phần không tầm thường | Không đặt ngưỡng |
| `presentation/` | Test hành vi người dùng | Không đặt ngưỡng |

File test đặt cạnh file nguồn: `ranking.ts` → `ranking.test.ts`.

Mỗi `Kịch bản` trong SDD tương ứng đúng một test case. SDD v0.2 có 94 kịch bản; đây là sàn của bộ test v1.0, không phải trần.

Ba chỗ phải test kỹ nhất, vì sai ở đây không gây lỗi mà gây **dữ liệu sai âm thầm**:

1. `computeRecencyPenalty` (SPEC-020) — sai một ngày không ai phát hiện.
2. Quy đổi Decision Date theo timezone (SPEC-018) — sai ở ranh giới nửa đêm.
3. Đánh giá Required Rule với Dish nhiều System Tag (SPEC-016) — independent tag counting dễ bị hiện thực nhầm thành slot allocation.

## 8.3 Git

- Nhánh: `feat/<feature>-<mô-tả-ngắn>`, `fix/...`, `chore/...`
- Commit: Conventional Commits
- Mỗi PR link tới ít nhất một SPEC-ID trong phần mô tả
- Xong nghĩa là: test đã viết và pass, `yarn verify` xanh, preview deploy được

---

# 9. Rủi ro kỹ thuật

| ID | Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|---|
| R-01 | Neon cold start 0.5–2 giây sau 5 phút ngủ, đe doạ NFR-01 (2.5 giây) | Cao — bữa nào cũng là lần mở đầu tiên trong ngày | Render shell tĩnh trước, stream dữ liệu sau; đo bằng số thật trước khi tối ưu thêm |
| R-02 | Deck lưu trong `session_decks` bị lệch khi Admin gỡ Dish giữa Session | Trung bình | Lọc lại theo `group_dishes.state` lúc đọc trang, không tin tuyệt đối vào deck đã lưu |
| R-03 | Race condition khi hai người cùng Start Session | Trung bình | Partial unique index §3.2 để DB từ chối, bắt lỗi unique violation và dịch sang `ERR_SESSION_EXISTS_TODAY` |
| R-04 | Swipe nhanh gây ghi đè sai thứ tự | Trung bình | Upsert theo `updated_at` phía server; client gửi kèm timestamp và server bỏ qua bản đến muộn hơn |
| R-05 | Không có `Cannot Eat` ở v1.0 khiến Eating History ghi sai, nuôi cooldown sai | Trung bình, tích tụ theo ngày | Đã ghi ở SDD §8; ưu tiên F15 lên đầu v1.1 |
| R-06 | Vercel Hobby cấm dùng thương mại | Thấp bây giờ, chặn hoàn toàn về sau | Nếu có ý định thu tiền, đổi kế hoạch hosting **trước** khi phát hành công khai |
| R-07 | Chỉ Google OAuth, có người nhà không dùng Google | Thấp nhưng chặn hẳn người đó | Hỏi trước khi build; thêm magic link là công việc nửa ngày nếu cần |

---

# 10. Change History

| Version | Date | Section | Change | Reason / Decision |
|---|---|---|---|---|
| 0.2 | 2026-08-14 | §3 | Đổi `sessions` thành `selection_sessions`; bỏ `invalid_reason`; bỏ `group_id` và `decision_date` khỏi `final_meals` | Diagrams v0.1 §3.2 |
| 0.1 | 2026-08-14 | Toàn bộ | Bản draft đầu tiên; hạn mức free tier xác minh 2026-08-14 | Phase 6.3 |
