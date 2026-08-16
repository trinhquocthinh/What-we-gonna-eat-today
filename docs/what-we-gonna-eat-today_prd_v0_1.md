# PRD — What We Gonna Eat Today

## Version 0.4

**Status:** Draft — Awaiting review
**Created:** 2026-08-14
**Last Updated:** 2026-08-14
**Upstream:** Problem Definition v1.4, Business Rules v1.6, Ranking Specification v0.2, Decision Log v1.2
**Downstream:** SDD v0.2
**Downstream:** SDD, Tech Spec & Architecture, Plan & Scope

---

# 1. Tóm tắt và mục tiêu

What We Gonna Eat Today giúp một Group nhỏ, trước mắt là gia đình, quyết định **tập Dish sẽ ăn trong ngày hiện tại**.

Mục tiêu sản phẩm, kế thừa Problem Definition §3:

> Giảm thời gian và cognitive effort để Group chốt hôm nay ăn gì, bằng cách cá nhân hoá việc khám phá Dish, thu thập tín hiệu của từng người, tổng hợp thành context và để Creator chốt nhanh.

Ba điều v1 phải làm được, đo được:

1. Một người tổ chức được một phiên chọn món và chốt xong trong vài phút.
2. Mỗi thành viên duyệt món trên điện thoại bằng một tay, không cần đọc danh sách dài.
3. Kết quả được ghi lại và ảnh hưởng đến gợi ý những ngày sau.

Ngoài phạm vi câu trả lời: món nào ăn bữa nào, nguyên liệu, dinh dưỡng, đặt món.

---

# 2. Personas

## P1 — Người tổ chức bữa ăn

Người thường xuyên phải trả lời câu hỏi "hôm nay ăn gì" cho cả nhà. Là Creator và Group Admin trong hầu hết trường hợp.

- Biết rõ nhà có những món gì nhưng lúc cần thì chỉ nhớ được vài món quen.
- Muốn biết mọi người thích gì mà không phải đi hỏi từng người.
- Là người chốt cuối cùng và chấp nhận trách nhiệm đó.
- Đau nhất ở chỗ: phải tự nhớ ai không ăn được gì, hôm qua đã ăn gì.

## P2 — Thành viên bận

Người tham gia nhưng không muốn tốn thời gian.

- Sẵn sàng bỏ ra 30 giây, không phải 5 phút.
- Không muốn đọc danh sách 80 món.
- Muốn ý kiến của mình được ghi nhận nhưng không muốn tranh luận.
- Sẽ bỏ giữa chừng nếu thấy màn hình đầu tiên toàn món không liên quan.

Không có persona thứ ba trong v1.

---

# 3. Epic và User Story

Tham chiếu business rule dùng `BR-ID` ổn định của Business Rules v1.6, ví dụ `BR-034`. Số mục không còn được dùng làm tham chiếu.

## E1 — Group và thành viên

### US-001 — Tạo Group và thêm thành viên
*Là P1, tôi muốn tạo một Group và thêm người nhà vào, để cả nhà cùng chọn món trong một không gian chung.*
Rule: BR-006, BR-007, BR-008

- Given tôi đã đăng nhập, When tôi tạo Group mới, Then tôi trở thành Member và Group Admin của Group đó.
- Given tôi là Group Admin, When tôi thêm một User vào Group, Then User đó có role Member.
- Given tôi là Group Admin, When tôi remove một Member đang là Creator của một Active Session, Then hệ thống từ chối và nêu lý do.

## E2 — Danh mục món

### US-002 — Thêm Dish vào Group Dish Pool
*Là P1, tôi muốn thêm các món nhà hay ăn, để hệ thống có gì đó để gợi ý.*
Rule: BR-001, BR-003

