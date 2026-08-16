# Business Rules — What We Gonna Eat Today

## Version 1.6

**Status:** Draft — Clarification in progress  
**Last Updated:** 2026-08-14  
**Supersedes:** Version 1.5

Mỗi rule section có một `BR-ID` ổn định. **BR-ID là tham chiếu chính thức** dùng trong PRD, SDD và test case. Số mục có thể thay đổi khi tài liệu được sắp xếp lại; BR-ID thì không. BR-ID đã cấp không bao giờ được tái sử dụng cho nội dung khác.

---

# 1. Dish and Tag Rules

## 1.1 Global Dish Pool — BR-001

Hệ thống có một Global Dish Pool đóng vai trò catalog Dish dùng chung và quản lý Global Dish Identity.

Khi User thêm một Dish mới:

1. Hệ thống tìm các Dish có khả năng trùng hoặc tương tự.
2. User có thể chọn Dish đã tồn tại.
3. Nếu thực sự là Dish mới, User có thể xác nhận tạo Global Dish mới.
4. Dish mới đồng thời được thêm vào Group Dish Pool hiện tại.

Mọi Global Dish mới phải lưu provenance tối thiểu:

- User đã tạo Dish.
- Group mà từ đó Dish được tạo.
- Thời điểm tạo.

User vẫn có thể tạo Dish mới khi hệ thống gợi ý duplicate nếu xác nhận đó thực sự là món khác.

## 1.2 Duplicate Dish và Logical Merge — BR-002

### MVP

Trong MVP:

- Hệ thống hỗ trợ duplicate detection khi User tạo Global Dish mới.
- User có thể chọn Existing Dish hoặc xác nhận tạo Dish mới.
- Full Dish Merge không được triển khai.
- Historical reference không bị rewrite.
- Active Session không bị thay đổi do một quy trình merge.
- System Admin có thể quản lý trạng thái Global Dish để ngăn một Dish không còn phù hợp được sử dụng mới.

### Post-MVP Direction

Khi capability merge được triển khai sau MVP, hệ thống sử dụng **Logical Merge / Canonical Identity** thay vì hard rewrite toàn bộ historical reference.

Nguyên tắc định hướng:

- Một Dish có thể resolve về một canonical Dish identity.
- Historical record giữ nguyên original `dish_id`.
- Hệ thống resolve canonical identity khi cần aggregate hoặc xử lý logic liên quan.
- Nếu cùng một User có nhiều Interaction được resolve về cùng một canonical Dish trong cùng Session, effective Interaction có timestamp mới nhất được ưu tiên.
- Chỉ System Admin có quyền thực hiện Global Dish merge.

Chi tiết triển khai Logical Merge không thuộc MVP.

## 1.3 System Tag — BR-003

System Tag được sử dụng trong:

- Recommendation.
- Ranking.
- Group Rule.
- Session Rule.
- Final Meal validation.

Ví dụ:

- Main.
- Side.
- Soup.
- Staple.
- Dessert.

Trong v1, tập System Tag được cố định ở năm giá trị trên. Group không tạo được System Tag mới. Mở rộng tập System Tag nằm ngoài phạm vi v1.

Một Dish có thể có nhiều System Tag.

Global Dish có thể cung cấp System Tag mặc định.

Group kế thừa giá trị mặc định nhưng có thể chỉnh System Tag riêng mà không ảnh hưởng Group khác.

## 1.4 Descriptive Tag — BR-004

Descriptive Tag phục vụ:

- Phân loại.
- Tìm kiếm.
- Cá nhân hóa.
- Recommendation.

Trong phạm vi hiện tại, Descriptive Tag chủ yếu được quản lý trong context của từng Group.

---

# 2. Group Dish Pool Rules — BR-005

Group Dish Pool là tập con của Global Dish Pool.

Candidate Discovery luôn sử dụng Group Dish Pool hiện tại.

Một Group Dish có lifecycle logic tối thiểu:

```text
Active ↔ Inactive
```

Khi Dish bị remove khỏi Group Dish Pool:

- Relationship Group Dish được chuyển sang trạng thái inactive thay vì làm mất historical reference.
- Dish vẫn tồn tại trong Global Dish Pool.
- Historical records vẫn được giữ.
- Dish không còn được sử dụng làm candidate cho Group đó.
- Dish không thể được chọn vào Final Meal mới của Group.

Nếu Dish bị remove khỏi Group Dish Pool trong khi Session đang Active:

- Dish không còn được cung cấp làm Personal Candidate.
- Historical Interaction đã phát sinh vẫn được giữ phục vụ audit.
- Interaction của Dish đó không còn được tính vào Active Session Ranking.
- Dish không thể được chọn vào Final Meal.

Nếu Dish được add lại vào Group Dish Pool:

- Group-specific metadata trước đó có thể được restore.
- Interaction đã bị mất hiệu lực do Dish bị remove trong một Active Session không tự động được restore vào Active Session Ranking.
- User phải tương tác lại nếu muốn tạo effective Interaction mới trong Session đó.

---

# 3. Group Role and Permission Rules

## 3.1 Group Membership Model — BR-006

`Group Member` là membership cơ bản.

Một Group Member có thể đồng thời có thêm một hoặc nhiều role/capability:

- Chef.
- Group Admin.

Ví dụ hợp lệ:

- Member.
- Member + Chef.
- Member + Group Admin.
- Member + Chef + Group Admin.

## 3.2 Group Member có thể — BR-007

- Thêm Dish vào Group Dish Pool.
- Thêm Dish mới vào Global Dish Pool thông qua Group.
- Thêm hoặc liên kết Purchase Source trong Group context.
- Thêm hoặc chỉnh Descriptive Tag trong Group.

## 3.3 Group Admin có thể — BR-008

- Thực hiện các quyền của Member.
- Chỉnh System Tag trong Group.
- Xóa / deactivate Dish khỏi Group Dish Pool.
- Gán Chef Role cho Group Member.
- Gỡ Chef Role nếu User đó không đang là Chef của một Active Session.

Group Admin không có quyền chỉnh Cooking Capability thay User Chef.

## 3.4 System Admin — BR-009

System Admin là role cấp hệ thống, tách biệt với Group Admin.

Trong phạm vi các rule hiện tại, System Admin có thể thực hiện các tác vụ exceptional hoặc global như:

- Chỉnh Global Dish Identity.
- Quản lý Global Dish duplicate.
- Thực hiện Logical Merge khi capability này được triển khai.
- Thực hiện historical Final Meal correction để xử lý human error hoặc data issue.

Chi tiết permission model đầy đủ của System Admin không thuộc MVP business scope hiện tại.

---

# 4. Group Rule — BR-010

Group Rule cung cấp cấu hình mặc định cho Selection Session.

