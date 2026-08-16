# SDD — What We Gonna Eat Today

## Version 0.2

**Status:** Draft — Awaiting review
**Created:** 2026-08-14
**Last Updated:** 2026-08-14
**Upstream:** PRD v0.4, Business Rules v1.6, Ranking Specification v0.2
**Downstream:** Tech Spec & Architecture, Test Cases Specification, Master Plan

Tài liệu này đặc tả **chi tiết kiểm chứng được bằng máy** cho 17 tính năng của v1.0, và **liệt kê đầy đủ** 48 tính năng để không tính năng nào biến mất khỏi tầm nhìn.

Mỗi `Kịch bản` trong tài liệu này ánh xạ **1–1** thành một test case ở phase 8. Không viết kịch bản mà không định test.

---

# 1. Phạm vi spec

## 1.1 Đã spec chi tiết trong v0.1

| Feature | Tính năng | SPEC |
|---|---|---|
| F01 | Đăng nhập | SPEC-001 |
| F02 | Tạo Group, thêm Member | SPEC-002, SPEC-003, SPEC-004 |
| F03 | Thêm Dish vào Group Dish Pool | SPEC-005 |
| F04 | Gán System Tag trong Group | SPEC-006 |
| F05 | Tạo Session cho hôm nay | SPEC-007, SPEC-008 |
| F06 | Thêm Participant | SPEC-009 |
| F07 | Personal Candidate deck | SPEC-010, SPEC-011 |
| F08 | Swipe Right / Left | SPEC-012 |
| F09 | Undo về None | SPEC-012 |
| F10 | Completed và mở lại | SPEC-013 |
| F11 | Session Ranking | SPEC-014 |
| F12 | Chọn và chốt Final Meal | SPEC-015, SPEC-016 |
| F13 | Required Rule validation | SPEC-016 |
| F14 | Default Eating History | SPEC-017 |
| F17 | History cooldown 7 ngày | SPEC-020, SPEC-010 |
| F20 | Group Rule: Required tag rules | SPEC-021 |
| F21 | Session Rule snapshot | SPEC-022, SPEC-008 |

Thêm hai spec hạ tầng không gắn trực tiếp một feature: SPEC-018 (Decision Date resolution) và SPEC-019 (Authorization guard).

**F21 được kéo vào v1.0 như phụ thuộc bắt buộc của F20.** BR-015 quy định Session Rule là snapshot của Group Rule tại thời điểm tạo Session. Nếu có F20 mà không có F21, finalize sẽ phải đánh giá trực tiếp trên Group Rule hiện tại, tức là kết quả validate có thể đổi giữa chừng nếu Admin sửa rule trong lúc Session đang chạy — và SDD sẽ mâu thuẫn với Business Rules. Chi phí của snapshot là một bảng và một vòng copy lúc Start Session, rẻ hơn nhiều so với việc ghi một sai lệch có chủ ý rồi sửa lại ở v1.1.

## 1.2 Chưa spec — nằm ngoài v1.0

Các tính năng dưới đây **đã được phân tích và giữ nguyên trong PRD v0.2**, nhưng chưa có spec ở v0.1. Chúng sẽ được spec khi tới release tương ứng.

| Feature | Tính năng | Release | Business Rule |
|---|---|---|---|
| F15 | Cannot Eat | v1.1 | BR-034, BR-043 |
| F16 | Explicit Preference Like/Dislike | v1.1 | BR-037 |
| F18 | Explore lane 20% | v1.1 | BR-047 |
| F19 | Deck stability khi tính lại | v1.1 | BR-048 |
| F22 | Preferred Rule + warning | v1.1 | BR-014, BR-052 |
| F23 | Target Dish Count + warning | v1.1 | BR-011 |
| F24 | Warning audit khi override | v1.1 | BR-053 |
| F25 | Remove Participant giữa Session | v1.1 | BR-026, BR-061 |
| F26 | Session timeout cuối ngày | v1.1 | BR-055 |
| F27 | Gỡ Dish khỏi Group Dish Pool | v1.1 | BR-005 |
| F28 | Personal Eating History Correction | v1.1 | BR-057 |
| F29 | Duplicate detection khi tạo Dish | v1.1 | BR-001 |
| F30 | Implicit Preference | v1.2 | BR-038 |
| F31 | Blacklist | v1.2 | BR-035 |
| F32 | Whitelist | v1.2 | BR-036 |
| F33 | Chef Role + Chef Mode | v1.2 | BR-027, BR-028 |
| F34 | Cooking Capability | v1.2 | BR-029 |
| F35 | Session Rule override + Session-only rule | v1.2 | BR-017, BR-018 |
| F36 | Purchase Source | v1.2 | BR-030 |
| F37 | Descriptive Tag | v1.2 | BR-004 |
| F38 | Live composition feedback | v1.2 | BR-051 |
| F39 | Reset Implicit Preference | v1.2 | BR-038 |
| F40 | Final Meal Correction trong ngày | v1.2 | BR-058 |
| F41 | Cancel Session thủ công | v1.2 | BR-055 |
| F42 | Group Admin gán/gỡ Chef Role | v1.2 | BR-008 |
| F43 | Multi-group cho một User | Sau | BR-056 |
| F44 | System Admin UI | Không build | BR-009, BR-059 |
| F45 | Logical Merge / canonical identity | Không build | BR-002 |
| F46 | Restore group metadata khi add lại Dish | Không build | BR-005 |
| F47 | Custom deadline | Không build | BR-055 |
| F48 | Sửa Eating History ngày cũ | Không build | BR-057 |