- Given tôi là Member, When tôi thêm Dish với tên đã tồn tại ở dạng chuẩn hoá, Then hệ thống hiển thị Dish đang có và cho tôi chọn dùng lại.
- Given tôi xác nhận đây là món khác, When tôi lưu, Then hệ thống tạo Global Dish mới kèm provenance và thêm vào Group Dish Pool.
- Given Dish đã có trong Group Dish Pool, When tôi thêm lại, Then hệ thống báo đã tồn tại và không tạo bản trùng.

### US-003 — Gán System Tag
*Là P1, tôi muốn đánh dấu món là món mặn, canh hay cơm, để hệ thống kiểm tra được bữa ăn có đủ thành phần không.*
Rule: BR-003, BR-008

- Given tôi là Group Admin, When tôi gán System Tag cho một Dish trong Group, Then thay đổi chỉ áp dụng trong Group này.
- Given một Dish có nhiều System Tag, When rule đếm theo Tag, Then Dish được tính cho từng Tag một cách độc lập.

### US-004 — Gỡ Dish khỏi Group Dish Pool
*Là P1, tôi muốn gỡ món nhà không ăn nữa, để nó thôi xuất hiện.*
Rule: BR-005 (invariant: Business Rules §22.3)

- Given Dish đang Active trong Group, When tôi gỡ nó, Then relationship chuyển Inactive và historical record vẫn còn.
- Given Dish bị gỡ trong lúc Session đang Active, When Participant load deck tiếp theo, Then Dish không còn xuất hiện và Interaction cũ không còn tính vào Session Ranking.

## E3 — Điều khiển cá nhân

### US-005 — Đánh dấu không ăn được
*Là P2, tôi muốn đánh dấu món tôi không ăn được, để không phải từ chối nó mỗi ngày.*
Rule: BR-034, BR-043

- Given tôi mark Cannot Eat một Dish, When deck của tôi được tính lại, Then Dish biến mất khỏi phần tôi chưa xem.
- Given tôi đã Swipe Right một Dish rồi mark Cannot Eat, When hệ thống xử lý, Then effective Session Interaction của tôi với Dish đó bị clear.
- Given một Participant Cannot Eat Dish X, When Creator xem deck của mình, Then Dish X vẫn xuất hiện kèm chỉ báo có người không ăn được.

### US-006 — Đặt Like / Dislike
*Là P2, tôi muốn nói món nào tôi thích, để gợi ý sát hơn.*
Rule: BR-037

- Given tôi đặt Like cho một Dish, When deck phần chưa xem được tính lại, Then Dish có xu hướng lên vị trí sớm hơn.
- Given tôi đặt Dislike, When deck được tính lại, Then Dish tụt hạng nhưng vẫn nằm trong deck.

### US-007 — Blacklist và Whitelist
*Là P2, tôi muốn hệ thống thôi gợi ý một món, hoặc thôi phạt một món tôi ăn thường xuyên.*
Rule: BR-035, BR-036

- Given tôi thêm một Dish vào Blacklist, When deck được tính lại, Then Dish bị loại khỏi phần chưa xem nhưng Swipe hiện có vẫn giữ nguyên.
- Given tôi whitelist một Dish vừa ăn hôm qua, When tính điểm, Then recency penalty của Dish đó bằng 0.

## E4 — Phiên chọn món

### US-008 — Tạo và bắt đầu Session
*Là P1, tôi muốn mở một phiên chọn món cho hôm nay, để cả nhà bắt đầu chọn.*
Rule: BR-020, BR-021, BR-025

- Given Group chưa có Session Active hoặc Finalized cho hôm nay, When tôi tạo Session, Then Session ở trạng thái Draft và tôi là Creator kiêm Participant.
- Given Group đã có Session Active hôm nay, When tôi cố Start một Draft khác, Then hệ thống từ chối và chỉ tôi tới Session đang chạy.
- Given một Participant đã rời Group sau khi được thêm vào Draft, When tôi Start Session, Then hệ thống từ chối và nêu Participant không hợp lệ.

