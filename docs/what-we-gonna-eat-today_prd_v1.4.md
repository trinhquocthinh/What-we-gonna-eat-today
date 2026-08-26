# 📋 Product Requirements Document (PRD) — What We Gonna Eat Today

> **Document Metadata**
>
> - **Version:** `1.4` | **Status:** `Approved`
> - **Created:** `2026-08-14` | **Last Updated:** `2026-08-14`
> - **Upstream:** [Problem Definition v1.3](what-we-gonna-eat-today_problem-definition_v1.3.md) • [Business Rules v1.4](what-we-gonna-eat-today_business-rules_v1.4.md) • [Ranking Specification v0.1](what-we-gonna-eat-today_ranking-specification_v0_1.md) • [Decision Log v1.1](what-we-gonna-eat-today_decision-log_v1.1.md)
> - **Downstream:** [SDD](what-we-gonna-eat-today_sdd_v0_1.md) • [Tech Spec & Architecture](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) • [Master Plan](what-we-gonna-eat-today_master-plan_v1_0.md)

---

## 📑 Mục lục (Table of Contents)

1. [Tóm tắt và mục tiêu sản phẩm](#1-tóm-tắt-và-mục-tiêu-sản-phẩm)
2. [Personas (Đối tượng người dùng)](#2-personas-đối-tượng-người-dùng)
3. [Epic và User Stories](#3-epic-và-user-stories)
4. [Bảng phân loại tính năng (MoSCoW Matrix)](#4-bảng-phân-loại-tính-năng-moscow-matrix)
5. [Yêu cầu phi chức năng (NFRs)](#5-yêu-cầu-phi-chức-năng-nfrs)
6. [Phạm vi phát hành theo phiên bản](#6-phạm-vi-phát-hành-theo-phiên-bản)
7. [Chỉ số đo lường thành công (Success Metrics)](#7-chỉ-số-đo-lường-thành-công-success-metrics)
8. [Ngoài phạm vi (Out of Scope)](#8-ngoài-phạm-vi-out-of-scope)
9. [Các quyết định kỹ thuật đã chốt](#9-các-quyết-định-kỹ-thuật-đã-chốt)
10. [Lịch sử thay đổi (Change History)](#10-lịch-sử-thay-đổi-change-history)

---

# 1. Tóm tắt và mục tiêu sản phẩm

**What We Gonna Eat Today** giúp một nhóm nhỏ (trước mắt là quy mô gia đình) quyết định nhanh chóng **tập món ăn (Dish Set) sẽ dùng trong ngày hiện tại**.

> [!IMPORTANT]
> **Tuyên ngôn mục tiêu sản phẩm:**  
> Giảm tối đa thời gian và áp lực tinh thần (cognitive effort) để cả nhóm thống nhất hôm nay ăn gì, bằng cách:
>
> 1. Cá nhân hoá trải nghiệm khám phá món ăn cho từng người.
> 2. Thu thập tín hiệu mong muốn nhanh chóng qua thao tác vuốt thẻ (Swipe).
> 3. Tổng hợp thành bức tranh toàn cảnh (Session Ranking) giúp Người tổ chức (Creator) chốt thực đơn tự tin trong vài phút.

### 🎯 3 Kết quả cốt lõi phiên bản v1.0 phải đạt được

1. **Tổ chức & Chốt nhanh:** Một người mở phiên và chốt xong thực đơn chỉ trong vài phút.
2. **Duyệt 1 tay tiện lợi:** Mỗi thành viên lướt chọn món trên điện thoại bằng một tay trong 30 giây, không phải đọc danh sách dài dằng dặc.
3. **Lưu vết & Học hỏi:** Kết quả chốt được ghi lại vào lịch sử ăn, trực tiếp làm mới và tối ưu các gợi ý cho những ngày tiếp theo (tránh lặp món).

*(Ngoài phạm vi: Phân chia chi tiết món nào vào bữa sáng/trưa/tối, quản lý nguyên liệu tồn kho, công thức nấu nướng, đặt giao đồ ăn).*

---

# 2. Personas (Đối tượng người dùng)

### 🧑‍🍳 P1 — Người tổ chức bữa ăn (Creator / Group Admin)

*Người thường xuyên phải gánh trách nhiệm trả lời câu hỏi "Hôm nay ăn gì?" cho cả nhà.*

- **Đặc điểm:** Biết rõ khẩu vị gia đình nhưng lúc cần quyết định thì chỉ nhớ quanh quẩn vài món quen thuộc.
- **Mong muốn:** Biết mọi người đang thèm gì mà không cần đi hỏi vòng quanh từng người; là người chốt thực đơn cuối cùng và chịu trách nhiệm bữa ăn.
- **Nỗi đau lớn nhất:** Phải ghi nhớ trong đầu ai không ăn được món gì, hôm qua/hôm kia đã ăn những món gì để tránh trùng lặp.

### 🏃 P2 — Thành viên bận rộn (Participant)

*Người tham gia bữa ăn nhưng không muốn tốn nhiều thời gian và công sức bàn luận.*

- **Đặc điểm:** Sẵn sàng bỏ ra 30 giây lướt điện thoại, nhưng sẽ bỏ cuộc nếu phải đọc danh sách 80 món.
- **Mong muốn:** Ý kiến khẩu vị của mình được ghi nhận công bằng mà không phải tranh cãi.
- **Nỗi đau lớn nhất:** Bị ép ăn món mình không thích hoặc phải trả lời những câu hỏi gợi ý mơ hồ.

---

# 3. Epic và User Stories

> [!NOTE]
> Mọi quy tắc nghiệp vụ được dẫn chiếu trực tiếp bằng mã định danh ổn định `BR-xxx` từ [Business Rules v1.4](what-we-gonna-eat-today_business-rules_v1.4.md).

## E1 — Group và thành viên

### US-001 — Tạo Group và thêm thành viên
>
> *Là **P1**, tôi muốn tạo một Group và thêm người nhà vào, để cả nhà cùng chọn món trong một không gian chung.*  
> **Quy tắc liên quan:** `BR-006`, `BR-007`, `BR-008`

- **Given** tôi đã đăng nhập hệ thống, **When** tôi tạo Group mới, **Then** tôi trở thành Member và mang vai trò Group Admin của Group đó.
- **Given** tôi là Group Admin, **When** tôi mời một User vào Group qua link mời, **Then** User đó tham gia với vai trò Member.
- **Given** tôi là Group Admin, **When** tôi cố gắng xoá một Member đang là Creator của một Active Session, **Then** hệ thống từ chối và nêu rõ lý do.

---

## E2 — Danh mục món ăn

### US-002 — Thêm Dish vào Group Dish Pool
>
> *Là **P1**, tôi muốn thêm các món nhà hay ăn vào danh mục, để hệ thống có dữ liệu gợi ý.*  
> **Quy tắc liên quan:** `BR-001`, `BR-003`

- **Given** tôi là Member, **When** tôi thêm Dish có tên đã tồn tại (dưới dạng chuẩn hoá), **Then** hệ thống hiển thị gợi ý món có sẵn để tôi chọn tái sử dụng.
- **Given** tôi xác nhận đây là món mới hoàn toàn, **When** tôi lưu, **Then** hệ thống tạo Global Dish mới kèm nguồn gốc (provenance) và đưa vào Group Dish Pool.
- **Given** Dish đã có sẵn trong Group Dish Pool, **When** tôi thêm lại, **Then** hệ thống thông báo đã tồn tại và không tạo bản ghi trùng.

### US-003 — Gán System Tag cho món
>
> *Là **P1**, tôi muốn đánh dấu món là Mặn, Canh, Món phụ hay Cơm/Bún/Phở, để hệ thống kiểm tra cơ cấu bữa ăn đủ chất.*  
> **Quy tắc liên quan:** `BR-003`, `BR-008`

- **Given** tôi là Group Admin, **When** tôi gán System Tag cho một Dish trong Group, **Then** thay đổi chỉ áp dụng riêng cho Group này.
- **Given** một Dish mang nhiều System Tag, **When** rule đếm món theo Tag, **Then** Dish được tính độc lập cho từng Tag tương ứng.
- **Given** tôi thêm một món ghép như *"Bún chả"*, **When** tôi chọn nhãn, **Then** tôi gán được **nhiều nhãn cùng lúc** (`STAPLE` + `MAIN`) ngay ở bước thêm.

> [!NOTE]
> Bản đầu của user story này viết *"hay Cơm"*, trong khi `BR-003` định nghĩa
> `STAPLE` là *"Món tinh bột / Cơm, bún"*. Sai lệch câu chữ đó đã lan vào nhãn
> giao diện, khiến "Bún chả" mang nhãn đúng nhưng hiện ra chữ "Cơm". Xem `DEC-052`.

### US-004 — Gỡ Dish khỏi Group Dish Pool
>
> *Là **P1**, tôi muốn gỡ món nhà không còn ăn nữa ra khỏi danh mục gợi ý.*  
> **Quy tắc liên quan:** `BR-005`

- **Given** Dish đang ở trạng thái Active trong Group, **When** tôi gỡ món, **Then** trạng thái quan hệ chuyển sang Inactive và lịch sử ăn cũ vẫn được bảo toàn.
- **Given** Dish bị gỡ trong lúc một Session đang Active, **When** Participant tải deck tiếp theo, **Then** Dish không còn xuất hiện và tương tác cũ không tính vào Session Ranking.

---

## E3 — Điều khiển sở thích cá nhân

### US-005 — Đánh dấu không ăn được (Cannot Eat)
>
> *Là **P2**, tôi muốn đánh dấu món tôi dị ứng hoặc không ăn được, để không phải từ chối mỗi ngày.*  
> **Quy tắc liên quan:** `BR-034`, `BR-043`

- **Given** tôi đánh dấu `Cannot Eat` một Dish, **When** deck của tôi được tính lại, **Then** món đó biến mất khỏi phần thẻ tôi chưa xem.
- **Given** tôi đã Swipe Right một Dish rồi sau đó đánh dấu `Cannot Eat`, **When** hệ thống xử lý, **Then** tương tác chọn món của tôi đối với Dish đó được xoá bỏ.
- **Given** một Participant đánh dấu `Cannot Eat` Dish X, **When** Creator xem tổng hợp, **Then** Dish X vẫn xuất hiện kèm nhãn cảnh báo có người không ăn được.

### US-006 — Đặt Like / Dislike
>
> *Là **P2**, tôi muốn bày tỏ món mình rất thích hoặc ghét, để hệ thống xếp thứ tự ưu tiên sát hơn.*  
> **Quy tắc liên quan:** `BR-037`

- **Given** tôi đặt `Like` cho Dish, **When** deck chưa xem được tính lại, **Then** món đó được ưu tiên xuất hiện sớm hơn.
- **Given** tôi đặt `Dislike`, **When** deck được tính lại, **Then** món đó bị tụt xuống cuối deck nhưng không bị xoá hẳn.

### US-007 — Blacklist và Whitelist
>
> *Là **P2**, tôi muốn chặn hẳn một món không bao giờ xuất hiện, hoặc bỏ qua phạt lặp món cho món tôi thích ăn hàng ngày.*  
> **Quy tắc liên quan:** `BR-035`, `BR-036`

- **Given** tôi đưa Dish vào Blacklist, **When** deck tính lại, **Then** Dish biến mất khỏi phần chưa xem.
- **Given** tôi đưa vào Whitelist một món vừa ăn hôm qua, **When** tính điểm ranking, **Then** điểm phạt lặp lại (recency penalty) của món đó bằng 0.

---

## E4 — Phiên chọn món (Selection Session)

### US-008 — Tạo và bắt đầu Session
>
> *Là **P1**, tôi muốn mở phiên chọn món cho ngày hôm nay để cả nhà cùng vào vuốt.*  
> **Quy tắc liên quan:** `BR-020`, `BR-021`, `BR-025`

- **Given** Group chưa có Session Active hoặc Finalized trong ngày, **When** tôi tạo Session, **Then** Session ở trạng thái `Draft` và tôi là Creator kiêm Participant.
- **Given** Group đã có một Session đang Active hôm nay, **When** tôi cố tình Start một phiên Draft khác, **Then** hệ thống từ chối và điều hướng tôi tới phiên đang chạy.
- **Given** một Participant đã rời Group sau khi được gán vào Draft, **When** tôi Start phiên, **Then** hệ thống chặn lại và chỉ rõ thành viên không hợp lệ.

### US-009 — Quản lý Participant trong phiên
>
> *Là **P1**, tôi muốn thêm bớt người tham gia phiên để phản ánh chính xác ai sẽ ăn ở nhà hôm nay.*  
> **Quy tắc liên quan:** `BR-026`, `BR-061`

- **Given** Session đang Active, **When** tôi thêm một Member làm Participant, **Then** họ bắt đầu với deck mới chưa có tương tác nào.
- **Given** tôi xoá một Participant đã từng vuốt thẻ, **When** Session Ranking tính lại, **Then** tương tác của họ bị loại bỏ và họ không bị ghi nhận lịch sử ăn tự động.

### US-010 — Tự động đóng phiên hết hạn
>
> *Là **P1**, tôi muốn các phiên chưa chốt tự động đóng khi hết ngày để không bị treo sang hôm sau.*  
> **Quy tắc liên quan:** `BR-055`

- **Given** Session đang Active nhưng chưa Finalized, **When** qua hết Decision Date theo múi giờ Group, **Then** Session tự chuyển sang trạng thái `Invalid` với lý do `Timeout`.

---

## E5 — Trải nghiệm duyệt món (Deck & Swipe)

### US-011 — Vuốt chọn món (Swipe)
>
> *Là **P2**, tôi muốn lướt qua các thẻ món ăn và chọn Có/Không dễ dàng trong 30 giây.*  
> **Quy tắc liên quan:** `BR-040`, `BR-041`, `BR-042`, `BR-045`

- **Given** tôi mở deck, **When** màn hình hiển thị, **Then** các món xuất hiện đầu tiên là món có điểm đề xuất cá nhân cao nhất.
- **Given** tôi Swipe Right rồi sau đó Swipe Left cùng một món, **When** ghi nhận, **Then** kết quả có hiệu lực cuối cùng là Swipe Left.
- **Given** tôi vừa vuốt nhầm, **When** tôi bấm nút Undo, **Then** tương tác trở về trạng thái chưa chọn (`None`).

### US-012 — Khám phá món lâu chưa ăn (Explore Lane)
>
> *Là **P2**, tôi muốn thi thoảng được gợi ý lại những món lâu rồi chưa ăn để đổi bữa.*  
> **Quy tắc liên quan:** `BR-047`, [Ranking Spec §2.3](what-we-gonna-eat-today_ranking-specification_v0_1.md)

- **Given** deck có đủ số món hợp lệ, **When** tôi duyệt qua 10 thẻ đầu tiên, **Then** có đúng 2 thẻ đến từ nhánh khám phá (Explore Lane).
- **Given** món đến từ Explore Lane, **When** hiển thị thẻ, **Then** có kèm lý do trực quan (vd: *"3 tuần chưa ăn"*).

### US-013 — Đảm bảo tính ổn định của Deck (Deck Stability)
>
> *Là **P2**, tôi muốn danh sách các thẻ chưa xem không bị nhảy lộn xộn khi hệ thống cập nhật.*  
> **Quy tắc liên quan:** `BR-048`

- **Given** tôi đã xem 12 món, **When** tôi Like một món khác khiến điểm số thay đổi, **Then** 12 món đã xem giữ nguyên vị trí, chỉ phần chưa xem được sắp xếp lại.

### US-014 — Đánh dấu hoàn thành lượt chọn (Completed)
>
> *Là **P2**, tôi muốn thông báo mình đã chọn xong để người nấu biết và chốt bữa.*  
> **Quy tắc liên quan:** `BR-026`, `BR-044`

- **Given** tôi đang duyệt món, **When** bấm "Tôi đã chọn xong", **Then** trạng thái chuyển thành `Completed` nhưng tôi vẫn có thể chỉnh sửa lại nếu phiên chưa đóng.

---

## E6 — Tổng hợp và Chốt bữa (Final Meal)

### US-015 — Xem bảng xếp hạng tổng hợp (Session Ranking)
>
> *Là **P1**, tôi muốn thấy bức tranh toàn cảnh cả nhà đồng thuận món nào nhất để chốt thực đơn.*  
> **Quy tắc liên quan:** `BR-049`

- **Given** đã có tương tác từ thành viên, **When** tôi mở màn hình tổng hợp, **Then** mỗi món hiển thị chi tiết số lượt chọn, từ chối, cảnh báo không ăn được và lịch sử ăn gần nhất.
- **Given** có những món chưa ai tương tác, **When** xem danh sách, **Then** chúng nằm ở khu vực riêng và tôi vẫn có quyền đưa vào bữa ăn.

### US-016 — Chốt thực đơn chính thức (Finalize Meal)
>
> *Là **P1**, tôi muốn chọn các món cho hôm nay và chốt bữa.*  
> **Quy tắc liên quan:** `BR-050`, `BR-051`, `BR-052`, `BR-053`

- **Given** thực đơn chưa thỏa mãn một quy tắc bắt buộc (`Required Rule`), **When** tôi bấm Chốt bữa, **Then** hệ thống chặn lại và chỉ rõ quy tắc còn thiếu.
- **Given** các quy tắc bắt buộc đã đủ nhưng chưa đạt quy tắc khuyến nghị (`Preferred Rule`), **When** tôi bấm Chốt bữa, **Then** hệ thống cảnh báo và cho phép tôi xác nhận tiếp tục (Override).

---

## E7 — Lịch sử ăn uống (Eating History)

### US-018 — Tự động ghi nhận lịch sử và điều chỉnh
>
> *Là **P2**, tôi muốn lịch sử ăn uống được ghi nhận chính xác để thuật toán gợi ý không bị sai lệch.*  
> **Quy tắc liên quan:** `BR-056`, `BR-057`

- **Given** bữa ăn được chốt, **When** hệ thống tạo Eating History, **Then** mỗi người tham gia được tự động ghi nhận đã ăn các món trong thực đơn.
- **Given** tôi đã đánh dấu `Cannot Eat` một món trong thực đơn chốt, **When** sinh lịch sử, **Then** món đó tự động bị loại khỏi lịch sử cá nhân của tôi.

---

## E8 — Quy tắc bữa ăn (Meal Rules)

### US-019 — Cấu hình quy tắc bữa ăn của nhóm
>
> *Là **P1**, tôi muốn đặt quy tắc bữa ăn nhà tôi phải có tối thiểu 1 món Canh và 1 món Mặn.*  
> **Quy tắc liên quan:** `BR-010` đến `BR-014`

- **Given** tôi là Group Admin, **When** tôi thêm quy tắc `Required Soup >= 1`, **Then** quy tắc được lưu vào Group Rule.
- **Given** tôi thêm quy tắc trùng cặp `rule_type + system_tag`, **When** lưu, **Then** hệ thống từ chối.

---

# 4. Bảng phân loại tính năng (MoSCoW Matrix)

| Mã | Tên tính năng | Epic | Phân loại | Business Rule | Ghi chú phạm vi |
| :---: | :--- | :---: | :---: | :--- | :--- |
| `F01` | Đăng nhập Google OAuth | — | **Must** | — | Xác thực OIDC qua Auth.js |
| `F02` | Tạo Group & tham gia qua Link mời | E1 | **Must** | `BR-006→008` | Token hash 7 ngày |
| `F03` | Thêm Dish vào Group Dish Pool | E2 | **Must** | `BR-001` | Tạo catalog món cho nhóm |
| `F04` | Gán System Tag theo Group | E2 | **Must** | `BR-003` | 5 Tag cố định |
| `F05` | Tạo & Start Session trong ngày | E4 | **Must** | `BR-020, 025` | Khóa unique 1 phiên/ngày |
| `F06` | Thêm Participant vào phiên | E4 | **Must** | `BR-026` | Quản lý người ăn |
| `F07` | Personal Candidate Deck | E5 | **Must** | `BR-033, 045` | Danh sách thẻ cá nhân |
| `F08` | Thao tác vuốt Swipe Right / Left | E5 | **Must** | `BR-040→042` | Ghi nhận tương tác |
| `F09` | Nút Undo lượt vuốt | E5 | **Must** | `BR-040` | Khôi phục trạng thái thẻ |
| `F10` | Đánh dấu Completed & mở lại | E5 | **Must** | `BR-026, 044` | Báo hoàn thành lượt |
| `F11` | Session Ranking tổng hợp | E6 | **Must** | `BR-049` | Bảng điểm đồng thuận kèm số thô |
| `F12` | Chọn món & Chốt Final Meal | E6 | **Must** | `BR-050` | Tạo thực đơn ngày |
| `F13` | Kiểm tra Required Rule lúc chốt | E6 | **Must** | `BR-052` | Chặn nếu thiếu món bắt buộc |
| `F14` | Sinh Default Eating History | E7 | **Must** | `BR-056` | Tự động ghi nhận lịch sử |
| `F17` | Lịch sử Cooldown 7 ngày | E5 | **Must** | `BR-046` | Trừ điểm món vừa ăn |
| `F20` | Cấu hình Group Required Rule | E8 | **Must** | `BR-013` | Định nghĩa quy chuẩn mâm cơm |
| `F21` | Snapshot Session Rule lúc Start | E8 | **Must** | `BR-015` | Đóng băng quy tắc phiên |
| `F15` | Cannot Eat (Không ăn được) | E3 | **Should** | `BR-034` | Lọc deck & cảnh báo khi chốt |
| `F16` | Preference Like / Dislike | E3 | **Should** | `BR-037` | Tùy chỉnh khẩu vị |
| `F18` | Explore Lane 20% | E5 | **Should** | `BR-047` | Gợi ý món cũ đổi vị |
| `F19` | Ổn định Deck khi tính lại điểm | E5 | **Should** | `BR-048` | Không nhảy thẻ dưới tay |
| `F22` | Preferred Rule & Cảnh báo | E6 | **Should** | `BR-014, 052` | Cảnh báo mềm |
| `F23` | Target Dish Count & Cảnh báo | E6 | **Should** | `BR-011` | Giới hạn số lượng món |
| `F24` | Lưu vết Override cảnh báo | E6 | **Should** | `BR-053` | Audit log chốt bữa |
| `F25` | Gỡ Participant giữa phiên | E4 | **Should** | `BR-026, 061` | Loại trừ người vắng |
| `F26` | Tự động đóng phiên quá hạn | E4 | **Should** | `BR-055` | Timeout cuối ngày |
| `F27` | Gỡ Dish khỏi Pool | E2 | **Should** | `BR-005` | Chuyển Inactive món |
| `F28` | Điều chỉnh Eating History hôm nay | E7 | **Should** | `BR-057` | Sửa lịch sử ăn trong ngày |
| `F29` | Phát hiện trùng tên món (Bỏ dấu) | E2 | **Should** | `BR-001` | Duplicate detection |
| `F30→42` | Implicit Preference, Chef Mode, v.v. | E9–13 | **Could** | — | Lộ trình v1.2 |
| `F43→48` | Multi-group, Admin UI, Auto Merge | — | **Won't** | — | Hoãn sau v1.2 |

> [!NOTE]
> Tổng số tính năng **Must Have** ở v1.0 là **17/48 (35%)**, tuân thủ nguyên tắc kỷ luật phạm vi dưới 40%.

---

# 5. Yêu cầu phi chức năng (NFRs)

| Mã | Yêu cầu kỹ thuật | Ngưỡng cam kết |
| :---: | :--- | :--- |
| `NFR-01` | Thời gian tải màn hình Deck lần đầu trên 4G | $\le 2.5\text{ giây}$ |
| `NFR-02` | Độ trễ phản hồi khi vuốt thẻ (Swipe latency) | $\le 100\text{ms}$ (Optimistic UI, sync nền qua Route Handler) |
| `NFR-03` | Thiết kế Mobile-First & thao tác một tay | Vùng chạm chính $\ge 44\text{px}$ nằm trọn ở nửa dưới màn hình |
| `NFR-04` | Cách ly dữ liệu nhiều người thuê (Tenant Isolation) | Ràng buộc quyền chặt chẽ theo `group_id`, không rò rỉ dữ liệu chéo |
| `NFR-05` | Khả năng chống chịu mất mạng tạm thời | Tự động retry tương tác ngầm, thông báo thanh trạng thái nếu offline |

---

# 6. Phạm vi phát hành theo phiên bản

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ v1.0 — 17 Tính năng Must-Have (Walking Skeleton + Cooldown + Rule Core)  │
│ └─ Tạo nhóm, nhập món, gắn tag, mở phiên, vuốt thẻ, chốt mâm cơm       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ v1.1 — 12 Tính năng Nâng cao (Dữ liệu chuẩn hóa & Khẩu vị cá nhân)       │
│ └─ Cannot Eat, Like/Dislike, Explore lane 20%, Phát hiện trùng tên     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ v1.2 — 13 Tính năng Học hỏi & Thích ứng (Chef Mode & Smart Learning)    │
│ └─ Chef role, Học sở thích ngầm, Whitelist/Blacklist, Sửa mâm cơm      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 7. Chỉ số đo lường thành công (Success Metrics)

| Chỉ số (Metric) | Mục tiêu | Ý nghĩa đo lường |
| :--- | :---: | :--- |
| **Thời gian chốt phiên trung bình** | $< 5\text{ phút}$ | Giảm áp lực thời gian và tranh luận trong gia đình |
| **Tỉ lệ phiên được hoàn tất (Finalized)** | $> 70\%$ | Trải nghiệm thông suốt, người dùng không bỏ ngang |
| **Tỉ lệ món mới / đổi vị trong 14 ngày** | $> 25\%$ | Chứng minh giá trị thuật toán giúp gia đình thoát khỏi vòng lặp món quen |

---

# 8. Ngoài phạm vi (Out of Scope)

- Một tài khoản thuộc nhiều Group cùng lúc trong v1 ([DEC-004](what-we-gonna-eat-today_decision-log_v1.1.md)).
- Giao diện quản trị hệ thống System Admin ([DEC-005](what-we-gonna-eat-today_decision-log_v1.1.md)).
- Tự động gộp món trùng mức Global (Logical Merge / Hard Merge).
- Chỉnh sửa lịch sử ăn của các ngày trong quá khứ (chỉ hỗ trợ ngày hiện tại).
- Hệ thống cảnh báo dị ứng y tế bắt buộc (Cannot Eat chỉ là sở thích ăn kiêng).

---

# 9. Các quyết định kỹ thuật đã chốt

1. **Chuẩn hóa BR-ID:** Toàn bộ PRD, SDD, Code và Test Cases sử dụng thống nhất mã `BR-001` đến `BR-061`.
2. **Bộ 5 System Tag cố định:** Gồm `Staple` (Cơm/Bún/Phở), `Main` (Món mặn/chính), `Side` (Món phụ/rau), `Soup` (Canh), `Dessert` (Tráng miệng).
3. **Mời thành viên qua Link mã hóa:** Sử dụng token ngẫu nhiên băm SHA-256 có hạn 7 ngày, không cần cơ chế tìm kiếm email/username.

---

# 10. Lịch sử thay đổi (Change History)

| Version | Ngày | Phần tác động | Nội dung thay đổi | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- | :--- |
| `0.4` | 2026-08-14 | §4, §6 | Nâng `F17`, `F20`, `F21` lên Must-have; v1.0 chốt 17 tính năng | Thống nhất phạm vi MVP chất lượng cao |
| `0.3` | 2026-08-14 | §6 | Cấu trúc lại lộ trình 3 giai đoạn v1.0, v1.1, v1.2 | Tối ưu hóa thời gian thực thi |
| `0.2` | 2026-08-14 | Toàn bộ | Chuyển đổi toàn bộ tham chiếu sang hệ thống mã `BR-ID` | Tránh đứt gãy tham chiếu |
| `0.1` | 2026-08-14 | Toàn bộ | Khởi tạo tài liệu PRD ban đầu | Baseline dự án |