## 1.3 Hành vi suy giảm ở v1.0

Ba chỗ hoạt động nhưng chưa có tác dụng thật vì phụ thuộc tính năng ở v1.1. Ghi rõ ở đây để không bị nhầm là bug.

| Điểm | Ở v1.0 | Đủ nghĩa khi có |
|---|---|---|
| Thứ tự deck (SPEC-010) | Chỉ có một tín hiệu là recency penalty; chưa có preference và chưa có explore lane | F16, F18 |
| Session hết hạn | Session Active không tự đóng cuối ngày | F26 |
| Cannot Eat trong Eating History | Mọi Participant nhận đủ Dish của Final Meal | F15 |

Xem §7 về khuyến nghị điều chỉnh phạm vi.

---

# 2. Quy ước chung

## 2.1 Đặt tên

| Loại | Quy ước | Ví dụ |
|---|---|---|
| Bảng | snake_case số nhiều | `group_dishes` |
| Cột | snake_case | `decision_date` |
| Khoá chính | `id`, UUID v7 | |
| Khoá ngoại | `<entity>_id` | `session_id` |
| Enum trong DB | UPPER_SNAKE | `SWIPE_RIGHT` |
| Trường thời điểm | `_at`, UTC timestamptz | `created_at` |
| Trường ngày lịch | `_date`, date thuần | `decision_date` |
| Use case | động từ + danh từ | `startSession` |
| Mã lỗi | `ERR_` + UPPER_SNAKE | `ERR_NOT_GROUP_MEMBER` |

## 2.2 Enum

```text
SystemTag        = STAPLE | MAIN | SIDE | SOUP | DESSERT
SessionState     = DRAFT | ACTIVE | FINALIZED | INVALID
InvalidReason    = CANCELLED | TIMEOUT
InteractionType  = SWIPE_RIGHT | SWIPE_LEFT
ParticipantState = ACTIVE | COMPLETED | REMOVED
GroupRole        = MEMBER | ADMIN | CHEF
GroupDishState   = ACTIVE | INACTIVE
```

`InteractionType` không có giá trị `NONE`. Trạng thái `None` được biểu diễn bằng **không tồn tại effective interaction record**, không bằng một enum value. Undo là xoá effective record, không phải ghi một giá trị thứ ba.

## 2.3 Hợp đồng dữ liệu giữa các tầng

```text
presentation → application : DTO thuần, không chứa entity domain
application  → domain      : entity và value object
application  → infrastructure : port interface do application định nghĩa
infrastructure → application  : entity domain, không rò rỉ kiểu ORM
```

Không tầng nào trả về row ORM ra ngoài infrastructure. Không tầng nào dưới presentation biết đến HTTP.

## 2.4 Quy tắc chung cho mọi write operation

- Mọi write yêu cầu người gọi đã xác thực. Chưa xác thực → `ERR_UNAUTHENTICATED`.
- Mọi thao tác trong phạm vi Group yêu cầu người gọi là Group Member đang hoạt động → nếu không, `ERR_NOT_GROUP_MEMBER`.
- Validation đầu vào chạy trước authorization; authorization chạy trước business rule.
- Thao tác ghi thất bại không để lại thay đổi từng phần.

## 2.5 Bảng mã lỗi

| Mã | HTTP | Thông điệp người dùng |
|---|---|---|
| `ERR_UNAUTHENTICATED` | 401 | Bạn cần đăng nhập lại |
| `ERR_NOT_GROUP_MEMBER` | 403 | Bạn không thuộc nhóm này |
| `ERR_NOT_GROUP_ADMIN` | 403 | Chỉ quản trị nhóm mới làm được việc này |
| `ERR_NOT_SESSION_CREATOR` | 403 | Chỉ người tạo phiên mới làm được việc này |
| `ERR_NOT_PARTICIPANT` | 403 | Bạn không tham gia phiên này |
| `ERR_VALIDATION` | 400 | Dữ liệu không hợp lệ |
| `ERR_INVITE_INVALID` | 400 | Lời mời không hợp lệ |
| `ERR_INVITE_ALREADY_USED` | 409 | Lời mời đã được dùng |
| `ERR_ALREADY_GROUP_MEMBER` | 409 | Bạn đã ở trong nhóm này |
| `ERR_DISH_ALREADY_IN_POOL` | 409 | Món này đã có trong nhóm |
| `ERR_DISH_NOT_IN_POOL` | 409 | Món này không còn trong nhóm |
| `ERR_INVALID_SYSTEM_TAG` | 400 | Nhãn món không hợp lệ |
| `ERR_SESSION_EXISTS_TODAY` | 409 | Hôm nay nhóm đã có một phiên đang diễn ra |
| `ERR_SESSION_NOT_DRAFT` | 409 | Phiên đã bắt đầu, không sửa được phần này |
| `ERR_SESSION_NOT_ACTIVE` | 409 | Phiên không còn nhận thao tác |
| `ERR_PARTICIPANT_NOT_MEMBER` | 409 | Người này không còn thuộc nhóm |
| `ERR_PARTICIPANT_EXISTS` | 409 | Người này đã tham gia phiên |
| `ERR_DUPLICATE_DISH_IN_MEAL` | 400 | Một món chỉ được chọn một lần |
| `ERR_EMPTY_FINAL_MEAL` | 400 | Cần chọn ít nhất một món |
| `ERR_REQUIRED_RULE_FAILED` | 409 | Bữa ăn chưa đáp ứng quy định của nhóm |
| `ERR_DUPLICATE_RULE` | 409 | Nhóm đã có quy định cho nhãn món này |
| `ERR_INVALID_MINIMUM_COUNT` | 400 | Số lượng tối thiểu phải từ 1 trở lên |