### US-009 — Quản lý Participant
*Là P1, tôi muốn thêm hoặc bớt người trong phiên, để phản ánh ai thực sự ăn ở nhà hôm nay.*
Rule: BR-026, BR-061

- Given Session đang Active, When tôi thêm một Group Member làm Participant, Then họ bắt đầu với deck trống chưa có Interaction.
- Given tôi remove một Participant đã Swipe, When Session Ranking được tính lại, Then Interaction của họ không còn được tính và họ không nhận Default Eating History.
- Given tôi remove rồi add lại cùng một người, When họ mở deck, Then họ bắt đầu fresh, Interaction cũ không được khôi phục.

### US-010 — Session hết hạn
*Là P1, tôi muốn phiên tự đóng cuối ngày, để không có phiên treo sang hôm sau.*
Rule: BR-055

- Given Session Active chưa Finalized, When hết Decision Date theo timezone của Group, Then Session chuyển Invalid với reason Timeout.
- Given Session Invalid, When tôi tạo Session mới cùng ngày, Then hệ thống cho phép.
- Given Session Invalid, When hệ thống xử lý dữ liệu, Then không tạo Eating History và không dùng Interaction để học preference.

## E5 — Duyệt món

### US-011 — Swipe
*Là P2, tôi muốn lướt qua các món và nói có hoặc không, để xong lượt của mình trong 30 giây.*
Rule: BR-040, BR-041, BR-042, BR-045

- Given tôi mở deck, When màn hình đầu tiên hiển thị, Then các món ở đầu deck là món tôi có khả năng đề xuất cao nhất theo Ranking Specification.
- Given tôi Swipe Right rồi Swipe Left cùng một Dish, When hệ thống ghi nhận, Then effective Interaction là Swipe Left.
- Given tôi vừa swipe nhầm, When tôi Undo, Then Interaction trở về None.

### US-012 — Khám phá món lâu không ăn
*Là P2, tôi muốn thỉnh thoảng được nhắc những món đã lâu không ăn, để không bị kẹt trong mấy món quen.*
Rule: BR-047, Ranking Specification §2.3

- Given deck của tôi có đủ món hợp lệ, When tôi lướt qua 10 vị trí đầu, Then có đúng 2 vị trí đến từ explore lane.
- Given một Dish đến từ explore lane, When nó hiển thị, Then card kèm lý do như chưa từng ăn hoặc lâu chưa ăn.
- Given tôi đã Dislike một Dish, When explore lane được dựng, Then Dish đó không được chọn.

### US-013 — Deck ổn định
*Là P2, tôi muốn thứ tự món không nhảy dưới tay mình, để không bị mất phương hướng.*
Rule: BR-048

- Given tôi đã xem 12 món, When tôi đặt Like cho một món khác, Then 12 món đã xem giữ nguyên thứ tự và chỉ phần chưa xem được sắp lại.
- Given tôi mark Cannot Eat cho món đang ở vị trí kế tiếp, When tôi swipe tiếp, Then món đó không xuất hiện.

### US-014 — Đánh dấu xong lượt
*Là P2, tôi muốn báo là tôi chọn xong, để Creator biết chờ ai.*
Rule: BR-026, BR-044

- Given tôi đang duyệt, When tôi bấm Completed, Then trạng thái của tôi là Completed nhưng tôi vẫn sửa được Interaction.
- Given tôi đã Completed, When Session chưa Finalized, Then tôi mở lại lượt chọn được.

## E6 — Chốt bữa

### US-015 — Xem Session Ranking
*Là P1, tôi muốn thấy cả nhà đang nghiêng về món nào, để chốt nhanh mà không phải hỏi ai.*
Rule: BR-049

- Given có ít nhất một Interaction, When tôi mở Session Ranking, Then mỗi Dish hiển thị số người đề xuất, số người không muốn, số người Cannot Eat và số người vừa ăn.
- Given tôi remove một Participant, When ranking được tính lại, Then điểm số vẫn so sánh được vì đã chuẩn hoá theo số Participant hiện tại.
- Given có Dish chưa ai tương tác, When tôi mở ranking, Then chúng nằm ở mục riêng và vẫn chọn được.

