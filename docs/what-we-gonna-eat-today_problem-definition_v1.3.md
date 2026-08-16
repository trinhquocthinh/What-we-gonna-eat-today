# Problem Definition — What We Gonna Eat Today

## Version 1.4

**Status:** Draft — Clarification in progress  
**Last Updated:** 2026-08-14  
**Supersedes:** Version 1.3

---

# 1. Problem Definition

What We Gonna Eat Today là hệ thống hỗ trợ các Group nhỏ, trước mắt là gia đình, quyết định **tập hợp các Dish sẽ ăn trong ngày hiện tại**.

Trong mỗi Selection Session, hệ thống cá nhân hóa việc khám phá Dish cho từng Participant, thu thập các Interaction liên quan đến Dish và tổng hợp chúng thành Session Ranking để hỗ trợ Creator đưa ra Final Meal.

Trong phạm vi hiện tại:

- **Dish** là đơn vị recommendation và decision cốt lõi.
- Quyết định được thực hiện trong context của một Group và một Decision Date.
- Selection Session có lifecycle ở mức cao: `Draft → Active → Finalized / Invalid`.
- Creator là Decision Maker cuối cùng.
- Hệ thống đóng vai trò **Personalized Dish Recommendation + Group Decision Support**.
- Hệ thống không tự động quyết định thay Creator.
- Hệ thống không phân chia Dish theo từng bữa và không thực hiện meal planning cho ngày tương lai.

---

# 2. Problem Statement

Việc quyết định **“Hôm nay chúng ta ăn gì?”** là một quyết định lặp lại nhưng thường tiêu tốn nhiều thời gian và cognitive effort.

Nguyên nhân chính gồm:

- Mỗi User thường chỉ nhớ đến một tập nhỏ các món quen thuộc, dù Group thực tế có nhiều lựa chọn hơn.
- Các thành viên có sở thích, hạn chế ăn uống và lịch sử ăn uống khác nhau.
- Một Dish phù hợp với User này có thể không phù hợp với User khác.
- Các thành viên có thể không muốn dành nhiều thời gian để cùng thảo luận hoặc duyệt một danh sách lựa chọn dài.
- Ý kiến của các thành viên thường phân tán và không được tổng hợp theo một cách có cấu trúc.
- Người ra quyết định cuối cùng phải tự nhớ, đối chiếu và tổng hợp preference, constraint và lựa chọn của nhiều người.

Kết quả là Group có xu hướng:

- Mất nhiều thời gian cho một quyết định có tần suất lặp lại cao.
- Quay lại các Dish quen thuộc do dễ nhớ hơn.
- Bỏ sót các Dish phù hợp nhưng không được nhớ đến tại thời điểm quyết định.
- Phụ thuộc nhiều vào một người để tổng hợp context và chốt lựa chọn.

Vấn đề cốt lõi không phải là thiếu Dish để lựa chọn, mà là:

> **Khó thu hẹp một không gian lựa chọn lớn thành một tập Dish phù hợp với từng cá nhân, đồng thời tổng hợp các tín hiệu khác nhau của Group thành đủ context để một người có thể nhanh chóng đưa ra quyết định cuối cùng.**

---

# 3. Product Objective

Mục tiêu của hệ thống là:

> **Giảm thời gian và cognitive effort cần thiết để một Group quyết định hôm nay sẽ ăn những món gì, bằng cách cá nhân hóa việc khám phá Dish cho từng thành viên, thu thập tín hiệu lựa chọn của họ, tổng hợp context của toàn Group và cung cấp đủ thông tin để Creator nhanh chóng chốt Final Meal.**

Hệ thống không cố gắng tự động tìm ra một “bữa ăn tối ưu” tuyệt đối.

Hệ thống tập trung vào:

1. Giảm không gian lựa chọn.
2. Giúp người dùng nhớ và khám phá nhiều Dish hơn.
3. Đưa các Dish có khả năng phù hợp lên trước.
4. Thu thập đề xuất và từ chối từ từng User.
5. Làm rõ constraint và conflict trong Group.
6. Hỗ trợ Decision Maker đưa ra quyết định cuối cùng.

Triết lý cốt lõi:

> **Personalized Dish Recommendation + Group Decision Support**

---

# 4. Primary Users and Context

Use case chính hiện tại là:

> **Một Group nhỏ, trước mắt là gia đình, cùng quyết định các món sẽ ăn trong ngày hiện tại.**

Một User có thể thuộc nhiều Group khác nhau.

Mỗi Group là một decision context độc lập.

Trong mỗi Selection Session:

