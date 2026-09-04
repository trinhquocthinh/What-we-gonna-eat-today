# 📜 Decision Log (ADRs) — What We Gonna Eat Today

> **Document Metadata**
>
> - **Version:** `3.9` | **Status:** `Active`
> - **Created:** `2026-07-23` | **Last Updated:** `2026-08-26`
> - **Supersedes:** `v3.8` | **Upstream:** [Problem Definition](what-we-gonna-eat-today_problem-definition_v1.4.md) • [Business Rules](what-we-gonna-eat-today_business-rules_v1.8.md)
> - **Downstream:** [Tech Spec & Architecture](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) • [SDD](what-we-gonna-eat-today_sdd_v1.3.md) • [Master Plan](what-we-gonna-eat-today_master-plan_v2.1.md)
>
> 📌 *Decision Log ghi lại 61 quyết định kiến trúc và nghiệp vụ cốt lõi (ADR), giải thích cặn kẽ bối cảnh, lý do (Rationale), hệ quả (Consequence) và các tài liệu bị ảnh hưởng.*

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
| [`DEC-031`](#dec-031--system-tag-model-accepts-05-add-dish-sheet-enforces-exactly-one) | System Tag: Model nhận 0..5, Sheet S-06 chọn đúng một nhãn | 2026-08-18 | `Superseded by DEC-054` | Định dạng SystemTag, SPEC-006, UX Sheet S-06 |
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
| [`DEC-050`](#dec-050--s-04-has-four-mutually-exclusive-states-dùng-link-mời-becomes-a-caption-not-a-button) | S-04 có 4 trạng thái loại trừ; "Dùng link mời" thành chú thích | 2026-08-21 | `Accepted` | Bốn trạng thái Hub S-04, chú thích link mời S-02, chặn mở phiên nhóm 0 món |
| [`DEC-052`](#dec-052--nhãn-staple-là-cơm--bún--phở-nhãn-không-được-chứa-dấu-nối-của-chính-nó) | Nhãn `STAPLE` là "Cơm · Bún · Phở"; nhãn không chứa dấu nối của chính nó | 2026-08-25 | `Accepted` | SYSTEM_TAG_LABELS, TAG_IN_SENTENCE, BR-003, PRD US-003 |
| [`DEC-053`](#dec-053--dùng-lại-món-từ-catalog-chung-phải-ghi-tag-người-dùng-đã-chọn) | Dùng lại món từ catalog chung phải ghi tag đã chọn | 2026-08-25 | `Accepted` | addExistingDishToGroup, addDishAction nhánh 1 |
| [`DEC-054`](#dec-054--sheet-thêm-món-chuyển-sang-đa-chọn-nhãn-thay-thế-dec-031) | Sheet thêm món chuyển sang đa chọn nhãn | 2026-08-25 | `Accepted` | SystemTagField dùng chung, thay thế `DEC-031` |
| [`DEC-055`](#dec-055--gợi-ý-món-từ-catalog-chung-trong-lúc-gõ-spec-023) | Gợi ý món từ catalog chung trong lúc gõ (SPEC-023) | 2026-08-25 | `Accepted` | Route Handler search, khớp chuỗi con, lọc trong SQL, bổ sung `DEC-032` |
| [`DEC-056`](#dec-056--re-scope-v11-theo-phản-hồi-dùng-thật-thêm-f49f50-hoãn-f25f28f29) | Re-scope v1.1: thêm `F49`/`F50`, hoãn `F25`/`F28`/`F29` | 2026-08-26 | `Accepted` | Phạm vi v1.1, PRD §4 & §6, Master Plan §16 |
| [`DEC-057`](#dec-057--tên-tài-liệu-mang-số-phiên-bản-thì-phải-có-cổng-kiểm-link) | Cổng kiểm link tài liệu trong `yarn verify` | 2026-08-26 | `Accepted` | `scripts/check-doc-links.sh`, quy ước bump version |
| [`DEC-058`](#dec-058--trần-deck-30-thẻ-là-hằng-số-toàn-hệ-thống-không-cấu-hình-theo-nhóm) | Trần deck 30 thẻ, hằng số toàn hệ thống | 2026-08-26 | `Accepted` | `RANKING_CONFIG.deck.maxCards`, thứ tự pipeline deck, `BR-062` |
| [`DEC-059`](#dec-059--chế-độ-vuốt-theo-chặng-là-cách-chia-deck-không-phải-cách-chốt-bữa) | Chế độ vuốt theo chặng là cách chia deck | 2026-08-26 | `Accepted` | `deck_mode`, `session_courses`, `BR-063`, không đụng `BR-050` |
| [`DEC-060`](#dec-060--cannot-eat-xoá-tương-tác-cũ-và-tạo-ngoại-lệ-cho-lịch-sử-ăn-mặc-định) | `Cannot Eat` xoá tương tác cũ, ngoại lệ lịch sử ăn | 2026-08-26 | `Accepted` | `BR-034`, ngoại lệ `BR-056`, feature `preference`, rủi ro `R-05` |
| [`DEC-061`](#dec-061--đánh-số-lại-epic-v12) | Đánh số lại epic v1.2 (`E11`→`E12`…) | 2026-08-26 | `Accepted` | Master Plan §13.2, mã subtask & thư mục `docs/plans/` |
| [`DEC-064`](#dec-064--v11-đóng-băng-deck-toàn-phần-br-048-được-siết-cho-khớp-code) | v1.1 Đóng Băng Deck Toàn Phần; `BR-048` Được Siết Cho Khớp Code | 2026-08-26 | `Accepted` | `BR-048`, `list-deck.ts`, `session_decks`, `isExploreEligible` |
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

- **Ngày quyết định:** `2026-08-18` | **Trạng thái:** `Superseded by DEC-054`

> [!WARNING]
> **Đã bị thay thế bởi [`DEC-054`](#dec-054--sheet-thêm-món-chuyển-sang-đa-chọn-nhãn-thay-thế-dec-031)**
> (2026-08-25): sheet Thêm món nay cho chọn 0..5 nhãn. Lý do: món ghép như "Bún chả"
> phải mang cả `STAPLE` lẫn `MAIN` ngay lúc tạo, và Independent Tag Counting (`BR-012`)
> dựa hẳn vào việc một món mang nhiều tag. Giữ lại mục này để lưu vết lý do ban đầu.

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

# DEC-050 — S-04 Has Four Mutually Exclusive States; "Dùng link mời" Becomes a Caption, Not a Button

- **Ngày:** 2026-08-21
- **Trạng thái:** Accepted
- **Bối cảnh:** E6-S3

## Quyết định

1. `GroupOverviewScreen` tính MỘT biến `hubState: 'finalized' | 'active' | 'no-dishes' | 'ready'`
   dùng cho cả thân màn hình lẫn CTA đáy, thay cho các điều kiện độc lập.
2. Ví dụ món mẫu (`DISH_EXAMPLES`) chỉ còn ở S-05; S-04 nêu hướng dẫn, không liệt kê ví dụ.
3. Yêu cầu "nút Dùng link mời" của Design Criteria §4 cho S-02 dựng thành một CÂU CHÚ THÍCH,
   không phải nút.
4. `createSession` nhận dep `countActiveDishes` tiêm từ `app/`, trả `ERR_GROUP_HAS_NO_DISH`.

## Rationale

1. Thẻ "chưa có món" từng render vô điều kiện, nên nhóm 32 món vẫn đọc thấy "Trước tiên hãy
   thêm vài món". Ba điều kiện độc lập là cách trạng thái thứ tư lẻn vào; một biến thì không.
2. Design Criteria §4 giao ví dụ món cho S-05 ("3 ví dụ món mẫu mờ trực quan") và giao cho
   S-04 một việc khác ("chặn nút mở phiên, hướng dẫn thêm món"). Ví dụ thuộc về nơi người dùng
   sắp gõ tên món.
3. v1.0 không có màn "dán link mời" — luồng tham gia bắt đầu bằng việc mở URL từ tin nhắn. Một
   nút "Dùng link mời" sẽ không trỏ đi đâu cả. Câu chú thích trả lời đúng câu hỏi ("tôi được
   mời thì làm gì?") bằng phương tiện đúng với luồng thật.
4. Rào ở UI đã có từ E1 nhưng chỉ là rào giao diện; gõ tay URL vẫn tạo được phiên trên nhóm
   rỗng. `session → dish` không nằm trong ALLOWED_CROSS_FEATURE nên phép đếm tiêm từ `app/`,
   cùng khuôn `assertAdmin` (E2-T5) và `findInvalidParticipants` (E3-T1).

## Consequence

- `ErrorCode` lên 23 mã; `satisfies` của `messages.ts` ép có câu dịch ngay.
- Câu trạng thái rỗng của S-07 đổi từ nêu lợi ích sang nêu hệ quả, theo đúng chữ của
  Design Criteria §4.

## Affected Documents

- Master Plan §8 — `E6-T1` và `E6-T6` đang trỏ `designs/README.md` §3/§7; nguồn đúng là
  `design-criteria_v0_1.md` §4 và §8.

---

# DEC-051 — Coverage Thresholds Are Per-Layer and Exclude Type-Only Files; NFR-04 Is Quantified by Test Count; Contrast Remediations

- **Ngày:** 2026-08-21
- **Trạng thái:** Accepted
- **Bối cảnh:** E6-S4

## Quyết định

1. Ngưỡng coverage đặt RIÊNG cho `domain/`, `application/` và `shared/time/` bằng glob, không
   phải một con số gộp.
2. Port (`*-repository.ts`) và file chỉ khai kiểu được đưa vào `coverage.exclude`, không viết
   test cho chúng. Mọi file logic application thực tế (kể cả pass-through như `list-group-rules.ts`
   và `view-final-meal.ts`) đều có unit test tương ứng.
3. `yarn test:coverage` là bước CI RIÊNG, không nằm trong `yarn verify`.
4. `NFR-04` được định lượng bằng danh sách test đang canh, không bằng một đơn vị đo.
5. `count-tone.ts` và `Button` variant `muted` đổi `--ink-faint` sang `--ink-muted` cho số 0 và
   nút chưa đủ điều kiện (đạt tương phản $\ge 5.17:1$, loại bỏ triệt để `--ink-faint` khỏi thông tin
   thật và điều khiển có thể tương tác).
6. `Button` variant `quietAccent` đổi từ `hover:bg-surface-sunken` sang `hover:bg-surface hover:text-accent-hover`,
   loại bỏ cặp trượt tương phản `--accent` trên `--surface-sunken` (4.33:1) thành $\ge 6.02:1$ ✅;
   cặp `--warning` trên sunken được xác nhận không xuất hiện trong bất kỳ component nào.

## Rationale

1. Tech Spec §8.2 đặt ≥80% cho `domain/` và ≥80% cho `application/` như hai cam kết khác nhau.
   Con số gộp để `domain/` (hàm thuần, phủ dày) che một `application/` yếu.
2. 12 trong 16 file không có test cạnh bên biên dịch ra JavaScript rỗng — `tsc` đã là toàn bộ
   phép kiểm của chúng. Để trong phép đo làm con số mất nghĩa; viết test cho chúng là viết
   test cho chính trình biên dịch. Các use-case pass-through thật được test nhằm giữ vững hợp đồng
   gọi repository.
3. `yarn verify` chạy ở pre-commit qua husky. Bắt mỗi commit đợi coverage là cách người ta bắt
   đầu dùng `--no-verify`.
4. Tenant Isolation không có milli giây hay phần trăm. Cố tìm một con số cho nó sẽ làm E6-T3
   mắc kẹt. Đếm bằng chứng tự động là định lượng thật và kiểm lại được.
5. `--ink-faint` cho tương phản 2.91:1 trên `--surface` và 2.67:1 trên `--surface-sunken`, trượt chuẩn 4.5:1
   của Design Criteria §8. `Button` variant `muted` là nút VẪN BẤM ĐƯỢC để báo lỗi validation (không
   được miễn trừ như disabled thật). Chuyển sang `--ink-muted` (5.17:1 trên sunken, 5.64:1 trên surface)
   giúp người dùng đọc rõ ràng mà vẫn giữ phân cấp thị giác.
6. `--accent` trên `--surface-sunken` chỉ đạt 4.33:1 (dưới 4.5:1). Chuyển hover của `quietAccent` sang
   `hover:bg-surface hover:text-accent-hover` (6.02:1) đảm bảo WCAG AA trên mọi trạng thái tương tác.

## Consequence

- Thêm một file `domain/` hay `application/` không test sẽ làm CI đỏ ngay, không đợi ai để ý.
- `--ink-faint` từ nay chỉ còn dùng duy nhất cho placeholder text input và ví dụ món trang trí ở S-05.
- Bảng đo NFR ở Setup & Ops Guide §5.5 là tài liệu phát hành v1.0.

## Affected Documents

- Tech Spec §8.2 — ghi rõ ngưỡng đặt theo glob từng tầng.
- Design Criteria §3.1, §8 — ghi chú `--ink-faint` không dùng cho button/text mang thông tin; chuẩn hoá hover quietAccent.
- Setup & Ops Guide — thêm §5.5.

---

# DEC-052 — Nhãn `STAPLE` Là "Cơm · Bún · Phở"; Nhãn Không Được Chứa Dấu Nối Của Chính Nó

- **Ngày:** 2026-08-25
- **Trạng thái:** Accepted
- **Bối cảnh:** Bảo trì sau v1.0

## Quyết định

1. `SYSTEM_TAG_LABELS.STAPLE` đổi từ `'Cơm'` sang `'Cơm · Bún · Phở'`; `TAG_IN_SENTENCE.STAPLE`
   đổi từ `'món cơm'` sang `'món cơm/bún'`.
2. Hai chỗ ghép nhiều nhãn (`add-dish-sheet.tsx`, `finalize-meal-screen.tsx`) đổi dấu nối
   từ `' · '` sang `' + '`.
3. Bảng `TAG_LABELS` cục bộ trong `finalize-meal-screen.tsx` bị xoá, dùng `SYSTEM_TAG_LABELS`
   dùng chung.
4. Thêm `system-tag-label.test.ts` canh hai bất biến: nhãn không chứa `' + '`, và nhãn
   trong câu không chứa dấu phẩy.

## Rationale

1. **`BR-003` luôn đúng, chỉ nhãn sai.** BR-003 định nghĩa `STAPLE` = *"Món tinh bột / Cơm,
   bún"*, và PRD §9.2 ghi *"Staple (Cơm/Bún/Phở)"*. Gắn "Bún chả" là `STAPLE` là ĐÚNG chuẩn
   — nhưng giao diện hiện chữ "Cơm" nên nó trông như bị gán sai. Nguồn sai lệch là PRD
   US-003 viết *"hay Cơm"* chỗ BR-003 viết *"tinh bột"*.
2. Chọn liệt kê ví dụ thay vì dùng chữ "tinh bột": đây là app cho người nhà đọc lúc 6 giờ
   chiều, không phải bảng phân loại dinh dưỡng.
3. Nhãn mới tự nó chứa dấu `·`, nên ghép nhiều nhãn bằng `·` cho ra chuỗi không tách được
   ("Cơm · Bún · Phở · Món mặn"). Dấu `+` vừa hết nhập nhằng vừa nói đúng ý "mang CẢ HAI nhãn".
4. `TAG_IN_SENTENCE` không được chứa dấu phẩy vì `messages.ts` ghép các mảnh thiếu bằng
   `join(', ')` rồi ` và `. Dùng `'món cơm/bún'` nên câu vẫn đọc được:
   *"Còn thiếu 1 món cơm/bún và 1 món canh."*
5. Hợp đồng vô hình giữa hai file đã hỏng một lần rồi; test rẻ hơn hẳn việc phát hiện lại.

## Consequence

- Thêm một nhãn mới có chứa `' + '` hoặc `','` sẽ làm CI đỏ ngay.
- Nhãn `SOUP` ở màn chốt bữa đổi từ "Món canh" sang "Canh" (hệ quả của việc xoá bảng cục bộ) —
  thống nhất với phần còn lại của app, đúng tinh thần `DEC-048`.

## Affected Documents

- `BR-003` — thay 5 dòng chú thích bằng bảng chuẩn phân loại đầy đủ.
- PRD US-003 — sửa câu chữ và ghi chú nguồn sai lệch.

---

# DEC-053 — Dùng Lại Món Từ Catalog Chung Phải Ghi Tag Người Dùng Đã Chọn

- **Ngày:** 2026-08-25
- **Trạng thái:** Accepted
- **Bối cảnh:** Bảo trì sau v1.0

## Quyết định

`addExistingDishToGroup` nhận thêm `systemTags: readonly string[]`, validate bằng
`readSystemTags`, và GHI ĐÈ TOÀN BỘ tag sau khi upsert xong.

## Rationale

1. Bản đầu chỉ nhận `{groupId, globalDishId}`. Form có gửi `systemTag` lên nhưng nhánh
   "Dùng món này" của `addDishAction` không đọc, nên tag người dùng vừa tick **rơi im lặng**
   và món dùng lại luôn nằm ở mục "Chưa phân nhãn" — dù sheet có bắt chọn nhãn.
2. Ghi đè vô điều kiện (kể cả mảng rỗng) để khớp đúng nhánh khôi phục món INACTIVE trong
   `add-dish-to-group.ts`. Một luật, một lời giải thích.
3. Validate TRƯỚC khi ghi: tag lạ trả `ERR_INVALID_SYSTEM_TAG` mà không đụng vào pool.

## Consequence

- Hai lượt đi DB (upsert rồi ghi tag), KHÔNG nguyên tử: `neon-http` batch là non-interactive
  nên không lấy được `groupDishId` ở giữa batch. Hỏng giữa chừng thì món nằm trong pool mà
  chưa có nhãn — người dùng sửa được ở sheet Sửa nhãn. **Đừng "sửa" thành batch, nó không chạy.**
- Đụng nhẹ `BR-005` (*"phục hồi metadata riêng của nhóm"* khi thêm lại món): ghi đè vô điều
  kiện không phục hồi tag cũ. Đây là đánh đổi đã có sẵn từ trước; `F46` vốn ngoài phạm vi.

---

# DEC-054 — Sheet Thêm Món Chuyển Sang Đa Chọn Nhãn (Thay Thế DEC-031)

- **Ngày:** 2026-08-25
- **Trạng thái:** Accepted
- **Bối cảnh:** Bảo trì sau v1.0

## Quyết định

1. `SystemTagField` đổi từ `radio` (chọn một) sang `checkbox` (chọn 0..5).
2. `EditDishSheet` dùng chung chính `SystemTagField` đó, xoá khối chip trùng lặp.
3. `addDishAction` đọc `formData.getAll('systemTag')` thay cho `.get()`.

## Rationale

1. `DEC-031` chốt "sheet thêm chọn đúng một nhãn" để nhập cho nhanh. Nhưng món ghép là
   chuyện thường ngày của mâm cơm Việt: *"Bún chả"* phải là `STAPLE` + `MAIN`, *"Cơm tấm
   sườn"* cũng vậy. Ép một nhãn buộc người dùng thêm xong rồi mở sheet khác sửa lại.
2. Independent Tag Counting (`BR-012`, SDD §8) dựa hẳn vào việc một món mang nhiều tag —
   ép một tag là bóp mô hình ở đúng chỗ nó cần rộng nhất.
3. Mô hình (`group_dish_tags`, `setSystemTags`, `addDishToGroup`) vốn đã nhận 0..5 từ đầu;
   chỉ riêng sheet thêm là hẹp.
4. Gộp hai hàng chip: trước đây hai bản markup gần y hệt, chỉ khác `radio`/`checkbox` —
   đúng loại trùng lặp sinh ra sai lệch mà `DEC-052` vừa phải đi sửa.

## Consequence

- `DEC-031` chuyển trạng thái `Superseded by DEC-054`.
- Nút "Thêm vào danh mục" hạ tông khi `tags.length === 0` — vẫn là nhắc nhở phía client,
  KHÔNG phải luật server. Không thêm luật "ít nhất 1 nhãn" ở server: nó trái `BR-003`,
  `TC-023` (0 tag) và hợp đồng "mảng rỗng = xoá sạch" của `setSystemTags`.

---

# DEC-055 — Gợi Ý Món Từ Catalog Chung Trong Lúc Gõ (SPEC-023)

- **Ngày:** 2026-08-25
- **Trạng thái:** Accepted
- **Bối cảnh:** Bảo trì sau v1.0

## Quyết định

1. Thêm `GET /api/groups/[groupId]/dishes/search?q=` — **Route Handler**, không phải Server Action.
2. Khớp **chuỗi con** `LIKE '%q%'` trên `normalized_name`, ngưỡng 3 ký tự, `LIMIT 5`.
3. **Loại món nhóm đang ACTIVE ngay trong SQL** bằng `NOT EXISTS`.
4. Chọn một gợi ý thì mang thẳng `global_dishes.id` đi qua `reuseGlobalDishId` — đúng cơ chế
   nút submit đã có của `duplicate-sheet.tsx`.
5. `DuplicateCandidate.kind` **giữ nguyên hai giá trị**; gợi ý catalog là component riêng.

## Rationale

1. **Route Handler**: React serialise các Server Action liên tiếp — đúng thứ Tech Spec §4.1 đã
   tránh cho đường vuốt thẻ, và một typeahead bắn theo từng phím là ca tệ nhất của nó. Thêm
   nữa `fetch` huỷ được bằng `AbortController`, và đây là phép ĐỌC nên không có cớ dựng lại cây RSC.
2. **Chuỗi con chứ không tiền tố**: tên món Việt hiếm khi bắt đầu bằng chữ người ta nhớ ra
   trước — gõ "chả" phải ra "Bún chả". Đính chính một hiểu lầm dễ mắc: index btree hiện có
   **không** phục vụ `LIKE 'q%'` dưới collation khác `C`, nên "tiền tố thì tận dụng được
   index" là sai — cả hai đều seq scan. Vài nghìn dòng thì không đáng kể; lối thoát khi
   catalog lớn hẳn là index GIN `pg_trgm`, không phải viết lại câu truy vấn.
3. **Lọc trong SQL**: `LIMIT` chạy SAU phép lọc. Lọc ở client thì nhóm đã sở hữu 5 kết quả
   đầu sẽ cho panel rỗng oan trong khi ứng viên mới nằm ngay dưới ngưỡng. Đây là lỗi đúng-sai,
   không phải chuyện hiệu năng. Chỉ loại `ACTIVE` — món đã gỡ (`INACTIVE`) vẫn hiện, và chọn
   lại chính là cách thêm lại nó.
4. **Mang `id` đi thay vì chỉ điền tên**: `global_dishes.normalized_name` **không unique**
   (chủ ý, để `forceCreate` tạo được món trùng tên). Tra lại theo tên có thể ra một dòng KHÁC
   dòng người dùng vừa bấm — người ta chọn món X mà lặng lẽ nhận món Y.
5. **Bắt buộc kiểm tư cách thành viên**, không chỉ đăng nhập: kết quả đã loại món nhóm đang
   có, nên dò `groupId` bất kỳ sẽ suy ra được danh mục của nhóm đó qua chính những món bị
   thiếu. Phép lọc mới là thứ làm rò, không phải dữ liệu `global_dishes` vốn dùng chung.
6. **Không thêm `kind` thứ ba**: `DEC-032` định nghĩa `kind` là thứ phân biệt KHÔNG GIAN ID
   (`group_dishes.id` vs `global_dishes.id`) — đó là bẫy lỗi khoá ngoại. Gợi ý catalog cùng
   không gian id và cùng hành động với `global`, nên thêm giá trị thứ ba là một switch ba
   nhánh có hai nhánh giống hệt nhau: lời mời gọi đúng con bug mà trường đó sinh ra để ngăn.

## Consequence

- `DEC-032` được bổ sung: panel trùng lặp (CẢNH BÁO) được ưu tiên hiện trước gợi ý catalog
  (KHÁM PHÁ). Hai danh sách không bao giờ chứa cùng một món, vì câu tra đã loại tập ACTIVE
  mà `findNearMatches` chạy trên đúng tập đó.
- `requireApiUser` tách ra `src/app/api/api-auth.ts` cho mọi Route Handler dùng chung.
- `BR-003` mất câu "kế thừa tag từ Global Dish" trên thực tế — ghi rõ là chưa thi công.

---

# DEC-056 — Re-scope v1.1 Theo Phản Hồi Dùng Thật: Thêm `F49`/`F50`, Hoãn `F25`/`F28`/`F29`

- **Ngày:** 2026-08-26
- **Trạng thái:** Accepted
- **Bối cảnh:** Lập kế hoạch v1.1

## Quyết định

1. Phạm vi v1.1 **không còn là** 12 tính năng của [Master Plan](what-we-gonna-eat-today_master-plan_v2.1.md) §13.1. Thay bằng 11 tính năng, trong đó **hai tính năng hoàn toàn mới**:
   - `F49` — **Trần số thẻ mỗi phiên** (xem [`DEC-058`](#dec-058--trần-deck-30-thẻ-là-hằng-số-toàn-hệ-thống-không-cấu-hình-theo-nhóm)).
   - `F50` — **Chế độ vuốt theo chặng** (xem [`DEC-059`](#dec-059--chế-độ-vuốt-theo-chặng-là-cách-chia-deck-không-phải-cách-chốt-bữa)).
2. **Hoãn sang v1.2:** `F25` Gỡ Participant, `F28` Sửa lịch sử ăn hôm nay, `F29` UI phát hiện trùng.
3. Epic v1.1 tổ chức lại thành `E7` → `E11`; v1.2 dời số theo [`DEC-061`](#dec-061--đánh-số-lại-epic-v12).
4. Thứ tự thi công cố định: `E7` → `E8` → `E9` → `E10` → `E11`.

## Rationale

1. **`F49` và `F50` không phải ý tưởng mới, chúng là lỗi đã có sẵn mà v1.0 không nhìn thấy.**
   `listDeck` lấy **toàn bộ** món đủ điều kiện của nhóm rồi phân trang 20 thẻ mỗi lần —
   không có trần. Điều này vô hại khi nhóm có 30 món và trở thành thứ khiến người ta bỏ dở
   khi nhóm có 150 món. Không tính năng nào trong `F01`→`F48` chạm tới nó, vì lúc viết PRD
   chưa ai có một danh mục đủ lớn để thấy.
2. **Hoãn `F29` vì `M1-T5` đã trả trước phần lớn giá trị của nó.** Ô gợi ý chủ động lúc gõ
   giải quyết đúng cái đau ("không tìm ra món của catalog chung"); panel trùng lặp phản ứng
   chỉ còn là polish.
3. **Hoãn `F25` và `F28` vì chúng sửa dữ liệu đã sai, còn `F15` ngăn dữ liệu sai sinh ra.**
   Cùng một ngân sách giờ, chặn nguồn rẻ hơn dọn hậu quả. `F28` sẽ có ít việc phải sửa hơn
   sau khi `F15` chạy — làm trước là tự tạo việc cho mình.
4. **`E7` đứng đầu** đúng như bảng rủi ro [Master Plan](what-we-gonna-eat-today_master-plan_v2.1.md) §11 đã
   chỉ định cho `R-05`, và vì nó mở khoá hai số hạng $E$, $X$ đã nằm sẵn trong
   `RANKING_CONFIG` từ E4 mà chưa hàm nào đọc.
5. **`E8` trước `E9`** vì phân bổ hạn mức theo chặng cần trần tổng đã tồn tại. Làm ngược lại
   thì `E9` phải bịa ra một trần tạm rồi vứt đi.

## Consequence

- PRD §4 nhận thêm hai dòng `F49`, `F50` phân loại **Should**; §6 vẽ lại phạm vi ba giai đoạn.
- Tổng ước lượng v1.1: **81 giờ** (cũ 70 giờ) — chênh lệch là `F49` + `F50` trừ đi ba tính năng hoãn.
- `F25`/`F28`/`F29` nhập vào Epic v1.2 tương ứng, không rơi vào Out of Scope.

---

# DEC-057 — Tên Tài Liệu Mang Số Phiên Bản Thì Phải Có Cổng Kiểm Link

- **Ngày:** 2026-08-26
- **Trạng thái:** Accepted
- **Bối cảnh:** Lập kế hoạch v1.1

## Quyết định

1. Giữ quy ước tên file mang số phiên bản (`..._sdd_v1.2.md`).
2. Thêm `scripts/check-doc-links.sh`, chạy qua `yarn docs:links`, **nối vào `yarn verify`**.
3. Script chỉ kiểm tra **đích có tồn tại**, không kiểm tra anchor `#...`.
4. Mỗi lần bump version một tài liệu, bắt buộc chạy lại phép thay chuỗi trên toàn bộ `docs/`, `README.md` và comment trong `src/` **trong cùng commit**.

## Rationale

1. **Số phiên bản trong tên file là một đánh đổi đã chọn từ đầu** — nó khiến "bản nào đang
   hiệu lực" nhìn phát biết ngay, mà không cần mở file. Bỏ quy ước này để tránh gãy link là
   chữa triệu chứng và mất đi thứ đang có giá trị.
2. **Markdown không có trình biên dịch.** Một link gãy trông y hệt một link tốt cho tới khi
   có người bấm vào. Đợt bump ngày 2026-08-26 làm gãy **357** link mà không có gì báo — và
   nó chỉ bị phát hiện tình cờ. Đây đúng là loại lỗi mà một cổng tự động sinh ra để bắt.
3. **Không kiểm anchor**: anchor sai vẫn mở đúng file, người đọc tự cuộn được. File sai thì
   không mở được gì. Kiểm anchor tiếng Việt còn kéo theo chuyện chuẩn hoá dấu và ký tự
   Unicode — chi phí lớn cho một lớp lỗi nhẹ hơn hẳn.
4. **Nối vào `verify` chứ không phải một script rời**: một cổng phải chạy mà không ai nhớ ra
   nó thì không phải cổng.

## Consequence

- Cổng mới lộ ra thêm **120 link gãy có từ trước đợt đổi tên** — các implementation guide ở
  `docs/plans/E1..E5/` lùi thiếu một cấp (`../` đáng ra `../../`), `docs/designs/README.md`
  thiếu hẳn `../`, Master Plan trỏ `plans/` thay vì `plans/E5/`, một link `file:///Users/...`
  tuyệt đối, và một link trỏ `src/shared/errors.ts` trong khi file thật là `errors/index.ts`.
  Tất cả đã sửa.
- `yarn verify` dài thêm khoảng một giây.

---

# DEC-058 — Trần Deck 30 Thẻ Là Hằng Số Toàn Hệ Thống, Không Cấu Hình Theo Nhóm

- **Ngày:** 2026-08-26
- **Trạng thái:** Accepted
- **Bối cảnh:** Lập kế hoạch v1.1 — `F49`, Epic `E8`

## Quyết định

1. `RANKING_CONFIG.deck.maxCards = 30`. Mỗi người, mỗi phiên, tối đa 30 thẻ.
2. **Không** thêm cột cấu hình theo nhóm.
3. Thứ tự bắt buộc trong pipeline dựng deck:
   `lọc Cannot Eat` → `xếp theo Personal Score` → `trộn Explore theo khối 5` → `cắt trần 30` → `chia chặng`.
4. `deck.pageSize` giữ nguyên 20 — trần và cỡ trang là hai khái niệm khác nhau.

## Rationale

1. **30 chia hết cho khối 5 của `BR-047`**: đúng 24 thẻ Exploit + 6 thẻ Explore, không có
   khối cụt ở cuối. Chọn 25 hay 35 cũng chia hết, nhưng 30 là chỗ mà thời gian vuốt còn nằm
   trong ngưỡng "chốt bữa dưới 5 phút" của PRD §7 khi cả nhà 4 người cùng vuốt.
2. **Không cấu hình theo nhóm**: quy mô sản phẩm là vài nhóm gia đình. Một ô cấu hình ở màn
   Luật buộc người dùng phải hiểu quan hệ giữa trần thẻ, tỉ lệ Explore và số chặng — ba thứ
   họ không có lý do gì để nghĩ tới. Nếu về sau cần, thêm cột là chuyện một migration; gỡ
   một ô cấu hình đã có người dùng thì không.
3. **Cắt trần SAU khi trộn Explore, đây là điểm dễ sai nhất của cả `E8`.** Thẻ Explore theo
   định nghĩa là món lâu chưa ăn, tức nằm ở đuôi bảng xếp hạng. Cắt trần trước rồi mới trộn
   thì tập nguồn của Explore đã bị xoá sạch — deck vẫn chạy, vẫn 30 thẻ, chỉ là không bao
   giờ có món lạ. Không test nào ở tầng trên bắt được chuyện này; phải có test riêng khẳng
   định đúng 6/30 thẻ đến từ luồng Explore.
4. **Trần khác cỡ trang**: `pageSize` là chuyện tải mạng, `maxCards` là chuyện người dùng
   phải vuốt bao nhiêu lần. Gộp hai thứ vào một hằng số thì mỗi lần chỉnh trải nghiệm lại
   vô tình chỉnh cả hành vi tải.

## Consequence

- Nhóm có nhiều hơn 30 món thì phần đuôi danh mục **không xuất hiện trong phiên đó** — đây
  là chủ đích. `BR-062` ghi rõ để không ai đọc thành lỗi.
- Luồng Explore trở thành thứ duy nhất đưa món ở đuôi bảng lên trước mặt người dùng, nên
  `F18` không còn là "Should" trên thực tế — nó là điều kiện để `F49` không đóng băng danh mục.

---

# DEC-059 — Chế Độ Vuốt Theo Chặng Là Cách Chia Deck, Không Phải Cách Chốt Bữa

- **Ngày:** 2026-08-26
- **Trạng thái:** Accepted
- **Bối cảnh:** Lập kế hoạch v1.1 — `F50`, Epic `E9`

## Quyết định

1. Thêm `deck_mode` trên `selection_sessions`: `FREE` (mặc định, đúng hành vi v1.0) hoặc `COURSE`.
2. Creator chọn chế độ **và** sắp thứ tự chặng **lúc mở phiên**; lưu vào bảng `session_courses (session_id, position, system_tag)`.
3. Snapshot chặng nằm **trong cùng giao dịch `startDraft`** với snapshot `session_rules`.
4. Cả nhà dùng **chung một chế độ** trong một phiên.
5. **`rankSession`, `finalizeSession`, `BR-049`, `BR-050` không đổi một dòng nào.** Vuốt xong hết các chặng thì vẫn tổng hợp một lần cuối như v1.0.
6. Chia đều trần 30 thẻ cho $n$ chặng; chặng nào không đủ món thì phần dư trả lại cho các chặng còn lại.

## Rationale

1. **Chế độ đóng băng vào phiên chứ không đọc từ cấu hình nhóm**, cùng lý lẽ `DEC-042` đã áp
   cho Session Rules: Creator đổi cấu hình giữa chừng không được phép làm hai người vuốt hai
   tập món khác nhau trong cùng một phiên.
2. **Creator chọn chặng thay vì suy ra từ Required Rule.** Đã cân nhắc lấy thẳng các tag của
   Required Rule làm chặng — gọn hơn, không khai báo hai lần. Nhưng Required Rule trả lời câu
   *"mâm cơm hợp lệ cần gì"*, còn chặng trả lời câu *"tối nay muốn duyệt qua những gì"*. Hai
   câu này trùng nhau phần lớn thời gian và khác nhau đúng lúc quan trọng: bữa chỉ ăn lẩu.
   Buộc chúng vào nhau thì muốn đổi cách vuốt một hôm lại phải sửa luật của cả nhóm.
3. **Chung một chế độ cho cả phiên**: Session Ranking chuẩn hoá theo $T$ (tổng số người). Nếu
   người A vuốt tự do trên 30 món còn người B vuốt theo chặng chỉ thấy 10 món mặn, thì $P$ và
   $N$ của hai người đo trên hai mẫu số khác nhau, và điểm cộng lại ở `computeSessionScore`
   không còn nghĩa. Đây là lý do đúng-sai, không phải chuyện đồng bộ trải nghiệm.
4. **Không chốt dần từng chặng.** Đã cân nhắc — cảm giác dứt điểm nhanh hơn thật. Nhưng chốt
   theo chặng buộc cả nhà phải đợi nhau ở mỗi ranh giới chặng, biến một luồng bất đồng bộ
   thành ba lần đồng bộ; và nó đụng `BR-050`, thứ mà `F50` không có lý do gì phải đụng tới.
   Chặng chỉ là cách chia màn hình vuốt.
5. **Trả phần dư**: nhóm cấu hình 3 chặng thì 10 thẻ mỗi chặng; nếu chặng `SOUP` chỉ có 4 món
   thì 26 thẻ còn lại chia cho hai chặng kia. Không trả dư thì mọi nhóm có một chặng nghèo
   món sẽ vĩnh viễn dùng chưa hết trần.

## Consequence

- `session_courses` theo đúng khuôn `session_rules` của `DEC-044`: không cột `id`, khoá tự
  nhiên `(session_id, position)`, `INSERT … SELECT` chạy trọn trong Postgres.
- `sessionState` và luồng Finalize không đổi ⇒ `TC` của E5/E6 vẫn xanh nguyên, không phải viết lại.
- Chế độ `FREE` là mặc định, nên phiên tạo bằng đường cũ vẫn chạy y như trước.

---

# DEC-060 — `Cannot Eat` Xoá Tương Tác Cũ Và Tạo Ngoại Lệ Cho Lịch Sử Ăn Mặc Định

- **Ngày:** 2026-08-26
- **Trạng thái:** Accepted
- **Bối cảnh:** Lập kế hoạch v1.1 — `F15`, Epic `E7`

## Quyết định

1. Đánh dấu `Cannot Eat` **xoá tương tác Swipe đã có** của người đó với món đó trong phiên đang chạy — đúng `BR-034`.
2. Món `Cannot Eat` bị **lọc cứng khỏi deck**, không phải hạ điểm.
3. `Cannot Eat` là ràng buộc **theo `global_dishes.id`**, không theo `group_dishes.id`.
4. Sinh Default Eating History **bỏ qua** người đã khai `Cannot Eat` với món đó — bổ sung một ngoại lệ vào `BR-056`.
5. `Dislike` **không** lọc món khỏi deck, chỉ hạ điểm — đúng `BR-037`.

## Rationale

1. **Xoá tương tác cũ chứ không giữ lại**: một `SWIPE_RIGHT` còn sót của món người ta vừa
   khai là không ăn được sẽ cộng $+1.0$ vào $P$ ở `computeSessionScore` đồng thời với
   $-1.0$ của $X$. Hai số triệt tiêu nhau và cả nhà thấy một món trung tính, trong khi sự
   thật là có người không ăn được.
2. **Lọc cứng chứ không hạ điểm**: đây là ranh giới `BR-043` đã vạch giữa ràng buộc bền vững
   và tương tác trong phiên. Một món hạ điểm đủ mạnh vẫn có thể nổi lên khi cả nhà đều vuốt
   phải — với dị ứng thì đó là kết quả không được phép xảy ra.
3. **Theo `global_dishes.id`**: người dị ứng tôm thì dị ứng ở mọi nhóm. Gắn vào
   `group_dishes.id` nghĩa là khai lại mỗi lần nhóm gỡ rồi thêm lại món — và `DEC-009` đã
   nói rõ thêm lại là tạo dòng mới.
4. **Ngoại lệ cho Default Eating History là mấu chốt của cả `E7`.** `BR-056` sinh lịch sử ăn
   cho **mọi** Participant của phiên đã chốt. Ai không ăn được món đó vẫn bị ghi là đã ăn,
   rồi Cooldown 7 ngày trừ điểm món ấy cho chính họ — hệ thống tự bịa ra một dữ kiện rồi tin
   vào nó. Đây đúng là rủi ro `R-05` mà `Master Plan` §11 đã dự báo, và nó là lý do `F15`
   được xếp đầu v1.1 chứ không phải vì màn hình dễ làm.
5. **`Dislike` không lọc**: `Dislike` nói *"tôi không thích lắm"*, `Cannot Eat` nói *"tôi
   không ăn được"*. Cho `Dislike` quyền lọc thì hai khái niệm chập làm một và người dùng mất
   cách diễn đạt sắc thái nhẹ.

## Consequence

- `default-eating-history.ts` nhận thêm một tham số là tập người đã khai `Cannot Eat`. Đây là
  hàm thuần, nên ngoại lệ nằm ở đầu vào chứ không phải một truy vấn giấu bên trong.
- Feature mới `src/features/preference/` (feature thứ chín), kéo theo **hai** chiều phụ thuộc
  mới phải khai trong `ALLOWED_CROSS_FEATURE` của `eslint.config.mjs`, bổ sung `yarn arch:probe`
  và ghi vào Tech Spec §2.3 — hiện mới có đúng 5 chiều được phép:
  - `selection → preference` (lọc deck và tính $E$),
  - `meal → preference` (đọc tập `Cannot Eat` để áp ngoại lệ `BR-056` lúc finalize).
    Chiều này dễ bị bỏ sót vì lịch sử ăn thuộc feature `history`; nhưng vì `defaultEatingHistory`
    nhận tập ngoại lệ qua tham số, chỗ phải đọc dữ liệu là `meal` chứ không phải `history`.
- Trọng số `cCannotEat = 1.0` và `wExplicit = 0.3` trong `RANKING_CONFIG` lần đầu có hàm đọc
  tới, sau khi nằm im từ E4 (`DEC-036`).

---

# DEC-061 — Đánh Số Lại Epic v1.2

- **Ngày:** 2026-08-26
- **Trạng thái:** Accepted
- **Bối cảnh:** Lập kế hoạch v1.1

## Quyết định

1. v1.1 chiếm `E7` → `E11`.
2. v1.2 dời số: `E11` → `E12` (Chef Role), `E12` → `E13` (Học sở thích ngầm), `E13` → `E14` (Linh hoạt & bổ trợ).
3. `F25`, `F28`, `F29` nhập vào `E14`.

## Rationale

1. v1.1 cần năm epic thay vì bốn, vì `F50` không thuộc epic nào đang có: nó không phải ràng
   buộc cá nhân, không phải thuật toán deck, không phải luật chốt bữa.
2. **Dời số v1.2 thay vì chèn `E10b`**: mã epic được tham chiếu bởi tên thư mục
   (`docs/plans/E5/`) và tiền tố subtask (`E5-T3`). Một mã có hậu tố chữ sẽ phải được xử lý
   riêng ở mọi chỗ đang sắp xếp theo mã.
3. Chi phí dời số ở thời điểm này gần bằng không: v1.2 mới chỉ tồn tại dưới dạng ba dòng
   trong Master Plan §13.2, chưa có subtask, chưa có thư mục, chưa có mã nào trong `src/`.

## Consequence

- Master Plan §13.2 viết lại nhãn epic; không dòng nào khác trong repo tham chiếu `E11`→`E13`.
- Mọi tham chiếu `E7`→`E10` **trước ngày 2026-08-26** nói về kế hoạch cũ; bảng ánh xạ nằm ở Master Plan §16.

---

# DEC-063 — Audit Log Ghi `CANNOT_EAT`, Và Enum CSDL Rộng Hơn Ô Cửa Nhận Dữ Liệu

- **Ngày:** 2026-08-26
- **Trạng thái:** Accepted
- **Bối cảnh:** E7 Slice S2

## Quyết định

1. `interaction_events.action` thêm giá trị `'CANNOT_EAT'`.
2. Domain tách hai kiểu: `InteractionAction` (ba giá trị, client gửi lên được)
   và `InteractionEventAction` (bốn giá trị, những gì có thể nằm trong bảng).
3. `VALID_ACTIONS` của Route Handler `SPEC-012` giữ nguyên ba giá trị.

## Rationale

1. Ghi `'UNDO'` cho một lượt vuốt bị xoá do `BR-034` là sai sự thật — không ai
   bấm hoàn tác. `DEC-025` đặt bảng này ra để biết cái gì đã xảy ra; một audit
   log nói dối tệ hơn không có audit log.
2. **Nới enum ở CSDL không được phép nới ô cửa nhận dữ liệu từ ngoài.** Nếu
   dùng chung một kiểu, `VALID_ACTIONS` sẽ tự động chấp nhận `CANNOT_EAT` từ
   client — cho phép bỏ qua toàn bộ đường `setConstraint` và xoá một lượt vuốt
   mà không ghi ràng buộc nào. Hai kiểu là hàng rào giữa hai việc khác nhau.

## Consequence

- Migration `0012_cannot_eat_event.sql` chỉ thêm giá trị enum, không đụng dữ liệu.
- `TC-117` đổi nghĩa: từ "chặn đặt hộ người khác" thành "bỏ qua `userId` trong
  body" — hành vi cũ không biểu diễn được vì `userId` lấy từ phiên đăng nhập.
- Không thêm `ERR_FORBIDDEN` vào `ErrorCode`.

---

# DEC-062 — Tương tác Cannot Eat ở Swipe Card (S-09) & Hệ quả Bỏ qua Lịch sử Ăn (BR-056)

- **Ngày:** 2026-08-31
- **Trạng thái:** Accepted
- **Bối cảnh:** Epic 7 Slice S3 (E7-T5, E7-T6, E7-T7)

## Quyết định

1. **Giao diện Swipe Card (S-09)**: Thêm nút quiet "Tôi không ăn được món này" ở nửa dưới card. `min-h-11` (>=44px), `onPointerDown={(e) => e.stopPropagation()}` để không cướp gesture swipe.
2. **Không có Like/Dislike trên card swipe**: Theo `BR-043`, card chỉ có MỘT hành động: "Tôi không ăn được món này". Thích / Không thích thuộc về danh mục món (S-05).
3. **Chặn Undo sau Cannot Eat (DEC-060)**: `marks` quản lý 3 giá trị `'yes' | 'no' | 'cannot'`. Khi lượt tương tác gần nhất là `'cannot'`, nút Hoàn tác bị vô hiệu hoá (`canUndo = false`).
4. **Session Ranking (SPEC-014 / E7-T6)**: Khôi phục số hạng $X$ trong `SessionScoreInput` và `computeSessionScore`, trừ điểm theo trọng số $c_{\text{cannotEat}} = 1.0$. Màn hình S-10 hiển thị đủ 4 ô đếm: đề xuất ($P$), không muốn ($N$), vừa ăn ($H$), không ăn được ($X$). Món chỉ có $X > 0$ mà $P=0, N=0$ vẫn nằm ở `untouched`.
5. **Sinh Default Eating History (SPEC-017 / E7-T7)**: `buildDefaultEatingHistory` nhận tập cặp `cannotEatPairs` định dạng `${userId}:${globalDishId}`. Use case `finalizeSession` đọc constraints của tất cả active participants trước transaction và lọc bỏ các cặp tương ứng theo `BR-056`.

---

# DEC-064 — v1.1 Đóng Băng Deck Toàn Phần; `BR-048` Được Siết Cho Khớp Code

- **Ngày:** 2026-08-26
- **Trạng thái:** Accepted
- **Bối cảnh:** E8 Slice S1

## Quyết định

1. KHÔNG hiện thực phép tính lại deck giữa phiên. Deck materialize đúng một lần
   cho mỗi `(session, user)` và không bao giờ được sắp xếp lại.
2. `BR-048` đổi từ "đóng băng thẻ `index < cursor` khi tính lại" thành cam kết
   mạnh hơn: không có phép tính lại nào.
3. Deck co lại dưới trần do lọc thì KHÔNG bù thêm thẻ.
4. Cờ `lane` KHÔNG lưu vào `session_decks`; nó được suy lại ở mỗi lần đọc bằng
   `isExploreEligible`.

## Rationale

1. Hành vi đóng băng toàn phần đã tồn tại từ E4 và chưa từng gây vấn đề. `F19`
   ước lượng 6 giờ cho một cơ chế mà phần lớn đã có — và cơ chế "tính lại có
   chọn lọc" sẽ cần lưu cursor phía server, tức thêm một lượt ghi vào đường
   nóng `NFR-02`, để giải quyết một đau chưa ai gặp.
2. **Một quy tắc lỏng hơn code thật là một cái bẫy.** Nó là chỗ mà lần refactor
   sau sẽ nới code cho "đúng đặc tả" rồi làm hỏng thứ đang chạy tốt. Đặc tả nên
   ghi cam kết mạnh nhất mà hệ thống thật sự giữ.
3. Bù thẻ chính là tính lại. Cho phép nó là mở lại đúng cánh cửa vừa đóng.
4. `session_decks` lưu mảng id trần. Lưu thêm `lane` là đổi schema cho một thứ
   suy lại được từ dữ liệu đã có trong tay ở mỗi lần đọc — và nó sẽ đóng băng
   một nhãn mô tả MÓN, trong khi món đổi trạng thái được (ăn thêm một lần, đổi
   Like/Dislike). Suy lại lúc đọc thì nhãn luôn đúng với hiện tại.

## Consequence

- `F19` từ 6 giờ còn 2 giờ; bốn giờ chuyển sang `F51` (`E8-T7`) và phần dư.
- Business Rules lên `v1.8`.
- Một món đứng ở ô Exploit vẫn có thể mang nhãn `EXPLORE` — nhãn mô tả món,
   không mô tả ô. Đây là chủ đích, ghi rõ ở `E8-T3` (S2).

# DEC-065 — Vị Trí Tiếp Tục Suy Ở Client, Không Lưu Server

- **Ngày:** 2026-08-26
- **Trạng thái:** Accepted
- **Bối cảnh:** E8 Slice S2 — `F51`

## Quyết định

1. `cursor` và `marks` ban đầu suy từ `effectiveInteraction` đã có sẵn trên
   `DishCard`. KHÔNG thêm cột `cursor` vào `session_decks`.
2. Lấy vị trí SAU thẻ CUỐI CÙNG đã tương tác, không phải thẻ ĐẦU TIÊN chưa
   tương tác.
3. Thẻ trong tiền tố có `effectiveInteraction === null` (đã Undo) được đánh
   `'cannot'` trong `marks`.

## Rationale

1. Dữ liệu đã đi từ SQL ra tới client ở mỗi lần tải trang từ E1 — chỉ là chưa
   ai đọc. Lưu cursor phía server nghĩa là thêm một lượt ghi vào MỖI lượt vuốt,
   tức vào đúng đường nóng mà `NFR-02` (≤100ms) và lựa chọn Route Handler thay
   Server Action (Tech Spec §4.1) đang bảo vệ — để giải quyết một chuyện đã có
   sẵn câu trả lời trong dữ liệu.
2. Undo để lại một lỗ `null` ở giữa. Suy theo "thẻ đầu tiên chưa tương tác" sẽ
   kéo người dùng lùi về cái lỗ đó và bắt vuốt lại toàn bộ phần đuôi — biến một
   thao tác sửa sai thành một hình phạt.
3. Ba giá trị của `marks`, chỉ `'cannot'` là giá trị không góp vào `yesCount`
   lẫn `noCount`. Một thẻ đã xem nhưng không còn ý kiến thì đúng là không nên
   góp vào con số nào. Dùng `'no'` sẽ làm màn tổng kết nói dối.

## Consequence

- Không migration. Không request mới.
- Đa thiết bị: hai máy cùng lúc vẫn suy ra cùng một cursor sau mỗi lần tải
  trang, vì cả hai đọc cùng một `effectiveInteraction`. Không đồng bộ tức thời
  giữa hai máy đang mở — chấp nhận được ở quy mô một gia đình.
- `F51` là tính năng thứ 12 của v1.1, thêm vào PRD §4 sau `F50`.

---

# DEC-066 — Chế Độ Chặng Cắt Trần TRONG TỪNG CHẶNG, Không Cắt Chung Rồi Chia

- **Ngày:** 2026-09-01
- **Trạng thái:** Accepted
- **Bối cảnh:** E9 Slice S1

## Quyết định

1. Pipeline dựng deck rẽ nhánh theo `deck_mode`. `COURSE` chia theo tag TRƯỚC,
   rồi trộn Explore và cắt hạn mức TRONG TỪNG CHẶNG.
2. `session_decks` vẫn lưu một mảng id phẳng; nhóm theo chặng suy lại ở mỗi
   lần đọc.
3. Món không khớp chặng nào bị loại khỏi deck ở chế độ `COURSE`.
4. Snapshot `session_courses` dùng `INSERT … SELECT` với guard `state='DRAFT'`,
   không dùng `INSERT … VALUES`.

## Rationale

1. Personal Score ở v1.1 chỉ có hai số hạng ($E$, $R$), nên một nhóm vừa ăn
   canh hôm qua sẽ đẩy TOÀN BỘ món canh xuống đuôi bảng cùng lúc. Cắt trần 30
   trước khi chia thì chặng Canh rỗng, dù danh mục có 15 món canh. Deck vẫn
   chạy, vẫn đủ thẻ — đây là lỗi im lặng, cùng lớp với "cắt trần trước khi trộn
   Explore" của `DEC-058`, chỉ ở một tầng cao hơn.
2. Lưu phẳng giữ nguyên bất biến đóng băng của `BR-048`/`DEC-064` và không cần
   migration cho `session_decks`. `SPEC-030` đã chốt một món chỉ thuộc một
   chặng, nên phép nhóm là xác định — suy lại rẻ hơn lưu thêm.
3. Chọn ba chặng nghĩa là tối nay chỉ duyệt ba loại món đó. Nhét món không
   khớp vào cuối là phá chính điều Creator vừa yêu cầu.
4. Guard nằm trong SELECT là toàn bộ cơ chế cách ly của `startDraft`
   (`buildSnapshotStatement` nói rõ). Một câu VALUES ghi cả khi session không
   còn DRAFT — hai người bấm cùng lúc thì cấu hình của người thua đè lên phiên
   của người thắng.

## Consequence

- `list-deck.ts` có đúng một chỗ rẽ nhánh theo `deck_mode`; mọi tầng trên không
  biết chế độ nào đang bật.
- `blendExploitExplore` chạy trong từng chặng, nên tỉ lệ 4+1 của `BR-047` là tỉ
  lệ theo KHỐI chứ không theo deck — đã đúng theo định nghĩa, ghi lại cho rõ.
- `SPEC-030` và Ranking Spec §2.5 được cập nhật khớp thứ tự pipeline mới.

---

# DEC-067 — Mô Hình Hai Loại Cảnh Báo Và Phân Tách Cấu Hình Luật

- **Ngày:** 2026-09-02
- **Trạng thái:** Accepted
- **Bối cảnh:** E10 Slice S1 — `E10-T1`, `E10-T2`, `E10-T3`

## Quyết định

1. **Một hàm duy nhất:** `evaluateRules` thay thế hoàn toàn `evaluateRequired`. Không duy trì hai hàm song song trong domain.
2. **`RuleWarning` là union có thẻ:** `{ kind: 'PREFERRED_SHORTFALL' } & RuleShortfall` và `{ kind: 'TARGET_COUNT', direction, target, actual }`. Hai loại cảnh báo có bản chất khác nhau: một loại gắn với một System Tag cụ thể, một loại là thuộc tính của cả mâm cơm.
3. **Loại bỏ `satisfied`:** `RuleEvaluation` chỉ gồm `{ blocking, warnings }`. Hàm gọi tự quyết định: `blocking.length === 0` nghĩa là đủ điều kiện chốt; `warnings.length > 0` nghĩa là có cảnh báo cần xác nhận.
4. **Target Dish Count là nullable ở cả hai bảng:** `groups.target_dish_count` và `selection_sessions.target_dish_count`. Không dùng giá trị mặc định `0` (vốn sẽ biến mọi bữa ăn thành vi phạm Target Count).
5. **Duy trì Independent Tag Counting:** Không sửa logic đếm của SDD §8. Luật Preferred được đếm độc lập y hệt luật Required; một món đa tag thoả mãn đồng thời cả hai loại luật.

## Rationale

1. Hai hàm riêng biệt (`evaluateRequired` và `evaluatePreferred`) sẽ đòi hỏi hai lượt duyệt danh sách món, hai lần lọc và phân tích tag, dẫn tới nguy cơ logic đếm bị lệch nhau theo thời gian.
2. Cảnh báo lệch số lượng món (`TARGET_COUNT`) không liên quan tới bất kỳ System Tag nào, việc ép nó vào cùng hình dạng với `RuleShortfall` (vốn có `systemTag`) sẽ tạo ra các trường vô nghĩa hoặc nullable giả tạo.
3. Boolean `satisfied` trước đây là nguồn gốc gây hiểu nhầm: "satisfied" nhưng vẫn có thể có warning mềm. Tách bạch `blocking` (chặn cứng) và `warnings` (mềm) giúp tầng trình bày và các use case kiểm soát chính xác nghiệp vụ.
4. Target Dish Count là cấu hình tuỳ chọn của gia đình; nhiều nhà ăn uống linh hoạt không có số lượng cố định. Giá trị `null` biểu thị rõ "không áp dụng", tránh sinh cảnh báo giả.
5. Independent Tag Counting là nguyên lý cốt lõi của quy định mâm cơm Việt Nam: một món canh chua cá vừa là món chính vừa là món canh, cần được tính cho cả hai mục tiêu dinh dưỡng.

## Consequence

- Callers của `evaluateRequired` (`finalizeSession`, `FinalizeBar`) chuyển sang dùng `evaluateRules`.
- `groups` và `selection_sessions` được bổ sung cột `target_dish_count integer` (nullable), kèm check constraint `>= 1` cho `groups`.
- `session_rules` được snapshot tự nhiên cho cả hai loại luật `REQUIRED` và `PREFERRED`.

---

# DEC-068 — Tự Động Đóng Phiên Quá Hạn & Quản Lý Danh Mục Món Vận Hành Tối Thiểu (E11)

**Ngày quyết định:** 2026-09-04 | **Trạng thái:** Accepted

## Quyết định

1. **Di chuyển `resolveDecisionDate` sang `src/shared/time/decision-date.ts`**: Cả hai feature `session` và `meal` đều cần hàm quy đổi ngày quyết định theo múi giờ IANA. `features/meal` không được phép import chéo `features/session` (`eslint.config.mjs`). `shared/time/` là nơi hợp lý cho các tiện ích thời gian dùng chung.
2. **Chốt chặn kép cho phiên quá hạn**:
   - Quét lười (Lazy invalidation) tại Group Hub (`groups/[groupId]/page.tsx`): gọi `invalidateExpiredSessions(groupId, decisionDate)` một câu UPDATE idempotent thuần trước khi kiểm tra phiên mở.
   - Chốt chặn độc lập tại use case `finalizeSession` (bước 1): so sánh `session.decisionDate < today` (quy đổi qua `resolveDecisionDate(new Date(), session.groupTimeZone)`) và trả về `ERR_SESSION_NOT_ACTIVE` nếu đã quá hạn. Điều này đảm bảo an toàn kể cả khi người dùng giữ tab cũ hoặc chưa kích hoạt quét lười.
3. **Bảo tồn tương tác của phiên INVALID**: `invalidateExpiredSessions` chỉ chuyển `state = 'INVALID'`, bảo tồn nguyên vẹn các dòng tương tác trong `interactions` (`BR-061`) để phục vụ thuật toán học ngầm (F30) sau này.
4. **Gỡ món (Deactivate) đối xứng với thêm lại (Reactivate)**:
   - Thao tác gỡ món (`deactivateGroupDish`) chỉ cập nhật `group_dishes.state = 'INACTIVE'`, KHÔNG xoá dòng và KHÔNG xoá nhãn trong `group_dish_tags` (đối xứng với `reactivateGroupDish` và tuân thủ `DEC-053`).
   - Danh sách món đã gỡ được đọc riêng qua `listInactiveInGroup` (không làm phình `listActiveInGroup`).
   - Phân quyền: Chỉ Admin mới thấy các nút "Gỡ", "Thêm lại" và mở sheet chỉnh sửa nhãn món (`canEdit`).

---

# 📜 Lịch sử thay đổi (Change History)

| Version | Ngày | Nội dung cập nhật |
| :---: | :---: | :--- |
| `3.16` | 2026-09-04 | Bổ sung `DEC-068` (Tự Động Đóng Phiên Quá Hạn & Quản Lý Danh Mục Món Vận Hành Tối Thiểu) cho E11 |
| `3.15` | 2026-09-02 | Bổ sung `DEC-067` (Mô Hình Hai Loại Cảnh Báo Và Phân Tách Cấu Hình Luật) cho E10-S1 |
| `3.14` | 2026-09-01 | Bổ sung `DEC-066` (Chế Độ Chặng Cắt Trần TRONG TỪNG CHẶNG, Không Cắt Chung Rồi Chia) cho E9-S1 |
| `3.13` | 2026-08-26 | Bổ sung `DEC-065` (Vị Trí Tiếp Tục Suy Ở Client, Không Lưu Server) cho E8-S2 |
| `3.12` | 2026-08-26 | Bổ sung `DEC-064` (v1.1 Đóng Băng Deck Toàn Phần; `BR-048` Được Siết Cho Khớp Code) cho E8-S1 |
| `3.11` | 2026-08-31 | Bổ sung `DEC-062` (Tương tác Cannot Eat ở Swipe Card, chặn Undo, số hạng X trong Session Ranking, và ngoại lệ BR-056 khi Finalize) cho E7-S3 |
| `3.10` | 2026-08-26 | Bổ sung `DEC-063` (`CANNOT_EAT` audit log, tách kiểu enum CSDL vs API input, sửa TC-117) cho E7-S2 |
| `3.9` | 2026-08-26 | Bổ sung `DEC-056` (re-scope v1.1: thêm `F49`/`F50`, hoãn `F25`/`F28`/`F29`), `DEC-057` (cổng kiểm link tài liệu), `DEC-058` (trần deck 30 thẻ và thứ tự pipeline), `DEC-059` (chế độ vuốt theo chặng), `DEC-060` (`Cannot Eat` xoá tương tác cũ và ngoại lệ `BR-056`), `DEC-061` (đánh số lại epic v1.2) — lập kế hoạch v1.1 |
| `3.8` | 2026-08-25 | Bổ sung `DEC-052` (nhãn STAPLE và hợp đồng dấu nối), `DEC-053` (dùng lại món phải ghi tag), `DEC-054` (sheet thêm đa chọn nhãn — thay thế `DEC-031`), `DEC-055` (gợi ý catalog chung, SPEC-023) — bảo trì sau v1.0 |
| `3.7` | 2026-08-21 | Bổ sung `DEC-051` (Ngưỡng coverage từng tầng qua glob, loại trừ type-only, CI test:coverage riêng, NFR-04 định lượng bằng test count, count-tone đổi sang ink-muted) cho E6-S4 (Cột mốc M6) |
| `3.6` | 2026-08-21 | Bổ sung `DEC-050` (S-04 4 trạng thái loại trừ, "Dùng link mời" thành chú thích, chặn mở phiên nhóm 0 món) cho E6-S3 |
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