### US-016 — Chốt Final Meal
*Là P1, tôi muốn chọn ra các món của hôm nay và chốt, để mọi người biết ăn gì.*
Rule: BR-050, BR-051, BR-052, BR-053

- Given tôi đang chọn món, When tôi thêm hoặc bớt Dish, Then hệ thống hiển thị trạng thái rule hiện tại dạng feedback.
- Given Final Meal chưa đủ một Required Rule, When tôi bấm Finalize, Then hệ thống từ chối, nêu rule chưa đạt và Session vẫn Active.
- Given Required Rule đã đủ nhưng Preferred Rule chưa đạt, When tôi bấm Finalize, Then hệ thống cảnh báo và tôi xác nhận được để tiếp tục.
- Given tôi override một warning và finalize, When Final Meal được lưu, Then warning được lưu kèm gồm loại warning, rule liên quan và giá trị thực tế.
- Given Final Meal có Dish mà một Participant Cannot Eat, When tôi finalize, Then hệ thống cảnh báo nhưng cho phép override.

### US-017 — Sửa Final Meal trong ngày
*Là P1, tôi muốn sửa lại món đã chốt nếu kế hoạch thay đổi, để dữ liệu phản ánh đúng thực tế.*
Rule: BR-058, BR-060

- Given Final Meal của hôm nay đã chốt, When tôi sửa danh sách Dish, Then Final Meal mới trở thành authoritative.
- Given một Participant đã tự sửa Eating History của họ, When tôi sửa Final Meal, Then phần họ đã sửa không bị ghi đè.

## E7 — Lịch sử ăn uống

### US-018 — Lịch sử tự động và sửa tay
*Là P2, tôi muốn lịch sử phản ánh đúng những gì tôi ăn, để gợi ý ngày mai không sai.*
Rule: BR-056, BR-057

- Given Final Meal được chốt, When hệ thống sinh Eating History, Then mỗi Participant hiện tại được ghi nhận đã ăn các Dish trong Final Meal.
- Given tôi Cannot Eat một Dish trong Final Meal, When Eating History được sinh, Then Dish đó không được ghi cho tôi.
- Given tôi thực tế không ăn một món, When tôi remove nó khỏi Eating History hôm nay, Then thay đổi được giữ và ảnh hưởng gợi ý sau đó.

## E8 — Rule bữa ăn

### US-019 — Cấu hình Group Rule
*Là P1, tôi muốn quy định bữa ăn nhà tôi phải có gì, để không chốt thiếu món.*
Rule: BR-010, BR-011, BR-012, BR-013, BR-014

- Given tôi là Group Admin, When tôi thêm rule Required Soup >= 1, Then rule được lưu vào Group Rule.
- Given tôi thêm rule trùng `rule_type + System Tag`, When tôi lưu, Then hệ thống từ chối.
- Given một System Tag đã là Required, When tôi thêm nó vào Preferred, Then hệ thống từ chối.

### US-020 — Điều chỉnh rule cho một phiên
*Là P1, tôi muốn nới hoặc siết rule cho riêng hôm nay, để phù hợp hoàn cảnh.*
Rule: BR-015, BR-016, BR-017, BR-018

- Given Session ở Draft, When tôi sửa một rule có `overridable = true`, Then Session Rule dùng giá trị mới thay cho rule kế thừa.
- Given Session đã Active, When tôi cố sửa Session Rule, Then hệ thống từ chối.
- Given Group Rule thay đổi sau khi Session được tạo, When Session finalize, Then rule dùng để validate là Session Rule đã snapshot.

## E9 — Chef

### US-021 — Chef Mode
*Là P1, tôi muốn tính đến việc ai nấu được món gì khi phiên có người nấu cụ thể.*
Rule: BR-027, BR-028, BR-029