- Một Group cùng tham gia quyết định.
- Một Creator tổ chức Session và là Decision Maker cuối cùng.
- Các Participant cung cấp tín hiệu lựa chọn và có thể đánh dấu đã hoàn tất lượt lựa chọn.
- Chef là một persistent Group Role và có thể được dùng làm context bổ sung nếu bật Chef Mode.
- Một User có thể đồng thời là Group Member, Chef và Group Admin.
- Cooking Capability thuộc về User, không thuộc riêng một Group.

---

# 5. Core Decision Scope

Phiên bản hiện tại chỉ hỗ trợ quyết định:

> **Các Dish sẽ được ăn trong ngày hiện tại.**

Hệ thống không xác định:

- Dish nào ăn vào bữa sáng.
- Dish nào ăn vào bữa trưa.
- Dish nào ăn vào bữa tối.

Ví dụ Final Meal:

- Cơm.
- Cá basa kho tiêu.
- Canh chua.

Hệ thống chỉ ghi nhận đây là các Dish được quyết định cho ngày đó.

Việc phân chia Dish vào từng bữa cụ thể không thuộc phạm vi hiện tại.

---

# 6. Core Domain Concept

## Dish

**Dish là entity trung tâm của hệ thống.**

Dish đại diện cho một món ăn ở mức biến thể cụ thể.

Ví dụ:

- Cá basa kho tiêu.
- Canh chua cá lóc.
- Gà chiên nước mắm.

Các biến thể đủ khác nhau được xem là các Dish riêng.

Thông tin về quán hoặc nguồn mua không tạo ra một Dish mới mà là metadata liên quan đến Dish.

Global Dish được quản lý bằng một identity dùng chung. Duplicate detection được thực hiện khi tạo Dish mới. Logical Merge theo canonical identity là hướng thiết kế hậu MVP và không thuộc phạm vi triển khai MVP hiện tại.

---

# 7. Inputs

Hệ thống sử dụng các nhóm input sau để hỗ trợ quá trình ra quyết định.

## 7.1 Group Context

- Group Members.
- Group Roles, bao gồm Chef và Group Admin.
- Group Dish Pool.
- Group Rules.
- Group-specific Dish metadata.
- Group timezone.
- Purchase Sources phù hợp với Group.

## 7.2 Session Context

- Session lifecycle state.
- Creator.
- Participant list và participation status.
- Decision Date.
- Session Rule.
- Chef Mode.
- Chef list nếu Chef Mode được bật.
- Session deadline.

## 7.3 User Context

- User Constraint, bao gồm Cannot Eat.
- User Blacklist.
- Explicit Preference.
- Implicit Preference.
- Eating History.
- History Whitelist.
- Cooking Capability nếu User có Chef Role.

## 7.4 Dish Context

- Dish identity.
- System Tag.
- Descriptive Tag.
- Purchase Source.
- Group-specific metadata.
- Dish creation provenance, bao gồm User tạo và Group nguồn.

## 7.5 User Interaction

Trong Session, User cung cấp các tín hiệu như:

- Swipe Right / đề xuất Dish.
- Swipe Left / Don't Want Today.
- Undo về trạng thái chưa chọn.

Ngoài Session Interaction, User có thể thực hiện persistent action trên Dish như:

- Mark Cannot Eat.
- Add / Remove Blacklist.
- Add Whitelist.
- Set Explicit Preference.

Session Interaction và Persistent Dish Action là hai loại state khác nhau.

---

# 8. Outputs

Hệ thống tạo ra các output chính sau.

## 8.1 Personalized Candidate List

Danh sách Dish được cá nhân hóa cho từng User trong Session.

Hai User trong cùng Session không bắt buộc phải nhìn thấy cùng một tập Dish hoặc cùng một thứ tự.

Mục tiêu:

> Đưa những Dish có khả năng User muốn đề xuất lên trước để User có thể kết thúc lượt lựa chọn sớm.

## 8.2 Session Ranking

Danh sách Dish được tổng hợp ở cấp Session để hỗ trợ Creator ra quyết định.

Session Ranking có thể hiển thị:

- Số người đề xuất.
- Số người không muốn ăn.
- Số người Cannot Eat.
- Số người đã ăn gần đây.
- Conflict với Session Rule.

Session Ranking được tính thuần tuý trên evidence của Session. Conflict với Session Rule và Chef context là thông tin hiển thị, không tham gia vào điểm số.

## 8.3 Final Meal

Final Meal là:

> **Tập Dish được quyết định sẽ ăn trong ngày hiện tại.**

Creator là Decision Maker cuối cùng.

Final Meal phải đáp ứng các Required Session Rule trước khi finalize.

## 8.4 Eating History

Final Meal là nguồn mặc định để tạo Eating History cho các Participant hiện tại, có áp dụng các rule liên quan đến Cannot Eat và Personal Correction.

Một User có thể có nhiều Eating History source record cho cùng một Dish và cùng một ngày nếu tham gia các Final Meal khác nhau từ nhiều Group.

