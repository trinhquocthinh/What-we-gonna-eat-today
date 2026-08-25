# 📜 Decision Log (ADRs) — What We Gonna Eat Today

> **Document Metadata**
>
> - **Version:** `3.5` | **Status:** `Active`
> - **Created:** `2026-07-23` | **Last Updated:** `2026-08-21`
> - **Supersedes:** `v2.0` | **Upstream:** [Problem Definition](what-we-gonna-eat-today_problem-definition_v1.3.md) • [Business Rules](what-we-gonna-eat-today_business-rules_v1.4.md)
> - **Downstream:** [Tech Spec & Architecture](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) • [SDD](what-we-gonna-eat-today_sdd_v0_1.md) • [Master Plan](what-we-gonna-eat-today_master-plan_v1_0.md)
>
> 📌 *Decision Log ghi lại 37 quyết định kiến trúc và nghiệp vụ cốt lõi (ADR), giải thích cặn kẽ bối cảnh, lý do (Rationale), hệ quả (Consequence) và các tài liệu bị ảnh hưởng.*

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
| [`DEC-029`](#dec-029--reusing-a-duplicate-candidate-is-a-separate-use-case-outside-spec-005) | Dùng lại món trùng lặp là Use Case riêng biệt ngoài SPEC-005 | 2026-08-18 | `Accepted` | `addExistingDishToGroup`, nút "Dùng món này" S-06 |
| [`DEC-030`](#dec-030--tc-021-system-tag-validation-deferred-to-e2-t5) | Hoãn kiểm tra System Tag (TC-021) sang E2-T5 | 2026-08-18 | `Accepted` | Điều chỉnh phạm vi validation tag sang E2-T5 |
| [`DEC-031`](#dec-031--system-tag-model-accepts-05-add-dish-sheet-enforces-exactly-one) | System Tag: Model nhận 0..5, Sheet S-06 chọn đúng một nhãn | 2026-08-18 | `Accepted` | Định dạng SystemTag, SPEC-006, UX Sheet S-06 |
| [`DEC-032`](#dec-032--duplicate-candidates-come-from-two-sources-with-different-actions) | Ứng viên trùng lặp từ hai nguồn với hai hành động khác nhau | 2026-08-18 | `Accepted` | Phát hiện trùng client vs server, E2-T6/E2-T7, S-06 |
| [`DEC-033`](#dec-033--e3-t1-does-not-need-the-websocket-driver-the-rule-snapshot-belongs-to-e5-t4) | E3-T1 không cần WebSocket; Snapshot Rule thuộc về E5-T4 | 2026-08-19 | `Accepted` | Cơ chế Start, driver DB, phân định phạm vi E3/E5 |
| [`DEC-034`](#dec-034--e3-t3e3-t4-ship-as-one-function-draftactive-are-illustrative-labels) | E3-T3/E3-T4 gộp làm một hàm; "Draft"/"Active" là nhãn minh hoạ | 2026-08-19 | `Accepted` | Use case `addParticipant`, SPEC-009 |
| [`DEC-035`](#dec-035--completereopen-ui-predates-its-backend-e3-t5-is-purely-wiring) | Complete/Reopen UI đã có sẵn; E3-T5 chỉ đấu nối backend | 2026-08-19 | `Accepted` | Giao diện deck, use case set completed |
| [`DEC-036`](#dec-036--v10-personal-score-uses-only-the-recency-term-two-level-tie-break) | Personal Score v1.0 chỉ dùng số hạng recency; Tie-break hai tầng | 2026-08-19 | `Accepted` | Công thức điểm, thứ tự candidate deck, SPEC-010 |
| [`DEC-037`](#dec-037--builddeck-takes-an-input-object-not-the-bare-array-of-tech-spec-24) | `buildDeck` nhận Input Object thay vì mảng trần | 2026-08-19 | `Accepted` | Chữ ký hàm domain ranking, seed hash |
| [`DEC-038`](#dec-038--interaction-ordering-uses-client-reported-timestamp-not-server-arrival-order) | Thứ tự tương tác dùng timestamp từ client | 2026-08-19 | `Accepted` | Xử lý đụng độ swipe, TC-106 |
| [`DEC-039`](#dec-039--list-deck-reads-eating-history-on-every-call-not-just-first-materialize) | `list-deck` đọc lịch sử ăn ở mỗi lần gọi | 2026-08-19 | `Accepted` | Nhãn giải thích thẻ món ăn |
| [`DEC-040`](#dec-040--systemtag-moves-to-shareddomain-schema-follows-tech-spec-31-verbatim) | SystemTag chuyển sang `shared/domain`; Schema đủ 6 cột | 2026-08-20 | `Accepted` | Kiến trúc domain dùng chung, bảng `group_rules` |
| [`DEC-041`](#dec-041--e5-adds-subtask-e5-t1b-the-group-rules-screen) | Bổ sung subtask `E5-T1b` (màn hình S-07) vào E5 | 2026-08-20 | `Accepted` | Kế hoạch E5, màn hình Quy định bữa ăn |
| [`DEC-042`](#dec-042--session-rules-snapshot-at-start-not-at-draft-creation) | Session Rules Snapshot lúc Start, không phải lúc tạo Draft | 2026-08-20 | `Accepted` | Khởi động phiên, bất biến quy định |
| [`DEC-043`](#dec-043--session--rule-is-the-fifth-cross-feature-edge-what-crosses-is-an-unexecuted-statement) | session → rule là chiều cross-feature thứ 5; Statement chưa chạy | 2026-08-20 | `Accepted` | Ranh giới kiến trúc, `db.batch()` |
| [`DEC-044`](#dec-044--session_rules-has-no-surrogate-id) | `session_rules` không có Surrogate ID, dùng Composite PK | 2026-08-20 | `Accepted` | Schema DB, `INSERT … SELECT` |
| [`DEC-045`](#dec-045--session-score-drops-the-cannot-eat-term-and-defines-its-own-tie-break) | Session Score bỏ số hạng Cannot-Eat và tự định nghĩa Tie-break | 2026-08-20 | `Accepted` | Thuật toán điểm đồng thuận, thứ tự xếp hạng S-10 |
| [`DEC-046`](#dec-046--the-finalize-screen-lives-entirely-in-featuresmeal-app-maps-the-ranking) | Màn S-10 sống trọn trong features/meal; app/ ánh xạ ranking | 2026-08-20 | `Accepted` | Cấu trúc UI S-10, ranh giới cross-feature meal/selection |
| [`DEC-047`](#dec-047--e6-adds-e6-t7-and-e6-t8-the-two-read-only-screens-ms-01-requires) | Bổ sung E6-T7 và E6-T8 cho MS-01 | 2026-08-21 | `Accepted` | Kế hoạch E6, màn S-11 và S-12 |
| [`DEC-048`](#dec-048--system_tag_labels-moves-to-sharedui-eating-history-is-queried-by-user-routed-by-group) | SYSTEM_TAG_LABELS chuyển sang shared/ui; Eating History query theo User | 2026-08-21 | `Accepted` | Chia sẻ nhãn tag UI, truy vấn lịch sử ăn |
| [`DEC-049`](#dec-049--one-messageforfailure-not-a-flat-table-validation-fields-are-named-by-subject) | Bảng dịch mã lỗi messageFor, đổi field validation theo chủ thể, component InlineError | 2026-08-21 | `Accepted` | Bảng dịch mã lỗi, component InlineError |
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

# DEC-029 — Reusing a Duplicate Candidate Is a Separate Use Case, Outside SPEC-005

- **Ngày quyết định:** `2026-08-18` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

"Dùng lại món ăn đang có từ danh sách ứng viên trùng lặp" (nút "Dùng món này" trên màn hình S-06) được thiết kế thành một use case độc lập `addExistingDishToGroup`, nhận trực tiếp `{ groupId, globalDishId }` — không phải là mở rộng tham số của `addDishToGroup` (`{ groupId, name, forceCreate }`).

### Cơ sở (Rationale)

BR-001 và PRD US-002 mô tả khả năng "chọn một món đang có", thiết kế S-06 thể hiện nút "Dùng món này". Tuy nhiên, hợp đồng chuẩn của SPEC-005 và TC-017 đến TC-021 chỉ tập trung vào việc tạo mới theo tên hoặc trả danh sách ứng viên (TC-018) và cờ `forceCreate` (TC-019), không có trường hợp thứ ba cho reuse. Thay vì làm phức tạp hoá hợp đồng `addDishToGroup`, việc tách `addExistingDishToGroup` giúp biểu diễn đúng bản chất: gắn một Global Dish đã biết vào Group Dish Pool và luôn an toàn để upsert (vì candidate không bao giờ trùng món đang ACTIVE trong cùng group).

### Hệ quả (Consequence)

E2-T6/E2-T7 (S4) sẽ nối trực tiếp nút "Dùng món này" với Server Action gọi `addExistingDishToGroup`.

---

# DEC-030 — TC-021 (System Tag Validation) Deferred to E2-T5

- **Ngày quyết định:** `2026-08-18` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

TC-021 (`systemTags` chứa giá trị không hợp lệ → `ERR_INVALID_SYSTEM_TAG`) được chuyển sang triển khai ở E2-T5 (S3) thay vì E2-T4.

### Cơ sở (Rationale)

Type `SystemTag` và bảng lưu trữ `group_dish_tags` chỉ xuất hiện từ E2-T5 (SPEC-006). Việc đưa `systemTags` vào input của `addDishToGroup` ở E2-T4 nhưng chưa thể lưu trữ vào DB là không hoàn chỉnh. E2-T5 là nơi type, bảng dữ liệu và logic validation được triển khai đồng bộ.

---

# DEC-031 — System Tag: Model Accepts 0..5, Add-Dish Sheet Enforces Exactly One

- **Ngày quyết định:** `2026-08-18` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

`group_dish_tags`, use case `setSystemTags` (SPEC-006), và `addDishToGroup` đều chấp nhận từ 0 đến 5 System Tags (`0..5`). Tuy nhiên, sheet Thêm món (S-06) thể hiện hàng chip chọn một nhãn bắt buộc và gửi chính xác 1 tag. Giao diện chỉnh sửa đa nhãn (multi-select) sẽ được hoàn thiện cùng với màn hình danh mục món ở E2-T6.

### Lý do (Rationale)

Tài liệu có sự khác biệt giữa các tầng: BR-003 cho biết một món có thể mang nhiều tag; TC-022 gán 2 tag, TC-023 gán 0 tag, TC-100 gán 5 tag. Trong khi đó, mockup S-06 yêu cầu "Nhãn — chọn một" và bắt buộc chọn để quy định bữa ăn kiểm tra được (nudge UX). Do đó, mô hình dữ liệu và các port tuân theo hợp đồng chuẩn 0..5, còn sheet S-06 đóng vai trò là lối nhập liệu nhanh với 1 nhãn bắt buộc.

### Hệ quả (Consequence)

`SystemTagField` mang cảnh báo rõ ràng chống việc thu hẹp mô hình xuống 1 tag. E2-T6 sẽ triển khai chỉnh sửa đa nhãn mà không làm thay đổi các port domain/application.

---

# DEC-032 — Duplicate Candidates Come From Two Sources With Different Actions

- **Ngày quyết định:** `2026-08-18` | **Trạng thái:** `Accepted`

### Quyết định (Decision)

Khối "Nhà bạn đã có món gần giống" trên màn hình S-06 hợp nhất hai loại ứng viên:

- `inGroup` — near-matches tìm thấy ở client bằng substring hai chiều trên danh sách món đã tải sẵn của chính Group. "Dùng món này" không thực hiện mutation nào vào DB; món đã có trong pool nên chỉ đóng sheet và hiện toast thông báo.
- `global` — Global Dishes trùng tên chính xác sau chuẩn hoá (`normalized_name`) do nhóm khác tạo, được server trả về sau khi bấm lưu. "Dùng món này" gọi `addExistingDishToGroup`.

### Cơ sở (Rationale)

Mockup và backend giải quyết hai bài toán khác nhau: `S-05 S-06 Danh muc mon.dc.html:188-193` khớp substring hai chiều với danh sách của chính nhóm; SPEC-005 / E2-T4 khớp chính xác tên chuẩn hoá trên toàn cục. Cơ chế thứ nhất ngăn việc một gia đình thêm "Canh chua" khi đã có "Canh chua cá lóc"; cơ chế thứ hai ngăn trùng lặp Global Dish giữa các gia đình. Nếu chỉ giữ cơ chế thứ hai, panel sẽ gần như không bao giờ xuất hiện trong một deployment đơn nhóm.

Khớp near-match ở client không tốn tài nguyên mạng hay truy vấn DB do `DishCatalogScreen` đã có sẵn toàn bộ danh sách món.

BR-001 quy định rõ: "các món có khả năng trùng **hoặc tương tự**".

### Đính chính (Correction)

Tài liệu PRD không có mã "D-10" và mục Out of Scope không loại trừ fuzzy matching — chỉ loại trừ tự động gộp (merge) món trùng ở mức Global. Việc phát hiện gần giống không vi phạm bất kỳ tài liệu nào.

### Hệ quả (Consequence)

Trường `DuplicateCandidate.kind` là bắt buộc: `inGroup` id là `group_dishes.id`, `global` id là `global_dishes.id`.

### Phạm vi ảnh hưởng (Affected Documents)

- SDD SPEC-005
- Master Plan §4 (E2-T6 / E2-T7)

---

# DEC-033 — E3-T1 Does Not Need the WebSocket Driver; the Rule Snapshot Belongs to E5-T4

**Ngày quyết định:** 2026-08-19 | **Trạng thái:** Accepted

## Quyết định

`startSession`'s 4-step revalidation (session state, caller-is-creator,
participants-still-members) runs entirely on the existing `neon-http` driver:
explicit SELECT reads followed by the single conditional UPDATE already
implemented at E1-T7. No WebSocket driver (`neon-serverless`) is introduced at
E3-T1.

## Rationale

Earlier guides (E1-S4, E1-S6) and their resulting code comments
(`src/shared/db/client.ts`, `start-session.ts`) claimed the WebSocket driver
would be required starting at E3-T1, reasoning that SPEC-008's "snapshot
Group Rule → Session Rule" step needed a genuine interactive read-then-write
transaction. This was incorrect: `group_rules`/`session_rules` do not exist
until `E5-T1` (dependency: `E2-T5`), which lands after E3 entirely. The
snapshot is its own Master Plan subtask, `E5-T4`, which explicitly depends on
`E3-T1` (not the reverse) — it inserts the snapshot into the transaction
`startDraft` already provides, once the rule tables exist. E3-T1's own scope
never touches rules at all.

## Consequence

The forward-looking comments in `client.ts` and `start-session.ts` are
corrected to point at `E5-T4` instead of `E3-T1` (see Implementation Guide
§1/§11). Anyone implementing `E5-T4` should re-read this entry before
reaching for `neon-serverless` — the interactive transaction requirement is
real, just two epics later than previously documented.

## Affected Documents

- `src/shared/db/client.ts` (comment corrected)
- `src/features/session/application/start-session.ts` (docstring corrected)
- Master Plan §7 (E5-T4 scope note, no textual change needed — already correct)

---

# DEC-034 — E3-T3/E3-T4 Ship as One Function; "Draft"/"Active" Are Illustrative Labels

**Ngày quyết định:** 2026-08-19 | **Trạng thái:** Accepted

## Quyết định

`addParticipant` is implemented once, accepting a session in either `DRAFT`
or `ACTIVE` state, covering all four of TC-036 through TC-039 in a single
function. The Master Plan's subtask titles ("Thêm Participant khi Draft" /
"...khi Active") do not correspond to a state-based code branch.

## Rationale

TC-036's own precondition text reads "Session ACTIVE, User là Member" —
verbatim from the Test Cases Specification — despite being the test Master
Plan assigns to the "khi Draft" subtask (`E3-T3`). No test case in the
SPEC-009 group actually exercises a `DRAFT` precondition. SPEC-009 itself
states plainly that both states are allowed. Both subtasks also share the
exact same file target (`add-participant.ts`). Splitting the implementation
into two state-gated code paths to match the subtask titles would invent a
distinction the source documents don't actually draw — the real split is
test-case difficulty (T3 = happy path + membership check; T4 = the two
harder negative cases, one of which needs a real database).

## Consequence

Anyone reading `add-participant.ts` should not look for separate
Draft-only/Active-only logic — there isn't any, by design. Future test cases
referencing "khi Draft" behavior specifically should be added to this same
function's test suite, not a new file.

## Affected Documents

- Test Cases Specification (TC-036's precondition text is inconsistent with
  Master Plan's E3-T3 label; noted here, not edited in the source doc)

---

# DEC-035 — Complete/Reopen UI Predates Its Backend; E3-T5 Is Purely Wiring

**Ngày quyết định:** 2026-08-19 | **Trạng thái:** Accepted

## Quyết định

`deck-screen.tsx`'s "Tôi chọn xong"/"Mở lại lượt chọn" UI, shipped at E1-T8,
is left visually and structurally unchanged. E3-T5 adds a backend (use case,
two repository methods, one Route Handler) and rewires the two existing
`onClick` handlers plus the initial `view` state to reflect it — no new UI
is designed from scratch.

## Rationale

Reading the shipped file before designing showed the mockup-accurate UI
already existed as pure local `setState` calls with zero backend
integration. `record-interaction.ts` and `list-deck.ts` (SPEC-012/011) were
also independently confirmed already correct for TC-055 — both already treat
`COMPLETED` participants as eligible to keep swiping (blacklist- and
whitelist-style checks respectively, neither requiring `state === 'ACTIVE'`).
Redesigning any of this would have duplicated already-correct, already-built
work.

## Consequence

Anyone reviewing this slice's diff should expect it to touch application/
infrastructure/route files heavily and `deck-screen.tsx` only lightly (new
prop, two handler bodies, one copy fix) — a large UI diff here would be a
sign of scope drift.

## Affected Documents

- `src/shared/db/schema.ts` (stale "(E4)" comment on `participantState`,
  corrected to "(E3-T5)")

---

# DEC-036 — v1.0 Personal Score Uses Only the Recency Term; Two-Level Tie-Break

**Ngày quyết định:** 2026-08-19 | **Trạng thái:** Accepted

## Quyết định

`computePersonalScore` implements `score = −w_recency × R` only. `RankingInput`
declares just `recencyPenalty`. `buildDeck` sorts by score, then by days-since-
last-eaten (never-eaten first), then by `stableHash` — two tie-break levels, not
the three in Ranking Spec §2.5.

## Rationale

Ranking Spec §2.2 (Approved) defines five score terms, but SDD SPEC-010 states
the v1.0 rule explicitly and narrowly: `score = −w_recency × R`. The other four
terms have no data source in v1.0 — `E` needs Like/Dislike (F16, v1.1), `I`
needs Implicit Preference (F30, v1.2), `C` needs Chef Mode (F33, v1.2), `S`
needs Purchase Source (F36, v1.2). SPEC-010 likewise drops Ranking Spec §2.5's
middle tie-break ("known purchase source first") for the same reason.

Declaring the unused terms on `RankingInput` would force every call site to
pass meaningless zeros and would suggest a capability that does not exist. The
weights themselves ARE kept, in `RANKING_CONFIG`, because Ranking Spec §1
principle 4 requires all constants to live in exactly one place.

Explore Lane interleaving (Ranking Spec Stage 3 / BR-047) and mid-session deck
freezing (§2.7 / BR-048) are likewise out of E4: PRD §6 schedules "Explore lane
20%" for v1.1, and E1-S5 already marked both as `F18/v1.1` in shipped code
comments.

## Consequence

When F16/F30/F33/F36 land, extend `RankingInput` and `computePersonalScore`
together — the config values are already present and correct. Reviewers of E4
should expect a one-term formula and not treat it as an incomplete port of the
Ranking Spec.

## Affected Documents

- Ranking Spec §2.2, §2.5 (documents the v1.0 narrowing; specs unchanged)
- SDD SPEC-010 (the governing contract)

---

# DEC-037 — `buildDeck` Takes an Input Object, Not the Bare Array of Tech Spec §2.4

**Ngày quyết định:** 2026-08-19 | **Trạng thái:** Accepted

## Quyết định

`buildDeck(input: BuildDeckInput, config: RankingConfig)` where
`BuildDeckInput = { sessionId, userId, eligible }`, instead of Tech Spec §2.4's
`buildDeck(eligible: DishRankingInput[], config: RankingConfig)`.
`computePersonalScore` and `computeSessionScore` keep their §2.4 signatures.

## Rationale

The third tie-break level is `stable_hash(session_id, user_id, dish_id)`
(Ranking Spec §2.5, SDD SPEC-010). The two-parameter signature has nowhere to
carry a per-(session, user) seed. The alternative — duplicating `sessionId` and
`userId` onto every element of `eligible` — repeats two values N times and
creates a class of bug where elements disagree about which session they belong
to. Tech Spec §2.4 is an illustrative shape sketch for the module, not a
byte-exact contract.

## Consequence

E5-T6's `computeSessionScore` lands in this same file and should keep the §2.4
signature — this deviation is specific to `buildDeck`'s seed requirement.

## Affected Documents

- Tech Spec §2.4 (signature sketch; not updated in place)

---

# DEC-038 — Interaction Ordering Uses Client-Reported Timestamp, Not Server Arrival Order

**Ngày quyết định:** 2026-08-19 | **Trạng thái:** Accepted

## Quyết định

`interactions.updated_at` now stores the CLIENT's reported action timestamp
(`clientTimestamp`, captured at gesture-commit time), not the server's
processing time. `applyInteraction`'s upsert uses
`ON CONFLICT ... DO UPDATE ... WHERE updated_at < clientTimestamp` — a single
SQL statement, no read-then-write — to reject writes whose reported intent is
older than what's already stored, regardless of network arrival order.

## Rationale

SPEC-012's formal input (`{ sessionId, dishId, action }`) has no timestamp
field, but TC-106 and R-04 require rejecting a write when the ARRIVING request
represents an OLDER user intent than one already applied — a distinction the
server cannot make from arrival order alone. This is the same class of gap as
DEC-030-style spec omissions: a parameter genuinely necessary for the stated
DoD, absent from the formal contract, added by necessity.

Only SWIPE_RIGHT/SWIPE_LEFT are guarded this way. UNDO keeps its original
unconditional delete — extending the guard there requires distinguishing "no
row ever existed" from "a newer row exists," which TC-106 does not test and
no other TC requires.

## Consequence

A client can only affect the ordering of its OWN swipes on a dish it
controls (the unique constraint is per session+participant+dish) — a
malicious or buggy client can at most confuse its own deck state, not another
participant's. `interaction_events.created_at` remains server-generated and is
the accurate audit trail of processing order if ever needed independently of
`clientTimestamp`.

## Affected Documents

- SDD SPEC-012 (documents the gap; input contract not edited in place)

---

# DEC-039 — list-deck Reads Eating History on Every Call, Not Just First Materialize

**Ngày quyết định:** 2026-08-19 | **Trạng thái:** Accepted

## Quyết định

`listDeck` (S2/E4-T4) is amended: `history.findEatingDates` now runs on every
call, not only when `findMaterializedDeck` returns `null`. Only the ranking
computation (`buildDeck`) and the `materializeDeck` write remain conditional
on first-open.

## Rationale

S2 optimized the history read away for repeat views because the deck's ORDER
is frozen once materialized and doesn't need recomputing. But S1 committed to
displaying real `lastEatenLabel`/explanation data on every card (deferred to
S4), and that display data is not the same thing as the order — it must stay
current across every view, not just the first. Splitting "read history" from
"compute and persist ranking" resolves both requirements without reintroducing
the cost S2 was avoiding (the ranking computation and the `session_decks`
write still only happen once).

## Consequence

Every deck page load now performs one indexed SELECT against `eating_history`
in addition to the existing queries. This is page-load cost, not
swipe-interaction cost, so it does not affect NFR-02 (which governs the
interaction Route Handler's response time, not initial page render).

## Affected Documents

- E4-S2 implementation guide (`list-deck.ts`'s design section is superseded by
  this entry for the history-read timing; the materialize/pagination logic
  itself is unchanged)

---

# DEC-040 — SystemTag Moves to shared/domain; Schema Follows Tech Spec §3.1 Verbatim

- **Ngày:** 2026-08-20
- **Trạng thái:** Accepted
- **Bối cảnh:** E5-S1

## Quyết định

1. `SystemTag`, `SYSTEM_TAGS`, `isSystemTag` chuyển từ `features/dish/domain/system-tag.ts`
   sang `shared/domain/system-tag.ts`. `features/dish/domain/system-tag.ts` giữ nguyên đường
   dẫn, giữ `readSystemTags`/`toSystemTags`/`SystemTagError`, và re-export ba tên đã chuyển.
2. Bảng `group_rules` chép đủ 6 cột của Tech Spec §3.1 kể cả `rule_type` và `overridable`,
   trong khi `GroupRuleDraft` ở `domain/` chỉ có `systemTag` + `minimumCount`.

## Rationale

1. Ba feature cần `SystemTag`: `dish` (gán), `rule` (đặt chỉ tiêu), `meal` (đối chiếu lúc
   chốt). `ALLOWED_CROSS_FEATURE` không cho `rule → dish` cũng như `meal → dish`. Nới bảng
   cross-feature hai chiều để lấy một union 5 phần tử là đổi hợp đồng kiến trúc (Tech Spec
   §2.3) nhằm tránh một lần chuyển file. Khai bản sao trong `rule/domain` sẽ thành bản sao
   thứ ba của cùng một union.
2. Nguyên tắc "không thêm trường chưa ai đọc" (DEC-036, `ranking.ts`) áp cho KIỂU TS, không
   áp cho SCHEMA. Thêm một trường vào kiểu ở v1.1 là một dòng diff; thêm một cột vào bảng
   đang có dữ liệu là một migration cộng một lần backfill cộng một cửa sổ mà code cũ chạy
   trên schema mới. Ngoài ra `rule_type` bắt buộc phải có ngay vì ràng buộc
   `unique(group_id, rule_type, system_tag)` mà E5-T2 đòi không viết được nếu thiếu nó.

## Consequence

- `shared/domain/` là thư mục mới; mọi kiến thức miền dùng chung từ nay đặt ở đó.
- `session_rules` (S2) KHÔNG có `overridable` — theo đúng Tech Spec §3.1 dòng 165.
- v1.1 bật Preferred Rule chỉ cần ghi giá trị `'PREFERRED'`, không cần migration.

## Affected Documents

- Tech Spec §2.2 — thêm `shared/domain/` vào mô tả cây thư mục.

---

# DEC-041 — E5 Adds Subtask E5-T1b: the Group Rules Screen

- **Ngày:** 2026-08-20
- **Trạng thái:** Accepted
- **Bối cảnh:** E5-S1

## Quyết định

Thêm `E5-T1b` "Màn hình S-07 Quy định bữa ăn" (2 giờ) vào Master Plan §7, nằm trong Slice S1
cùng `E5-T1` và `E5-T2`.

## Rationale

Master Plan v1.3 giao `E5-T1` đúng tầng `application` và không có subtask UI nào cho màn
"Quy định bữa ăn" — trong khi thư mục thiết kế đã có sẵn `s07-01-quy-dinh.png` và
`s07-02-sheet-them-quy-dinh.png`. Không có màn hình thì Admin không có đường nào đặt rule,
`group_rules` vĩnh viễn rỗng, và toàn bộ E5-T3→E5-T9 chạy trên một bảng không bao giờ có dữ
liệu. Checkpoint §12 của Master Plan hỏi *"Nếu phải dừng dự án ngay ngày mai, phần đã làm có
dùng được không?"* — không có S-07 thì câu trả lời cho E5 là KHÔNG.

## Consequence

- E5 lên 10 subtask, 23 giờ cơ sở (từ 9 subtask, 21 giờ).
- Màn hình chỉ dựng nhóm "Bắt buộc"; nhóm "Nên có" trong mockup là F22 (v1.1).

## Affected Documents

- Master Plan §1 (giờ của E5), §7 (thêm dòng `E5-T1b`).

---

# DEC-042 — Session Rules Snapshot at Start, Not at Draft Creation

- **Ngày:** 2026-08-20
- **Trạng thái:** Accepted
- **Bối cảnh:** E5-S2

## Quyết định

Snapshot `group_rules → session_rules` xảy ra bên trong giao dịch Start (`DRAFT → ACTIVE`),
theo SPEC-022, chứ không lúc tạo Draft như BR-016 mô tả.

## Rationale

BR-016 gắn snapshot-lúc-Draft với quyền "Creator chỉnh Session Rules trong giai đoạn DRAFT".
Quyền đó là F35 Override Session Rule — v1.2. Không có màn hình nào sửa Session Rule ở v1.0,
nên snapshot sớm chỉ tạo thêm một trạng thái phải bảo trì: một Draft mang bản sao rule mà
không ai đọc, và phải làm mới nếu Admin đổi Group Rule trong lúc Draft còn treo. Snapshot lúc
Start khớp đúng BR-015 ("khi bấm Start, Session Rules bị đóng băng hoàn toàn") — ở v1.0, tạo
ra và đóng băng là cùng một khoảnh khắc.

## Consequence

- `TC-091`→`TC-094` viết trên đường đi của `startDraft`, không của `createDraftWithCreatorParticipant`.
- Khi F35 vào v1.2, snapshot dời về lúc tạo Draft và cần thêm bước "làm mới lúc Start" cho
  phần rule chưa bị override.

## Affected Documents

- Business Rules §5.1 (`BR-016`) — đánh dấu "một phần; vế Draft Editing thuộc v1.2".

---

# DEC-043 — session → rule Is the Fifth Cross-Feature Edge; What Crosses Is an Unexecuted Statement

- **Ngày:** 2026-08-20
- **Trạng thái:** Accepted
- **Bối cảnh:** E5-S2

## Quyết định

Thêm `session: ['rule']` vào `ALLOWED_CROSS_FEATURE`. `rule/infrastructure` export
`buildSnapshotStatement(db, sessionId)` trả về một `BatchItem` CHƯA thực thi;
`session/infrastructure.startDraft` bỏ nó vào `db.batch()` của mình.

## Rationale

E5-T4 đòi snapshot nguyên tử với Start (TC-035), nên hai câu phải nằm trong cùng một giao
dịch, mà giao dịch đó do `startDraft` sở hữu. Viết thẳng SQL của `session_rules` vào
`drizzle-session-repository.ts` sẽ để feature `session` sở hữu một mẩu schema của feature
`rule`. Gọi snapshot như một use case rời sau `startDraft` phá TC-035.

Điểm khiến chiều thứ năm này chấp nhận được: thứ đi qua ranh giới không phải dữ liệu và cũng
không phải một query đã chạy, mà là mô tả việc cần làm. `rule` giữ quyền sở hữu SQL của bảng
mình; `session` giữ quyền quyết định giao dịch của mình. Không có đối tượng `tx` nào bị
truyền qua ranh giới — driver HTTP cũng không có `tx`.

## Consequence

- Tech Spec §2.3 chuyển từ "đúng bốn chiều" sang năm chiều.
- Mẫu "export câu lệnh, không export kết quả" là tiền lệ cho mọi lần sau cần ghi chéo feature
  trong một giao dịch.

## Affected Documents

- Tech Spec §2.3 — bảng chiều cross-feature.
- `src/shared/db/client.ts` — ghi chú "E5-T4 cần driver WebSocket" đã sai, sửa lại.

---

# DEC-044 — session_rules Has No Surrogate id

- **Ngày:** 2026-08-20
- **Trạng thái:** Accepted
- **Bối cảnh:** E5-S2

## Quyết định

`session_rules` không có cột `id`; khoá chính là `(session_id, rule_type, system_tag)` —
lệch Tech Spec §3.1 dòng 165.

## Rationale

Snapshot là một câu `INSERT … SELECT` chạy trọn trong Postgres (điều kiện để `db.batch()` đủ
dùng, xem DEC-043). Câu đó không gọi được `uuidv7()` của JavaScript, nên giữ cột `id` buộc
phải chọn một trong hai: dùng `gen_random_uuid()` — phá quy ước "UUID v7 sinh ở tầng ứng dụng"
ghi ở đầu `schema.ts`; hoặc đọc `group_rules` về Node rồi ghi — mất tính tự chứa và kéo theo
nhu cầu driver WebSocket.

Bỏ `id` không mất gì: `unique(session_id, rule_type, system_tag)` mà chính Tech Spec đòi đã là
khoá tự nhiên, một dòng `session_rules` không có định danh riêng và không bảng nào trỏ tới nó.
Dự án đã có ba bảng cùng dạng: `group_dish_tags`, `final_meal_items`, `session_decks`.

## Consequence

- `group_rules` vẫn giữ `id` — bản gốc, người dùng sửa từng dòng, không đi qua `INSERT … SELECT`.

## Affected Documents

- Tech Spec §3.1 dòng 165 — bỏ `id` khỏi mô tả `session_rules`.

---

# DEC-045 — Session Score Drops the Cannot-Eat Term and Defines Its Own Tie-Break

- **Ngày:** 2026-08-20
- **Trạng thái:** Accepted
- **Bối cảnh:** E5-S3

## Quyết định

1. `SessionScoreInput` không có `cannotEatCount` ($X$ của SPEC-014).
2. `rankSession` dùng tie-break hai tầng tự định nghĩa: `score` giảm dần → $P$ giảm dần →
   `dishId` tăng dần.

## Rationale

1. $X$ cần F15 Cannot Eat — v1.1. Mọi giá trị ở v1.0 đều bằng 0. Trọng số `cCannotEat` vẫn ở
   lại `RANKING_CONFIG` vì nguyên tắc hằng số tập trung nói về nơi ĐỊNH NGHĨA, không về nơi
   sử dụng (Ranking Spec §1 nguyên tắc 4, đã áp ở DEC-036).
2. SPEC-014 không quy định tie-break, nhưng hai món cùng điểm là chuyện thường xuyên ($T=4$
   chỉ cho 5 mức điểm nếu $N=H=0$). Không xác định thứ tự thì màn S-10 đổi thứ tự giữa hai lần
   tải trang, và người dùng đọc đó là dữ liệu đang thay đổi. KHÔNG dùng `stableHash` như
   `buildDeck`: hash ở đó tồn tại để hai người thấy thứ tự khác nhau; ở đây cả nhà nhìn cùng
   một bảng.

## Consequence

- v1.1 thêm $X$ chỉ cần thêm một trường vào `SessionScoreInput` và một số hạng — trọng số đã có.
- Tie-break này là hợp đồng của S4: màn S-10 không được sắp lại theo tiêu chí riêng.

## Affected Documents

- SDD `SPEC-014` — ghi chú v1.0 bỏ $X$; bổ sung tie-break.

---

# DEC-046 — The Finalize Screen Lives Entirely in features/meal; app/ Maps the Ranking

- **Ngày:** 2026-08-20
- **Trạng thái:** Accepted
- **Bối cảnh:** E5-S4

## Quyết định

Toàn bộ màn S-10 (bảng xếp hạng + khay chọn + nút chốt) đặt ở
`features/meal/presentation/`, lệch chỉ định của Master Plan cho E5-T7
(`features/selection/presentation/**`). `app/sessions/[sessionId]/summary/page.tsx` gọi
`listSessionRanking` của `selection` rồi ánh xạ kết quả sang props do `meal/presentation` tự
khai. KHÔNG thêm chiều `meal → selection`.

## Rationale

E5-T7, E5-T8, E5-T9 là một màn hình duy nhất chia sẻ một state duy nhất: danh sách món đang
chọn. BR-051 đòi khay, dòng "Còn thiếu" và nút chốt đổi ngay khi bấm Chọn, không round-trip —
nên chúng không tách được thành hai component ở hai feature. Cả hai chiều import đều bị
ALLOWED_CROSS_FEATURE chặn.

Đặt ở `meal` vì màn này LÀ màn chốt bữa (SPEC-015 + SPEC-016, cả hai thuộc `meal`); bảng xếp
hạng là dữ liệu nó hiển thị, không phải việc nó làm. `selection` vẫn giữ trọn phần của mình:
`rankSession` ở domain, `listSessionRanking` ở application. Ánh xạ ở `app/` — đúng nơi dự án
đã đặt mọi việc lắp ráp xuyên feature — rẻ hơn một chiều cross-feature vĩnh viễn chỉ để mượn
một kiểu dữ liệu.

## Consequence

- Master Plan E5-T7 cột "File tác động" đổi sang `src/features/meal/presentation/**`.
- `countInteractionsByDish` (S3) phải trả thêm `systemTags` để client đánh giá rule được.

## Affected Documents

- Master Plan §7 — cột "File tác động" của E5-T7.

---

# DEC-047 — E6 Adds E6-T7 and E6-T8: the Two Read-Only Screens MS-01 Requires

- **Ngày:** 2026-08-21
- **Trạng thái:** Accepted
- **Bối cảnh:** E6-S1

## Quyết định

Thêm `E6-T7` (màn S-11 "Bữa ăn hôm nay" + trạng thái "đã chốt" của S-04, 3h) và `E6-T8`
(màn S-12 "Lịch sử ăn", 2.5h) vào Master Plan §8. Cả hai đi TRƯỚC `E6-T1` và `E6-T6` trong
thứ tự slice.

## Rationale

`MS-01` — smoke test mà chính `E6-T3` phải chạy — ghi kết quả kỳ vọng là "Thấy thực đơn Final
Meal và lịch sử ăn cá nhân". Sau E5 không có route nào cho cả hai, và `MealRepository` chỉ có
`getDraft` còn `HistoryRepository` chỉ trả `globalDishId` không kèm tên món. Không có hai màn
này thì `E6-T3` không hoàn thành được, tức là M6 không đạt.

Ngoài ra `app/groups/[groupId]/page.tsx` chỉ xử lý `state === 'ACTIVE'`; phiên `FINALIZED` rơi
vào nhánh null và Group Hub hiện lại CTA "Mở phiên" dẫn tới `ERR_SESSION_EXISTS_TODAY`. Luồng
chính đang đứt ở bước cuối.

Đi trước `E6-T1`/`E6-T6` vì cả hai là thao tác QUÉT trên toàn bộ màn hình; quét khi tập màn
hình chưa đủ thì phải quét lại lần hai, mà `E6-T6` chính là mốc M6.

## Consequence

- E6 lên 8 subtask, 20.5 giờ cơ sở (từ 6 subtask, 15 giờ).
- Hai màn dựng bản v1.0: bỏ `F15` (Cannot Eat), `F40` (Sửa Final Meal), `F24` (Lưu vết cảnh
  báo), `F28` (Sửa lịch sử ăn) khỏi mockup.

## Affected Documents

- Master Plan §1 (giờ của E6), §8 (thêm hai dòng).

---

# DEC-048 — SYSTEM_TAG_LABELS Moves to shared/ui; Eating History Is Queried by User, Routed by Group

- **Ngày:** 2026-08-21
- **Trạng thái:** Accepted
- **Bối cảnh:** E6-S1

## Quyết định

1. `SYSTEM_TAG_LABELS` chuyển từ `features/dish/presentation/components/system-tag-label.ts`
   sang `src/shared/ui/system-tag-label.ts`.
2. Màn S-12 đặt ở route `/groups/[groupId]/history` nhưng TRUY VẤN theo `userId`; `groupId`
   chỉ dùng cho guard, tên nhóm ở header và đường quay lại.

## Rationale

1. Feature thứ ba (`meal`, cho S-11) cần bảng nhãn này, mà `meal → dish` không nằm trong
   `ALLOWED_CROSS_FEATURE`. Cùng lý lẽ đã áp cho `SystemTag` ở DEC-040: chuyển lên tầng dùng
   chung rẻ hơn nới bảng cross-feature hoặc nhân bản lần thứ ba.
2. `eating_history` trỏ `global_dish_id` và không có cột `group_id` (BR-056) — lịch sử thuộc
   về User. Nhưng header trong mockup ghi tên nhóm, và ở v1.0 mỗi User chỉ thuộc một Group
   (DEC-004). Route theo Group cho header và điều hướng; truy vấn theo User cho đúng dữ liệu.
   Khi F43 vào v1.1+, route giữ nguyên còn truy vấn phải đổi — ghi chú đã đặt sẵn trong
   `page.tsx`.

## Consequence

- `features/dish/presentation/components/system-tag-label.ts` re-export để 4 chỗ đang import
   không phải đổi; nếu knip báo export chết thì đổi import thẳng.
- S-12 không lọc theo Group: một User (giả định) thuộc hai Group sẽ thấy cả hai — đúng ý đồ
   BR-046 Multi-source Collapse.

## Affected Documents

- Design Criteria §5 — `TagChip` nay lấy nhãn từ `shared/ui`.

---

# DEC-049 — One messageFor(failure), Not a Flat Table; Validation Fields Are Named by Subject

- **Ngày:** 2026-08-21
- **Trạng thái:** Accepted
- **Bối cảnh:** E6-S2

## Quyết định

1. Bảng dịch mã lỗi có chữ ký `messageFor(failure: Failure): string` — nhận cả `Failure`, không
   chỉ `code`. Bảng phẳng bên trong được ép đầy đủ bằng `satisfies Record<ErrorCode, string>`.
2. `details.field` của `ERR_VALIDATION` đổi từ `'name'` sang `'dishName'` / `'groupName'` tại
   nơi ném.
3. Thêm `shared/ui/inline-error.tsx`; lỗi dùng token `--danger`, `--no` chỉ dành cho vuốt trái.

## Rationale

1. `ERR_REQUIRED_RULE_FAILED` mang `details.shortfalls` (E5-S3) đúng để câu lỗi nói được "Còn
   thiếu 1 món canh" thay vì một câu chung. Bảng phẳng vứt bỏ dữ liệu đó.
2. `add-dish-to-group` và `create-group` cùng ném `ERR_VALIDATION` với `field: 'name'` nhưng
   cần hai câu khác nhau. Việc đó chỉ chạy được khi mỗi màn có bảng riêng. Sửa tại nguồn cho
   failure tự mô tả chính xác, thay vì thêm tham số `context` mà caller có thể truyền sai.
3. Sau E5 có hai chỗ hiện lỗi bằng `--no` và bốn chỗ bằng `--danger`. `--no` là nâu đất trung
   tính của vuốt trái ("tôi không muốn món này"); dùng cho lỗi làm thất bại trông như một lựa
   chọn. Một component chung là cách duy nhất để ranh giới này không trôi lần nữa.

## Consequence

- Thêm mã lỗi mới mà quên dịch → `tsc` đỏ, không phải người dùng phát hiện.
- Ba câu đổi chữ khi gom (rõ nhất: bỏ chữ "Admin" khỏi câu hiện cho người dùng).
- `banner.tsx` KHÔNG gộp vào `InlineError` — dải thông báo toàn màn là thứ khác.

## Affected Documents

- SDD §2.5 — ghi chú bảng dịch nay ở `shared/errors/messages.ts`, chữ ký nhận `Failure`.
- Design Criteria §5 — `InlineError` nay là component thật.

---

# 📜 Lịch sử thay đổi (Change History)

| Version | Ngày | Nội dung cập nhật |
| :---: | :---: | :--- |
| `3.5` | 2026-08-21 | Bổ sung `DEC-049` (Bảng dịch mã lỗi messageFor, Validation Fields named by Subject, InlineError component) cho E6-S2 |
| `3.4` | 2026-08-21 | Bổ sung `DEC-047` (Bổ sung E6-T7/E6-T8 cho MS-01) và `DEC-048` (SYSTEM_TAG_LABELS chuyển sang shared/ui; Eating History query theo User) cho E6-S1 |
| `3.3` | 2026-08-20 | Bổ sung `DEC-046` (Màn S-10 sống trọn trong features/meal; app/ ánh xạ ranking) cho E5-S4 (Cột mốc M5) |
| `3.2` | 2026-08-20 | Bổ sung `DEC-045` (Session Score Drops the Cannot-Eat Term and Defines Its Own Tie-Break) cho E5-S3 |
| `3.1` | 2026-08-20 | Bổ sung `DEC-042` (Snapshot lúc Start), `DEC-043` (session → rule cross-feature statement), và `DEC-044` (session_rules composite PK) cho E5-S2 |
| `3.0` | 2026-08-20 | Bổ sung `DEC-040` (`SystemTag` chuyển sang `shared/domain`) và `DEC-041` (Bổ sung `E5-T1b` S-07) cho E5-S1 |
| :---: | :---: | :--- |

| `2.9` | 2026-08-19 | Bổ sung `DEC-039` (list-deck Reads Eating History on Every Call) cho E4-S4 |
| `2.8` | 2026-08-19 | Bổ sung `DEC-038` (Interaction Ordering Uses Client-Reported Timestamp) cho E4-S3 |
| `2.7` | 2026-08-19 | Bổ sung `DEC-036` (v1.0 Personal Score chỉ có Recency; Tie-break hai tầng) và `DEC-037` (`buildDeck` nhận Input Object) cho E4-S1 |
| `2.6` | 2026-08-19 | Bổ sung `DEC-035` (Complete/Reopen UI Predates Its Backend; E3-T5 Is Purely Wiring) cho E3-S3 |
| `2.5` | 2026-08-19 | Bổ sung `DEC-034` (E3-T3/E3-T4 gộp làm một hàm; "Draft"/"Active" là nhãn minh hoạ) cho E3-S2 |
| `2.4` | 2026-08-19 | Bổ sung `DEC-033` (E3-T1 không cần WebSocket; Snapshot Rule thuộc E5-T4) cho E3-S1 |
| `2.3` | 2026-08-18 | Bổ sung `DEC-032` (Ứng viên trùng lặp từ hai nguồn inGroup/global) cho E2-S4 |
| `2.2` | 2026-08-18 | Bổ sung `DEC-031` (System Tag Model vs S-06 Sheet) cho E2-S3 |
| `2.1` | 2026-08-18 | Bổ sung `DEC-029` (Use case riêng cho món trùng lặp) và `DEC-030` (Hoãn TC-021 sang E2-T5) cho E2-S2 |
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