---

# 3. Spec — Nền tảng

### SPEC-001 — Đăng nhập

**Nguồn:** US-001, F01

**Đầu vào:** OAuth callback từ một nhà cung cấp duy nhất
**Đầu ra:** `Session cookie` + `User`

**Hành vi:**
- Nếu chưa có User khớp `provider_subject`, tạo User mới với `display_name` và `email` từ provider.
- Nếu đã có, đăng nhập vào User đó. Không tạo bản trùng.
- `email` không được dùng làm khoá định danh; `provider_subject` mới là khoá.

**Kịch bản:**
- Given lần đầu đăng nhập, When callback hợp lệ, Then tạo đúng một User và trả cookie phiên.
- Given đã đăng nhập trước đó, When callback lại với cùng `provider_subject`, Then không tạo User mới.
- Given hai provider account khác nhau có cùng email, When cả hai đăng nhập, Then tồn tại hai User riêng biệt.

---

### SPEC-018 — Decision Date resolution

**Nguồn:** BR-020, BR-025, BR-055 (một phần)

**Đầu vào:** `groupId`, thời điểm hiện tại UTC
**Đầu ra:** `decisionDate: date`

**Hành vi:**
- Quy đổi thời điểm hiện tại sang timezone của Group rồi lấy phần ngày lịch.
- Group bắt buộc có `timezone` (IANA). Không có giá trị mặc định ẩn; tạo Group phải set.
- Mọi so sánh uniqueness dùng `decision_date` đã quy đổi, không dùng UTC date.

**Kịch bản:**
- Given Group timezone `Asia/Ho_Chi_Minh`, When thời điểm là `2026-08-14T18:30:00Z`, Then `decisionDate = 2026-08-15`.
- Given Group timezone `Asia/Ho_Chi_Minh`, When thời điểm là `2026-08-14T16:00:00Z`, Then `decisionDate = 2026-08-14`.

---

### SPEC-019 — Authorization guard

**Nguồn:** BR-006, BR-007, BR-008

**Đầu vào:** `userId`, `groupId`, `requiredRole`
**Đầu ra:** `void` | lỗi

**Hành vi:**
- `MEMBER`: người gọi phải có membership đang hoạt động trong Group.
- `ADMIN`: ngoài membership, phải có role `ADMIN`.
- Kiểm tra Creator của Session được thực hiện riêng ở từng spec, không gộp vào guard này.

**Kịch bản:**
- Given User không thuộc Group, When gọi bất kỳ thao tác Group nào, Then `ERR_NOT_GROUP_MEMBER` và không có thay đổi dữ liệu.
- Given User là Member nhưng không phải Admin, When gọi thao tác yêu cầu Admin, Then `ERR_NOT_GROUP_ADMIN`.

---

# 4. Spec — Group và Dish

### SPEC-002 — Tạo Group

**Nguồn:** US-001, F02, BR-006

**Đầu vào:** `{ name: string 1..60, timezone: IANA string }`
**Đầu ra:** `Group` | `ValidationError`

**Hành vi:**
- Người tạo trở thành Member kèm role `ADMIN`.
- `timezone` phải là IANA hợp lệ; không hợp lệ → `ERR_VALIDATION`.
- Cắt khoảng trắng thừa ở `name`; `name` rỗng sau khi cắt → `ERR_VALIDATION`.

**Kịch bản:**
- Given input hợp lệ, When tạo Group, Then người tạo là Member và có role `ADMIN`.
- Given `timezone = "Asia/Saigon_typo"`, When tạo Group, Then `ERR_VALIDATION` và không ghi DB.
- Given `name = "   "`, When tạo Group, Then `ERR_VALIDATION`.

---

### SPEC-003 — Tạo link mời

**Nguồn:** US-001, F02

**Đầu vào:** `{ groupId }`, người gọi là Group Admin
**Đầu ra:** `{ token: string, expiresAt }`

**Hành vi:**
- Token dùng một lần, ngẫu nhiên tối thiểu 128 bit, lưu dạng hash.
- Hạn dùng 7 ngày kể từ lúc tạo.
- Một Group có thể có nhiều token chưa dùng cùng lúc.

**Kịch bản:**
- Given người gọi là Admin, When tạo link mời, Then trả token và lưu bản hash, không lưu token thô.
- Given người gọi chỉ là Member, When tạo link mời, Then `ERR_NOT_GROUP_ADMIN`.

---

### SPEC-004 — Tham gia Group bằng link mời

**Nguồn:** US-001, F02, BR-006

**Đầu vào:** `{ token }`, người gọi đã đăng nhập
**Đầu ra:** `GroupMember` | lỗi

**Hành vi:**
- Token không tồn tại hoặc đã hết hạn → `ERR_INVITE_INVALID`.
- Token đã dùng → `ERR_INVITE_ALREADY_USED`.
- Người gọi đã là Member → `ERR_ALREADY_GROUP_MEMBER`, token **không** bị đánh dấu đã dùng.
- Thành công: tạo membership role `MEMBER` và đánh dấu token đã dùng trong cùng một transaction.