Personal Correction của User có authority cao hơn Default Eating History được sinh từ Final Meal đối với phần dữ liệu User đã sửa.

Eating History sau đó trở thành một input cho Future Recommendation.

---

# 9. High-Level Product Flow

```text
Group Dish Pool
        ↓
Session Draft
        ↓ Start
Active Session
        ↓
Personalized Dish Recommendation
        ↓
User Interaction
        ↓
Session Dish Ranking
        ↓
Creator chọn Dish
        ↓
Final Meal Validation
        ↓
Final Meal
        ↓
Default Eating History
        ↓
Personal Correction
        ↓
Effective Eating History
```

Core Recommendation Unit của hệ thống là:

> **Dish**

Hệ thống không tự động tạo Meal Recommendation trong phạm vi hiện tại.

---

# 10. Current Scope

Phiên bản hiện tại tập trung vào:

- Quy mô gia đình hoặc Group nhỏ.
- Quyết định Dish cho ngày hiện tại.
- Selection Session lifecycle gồm Draft, Active, Finalized và Invalid.
- Tối đa một Active hoặc Finalized Selection Session cho mỗi Group và Decision Date.
- Dish-centric recommendation.
- Global Dish Pool.
- Independent Group Dish Pool.
- Duplicate detection khi tạo Global Dish.
- Personalized Dish Recommendation.
- Swipe-based Session Interaction và Undo.
- Participant completion status.
- Persistent Dish Actions.
- Explicit và Implicit Preference.
- Cannot Eat.
- Blacklist.
- History Whitelist.
- Eating History với multiple source records.
- Personal Eating History Correction.
- Persistent Chef Role ở cấp Group.
- User-level Cooking Capability.
- Optional Chef Mode.
- Purchase Source.
- Group Rule và Session Rule.
- Personal Ranking với history cooldown và exploration.
- Session Ranking evidence-only.
- Creator-based Final Decision.
- Warning và Required Rule validation.
- Current-date Final Meal correction bởi Creator.
- Exceptional historical correction bởi System Admin để xử lý human error hoặc data issue.

---

# 11. Out of Scope

Phiên bản hiện tại không giải quyết:

- Surprise Me.
- Automatic Dish Selection.
- Automatic Meal Candidate Generation.
- Logical Merge execution / canonical Dish resolution trong MVP.
- Historical reference migration khi merge Dish.
- Meal planning cho ngày tương lai.
- Dish nào được ăn vào bữa nào.
- Inventory nguyên liệu.
- Tồn kho trong nhà.
- Thời gian thực tế User có để nấu.
- Tự động xác minh User thực tế đã ăn gì.
- Nutrition optimization.
- Allergy safety management.
- Detailed cooking workflow.
- Recipe management.
- Delivery ordering.
- Real-time restaurant availability.
- Tự động hiểu Dish compatibility phức tạp.
- Tự động quyết định thay Creator.
- Tag-level hoặc ingredient-level history cooldown.
- Machine learning, embedding hoặc online learning trong ranking.
- Cross-group collaborative filtering giữa các User không cùng Group.

Các capability này có thể được cân nhắc ở phase sau nếu cần.

---

# 12. Change History

| Version | Date | Section | Change | Reason / Decision |
|---|---|---|---|---|
| 1.4 | 2026-08-14 | Session Ranking | Clarified Session Ranking as evidence-only; rule conflict and Chef context are display-only | DEC-011, DEC-012 |
| 1.4 | 2026-08-14 | Current Scope | Added history cooldown and exploration to Personal Ranking scope | DEC-012 |
| 1.4 | 2026-08-14 | Out of Scope | Added tag-level cooldown, ML-based ranking and cross-group collaborative filtering | DEC-012 |
| 1.3 | 2026-07-23 | Document metadata | Corrected document version and added status metadata | Align document with current revision trail |
| 1.3 | 2026-07-23 | Problem Definition / Session Context | Added high-level Session lifecycle `Draft → Active → Finalized / Invalid` | DEC-001 |
| 1.3 | 2026-07-23 | Primary Users / Inputs | Added persistent Group Chef Role and User-level Cooking Capability | DEC-004 |
| 1.3 | 2026-07-23 | User Interaction | Clarified Session Interaction vs Persistent Dish Action | DEC-005 |
| 1.3 | 2026-07-23 | Dish | Defined Logical Merge as post-MVP direction; MVP keeps duplicate detection only | DEC-008 |
| 1.3 | 2026-07-23 | Eating History | Added multiple source records and Personal Correction authority | DEC-006, DEC-007 |
| 1.3 | 2026-07-23 | Current Scope / Out of Scope | Updated scope to reflect lifecycle, role, correction and merge decisions | Consolidated clarification decisions |