Trong MVP, mỗi Group có **một bộ Group Rule**. Thiết kế data model không nên khóa khả năng mở rộng thành nhiều rule set / preset trong tương lai.

Group Rule hiện gồm:

- `Target Dish Count`.
- Required System Tag rules.
- Preferred System Tag rules.

Chỉ Group Admin được chỉnh Group Rule.

## 4.1 Target Dish Count — BR-011

`Target Dish Count` là một integer biểu thị số lượng Dish mong muốn trong Final Meal.

Trong MVP:

- Đây là preferred target, không phải hard constraint.
- Final Meal có số Dish khác target vẫn có thể được finalize.
- Hệ thống chỉ warning tại thời điểm finalize.
- Target Dish Count không ảnh hưởng Personal Ranking hoặc Session Ranking.

## 4.2 Tag Rule Structure — BR-012

Required và Preferred Tag Rule sử dụng cùng một structure:

```text
System Tag
+ minimum_count
+ rule_type = Required | Preferred
+ overridable
```

Rule phải có:

> `minimum_count >= 1`

Không cho phép nhiều rule có cùng `rule_type + System Tag`.

Một System Tag cũng không được đồng thời tồn tại dưới cả Required và Preferred trong cùng một effective rule set.

Nếu một Dish có nhiều System Tag, Dish đó được count độc lập cho từng Tag.

Ví dụ:

```text
Dish A = [Main, Soup]

Required:
Main >= 1
Soup >= 1
```

Dish A một mình đã thỏa cả hai rule. Đây là **independent tag counting**, không phải slot allocation.

## 4.3 Required Rule — BR-013

Required Rule là hard Meal Composition requirement.

Final Meal bắt buộc phải đáp ứng mọi Required Rule trước khi được finalize.

Required Rule được evaluate trên toàn bộ Final Meal, không phải từng Dish riêng lẻ.

Trong MVP, Required Rule không trực tiếp filter Personal Candidate và không boost Session Ranking.

## 4.4 Preferred Rule — BR-014

Preferred Rule là soft Meal Composition preference.

Trong MVP:

- Preferred Rule không block finalize.
- Preferred Rule không ảnh hưởng Personal Ranking hoặc Session Ranking.
- Preferred Rule chỉ tạo warning tại thời điểm finalize nếu không được đáp ứng.

---

# 5. Session Rule — BR-015

Session Rule là effective rule set áp dụng cho một Selection Session cụ thể.

Khi Session được tạo:

> Group Rule được snapshot thành Session Rule.

Session Rule không dynamic-reference Group Rule sau thời điểm tạo. Thay đổi Group Rule sau đó không làm thay đổi Session Rule đã tạo.

Session Rule không cần version number riêng trong MVP. Hệ thống chỉ cần lưu effective rule state cuối cùng trước khi Session bắt đầu.

## 5.1 Draft Editing — BR-016

Chỉ Creator được chỉnh Session Rule và chỉ khi Session còn `Draft`.

Khi Session chuyển sang `Active`:

> Session Rule bị khóa.

Nếu cần thay đổi rule sau khi Active, Session hiện tại phải được invalidate và tạo decision flow mới theo các uniqueness rule hiện hành.

## 5.2 Inherited Rule và Override — BR-017

Mỗi Group Rule có thể xác định `overridable`.

Nếu rule là overridable, Creator trong Draft có thể:

- Modify rule.
- Disable rule.
- Làm rule mạnh hơn hoặc nhẹ hơn.

Session override **replace** inherited Group Rule tương ứng trong Session đó.

Ví dụ:

```text
Group Rule:
Required Main >= 1
overridable = true

Session Rule:
Required Main >= 2
```

Effective Session Rule là `Required Main >= 2`; hai rule không cộng dồn.

Nếu Group Rule không overridable, Creator không được modify hoặc disable rule đó.

## 5.3 Session-only Rule — BR-018

Trong Draft, Creator có thể thêm Session-only Required hoặc Preferred Rule không tồn tại trong Group Rule.

MVP chưa cần Group-level permission riêng để giới hạn Creator được thêm loại Session-only rule nào.

Session-only rule vẫn phải tuân theo các invariant chung:

- `minimum_count >= 1`.
- Không duplicate cùng `rule_type + System Tag`.
- Không để cùng một System Tag vừa Required vừa Preferred trong effective Session Rule.

## 5.4 Effective Rule Precedence — BR-019

Effective Session Rule được hình thành theo nguyên tắc:

```text
Group Rule snapshot
        ↓
Allowed override / disable
        ↓
Session-only rules
        ↓
Effective Session Rule
```

Session Rule là source of truth cho rule evaluation của Session sau khi Session bắt đầu.

---

# 6. Selection Session Lifecycle Rules — BR-020

Selection Session đại diện cho một lần Group cùng quyết định các Dish sẽ ăn trong ngày hiện tại.

Session lifecycle:

```text
Draft
  ↓ Start
Active
  ├──→ Finalized
  └──→ Invalid
```

`Cancelled` và `Timeout` là các nguyên nhân làm Session chuyển sang `Invalid`, không phải state độc lập trong MVP.

Creator đồng thời là:

- Session Organizer.
- Decision Maker cuối cùng.
- Participant của Session.

Mỗi Session gắn với:

- Một Group.
- Một Decision Date.

Trong phạm vi hiện tại, Decision Date luôn là ngày hiện tại theo timezone của Group tại thời điểm Session được tạo.

## 6.1 Draft — BR-021

Trong Draft:

- Creator có thể cấu hình Session Rule.
- Creator có thể thêm hoặc remove Participant.
- Creator có thể bật/tắt Chef Mode theo rule cho phép.
- Creator có thể chọn hoặc thay đổi Chef list.

Khi Start Session, hệ thống phải revalidate tối thiểu:

- Creator vẫn là Group Member.
- Participant vẫn là Group Member.
- Chef vẫn là Group Member.
- Chef vẫn có Chef Role trong Group.

Chỉ khi validation hợp lệ, Session mới chuyển sang Active.

## 6.2 Active — BR-022

Khi Session Active:

- Participant bắt đầu tương tác với Dish.
- Creator có thể thêm hoặc remove Participant khác.
- Creator không thể bị remove khỏi Active Session.
- Chef list bị khóa.
- Final Meal có thể được finalize khi Creator có đủ thông tin; không cần chờ tất cả Participant Completed.

## 6.3 Finalized — BR-023

Khi Final Meal được finalize:

- Session chuyển thành Finalized.
- Session không được reopen.
- Mọi thay đổi Final Meal sau đó đi qua Final Meal Correction flow.

## 6.4 Invalid — BR-024

Session có thể trở thành Invalid do:

- Creator cancel Session.
- Session timeout.
- Lý do invalid khác được hệ thống hỗ trợ trong tương lai.

Invalid Session:

- Không tạo Eating History.
- Interaction không được dùng cho Implicit Preference Learning.
- Interaction không ảnh hưởng Future Recommendation.
- Kết quả Session không được tính như một valid decision result.
- Có thể giữ operational record và Interaction tối thiểu phục vụ audit hoặc product analytics.

## 6.5 Session Uniqueness — BR-025

Đối với mỗi `Group + Decision Date`:

- Tối đa một Session ở trạng thái Active hoặc Finalized được tính là valid decision flow.
- Draft và Invalid Session không block việc tạo một valid Session mới.
- Mỗi `Group + Decision Date` chỉ có tối đa một Authoritative Final Meal.

---

# 7. Participant Lifecycle — BR-026

Participant phải là Group Member.

Participant lifecycle trong Active Session:

```text
Active Participation ↔ Completed
          ↓
       Removed
```

`Completed` chỉ thể hiện User hiện tại cho rằng mình đã hoàn tất lượt lựa chọn.

Completed Participant:

- Vẫn là Participant hợp lệ.
- Có thể reopen lượt chọn trước khi Session Finalized.
- Có thể thay đổi Interaction.
- Có thể bị Creator remove khỏi Session.

Creator luôn là Participant và không thể bị remove khỏi Active Session.

Trong khi Session Active:

- Creator có thể thêm Participant.
- Creator có thể remove Participant khác, kể cả Participant đã Completed.

Khi thêm Participant:

- Participant mới có thể bắt đầu lựa chọn.
- Constraint và Session Statistics được cập nhật.

Khi remove Participant:

- Interaction trước đó được giữ phục vụ audit.
- Interaction không còn được tính vào Active Session Ranking.
- Interaction không được dùng để học Implicit Preference.
- Participant không nhận Default Eating History từ Final Meal của Session đó.

Nếu Participant bị remove rồi được add lại vào cùng Session:

- Đây được xem là fresh participation.
- Interaction cũ không được restore thành effective Interaction.
- User bắt đầu lại với effective Interaction trống.

Nếu User bị remove khỏi Group trong khi là Participant của Active Session:

- User bị remove khỏi Participant list của mọi Active Session thuộc Group, trừ trường hợp việc remove khỏi Group bị block bởi Creator/Chef protection rule.

Participant chưa Completed tại thời điểm Creator finalize:

- Vẫn là Participant hợp lệ nếu chưa bị remove.
- Vẫn nhận Default Eating History theo Final Meal, subject to Cannot Eat và Personal Correction rules.

---

# 8. Chef Role and Chef Mode Rules

## 8.1 Persistent Chef Role — BR-027

Chef là persistent Group Role.

Chỉ Group Member có Chef Role mới có thể được chọn làm Chef của Session.

Group Admin có quyền gán hoặc gỡ Chef Role.

Không thể gỡ Chef Role nếu User đang là Chef của một Active Session.

## 8.2 Chef Mode — BR-028

Chef Mode là tùy chọn được xác định khi tạo Session.

Nếu bật Chef Mode:

- Creator chọn một hoặc nhiều Chef từ các Group Member có Chef Role.
- Chef không bắt buộc phải là Participant.
- Danh sách Chef được khóa khi Session bắt đầu.
- Chef không thể được thêm hoặc xóa sau khi Session bắt đầu.
- Khả năng nấu Dish của Chef trở thành một phần Recommendation Context.

Một User có thể là:

- Participant.
- Chef.
- Participant và Chef.

Participant lifecycle và Chef lifecycle độc lập.

Nếu một User vừa là Participant vừa là Chef và bị remove khỏi Participant list:

> User đó vẫn giữ Chef assignment trong Session.

Nếu Chef đang ảnh hưởng một Active Session:

- User đó không thể bị remove khỏi Group cho đến khi Active Session kết thúc.
- Chef Role của User đó không thể bị gỡ cho đến khi Active Session kết thúc.

Creator của Active Session cũng không thể bị remove khỏi Group cho đến khi Active Session kết thúc.

## 8.3 Cooking Capability — BR-029

Cooking Capability thuộc về User, không thuộc Group.

Chỉ chính User có Chef Role được chỉnh Cooking Capability của mình trong normal product flow.

Group Admin không chỉnh Cooking Capability thay Chef.

Thông tin cần biết:

> Chef có thể nấu Dish này hay không.

Trong MVP không phân biệt:

- Đã từng nấu.
- Nấu thành thạo.
- Có thể học.

Nếu không có Cooking Capability record cho một `User + Dish`:

> Trạng thái được xem là `Unknown`, không phải `Cannot Cook`.

Trong Ranking:

- `Can Cook` có thể là positive signal.
- `Unknown` là neutral signal.

Nếu không bật Chef Mode:

> Cooking Capability không được xét.

Dish không có Chef nấu được vẫn có thể được lựa chọn nếu có phương án khác, ví dụ mua ngoài.

---

# 9. Purchase Source Rules — BR-030

Mọi Dish về nguyên tắc đều có khả năng được mua ngoài.

`Can Purchase` không được xem là một boolean constraint.

Dish có thể có:

- Không có nguồn mua đã biết.
- Một hoặc nhiều nguồn mua đã biết.

Việc có Purchase Source cụ thể có thể tăng Ranking.

Thiếu Purchase Source không làm Dish bị loại.

## 9.1 Global Purchase Source — BR-031

Đại diện cho identity dùng chung của một nguồn mua.

Global Purchase Source có thể được liên kết với một hoặc nhiều Dish.

## 9.2 Group Purchase Source Configuration — BR-032

Group có thể:

- Chọn hoặc liên kết Global Purchase Source phù hợp với Group.
- Thêm Purchase Source trong context của Group.
- Quản lý metadata riêng của Source trong Group nếu cần.

Group Member có thể thêm hoặc liên kết Purchase Source trong Group context.

Việc chỉnh sửa Global Purchase Source Identity, duplicate hoặc merge là một quy trình riêng.

---

# 10. Personalized Candidate Discovery Rules — BR-033

Candidate của mỗi User được cá nhân hóa.

Hai User trong cùng Session không bắt buộc phải nhìn thấy cùng một tập Dish hoặc cùng một thứ tự.

Personal Recommendation có thể xét:

- Group Dish Pool hiện tại.
- User Constraint.
- User Blacklist.
- Eating History.
- Explicit Preference.
- Implicit Preference.
- Chef Context nếu bật Chef Mode.
- Purchase Source.
- Group-specific Dish metadata.
- Các Ranking Signal khác.

Constraint của Participant khác không trực tiếp filter Candidate của User đang lựa chọn.

Ví dụ:

- User A Cannot Eat Dish X.
- User B có thể ăn Dish X.