**Kịch bản:**
- Given token hợp lệ chưa dùng, When tham gia, Then User thành Member và token chuyển sang đã dùng.
- Given cùng token được dùng lần thứ hai, When tham gia, Then `ERR_INVITE_ALREADY_USED`.
- Given User đã là Member, When dùng token, Then `ERR_ALREADY_GROUP_MEMBER` và token vẫn dùng được cho người khác.
- Given token quá 7 ngày, When tham gia, Then `ERR_INVITE_INVALID`.

---

### SPEC-005 — Thêm Dish vào Group Dish Pool

**Nguồn:** US-002, F03, BR-001

**Đầu vào:** `{ groupId, name: string 1..120, systemTags: SystemTag[] 0..5 }`
**Đầu ra:** `GroupDish` | `{ existingCandidates: GlobalDish[] }` | lỗi

**Hành vi:**
- Chuẩn hoá tên: cắt khoảng trắng, gộp khoảng trắng liên tiếp, lowercase, bỏ dấu tiếng Việt → `normalized_name`.
- Nếu tồn tại Global Dish cùng `normalized_name`, trả về danh sách ứng viên và **không** tạo gì. Client hiển thị để User chọn dùng lại hoặc xác nhận tạo mới bằng cờ `forceCreate`.
- Với `forceCreate = true`, tạo Global Dish mới kèm provenance `created_by_user`, `created_from_group`, `created_at`.
- Dish đã Active trong Group Dish Pool → `ERR_DISH_ALREADY_IN_POOL`.
- Dish đang Inactive trong Group → chuyển lại Active, không tạo bản mới.
- `systemTags` chứa giá trị ngoài enum → `ERR_INVALID_SYSTEM_TAG`.

**Kịch bản:**
- Given chưa có Dish nào tên "Canh chua", When thêm "  Canh   Chua  ", Then tạo Global Dish với `normalized_name = "canh chua"` và thêm vào Group Dish Pool.
- Given đã có Global Dish "Canh chua", When thêm "canh chua" không có `forceCreate`, Then trả ứng viên và không tạo Dish mới.
- Given đã có Global Dish "Canh chua", When thêm với `forceCreate = true`, Then tạo Global Dish thứ hai kèm provenance.
- Given Dish đang Inactive trong Group, When thêm lại, Then relationship trở về Active và không tạo Global Dish mới.
- Given `systemTags = ["BREAKFAST"]`, When thêm, Then `ERR_INVALID_SYSTEM_TAG`.

---

### SPEC-006 — Gán System Tag trong Group

**Nguồn:** US-003, F04, BR-003, BR-008

**Đầu vào:** `{ groupId, dishId, systemTags: SystemTag[] 0..5 }`, người gọi là Group Admin
**Đầu ra:** `GroupDish` | lỗi

**Hành vi:**
- Ghi đè toàn bộ tập tag của Dish trong Group này. Không phải thao tác cộng dồn.
- Không ảnh hưởng System Tag của cùng Dish trong Group khác.
- Trùng lặp trong mảng đầu vào được khử trước khi lưu.
- Dish không thuộc Group Dish Pool đang Active → `ERR_DISH_NOT_IN_POOL`.

**Kịch bản:**
- Given Dish có tag `[MAIN]`, When set `[MAIN, SOUP]`, Then Dish có đúng hai tag.
- Given Dish có tag `[MAIN]`, When set `[]`, Then Dish không còn tag nào.
- Given cùng Dish thuộc hai Group, When đổi tag ở Group A, Then tag ở Group B không đổi.
- Given người gọi chỉ là Member, When đổi tag, Then `ERR_NOT_GROUP_ADMIN`.

---

# 5. Spec — Phiên chọn món

### SPEC-007 — Tạo Session

**Nguồn:** US-008, F05, BR-020, BR-021, BR-025

**Đầu vào:** `{ groupId }`, người gọi là Group Member
**Đầu ra:** `Session` (state `DRAFT`) | lỗi

**Hành vi:**
- `decisionDate` lấy từ SPEC-018 tại thời điểm tạo.
- Người gọi trở thành Creator và đồng thời là Participant.
- Nếu Group đã có Session `ACTIVE` hoặc `FINALIZED` cho cùng `decisionDate` → `ERR_SESSION_EXISTS_TODAY`.
- Session `DRAFT` hoặc `INVALID` đang tồn tại **không** chặn việc tạo Draft mới.

**Kịch bản:**
- Given Group chưa có Session hôm nay, When tạo, Then Session ở `DRAFT` và người tạo là Creator kiêm Participant.
- Given Group đã có Session `ACTIVE` hôm nay, When tạo, Then `ERR_SESSION_EXISTS_TODAY`.
- Given Group có Session `INVALID` hôm nay, When tạo, Then tạo được Session mới.
- Given Group có Session `FINALIZED` hôm nay, When tạo, Then `ERR_SESSION_EXISTS_TODAY`.

---

### SPEC-008 — Bắt đầu Session

**Nguồn:** US-008, F05, BR-021, BR-025

**Đầu vào:** `{ sessionId }`, người gọi là Creator
**Đầu ra:** `Session` (state `ACTIVE`) | lỗi

**Hành vi:**
Revalidate theo thứ tự, dừng ở lỗi đầu tiên:
1. Session đang ở `DRAFT`, nếu không → `ERR_SESSION_NOT_DRAFT`.
2. Người gọi là Creator, nếu không → `ERR_NOT_SESSION_CREATOR`.
3. Creator vẫn là Group Member, nếu không → `ERR_NOT_GROUP_MEMBER`.
4. Mọi Participant vẫn là Group Member, nếu không → `ERR_PARTICIPANT_NOT_MEMBER` kèm danh sách `userId` không hợp lệ.
5. Group chưa có Session `ACTIVE` hoặc `FINALIZED` cho `decisionDate` này, nếu không → `ERR_SESSION_EXISTS_TODAY`.

