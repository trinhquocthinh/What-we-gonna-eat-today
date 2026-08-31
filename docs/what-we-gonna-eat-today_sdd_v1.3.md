# 📐 Software Design Document (SDD) — What We Gonna Eat Today

> **Document Metadata**
>
> - **Version:** `1.3` | **Status:** `Approved`
> - **Created:** `2026-08-14` | **Last Updated:** `2026-08-26`
> - **Supersedes:** `v1.2` | **Upstream:** [PRD](what-we-gonna-eat-today_prd_v1.5.md) • [Business Rules](what-we-gonna-eat-today_business-rules_v1.7.md) • [Ranking Spec](what-we-gonna-eat-today_ranking-specification_v1.3.md)
> - **Downstream:** [Tech Spec & Architecture](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) • [Test Cases](what-we-gonna-eat-today_test-cases-specification_v1.1.md) • [Master Plan](what-we-gonna-eat-today_master-plan_v2.1.md)
>
> 📌 *Tài liệu đặc tả chi tiết 35 module kỹ thuật (`SPEC-001` đến `SPEC-035`): 23 spec cho v1.0 và phần bảo trì sau phát hành, 12 spec cho v1.1. Mỗi kịch bản (Scenario) trong tài liệu này ánh xạ 1–1 thành một Test Case tự động.*

---

## 📑 Mục lục (Table of Contents)