User B vẫn có thể nhìn thấy Dish X.

Dish Card có thể hiển thị Group Context, ví dụ:

> 1 Participant trong Session không thể ăn món này.

Trong MVP, Required Rule, Preferred Rule và Target Dish Count không trực tiếp filter hoặc reorder Personal Candidate.

---

# 11. User Constraint and Recommendation Control

## 11.1 Cannot Eat — BR-034

User chủ động thiết lập.

`Cannot Eat` là hard constraint ở cấp cá nhân.

Dish mà User Cannot Eat:

> Không xuất hiện trong Personal Candidate của chính User đó.

Constraint này không tự động ngăn User khác nhìn thấy Dish.

Khi Creator chốt Final Meal có Dish mà Participant Cannot Eat:

- Hệ thống phải warning.
- Creator vẫn có quyền override.

Nếu User đã có effective Session Interaction với Dish rồi sau đó Mark Cannot Eat:

- Effective Session Interaction của User với Dish đó bị clear / invalidate.
- Interaction trước đó có thể được giữ làm historical audit record.
- Dish bị remove khỏi Personal Candidate của User ngay.

`Cannot Eat` là user-declared dietary exclusion, không phải cơ chế quản lý an toàn y tế hoặc dị ứng.

## 11.2 Blacklist — BR-035

Blacklist có nghĩa:

> User không muốn Dish này tiếp tục được hệ thống chủ động đề xuất cho mình.

Dish trong Blacklist:

- Không xuất hiện trong Personal Candidate Discovery của User.
- Không ảnh hưởng Candidate của User khác.
- Không đồng nghĩa với `Cannot Eat`.
- Có thể được User remove khỏi Blacklist.

Nếu User đã có Session Interaction với Dish rồi sau đó Add Blacklist:

- Dish bị remove khỏi Personal Candidate của User ngay.
- Existing effective Session Interaction vẫn giữ nguyên.

Blacklist là persistent user-level recommendation exclusion, không phải một Session Interaction và không đồng nghĩa với việc User rút đề xuất hiện tại.

## 11.3 History Whitelist — BR-036

Trong MVP, Whitelist chỉ áp dụng ở **cấp Dish**.

Whitelist có nghĩa:

> Không áp dụng history-based cooldown hoặc ranking penalty cho Dish đó.

Tag-level whitelist không thuộc MVP. Lý do: System Tag trong MVP mang tính cấu trúc (`Main`, `Soup`, `Staple`), nên cooldown theo Tag không phản ánh đúng ý nghĩa lặp món. Tag-level cooldown và tag-level whitelist chỉ nên được xem xét khi có một chiều phân loại phù hợp hơn.

Whitelist không:

- Làm Dish luôn được ưu tiên.
- Tự động đề xuất Dish.
- Override `Cannot Eat`.
- Override Blacklist.

Trong Active Session, cập nhật Whitelist có thể trigger recalculation history-based ranking penalty cho Personal Candidate.

---

# 12. Preference Rules

## 12.1 Explicit Preference — BR-037

User có thể thiết lập:

- Like.
- Dislike.
- Neutral.

Explicit Preference chỉ ảnh hưởng Ranking.

Không trở thành hard constraint.

Trong Active Session, cập nhật Explicit Preference có thể trigger recalculation Personal Ranking.

## 12.2 Implicit Preference — BR-038

Implicit Preference được suy ra từ valid Interaction History.

Interaction chỉ được xem là valid cho Preference Learning khi:

- Thuộc Session ở trạng thái `Finalized`.
- User không bị remove khỏi Session đó.
- Timestamp mới hơn thời điểm User reset Implicit Preference cho Dish tương ứng.

Interaction của Session đang `Active` không được dùng để học và không làm thay đổi Implicit Preference trong chính Session đó.

Ví dụ:

- Swipe Right thường xuyên → tăng Ranking.
- Swipe Left thường xuyên → giảm Ranking.

Công thức tính cụ thể, bao gồm time decay và smoothing, thuộc Ranking Specification.

Implicit Preference chỉ ảnh hưởng Recommendation Ranking.

Không trở thành hard constraint.

User có thể reset Implicit Preference của một Dish.

Khi reset:

- Inferred Preference trở về neutral.
- Interaction History gốc vẫn được giữ.
- Hệ thống lưu thời điểm reset cho `User + Dish`.
- Chỉ Interaction phát sinh sau thời điểm reset được dùng để tái tạo Implicit Preference.

Interaction của Invalid Session, removed Participant hoặc invalidated participation không được dùng cho Implicit Preference Learning.

---

# 13. User Interaction Rules — BR-039

User tương tác với Dish trong Session thông qua Dish Card.

Hệ thống phân biệt:

1. Session Interaction.
2. Persistent Dish Action.

Hai nhóm này là các state domain khác nhau và không áp dụng chung nguyên tắc overwrite.

## 13.1 Effective Session Interaction — BR-040

Đối với mỗi `Session + Participant + Dish`, chỉ có một effective Session Interaction tại một thời điểm:

```text
None ↔ Swipe Right ↔ Swipe Left
```

User có thể thay đổi Interaction.

> Session Interaction mới nhất thắng giữa `Swipe Right`, `Swipe Left` và `None`.

User có thể Undo về `None`.

Historical Interaction event có thể được giữ để audit, nhưng Session Ranking chỉ sử dụng effective Interaction hợp lệ hiện tại.

## 13.2 Swipe Right — BR-041

Có nghĩa:

> “Tôi đề xuất món này cho Group trong Session hiện tại.”

User có thể Swipe Right nhiều Dish cùng một System Tag.

Swipe Right không có nghĩa tất cả Dish được swipe phải cùng xuất hiện trong Final Meal.

## 13.3 Swipe Left / Don't Want Today — BR-042

Có nghĩa:

> “Tôi không muốn ăn món này trong Session hiện tại.”

Swipe Left tạo signal `Don't Want Today`.

`Swipe Left` và `Don't Want Today` là cùng một Session Interaction.

Signal này:

- Không phải hard constraint.
- Không ảnh hưởng User khác.
- Không tự động trở thành long-term Preference.
- Không tự động thêm Dish vào Blacklist.

## 13.4 Persistent Dish Actions — BR-043

Ngoài Swipe, User có thể:

- Mark Cannot Eat.
- Add to Blacklist.
- Remove from Blacklist.
- Add to Whitelist.
- Set Explicit Preference.

Persistent Dish Action có thể ảnh hưởng Recommendation ngay sau khi được cập nhật.

Persistent Dish Action không mặc định overwrite Session Interaction.

Ngoại lệ:

- `Cannot Eat` là hard constraint và clear / invalidate effective Session Interaction của chính User với Dish đó.
- `Blacklist` chỉ ảnh hưởng recommendation discovery và không clear existing effective Session Interaction.

## 13.5 Session Participation — BR-044

User:

- Không bắt buộc phải duyệt toàn bộ Candidate.
- Có thể đánh dấu Completed bất kỳ lúc nào.
- Có thể reopen lượt lựa chọn trước khi Session Finalized.

Creator:

- Không cần chờ tất cả Participant hoàn tất.
- Có thể finalize Session sớm khi đã có đủ thông tin.

---

# 14. Personal Ranking Rules — BR-045

Mục tiêu của Personal Ranking:

> Đưa những Dish có khả năng User muốn đề xuất lên trước.

Personal Ranking có thể xét:

- Explicit Preference.
- Implicit Preference.
- Eating History.
- User Constraint.
- Blacklist.
- Chef Context.
- Purchase Source.
- Group-specific Dish metadata.

`Cannot Eat` và Blacklist loại Dish khỏi Personal Candidate bằng hard filter, không bằng ranking penalty.

Trong MVP, Meal Composition Rule như Required Tag, Preferred Tag và Target Dish Count **không trực tiếp ảnh hưởng Personal Ranking**.

## 14.1 History Cooldown — BR-046

Dish User vừa ăn bị hạ ưu tiên trong một cửa sổ thời gian xác định, giảm dần theo số ngày đã trôi qua.

- Cooldown chỉ áp dụng ở cấp Dish.
- Cooldown không loại Dish khỏi Personal Candidate.
- Whitelist đưa cooldown penalty về 0.

Độ dài cửa sổ và cách giảm dần thuộc Ranking Specification.

## 14.2 Exploration — BR-047

Personal Candidate deck phải dành một tỉ lệ vị trí cố định cho Dish mà User chưa từng ăn hoặc đã lâu không ăn.

Exploration là yêu cầu bắt buộc chứ không phải hệ quả của trọng số, vì nếu deck chỉ tối ưu theo mức độ phù hợp thì hệ thống sẽ liên tục đẩy cùng một nhóm món quen lên đầu.

Dish có Explicit Preference `Dislike` không được đưa vào exploration.

## 14.3 Deck Stability — BR-048

Personal Candidate deck được materialize thành một ordered list khi User bắt đầu lượt lựa chọn.

Khi Persistent Dish Action hoặc Group Dish Pool thay đổi trong lúc Session Active:

- Phần deck User đã xem giữ nguyên thứ tự.
- Chỉ phần deck User chưa xem được tính lại và sắp xếp lại.
- Dish vừa trở thành `Cannot Eat`, Blacklist hoặc Inactive được remove khỏi phần chưa xem ngay lập tức.

User không bắt buộc phải duyệt hết deck. Khi hết deck, hệ thống không sinh thêm candidate.

Chi tiết công thức Personal Ranking thuộc Ranking Specification.

---

# 15. Session Ranking Rules — BR-049

Session Ranking tổng hợp evidence của toàn Session để hỗ trợ Creator ra quyết định.

Session Ranking có thể được segment theo System Tag.

Mỗi Dish có thể hiển thị các Session evidence như:

- Số người đề xuất.
- Số người không muốn ăn.
- Số người Cannot Eat.
- Số người đã ăn gần đây.

Chỉ effective Interaction hợp lệ được tính vào Active Session Ranking.

Trong MVP:

- Required Rule không boost Dish nhằm hoàn thành Meal Composition.
- Preferred Rule không ảnh hưởng Session Ranking.
- Target Dish Count không ảnh hưởng Session Ranking.

Rule compliance được xử lý trong Final Meal composition / finalize flow, không được trộn vào evidence ranking trong MVP.

Session Ranking là **evidence-only**:

- Chỉ effective Session Interaction, `Cannot Eat` và Eating History của Participant hiện tại tham gia vào điểm số.
- Explicit và Implicit Preference cá nhân không tham gia Session Ranking.
- Interaction của Creator được tính đúng như mọi Participant khác; Creator không có trọng số riêng.
- Chef context được hiển thị dưới dạng thông tin bổ sung, không cộng vào điểm số.
- Conflict với Session Rule là thông tin hiển thị, không phải ranking signal.

Điểm Session Ranking phải được chuẩn hoá theo số Participant hiện tại, để điểm giữ nguyên ý nghĩa khi Creator thêm hoặc remove Participant trong lúc Session Active.

Dish thuộc Group Dish Pool nhưng chưa có Interaction nào không được cho điểm và không trộn vào ranking chính. Các Dish này vẫn phải hiển thị được cho Creator để có thể đưa vào Final Meal.

Công thức và trọng số cụ thể thuộc Ranking Specification.

Dish đã bị remove khỏi Group Dish Pool:

- Không còn xuất hiện trong Active Session Ranking.
- Không thể được chọn vào Final Meal.

Interaction của removed Participant hoặc Interaction bị invalidated không được tính vào Active Session Ranking.

---

# 16. Final Meal Rules — BR-050

Creator chọn một hoặc nhiều Dish từ Group Dish Pool hiện tại để tạo Final Meal.

Mỗi `Group + Decision Date` chỉ có tối đa một Authoritative Final Meal.

Creator có thể chọn Dish:

- Được nhiều người đề xuất.
- Không được ai đề xuất.
- Có người không muốn ăn.
- Có người Cannot Eat.

Mọi Dish trong Final Meal phải:

- Thuộc Group Dish Pool tại thời điểm finalize.
- Chỉ xuất hiện một lần trong cùng Final Meal.

## 16.1 Live Composition Feedback — BR-051

Trong lúc Creator xây Final Meal, hệ thống có thể hiển thị trạng thái rule hiện tại, ví dụ:

```text
Main: 1/1 ✓
Soup: 0/1
```

Thông tin này chỉ mang tính feedback. Authoritative validation luôn chạy lại khi Creator thực hiện Finalize.

## 16.2 Finalize Validation — BR-052

Khi Creator bấm Finalize, hệ thống phải revalidate Final Meal từ đầu dựa trên:

- Current Group Dish Pool.
- Current Group-specific System Tag của Dish tại thời điểm finalize.
- Locked effective Session Rule.

System Tag không được snapshot cùng Session trong MVP. Vì vậy thay đổi System Tag trong Group trong lúc Session Active có thể thay đổi kết quả validation tại thời điểm finalize.

Nếu bất kỳ Required Rule nào fail:

- Finalize bị reject.
- Hệ thống hiển thị Required Rule chưa đạt.
- Session vẫn ở trạng thái `Active`.
- Không tạo state `ValidationFailed`.

Nếu tất cả Required Rule pass nhưng Preferred Rule hoặc Target Dish Count không đạt:

- Hệ thống hiển thị warning.
- Creator có thể xác nhận tiếp tục finalize.
- Warning không biến thành hard constraint.

Nếu validation thành công và Creator xác nhận các warning cần thiết:

- Final Meal trở thành Authoritative Final Meal.
- Session chuyển sang `Finalized`.
- Session không được reopen.

## 16.3 Finalize Warning Audit — BR-053

Warning được override khi finalize phải được lưu cùng Final Meal để audit.

Audit tối thiểu cần xác định:

- Warning type.
- Rule reference hoặc rule context liên quan.
- Actual value / condition tại thời điểm finalize.

Warning audit không làm thay đổi authority của Final Meal.

---

# 17. Meal Composition Rules — BR-054

Hệ thống không cố gắng tự hiểu toàn bộ logic ẩm thực, bao gồm:

- Toàn món chiên.
- Toàn món nước.
- Dish compatibility về khẩu vị.
- Cân bằng dinh dưỡng.
- Trùng nguyên liệu.

Meal Composition trong MVP được đánh giá chủ yếu dựa trên:

- Current System Tag của Dish.
- Effective Session Rule.
- Target Dish Count.

Rule semantics:

- Required = phải pass để finalize.
- Preferred = warning tại finalize.
- Target Dish Count = warning tại finalize.

Required, Preferred và Target Dish Count không ảnh hưởng Personal Ranking hoặc Session Ranking trong MVP.

---

# 18. Session Expiration and Cancellation Rules — BR-055

Creator có thể đặt Custom Deadline cho Session trong ngày hiện tại.

Nếu không đặt:

> Session mặc định hết hạn vào cuối Decision Date hiện tại theo timezone của Group.

Session:

- Không được kéo dài sang Decision Date tiếp theo.
- Không được tồn tại Active quá 24 giờ.

Nếu Session hết hạn mà chưa có Final Meal:

> Session chuyển thành `Invalid` với reason `Timeout`.

Nếu Creator cancel Session:

> Session chuyển thành `Invalid` với reason `Cancelled`.

Invalid Session:

- Không tạo Eating History.
- Interaction không được dùng để học Implicit Preference.
- Interaction không ảnh hưởng Future Recommendation.
- Không block việc tạo valid Session mới cho cùng Group và Decision Date.
- Có thể giữ operational record tối thiểu phục vụ audit và product analytics.

---

# 19. Eating History Rules

## 19.1 Default Eating History — BR-056

Khi Final Meal được chốt:

> Mỗi Participant hiện tại mặc định được ghi nhận đã ăn các Dish trong Final Meal trong ngày đó.

Ngoại lệ:

Nếu tại thời điểm Final Meal được finalize, Participant có `Cannot Eat` đối với một Dish:

> Dish đó không được tự động ghi vào Default Eating History của Participant đó.

Default Eating History phải giữ source reference đến Final Meal sinh ra record.

Một User có thể có nhiều Eating History source record cho cùng một `Dish + Eating Date`.

Ví dụ:

- User tham gia Group A và Final Meal A có Dish X.
- User tham gia Group B và Final Meal B cũng có Dish X.

Hai source record có thể cùng tồn tại.

Khi Recommendation sử dụng Eating History, nhiều source record cho cùng `User + Dish + Eating Date` được collapse thành **một** eating event.

Việc User ăn cùng một Dish ở nhiều Group trong cùng một ngày không làm tăng history penalty nhiều lần.

Số lượng source record vẫn được giữ nguyên trong dữ liệu để phục vụ audit và correction; collapse chỉ áp dụng ở tầng ranking.

## 19.2 Personal Eating History Correction — BR-057

User chỉ có quyền chỉnh Eating History của chính mình trong normal product flow.

Personal Correction có thể:

- Add Dish vào Eating History tương ứng với context cần chỉnh.
- Remove Dish khỏi Eating History tương ứng với context cần chỉnh.

Personal Correction:

- Ảnh hưởng Future Recommendation.
- Không thay đổi Interaction History.
- Không bắt buộc có correction reason trong MVP.
- Có thể được thực hiện cho historical date mà không có giới hạn thời gian trong MVP.

Authority:

```text
Authoritative Final Meal
        ↓
Default Eating History
        ↓
User Personal Correction
        ↓
Effective Eating History
```

> Personal Correction là source of truth cao nhất đối với phần Eating History mà User đã sửa.

---

# 20. Final Meal Correction Rules

## 20.1 Creator Correction — BR-058

Creator chỉ có thể chỉnh Authoritative Final Meal của **Decision Date hiện tại**.

Creator không sửa historical Final Meal của ngày trước trong normal product flow.

## 20.2 System Admin Correction — BR-059

System Admin có thể thực hiện historical Final Meal correction để xử lý:

- Human error.
- Data issue.
- Exceptional operational correction.

Historical correction phải giữ audit trail tối thiểu:

- Giá trị trước khi sửa.
- Giá trị sau khi sửa.
- Người thực hiện.
- Thời điểm thực hiện.

Correction reason không bắt buộc trong MVP.

## 20.3 Impact on Eating History — BR-060

Khi Authoritative Final Meal được sửa:

- Final Meal mới được xem là authoritative reality của Group cho Decision Date đó.
- Default Eating History chỉ được cập nhật đối với phần User chưa thực hiện Personal Correction.
- Phần Eating History đã có Personal Correction không bị Final Meal Correction overwrite.

Nói cách khác:

> Final Meal Correction chỉ tác động đến default-derived Eating History chưa được User override.

---

# 21. Invalid, Removed and Re-added Interaction Rules — BR-061

Nếu Session Invalid:

- Interaction không được tính vào Preference Learning.
- Interaction không ảnh hưởng Future Recommendation.

Nếu Participant bị remove khỏi Active Session:

- Historical Interaction có thể được giữ cho audit.
- Interaction không còn được tính vào Active Session Ranking.
- Interaction không được dùng để học Implicit Preference.
- Participant không nhận Default Eating History từ Final Meal.

Nếu Participant được add lại:

- Interaction cũ vẫn không effective.
- User bắt đầu fresh participation.

Nếu Dish bị remove khỏi Group Dish Pool trong Active Session:

- Interaction trước đó được giữ cho audit.
- Interaction không còn effective trong Active Session Ranking.

Nếu Dish được add lại trong cùng Active Session:

- Interaction cũ không tự động được restore.

---

# 22. Core Invariants

## 22.1 Group, Role và Session