- Given Group có ít nhất một Member mang Chef Role, When tôi tạo Session, Then tôi bật được Chef Mode và chọn Chef.
- Given Chef Mode bật, When deck của tôi được tính, Then Dish mà Chef nấu được có tín hiệu cộng điểm.
- Given một User đang là Chef của Active Session, When Group Admin gỡ Chef Role của họ, Then hệ thống từ chối.
- Given không có Cooking Capability record cho một cặp User và Dish, When tính điểm, Then trạng thái là Unknown và điểm đóng góp bằng 0.

---

# 4. Bảng tính năng

MoSCoW ở mức tính năng. Must have = walking skeleton, đủ để một gia đình dùng thật một lần từ đầu đến cuối.

| # | Tính năng | Epic | MoSCoW | Business Rule | Ghi chú |
|---|---|---|---|---|---|
| F01 | Đăng nhập | — | Must | — | Một nhà cung cấp OAuth |
| F02 | Tạo Group, thêm Member | E1 | Must | BR-006, BR-007, BR-008 | |
| F03 | Thêm Dish vào Group Dish Pool | E2 | Must | BR-001 | |
| F04 | Gán System Tag trong Group | E2 | Must | BR-003 | Tập tag cố định sẵn |
| F05 | Tạo Session cho hôm nay | E4 | Must | BR-020, BR-025 | |
| F06 | Thêm Participant | E4 | Must | BR-026 | |
| F07 | Personal Candidate deck | E5 | Must | BR-033, BR-045 | |
| F08 | Swipe Right / Left | E5 | Must | BR-040, BR-041, BR-042 | |
| F09 | Undo về None | E5 | Must | BR-040 | |
| F10 | Đánh dấu Completed và mở lại | E5 | Must | BR-026, BR-044 | |
| F11 | Session Ranking cho Creator | E6 | Must | BR-049 | Kèm số đếm thô |
| F12 | Chọn và chốt Final Meal | E6 | Must | BR-050 | |
| F13 | Required Rule validation lúc finalize | E6 | Must | BR-052 | |
| F14 | Default Eating History | E7 | Must | BR-056 | |
| F15 | Cannot Eat | E3 | Should | BR-034 | Ảnh hưởng deck và cảnh báo finalize |
| F16 | Explicit Preference Like/Dislike | E3 | Should | BR-037 | |
| F17 | History cooldown 7 ngày | E5 | Must | BR-046 | Cần F14. Tín hiệu ranking duy nhất ở v1.0 |
| F18 | Explore lane 20% | E5 | Should | BR-047 | Trực tiếp phục vụ mục tiêu khám phá |
| F19 | Deck stability khi tính lại | E5 | Should | BR-048 | |
| F20 | Group Rule: Required tag rules | E8 | Must | BR-013 | Không có nó thì F13 chỉ là khung rỗng |
| F21 | Session Rule snapshot | E8 | Must | BR-015 | Phụ thuộc bắt buộc của F20 theo BR-015 |
| F22 | Preferred Rule + warning | E6 | Should | BR-014, BR-052 | |
| F23 | Target Dish Count + warning | E6 | Should | BR-011 | |
| F24 | Warning audit khi override | E6 | Should | BR-053 | Ghi dữ liệu, chưa cần UI xem |
| F25 | Remove Participant giữa Session | E4 | Should | BR-026, BR-061 | Giữ theo yêu cầu, D-06 không hoãn |
| F26 | Session timeout cuối ngày | E4 | Should | BR-055 | |
| F27 | Gỡ Dish khỏi Group Dish Pool | E2 | Should | BR-005 | |
| F28 | Personal Eating History Correction (hôm nay) | E7 | Should | BR-057 | Giới hạn ngày hiện tại, D-08 |
| F29 | Duplicate detection khi tạo Dish | E2 | Should | BR-001 | So khớp chuỗi chuẩn hoá, D-10 |
| F30 | Implicit Preference | E5 | Could | BR-038 | Cần dữ liệu tích luỹ mới có tác dụng |
| F31 | Blacklist | E3 | Could | BR-035 | |
| F32 | Whitelist | E3 | Could | BR-036 | Chỉ có ý nghĩa sau F17 |
| F33 | Chef Role + Chef Mode | E9 | Could | BR-027, BR-028 | |
| F34 | Cooking Capability | E9 | Could | BR-029 | Cần F33 |
| F35 | Session Rule override + Session-only rule | E8 | Could | BR-017, BR-018 | |
| F36 | Purchase Source | E5 | Could | BR-030 | |
| F37 | Descriptive Tag | E2 | Could | BR-004 | |
| F38 | Live composition feedback | E6 | Could | BR-051 | |
| F39 | Reset Implicit Preference | E3 | Could | BR-038 | Cần F30 |
| F40 | Final Meal Correction trong ngày | E6 | Could | BR-058 | |
| F41 | Cancel Session thủ công | E4 | Could | BR-055 | |
| F42 | Group Admin gán/gỡ Chef Role | E1 | Could | BR-008 | Cần F33 |
| F43 | Multi-group cho một User | — | Won't | BR-056 | D-04, hoãn v1.1 |
| F44 | System Admin UI | — | Won't | BR-009, BR-059 | D-05, thao tác trực tiếp DB |
| F45 | Logical Merge / canonical identity | — | Won't | BR-002 | Post-MVP |
| F46 | Restore group metadata khi add lại Dish | — | Won't | BR-005 | D-07 |
| F47 | Custom deadline | — | Won't | BR-055 | D-09 |
| F48 | Sửa Eating History ngày cũ | — | Won't | BR-057 | D-08 |