Chỉ khi tất cả pass: gọi SPEC-022 để snapshot Group Rule thành Session Rule, chuyển Session sang `ACTIVE` và ghi `started_at`. Cả ba việc nằm trong cùng một transaction.

**Kịch bản:**
- Given Draft hợp lệ, When Start, Then Session `ACTIVE`, `started_at` được ghi và Session Rule đã được snapshot.
- Given Start thất bại ở bước 4, When kiểm tra, Then không có Session Rule nào được tạo.
- Given một Participant đã rời Group sau khi được thêm, When Start, Then `ERR_PARTICIPANT_NOT_MEMBER` kèm `userId` đó, Session vẫn `DRAFT`.
- Given Group đã có Session khác `ACTIVE` cùng ngày, When Start Draft này, Then `ERR_SESSION_EXISTS_TODAY`.
- Given Session đã `ACTIVE`, When Start lần nữa, Then `ERR_SESSION_NOT_DRAFT`.
- Given người gọi không phải Creator, When Start, Then `ERR_NOT_SESSION_CREATOR`.

---

### SPEC-009 — Thêm Participant

**Nguồn:** US-009, F06, BR-026

**Đầu vào:** `{ sessionId, userId }`, người gọi là Creator
**Đầu ra:** `Participant` | lỗi

**Hành vi:**
- Session phải ở `DRAFT` hoặc `ACTIVE`, nếu không → `ERR_SESSION_NOT_ACTIVE`.
- `userId` phải là Group Member đang hoạt động, nếu không → `ERR_PARTICIPANT_NOT_MEMBER`.
- Đã là Participant → `ERR_PARTICIPANT_EXISTS`.
- Participant mới có `state = ACTIVE` và không có Interaction nào.
- Remove Participant không thuộc v1.0 (F25).

**Kịch bản:**
- Given Session `ACTIVE` và User là Group Member, When thêm, Then Participant `ACTIVE` với 0 Interaction.
- Given User không thuộc Group, When thêm, Then `ERR_PARTICIPANT_NOT_MEMBER`.
- Given User đã là Participant, When thêm lại, Then `ERR_PARTICIPANT_EXISTS`.
- Given Session `FINALIZED`, When thêm, Then `ERR_SESSION_NOT_ACTIVE`.

---

# 6. Spec — Duyệt món và chốt bữa

### SPEC-010 — Dựng Personal Candidate deck

**Nguồn:** US-011, F07, BR-033, BR-045, Ranking Specification §2

**Đầu vào:** `{ sessionId, userId }`
**Đầu ra:** `orderedDishIds: string[]`

**Hành vi:**
- Eligible Set = mọi Group Dish có `state = ACTIVE` của Group thuộc Session.
- `score = − w_recency × R`, trong đó `R` do SPEC-020 tính và `w_recency = 0.25`.
- Ở v1.0 đây là tín hiệu ranking duy nhất được kích hoạt. Giá trị `w_recency` không ảnh hưởng thứ tự khi chỉ có một số hạng, nhưng vẫn phải đọc từ config để F16 và F18 gắn vào không cần sửa công thức.
- Sắp giảm dần theo `score`, tie-break theo Ranking Specification §2.5:
  1. `d` lớn hơn lên trước; chưa từng ăn coi như `d = ∞`.
  2. `stable_hash(sessionId, userId, dishId)` tăng dần.
- Deck được materialize một lần cho mỗi `Session + User` và lưu lại, để thứ tự không đổi giữa các lần load.
- Explore lane chưa tồn tại ở v1.0. Hàm dựng deck phải nhận danh sách lane như tham số để F18 gắn vào mà không viết lại.

**Kịch bản:**
- Given Group có 30 Dish Active, When User mở deck lần đầu, Then deck chứa đúng 30 Dish.
- Given User mở deck lần thứ hai trong cùng Session, When so sánh, Then thứ tự giống hệt lần đầu.
- Given hai User khác nhau trong cùng Session, When so sánh deck, Then thứ tự khác nhau.
- Given User ăn Dish A hôm qua và chưa từng ăn Dish B, When dựng deck, Then Dish B xếp trước Dish A.
- Given hai User trong cùng Session có Eating History khác nhau, When dựng deck, Then thứ tự phản ánh history của từng người.

---

### SPEC-011 — Lấy trang deck

**Nguồn:** US-011, F07

**Đầu vào:** `{ sessionId, cursor: int >= 0, pageSize: 20 }`
**Đầu ra:** `{ items: DishCard[], nextCursor: int | null }`

**Hành vi:**
- `DishCard` gồm `dishId`, `name`, `systemTags`, `effectiveInteraction` hiện tại của người gọi.
- Người gọi phải là Participant `ACTIVE` hoặc `COMPLETED` của Session, nếu không → `ERR_NOT_PARTICIPANT`.
- Hết deck → `nextCursor = null`. Hệ thống không sinh thêm candidate.

**Kịch bản:**
- Given deck 30 Dish và `cursor = 0`, When lấy trang, Then trả 20 item và `nextCursor = 20`.
- Given `cursor = 20`, When lấy trang, Then trả 10 item và `nextCursor = null`.
- Given người gọi không phải Participant, When lấy trang, Then `ERR_NOT_PARTICIPANT`.