- Participant phải là Group Member.
- Chef phải là Group Member có Chef Role.
- Chef không bắt buộc phải là Participant.
- Creator luôn là Participant.
- Creator không thể bị remove khỏi Active Session.
- Creator của Active Session không thể bị remove khỏi Group cho đến khi Session kết thúc.
- Chef đang được sử dụng trong Active Session không thể bị remove khỏi Group hoặc bị gỡ Chef Role cho đến khi Session kết thúc.
- Start Session phải revalidate Participant membership và Chef membership/role.
- Tối đa một Active hoặc Finalized Session được tính là valid decision flow cho mỗi `Group + Decision Date`.
- Draft và Invalid Session không block việc tạo valid Session mới.
- Mỗi `Group + Decision Date` chỉ có tối đa một Authoritative Final Meal.

## 22.2 Participant

- Completed chỉ là participation progress state, không khóa Interaction.
- Completed Participant có thể reopen trước khi Session Finalized.
- Participant chưa Completed vẫn có thể nhận Default Eating History nếu vẫn là Participant khi finalize.
- Removed Participant không nhận Default Eating History.
- Re-added Participant bắt đầu fresh participation; Interaction cũ không restore hiệu lực.

## 22.3 Dish

- Mọi Personal Candidate phải bắt nguồn từ Group Dish Pool hiện tại.
- Mọi Dish trong Final Meal phải thuộc Group Dish Pool tại thời điểm finalize.
- Một Dish chỉ xuất hiện tối đa một lần trong cùng Final Meal.
- Dish bị remove khỏi Group Dish Pool không bị xóa khỏi historical records.
- Add lại Group Dish có thể restore Group-specific metadata nhưng không restore Interaction cũ trong Active Session.
- Full Logical Merge execution không thuộc MVP.

## 22.4 Rules

- Trong MVP, mỗi Group có một Group Rule set; thiết kế phải cho phép mở rộng thành nhiều rule set / preset sau này.
- Group Rule chỉ được chỉnh bởi Group Admin.
- Session Rule là snapshot của Group Rule tại thời điểm tạo Session.
- Chỉ Creator được chỉnh Session Rule và chỉ khi Session còn Draft.
- Session Rule bị khóa khi Session Active.
- Session override chỉ được áp dụng lên inherited rule nếu rule đó `overridable`; override replace rule cũ thay vì cộng dồn.
- Creator có thể thêm Session-only Required hoặc Preferred Rule trong Draft.
- Tag rule phải có `minimum_count >= 1`.
- Không được có duplicate cùng `rule_type + System Tag`.
- Một System Tag không được đồng thời là Required và Preferred trong cùng effective rule set.
- Một Dish có nhiều System Tag được count độc lập cho tất cả Tag mà Dish mang.
- Required Session Rule phải được đáp ứng trước khi Final Meal được finalize.
- Preferred Session Rule và Target Dish Count chỉ warning tại finalize trong MVP.
- Meal Composition Rule không trực tiếp ảnh hưởng Personal Ranking hoặc Session Ranking trong MVP.
- Finalize luôn revalidate bằng current Group Dish Pool, current System Tag và locked effective Session Rule.
- Finalize warning được Creator override phải được lưu để audit.

## 22.5 Constraint, Preference và Recommendation Control

- `Cannot Eat` là hard constraint đối với Personal Candidate của User.
- Mark Cannot Eat clear / invalidate effective Session Interaction của chính User với Dish đó.
- Blacklist là persistent recommendation exclusion.
- Blacklist không đồng nghĩa với `Cannot Eat`.
- Blacklist không clear existing effective Session Interaction.
- Swipe Left và `Don't Want Today` là cùng một Session Interaction.
- Explicit Preference và Implicit Preference chỉ ảnh hưởng Ranking.
- Whitelist chỉ loại bỏ history-based cooldown hoặc ranking penalty.
- Whitelist trong MVP chỉ áp dụng ở cấp Dish.
- Whitelist không override `Cannot Eat` hoặc Blacklist.
- History cooldown chỉ áp dụng ở cấp Dish và không loại Dish khỏi Personal Candidate.
- Personal Candidate deck phải dành một tỉ lệ vị trí cố định cho exploration.
- Phần deck User đã xem không được sắp xếp lại trong cùng một Session.
- Session Ranking là evidence-only; preference cá nhân không tham gia và Creator không có trọng số riêng.
- Nhiều Eating History source record cùng `User + Dish + Date` được collapse thành một eating event khi tính ranking.
- Implicit Preference chỉ học từ Interaction thuộc Session `Finalized` và phát sinh sau thời điểm reset.

## 22.6 Interaction

- Interaction thuộc về một Session cụ thể.
- Mỗi `Session + Participant + Dish` chỉ có một effective Session Interaction tại một thời điểm.
- Interaction mới nhất thắng giữa `Swipe Right`, `Swipe Left` và `None`.
- Persistent Dish Action không mặc định overwrite Session Interaction.
- Interaction của Invalid Session không được dùng cho Implicit Preference Learning.
- Interaction của Participant bị remove không được dùng cho Active Session Ranking hoặc Preference Learning.
- Interaction với Dish bị remove khỏi Group Dish Pool được giữ cho audit nhưng không còn được tính vào Active Session Ranking.

## 22.7 Eating History

- Invalid Session không tạo Eating History.
- Participant bị remove trước khi Final Meal được finalize không nhận Default Eating History từ Final Meal đó.
- Dish có `Cannot Eat` conflict không được tự động ghi vào Default Eating History của User.
- Một User có thể có nhiều Eating History source record cho cùng Dish và cùng ngày.
- Personal Eating History Correction có authority cao hơn Default Eating History sinh từ Final Meal đối với phần User đã sửa.
- Final Meal Correction không overwrite phần Eating History đã được User Personal Correction.
- Eating History Correction không thay đổi Interaction History.

## 22.8 Time

- Mọi Session thuộc về một Decision Date.
- Decision Date được xác định theo timezone của Group.
- Session không được kéo dài sang Decision Date tiếp theo.
- Session không được tồn tại Active quá 24 giờ.
- Creator chỉ sửa Final Meal của Decision Date hiện tại trong normal product flow.
- Historical Final Meal correction là exceptional System Admin action.

---

# 23. Rule ID Registry