Must have: 17 / 48 = **35%**. Vẫn đạt kỷ luật dưới 40%, nhưng đây là trần thực tế — không thêm Must nào nữa mà không bỏ ra một cái khác.

Hai điểm cần chú ý:

- **F15 `Cannot Eat` là Should chứ không phải Must.** Đây là quyết định về thứ tự build, không phải mức độ quan trọng. Hệ quả cần biết: ở v1.0, Eating History ghi cả những món Participant không ăn được, và dữ liệu đó nuôi cooldown ở F17. Xem SDD §8.
- **F21 được nâng lên Must như phụ thuộc của F20.** BR-015 quy định Session Rule là snapshot của Group Rule; có F20 mà không có F21 sẽ khiến kết quả validate đổi giữa chừng khi Admin sửa rule trong lúc Session đang chạy.

---

# 5. Yêu cầu phi chức năng

Chỉ giữ những gì đo được và có thể fail build.

| ID | Yêu cầu | Ngưỡng |
|---|---|---|
| NFR-01 | Thời gian tải màn hình deck lần đầu trên 4G | ≤ 2.5s |
| NFR-02 | Phản hồi swipe trên UI | ≤ 100ms, cập nhật lạc quan, đồng bộ nền |
| NFR-03 | Mobile-first, thao tác được bằng một tay | Vùng chạm chính nằm trong nửa dưới màn hình |
| NFR-04 | Cách ly dữ liệu | Chỉ Member của Group đọc được dữ liệu Group; Eating History cá nhân chỉ chính User đọc được |
| NFR-05 | Không mất Interaction khi mất mạng tạm thời | Interaction được retry; nếu thất bại thì báo rõ, không im lặng |

Các mục thường thấy nhưng cố ý loại bỏ: uptime SLA, throughput, i18n, dark mode, accessibility audit đầy đủ, hỗ trợ trình duyệt cũ. Ở dưới 10 user chúng không dẫn tới quyết định nào.

---

# 6. Phạm vi phát hành

## v1.0 — 17 tính năng

