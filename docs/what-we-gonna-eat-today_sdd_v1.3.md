# 📐 Software Design Document (SDD) — What We Gonna Eat Today

> **Document Metadata**
>
> - **Version:** `1.4` | **Status:** `Approved`
> - **Created:** `2026-08-14` | **Last Updated:** `2026-09-04`
> - **Supersedes:** `v1.3` | **Upstream:** [PRD](what-we-gonna-eat-today_prd_v1.5.md) • [Business Rules](what-we-gonna-eat-today_business-rules_v1.8.md) • [Ranking Spec](what-we-gonna-eat-today_ranking-specification_v1.3.md)
> - **Downstream:** [Tech Spec & Architecture](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) • [Test Cases](what-we-gonna-eat-today_test-cases-specification_v1.1.md) • [Master Plan](what-we-gonna-eat-today_master-plan_v2.1.md)
>
> 📌 *Tài liệu đặc tả chi tiết 36 module kỹ thuật (`SPEC-001` đến `SPEC-036`): 23 spec cho v1.0 và phần bảo trì sau phát hành, 13 spec cho v1.1. Mỗi kịch bản (Scenario) trong tài liệu này ánh xạ 1–1 thành một Test Case tự động.*

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
   - [8.2 Deck ngắn và có nhịp (E8)](#82-deck-ngắn-và-có-nhịp-epic-e8) — `SPEC-026`, `SPEC-027`, `SPEC-028`, `SPEC-036`
   - [8.3 Chế độ vuốt theo chặng (E9)](#83-chế-độ-vuốt-theo-chặng-epic-e9) — `SPEC-029`, `SPEC-030`
   - [8.4 Chốt bữa có hướng dẫn mềm (E10)](#84-chốt-bữa-có-hướng-dẫn-mềm-epic-e10) — `SPEC-031`, `SPEC-032`, `SPEC-033`
   - [8.5 Vận hành tối thiểu (E11)](#85-vận-hành-tối-thiểu-epic-e11) — `SPEC-034`, `SPEC-035`
9. [Spec — Phiên bản v1.2](#9-spec--phiên-bản-v12)
   - [9.1 Học sở thích tự động (E13)](#91-học-sở-thích-tự-động-epic-e13) — `SPEC-037`, `SPEC-038`, `SPEC-039`, `SPEC-040`
   - [9.2 Ba món nợ của v1.1 (E14)](#92-ba-món-nợ-của-v11-epic-e14) — `SPEC-041`, `SPEC-042`
10. [Các điểm lưu ý kiến trúc](#10-các-điểm-lưu-ý-kiến-trúc)
11. [Lịch sử thay đổi (Change History)](#11-lịch-sử-thay-đổi-change-history)

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

## 1.2 Danh mục 12 tính năng của v1.1

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

## 1.3 Danh mục 7 tính năng của v1.2

Chi tiết ở [§9](#9-spec--phiên-bản-v12). Phạm vi cắt theo [DEC-069](what-we-gonna-eat-today_decision-log_v3.9.md) — 9 tính năng còn lại của Master Plan §13.2 hoãn sang v1.3.

| Mã | Tính năng | Epic | Mã SPEC liên quan |
| :---: | :--- | :---: | :--- |
| `F30` | Implicit Preference (học từ lịch sử vuốt) | E13 | `SPEC-037` |
| `F31` | Blacklist | E13 | `SPEC-038` |
| `F32` | History Whitelist | E13 | `SPEC-039` |
| `F39` | Quên sở thích đã học | E13 | `SPEC-040` |
| `F25` | Gỡ Participant giữa phiên | E14 | `SPEC-041` |
| `F28` | Điều chỉnh Eating History hôm nay | E14 | `SPEC-042` |
| `F29` | Phát hiện trùng tên món | E14 | `SPEC-005` (polish, không có SPEC riêng) |


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

- **Nguồn:** [BR-020](what-we-gonna-eat-today_business-rules_v1.8.md), `BR-025`
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

- **Nguồn:** [BR-006](what-we-gonna-eat-today_business-rules_v1.8.md), `BR-007`, `BR-008`
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

- **Nguồn:** `US-001`, `F02`, [BR-006](what-we-gonna-eat-today_business-rules_v1.8.md)
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

- **Nguồn:** `US-002`, `F03`, [BR-001](what-we-gonna-eat-today_business-rules_v1.8.md)
- **Đầu vào:** `{ groupId, name: string (1..120), systemTags: SystemTag[] (0..5), forceCreate?: boolean }`
- **Đầu ra:** `GroupDish` | `{ existingCandidates: GlobalDish[] }` | `Failure`
- **Quy tắc:** Chuẩn hóa tên (cắt khoảng trắng thừa, chuyển chữ thường, bỏ dấu tiếng Việt) thành `normalized_name`. Nếu tìm thấy món trùng, trả về danh sách gợi ý; nếu có cờ `forceCreate = true`, tạo Global Dish mới kèm provenance.
- **Ghi chú (DEC-053):** Nhánh "dùng lại món có sẵn" (`addExistingDishToGroup`, ngoài hợp đồng này — xem `DEC-029`) nay cũng nhận `systemTags` và ghi đè toàn bộ tag của món trong Group.

### SPEC-006 — Gán System Tag cho Dish trong Group

- **Nguồn:** `US-003`, `F04`, [BR-003](what-we-gonna-eat-today_business-rules_v1.8.md)
- **Đầu vào:** `{ groupId, dishId, systemTags: SystemTag[] }` (Yêu cầu quyền Group Admin)
- **Đầu ra:** `GroupDish` | `Failure`
- **Quy tắc:** Ghi đè toàn bộ tag của món ăn trong Group hiện tại; hoàn toàn độc lập và không ảnh hưởng Group khác.

---

# 5. Spec — Phiên chọn món (Session Specs)

### SPEC-007 — Khởi tạo Session Draft

- **Nguồn:** `US-008`, `F05`, [BR-020](what-we-gonna-eat-today_business-rules_v1.8.md), `BR-025`
- **Đầu vào:** `{ groupId }`
- **Đầu ra:** `Session` (State: `DRAFT`) | `Failure`
- **Quy tắc:** Nếu nhóm đã có phiên `ACTIVE` hoặc `FINALIZED` cùng ngày → `ERR_SESSION_EXISTS_TODAY`.

### SPEC-008 — Bắt đầu Session (Start Session)

- **Nguồn:** `US-008`, `F05`, [BR-021](what-we-gonna-eat-today_business-rules_v1.8.md), `BR-025`
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

- **Nguồn:** `US-009`, `F06`, [BR-026](what-we-gonna-eat-today_business-rules_v1.8.md)
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

- **Nguồn:** `US-011`, `F08`, `F09`, [BR-040→042](what-we-gonna-eat-today_business-rules_v1.8.md)
- **Đầu vào:** `{ sessionId, dishId, action: SWIPE_RIGHT | SWIPE_LEFT | UNDO }`
- **Đầu ra:** `{ effectiveInteraction: InteractionType | null }`
- **Quy tắc:** Upsert vào `interactions` (chỉ giữ 1 trạng thái hiệu lực); đồng thời append vào `interaction_events` để lưu vết audit log.

### SPEC-013 — Đánh dấu Completed & Mở lại

- **Nguồn:** `US-014`, `F10`, [BR-044](what-we-gonna-eat-today_business-rules_v1.8.md)
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

- **Nguồn:** `US-016`, `F12`, [BR-050](what-we-gonna-eat-today_business-rules_v1.8.md)
- **Đầu vào:** `{ sessionId, dishIds: string[] }` (Yêu cầu Creator)
- **Quy tắc:** Cho phép chọn bất kỳ món nào trong nhóm (kể cả món chưa ai vuốt), không kích hoạt validate rule ở bước nháp.

### SPEC-016 — Chốt bữa chính thức (Finalize)

- **Nguồn:** `US-016`, `F12`, `F13`, [BR-052](what-we-gonna-eat-today_business-rules_v1.8.md)
- **Đầu vào:** `{ sessionId }` (Yêu cầu Creator)
- **Đầu ra:** `FinalMeal` | `Failure`
- **Quy tắc:**
  1. Kiểm tra danh sách món không rỗng.
  2. Đánh giá `Required Rules` theo **Session Rule Snapshot** kết hợp với **System Tag hiện tại** của món.
  3. Nếu thiếu quy tắc bắt buộc $\to$ trả `ERR_REQUIRED_RULE_FAILED` và phiên vẫn giữ `ACTIVE`.
  4. Nếu hợp lệ: Chuyển state `FINALIZED`, tạo `final_meals` và tự động sinh `eating_history` trong cùng 1 database transaction.

### SPEC-017 — Tự động sinh Default Eating History

- **Nguồn:** `US-018`, `F14`, [BR-056](what-we-gonna-eat-today_business-rules_v1.8.md)
- **Đầu vào:** `FinalMeal`
- **Quy tắc:** Sinh bản ghi ăn uống cho toàn bộ Participant hiện tại với ngày `eating_date = session.decision_date`. Đảm bảo tính Idempotent qua `source_final_meal_id`.

---

# 7. Spec — Cooldown & Quy định bữa ăn (Cooldown & Rules Specs)

### SPEC-020 — Tính toán Recency Penalty

- **Nguồn:** `F17`, [BR-046](what-we-gonna-eat-today_business-rules_v1.8.md), [Ranking Spec §2.2](what-we-gonna-eat-today_ranking-specification_v1.3.md)
- **Đầu vào:** `{ userId, dishId, referenceDate }`
- **Đầu ra:** $R \in [0, 1]$
- **Công thức:**
  $$R = \max\left(0, 1 - \frac{d}{7}\right)$$
  *(Với $d$ là số ngày lịch kể từ lần ăn gần nhất).*

### SPEC-021 — Cấu hình Group Required Rules

- **Nguồn:** `F20`, [BR-010](what-we-gonna-eat-today_business-rules_v1.8.md), `BR-013`
- **Đầu vào:** `{ groupId, rules: [{ systemTag: SystemTag, minimumCount: number }] }` (Yêu cầu Group Admin)
- **Quy tắc:** Ghi đè toàn bộ danh sách quy định; `minimumCount` phải $\ge 1$; không cho phép trùng lặp tag.

### SPEC-022 — Snapshot Session Rules

- **Nguồn:** `F21`, [BR-015](what-we-gonna-eat-today_business-rules_v1.8.md), `BR-016`
- **Đầu vào:** `{ sessionId }`
- **Quy tắc:** Đóng băng bản sao các quy định mâm cơm của Group tại thời điểm Start. Admin chỉnh sửa Group Rule sau đó sẽ không làm đổi luật của phiên đang chạy.

### SPEC-023 — Gợi ý món từ Global Dish Pool (Catalog Search)

- **Nguồn:** `US-002`, [BR-001](what-we-gonna-eat-today_business-rules_v1.8.md), [DEC-055](what-we-gonna-eat-today_decision-log_v3.9.md)
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

- **Nguồn:** `US-005`, `F15`, [BR-034](what-we-gonna-eat-today_business-rules_v1.8.md), [DEC-060](what-we-gonna-eat-today_decision-log_v3.9.md)
- **Đầu vào:** `{ globalDishId, cannotEat: boolean }` (người gọi là chính chủ)
- **Đầu ra:** `{ removedInteraction: boolean }`
- **Quy tắc:**
  - Ràng buộc gắn theo `global_dishes.id`, **không** theo `group_dishes.id` — người dị ứng tôm thì dị ứng ở mọi nhóm.
  - Bật `cannotEat` **xoá tương tác Swipe đã có** của người đó với món đó trong phiên `ACTIVE` hiện hành. Giữ lại sẽ khiến $+1.0$ của $P$ và $-1.0$ của $X$ triệt tiêu nhau trong `SPEC-014`, và cả nhà thấy một món trung tính trong khi sự thật là có người không ăn được.
  - Món bị đánh dấu **bị lọc cứng** khỏi deck ở Stage 1, không phải hạ điểm.
  - Gỡ đánh dấu **không** khôi phục tương tác đã xoá.

### SPEC-025 — Đặt Explicit Preference (Like / Dislike)

- **Nguồn:** `US-006`, `F16`, [BR-037](what-we-gonna-eat-today_business-rules_v1.8.md)
- **Đầu vào:** `{ globalDishId, preference: LIKE | DISLIKE | null }`
- **Đầu ra:** `{ preference: LIKE | DISLIKE | null }`
- **Quy tắc:**
  - Ánh xạ sang $E$: `LIKE` $\to +1$, `null` $\to 0$, `DISLIKE` $\to -1$.
  - `DISLIKE` **không** lọc món khỏi deck — chỉ hạ điểm qua $w_{\text{explicit}} = 0.30$. Cho `DISLIKE` quyền lọc thì nó chập làm một với `Cannot Eat` và người dùng mất cách diễn đạt sắc thái nhẹ.
  - `null` là gỡ về `Neutral`, không phải một giá trị enum thứ ba trong CSDL.

## 8.2 Deck ngắn và có nhịp (Epic E8)

### SPEC-026 — Cắt trần số thẻ (Deck Size Cap)

- **Nguồn:** `F49`, [BR-062](what-we-gonna-eat-today_business-rules_v1.8.md), [Ranking Spec §2.4](what-we-gonna-eat-today_ranking-specification_v1.3.md), [DEC-058](what-we-gonna-eat-today_decision-log_v3.9.md)
- **Đầu vào:** `{ orderedDishIds: string[], maxCards: 30 }`
- **Đầu ra:** `cappedDishIds: string[]` (độ dài $\le 30$)
- **Quy tắc:**
  - Hàm thuần, không chạm CSDL — cùng khuôn `getDeckPage` của `SPEC-011`.
  - Chạy **sau** `SPEC-027`, không bao giờ trước. Đây là bất biến `Cap After Blend` của [Business Rules §23](what-we-gonna-eat-today_business-rules_v1.8.md).
  - Deck ngắn hơn 30 thì trả nguyên vẹn, không đệm thêm.

### SPEC-027 — Trộn luồng Exploit / Explore

- **Nguồn:** `US-012`, `F18`, [BR-047](what-we-gonna-eat-today_business-rules_v1.8.md), [Ranking Spec §2.3](what-we-gonna-eat-today_ranking-specification_v1.3.md)
- **Đầu vào:** `{ exploit: DishCandidate[], explore: DishCandidate[], blockSize: 5 }`
- **Đầu ra:** `blendedDishIds: string[]`
- **Quy tắc:**
  - Mỗi khối 5 vị trí: 4 thẻ Exploit + 1 thẻ Explore ở vị trí thứ 5.
  - Tập Explore: món chưa từng ăn hoặc $d \ge 30$ ngày, chưa bị `DISLIKE`, sắp theo $d$ giảm dần.
  - Một luồng cạn thì khối còn lại lấy trọn từ luồng kia — không để chỗ trống.
  - Mỗi thẻ mang cờ `lane: EXPLOIT | EXPLORE` ra tới tầng presentation, phục vụ chip `reason` đổi màu.

### SPEC-028 — Materialize và đóng băng Deck

- **Nguồn:** `US-013`, `F19`, [BR-048](what-we-gonna-eat-today_business-rules_v1.8.md), `DEC-064`
- **Đầu vào:** `{ sessionId, userId, orderedDishIds }`
- **Đầu ra:** `{ outcome: MATERIALIZED | ALREADY_MATERIALIZED }`
- **Quy tắc:**
  - Deck được materialize vào `session_decks` **đúng một lần** cho mỗi `(session, user)` và **không bao giờ được sắp xếp lại** trong phiên. Đây là cam kết mạnh hơn "đóng băng thẻ `index < cursor`" và bao hàm nó.
  - Món mất tư cách giữa phiên (`INACTIVE`, `Cannot Eat`) **rơi khỏi** deck ở lần đọc kế tiếp — phép lọc nằm ở tầng đọc, bảng chỉ lưu thứ tự.
  - Món mới thêm vào nhóm giữa phiên **không** chen vào deck đang chạy; nó không nằm trong `ordered_dish_ids`.
  - Đổi `Like`/`Dislike` giữa phiên **không** sắp lại thứ tự — có hiệu lực từ phiên sau.
  - Deck co lại dưới trần `BR-062` do lọc thì **không** bù thêm thẻ; bù thẻ chính là tính lại.

> [!NOTE]
> Phiên bản trước của spec này mô tả một phép **tính lại có chọn lọc** (giữ `index < cursor`, sắp lại phần đuôi). Cơ chế đó chưa từng được xây và `DEC-064` quyết định không xây: hành vi thật từ E4 là đóng băng toàn phần, vốn đã mạnh hơn. Một spec lỏng hơn code thật là chỗ mà lần refactor sau sẽ nới code cho "đúng đặc tả" rồi làm hỏng thứ đang chạy tốt.

### SPEC-036 — Suy vị trí tiếp tục khi mở lại phiên

- **Nguồn:** `F51`, `DEC-065`
- **Đầu vào:** `dishes: DishCard[]` (đã mang `effectiveInteraction`)
- **Đầu ra:** `{ cursor: number, marks: Array<'yes' | 'no' | 'cannot'> }`
- **Quy tắc:**
  - `cursor` = vị trí **sau thẻ cuối cùng** có `effectiveInteraction !== null`. **Không** phải vị trí thẻ đầu tiên có `null`: một thẻ đã Undo ở giữa để lại lỗ `null`, và cách sau sẽ kéo người dùng lùi về đó rồi bắt vuốt lại toàn bộ phần đuôi.
  - `marks` sinh cho đúng tiền tố `[0, cursor)` — bất biến `marks.length === cursor`.
  - Thẻ trong tiền tố có `effectiveInteraction === null` (đã Undo) đánh `'cannot'`: đó là giá trị duy nhất không góp vào `yesCount` lẫn `noCount`, khớp ngữ nghĩa "đã đi qua, không còn ý kiến".
  - Hàm thuần, chạy ở tầng `presentation`. **Không** lưu cursor xuống CSDL — lưu nghĩa là thêm một lượt ghi vào mỗi lượt vuốt, tức vào đúng đường nóng `NFR-02`.

## 8.3 Chế độ vuốt theo chặng (Epic E9)

### SPEC-029 — Snapshot Session Course lúc Start

- **Nguồn:** `F50`, [BR-063](what-we-gonna-eat-today_business-rules_v1.8.md), [DEC-059](what-we-gonna-eat-today_decision-log_v3.9.md)
- **Đầu vào:** `{ sessionId, deckMode: FREE | COURSE, courses: SystemTag[] }` (theo thứ tự Creator sắp)
- **Đầu ra:** `void` (ghi `selection_sessions.deck_mode` và `session_courses`)
- **Quy tắc:**
  - Chạy **trong cùng giao dịch** `startDraft` với snapshot `session_rules` (`SPEC-022`).
  - `deck_mode = COURSE` mà `courses` rỗng $\to$ `ERR_VALIDATION`.
  - Mỗi System Tag xuất hiện **tối đa một lần**; `position` bắt đầu từ 0.
  - Bảng `session_courses` không có cột `id` — khoá tự nhiên `(session_id, position)`, đúng khuôn `session_rules` theo [DEC-044](what-we-gonna-eat-today_decision-log_v3.9.md).
  - Sau khi phiên `ACTIVE`, đổi cấu hình nhóm **không** tác động tới phiên đang chạy.

### SPEC-030 — Dựng Deck theo chặng và phân bổ hạn mức

- **Nguồn:** `F50`, [BR-063](what-we-gonna-eat-today_business-rules_v1.8.md), [Ranking Spec §2.5](what-we-gonna-eat-today_ranking-specification_v1.3.md)
- **Đầu vào:** `{ orderedDishIds: string[], tagsByDishId: Map<string, SystemTag[]>, courses: SystemTag[], maxCards: 30 }` — danh sách **đã sắp theo Personal Score**, **chưa** trộn Explore và **chưa** cắt trần
- **Đầu ra:** `courseDecks: { systemTag: SystemTag, dishIds: string[] }[]`
- **Quy tắc:**
  - **Trần `BR-062` cắt TRONG TỪNG CHẶNG, không cắt chung rồi chia.** Pipeline ở chế độ `COURSE` là: lọc → xếp → **chia theo tag** → (trộn Explore + cắt hạn mức) trong từng chặng → nối lại theo thứ tự chặng → materialize.
  - Hạn mức cơ sở mỗi chặng $= \lfloor 30 / n \rfloor$. Chặng không dùng hết hạn mức thì phần dư chia lại cho các chặng còn thiếu, **lặp** cho tới khi không còn phân bổ được nữa — một vòng không đủ, vì chia lại có thể làm chặng khác chạm trần và sinh dư mới.
  - Thứ tự tương đối bên trong mỗi chặng **giữ nguyên** thứ tự của `SPEC-010`.
  - Món mang nhiều tag thuộc nhiều chặng chỉ xuất hiện ở **chặng đầu tiên** khớp theo **thứ tự Creator sắp** — nếu không, người dùng vuốt cùng một món hai lần và $P$ bị đếm trùng.
  - Món **không khớp chặng nào** bị loại khỏi deck ở chế độ `COURSE`: chọn ba chặng nghĩa là tối nay chỉ duyệt ba loại món đó.
  - `deck_mode = FREE` $\to$ `SPEC-030` không chạy; pipeline đi đường `SPEC-026` như cũ.
  - `session_decks` **không** đổi schema — vẫn lưu một mảng id phẳng. Nhóm theo chặng suy lại ở mỗi lần đọc từ mảng phẳng + tag món + `session_courses`, cùng khuôn `lane` của `SPEC-027`.

> [!CAUTION]
> **Cắt trần trước rồi mới chia chặng sẽ làm rỗng chặng.** Personal Score ở v1.1 chỉ có hai số hạng ($E$, $R$), nên một nhóm vừa ăn canh hôm qua sẽ đẩy toàn bộ món canh xuống đuôi bảng cùng lúc — top-30 không còn món `SOUP` nào, và chặng Canh rỗng dù danh mục có 15 món canh. Deck vẫn đủ thẻ, vẫn chạy, không lỗi nào. Đây là cùng lớp lỗi với `DEC-058` (cắt trần trước khi trộn Explore), ở một tầng cao hơn. Xem [`DEC-066`](what-we-gonna-eat-today_decision-log_v3.9.md) và `TC-152`.

## 8.4 Chốt bữa có hướng dẫn mềm (Epic E10)

### SPEC-031 — Đánh giá Preferred Rule (cảnh báo mềm)

- **Nguồn:** `US-019`, `F22`, [BR-014](what-we-gonna-eat-today_business-rules_v1.8.md), [BR-052](what-we-gonna-eat-today_business-rules_v1.8.md)
- **Tên hàm:** `evaluateRules` — đổi từ `evaluateRequired`, vì nó nay đánh giá cả hai loại luật
- **Đầu vào:** `{ rules: SessionRule[], dishes: TaggedDish[], targetDishCount: number | null }`
- **Đầu ra:** `{ blocking: RuleShortfall[], warnings: RuleWarning[] }`
- **Quy tắc:**
  - `REQUIRED` thiếu $\to$ `blocking`, chặn Finalize. `PREFERRED` thiếu $\to$ `warnings`, **không** chặn.
  - **Trường `satisfied` bị xoá.** Người gọi đọc `blocking.length === 0`. Giữ nó thì tên trường nói dối: một nháp có `warnings` vẫn "satisfied", và người đọc lướt sẽ hiểu ngược.
  - **`RuleWarning` là union có thẻ**, không phải một hình dạng duy nhất:
    - `{ kind: 'PREFERRED_SHORTFALL', systemTag, minimumCount, actual, missing }`
    - `{ kind: 'TARGET_COUNT', direction: 'OVER' | 'UNDER', target, actual }`

    Lệch Target Count **không gắn System Tag nào**. Ép nó vào hình dạng của `RuleShortfall` buộc phải bịa một `systemTag` giả, và `ruleShortfallPhrase` tra thẳng `TAG_IN_SENTENCE[systemTag]` sẽ in ra một cụm từ vô nghĩa.
  - Vẫn áp Independent Tag Counting của §9 cho cả hai loại. Vòng lặp ngoài **phải** theo `rules`; lọc thành hai mảng rồi chạy hai vòng lặp có thân giống nhau là chỗ chúng sẽ lệch.
  - Hàm thuần, chạy ở **cả** client (`FinalizeBar`, `BR-051` Live Composition Feedback) lẫn server (`finalizeSession` bước 6) — không đọc `Date`, không đọc config toàn cục.

### SPEC-032 — Target Dish Count

- **Nguồn:** `F23`, [BR-011](what-we-gonna-eat-today_business-rules_v1.8.md), [BR-015](what-we-gonna-eat-today_business-rules_v1.8.md)
- **Lưu trữ:** **hai cột nullable** — `groups.target_dish_count` (cấu hình) và `selection_sessions.target_dish_count` (bản đông cứng lúc Start)
- **Đầu vào:** `{ selectedCount: number, targetCount: number | null }`
- **Đầu ra:** `RuleWarning | null` với `kind: 'TARGET_COUNT'`
- **Quy tắc:**
  - `targetCount = null` (nhóm chưa đặt) $\to$ không cảnh báo. **Không** dùng `DEFAULT 0`: nó biến "chưa đặt" thành "mục tiêu 0 món" và cảnh báo mọi bữa.
  - Lệch theo cả hai chiều đều cảnh báo, và cảnh báo nói rõ chiều lệch.
  - Luôn là cảnh báo mềm, không bao giờ chặn — đây là con số gợi ý, không phải quy chuẩn.
  - **Đông cứng lúc Start**, cùng lý lẽ `BR-015` đã áp cho Session Rule: Admin đổi cấu hình giữa phiên không được đổi luật của phiên đang chạy. Giá trị đọc từ `groups` **trước** `db.batch()` rồi truyền vào, và set trong chính câu UPDATE của `startDraft` — không thêm câu lệnh nào vào batch.

### SPEC-033 — Lưu vết cảnh báo lúc chốt bữa

- **Nguồn:** `F24`, [BR-053](what-we-gonna-eat-today_business-rules_v1.8.md)
- **Đầu vào:** `{ sessionId, warnings: RuleViolation[], acknowledgedBy: string }`
- **Đầu ra:** `void` (ghi `finalize_warnings`)
- **Quy tắc:**
  - Ghi **trong cùng giao dịch** với `SPEC-016` — bất biến `Atomic Finalize` của [Business Rules §23](what-we-gonna-eat-today_business-rules_v1.8.md).
  - Chốt bữa không có cảnh báo nào thì **không** ghi dòng nào; bảng rỗng nghĩa là mọi lần chốt đều sạch.
  - Chỉ ghi cảnh báo Creator thực sự bỏ qua, không ghi cảnh báo đã được xử lý bằng cách thêm món.

## 8.5 Vận hành tối thiểu (Epic E11)

### SPEC-034 — Tự động đóng phiên quá hạn

- **Nguồn:** `US-010`, `F26`, [BR-055](what-we-gonna-eat-today_business-rules_v1.8.md)
- **Đầu vào:** `{ groupId, referenceDate }`
- **Đầu ra:** `void`
- **Quy tắc:**
  - Phiên `DRAFT` hoặc `ACTIVE` có `decision_date < referenceDate` chuyển sang `INVALID`. Phiên `FINALIZED` của ngày cũ **không** bị đụng — một bữa đã chốt hôm qua là dữ liệu đúng.
  - **Hai điểm xét, không phải một:**
    1. **Quét lười** ở Group Hub — một `UPDATE` **idempotent** (không đọc-rồi-ghi, chạy lần hai không khớp dòng nào). Đó là điều kiện duy nhất khiến gọi nó trong render của một Server Component là hợp lệ.
    2. **Chốt chặn** trong `SPEC-016` bước 1: `session.decision_date < hôm nay` $\to$ `ERR_SESSION_NOT_ACTIVE`, **độc lập với nhịp quét**.
  - Không cron, không tiến trình nền. Quy mô sản phẩm không biện minh nổi cho chúng.
  - `referenceDate` quy đổi theo timezone của Group qua `SPEC-018`.
  - Tương tác của phiên `INVALID` được **bảo toàn** — [BR-061](what-we-gonna-eat-today_business-rules_v1.8.md). Việc "không tính vào phép nào" **tự đúng bằng cấu trúc**: `countInteractionsByDish` và `listRankingParticipantUserIds` đều lọc theo một `sessionId`, nên tương tác của phiên này không bao giờ lọt sang phiên khác. Không cần viết gì, nhưng cần một test ghim.
  - Phiên `INVALID` **không** chặn tạo phiên mới cùng ngày; partial unique index chỉ tính `ACTIVE`/`FINALIZED`.

> [!CAUTION]
> **Quét đơn thuần là không đủ.** Phiên `ACTIVE` bỏ dở từ hôm qua không hiện trên Group Hub và không chặn gì, nhưng vẫn mở được qua `/sessions/<id>` và **vẫn chốt được** — `SPEC-016` bước 1 vốn chỉ kiểm `state`. Chốt nó hôm nay ghi `eating_history` mang ngày **hôm qua**, và `SPEC-020` trừ điểm những món cả nhà thật ra chưa ăn, suốt bảy ngày. Đó là lý do phải có điểm xét thứ hai. Xem [`DEC-068`](what-we-gonna-eat-today_decision-log_v3.9.md).

### SPEC-035 — Gỡ Dish khỏi Group Dish Pool

- **Nguồn:** `US-004`, `F27`, [BR-005](what-we-gonna-eat-today_business-rules_v1.8.md)
- **Đầu vào:** `{ groupId, groupDishId, requestedByUserId }` — yêu cầu quyền **Admin** ([BR-008](what-we-gonna-eat-today_business-rules_v1.8.md)), cùng khuôn `SPEC-006`
- **Đầu ra:** `void`
- **Quy tắc:**
  - Chuyển `ACTIVE` $\to$ `INACTIVE`, **không** xoá dòng — lịch sử ăn và tương tác cũ vẫn phải tra ngược được.
  - Món `INACTIVE` biến khỏi phần đuôi chưa xem của deck đang chạy; phần đã xem giữ nguyên (`SPEC-028`, `TC-108`). Không viết cơ chế mới cho việc này.
  - **Thêm lại hồi sinh CHÍNH DÒNG CŨ**, không tạo dòng mới: `group_dishes_group_global_unique(group_id, global_dish_id)` khiến dòng thứ hai không tồn tại được, và `reactivateGroupDish` chỉ lật `state` (`TC-020`).
  - Gỡ món **không** đụng `group_dish_tags`, nên thêm lại thì nhãn còn nguyên. Xoá nhãn khi gỡ sẽ khiến món thêm lại rơi vào "Chưa phân nhãn" — đúng thứ [`DEC-053`](what-we-gonna-eat-today_decision-log_v3.9.md) đã chống cho luồng dùng lại món.
  - Gỡ hết món của nhóm thì `SPEC-007` chặn mở phiên bằng `ERR_GROUP_HAS_NO_DISH` — `countActiveInGroup` giữ nguyên nghĩa.

> [!NOTE]
> Phiên bản trước của spec này ghi *"Thêm lại là tạo dòng mới"*. Sai: unique index trên `(group_id, global_dish_id)` không cho phép, và `TC-020` khẳng định ngược lại. `F46` ("khôi phục metadata khi thêm lại") nói về một bài toán khác và vẫn ngoài phạm vi — nó không mô tả hành vi của `group_dishes`.

---

# 9. Spec — Phiên bản v1.2

> [!NOTE]
> `SPEC-037` → `SPEC-042` đặc tả 7 tính năng của v1.2 theo [Master Plan §13.2](what-we-gonna-eat-today_master-plan_v2.1.md). Phạm vi đã được cắt ngày 2026-09-04 — xem [DEC-069](what-we-gonna-eat-today_decision-log_v3.9.md). `F29` (phát hiện trùng tên) **không có SPEC riêng**: nó là phần polish của `SPEC-005`, không phải cơ chế mới.

## 9.1 Học sở thích tự động (Epic E13)

### SPEC-037 — Tính Implicit Preference ($I$)

- **Nguồn:** `F30`, [BR-038](what-we-gonna-eat-today_business-rules_v1.8.md), [Ranking Spec §2.2](what-we-gonna-eat-today_ranking-specification_v1.3.md), [DEC-036](what-we-gonna-eat-today_decision-log_v3.9.md)
- **Đầu vào:** `{ userId, globalDishIds, referenceDate, implicitResetAt: string | null }`
- **Đầu ra:** `Map<globalDishId, I>` với $I \in [-1, 1]$; món không có lượt vuốt nào **không có mặt** trong Map (người gọi dùng `?? 0`) — cùng khuôn `countRecentEatersByDish` của `SPEC-014`.
- **Quy tắc:**
  - Chỉ học từ phiên `FINALIZED`. Phiên `ACTIVE` đang chạy chưa phải một quyết định; phiên `INVALID` là một quyết định đã bị huỷ.
  - Nguồn dữ liệu là bảng `interactions` (trạng thái **hiệu lực**), **không** phải `interaction_events`. `interaction_events` là nhật ký append-only ghi cả request bị từ chối; học từ nó nghĩa là học cả những lượt vuốt người dùng đã Undo.
  - Tuổi của một lượt vuốt tính theo `selection_sessions.decision_date`, không theo `interactions.updated_at`: cái đầu là ngày người ta ăn, cái sau đổi mỗi lần đổi ý trong cùng phiên.
  - $\text{Weight}(t) = 0.5^{\text{AgeDays}(t)/60}$, $R_w = \sum \text{Weight}$ (Swipe Right), $L_w = \sum \text{Weight}$ (Swipe Left), $I = \dfrac{R_w - L_w}{R_w + L_w + 3}$.
  - $R_w = L_w = 0$ cho $I = 0$, **không** phải `NaN` — mẫu số luôn $\ge K_{\text{prior}} = 3$ nên phép chia không bao giờ chạm 0. Đây cũng là lý do $K_{\text{prior}}$ tồn tại: một món vuốt phải đúng một lần chỉ đạt $I = 0.25$, chứ không nhảy thẳng lên $1.0$.
  - `implicitResetAt` khác `null` thì **bỏ qua** mọi phiên có `decision_date <= implicitResetAt` (`SPEC-040`).
  - $I$ gắn theo `global_dishes.id`, không theo `group_dishes.id` — cùng lý lẽ `SPEC-024` và `eating_history`.
  - Hàm thuần nhận `referenceDate` qua **tham số**, không tự gọi `new Date()` — kỷ luật đã đặt ở `SPEC-020`.

> [!IMPORTANT]
> $I$ được **suy ra** từ dữ liệu của `selection`, không phải thứ người dùng **khai**. Nó thuộc `src/features/selection/domain/`, KHÔNG thuộc `preference` — đặt nhầm sinh ra chiều `preference → selection` chưa từng có. Xem [§10](#10-các-điểm-lưu-ý-kiến-trúc).

### SPEC-038 — Đánh dấu / gỡ Blacklist

- **Nguồn:** `F31`, [BR-035](what-we-gonna-eat-today_business-rules_v1.8.md), [BR-043](what-we-gonna-eat-today_business-rules_v1.8.md)
- **Đầu vào:** `{ globalDishId, blacklisted: boolean }` (người gọi là chính chủ)
- **Đầu ra:** `{ blacklisted: boolean }`
- **Quy tắc:**
  - Món bị Blacklist **bị lọc cứng** khỏi deck ở Stage 1, cùng chỗ với `Cannot Eat`.
  - **KHÔNG xoá tương tác Swipe** đã gửi trong phiên hiện tại — đây là điểm khác duy nhất và cũng là toàn bộ lý do `BR-035` tách khỏi `BR-034`. `Cannot Eat` nói *"tôi không ăn được"*, một sự thật về cơ thể, nên $P$ phải sửa lại cho đúng. Blacklist nói *"đừng gợi ý nữa"*, một sở thích, và nó không làm cho lượt vuốt hôm nay thành sai.
  - Hệ quả: Blacklist **không** trừ $-1.0$ của $X$ trong `SPEC-014`. Người dùng vẫn đề xuất được món mình đã Blacklist nếu hôm nay họ đổi ý.
  - Lưu chung bảng với `Cannot Eat`, phân biệt bằng cột `kind` — hai cờ cùng hình dạng `(user, món, có/không)`.

### SPEC-039 — Đánh dấu / gỡ History Whitelist

- **Nguồn:** `F32`, [BR-036](what-we-gonna-eat-today_business-rules_v1.8.md)
- **Đầu vào:** `{ globalDishId, whitelisted: boolean }` (người gọi là chính chủ)
- **Đầu ra:** `{ whitelisted: boolean }`
- **Quy tắc:**
  - Món trong Whitelist **ép $R = 0$** ở Stage 2, bất kể ăn hôm qua hay hôm nay.
  - **Không** phải lọc, **không** cộng điểm: nó chỉ gỡ một hình phạt. Món phở của người ngày nào ăn cũng được thôi bị Cooldown đẩy xuống, nhưng cũng không vì thế mà nhảy lên đầu.
  - Trực giao với `Like`: một người vừa `Like` vừa Whitelist một món là hợp lệ và có nghĩa khác nhau ($E = +1$ cộng điểm; Whitelist gỡ phạt).
  - Lưu chung bảng với `SPEC-038`, cột `kind` mang giá trị thứ ba.

### SPEC-040 — Quên sở thích đã học (Implicit Reset)

- **Nguồn:** `F39`, [BR-038](what-we-gonna-eat-today_business-rules_v1.8.md), [BR-061](what-we-gonna-eat-today_business-rules_v1.8.md)
- **Đầu vào:** `{ }` (người gọi là chính chủ; không tham số)
- **Đầu ra:** `{ implicitResetAt: string }`
- **Quy tắc:**
  - Ghi một **mốc thời gian**, KHÔNG xoá dòng nào. `SPEC-037` bỏ qua mọi phiên trước mốc.
  - Xoá thật sẽ phá Session Ranking của các phiên cũ (`SPEC-014` đọc cùng bảng `interactions`) và vi phạm `BR-061` — tương tác cũ phải được bảo toàn kể cả khi không còn được tính. Một mốc thời gian cho đúng hiệu quả người dùng mong đợi với chi phí một cột.
  - **Chỉ reset $I$.** Like/Dislike, Cannot Eat, Blacklist, Whitelist **giữ nguyên** — chúng là thứ người dùng tự khai, không phải thứ hệ thống suy ra, nên không thuộc phạm vi "quên".
  - Deck của phiên **đang chạy không đổi** — nó đã materialize (`SPEC-028` / `BR-048`). Hiệu lực bắt đầu ở phiên kế tiếp, và giao diện phải nói điều đó ra.

## 9.2 Ba món nợ của v1.1 (Epic E14)

### SPEC-041 — Gỡ Participant khỏi phiên

- **Nguồn:** `F25`, [BR-026](what-we-gonna-eat-today_business-rules_v1.8.md), [BR-061](what-we-gonna-eat-today_business-rules_v1.8.md), [BR-020](what-we-gonna-eat-today_business-rules_v1.8.md)
- **Đầu vào:** `{ sessionId, participantUserId }` (người gọi là Creator)
- **Đầu ra:** `{ removed: true }`
- **Quy tắc:**
  - Chuyển `participants.state` sang `'REMOVED'`. **KHÔNG xoá dòng** — cùng lý lẽ `SPEC-035` với `group_dishes`.
  - **Không gỡ được chính Creator** (`BR-020`: Creator luôn là Participant). Trả `ERR_VALIDATION`, không phải lỗi quyền — người gọi có quyền, chỉ là mục tiêu không hợp lệ.
  - Chỉ áp dụng cho phiên `ACTIVE`. Phiên `FINALIZED` đã sinh Eating History; gỡ người khỏi nó là sửa lịch sử, việc của `SPEC-042`.
  - Tương tác của người bị gỡ **giữ nguyên số dòng** nhưng thôi tính vào $P$, $N$, $T$ của `SPEC-014` (`BR-061`).
  - Người bị gỡ **không** nhận Default Eating History lúc chốt (`SPEC-017` vốn đã lọc `state <> 'REMOVED'`).

> [!NOTE]
> Toàn bộ phía ĐỌC của spec này **đã tồn tại từ v1.0** — `countInteractionsByDish`, `listRankingParticipantUserIds`, `listActiveParticipantUserIds` và `recordInteraction` đều đã lọc `'REMOVED'` đúng. Chưa dòng mã production nào **ghi** giá trị đó. Đây đúng khuôn `INACTIVE`/`INVALID` mà `SPEC-034`/`SPEC-035` đã đóng ở E11: spec này chỉ mở đường ghi, và phải có test ghim khẳng định phía đọc vẫn đúng.

### SPEC-042 — Điều chỉnh Eating History cá nhân

- **Nguồn:** `F28`, [BR-057](what-we-gonna-eat-today_business-rules_v1.8.md), [BR-060](what-we-gonna-eat-today_business-rules_v1.8.md)
- **Đầu vào:** `{ globalDishId, eatingDate, action: ADD | REMOVE }` (người gọi là chính chủ)
- **Đầu ra:** `{ eatingDate, dishCount }`
- **Quy tắc:**
  - **Chỉ ngày hôm nay** theo timezone của Group (`SPEC-018`). `BR-057` cho cá nhân quyền tối cao, nghĩa là không có chốt chặn nghiệp vụ nào phía sau — nên phạm vi phải hẹp bằng thiết kế, không bằng lời nhắc.
  - Chỉ sửa được lịch sử **của chính mình**. Không ai sửa hộ ai, kể cả Group Admin.
  - Dòng do người dùng tự thêm mang `origin = 'MANUAL'` và `source_final_meal_id = NULL`; dòng hệ thống sinh mang `origin = 'DEFAULT'` và trỏ tới Final Meal.
  - `BR-060` — chốt lại bữa (`SPEC-016`) **không ghi đè** dòng `MANUAL`. Người dùng đã nói rồi thì hệ thống không nói lại.
  - Xoá một dòng `DEFAULT` là hành động hợp lệ: *"cả nhà ăn món đó, tôi thì không"*. Nó khác `Cannot Eat` ở chỗ đây là một lần, còn kia là mãi mãi.
  - Mọi thay đổi tác động ngay lên $R$ của `SPEC-020` — đó là mục đích, và cũng là lý do giao diện chỉ cho chọn món từ danh mục chứ không cho gõ tự do.

---

# 10. Các điểm lưu ý kiến trúc

> [!IMPORTANT]
> **Độc lập đếm Tag (Independent Tag Counting):**  
> Khi đánh giá Required Rules (`SPEC-016`), nếu một món mang cả 2 tag `MAIN` và `SOUP` (vd: *Bò kho bánh mì*), món này sẽ đóng góp độc lập vào cả 2 quy định `Required MAIN` và `Required SOUP`. Tuyệt đối không phân bổ độc quyền kiểu slot allocation.

> [!IMPORTANT]
> **Một món chỉ thuộc một chặng (`SPEC-030`):** Quy tắc trên **không** áp cho việc chia chặng. Đếm tag là phép cộng trên một tập đã chốt; chia chặng là phép phân hoạch trên một danh sách sẽ được vuốt. Cho món hai tag xuất hiện ở hai chặng nghĩa là người dùng vuốt nó hai lần và $P$ của [BR-049](what-we-gonna-eat-today_business-rules_v1.8.md) bị đếm trùng.

> [!IMPORTANT]
> **Feature `preference` là feature thứ chín.** `SPEC-024`/`SPEC-025` sống trong `src/features/preference/`. v1.1 mở thêm **hai** chiều phụ thuộc, cả hai phải được khai trong `ALLOWED_CROSS_FEATURE` của `eslint.config.mjs`, bổ sung vào `yarn arch:probe` và ghi vào [Tech Spec §2.3](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) — hiện có đúng **7** chiều được phép (`selection → history｜dish｜preference`, `meal → rule｜history｜preference`, `session → rule`), trong đó hai chiều dưới đây là của v1.1:
>
> - `selection → preference` — `listDeck` lọc cứng món `Cannot Eat` và đọc $E$ để tính điểm.
> - `meal → preference` — `finalizeSession` cần tập người đã khai `Cannot Eat` để áp ngoại lệ `BR-056`.
>
> Chiều thứ hai dễ bị bỏ sót vì `SPEC-017` nằm trong `history`, nhưng hàm thuần `defaultEatingHistory` **nhận** tập ngoại lệ qua tham số chứ không tự truy vấn — nên chỗ phải đọc dữ liệu là `meal`, không phải `history`.

> [!IMPORTANT]
> **`SPEC-037` KHÔNG mở chiều thứ tám — và đó là điều kiện, không phải may mắn.** Tên `BR-038` ("Implicit Preference") kéo người đọc về feature `preference`, nhưng $I$ được **suy ra** từ `interactions` — bảng của `selection` — rồi tiêu thụ ngay bởi ranking của `selection`. Đặt nó ở `preference` sinh ra chiều `preference → selection` chưa từng có và không nên có: `preference` sở hữu thứ người dùng **khai**, `selection` sở hữu thứ hệ thống **quan sát**. Ranh giới đó là lý do `SPEC-024` và `SPEC-037` không nằm cùng chỗ dù cả hai đều ảnh hưởng tới cùng một công thức.

> [!IMPORTANT]
> **`SPEC-038`, `SPEC-039` và `SPEC-024` dùng CHUNG một bảng.** Ba cờ `Cannot Eat`, `Blacklist`, `History Whitelist` có cùng hình dạng `(user, global dish, có/không)` và chỉ khác nhau ở **hệ quả**, không ở cách lưu. Ba bảng cùng hình dạng là ba đường ghi phải giữ đồng bộ bằng tay. Cái giá của việc gộp: mọi truy vấn hiện đang đọc `user_dish_constraints` phải nêu rõ `kind` — bỏ sót một chỗ thì Blacklist lặng lẽ mang theo hành vi xoá lượt vuốt của `Cannot Eat`, thứ `BR-035` cấm bằng chữ.

---

# 11. Lịch sử thay đổi (Change History)

| Version | Ngày | Phần tác động | Nội dung thay đổi | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- | :--- |
| `1.4` | 2026-09-04 | §1.3, §9, §10 | Bổ sung §9 với `SPEC-037`→`SPEC-042` cho 7 tính năng v1.2; hai lưu ý kiến trúc mới ($I$ thuộc `selection` chứ không phải `preference`; ba cờ cá nhân dùng chung một bảng). Sửa con số chiều cross-feature ở §10 từ "5" thành "7" — `eslint.config.mjs` đã có 7 chiều từ E7 | [DEC-069](what-we-gonna-eat-today_decision-log_v3.9.md) |
| `1.3` | 2026-09-02 | §8.5 | `SPEC-034` bổ sung điểm xét thứ hai (chốt chặn ở `SPEC-016`) — quét đơn thuần không ngăn được phiên hôm qua chốt vào hôm nay; `SPEC-035` sửa câu sai *"thêm lại là tạo dòng mới"* (unique index không cho phép, `TC-020` khẳng định ngược lại) và ghi quyền Admin | [DEC-068](what-we-gonna-eat-today_decision-log_v3.9.md), E11 Guide §1.2 |
| `1.3` | 2026-09-02 | §8.4 | `SPEC-031` đổi tên hàm sang `evaluateRules`, xoá `satisfied`, `RuleWarning` thành union có thẻ (lệch Target Count không gắn tag nên không ép được vào `RuleShortfall`); `SPEC-032` ghi rõ hai cột nullable và điểm đông cứng lúc Start | [DEC-067](what-we-gonna-eat-today_decision-log_v3.9.md), E10-S1 Guide §1.3 |
| `1.3` | 2026-08-26 | §1.2, §8.2 | Bổ sung `SPEC-036` (suy vị trí tiếp tục, `F51`); viết lại `SPEC-028` cho khớp hành vi thật — đóng băng toàn phần thay vì tính lại có chọn lọc, cơ chế chưa từng được xây | E8-S1 Guide §1.4, `DEC-064`, `DEC-065` |
| `1.3` | 2026-08-26 | §1.2, §8, §9 | Bổ sung §8 với `SPEC-024`→`SPEC-035` cho 11 tính năng v1.1; ba lưu ý kiến trúc mới (một món một chặng, feature `preference`) | [DEC-056](what-we-gonna-eat-today_decision-log_v3.9.md) → [DEC-060](what-we-gonna-eat-today_decision-log_v3.9.md) |
| `0.2` | 2026-08-14 | §1, §6, §7 | Kéo `F17`, `F20`, `F21` vào v1.0; thêm `SPEC-020→022` | Quyết định mở rộng baseline v1.0 |
| `0.1` | 2026-08-14 | Toàn bộ | Bản thảo đầu tiên: 19 spec cho 14 tính năng | Khởi tạo baseline SDD |