| BR-ID | Section | Chủ đề |
|---|---|---|
| BR-001 | 1.1 | Global Dish Pool |
| BR-002 | 1.2 | Duplicate Dish và Logical Merge |
| BR-003 | 1.3 | System Tag |
| BR-004 | 1.4 | Descriptive Tag |
| BR-005 | 2 | Group Dish Pool |
| BR-006 | 3.1 | Group Membership Model |
| BR-007 | 3.2 | Quyền Group Member |
| BR-008 | 3.3 | Quyền Group Admin |
| BR-009 | 3.4 | System Admin |
| BR-010 | 4 | Group Rule |
| BR-011 | 4.1 | Target Dish Count |
| BR-012 | 4.2 | Tag Rule Structure |
| BR-013 | 4.3 | Required Rule |
| BR-014 | 4.4 | Preferred Rule |
| BR-015 | 5 | Session Rule |
| BR-016 | 5.1 | Draft Editing |
| BR-017 | 5.2 | Inherited Rule và Override |
| BR-018 | 5.3 | Session-only Rule |
| BR-019 | 5.4 | Effective Rule Precedence |
| BR-020 | 6 | Selection Session Lifecycle |
| BR-021 | 6.1 | Draft |
| BR-022 | 6.2 | Active |
| BR-023 | 6.3 | Finalized |
| BR-024 | 6.4 | Invalid |
| BR-025 | 6.5 | Session Uniqueness |
| BR-026 | 7 | Participant Lifecycle |
| BR-027 | 8.1 | Persistent Chef Role |
| BR-028 | 8.2 | Chef Mode |
| BR-029 | 8.3 | Cooking Capability |
| BR-030 | 9 | Purchase Source |
| BR-031 | 9.1 | Global Purchase Source |
| BR-032 | 9.2 | Group Purchase Source Configuration |
| BR-033 | 10 | Personalized Candidate Discovery |
| BR-034 | 11.1 | Cannot Eat |
| BR-035 | 11.2 | Blacklist |
| BR-036 | 11.3 | History Whitelist |
| BR-037 | 12.1 | Explicit Preference |
| BR-038 | 12.2 | Implicit Preference |
| BR-039 | 13 | User Interaction |
| BR-040 | 13.1 | Effective Session Interaction |
| BR-041 | 13.2 | Swipe Right |
| BR-042 | 13.3 | Swipe Left / Don't Want Today |
| BR-043 | 13.4 | Persistent Dish Actions |
| BR-044 | 13.5 | Session Participation |
| BR-045 | 14 | Personal Ranking |
| BR-046 | 14.1 | History Cooldown |
| BR-047 | 14.2 | Exploration |
| BR-048 | 14.3 | Deck Stability |
| BR-049 | 15 | Session Ranking |
| BR-050 | 16 | Final Meal |
| BR-051 | 16.1 | Live Composition Feedback |
| BR-052 | 16.2 | Finalize Validation |
| BR-053 | 16.3 | Finalize Warning Audit |
| BR-054 | 17 | Meal Composition |
| BR-055 | 18 | Session Expiration and Cancellation |
| BR-056 | 19.1 | Default Eating History |
| BR-057 | 19.2 | Personal Eating History Correction |
| BR-058 | 20.1 | Creator Correction |
| BR-059 | 20.2 | System Admin Correction |
| BR-060 | 20.3 | Impact on Eating History |
| BR-061 | 21 | Invalid, Removed and Re-added Interaction |

Section 22 (Core Invariants) không được cấp BR-ID vì nó là bản tổng hợp lại các rule đã có ID ở trên, không phải nguồn rule độc lập.

---

# 24. Change History

| Version | Date | Section | Change | Reason / Decision |
|---|---|---|---|---|
| 1.6 | 2026-08-14 | Toàn bộ | Assigned stable BR-IDs to all rule sections and added Rule ID Registry | PRD v0.1 §9.1 |
| 1.6 | 2026-08-14 | System Tag | Fixed the v1 System Tag set at five values; Group cannot create new System Tags | PRD v0.1 §9.2 |
| 1.5 | 2026-08-14 | History Whitelist | Narrowed Whitelist to Dish level in MVP; moved Tag-level cooldown out of scope | DEC-012 |
| 1.5 | 2026-08-14 | Implicit Preference | Restricted learning to Finalized Sessions and added reset watermark semantics | DEC-012 |
| 1.5 | 2026-08-14 | Personal Ranking | Added History Cooldown, mandatory Exploration and Deck Stability rules | DEC-012 |
| 1.5 | 2026-08-14 | Session Ranking | Declared evidence-only ranking, participant normalization and no Creator weighting | DEC-012 |
| 1.5 | 2026-08-14 | Eating History | Resolved multi-source aggregation as single collapsed eating event | DEC-012 |
| 1.5 | 2026-08-14 | Core Invariants | Added ranking, cooldown, exploration and deck stability invariants | DEC-012 |
| 1.4 | 2026-07-29 | Group Rule | Formalized single MVP rule set, Target Dish Count semantics, Tag Rule structure and independent tag counting | DEC-010 |
| 1.4 | 2026-07-29 | Session Rule | Added snapshot semantics, Draft-only editing, per-rule override, replace behavior and Session-only rules | DEC-010 |
| 1.4 | 2026-07-29 | Ranking | Removed Meal Composition Rule and Target Dish Count from Personal/Session Ranking in MVP | DEC-011 |
| 1.4 | 2026-07-29 | Finalize Validation | Added authoritative revalidation, Required reject behavior, Preferred/Target warnings and current System Tag evaluation | DEC-011 |
| 1.4 | 2026-07-29 | Finalize Warning Audit | Added persistence of warnings overridden by Creator at finalize | DEC-011 |
| 1.3 | 2026-07-23 | Global Dish | Added creation provenance: created by User, source Group, created time | DEC-008 |
| 1.3 | 2026-07-23 | Duplicate / Merge | Replaced hard merge rule with post-MVP Logical Merge direction | DEC-008 |
| 1.3 | 2026-07-23 | Group Dish Pool | Added Active/Inactive lifecycle and re-add behavior; no Interaction restore | DEC-009 |
| 1.3 | 2026-07-23 | Group Roles | Formalized Member base membership with Chef and Group Admin capabilities | DEC-004 |
| 1.3 | 2026-07-23 | Selection Session | Added Draft, Active, Finalized, Invalid lifecycle | DEC-001 |
| 1.3 | 2026-07-23 | Session Uniqueness | Invalid and Draft Sessions no longer block a valid Session for the same date | DEC-001 |
| 1.3 | 2026-07-23 | Participant Lifecycle | Added Completed state, reopen, removal and fresh re-add behavior | DEC-002 |
| 1.3 | 2026-07-23 | Group Membership | Added Creator/Chef protection during Active Session | DEC-003, DEC-004 |
| 1.3 | 2026-07-23 | Chef | Added persistent Chef Role, start-time revalidation and User-level Cooking Capability | DEC-004 |
| 1.3 | 2026-07-23 | Interaction | Added latest-effective-interaction rule and Undo | DEC-005 |
| 1.3 | 2026-07-23 | Constraint / Blacklist | Clarified Cannot Eat invalidates effective Swipe; Blacklist does not | DEC-005 |
| 1.3 | 2026-07-23 | Eating History | Added multiple source records per Dish/date and correction authority | DEC-006 |
| 1.3 | 2026-07-23 | Final Meal Correction | Limited Creator correction to current Decision Date; added exceptional System Admin correction | DEC-007 |