F01–F14, cộng F17, F20, F21. Định nghĩa xong: một gia đình tạo Group, nhập khoảng 30 món, đặt quy định bữa ăn, mở phiên, mỗi người swipe trên điện thoại với thứ tự đã tránh món vừa ăn, Creator chốt bữa và hệ thống chặn nếu thiếu món bắt buộc.

Khác với bản 14 tính năng ban đầu, v1.0 giờ có một tín hiệu ranking thật và một rule engine chạy thật. Xem SDD §1.3 về những hành vi còn suy giảm.

## v1.1

Thêm F15, F16, F18, F19, F22–F29. Đây là lúc sản phẩm thực sự khác một danh sách ngẫu nhiên: có constraint, có preference, có cooldown, có khám phá, có rule.

## v1.2

Thêm F30–F42.

## Để sau

F43 multi-group, F44–F48 và toàn bộ Out of Scope của Problem Definition §11.

---

# 7. Số liệu theo dõi

Tối đa ba, mỗi cái gắn với một mục tiêu trong §1.

| Metric | Mục tiêu | Đo mục tiêu nào |
|---|---|---|
| Thời gian trung bình từ Start Session tới Finalize | < 5 phút | Giảm thời gian quyết định |
| Tỉ lệ Session được Finalized trên tổng Session tạo | > 70% | Sản phẩm thực sự dùng được, không bỏ giữa chừng |
| Tỉ lệ Dish trong Final Meal chưa xuất hiện trong Final Meal 14 ngày trước | > 25% | Có thực sự giúp thoát khỏi vòng lặp món quen |

Metric thứ ba là metric quan trọng nhất và cũng dễ bị bỏ qua nhất. Nếu nó thấp, sản phẩm chỉ đang tự động hoá một thói quen cũ chứ không giải quyết vấn đề nêu ở Problem Definition §2.

---

# 8. Out of Scope

Kế thừa toàn bộ Problem Definition §11, bổ sung:

- Một User thuộc nhiều Group đồng thời trong v1 (D-04).
- Giao diện System Admin (D-05).
- Khôi phục group metadata khi add lại Dish (D-07).
- Sửa Eating History của ngày trong quá khứ (D-08).
- Custom deadline cho Session (D-09).
- Fuzzy matching khi phát hiện Dish trùng (D-10).
- Thông báo đẩy và nhắc nhở.
- Chế độ offline đầy đủ.
- Xuất dữ liệu.

---

# 9. Quyết định đã chốt ở v0.2

1. **BR-ID.** Business Rules v1.6 cấp `BR-001` đến `BR-061` cho từng rule section. PRD, SDD và test case tham chiếu bằng BR-ID, không bằng số mục.
2. **Tập System Tag v1 cố định** ở năm giá trị: `Staple`, `Main`, `Side`, `Soup`, `Dessert`. Group không tạo System Tag mới. Ghi vào BR-003.
3. **Thêm Member bằng link mời dùng một lần.** Không có chức năng tìm kiếm User trong v1. Ảnh hưởng US-001 và F02.

---

# 10. Change History

| Version | Date | Section | Change | Reason / Decision |
|---|---|---|---|---|
| 0.4 | 2026-08-14 | §4, §6 | Nâng F17, F20 và phụ thuộc F21 lên Must have; v1.0 gồm 17 tính năng | Quyết định của người dùng |
| 0.3 | 2026-08-14 | §6 | Đổi phạm vi phát hành: v1.0 chỉ gồm 14 tính năng Must have, dồn phần còn lại xuống v1.1 và v1.2 | Quyết định của người dùng |
| 0.2 | 2026-08-14 | Toàn bộ | Chuyển tham chiếu business rule sang BR-ID | PRD v0.1 §9.1 |
| 0.2 | 2026-08-14 | §9 | Chốt System Tag set và cơ chế mời Member | PRD v0.1 §9.2, §9.3 |
| 0.1 | 2026-08-14 | Toàn bộ | Bản draft đầu tiên | Phase 6.1 |
