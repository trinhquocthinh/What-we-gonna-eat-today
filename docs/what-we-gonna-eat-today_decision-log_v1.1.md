# 📜 Decision Log (ADRs) — What We Gonna Eat Today

> **Document Metadata**
>
> - **Version:** `2.0` | **Status:** `Active`
> - **Created:** `2026-07-23` | **Last Updated:** `2026-08-18`
> - **Supersedes:** `v1.9` | **Upstream:** [Problem Definition](what-we-gonna-eat-today_problem-definition_v1.3.md) • [Business Rules](what-we-gonna-eat-today_business-rules_v1.4.md)
> - **Downstream:** [Tech Spec & Architecture](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) • [SDD](what-we-gonna-eat-today_sdd_v0_1.md) • [Master Plan](what-we-gonna-eat-today_master-plan_v1_0.md)
>
> 📌 *Decision Log ghi lại 28 quyết định kiến trúc và nghiệp vụ cốt lõi (ADR), giải thích cặn kẽ bối cảnh, lý do (Rationale), hệ quả (Consequence) và các tài liệu bị ảnh hưởng.*

---

## 📑 Danh mục quyết định kiến trúc (Decision Index)

| Mã | Tên quyết định | Ngày chốt | Trạng thái | Phạm vi ảnh hưởng chính |
| :---: | :--- | :---: | :---: | :--- |
| [`DEC-001`](#dec-001--selection-session-lifecycle) | Vòng đời phiên chọn món (Selection Session Lifecycle) | 2026-07-23 | `Accepted` | Trạng thái phiên, tính duy nhất trong ngày |
| [`DEC-002`](#dec-002--participant-lifecycle-and-re-entry) | Vòng đời thành viên & Tái tham gia phiên | 2026-07-23 | `Accepted` | Trạng thái Participant, hiệu lực Swipe |
| [`DEC-003`](#dec-003--group-membership-changes-during-active-session) | Thay đổi thành viên khi phiên đang Active | 2026-07-23 | `Accepted` | Ràng buộc bất biến Creator & Chef |
| [`DEC-004`](#dec-004--persistent-chef-role-and-cooking-capability) | Vai trò Đầu bếp (Chef Role) & Khả năng nấu | 2026-07-23 | `Accepted` | Nhóm vai trò, Chef Mode |
| [`DEC-005`](#dec-005--session-interaction-and-persistent-dish-action-semantics) | Phân định Tương tác phiên & Hành động bền vững | 2026-07-23 | `Accepted` | Xếp hạng, hành vi lọc Cannot Eat |
| [`DEC-006`](#dec-006--eating-history-source-records-and-personal-correction-authority) | Bản ghi lịch sử ăn & Quyền chỉnh sửa cá nhân | 2026-07-23 | `Accepted` | Mô hình lịch sử, nguồn dữ liệu gợi ý |
| [`DEC-007`](#dec-007--final-meal-correction-authority) | Quyền chỉnh sửa thực đơn đã chốt trong ngày | 2026-07-23 | `Accepted` | Điều chỉnh thực đơn & Audit log |
| [`DEC-008`](#dec-008--global-dish-creation-provenance-and-logical-merge-strategy) | Nguồn gốc tạo món & Chiến lược Logical Merge | 2026-07-23 | `Accepted` | Định danh món ăn, phạm vi MVP |
| [`DEC-009`](#dec-009--group-dish-removal-and-re-add-behavior) | Gỡ và thêm lại món trong danh mục nhóm | 2026-07-23 | `Accepted` | Vòng đời trạng thái món ăn trong nhóm |
| [`DEC-010`](#dec-010--group-rule-and-session-rule-model) | Mô hình Group Rules & Snapshot Session Rules | 2026-07-29 | `Accepted` | Cấu trúc quy định mâm cơm, override |
| [`DEC-011`](#dec-011--final-meal-rule-evaluation-and-warning-semantics) | Đánh giá quy định khi chốt & Ngữ nghĩa cảnh báo | 2026-07-29 | `Accepted` | Quy trình Finalize, ranh giới ranking |
| [`DEC-012`](#dec-012--ranking-model-cooldown-and-exploration-strategy) | Thuật toán Ranking, Cooldown 7 ngày & Explore 20% | 2026-08-14 | `Accepted` | Điểm cá nhân, bảng điểm đồng thuận |
| [`DEC-013`](#dec-013--authjs-beta-dependency) | Cố định phiên bản Beta của Auth.js (NextAuth v5) | 2026-08-17 | `Accepted` | Pin dependency tương thích Next 16 / React 19 |
| [`DEC-014`](#dec-014--provisionuser-failure-surfaces-as-exception-at-the-authjs-boundary) | Xử lý lỗi `provisionUser` dạng ngoại lệ tại Auth boundary | 2026-08-17 | `Accepted` | Bắt lỗi callback Auth.js, chống loop login |
| [`DEC-015`](#dec-015--neon-http-dbbatch-is-a-real-transaction-dbtransaction-is-not) | Giao dịch nguyên tử qua `neon-http` `db.batch()` | 2026-08-17 | `Accepted` | Luồng ghi dữ liệu Group, chiến lược driver |
| [`DEC-016`](#dec-016--canonical-iana-time-zone-stored-not-user-input) | Lưu trữ chuẩn múi giờ IANA Canonical | 2026-08-17 | `Accepted` | Đồng bộ múi giờ nhóm Chrome vs Firefox |
| [`DEC-017`](#dec-017--display_time_zone_fallback-is-display-only-never-a-group-default) | `DISPLAY_TIME_ZONE_FALLBACK` chỉ dùng hiển thị | 2026-08-17 | `Accepted` | Nhãn ngày trang `/groups`, cấm làm default ngầm |
| [`DEC-018`](#dec-018--database-enums-defined-with-pgenum) | Khai báo Enum CSDL bằng `pgEnum` của Drizzle | 2026-08-18 | `Accepted` | Ràng buộc DB enum, tự động sinh migration |
| [`DEC-019`](#dec-019--dish-name-normalization-level-1-in-e1-diacritics-removal-in-e2-t3-with-backfill) | Chuẩn hóa tên món: Level 1 ở E1, bỏ dấu ở E2-T3 | 2026-08-18 | `Accepted` | Hàm `normalizeDishName` & kế hoạch backfill |
| [`DEC-020`](#dec-020--route-revalidation-and-client-router-refresh-in-server-actions) | Revalidate Route và Refresh Router trong Server Actions | 2026-08-18 | `Accepted` | Gọi `refresh()` và `revalidatePath` đúng chuẩn |
| [`DEC-021`](#dec-021--error-boundary-components-use-retry-prop-in-nextjs-16) | Error Boundary dùng prop `retry` trong Next.js 16 | 2026-08-18 | `Accepted` | Cơ chế thử lại trang `error.tsx` |
| [`DEC-022`](#dec-022--state-adjustment-during-render-for-server-action-state-transitions) | Đồng bộ State khi Render (tránh Effect thừa) | 2026-08-18 | `Accepted` | Clean code React Compiler, chống lỗi cascade |
| [`DEC-023`](#dec-023--animated-sheet-exit-via-usesheetclose-context) | Hiệu ứng đóng Bottom Sheet mượt mà qua Context | 2026-08-18 | `Accepted` | Trải nghiệm UI Sheet trượt xuống tự nhiên |
| [`DEC-024`](#dec-024--e1-t7s-minimal-startsession-does-not-need-the-websocket-driver) | `startSession` tối thiểu ở E1-T7 không cần WebSocket | 2026-08-18 | `Accepted` | Tối ưu hóa driver, bắt mã lỗi race condition |
| [`DEC-025`](#dec-025--interaction_events-logs-every-spec-012-request-including-idempotent-repeats) | Ghi nhật ký mọi request tương tác vào `interaction_events` | 2026-08-18 | `Accepted` | Audit log append-only đầy đủ |
| [`DEC-026`](#dec-026--e1-t11-does-not-need-the-websocket-driver-either) | `finalizeSession` ở E1-T11 dùng `db.batch()` an toàn | 2026-08-18 | `Accepted` | Giao dịch nguyên tử không cần kết nối WebSocket |
| [`DEC-027`](#dec-027--invite-consumption-uses-a-single-raw-sql-cte-not-dbbatch) | Tiêu thụ Token mời nguyên tử qua câu lệnh CTE SQL thô | 2026-08-18 | `Accepted` | `joinByInvite`, cập nhật invite & thêm member |
| [`DEC-028`](#dec-028--invite-tokens-nodecrypto-sha-256-no-bcrypt) | Token mời: `node:crypto`, SHA-256, không dùng Bcrypt | 2026-08-18 | `Accepted` | Sinh token ≥192-bit, lưu băm SHA-256 trong DB |


---

# DEC-001 — Selection Session Lifecycle

- **Ngày quyết định:** `2026-07-23` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Vòng đời phiên chọn món tuân theo máy trạng thái:

```text
Draft ──► Active ──┬──► Finalized (Chốt thực đơn)
                   └──► Invalid (Hết hạn / Hủy)
```

- `Cancelled` và `Timeout` là các lý do dẫn tới `Invalid`, không phải trạng thái độc lập ở MVP.
- Chỉ các phiên `ACTIVE` hoặc `FINALIZED` mới chiếm dụng khóa duy nhất trong ngày của Group.
- Các phiên `DRAFT` hoặc `INVALID` không chặn việc tạo phiên mới trong cùng ngày.
- Phiên đã `FINALIZED` không thể reopen; mọi thay đổi sau đó thực hiện qua tính năng Final Meal Correction.

### Cơ sở (Rationale)

Cần trạng thái `DRAFT` để Creator thiết lập danh sách người ăn trước khi bắt đầu; phiên lỗi/hết hạn không được phép khóa cứng nhóm suốt cả ngày.

---

# DEC-002 — Participant Lifecycle and Re-entry

- **Ngày quyết định:** `2026-07-23` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Tiến trình của thành viên trong phiên:

```text
Active Participation ◄──► Completed (Đã chọn xong)
          │
          └──► Removed (Bị gỡ khỏi phiên)
```

- Trạng thái `COMPLETED` không khóa tương tác; thành viên vẫn có thể mở lại để vuốt tiếp khi phiên chưa đóng.
- Thành viên chưa bấm Completed vẫn nhận Default Eating History nếu có tên trong phiên lúc finalize.
- Nếu bị gỡ rồi thêm lại, thành viên bắt đầu lượt mới với 0 tương tác (tương tác cũ chỉ lưu audit).

---

# DEC-003 — Group Membership Changes During Active Session

- **Ngày quyết định:** `2026-07-23` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

- Thành viên bị xóa khỏi Group sẽ tự động bị loại khỏi danh sách Participant của các phiên đang `ACTIVE`.
- **Creator** và **Chef** của phiên đang `ACTIVE` **không thể bị xóa khỏi Group** cho đến khi phiên kết thúc.

---

# DEC-004 — Persistent Chef Role and Cooking Capability

- **Ngày quyết định:** `2026-07-23` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

- `Member` là vai trò cơ bản; `Chef` và `Group Admin` là các vai trò/khả năng bổ sung.
- Khả năng nấu nướng (`Cooking Capability`) thuộc về hồ sơ cá nhân của User, không thuộc riêng một Group.
- Chưa có dữ liệu khả năng nấu $\to$ Coi là `Unknown` (trung tính, không bị phạt điểm).

---

# DEC-005 — Session Interaction and Persistent Dish Action Semantics

- **Ngày quyết định:** `2026-07-23` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Tách biệt rõ hai loại trạng thái:

1. **Session Interaction:** `None ↔ Swipe Right ↔ Swipe Left` (Tương tác nhanh trong phiên, bản mới nhất ghi đè bản cũ).
2. **Persistent Dish Action:** Cài đặt sở thích bền vững (`Cannot Eat`, `Blacklist`, `Whitelist`).

- Đánh dấu `Cannot Eat` sau khi đã Swipe $\to$ Tự động hủy và clear tương tác Swipe của món đó.
- Thêm `Blacklist` sau khi đã Swipe $\to$ Giữ nguyên Swipe hiện tại, chỉ loại món khỏi gợi ý tương lai.

---

# DEC-006 — Eating History Source Records and Personal Correction Authority

- **Ngày quyết định:** `2026-07-23` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Phân cấp quyền hạn dữ liệu lịch sử ăn uống:

```text
Authoritative Final Meal (Thực đơn nhóm chốt)
        ↓
Default Eating History (Lịch sử tự động sinh)
        ↓
User Personal Correction (Cá nhân tự điều chỉnh nếu không ăn món nào)
        ↓
Effective Eating History (Nguồn sự thật nuôi thuật toán Cooldown)
```

Điều chỉnh cá nhân của User có quyền hạn tối cao đối với dữ liệu lịch sử ăn của chính họ.

---

# DEC-007 — Final Meal Correction Authority

- **Ngày quyết định:** `2026-07-23` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Creator chỉ được phép chỉnh sửa thực đơn chốt trong **ngày hiện tại**. Việc điều chỉnh ngày cũ chỉ dành cho System Admin khi xử lý sự cố dữ liệu.

---

# DEC-008 — Global Dish Creation Provenance and Logical Merge Strategy

- **Ngày quyết định:** `2026-07-23` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

- Mọi món mới tạo phải lưu nguồn gốc: `created_by_user`, `created_from_group`, `created_at`.
- MVP không triển khai Full Merge tự động; định hướng hậu MVP là **Logical Merge (Canonical Identity)** để bảo toàn lịch sử.

---

# DEC-009 — Group Dish Removal and Re-add Behavior

- **Ngày quyết định:** `2026-07-23` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Quan hệ món ăn trong nhóm dùng trạng thái `ACTIVE / INACTIVE`. Khi gỡ món, lịch sử cũ vẫn được bảo toàn; khi thêm lại, trạng thái chuyển về `ACTIVE` mà không tạo mới bản ghi Global Dish.

---

# DEC-010 — Group Rule and Session Rule Model

- **Ngày quyết định:** `2026-07-29` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

- Nhóm thiết lập các quy tắc mâm cơm (`Required` / `Preferred` theo System Tag).
- Khi bắt đầu phiên (`Start Session`), Group Rules được **snapshot** sang `Session Rules`.
- Món ăn mang nhiều Tag được đếm độc lập cho từng Tag (Independent Tag Counting).

---

# DEC-011 — Final Meal Rule Evaluation and Warning Semantics

- **Ngày quyết định:** `2026-07-29` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Quy định mâm cơm không tham gia vào thuật toán tính điểm Ranking. Khi finalize:

- Thiếu `Required Rule` $\to$ Chặn chốt thực đơn, phiên giữ nguyên `ACTIVE`.
- Thiếu `Preferred Rule` hoặc `Target Count` $\to$ Cảnh báo mềm, Creator có quyền xác nhận tiếp tục (Override).

---

# DEC-012 — Ranking Model, Cooldown and Exploration Strategy

- **Ngày quyết định:** `2026-08-14` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

- Thuật toán gợi ý cá nhân dùng mô hình tuyến tính xác định (Linear Weighted Score), có thể giải thích được lý do.
- Cửa sổ Cooldown 7 ngày theo hàm phân rã tuyến tính ở cấp độ món ăn.
- Tỉ lệ khám phá cố định 20% (ghép 4 thẻ Exploit + 1 thẻ Explore).
- Session Ranking thuần túy dựa trên bằng chứng tương tác thực tế trong phiên.

---

# DEC-013 — Auth.js Beta Dependency

- **Ngày quyết định:** `2026-08-17` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Ghim chính xác phiên bản `next-auth@5.0.0-beta.32` (`@auth/core@0.41.3`) để đảm bảo tính tương thích tuyệt đối với **Next.js 16** và **React 19**.

---

# DEC-014 — `provisionUser` Failure Surfaces as Exception at the Auth.js Boundary

- **Ngày quyết định:** `2026-08-17` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Chủ động ném exception tại `callbacks.jwt` khi `provisionUser` thất bại để Auth.js chuyển hướng sang trang lỗi `pages.error`, tránh lỗi vòng lặp chuyển hướng vô tận (silent redirect loop).

---

# DEC-015 — neon-http `db.batch()` Is a Real Transaction; `db.transaction()` Is Not

- **Ngày quyết định:** `2026-08-17` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Sử dụng `db.batch([...])` của driver `neon-http` cho các luồng ghi nguyên tử nhiều bảng không phụ thuộc kết quả đọc giữa chừng.

---

# DEC-016 — Canonical IANA Time Zone Stored, Not User Input

- **Ngày quyết định:** `2026-08-17` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Chuẩn hóa múi giờ bằng `Intl.DateTimeFormat().resolvedOptions().timeZone` trước khi lưu vào `groups.timezone` để đồng bộ giữa các trình duyệt (Chrome `Asia/Saigon` vs Firefox `Asia/Ho_Chi_Minh`).

---

# DEC-017 — `DISPLAY_TIME_ZONE_FALLBACK` Is Display-Only, Never a Group Default

- **Ngày quyết định:** `2026-08-17` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Hằng số `DISPLAY_TIME_ZONE_FALLBACK = 'Asia/Ho_Chi_Minh'` chỉ dùng để hiển thị ngày ở các trang chưa có bối cảnh nhóm (như `/groups`), tuyệt đối không dùng làm giá trị mặc định ngầm khi tạo nhóm.

---

# DEC-018 — Database Enums Defined with `pgEnum`

- **Ngày quyết định:** `2026-08-18` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Định nghĩa Enum trong Drizzle bằng `pgEnum(...)` để cơ sở dữ liệu PostgreSQL trực tiếp từ chối các giá trị không hợp lệ.

---

# DEC-019 — Dish Name Normalization: Level 1 in E1, Diacritics Removal in E2-T3 with Backfill

- **Ngày quyết định:** `2026-08-18` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Thực hiện chuẩn hóa Level 1 (NFC, cắt khoảng trắng, chữ thường) ở E1; chuyển đổi bỏ dấu tiếng Việt (Level 2) sang E2-T3 kèm migration backfill dữ liệu.

---

# DEC-020 — Route Revalidation and Client Router Refresh in Server Actions

- **Ngày quyết định:** `2026-08-18` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Gọi `revalidatePath('/groups/${groupId}')` với đường dẫn cụ thể để xóa cache trang tổng quan cha, kết hợp `refresh()` từ `next/cache` để làm mới router trên trang hiện tại.

---

# DEC-021 — Error Boundary Components Use `retry` Prop in Next.js 16

- **Ngày quyết định:** `2026-08-18` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Trang `error.tsx` nhận prop `{ retry: () => void }` theo chuẩn Next.js 16 để refetch lại dữ liệu từ server khi người dùng nhấn "Thử lại".

---

# DEC-022 — State Adjustment During Render for Server Action State Transitions

- **Ngày quyết định:** `2026-08-18` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Áp dụng mẫu "adjust state during render" của React thay vì lạm dụng `useEffect` để tránh lỗi cascading render và cảnh báo của React Compiler.

---

# DEC-023 — Animated Sheet Exit via `useSheetClose` Context

- **Ngày quyết định:** `2026-08-18` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Cung cấp hook `useSheetClose()` để kích hoạt hiệu ứng animation trượt xuống mượt mà trước khi component Bottom Sheet unmount khỏi DOM.

---

# DEC-024 — E1-T7's Minimal `startSession` Does Not Need the WebSocket Driver

- **Ngày quyết định:** `2026-08-18` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

`startSession` ở E1-T7 là một câu lệnh `UPDATE` đơn lẻ, tận dụng transaction ngầm của Postgres và Partial Unique Index để bắt lỗi race condition, chưa cần tới driver WebSocket.

---

# DEC-025 — `interaction_events` Logs Every SPEC-012 Request, Including Idempotent Repeats

- **Ngày quyết định:** `2026-08-18` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Mọi lượt request tương tác hợp lệ đều được ghi đúng 1 dòng vào `interaction_events` (Append-only Audit Log), trong khi bảng `interactions` chỉ lưu trạng thái hiệu lực cuối cùng.

---

# DEC-026 — E1-T11 Does Not Need the WebSocket Driver Either

- **Ngày quyết định:** `2026-08-18` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

`finalizeSession` đọc toàn bộ dữ liệu cần thiết trước khi bước vào giai đoạn ghi `db.batch()`, đảm bảo tính nguyên tử tuyệt đối mà không cần kết nối WebSocket phức tạp.

---

# DEC-027 — Invite Consumption Uses a Single Raw-SQL CTE, Not db.batch()

- **Ngày quyết định:** `2026-08-18` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Thao tác nguyên tử của `joinByInvite` (đánh dấu token đã dùng + tạo group membership) được triển khai qua một câu lệnh SQL duy nhất chứa CTE (`WITH consumed AS (UPDATE ... RETURNING id) INSERT INTO group_members ... SELECT ... FROM consumed`), thực thi qua `db.execute(sql\`...\`)` thay vì `db.batch([...])`.

### Lý do (Rationale)

`db.batch()` trên driver `neon-http` là non-interactive: không thể khiến câu lệnh thứ hai phụ thuộc vào kết quả của câu lệnh thứ nhất trong cùng 1 lượt gọi. Trong khi đó, việc INSERT membership chỉ được phép xảy ra khi UPDATE invite thực sự tiêu thụ được 1 token chưa dùng — đúng trường hợp "đọc rồi ghi thực sự" mà DEC-018/020 dự đoán. Một câu CTE duy nhất đảm bảo tính nguyên tử theo ngữ nghĩa Postgres mà không cần `db.transaction()` hay driver WebSocket.

---

# DEC-028 — Invite Tokens: node:crypto, SHA-256, No Bcrypt

- **Ngày quyết định:** `2026-08-18` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Token mời sử dụng `randomBytes(24)` (192-bit) từ `node:crypto` để sinh chuỗi ngẫu nhiên (base64url) và băm SHA-256 (`createHash('sha256')`) để lưu hash trong CSDL — không dùng bcrypt hay argon2.

### Lý do (Rationale)

Bcrypt/argon2 sinh ra để làm chậm việc dò mật khẩu yếu do con người tự đặt. Token mời được sinh tự động từ máy với entropy ≥ 192 bit — việc brute-force là bất khả thi. SHA-256 đáp ứng đúng yêu cầu "không lưu token thô trong DB" (SPEC-003) mà vẫn giữ hiệu năng tra cứu nhanh.

---

# 📜 Lịch sử thay đổi (Change History)

| Version | Ngày | Nội dung cập nhật |
| :---: | :---: | :--- |
| `2.0` | 2026-08-18 | Bổ sung `DEC-027` (CTE nguyên tử cho invite) và `DEC-028` (Invite token SHA-256) cho E2-S1 |
| `1.9` | 2026-08-18 | Bổ sung `DEC-026` cho E1-T10/T11: `finalizeSession` dùng `db.batch()` nguyên tử |
| `1.8` | 2026-08-18 | Bổ sung `DEC-025` cho E1-T9: `interaction_events` ghi nhật ký mọi request |
| `1.7` | 2026-08-18 | Bổ sung `DEC-024` cho E1-T7: `startSession` tối thiểu không cần WebSocket |
| `1.6` | 2026-08-18 | Bổ sung `DEC-022` (Adjust state during render) và `DEC-023` (Animated sheet exit) |
| `1.5` | 2026-08-18 | Bổ sung `DEC-018` đến `DEC-021` cho E1-T5 (Dish thô): pgEnum, normalize-name, Server Actions revalidate, error.tsx |
| `1.4` | 2026-08-17 | Bổ sung `DEC-015` đến `DEC-017` cho E1-T2/T3/T4: Batch transactions, IANA timezone |
| `1.3` | 2026-08-17 | Bổ sung `DEC-013` (Auth.js beta) và `DEC-014` (`provisionUser` boundary exception) |
| `1.2` | 2026-08-14 | Bổ sung `DEC-012` (Mô hình Ranking, Cooldown 7 ngày, Exploration 20%) |
| `1.1` | 2026-07-29 | Bổ sung `DEC-010` (Group/Session Rules) và `DEC-011` (Final Meal validation) |
| `1.0` | 2026-07-23 | Khởi tạo Decision Log ban đầu với `DEC-001` đến `DEC-009` |

