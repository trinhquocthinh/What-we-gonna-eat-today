# 📖 Business Rules — What We Gonna Eat Today

> **Document Metadata**
>
> - **Version:** `1.6` | **Status:** `Active`
> - **Created:** `2026-07-23` | **Last Updated:** `2026-08-14`
> - **Supersedes:** `v1.5` | **Upstream:** [Problem Definition](what-we-gonna-eat-today_problem-definition_v1.3.md) • [Decision Log](what-we-gonna-eat-today_decision-log_v1.1.md)
> - **Downstream:** [PRD](what-we-gonna-eat-today_prd_v0_1.md) • [SDD](what-we-gonna-eat-today_sdd_v0_1.md) • [Tech Spec](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) • [Test Cases Spec](what-we-gonna-eat-today_test-cases-specification_v0_1.md)
>
> 📌 *Tài liệu định nghĩa toàn bộ 61 quy tắc nghiệp vụ bất biến (`BR-001` đến `BR-061`) của hệ thống What We Gonna Eat Today. Mỗi quy tắc có mã định danh bất biến dùng làm tham chiếu chuẩn cho PRD, SDD và Test Cases.*

---

## 📑 Mục lục (Table of Contents)

1. [Dish and Tag Rules (`BR-001` → `BR-004`)](#1-dish-and-tag-rules)
2. [Group Dish Pool Rules (`BR-005`)](#2-group-dish-pool-rules--br-005)
3. [Group Role and Permission Rules (`BR-006` → `BR-009`)](#3-group-role-and-permission-rules)
4. [Group Rule (`BR-010` → `BR-014`)](#4-group-rule--br-010)
5. [Session Rule (`BR-015` → `BR-019`)](#5-session-rule--br-015)
6. [Selection Session Lifecycle Rules (`BR-020` → `BR-025`)](#6-selection-session-lifecycle-rules--br-020)
7. [Participant Lifecycle (`BR-026`)](#7-participant-lifecycle--br-026)
8. [Chef Role and Chef Mode Rules (`BR-027` → `BR-029`)](#8-chef-role-and-chef-mode-rules)
9. [Purchase Source Rules (`BR-030` → `BR-032`)](#9-purchase-source-rules--br-030)
10. [Personalized Candidate Discovery Rules (`BR-033`)](#10-personalized-candidate-discovery-rules--br-033)
11. [User Constraint and Recommendation Control (`BR-034` → `BR-036`)](#11-user-constraint-and-recommendation-control)
12. [Preference Rules (`BR-037` → `BR-038`)](#12-preference-rules)
13. [User Interaction Rules (`BR-039` → `BR-044`)](#13-user-interaction-rules--br-039)
14. [Personal Ranking Algorithm Rules (`BR-045` → `BR-048`)](#14-personal-ranking-algorithm-rules--br-045)
15. [Session Ranking Algorithm Rules (`BR-049`)](#15-session-ranking-algorithm-rules--br-049)
16. [Final Meal Rules (`BR-050` → `BR-053`)](#16-final-meal-rules--br-050)
17. [Meal Composition Rule and Ranking Boundary (`BR-054`)](#17-meal-composition-rule-and-ranking-boundary--br-054)
18. [Session Expiration and Cancellation Rules (`BR-055`)](#18-session-expiration-and-cancellation-rules--br-055)
19. [Eating History Rules (`BR-056` → `BR-057`)](#19-eating-history-rules)
20. [Historical Correction Rules (`BR-058` → `BR-060`)](#20-historical-correction-rules)
21. [Invalid, Removed and Re-added Interaction Rules (`BR-061`)](#21-invalid-removed-and-re-added-interaction-rules--br-061)
22. [Core Invariants Summary](#22-core-invariants-summary)
23. [Rule ID Registry (Bảng tra cứu toàn diện 61 BR)](#23-rule-id-registry)
24. [Lịch sử thay đổi (Change History)](#24-lịch-sử-thay-đổi-change-history)

---

# 1. Dish and Tag Rules

## 1.1 Global Dish Pool — `BR-001`

Hệ thống duy trì một **Global Dish Pool** đóng vai trò catalog món ăn dùng chung và quản lý Global Dish Identity.

Khi User thêm một món mới:

1. Hệ thống tự động tìm kiếm các món có khả năng trùng hoặc tương tự qua thuật toán chuẩn hóa tên.
2. User có thể chọn món đã tồn tại trong catalog chung.
3. Nếu thực sự là món mới, User xác nhận tạo Global Dish mới.
4. Món mới đồng thời được tự động kích hoạt vào Group Dish Pool của nhóm hiện tại.

> [!NOTE]
> Mọi Global Dish mới bắt buộc lưu thông tin nguồn gốc (Provenance):
>
> - `created_by_user` (Người dùng tạo)
> - `created_from_group` (Nhóm khởi tạo)
> - `created_at` (Thời điểm tạo)

---

## 1.2 Duplicate Dish và Logical Merge — `BR-002`

### MVP

- Hệ thống hỗ trợ phát hiện trùng lặp (`Duplicate Detection`) khi tạo món mới.
- Không triển khai Full Dish Merge tự động trong MVP để bảo vệ tính toàn vẹn dữ liệu.
- Các liên kết lịch sử cũ không bị viết đè (rewrite).
- Phiên đang chạy (`ACTIVE`) không bị thay đổi bởi quy trình merge.
- System Admin có thể quản lý trạng thái Global Dish để ngăn các món rác được sử dụng mới.

### Định hướng hậu MVP (Post-MVP Direction)

- Áp dụng chiến lược **Logical Merge / Canonical Identity** thay vì Hard Delete/Rewrite.
- Bản ghi lịch sử vẫn giữ nguyên `dish_id` gốc và resolve về Canonical Identity khi aggregate dữ liệu.

---

## 1.3 System Tag — `BR-003`

System Tag được sử dụng trong: Recommendation, Ranking, Group Rule, Session Rule và Final Meal validation.

Tập 5 System Tag cố định trong phiên bản v1:

- `MAIN` (Món mặn / Món chính)
- `SIDE` (Món phụ / Rau xào)
- `SOUP` (Món canh)
- `STAPLE` (Món tinh bột / Cơm, bún)
- `DESSERT` (Món tráng miệng / Hoa quả)

> [!IMPORTANT]
>
> - Một món có thể mang **nhiều System Tag cùng lúc**.
> - Nhóm kế thừa System Tag mặc định từ Global Dish nhưng có thể tùy chỉnh riêng trong nhóm mà không làm ảnh hưởng nhóm khác.

---

## 1.4 Descriptive Tag — `BR-004`

Descriptive Tag phục vụ phân loại, tìm kiếm và cá nhân hóa sở thích. Được quản lý linh hoạt trong bối cảnh của từng Group.

---

# 2. Group Dish Pool Rules — `BR-005`

Group Dish Pool là tập con của Global Dish Pool dành riêng cho một nhóm.

Candidate Discovery luôn lấy dữ liệu từ Group Dish Pool hiện tại. Món ăn trong nhóm có vòng đời:

```text
ACTIVE ◄──► INACTIVE
```

### Khi món bị gỡ khỏi nhóm (Inactive)

- Quan hệ Group Dish chuyển sang `INACTIVE` để bảo tồn các liên kết lịch sử.
- Món vẫn tồn tại trong Global Dish Pool.
- Món không còn xuất hiện trong Personal Candidate Deck và không thể chọn vào Final Meal mới.
- Nếu gỡ món khi phiên đang `ACTIVE`: Tương tác cũ của món đó bị vô hiệu hóa trong Session Ranking.

### Khi thêm lại món (Re-add)

- Chuyển trạng thái từ `INACTIVE` $\to$ `ACTIVE`.
- Phục hồi các metadata riêng của nhóm.
- Không tự động khôi phục tương tác Swipe cũ trong phiên đang chạy.

---

# 3. Group Role and Permission Rules

## 3.1 Group Membership Model — `BR-006`

```text
Member (Cơ bản)
  ├── Member + Chef
  ├── Member + Group Admin
  └── Member + Chef + Group Admin
```

- `Member` là tư cách cơ bản để tham gia vào mọi hoạt động của nhóm.
- `Group Admin` và `Chef` là các vai trò bổ sung.
- Mỗi nhóm phải luôn có **ít nhất 1 Group Admin**.
- Rời nhóm hoặc bị xóa khỏi nhóm sẽ chấm dứt quyền truy cập vào tài nguyên nhóm.

---

## 3.2 Quyền hạn của Group Member — `BR-007`

- Xem danh sách món trong Group Dish Pool.
- Thêm món mới vào Group Dish Pool.
- Tham gia vào các Selection Sessions.
- Tự cấu hình sở thích cá nhân (`Cannot Eat`, `Blacklist`, `Explicit Preference`).
- Xem thực đơn Final Meal và lịch sử ăn uống của nhóm.

---

## 3.3 Quyền hạn của Group Admin — `BR-008`

- Tất cả quyền của Group Member.
- Đổi tên nhóm và chỉnh sửa múi giờ nhóm ([SPEC-002](what-we-gonna-eat-today_sdd_v0_1.md)).
- Tạo link mời tham gia nhóm ([SPEC-003](what-we-gonna-eat-today_sdd_v0_1.md)).
- Gỡ thành viên ra khỏi nhóm (trừ Creator/Chef của phiên đang chạy).
- Gán hoặc gỡ vai trò Chef Role của thành viên.
- Chỉnh sửa System Tag của món trong nhóm.
- Cấu hình các quy tắc mâm cơm `Group Rules`.
- Gỡ món khỏi Group Dish Pool (`Active` $\to$ `Inactive`).

---

## 3.4 Quyền hạn của System Admin — `BR-009`

- Quản trị toàn bộ Global Dish catalog và trạng thái hệ thống.
- Thực hiện điều chỉnh dữ liệu lịch sử khi có sự cố kỹ thuật đặc biệt.

---

# 4. Group Rule — `BR-010`

Group Rules quy định cấu trúc mâm cơm mong đợi của gia đình.

## 4.1 Target Dish Count — `BR-011`

- Số lượng món mục tiêu mong muốn cho một bữa ăn (ví dụ: 3 món hoặc 4 món).
- Đóng vai trò hướng dẫn; không chặn chốt thực đơn nếu không đạt.

## 4.2 Tag Rule Structure — `BR-012`

Cấu trúc một quy tắc theo Tag:

```text
System Tag + minimum_count (≥ 1) + rule_type (Required | Preferred) + overridable (boolean)
```

- **Ràng buộc duy nhất:** `UNIQUE(group_id, rule_type, system_tag)`.
- Một System Tag không được đồng thời vừa là `Required` vừa là `Preferred`.
- **Independent Tag Counting:** Một món mang cả `MAIN` và `SOUP` được tính độc lập cho cả 2 chỉ tiêu.

## 4.3 Required Rule — `BR-013`

- Bắt buộc phải thỏa mãn khi chốt bữa.
- Nếu thiếu $\to$ Chặn Finalize, giữ nguyên phiên ở trạng thái `ACTIVE`.

## 4.4 Preferred Rule — `BR-014`

- Khuyến khích có trong bữa ăn.
- Nếu thiếu $\to$ Hiển thị cảnh báo mềm, Creator vẫn có thể bấm xác nhận để Finalize.

---

# 5. Session Rule — `BR-015`

## 5.1 Draft Editing — `BR-016`

- Khi tạo phiên (`Draft`), Group Rules được tự động **Snapshot** sang `Session Rules`.
- Chỉ Creator có quyền điều chỉnh Session Rules và **chỉ được chỉnh trong giai đoạn DRAFT**.
- Khi phiên bấm `Start` ($\to$ `ACTIVE`), Session Rules bị đóng băng hoàn toàn.

## 5.2 Inherited Rule và Override — `BR-017`

- Quy tắc có cờ `overridable = true` cho phép Creator sửa `minimum_count` hoặc vô hiệu hóa trong Draft.
- Quy tắc bị override sẽ thay thế hoàn toàn quy tắc kế thừa (không cộng dồn).

## 5.3 Session-only Rule — `BR-018`

- Creator có thể bổ sung thêm các quy tắc chỉ áp dụng cho riêng phiên hôm nay trong giai đoạn Draft.

## 5.4 Effective Rule Precedence — `BR-019`

Thứ tự ưu tiên hiệu lực:

```text
Session-only Rule > Overridden Rule > Inherited Group Rule
```

---

# 6. Selection Session Lifecycle Rules — `BR-020`

```mermaid
flowchart LR
    Draft["📝 DRAFT"] -->|Start Session| Active["🚀 ACTIVE"]
    Active -->|Finalize Meal| Finalized["✅ FINALIZED"]
    Active -.->|Timeout / Cancel (v1.2)| Invalid["🛑 INVALID"]
```

## 6.1 Draft — `BR-021`

- Khởi tạo phiên, Creator mặc định là Participant đầu tiên.
- Cho phép cấu hình danh sách người tham gia, chọn Chef và chỉnh sửa Session Rules.

## 6.2 Active — `BR-022`

- Thành viên bắt đầu mở Candidate Deck và vuốt chọn món.
- Creator xem bảng Session Ranking thời gian thực và chọn món vào thực đơn nháp.

## 6.3 Finalized — `BR-023`

- Creator chốt thực đơn thành công.
- Tự động sinh `Final Meal` và `Eating History` trong cùng một Transaction nguyên tử.
- **Phiên đã Finalized không bao giờ được Reopen.**

## 6.4 Invalid — `BR-024`

- Phiên bị hủy hoặc hết hạn cuối ngày mà không chốt. Không học sở thích, không tạo lịch sử ăn.

## 6.5 Session Uniqueness — `BR-025`

- Trong cùng một ngày (`Decision Date`), mỗi Group chỉ được có **tối đa 1 phiên ở trạng thái `ACTIVE` hoặc `FINALIZED`**.
- Phiên `DRAFT` hoặc `INVALID` không chặn việc mở phiên mới.

---

# 7. Participant Lifecycle — `BR-026`

Tiến trình của thành viên trong phiên:

```text
ACTIVE ◄──► COMPLETED (Đã chọn xong)
   │
   └──► REMOVED (Bị gỡ khỏi phiên)
```

- Thành viên bấm `COMPLETED` vẫn có thể mở lại để tiếp tục vuốt khi phiên còn `ACTIVE`.
- Creator có thể gỡ thành viên khỏi phiên. Nếu thêm lại, thành viên bắt đầu lượt mới với 0 tương tác.
- Thành viên có tên trong danh sách lúc Finalize sẽ nhận Default Eating History kể cả khi chưa bấm Completed.

---

# 8. Chef Role and Chef Mode Rules

## 8.1 Persistent Chef Role — `BR-027`

- Vai trò Đầu bếp được gán bền vững cho thành viên trong nhóm.
- Khi phiên đang `ACTIVE`, không thể gỡ vai trò Chef của người đang phụ trách nấu.

## 8.2 Chef Mode — `BR-028`

- Creator có thể bật/tắt `Chef Mode` cho phiên trong giai đoạn Draft.
- Khi bật: Chỉ định đúng 1 Chef từ danh sách thành viên tham gia phiên.
- Điểm bối cảnh đầu bếp ($C$) được cộng vào thuật toán Personal Ranking nếu Chef nấu được món đó.

## 8.3 Cooking Capability — `BR-029`

- Khả năng nấu nướng (`Can Cook` / `Cannot Cook` / `Unknown`) thuộc hồ sơ cá nhân của User.
- Giá trị mặc định khi chưa thiết lập là `Unknown` (trung tính, không bị phạt điểm).

---

# 9. Purchase Source Rules — `BR-030`

- Quản lý các nguồn mua khả dụng của món ăn (Quán quen, Chợ, Siêu thị).
- Món có $\ge 1$ nguồn mua hợp lệ trong nhóm được cộng điểm thành phần $S = 1.0$ trong Personal Ranking.

---

# 10. Personalized Candidate Discovery Rules — `BR-033`

- Mỗi thành viên nhận một **Personal Candidate Deck** riêng biệt.
- Ứng dụng lọc cứng trước (Hard Filter: loại bỏ món `INACTIVE`, `Cannot Eat`, `Blacklist`), sau đó mới chấm điểm sắp xếp thứ tự.
- Giữ nguyên tính độc lập: Ràng buộc của người A không lọc mất món trên Deck của người B.

---

# 11. User Constraint and Recommendation Control

## 11.1 Cannot Eat — `BR-034`

- Ràng buộc cứng về dị ứng hoặc kiêng kỵ tuyệt đối của cá nhân.
- Món bị đánh dấu `Cannot Eat` sẽ bị loại bỏ hoàn toàn khỏi Deck cá nhân và trừ điểm nặng trong Session Ranking ($-1.0$).
- Đánh dấu `Cannot Eat` sẽ tự động xóa tương tác Swipe trước đó của User với món này.

## 11.2 Blacklist — `BR-035`

- Cá nhân không muốn thấy món này xuất hiện trong danh sách gợi ý.
- Món bị loại khỏi Deck khám phá nhưng không xóa tương tác Swipe nếu đã gửi trong phiên hiện tại.

## 11.3 History Whitelist — `BR-036`

- Món ăn đặc biệt yêu thích được User đưa vào danh sách ngoại lệ.
- Bỏ qua điểm phạt lặp món gần đây ($R = 0$) đối với món nằm trong Whitelist.

---

# 12. Preference Rules

## 12.1 Explicit Preference — `BR-037`

- Sở thích chủ động: `Like` ($E = +1$), `Neutral` ($E = 0$), `Dislike` ($E = -1$).
- `Dislike` chỉ hạ điểm xếp hạng cá nhân, **không** lọc cứng món khỏi Deck.

## 12.2 Implicit Preference — `BR-038`

- Tự động học từ lịch sử Swipe của các phiên đã `FINALIZED`.
- Áp dụng hàm phân rã thời gian chu kỳ bán rã 60 ngày với hệ số làm mượt $K_{\text{prior}} = 3$.

---

# 13. User Interaction Rules — `BR-039`

## 13.1 Effective Session Interaction — `BR-040`

- Bộ 3 trạng thái: `None ↔ Swipe Right ↔ Swipe Left`.
- Tương tác mới nhất ghi đè tương tác cũ. Hỗ trợ thao tác `Undo` về trạng thái `None`.

## 13.2 Swipe Right — `BR-041`

- Biểu thị sự yêu thích muốn ăn món này hôm nay ($+1.0$ điểm trong Session Ranking).

## 13.3 Swipe Left — `BR-042`

- Biểu thị hôm nay không muốn ăn món này ($-0.7$ điểm trong Session Ranking).

## 13.4 Persistent Dish Actions — `BR-043`

- Phân định rõ: Cài đặt lâu dài (`Cannot Eat`, `Blacklist`) khác với tương tác nhanh trong phiên (`Swipe`).

## 13.5 Session Participation — `BR-044`

- Thao tác bấm "Đã chọn xong" (`Completed`) gửi tín hiệu để Creator biết tiến độ của các thành viên.

---

# 14. Personal Ranking Algorithm Rules — `BR-045`

$$\text{Personal Score} = 0.30 \cdot E + 0.25 \cdot I + 0.10 \cdot C + 0.10 \cdot S - 0.25 \cdot R$$

## 14.1 History Cooldown — `BR-046`

- Cửa sổ Cooldown 7 ngày theo hàm phân rã tuyến tính $R = \max(0, 1 - d/7)$.
- **Multi-source Collapse:** Ăn cùng món ở nhiều nhóm trong ngày chỉ tính 1 lần ăn duy nhất.

## 14.2 Exploration — `BR-047`

- Tỉ lệ khám phá cố định **20%** theo khối 5 vị trí: **4 thẻ Exploit + 1 thẻ Explore**.

## 14.3 Deck Stability — `BR-048`

- Khi tính toán lại giữa phiên: **Đóng băng toàn bộ các thẻ người dùng đã xem qua (`index < cursor`)**.

---

# 15. Session Ranking Algorithm Rules — `BR-049`

$$\text{Session Score} = \frac{1.0 \cdot P - 0.7 \cdot N - 1.0 \cdot X - 0.3 \cdot H}{T}$$

- Chuẩn hóa theo tổng số thành viên tham gia ($T$).
- Thuần túy dựa trên bằng chứng tương tác thực tế. Creator không có trọng số ưu tiên riêng.

---

# 16. Final Meal Rules — `BR-050`

- Thực đơn bữa ăn do Creator lựa chọn từ danh sách món của nhóm.
- Một món chỉ xuất hiện tối đa 1 lần trong thực đơn chốt.

## 16.1 Live Composition Feedback — `BR-051`

- Giao diện cung cấp phản hồi trực quan theo thời gian thực về độ thỏa mãn các quy định mâm cơm.

## 16.2 Finalize Validation — `BR-052`

- Kiểm tra tính hợp lệ toàn diện tại thời điểm bấm Chốt bữa bằng System Tag hiện tại.
- Thỏa mãn tất cả `Required Rules` mới cho phép chốt.

## 16.3 Finalize Warning Audit — `BR-053`

- Lưu trữ nhật ký các cảnh báo mềm (`Preferred Rule` hoặc `Target Count`) mà Creator đã xác nhận bỏ qua.

---

# 17. Meal Composition Rule and Ranking Boundary — `BR-054`

Quy định mâm cơm **không tham gia vào thuật toán tính điểm Ranking**. Bảng xếp hạng phản ánh trung thực sở thích người dùng, còn Rule Engine đảm bảo tính hợp lệ của mâm cơm lúc finalize.

---

# 18. Session Expiration and Cancellation Rules — `BR-055`

- Xử lý phiên hết hạn cuối ngày hoặc phiên bị hủy chuyển sang `INVALID`.

---

# 19. Eating History Rules

## 19.1 Default Eating History — `BR-056`

- Khi finalize, hệ thống tự động sinh bản ghi lịch sử ăn uống cho mọi Participant có mặt trong phiên.

## 19.2 Personal Eating History Correction — `BR-057`

- Cá nhân có quyền thêm/xóa món trong lịch sử ăn của chính mình. Điều chỉnh cá nhân có quyền hạn tối cao.

---

# 20. Historical Correction Rules

## 20.1 Creator Correction — `BR-058`

- Creator được phép điều chỉnh thực đơn đã chốt trong **ngày hiện tại**.

## 20.2 System Admin Correction — `BR-059`

- Quyền can thiệp đặc biệt của System Admin đối với các ngày cũ kèm audit trail đầy đủ.

## 20.3 Impact on Eating History — `BR-060`

- Cập nhật thực đơn nhóm chỉ tác động lên các bản ghi lịch sử mặc định mà User chưa tự tay chỉnh sửa.

---

# 21. Invalid, Removed and Re-added Interaction Rules — `BR-061`

- Xử lý chi tiết việc bảo toàn lịch sử và vô hiệu hóa tương tác khi thành viên hoặc món ăn bị gỡ/thêm lại.

---

# 22. Core Invariants Summary

1. **Group Membership:** Creator và Chef của phiên `ACTIVE` không thể bị gỡ khỏi Group.
2. **Session Uniqueness:** Tối đa 1 phiên `ACTIVE` hoặc `FINALIZED` cho mỗi Group trong 1 ngày.
3. **Hard Filter First:** Ràng buộc `Cannot Eat`, `Blacklist`, `Inactive` loại món trước khi tính điểm.
4. **Deck Stability:** Thẻ đã xem qua không bao giờ bị đổi vị trí khi tính lại điểm giữa phiên.
5. **Atomic Finalize:** Tạo Final Meal, chuyển trạng thái Session và ghi Eating History trong 1 transaction duy nhất.

---

# 23. Rule ID Registry

| Mã BR | Mục | Chủ đề nghiệp vụ chính |
| :---: | :---: | :--- |
| `BR-001` | 1.1 | Global Dish Pool & Provenance |
| `BR-002` | 1.2 | Duplicate Dish & Logical Merge |
| `BR-003` | 1.3 | 5 System Tags cố định & Tính độc lập |
| `BR-004` | 1.4 | Descriptive Tags |
| `BR-005` | 2.0 | Group Dish Pool (Active / Inactive) |
| `BR-006` | 3.1 | Group Membership Model |
| `BR-007` | 3.2 | Quyền hạn Group Member |
| `BR-008` | 3.3 | Quyền hạn Group Admin |
| `BR-009` | 3.4 | Quyền hạn System Admin |
| `BR-010` | 4.0 | Group Rules Model |
| `BR-011` | 4.1 | Target Dish Count |
| `BR-012` | 4.2 | Cấu trúc Tag Rule & Independent Counting |
| `BR-013` | 4.3 | Required Rule (Chặn Finalize) |
| `BR-014` | 4.4 | Preferred Rule (Cảnh báo mềm) |
| `BR-015` | 5.0 | Session Rules Snapshot |
| `BR-016` | 5.1 | Chỉnh sửa Rule trong Draft |
| `BR-017` | 5.2 | Kế thừa và Override Rule |
| `BR-018` | 5.3 | Session-only Rules |
| `BR-019` | 5.4 | Thứ tự ưu tiên hiệu lực Rule |
| `BR-020` | 6.0 | Selection Session Lifecycle |
| `BR-021` | 6.1 | Trạng thái DRAFT |
| `BR-022` | 6.2 | Trạng thái ACTIVE |
| `BR-023` | 6.3 | Trạng thái FINALIZED (Không Reopen) |
| `BR-024` | 6.4 | Trạng thái INVALID |
| `BR-025` | 6.5 | Tính duy nhất Session trong ngày |
| `BR-026` | 7.0 | Vòng đời Participant (Active / Completed) |
| `BR-027` | 8.1 | Vai trò Đầu bếp bền vững |
| `BR-028` | 8.2 | Chế độ Chef Mode trong phiên |
| `BR-029` | 8.3 | Khả năng nấu nướng của cá nhân |
| `BR-030` | 9.0 | Purchase Source Model |
| `BR-031` | 9.1 | Global Purchase Source |
| `BR-032` | 9.2 | Cấu hình nguồn mua trong nhóm |
| `BR-033` | 10.0 | Khám phá Candidate Deck cá nhân hóa |
| `BR-034` | 11.1 | Ràng buộc Cannot Eat |
| `BR-035` | 11.2 | Danh sách Blacklist |
| `BR-036` | 11.3 | Danh sách History Whitelist |
| `BR-037` | 12.1 | Sở thích rõ ràng (Like / Dislike) |
| `BR-038` | 12.2 | Sở thích suy diễn (Implicit Preference) |
| `BR-039` | 13.0 | Tương tác người dùng (User Interaction) |
| `BR-040` | 13.1 | Tương tác hiệu lực cuối cùng & Undo |
| `BR-041` | 13.2 | Thao tác Swipe Right |
| `BR-042` | 13.3 | Thao tác Swipe Left |
| `BR-043` | 13.4 | Phân định Tương tác phiên vs Cài đặt lâu dài |
| `BR-044` | 13.5 | Trạng thái hoàn thành lượt chọn |
| `BR-045` | 14.0 | Thuật toán Personal Ranking tuyến tính |
| `BR-046` | 14.1 | Điểm phạt lặp món (History Cooldown 7 ngày) |
| `BR-047` | 14.2 | Luồng khám phá Explore 20% |
| `BR-048` | 14.3 | Đóng băng thẻ đã xem (Deck Stability) |
| `BR-049` | 15.0 | Thuật toán Session Ranking đồng thuận |
| `BR-050` | 16.0 | Dựng thực đơn Final Meal |
| `BR-051` | 16.1 | Phản hồi mâm cơm trực tiếp (Live Feedback) |
| `BR-052` | 16.2 | Tái thẩm định lúc Chốt bữa (Finalize Revalidation) |
| `BR-053` | 16.3 | Nhật ký cảnh báo chốt bữa (Warning Audit) |
| `BR-054` | 17.0 | Ranh giới tách biệt Ranking và Composition Rules |
| `BR-055` | 18.0 | Hết hạn phiên và Hủy phiên |
| `BR-056` | 19.1 | Lịch sử ăn uống tự động (Default Eating History) |
| `BR-057` | 19.2 | Điều chỉnh lịch sử cá nhân (Personal Correction) |
| `BR-058` | 20.1 | Creator điều chỉnh thực đơn trong ngày |
| `BR-059` | 20.2 | System Admin điều chỉnh thực đơn ngày cũ |
| `BR-060` | 20.3 | Tác động điều chỉnh lên Eating History |
| `BR-061` | 21.0 | Vô hiệu hóa và bảo toàn tương tác cũ |

---

# 24. Lịch sử thay đổi (Change History)

| Version | Ngày | Phần tác động | Nội dung thay đổi | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- | :--- |
| `1.6` | 2026-08-14 | Toàn bộ | Gán mã định danh `BR-ID` ổn định cho tất cả quy tắc nghiệp vụ | Đồng bộ PRD v0.1 |
| `1.6` | 2026-08-14 | System Tag | Cố định 5 giá trị System Tag cốt lõi | [PRD v0.1](what-we-gonna-eat-today_prd_v0_1.md) |
| `1.5` | 2026-08-14 | Ranking & Cooldown | Giới hạn Cooldown 7 ngày ở cấp Dish, Explore 20%, Session Ranking evidence-only | [DEC-012](what-we-gonna-eat-today_decision-log_v1.1.md) |
| `1.4` | 2026-07-29 | Rules & Validation | Quy định cấu trúc Group/Session Rules, snapshot Draft, tách Ranking khỏi Rule Engine | [DEC-010](what-we-gonna-eat-today_decision-log_v1.1.md), [DEC-011](what-we-gonna-eat-today_decision-log_v1.1.md) |
| `1.3` | 2026-07-23 | Core Concepts | Khởi tạo mô hình Lifecycle, Chef Role, Eating History và Provenance | [DEC-001](what-we-gonna-eat-today_decision-log_v1.1.md) → [DEC-009](what-we-gonna-eat-today_decision-log_v1.1.md) |