---

### SPEC-012 — Ghi Session Interaction và Undo

**Nguồn:** US-011, F08, F09, BR-040, BR-041, BR-042

**Đầu vào:** `{ sessionId, dishId, action: SWIPE_RIGHT | SWIPE_LEFT | UNDO }`
**Đầu ra:** `{ effectiveInteraction: InteractionType | null }`

**Hành vi:**
- Session phải `ACTIVE`, nếu không → `ERR_SESSION_NOT_ACTIVE`.
- Người gọi phải là Participant chưa bị remove, nếu không → `ERR_NOT_PARTICIPANT`.
- Dish phải thuộc Group Dish Pool đang Active, nếu không → `ERR_DISH_NOT_IN_POOL`.
- Mỗi `session + participant + dish` có tối đa một effective interaction. Ghi mới là upsert, không append.
- `UNDO` xoá effective interaction; kết quả trả `null`.
- Mọi thay đổi đều ghi thêm một dòng vào `interaction_events` phục vụ audit. Bảng này không được dùng cho ranking.
- Thao tác là idempotent: gửi lại cùng `action` cho cùng Dish không tạo trạng thái khác.

**Kịch bản:**
- Given chưa có interaction, When `SWIPE_RIGHT`, Then effective là `SWIPE_RIGHT` và có 1 event.
- Given effective là `SWIPE_RIGHT`, When `SWIPE_LEFT`, Then effective là `SWIPE_LEFT` và có 2 event.
- Given effective là `SWIPE_LEFT`, When `UNDO`, Then effective là `null` và có 3 event.
- Given chưa có interaction, When `UNDO`, Then effective là `null` và không lỗi.
- Given Session `FINALIZED`, When `SWIPE_RIGHT`, Then `ERR_SESSION_NOT_ACTIVE`.
- Given `SWIPE_RIGHT` được gửi hai lần liên tiếp, When kiểm tra, Then effective vẫn là `SWIPE_RIGHT`.

---

### SPEC-013 — Completed và mở lại

**Nguồn:** US-014, F10, BR-026, BR-044

**Đầu vào:** `{ sessionId, completed: boolean }`
**Đầu ra:** `Participant`

**Hành vi:**
- Chuyển `state` giữa `ACTIVE` và `COMPLETED`.
- `COMPLETED` **không** khoá Interaction. SPEC-012 vẫn chấp nhận thao tác từ Participant `COMPLETED`.
- Session phải `ACTIVE`, nếu không → `ERR_SESSION_NOT_ACTIVE`.

**Kịch bản:**
- Given Participant `ACTIVE`, When set `completed = true`, Then `state = COMPLETED`.
- Given Participant `COMPLETED`, When gửi `SWIPE_RIGHT`, Then interaction được ghi bình thường.
- Given Participant `COMPLETED`, When set `completed = false`, Then `state = ACTIVE`.
- Given Session `FINALIZED`, When set `completed`, Then `ERR_SESSION_NOT_ACTIVE`.

---

### SPEC-014 — Session Ranking

**Nguồn:** US-015, F11, BR-049, Ranking Specification §3

**Đầu vào:** `{ sessionId }`, người gọi là Creator
**Đầu ra:** `{ ranked: RankedDish[], untouched: DishSummary[] }`

**Hành vi:**
- `T` = số Participant hiện tại của Session (chưa bị remove).
- Với mỗi Dish có ít nhất một effective interaction:
  - `P` = số Participant có `SWIPE_RIGHT`, `N` = số có `SWIPE_LEFT`.
  - Ở v1.0, `X = 0` (F15 chưa có) và `H` = số Participant đã ăn Dish trong 7 ngày theo Eating History.
  - `session_score = (1.00×P − 0.70×N − 1.00×X − 0.30×H) / T`.
- Dish chưa có interaction nào đi vào `untouched`, không được cho điểm.
- Chỉ tính Dish đang Active trong Group Dish Pool.
- Trả kèm số đếm thô `P`, `N`, `X`, `H` cho từng Dish.
- Tie-break: `P` lớn hơn → `X` nhỏ hơn → interaction gần nhất mới hơn → `stable_hash(sessionId, dishId)`.

**Kịch bản:**
- Given `T = 4`, một Dish có `P = 3, N = 0, H = 0`, When tính, Then `session_score = 0.75`.
- Given `T = 4`, một Dish có `P = 3, N = 1, H = 2`, When tính, Then `session_score = 0.43` (làm tròn 2 chữ số).
- Given Creator thêm Participant thứ 5, When tính lại Dish có `P = 3, N = 0`, Then `session_score = 0.60`.
- Given một Dish chưa ai tương tác, When tính, Then nó nằm trong `untouched` và không có điểm.
- Given người gọi không phải Creator, When gọi, Then `ERR_NOT_SESSION_CREATOR`.

---

### SPEC-015 — Dựng Final Meal nháp

**Nguồn:** US-016, F12, BR-050

**Đầu vào:** `{ sessionId, dishIds: string[] }`, người gọi là Creator
**Đầu ra:** `FinalMealDraft`

**Hành vi:**
- Ghi đè toàn bộ danh sách Dish nháp, không cộng dồn.
- Mỗi Dish chỉ được xuất hiện một lần → trùng thì `ERR_DUPLICATE_DISH_IN_MEAL`.
- Mọi Dish phải Active trong Group Dish Pool → nếu không, `ERR_DISH_NOT_IN_POOL`.
- Creator được chọn Dish bất kể có ai đề xuất hay không, kể cả Dish trong `untouched`.
- Nháp không kích hoạt validation Required Rule.