1. [Phạm vi đặc tả hệ thống (Scope)](#1-phạm-vi-đặc-tả-hệ-thống-scope)
2. [Quy ước chung & Hợp đồng giao tiếp (Conventions & Contracts)](#2-quy-ước-chung--hợp-đồng-giao-tiếp-conventions--contracts)
3. [Spec — Nền tảng & Xác thực (Platform Specs)](#3-spec--nền-tảng--xác-thực-platform-specs)
   - [SPEC-001: Đăng nhập Google OAuth](#spec-001--đăng-nhập-google-oauth)
   - [SPEC-018: Decision Date Resolution](#spec-018--decision-date-resolution)
   - [SPEC-019: Authorization Guard](#spec-019--authorization-guard)
4. [Spec — Quản lý Nhóm và Danh mục món (Group & Dish Specs)](#4-spec--quản-lý-nhóm-và-danh-mục-món-group--dish-specs)
   - [SPEC-002: Tạo Group](#spec-002--tạo-group)
   - [SPEC-003: Tạo Link mời tham gia](#spec-003--tạo-link-mời-tham-gia)
   - [SPEC-004: Tham gia Group bằng Link mời](#spec-004--tham-gia-group-bằng-link-mời)
   - [SPEC-005: Thêm Dish vào Group Dish Pool](#spec-005--thêm-dish-vào-group-dish-pool)
   - [SPEC-006: Gán System Tag cho Dish trong Group](#spec-006--gán-system-tag-cho-dish-trong-group)
5. [Spec — Phiên chọn món (Session Specs)](#5-spec--phiên-chọn-món-session-specs)
   - [SPEC-007: Khởi tạo Session Draft](#spec-007--khởi-tạo-session-draft)
   - [SPEC-008: Bắt đầu Session (Start Session)](#spec-008--bắt-đầu-session-start-session)
   - [SPEC-009: Thêm Participant vào phiên](#spec-009--thêm-participant-vào-phiên)
6. [Spec — Duyệt món và Chốt bữa (Deck & Finalization Specs)](#6-spec--duyệt-món-và-chốt-bữa-deck--finalization-specs)
   - [SPEC-010: Dựng Personal Candidate Deck](#spec-010--dựng-personal-candidate-deck)
   - [SPEC-011: Lấy phân trang Deck](#spec-011--lấy-phân-trang-deck)
   - [SPEC-012: Ghi nhận tương tác Swipe & Undo](#spec-012--ghi-nhận-tương-tác-swipe--undo)
   - [SPEC-013: Đánh dấu Completed & Mở lại](#spec-013--đánh-dấu-completed--mở-lại)
   - [SPEC-014: Tính toán Session Ranking](#spec-014--tính-toán-session-ranking)
   - [SPEC-015: Dựng Final Meal nháp](#spec-015--dựng-final-meal-nháp)
   - [SPEC-016: Chốt bữa chính thức (Finalize)](#spec-016--chốt-bữa-chính-thức-finalize)
   - [SPEC-017: Tự động sinh Default Eating History](#spec-017--tự-động-sinh-default-eating-history)
7. [Spec — Cooldown & Quy định bữa ăn (Cooldown & Rules Specs)](#7-spec--cooldown--quy-định-bữa-ăn-cooldown--rules-specs)
   - [SPEC-020: Tính toán Recency Penalty](#spec-020--tính-toán-recency-penalty)
   - [SPEC-021: Cấu hình Group Required Rules](#spec-021--cấu-hình-group-required-rules)
   - [SPEC-022: Snapshot Session Rules](#spec-022--snapshot-session-rules)
   - [SPEC-023: Gợi ý món từ Global Dish Pool](#spec-023--gợi-ý-món-từ-global-dish-pool-catalog-search)
8. [Spec — Phiên bản v1.1](#8-spec--phiên-bản-v11)
   - [8.1 Ràng buộc và sở thích cá nhân (E7)](#81-ràng-buộc-và-sở-thích-cá-nhân-epic-e7) — `SPEC-024`, `SPEC-025`
   - [8.2 Deck ngắn và có nhịp (E8)](#82-deck-ngắn-và-có-nhịp-epic-e8) — `SPEC-026`, `SPEC-027`, `SPEC-028`
   - [8.3 Chế độ vuốt theo chặng (E9)](#83-chế-độ-vuốt-theo-chặng-epic-e9) — `SPEC-029`, `SPEC-030`
   - [8.4 Chốt bữa có hướng dẫn mềm (E10)](#84-chốt-bữa-có-hướng-dẫn-mềm-epic-e10) — `SPEC-031`, `SPEC-032`, `SPEC-033`
   - [8.5 Vận hành tối thiểu (E11)](#85-vận-hành-tối-thiểu-epic-e11) — `SPEC-034`, `SPEC-035`
9. [Các điểm lưu ý kiến trúc](#9-các-điểm-lưu-ý-kiến-trúc)
10. [Lịch sử thay đổi (Change History)](#10-lịch-sử-thay-đổi-change-history)

---

# 1. Phạm vi đặc tả hệ thống (Scope)

## 1.1 Danh mục 17 tính năng đã spec chi tiết trong v1.0

| Mã | Tính năng | Mã SPEC liên quan |
| :---: | :--- | :--- |
| `F01` | Đăng nhập Google OAuth | `SPEC-001` |
| `F02` | Tạo Group, quản lý thành viên & Link mời | `SPEC-002`, `SPEC-003`, `SPEC-004` |
| `F03` | Thêm Dish vào Group Dish Pool | `SPEC-005` |
| `F04` | Gán System Tag trong Group | `SPEC-006` |
| `F05` | Tạo & Bắt đầu Session trong ngày | `SPEC-007`, `SPEC-008` |
| `F06` | Thêm Participant vào phiên | `SPEC-009` |
| `F07` | Personal Candidate Deck | `SPEC-010`, `SPEC-011` |
| `F08` | Tương tác vuốt thẻ (Swipe Right / Left) | `SPEC-012` |
| `F09` | Hoàn tác lượt vuốt (Undo về None) | `SPEC-012` |
| `F10` | Đánh dấu Completed và mở lại | `SPEC-013` |
| `F11` | Bảng xếp hạng đồng thuận Session Ranking | `SPEC-014` |
| `F12` | Chọn món & Chốt thực đơn Final Meal | `SPEC-015`, `SPEC-016` |
| `F13` | Kiểm tra quy định bắt buộc (Required Rule Validation) | `SPEC-016` |
| `F14` | Tự động ghi nhận Default Eating History | `SPEC-017` |
| `F17` | Lịch sử Cooldown 7 ngày (Recency Penalty) | `SPEC-020`, `SPEC-010` |
| `F20` | Quy định mâm cơm của nhóm (Group Required Rules) | `SPEC-021` |
| `F21` | Snapshot Session Rules tại thời điểm Start | `SPEC-022`, `SPEC-008` |
| *Core* | Quy đổi múi giờ Decision Date & Authorization Guard | `SPEC-018`, `SPEC-019` |
| *Bảo trì* | Gợi ý món từ catalog chung khi đang gõ | `SPEC-023` |

## 1.2 Danh mục 11 tính năng của v1.1

Chi tiết ở [§8](#8-spec--phiên-bản-v11). Phạm vi chốt theo [DEC-056](what-we-gonna-eat-today_decision-log_v3.9.md).

| Mã | Tính năng | Epic | Mã SPEC liên quan |
| :---: | :--- | :---: | :--- |
| `F15` | Cannot Eat (Không ăn được) | E7 | `SPEC-024` |
| `F16` | Preference Like / Dislike | E7 | `SPEC-025` |
| `F49` | Trần số thẻ mỗi phiên (30 thẻ) | E8 | `SPEC-026` |
| `F18` | Explore Lane 20% | E8 | `SPEC-027` |
| `F19` | Ổn định Deck khi tính lại điểm | E8 | `SPEC-028` |
| `F51` | Tiếp tục đúng chỗ đang vuốt | E8 | `SPEC-036` |
| `F50` | Chế độ vuốt theo chặng | E9 | `SPEC-029`, `SPEC-030` |
| `F22` | Preferred Rule & Cảnh báo mềm | E10 | `SPEC-031` |
| `F23` | Target Dish Count & Cảnh báo | E10 | `SPEC-032` |
| `F24` | Lưu vết Override cảnh báo | E10 | `SPEC-033` |
| `F26` | Tự động đóng phiên quá hạn | E11 | `SPEC-034` |
| `F27` | Gỡ Dish khỏi Pool | E11 | `SPEC-035` |

---

# 2. Quy ước chung & Hợp đồng giao tiếp (Conventions & Contracts)

## 2.1 Quy ước đặt tên trong mã nguồn

| Thành phần | Quy ước định dạng | Ví dụ thực tế |
| :--- | :--- | :--- |
| **Bảng CSDL** | `snake_case` số nhiều | `group_dishes`, `selection_sessions` |
| **Cột CSDL** | `snake_case` | `decision_date`, `normalized_name` |
| **Khóa chính** | `id`, UUID v7 | `id` |
| **Khóa ngoại** | `<entity>_id` | `session_id`, `global_dish_id` |
| **Database Enum** | `UPPER_SNAKE` | `SWIPE_RIGHT`, `ACTIVE`, `FINALIZED` |
| **Mốc thời gian** | Hậu tố `_at`, UTC `timestamptz` | `created_at`, `started_at` |
| **Ngày lịch** | Hậu tố `_date`, kiểu `date` thuần | `decision_date`, `eating_date` |
| **Use Case function** | `camelCase` (động từ + danh từ) | `startSession`, `joinByInvite` |
| **Mã lỗi nghiệp vụ** | `ERR_` + `UPPER_SNAKE` | `ERR_NOT_GROUP_MEMBER`, `ERR_SESSION_NOT_DRAFT` |

## 2.2 Định nghĩa các Enum cốt lõi

```text
SystemTag        = STAPLE | MAIN | SIDE | SOUP | DESSERT
SessionState     = DRAFT | ACTIVE | FINALIZED | INVALID
InvalidReason    = CANCELLED | TIMEOUT
InteractionType  = SWIPE_RIGHT | SWIPE_LEFT
ParticipantState = ACTIVE | COMPLETED | REMOVED
GroupRole        = MEMBER | ADMIN | CHEF
GroupDishState   = ACTIVE | INACTIVE
```

> [!NOTE]
> `InteractionType` **không có giá trị `NONE`**. Trạng thái "chưa chọn" được biểu diễn bằng việc *không tồn tại bản ghi trong bảng `interactions`*. Thao tác Undo đơn giản là xóa bản ghi tương tác tương ứng.

## 2.3 Luồng dữ liệu giữa các tầng kiến trúc

```text
presentation  ──►  application     : DTO thuần túy (không chứa Entity Domain)
application   ──►  domain          : Entities & Value Objects thuần túy
application   ──►  infrastructure  : Port Interface do Application định nghĩa
infrastructure ──►  application     : Domain Entities (không rò rỉ kiểu dữ liệu Drizzle/ORM)
```

## 2.4 Bảng tra cứu mã lỗi chuẩn (Error Catalog)

| Mã lỗi | HTTP Status | Thông điệp người dùng tiếng Việt |
| :--- | :---: | :--- |
| `ERR_UNAUTHENTICATED` | 401 | Bạn cần đăng nhập để tiếp tục |
| `ERR_NOT_GROUP_MEMBER` | 403 | Bạn không thuộc nhóm này |
| `ERR_NOT_GROUP_ADMIN` | 403 | Chỉ quản trị viên nhóm mới có quyền thực hiện |
| `ERR_NOT_SESSION_CREATOR` | 403 | Chỉ người tạo phiên mới có quyền thực hiện |
| `ERR_NOT_PARTICIPANT` | 403 | Bạn không có tên trong danh sách tham gia phiên này |
| `ERR_VALIDATION` | 400 | Dữ liệu cung cấp không hợp lệ |
| `ERR_INVITE_INVALID` | 400 | Liên kết mời không hợp lệ hoặc đã hết hạn |
| `ERR_INVITE_ALREADY_USED` | 409 | Liên kết mời này đã được sử dụng |
| `ERR_ALREADY_GROUP_MEMBER` | 409 | Bạn đã là thành viên của nhóm |
| `ERR_DISH_ALREADY_IN_POOL` | 409 | Món ăn này đã có sẵn trong danh mục nhóm |
| `ERR_DISH_NOT_IN_POOL` | 409 | Món ăn này không còn hoạt động trong nhóm |
| `ERR_INVALID_SYSTEM_TAG` | 400 | Thẻ phân loại món không hợp lệ |
| `ERR_SESSION_EXISTS_TODAY` | 409 | Hôm nay nhóm đã có một phiên chọn món đang mở hoặc đã chốt |
| `ERR_SESSION_NOT_DRAFT` | 409 | Phiên đã bắt đầu, không thể chỉnh sửa cấu hình |
| `ERR_SESSION_NOT_ACTIVE` | 409 | Phiên chọn món hiện không còn nhận thao tác |
| `ERR_PARTICIPANT_NOT_MEMBER` | 409 | Thành viên này không còn thuộc nhóm |
| `ERR_PARTICIPANT_EXISTS` | 409 | Thành viên này đã có tên trong phiên |
| `ERR_DUPLICATE_DISH_IN_MEAL` | 400 | Một món ăn chỉ được đưa vào thực đơn một lần |
| `ERR_EMPTY_FINAL_MEAL` | 400 | Cần chọn ít nhất một món ăn trước khi chốt bữa |
| `ERR_REQUIRED_RULE_FAILED` | 409 | Thực đơn chưa đáp ứng đủ quy định món bắt buộc của nhóm |
| `ERR_DUPLICATE_RULE` | 409 | Nhóm đã có quy định cho loại nhãn món này |
| `ERR_INVALID_MINIMUM_COUNT` | 400 | Số lượng món tối thiểu phải từ 1 trở lên |

---

# 3. Spec — Nền tảng & Xác thực (Platform Specs)

### SPEC-001 — Đăng nhập Google OAuth

- **Nguồn:** `US-001`, `F01`
- **Đầu vào:** OAuth Callback token từ Google
- **Đầu ra:** Session Cookie JWT + Bản ghi `User`
- **Quy tắc:**
  - Nếu chưa có User khớp `provider_subject`, tạo User mới.
  - Nếu đã tồn tại, cập nhật phiên đăng nhập. Khóa định danh là `provider + provider_subject`, không dùng email làm khóa chính.
- **Kịch bản kiểm thử (Test Scenarios):**
  - **Given** lần đầu đăng nhập, **When** callback hợp lệ, **Then** tạo đúng 1 User và cấp session cookie.
  - **Given** đã đăng nhập trước đó, **When** callback lại cùng `provider_subject`, **Then** không tạo thêm User mới.
  - **Given** 2 tài khoản Google khác nhau trùng email (edge case), **When** đăng nhập, **Then** sinh 2 User độc lập.

---

### SPEC-018 — Decision Date Resolution

- **Nguồn:** [BR-020](what-we-gonna-eat-today_business-rules_v1.7.md), `BR-025`
- **Đầu vào:** `groupId`, mốc thời gian UTC hiện tại
- **Đầu ra:** `decisionDate: date`
- **Quy tắc:**
  - Quy đổi timestamp hiện tại sang múi giờ của Group (vd: `Asia/Ho_Chi_Minh`) và trích xuất ngày lịch.
  - Mọi so sánh duy nhất của phiên trong ngày đều sử dụng `decisionDate` địa phương này.
- **Kịch bản kiểm thử:**
  - **Given** timezone `Asia/Ho_Chi_Minh`, **When** UTC là `2026-08-14T18:30:00Z` (01:30 sáng hôm sau), **Then** `decisionDate = 2026-08-15`.
  - **Given** timezone `Asia/Ho_Chi_Minh`, **When** UTC là `2026-08-14T16:00:00Z` (23:00 cùng ngày), **Then** `decisionDate = 2026-08-14`.

---

### SPEC-019 — Authorization Guard

- **Nguồn:** [BR-006](what-we-gonna-eat-today_business-rules_v1.7.md), `BR-007`, `BR-008`
- **Đầu vào:** `userId`, `groupId`, `requiredRole` (`MEMBER` | `ADMIN`)
- **Đầu ra:** `void` | `Failure`
- **Quy tắc:**
  - Kiểm tra membership đang hoạt động. Nếu thiếu quyền → trả `ERR_NOT_GROUP_MEMBER` hoặc `ERR_NOT_GROUP_ADMIN`.
- **Kịch bản kiểm thử:**
  - **Given** User ngoài nhóm, **When** gọi thao tác nhóm, **Then** trả về `ERR_NOT_GROUP_MEMBER`.
  - **Given** Member thông thường, **When** gọi thao tác chỉ dành cho Admin, **Then** trả về `ERR_NOT_GROUP_ADMIN`.

---

# 4. Spec — Quản lý Nhóm và Danh mục món (Group & Dish Specs)

### SPEC-002 — Tạo Group

- **Nguồn:** `US-001`, `F02`, [BR-006](what-we-gonna-eat-today_business-rules_v1.7.md)
- **Đầu vào:** `{ name: string (1..60), timezone: IANA string }`
- **Đầu ra:** `Group` | `ValidationError`
- **Quy tắc:** Người tạo tự động trở thành Member và gán role `ADMIN`.

### SPEC-003 — Tạo Link mời tham gia

- **Nguồn:** `US-001`, `F02`
- **Đầu vào:** `{ groupId }` (Yêu cầu quyền Group Admin)
- **Đầu ra:** `{ token: string, expiresAt: Date }`
- **Quy tắc:** Token ngẫu nhiên $\ge 128\text{ bits}$, lưu trữ dạng SHA-256 hash trong DB, hạn sử dụng 7 ngày.

### SPEC-004 — Tham gia Group bằng Link mời

- **Nguồn:** `US-001`, `F02`
- **Đầu vào:** `{ token }` (Người dùng đã đăng nhập)
- **Đầu ra:** `GroupMember` | `Failure`
- **Quy tắc:** Token hết hạn → `ERR_INVITE_INVALID`; token đã dùng → `ERR_INVITE_ALREADY_USED`; đã là Member → `ERR_ALREADY_GROUP_MEMBER` (token không bị tiêu hủy).

### SPEC-005 — Thêm Dish vào Group Dish Pool

- **Nguồn:** `US-002`, `F03`, [BR-001](what-we-gonna-eat-today_business-rules_v1.7.md)
- **Đầu vào:** `{ groupId, name: string (1..120), systemTags: SystemTag[] (0..5), forceCreate?: boolean }`
- **Đầu ra:** `GroupDish` | `{ existingCandidates: GlobalDish[] }` | `Failure`
- **Quy tắc:** Chuẩn hóa tên (cắt khoảng trắng thừa, chuyển chữ thường, bỏ dấu tiếng Việt) thành `normalized_name`. Nếu tìm thấy món trùng, trả về danh sách gợi ý; nếu có cờ `forceCreate = true`, tạo Global Dish mới kèm provenance.
- **Ghi chú (DEC-053):** Nhánh "dùng lại món có sẵn" (`addExistingDishToGroup`, ngoài hợp đồng này — xem `DEC-029`) nay cũng nhận `systemTags` và ghi đè toàn bộ tag của món trong Group.

### SPEC-006 — Gán System Tag cho Dish trong Group

- **Nguồn:** `US-003`, `F04`, [BR-003](what-we-gonna-eat-today_business-rules_v1.7.md)
- **Đầu vào:** `{ groupId, dishId, systemTags: SystemTag[] }` (Yêu cầu quyền Group Admin)
- **Đầu ra:** `GroupDish` | `Failure`
- **Quy tắc:** Ghi đè toàn bộ tag của món ăn trong Group hiện tại; hoàn toàn độc lập và không ảnh hưởng Group khác.

---

# 5. Spec — Phiên chọn món (Session Specs)

### SPEC-007 — Khởi tạo Session Draft

- **Nguồn:** `US-008`, `F05`, [BR-020](what-we-gonna-eat-today_business-rules_v1.7.md), `BR-025`
- **Đầu vào:** `{ groupId }`
- **Đầu ra:** `Session` (State: `DRAFT`) | `Failure`
- **Quy tắc:** Nếu nhóm đã có phiên `ACTIVE` hoặc `FINALIZED` cùng ngày → `ERR_SESSION_EXISTS_TODAY`.

### SPEC-008 — Bắt đầu Session (Start Session)

- **Nguồn:** `US-008`, `F05`, [BR-021](what-we-gonna-eat-today_business-rules_v1.7.md), `BR-025`
- **Đầu vào:** `{ sessionId }` (Yêu cầu Creator)
- **Đầu ra:** `Session` (State: `ACTIVE`) | `Failure`
- **Quy tắc (Revalidation 5 bước):**
  1. Kiểm tra session state `DRAFT`.
  2. Kiểm tra caller là `Creator`.
  3. Creator vẫn là Member.
  4. Tất cả Participants vẫn là Member hợp lệ.
  5. Chưa có phiên khác `ACTIVE`/`FINALIZED` cùng ngày.
  *(Nếu hợp lệ: Snapshot Group Rules sang Session Rules và chuyển state `ACTIVE` trong cùng 1 transaction).*

### SPEC-009 — Thêm Participant vào phiên

- **Nguồn:** `US-009`, `F06`, [BR-026](what-we-gonna-eat-today_business-rules_v1.7.md)
- **Đầu vào:** `{ sessionId, userId }` (Yêu cầu Creator)
- **Đầu ra:** `Participant` | `Failure`
- **Quy tắc:** Cho phép thêm khi phiên ở `DRAFT` hoặc `ACTIVE`. Người mới bắt đầu với 0 tương tác.

---

# 6. Spec — Duyệt món và Chốt bữa (Deck & Finalization Specs)

### SPEC-010 — Dựng Personal Candidate Deck

- **Nguồn:** `US-011`, `F07`, [Ranking Spec §2](what-we-gonna-eat-today_ranking-specification_v1.3.md)
- **Đầu vào:** `{ sessionId, userId }`
- **Đầu ra:** `orderedDishIds: string[]`
- **Quy tắc:**
  - $\text{score} = -w_{\text{recency}} \times R$ (với $w_{\text{recency}} = 0.25$).
  - Tie-break: Món chưa ăn ($d = \infty$) $\to$ $d$ lớn hơn $\to$ `stable_hash(sessionId, userId, dishId)`.
  - Deck được lưu trữ cố định (materialized) trong `session_decks` để giữ nguyên thứ tự thẻ giữa các lần mở app.

### SPEC-011 — Lấy phân trang Deck

- **Nguồn:** `US-011`, `F07`
- **Đầu vào:** `{ sessionId, cursor: number, pageSize: 20 }`
- **Đầu ra:** `{ items: DishCard[], nextCursor: number | null }`

### SPEC-012 — Ghi nhận tương tác Swipe & Undo

- **Nguồn:** `US-011`, `F08`, `F09`, [BR-040→042](what-we-gonna-eat-today_business-rules_v1.7.md)
- **Đầu vào:** `{ sessionId, dishId, action: SWIPE_RIGHT | SWIPE_LEFT | UNDO }`
- **Đầu ra:** `{ effectiveInteraction: InteractionType | null }`
- **Quy tắc:** Upsert vào `interactions` (chỉ giữ 1 trạng thái hiệu lực); đồng thời append vào `interaction_events` để lưu vết audit log.

### SPEC-013 — Đánh dấu Completed & Mở lại

- **Nguồn:** `US-014`, `F10`, [BR-044](what-we-gonna-eat-today_business-rules_v1.7.md)
- **Đầu vào:** `{ sessionId, completed: boolean }`
- **Quy tắc:** `COMPLETED` chỉ mang tính chất báo hiệu cho Creator, **không khóa quyền vuốt tiếp** của thành viên nếu phiên còn mở.

### SPEC-014 — Tính toán Session Ranking

- **Nguồn:** `US-015`, `F11`, [Ranking Spec §3](what-we-gonna-eat-today_ranking-specification_v1.3.md)
- **Đầu vào:** `{ sessionId }` (Yêu cầu Creator)
- **Đầu ra:** `{ ranked: RankedDish[], untouched: DishSummary[] }`
- **Công thức:**
  $$\text{Score} = \frac{1.00 \times P - 0.70 \times N - 1.00 \times X - 0.30 \times H}{T}$$
  *(Trong đó $T$ là tổng số Participant, $P$ là chọn, $N$ là từ chối, $X$ là Cannot Eat, $H$ là đã ăn gần đây).*

### SPEC-015 — Dựng Final Meal nháp

- **Nguồn:** `US-016`, `F12`, [BR-050](what-we-gonna-eat-today_business-rules_v1.7.md)
- **Đầu vào:** `{ sessionId, dishIds: string[] }` (Yêu cầu Creator)
- **Quy tắc:** Cho phép chọn bất kỳ món nào trong nhóm (kể cả món chưa ai vuốt), không kích hoạt validate rule ở bước nháp.

### SPEC-016 — Chốt bữa chính thức (Finalize)

- **Nguồn:** `US-016`, `F12`, `F13`, [BR-052](what-we-gonna-eat-today_business-rules_v1.7.md)
- **Đầu vào:** `{ sessionId }` (Yêu cầu Creator)
- **Đầu ra:** `FinalMeal` | `Failure`
- **Quy tắc:**
  1. Kiểm tra danh sách món không rỗng.
  2. Đánh giá `Required Rules` theo **Session Rule Snapshot** kết hợp với **System Tag hiện tại** của món.
  3. Nếu thiếu quy tắc bắt buộc $\to$ trả `ERR_REQUIRED_RULE_FAILED` và phiên vẫn giữ `ACTIVE`.
  4. Nếu hợp lệ: Chuyển state `FINALIZED`, tạo `final_meals` và tự động sinh `eating_history` trong cùng 1 database transaction.

### SPEC-017 — Tự động sinh Default Eating History

- **Nguồn:** `US-018`, `F14`, [BR-056](what-we-gonna-eat-today_business-rules_v1.7.md)
- **Đầu vào:** `FinalMeal`
- **Quy tắc:** Sinh bản ghi ăn uống cho toàn bộ Participant hiện tại với ngày `eating_date = session.decision_date`. Đảm bảo tính Idempotent qua `source_final_meal_id`.

---

# 7. Spec — Cooldown & Quy định bữa ăn (Cooldown & Rules Specs)

### SPEC-020 — Tính toán Recency Penalty

- **Nguồn:** `F17`, [BR-046](what-we-gonna-eat-today_business-rules_v1.7.md), [Ranking Spec §2.2](what-we-gonna-eat-today_ranking-specification_v1.3.md)
- **Đầu vào:** `{ userId, dishId, referenceDate }`
- **Đầu ra:** $R \in [0, 1]$
- **Công thức:**
  $$R = \max\left(0, 1 - \frac{d}{7}\right)$$
  *(Với $d$ là số ngày lịch kể từ lần ăn gần nhất).*

### SPEC-021 — Cấu hình Group Required Rules

- **Nguồn:** `F20`, [BR-010](what-we-gonna-eat-today_business-rules_v1.7.md), `BR-013`
- **Đầu vào:** `{ groupId, rules: [{ systemTag: SystemTag, minimumCount: number }] }` (Yêu cầu Group Admin)
- **Quy tắc:** Ghi đè toàn bộ danh sách quy định; `minimumCount` phải $\ge 1$; không cho phép trùng lặp tag.

### SPEC-022 — Snapshot Session Rules

- **Nguồn:** `F21`, [BR-015](what-we-gonna-eat-today_business-rules_v1.7.md), `BR-016`
- **Đầu vào:** `{ sessionId }`
- **Quy tắc:** Đóng băng bản sao các quy định mâm cơm của Group tại thời điểm Start. Admin chỉnh sửa Group Rule sau đó sẽ không làm đổi luật của phiên đang chạy.

### SPEC-023 — Gợi ý món từ Global Dish Pool (Catalog Search)

- **Nguồn:** `US-002`, [BR-001](what-we-gonna-eat-today_business-rules_v1.7.md), [DEC-055](what-we-gonna-eat-today_decision-log_v3.9.md)
- **Giao thức:** `GET /api/groups/{groupId}/dishes/search?q={query}` — **Route Handler**, không phải Server Action (Tech Spec §4.1: Server Action bị serialise, mà typeahead bắn theo từng phím).
- **Quyền:** Đăng nhập **và** là Member của `groupId`. Kiểm tư cách thành viên là BẮT BUỘC — kết quả đã loại món nhóm đang có, nên dò `groupId` bất kỳ sẽ suy ra được danh mục của nhóm đó.
- **Đầu vào:** `q` — chuỗi thô người dùng gõ.
- **Đầu ra:** `{ suggestions: { id, name }[] }` — `id` là **`global_dishes.id`**, KHÔNG phải `group_dishes.id`.
- **Quy tắc:**
  - Chuẩn hoá `q` qua `normalizeDishName`, lọc bỏ `%`, `_`, `\` (chống ký tự đại diện của `LIKE`).
  - Dưới 3 ký tự sau chuẩn hoá → trả `{ suggestions: [] }` kèm **200**, không phải 400: gõ dở một chữ không phải lỗi client.
  - Khớp **chuỗi con** trên `normalized_name`; loại món nhóm đang `ACTIVE` ngay trong SQL; món `INACTIVE` **vẫn** hiện (chọn lại là cách thêm lại).
  - Sắp xếp: khớp từ đầu tên trước → tên ngắn hơn → `created_at`. Giới hạn 5.

---

# 8. Spec — Phiên bản v1.1

> [!NOTE]
> `SPEC-024` → `SPEC-035` đặc tả 11 tính năng của v1.1 theo [Master Plan §16](what-we-gonna-eat-today_master-plan_v2.1.md). Phạm vi v1.1 đã được re-scope ngày 2026-08-26 — xem [DEC-056](what-we-gonna-eat-today_decision-log_v3.9.md).

## 8.1 Ràng buộc và sở thích cá nhân (Epic E7)

### SPEC-024 — Đánh dấu / gỡ Cannot Eat

- **Nguồn:** `US-005`, `F15`, [BR-034](what-we-gonna-eat-today_business-rules_v1.7.md), [DEC-060](what-we-gonna-eat-today_decision-log_v3.9.md)
- **Đầu vào:** `{ globalDishId, cannotEat: boolean }` (người gọi là chính chủ)
- **Đầu ra:** `{ removedInteraction: boolean }`
- **Quy tắc:**
  - Ràng buộc gắn theo `global_dishes.id`, **không** theo `group_dishes.id` — người dị ứng tôm thì dị ứng ở mọi nhóm.
  - Bật `cannotEat` **xoá tương tác Swipe đã có** của người đó với món đó trong phiên `ACTIVE` hiện hành. Giữ lại sẽ khiến $+1.0$ của $P$ và $-1.0$ của $X$ triệt tiêu nhau trong `SPEC-014`, và cả nhà thấy một món trung tính trong khi sự thật là có người không ăn được.
  - Món bị đánh dấu **bị lọc cứng** khỏi deck ở Stage 1, không phải hạ điểm.
  - Gỡ đánh dấu **không** khôi phục tương tác đã xoá.

### SPEC-025 — Đặt Explicit Preference (Like / Dislike)

- **Nguồn:** `US-006`, `F16`, [BR-037](what-we-gonna-eat-today_business-rules_v1.7.md)
- **Đầu vào:** `{ globalDishId, preference: LIKE | DISLIKE | null }`
- **Đầu ra:** `{ preference: LIKE | DISLIKE | null }`
- **Quy tắc:**
  - Ánh xạ sang $E$: `LIKE` $\to +1$, `null` $\to 0$, `DISLIKE` $\to -1$.
  - `DISLIKE` **không** lọc món khỏi deck — chỉ hạ điểm qua $w_{\text{explicit}} = 0.30$. Cho `DISLIKE` quyền lọc thì nó chập làm một với `Cannot Eat` và người dùng mất cách diễn đạt sắc thái nhẹ.
  - `null` là gỡ về `Neutral`, không phải một giá trị enum thứ ba trong CSDL.

## 8.2 Deck ngắn và có nhịp (Epic E8)

### SPEC-026 — Cắt trần số thẻ (Deck Size Cap)

- **Nguồn:** `F49`, [BR-062](what-we-gonna-eat-today_business-rules_v1.7.md), [Ranking Spec §2.4](what-we-gonna-eat-today_ranking-specification_v1.3.md), [DEC-058](what-we-gonna-eat-today_decision-log_v3.9.md)
- **Đầu vào:** `{ orderedDishIds: string[], maxCards: 30 }`
- **Đầu ra:** `cappedDishIds: string[]` (độ dài $\le 30$)
- **Quy tắc:**
  - Hàm thuần, không chạm CSDL — cùng khuôn `getDeckPage` của `SPEC-011`.
  - Chạy **sau** `SPEC-027`, không bao giờ trước. Đây là bất biến `Cap After Blend` của [Business Rules §23](what-we-gonna-eat-today_business-rules_v1.7.md).
  - Deck ngắn hơn 30 thì trả nguyên vẹn, không đệm thêm.

### SPEC-027 — Trộn luồng Exploit / Explore

- **Nguồn:** `US-012`, `F18`, [BR-047](what-we-gonna-eat-today_business-rules_v1.7.md), [Ranking Spec §2.3](what-we-gonna-eat-today_ranking-specification_v1.3.md)
- **Đầu vào:** `{ exploit: DishCandidate[], explore: DishCandidate[], blockSize: 5 }`
- **Đầu ra:** `blendedDishIds: string[]`
- **Quy tắc:**
  - Mỗi khối 5 vị trí: 4 thẻ Exploit + 1 thẻ Explore ở vị trí thứ 5.
  - Tập Explore: món chưa từng ăn hoặc $d \ge 30$ ngày, chưa bị `DISLIKE`, sắp theo $d$ giảm dần.
  - Một luồng cạn thì khối còn lại lấy trọn từ luồng kia — không để chỗ trống.
  - Mỗi thẻ mang cờ `lane: EXPLOIT | EXPLORE` ra tới tầng presentation, phục vụ chip `reason` đổi màu.

### SPEC-028 — Materialize và đóng băng Deck

- **Nguồn:** `US-013`, `F19`, [BR-048](what-we-gonna-eat-today_business-rules_v1.7.md)
- **Đầu vào:** `{ sessionId, participantId, cursor }`
- **Đầu ra:** `void` (ghi `session_decks`)
- **Quy tắc:**
  - Khi tính lại giữa phiên: **giữ nguyên vị trí mọi thẻ có `index < cursor`**; chỉ sắp lại phần đuôi.
  - Món mới thêm vào pool giữa phiên chỉ được chèn vào phần đuôi chưa xem.
  - Món chuyển `INACTIVE` hoặc bị đánh dấu `Cannot Eat` giữa phiên bị gỡ khỏi phần đuôi; phần đã xem giữ nguyên để `cursor` không lệch.

## 8.3 Chế độ vuốt theo chặng (Epic E9)

### SPEC-029 — Snapshot Session Course lúc Start

- **Nguồn:** `F50`, [BR-063](what-we-gonna-eat-today_business-rules_v1.7.md), [DEC-059](what-we-gonna-eat-today_decision-log_v3.9.md)
- **Đầu vào:** `{ sessionId, deckMode: FREE | COURSE, courses: SystemTag[] }` (theo thứ tự Creator sắp)
- **Đầu ra:** `void` (ghi `selection_sessions.deck_mode` và `session_courses`)
- **Quy tắc:**
  - Chạy **trong cùng giao dịch** `startDraft` với snapshot `session_rules` (`SPEC-022`).
  - `deck_mode = COURSE` mà `courses` rỗng $\to$ `ERR_VALIDATION`.
  - Mỗi System Tag xuất hiện **tối đa một lần**; `position` bắt đầu từ 0.
  - Bảng `session_courses` không có cột `id` — khoá tự nhiên `(session_id, position)`, đúng khuôn `session_rules` theo [DEC-044](what-we-gonna-eat-today_decision-log_v3.9.md).
  - Sau khi phiên `ACTIVE`, đổi cấu hình nhóm **không** tác động tới phiên đang chạy.

### SPEC-030 — Dựng Deck theo chặng và phân bổ hạn mức

- **Nguồn:** `F50`, [BR-063](what-we-gonna-eat-today_business-rules_v1.7.md), [Ranking Spec §2.5](what-we-gonna-eat-today_ranking-specification_v1.3.md)
- **Đầu vào:** `{ cappedDishIds: string[], courses: SystemTag[], maxCards: 30 }`
- **Đầu ra:** `courseDecks: { systemTag: SystemTag, dishIds: string[] }[]`
- **Quy tắc:**
  - Hạn mức cơ sở mỗi chặng $= \lfloor 30 / n \rfloor$. Chặng không dùng hết hạn mức thì phần dư chia lại cho các chặng còn thiếu, lặp cho tới khi không còn phân bổ được nữa.
  - Thứ tự tương đối bên trong mỗi chặng **giữ nguyên** thứ tự đã có từ `SPEC-026`.
  - Món mang nhiều tag thuộc nhiều chặng chỉ xuất hiện ở **chặng đầu tiên** khớp — nếu không, người dùng vuốt cùng một món hai lần và $P$ bị đếm trùng.
  - `deck_mode = FREE` $\to$ trả đúng một "chặng" chứa toàn bộ deck; người gọi không cần rẽ nhánh.

## 8.4 Chốt bữa có hướng dẫn mềm (Epic E10)

### SPEC-031 — Đánh giá Preferred Rule (cảnh báo mềm)

- **Nguồn:** `US-019`, `F22`, [BR-014](what-we-gonna-eat-today_business-rules_v1.7.md), [BR-052](what-we-gonna-eat-today_business-rules_v1.7.md)
- **Đầu vào:** `{ selectedDishTags: SystemTag[][], sessionRules: SessionRule[] }`
- **Đầu ra:** `{ blocking: RuleViolation[], warnings: RuleViolation[] }`
- **Quy tắc:**
  - `REQUIRED` thiếu $\to$ `blocking`, chặn Finalize. `PREFERRED` thiếu $\to$ `warnings`, **không** chặn.
  - Vẫn áp Independent Tag Counting của §9 cho cả hai loại.
  - Hàm thuần; `finalizeSession` chỉ đọc `blocking.length === 0` để quyết định cho qua hay không.

### SPEC-032 — Target Dish Count

- **Nguồn:** `F23`, [BR-011](what-we-gonna-eat-today_business-rules_v1.7.md)
- **Đầu vào:** `{ selectedCount: number, targetCount: number | null }`
- **Đầu ra:** `RuleViolation | null`
- **Quy tắc:**
  - `targetCount = null` (nhóm chưa đặt) $\to$ không cảnh báo.
  - Lệch theo cả hai chiều đều cảnh báo, và cảnh báo nói rõ chiều lệch.
  - Luôn là cảnh báo mềm, không bao giờ chặn — đây là con số gợi ý, không phải quy chuẩn.

### SPEC-033 — Lưu vết cảnh báo lúc chốt bữa

- **Nguồn:** `F24`, [BR-053](what-we-gonna-eat-today_business-rules_v1.7.md)
- **Đầu vào:** `{ sessionId, warnings: RuleViolation[], acknowledgedBy: string }`
- **Đầu ra:** `void` (ghi `finalize_warnings`)
- **Quy tắc:**
  - Ghi **trong cùng giao dịch** với `SPEC-016` — bất biến `Atomic Finalize` của [Business Rules §23](what-we-gonna-eat-today_business-rules_v1.7.md).
  - Chốt bữa không có cảnh báo nào thì **không** ghi dòng nào; bảng rỗng nghĩa là mọi lần chốt đều sạch.
  - Chỉ ghi cảnh báo Creator thực sự bỏ qua, không ghi cảnh báo đã được xử lý bằng cách thêm món.

## 8.5 Vận hành tối thiểu (Epic E11)

### SPEC-034 — Tự động đóng phiên quá hạn

- **Nguồn:** `US-010`, `F26`, [BR-055](what-we-gonna-eat-today_business-rules_v1.7.md)
- **Đầu vào:** `{ groupId, referenceDate }`
- **Đầu ra:** `{ invalidatedSessionIds: string[] }`
- **Quy tắc:**
  - Phiên `DRAFT` hoặc `ACTIVE` có `decision_date < referenceDate` chuyển sang `INVALID`.
  - `referenceDate` quy đổi theo timezone của Group qua `SPEC-018`, **không** dùng `new Date()` tại chỗ.
  - Xét **lười** khi mở phiên mới, không cần cron. Quy mô sản phẩm không biện minh nổi cho một tiến trình nền.
  - Tương tác của phiên `INVALID` được **bảo toàn** nhưng không tính vào bất kỳ phép tính nào — [BR-061](what-we-gonna-eat-today_business-rules_v1.7.md).
  - Phiên `INVALID` **không** chặn tạo phiên mới cùng ngày; partial unique index chỉ tính `ACTIVE`/`FINALIZED`.

### SPEC-035 — Gỡ Dish khỏi Group Dish Pool

- **Nguồn:** `US-004`, `F27`, [BR-005](what-we-gonna-eat-today_business-rules_v1.7.md)
- **Đầu vào:** `{ groupId, groupDishId }` (yêu cầu quyền Admin)
- **Đầu ra:** `{ state: INACTIVE }`
- **Quy tắc:**
  - Chuyển `ACTIVE` $\to$ `INACTIVE`, **không** xoá dòng — lịch sử ăn và tương tác cũ vẫn phải tra ngược được.
  - Món `INACTIVE` biến khỏi phần đuôi chưa xem của deck đang chạy; phần đã xem giữ nguyên (`SPEC-028`).
  - Thêm lại là tạo dòng mới, **không** khôi phục tag cũ — `F46` ngoài phạm vi theo [DEC-009](what-we-gonna-eat-today_decision-log_v3.9.md).

---

# 9. Các điểm lưu ý kiến trúc

> [!IMPORTANT]
> **Độc lập đếm Tag (Independent Tag Counting):**  
> Khi đánh giá Required Rules (`SPEC-016`), nếu một món mang cả 2 tag `MAIN` và `SOUP` (vd: *Bò kho bánh mì*), món này sẽ đóng góp độc lập vào cả 2 quy định `Required MAIN` và `Required SOUP`. Tuyệt đối không phân bổ độc quyền kiểu slot allocation.

> [!IMPORTANT]
> **Một món chỉ thuộc một chặng (`SPEC-030`):** Quy tắc trên **không** áp cho việc chia chặng. Đếm tag là phép cộng trên một tập đã chốt; chia chặng là phép phân hoạch trên một danh sách sẽ được vuốt. Cho món hai tag xuất hiện ở hai chặng nghĩa là người dùng vuốt nó hai lần và $P$ của [BR-049](what-we-gonna-eat-today_business-rules_v1.7.md) bị đếm trùng.

> [!IMPORTANT]
> **Feature `preference` là feature thứ chín.** `SPEC-024`/`SPEC-025` sống trong `src/features/preference/`. v1.1 mở thêm **hai** chiều phụ thuộc, cả hai phải được khai trong `ALLOWED_CROSS_FEATURE` của `eslint.config.mjs`, bổ sung vào `yarn arch:probe` và ghi vào [Tech Spec §2.3](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) — hiện mới có đúng 5 chiều được phép:
>
> - `selection → preference` — `listDeck` lọc cứng món `Cannot Eat` và đọc $E$ để tính điểm.
> - `meal → preference` — `finalizeSession` cần tập người đã khai `Cannot Eat` để áp ngoại lệ `BR-056`.
>
> Chiều thứ hai dễ bị bỏ sót vì `SPEC-017` nằm trong `history`, nhưng hàm thuần `defaultEatingHistory` **nhận** tập ngoại lệ qua tham số chứ không tự truy vấn — nên chỗ phải đọc dữ liệu là `meal`, không phải `history`.

---

# 10. Lịch sử thay đổi (Change History)

| Version | Ngày | Phần tác động | Nội dung thay đổi | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- | :--- |
| `1.3` | 2026-08-26 | §1.2, §8, §9 | Bổ sung §8 với `SPEC-024`→`SPEC-035` cho 11 tính năng v1.1; ba lưu ý kiến trúc mới (một món một chặng, feature `preference`) | [DEC-056](what-we-gonna-eat-today_decision-log_v3.9.md) → [DEC-060](what-we-gonna-eat-today_decision-log_v3.9.md) |
| `0.2` | 2026-08-14 | §1, §6, §7 | Kéo `F17`, `F20`, `F21` vào v1.0; thêm `SPEC-020→022` | Quyết định mở rộng baseline v1.0 |
| `0.1` | 2026-08-14 | Toàn bộ | Bản thảo đầu tiên: 19 spec cho 14 tính năng | Khởi tạo baseline SDD |
