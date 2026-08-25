# 📐 Software Design Document (SDD) — What We Gonna Eat Today

> **Document Metadata**
>
> - **Version:** `0.2` | **Status:** `Approved`
> - **Created:** `2026-08-14` | **Last Updated:** `2026-08-14`
> - **Upstream:** [PRD](what-we-gonna-eat-today_prd_v0_1.md) • [Business Rules](what-we-gonna-eat-today_business-rules_v1.4.md) • [Ranking Spec](what-we-gonna-eat-today_ranking-specification_v0_1.md)
> - **Downstream:** [Tech Spec & Architecture](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) • [Test Cases](what-we-gonna-eat-today_test-cases-specification_v0_1.md) • [Master Plan](what-we-gonna-eat-today_master-plan_v1_0.md)
>
> 📌 *Tài liệu đặc tả chi tiết 23 module kỹ thuật (`SPEC-001` đến `SPEC-023`) cho 17 tính năng cốt lõi của v1.0 và phần bảo trì sau phát hành. Mỗi kịch bản (Scenario) trong tài liệu này ánh xạ 1–1 thành một Test Case tự động.*

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
8. [Các điểm lưu ý kiến trúc](#8-các-điểm-lưu-ý-kiến-trúc)
9. [Lịch sử thay đổi (Change History)](#9-lịch-sử-thay-đổi-change-history)

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

- **Nguồn:** [BR-020](what-we-gonna-eat-today_business-rules_v1.4.md), `BR-025`
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

- **Nguồn:** [BR-006](what-we-gonna-eat-today_business-rules_v1.4.md), `BR-007`, `BR-008`
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

- **Nguồn:** `US-001`, `F02`, [BR-006](what-we-gonna-eat-today_business-rules_v1.4.md)
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

- **Nguồn:** `US-002`, `F03`, [BR-001](what-we-gonna-eat-today_business-rules_v1.4.md)
- **Đầu vào:** `{ groupId, name: string (1..120), systemTags: SystemTag[] (0..5), forceCreate?: boolean }`
- **Đầu ra:** `GroupDish` | `{ existingCandidates: GlobalDish[] }` | `Failure`
- **Quy tắc:** Chuẩn hóa tên (cắt khoảng trắng thừa, chuyển chữ thường, bỏ dấu tiếng Việt) thành `normalized_name`. Nếu tìm thấy món trùng, trả về danh sách gợi ý; nếu có cờ `forceCreate = true`, tạo Global Dish mới kèm provenance.
- **Ghi chú (DEC-053):** Nhánh "dùng lại món có sẵn" (`addExistingDishToGroup`, ngoài hợp đồng này — xem `DEC-029`) nay cũng nhận `systemTags` và ghi đè toàn bộ tag của món trong Group.

### SPEC-006 — Gán System Tag cho Dish trong Group

- **Nguồn:** `US-003`, `F04`, [BR-003](what-we-gonna-eat-today_business-rules_v1.4.md)
- **Đầu vào:** `{ groupId, dishId, systemTags: SystemTag[] }` (Yêu cầu quyền Group Admin)
- **Đầu ra:** `GroupDish` | `Failure`
- **Quy tắc:** Ghi đè toàn bộ tag của món ăn trong Group hiện tại; hoàn toàn độc lập và không ảnh hưởng Group khác.

---

# 5. Spec — Phiên chọn món (Session Specs)

### SPEC-007 — Khởi tạo Session Draft

- **Nguồn:** `US-008`, `F05`, [BR-020](what-we-gonna-eat-today_business-rules_v1.4.md), `BR-025`
- **Đầu vào:** `{ groupId }`
- **Đầu ra:** `Session` (State: `DRAFT`) | `Failure`
- **Quy tắc:** Nếu nhóm đã có phiên `ACTIVE` hoặc `FINALIZED` cùng ngày → `ERR_SESSION_EXISTS_TODAY`.

### SPEC-008 — Bắt đầu Session (Start Session)

- **Nguồn:** `US-008`, `F05`, [BR-021](what-we-gonna-eat-today_business-rules_v1.4.md), `BR-025`
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

- **Nguồn:** `US-009`, `F06`, [BR-026](what-we-gonna-eat-today_business-rules_v1.4.md)
- **Đầu vào:** `{ sessionId, userId }` (Yêu cầu Creator)
- **Đầu ra:** `Participant` | `Failure`
- **Quy tắc:** Cho phép thêm khi phiên ở `DRAFT` hoặc `ACTIVE`. Người mới bắt đầu với 0 tương tác.

---

# 6. Spec — Duyệt món và Chốt bữa (Deck & Finalization Specs)

### SPEC-010 — Dựng Personal Candidate Deck

- **Nguồn:** `US-011`, `F07`, [Ranking Spec §2](what-we-gonna-eat-today_ranking-specification_v0_1.md)
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

- **Nguồn:** `US-011`, `F08`, `F09`, [BR-040→042](what-we-gonna-eat-today_business-rules_v1.4.md)
- **Đầu vào:** `{ sessionId, dishId, action: SWIPE_RIGHT | SWIPE_LEFT | UNDO }`
- **Đầu ra:** `{ effectiveInteraction: InteractionType | null }`
- **Quy tắc:** Upsert vào `interactions` (chỉ giữ 1 trạng thái hiệu lực); đồng thời append vào `interaction_events` để lưu vết audit log.

### SPEC-013 — Đánh dấu Completed & Mở lại

- **Nguồn:** `US-014`, `F10`, [BR-044](what-we-gonna-eat-today_business-rules_v1.4.md)
- **Đầu vào:** `{ sessionId, completed: boolean }`
- **Quy tắc:** `COMPLETED` chỉ mang tính chất báo hiệu cho Creator, **không khóa quyền vuốt tiếp** của thành viên nếu phiên còn mở.

### SPEC-014 — Tính toán Session Ranking

- **Nguồn:** `US-015`, `F11`, [Ranking Spec §3](what-we-gonna-eat-today_ranking-specification_v0_1.md)
- **Đầu vào:** `{ sessionId }` (Yêu cầu Creator)
- **Đầu ra:** `{ ranked: RankedDish[], untouched: DishSummary[] }`
- **Công thức:**
  $$\text{Score} = \frac{1.00 \times P - 0.70 \times N - 1.00 \times X - 0.30 \times H}{T}$$
  *(Trong đó $T$ là tổng số Participant, $P$ là chọn, $N$ là từ chối, $X$ là Cannot Eat, $H$ là đã ăn gần đây).*

### SPEC-015 — Dựng Final Meal nháp

- **Nguồn:** `US-016`, `F12`, [BR-050](what-we-gonna-eat-today_business-rules_v1.4.md)
- **Đầu vào:** `{ sessionId, dishIds: string[] }` (Yêu cầu Creator)
- **Quy tắc:** Cho phép chọn bất kỳ món nào trong nhóm (kể cả món chưa ai vuốt), không kích hoạt validate rule ở bước nháp.

### SPEC-016 — Chốt bữa chính thức (Finalize)

- **Nguồn:** `US-016`, `F12`, `F13`, [BR-052](what-we-gonna-eat-today_business-rules_v1.4.md)
- **Đầu vào:** `{ sessionId }` (Yêu cầu Creator)
- **Đầu ra:** `FinalMeal` | `Failure`
- **Quy tắc:**
  1. Kiểm tra danh sách món không rỗng.
  2. Đánh giá `Required Rules` theo **Session Rule Snapshot** kết hợp với **System Tag hiện tại** của món.
  3. Nếu thiếu quy tắc bắt buộc $\to$ trả `ERR_REQUIRED_RULE_FAILED` và phiên vẫn giữ `ACTIVE`.
  4. Nếu hợp lệ: Chuyển state `FINALIZED`, tạo `final_meals` và tự động sinh `eating_history` trong cùng 1 database transaction.

### SPEC-017 — Tự động sinh Default Eating History

- **Nguồn:** `US-018`, `F14`, [BR-056](what-we-gonna-eat-today_business-rules_v1.4.md)
- **Đầu vào:** `FinalMeal`
- **Quy tắc:** Sinh bản ghi ăn uống cho toàn bộ Participant hiện tại với ngày `eating_date = session.decision_date`. Đảm bảo tính Idempotent qua `source_final_meal_id`.

---

# 7. Spec — Cooldown & Quy định bữa ăn (Cooldown & Rules Specs)

### SPEC-020 — Tính toán Recency Penalty

- **Nguồn:** `F17`, [BR-046](what-we-gonna-eat-today_business-rules_v1.4.md), [Ranking Spec §2.2](what-we-gonna-eat-today_ranking-specification_v0_1.md)
- **Đầu vào:** `{ userId, dishId, referenceDate }`
- **Đầu ra:** $R \in [0, 1]$
- **Công thức:**
  $$R = \max\left(0, 1 - \frac{d}{7}\right)$$
  *(Với $d$ là số ngày lịch kể từ lần ăn gần nhất).*

### SPEC-021 — Cấu hình Group Required Rules

- **Nguồn:** `F20`, [BR-010](what-we-gonna-eat-today_business-rules_v1.4.md), `BR-013`
- **Đầu vào:** `{ groupId, rules: [{ systemTag: SystemTag, minimumCount: number }] }` (Yêu cầu Group Admin)
- **Quy tắc:** Ghi đè toàn bộ danh sách quy định; `minimumCount` phải $\ge 1$; không cho phép trùng lặp tag.

### SPEC-022 — Snapshot Session Rules

- **Nguồn:** `F21`, [BR-015](what-we-gonna-eat-today_business-rules_v1.4.md), `BR-016`
- **Đầu vào:** `{ sessionId }`
- **Quy tắc:** Đóng băng bản sao các quy định mâm cơm của Group tại thời điểm Start. Admin chỉnh sửa Group Rule sau đó sẽ không làm đổi luật của phiên đang chạy.

### SPEC-023 — Gợi ý món từ Global Dish Pool (Catalog Search)

- **Nguồn:** `US-002`, [BR-001](what-we-gonna-eat-today_business-rules_v1.4.md), [DEC-055](what-we-gonna-eat-today_decision-log_v1.1.md)
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

# 8. Các điểm lưu ý kiến trúc

> [!IMPORTANT]
> **Độc lập đếm Tag (Independent Tag Counting):**  
> Khi đánh giá Required Rules (`SPEC-016`), nếu một món mang cả 2 tag `MAIN` và `SOUP` (vd: *Bò kho bánh mì*), món này sẽ đóng góp độc lập vào cả 2 quy định `Required MAIN` và `Required SOUP`. Tuyệt đối không phân bổ độc quyền kiểu slot allocation.

---

# 9. Lịch sử thay đổi (Change History)

| Version | Ngày | Phần tác động | Nội dung thay đổi | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- | :--- |
| `0.2` | 2026-08-14 | §1, §6, §7 | Kéo `F17`, `F20`, `F21` vào v1.0; thêm `SPEC-020→022` | Quyết định mở rộng baseline v1.0 |
| `0.1` | 2026-08-14 | Toàn bộ | Bản thảo đầu tiên: 19 spec cho 14 tính năng | Khởi tạo baseline SDD |