**Kịch bản:**
- Given Creator chọn 3 Dish hợp lệ, When lưu nháp, Then nháp chứa đúng 3 Dish.
- Given danh sách chứa cùng một `dishId` hai lần, When lưu, Then `ERR_DUPLICATE_DISH_IN_MEAL`.
- Given một Dish vừa bị gỡ khỏi Group Dish Pool, When lưu nháp có Dish đó, Then `ERR_DISH_NOT_IN_POOL`.
- Given Creator chọn một Dish không ai swipe, When lưu, Then thành công.

---

### SPEC-016 — Finalize

**Nguồn:** US-016, F12, F13, BR-052

**Đầu vào:** `{ sessionId }`, người gọi là Creator
**Đầu ra:** `FinalMeal` | lỗi

**Hành vi:**
Chạy theo thứ tự:
1. Session phải `ACTIVE` → `ERR_SESSION_NOT_ACTIVE`.
2. Người gọi là Creator → `ERR_NOT_SESSION_CREATOR`.
3. Nháp không rỗng → `ERR_EMPTY_FINAL_MEAL`.
4. Revalidate mọi Dish vẫn Active trong Group Dish Pool **tại thời điểm này** → `ERR_DISH_NOT_IN_POOL`.
5. Đánh giá Required Rule của **Session Rule đã snapshot** trên tập Dish, dùng System Tag **hiện tại** của Group. System Tag không snapshot theo Session (BR-052).
6. Nếu Required Rule fail → `ERR_REQUIRED_RULE_FAILED` kèm danh sách rule chưa đạt. **Session vẫn `ACTIVE`**, không tạo state mới.
7. Thành công: tạo Final Meal, chuyển Session sang `FINALIZED`, gọi SPEC-017 trong cùng transaction.

Session `FINALIZED` không reopen.

**Kịch bản:**
- Given nháp có 3 Dish hợp lệ, When Finalize, Then Final Meal được tạo và Session `FINALIZED`.
- Given nháp rỗng, When Finalize, Then `ERR_EMPTY_FINAL_MEAL` và Session vẫn `ACTIVE`.
- Given một Dish bị Admin gỡ khỏi Group Dish Pool sau khi lưu nháp, When Finalize, Then `ERR_DISH_NOT_IN_POOL` và Session vẫn `ACTIVE`.
- Given Session đã `FINALIZED`, When Finalize lần nữa, Then `ERR_SESSION_NOT_ACTIVE`.
- Given Final Meal được tạo, When kiểm tra Eating History, Then record đã tồn tại trong cùng transaction.
- Given Session Rule có `Required SOUP >= 1` và nháp không có Dish nào mang tag `SOUP`, When Finalize, Then `ERR_REQUIRED_RULE_FAILED` kèm rule đó và Session vẫn `ACTIVE`.
- Given Session Rule có `Required MAIN >= 1` và `Required SOUP >= 1`, và nháp có đúng một Dish mang cả hai tag, When Finalize, Then thành công.
- Given Admin đổi Group Rule sau khi Session đã Start, When Finalize, Then validate theo Session Rule đã snapshot, không theo Group Rule mới.
- Given Admin đổi System Tag của một Dish sau khi Session đã Start, When Finalize, Then validate theo System Tag mới.

---

### SPEC-017 — Sinh Default Eating History

**Nguồn:** US-018, F14, BR-056

**Đầu vào:** `FinalMeal`
**Đầu ra:** `EatingHistoryRecord[]`

**Hành vi:**
- Với mỗi Participant hiện tại và mỗi Dish trong Final Meal, tạo một record với `eating_date = session.decision_date`.
- Mỗi record giữ `source_final_meal_id`.
- Ở v1.0 không có ngoại lệ `Cannot Eat` (F15 chưa có); khi F15 vào, bước lọc được thêm ở đây.
- Không tạo record cho Session `INVALID`.
- Idempotent theo `finalMealId`: gọi lại không nhân đôi record.

**Kịch bản:**
- Given Final Meal 3 Dish và 4 Participant, When sinh history, Then tạo đúng 12 record.
- Given cùng `finalMealId` được xử lý hai lần, When kiểm tra, Then vẫn 12 record.
- Given `decision_date = 2026-08-14`, When kiểm tra record, Then `eating_date = 2026-08-14` bất kể giờ UTC lúc finalize.

---

# 7. Spec — Cooldown và Rule

### SPEC-020 — Tính recency penalty

**Nguồn:** F17, BR-046, Ranking Specification §2.2

**Đầu vào:** `{ userId, dishId, referenceDate }`
**Đầu ra:** `R: number` trong `[0, 1]`

**Hành vi:**
- `d` = số ngày lịch giữa `referenceDate` và ngày ăn gần nhất của cặp `User + Dish` trong Effective Eating History.
- `R = max(0, 1 − d / 7)`.
- Chưa từng ăn → `R = 0`.
- Nhiều Eating History record cho cùng `User + Dish + Date` được collapse thành một eating event trước khi tính `d`.
- Hàm thuần, không truy cập trạng thái ngoài dữ liệu đầu vào, để test không cần dựng Session.
- Ở v1.0 chưa có Whitelist (F32); khi có, bước đầu tiên là trả `R = 0` nếu Dish được whitelist.

**Kịch bản:**
- Given ăn hôm nay, When tính với `referenceDate` là hôm nay, Then `R = 1.0`.
- Given ăn 3 ngày trước, When tính, Then `R ≈ 0.57`.
- Given ăn đúng 7 ngày trước, When tính, Then `R = 0`.
- Given ăn 20 ngày trước, When tính, Then `R = 0`.
- Given chưa từng ăn, When tính, Then `R = 0`.
- Given có hai record cùng Dish cùng ngày từ hai Final Meal, When tính, Then kết quả giống như chỉ có một record.

---

### SPEC-021 — Cấu hình Group Rule

**Nguồn:** F20, BR-010, BR-012, BR-013

**Đầu vào:** `{ groupId, rules: [{ systemTag: SystemTag, minimumCount: int, ruleType: REQUIRED }] }`, người gọi là Group Admin
**Đầu ra:** `GroupRuleSet` | lỗi

**Hành vi:**
- Ghi đè toàn bộ rule set của Group. Không phải thao tác cộng dồn.
- `minimumCount` phải `>= 1`, nếu không → `ERR_INVALID_MINIMUM_COUNT`.
- Không được có hai rule cùng `ruleType + systemTag` → `ERR_DUPLICATE_RULE`.
- `systemTag` ngoài enum → `ERR_INVALID_SYSTEM_TAG`.
- Ở v1.0 chỉ hỗ trợ `ruleType = REQUIRED`. Cột `rule_type` và cột `overridable` vẫn tồn tại trong schema để F22 và F35 gắn vào không cần migration.
- Rule set rỗng là hợp lệ và có nghĩa là nhóm không đặt quy định nào.
- Thay đổi Group Rule **không** ảnh hưởng Session đang chạy.

**Kịch bản:**
- Given Admin đặt `REQUIRED SOUP >= 1`, When lưu, Then Group Rule Set chứa đúng một rule.
- Given `minimumCount = 0`, When lưu, Then `ERR_INVALID_MINIMUM_COUNT` và rule set cũ không đổi.
- Given hai rule cùng `REQUIRED + MAIN`, When lưu, Then `ERR_DUPLICATE_RULE`.
- Given Group đang có 2 rule, When lưu danh sách rỗng, Then Group không còn rule nào.
- Given người gọi chỉ là Member, When lưu, Then `ERR_NOT_GROUP_ADMIN`.
- Given một Session đang `ACTIVE`, When Admin đổi Group Rule, Then Session Rule của Session đó không đổi.

---

### SPEC-022 — Snapshot Session Rule

**Nguồn:** F21, BR-015, BR-016

**Đầu vào:** `{ sessionId }`, gọi từ bên trong SPEC-008
**Đầu ra:** `SessionRuleSet`

**Hành vi:**
- Copy toàn bộ Group Rule đang hiệu lực thành Session Rule gắn với `sessionId`.
- Snapshot là bản sao giá trị, không phải tham chiếu tới Group Rule.
- Group Rule rỗng → Session Rule rỗng, không phải lỗi.
- Snapshot chỉ chạy đúng một lần cho mỗi Session, tại thời điểm Start.
- Ở v1.0 Creator không sửa được Session Rule (F35 ở v1.2), nên Session Rule bất biến sau khi tạo.

**Kịch bản:**
- Given Group có 2 rule, When Start Session, Then Session Rule chứa đúng 2 rule với cùng giá trị.
- Given Group không có rule nào, When Start Session, Then Session Rule rỗng và Session vẫn `ACTIVE`.
- Given Session đã snapshot, When Admin sửa Group Rule, Then Session Rule không đổi.
- Given Session đã `ACTIVE`, When gọi snapshot lần nữa, Then không tạo bản sao thứ hai.

---

# 8. Điểm cần bạn quyết trước khi sang Tech Spec

Hai phụ thuộc ngược đã được giải quyết ở v0.2: F13 nay có F20 và F21 đi kèm, F07 nay có tín hiệu cooldown thật từ F17.

Còn lại hai điểm, không chặn Tech Spec nhưng ảnh hưởng thứ tự build ở phase 9.

1. **Không có F26 thì Session Active không tự đóng.** Session hôm qua vẫn ở `ACTIVE` mãi. Nó không chặn tạo Session hôm nay vì uniqueness tính theo `decision_date`, nhưng sẽ tích tụ rác và làm Session Ranking của ngày cũ vẫn truy cập được. Một cron job đóng Session quá hạn tốn rất ít công và nên cân nhắc kéo vào v1.0.

2. **F15 Cannot Eat vẫn ở v1.1.** Hệ quả trực tiếp: SPEC-017 ghi Eating History cho mọi Participant với mọi Dish trong Final Meal, kể cả món họ không ăn được. Dữ liệu sai này sau đó nuôi cooldown ở SPEC-020. Ở v1.0 với một nhóm gia đình tự biết nhau thì chấp nhận được, nhưng nó là món nợ dữ liệu chứ không chỉ là tính năng thiếu.

---

# 9. Change History

| Version | Date | Section | Change | Reason / Decision |
|---|---|---|---|---|
| 0.2 | 2026-08-14 | §1, §6, §7 | Kéo F17, F20 và phụ thuộc F21 vào v1.0; thêm SPEC-020, SPEC-021, SPEC-022; kích hoạt cooldown trong SPEC-010 và Session Rule trong SPEC-016 | Quyết định của người dùng |
| 0.1 | 2026-08-14 | Toàn bộ | Bản draft đầu tiên: 19 spec cho 14 tính năng v1.0, kèm bảng phủ toàn bộ 48 tính năng | Phase 6.2 |
