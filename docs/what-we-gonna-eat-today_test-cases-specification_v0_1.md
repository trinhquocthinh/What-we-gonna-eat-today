# Test Cases Specification — What We Gonna Eat Today

## Version 0.1

**Status:** Draft — Awaiting review
**Created:** 2026-08-14
**Upstream:** SDD v0.2, Tech Spec & Architecture v0.2, Business Rules v1.6

Phạm vi: **v1.0 — 17 tính năng, 22 SPEC**.

94 test case đầu ánh xạ **1–1** với 94 kịch bản trong SDD v0.2. 18 test case sau là biên và trường hợp âm không có trong SDD. Tổng 112 test case tự động, cộng 5 kịch bản khói thủ công.

Ký hiệu tầng: `D` domain unit không mock, `A` application unit mock port, `I` integration chạm database thật.

---

# 1. Quy ước

## 1.1 Tổ chức file

File test đặt cạnh file nguồn: `ranking.ts` → `ranking.test.ts`. Xoá feature thì test biến mất cùng.

```
src/features/selection/domain/ranking.ts
src/features/selection/domain/ranking.test.ts
src/features/selection/application/build-deck.ts
src/features/selection/application/build-deck.test.ts
src/features/selection/infrastructure/deck-repository.integration.test.ts
```

Test integration đặt hậu tố `.integration.test.ts` để tách được bằng `vitest --exclude`. Chúng cần database và chậm hơn nhiều lần.

## 1.2 Đặt tên

```ts
describe('SPEC-020 computeRecencyPenalty', () => {
  it('TC-079: trả 1.0 khi ăn cùng ngày', () => {})
  it('TC-081: trả 0 khi ăn đúng 7 ngày trước', () => {})
})
```

Mỗi `it` mở đầu bằng TC-ID. Test đỏ trên CI phải tra ngược được về tài liệu này mà không cần đọc code.

## 1.3 Mock

- `domain/` **không mock gì**. Nếu một hàm domain cần mock, nó đã bị đặt sai tầng.
- `application/` mock port bằng object thuần, không dùng thư viện auto-mock. Port là interface do chính tầng này định nghĩa nên viết tay rất ngắn.
- `infrastructure/` không mock database. Dùng Neon branch riêng cho test, xoá sạch bảng giữa các test.
- Không mock `Date`. Mọi hàm phụ thuộc thời gian nhận `now` hoặc `referenceDate` làm tham số. Đây là lý do SPEC-018 và SPEC-020 test được dễ dàng.

## 1.4 Dữ liệu mẫu

Một factory duy nhất cho mỗi entity, đặt ở `src/shared/testing/factories.ts`:

```ts
makeGroup({ timezone: 'Asia/Ho_Chi_Minh' })
makeGroupDish({ systemTags: ['MAIN'] })
makeSession({ state: 'ACTIVE' })
```

Factory nhận override từng phần và tự sinh phần còn lại. Không viết object đầy đủ trong từng test — khi schema đổi, sửa một chỗ.

Dữ liệu mẫu dùng tên món tiếng Việt có dấu thật (`Cá basa kho tiêu`, `Canh chua cá lóc`), vì chuẩn hoá bỏ dấu ở SPEC-005 là chỗ dễ sai nhất và test với `foo`/`bar` sẽ không phát hiện được.

## 1.5 Ngưỡng coverage

| Tầng | Ngưỡng |
|---|---|
| `domain/` | 80% dòng, ép trong CI |
| `application/` | 80% dòng, ép trong CI |
| `infrastructure/` | Không ngưỡng |
| `presentation/` | Không ngưỡng |

Không ép coverage ở `presentation/` vì nó chỉ sinh ra test rác chạy qua component để lấy số.

## 1.6 Sai lệch có chủ ý so với tỉ lệ đề xuất

| Tầng | Đề xuất | Thực tế v1.0 |
|---|---|---|
| Unit | ~70% | 81 / 112 = 72% |
| Integration | ~25% | 31 / 112 = 28% |
| E2E tự động | ~5% | **0** |

Tech Spec §1 quyết định không dùng Playwright ở v1.0. Phần 5% e2e được thay bằng **5 kịch bản khói thủ công** ở §4, gắn với cột mốc M2 và M6 trong Plan & Scope. Đây là sai lệch có ý thức: luồng chính sẽ được người dùng thật chạy mỗi ngày, nên phản hồi đến nhanh hơn nhiều so với chi phí bảo trì một bộ e2e giòn.

Nếu v1.1 thêm `Cannot Eat` và Personal Correction — hai thứ có thể làm **hỏng dữ liệu âm thầm** thay vì gây lỗi — thì quyết định này phải được xem lại.

---

# 2. Test case ánh xạ từ SDD

## SPEC-001 — Đăng nhập · F01

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-001 | happy | A | Chưa có User nào | Callback OAuth hợp lệ | Tạo đúng một User, trả cookie phiên |
| TC-002 | happy | A | Đã có User với `provider_subject` X | Callback lại với X | Không tạo User mới |
| TC-003 | biên | A | Hai provider account cùng email | Cả hai đăng nhập | Tồn tại hai User riêng biệt |

## SPEC-018 — Decision Date resolution · BR-020

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-004 | biên | D | Group timezone `Asia/Ho_Chi_Minh` | Thời điểm `2026-08-14T18:30:00Z` | `decisionDate = 2026-08-15` |
| TC-005 | biên | D | Group timezone `Asia/Ho_Chi_Minh` | Thời điểm `2026-08-14T16:00:00Z` | `decisionDate = 2026-08-14` |

## SPEC-019 — Authorization guard · BR-006, BR-008

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-006 | âm | A | User không thuộc Group | Gọi thao tác Group bất kỳ | `ERR_NOT_GROUP_MEMBER`, không thay đổi dữ liệu |
| TC-007 | âm | A | User là Member không phải Admin | Gọi thao tác cần Admin | `ERR_NOT_GROUP_ADMIN` |

## SPEC-002 — Tạo Group · BR-006

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-008 | happy | A | Đã đăng nhập | Tạo Group hợp lệ | Người tạo là Member và có `is_admin` |
| TC-009 | âm | A | — | `timezone = "Asia/Saigon_typo"` | `ERR_VALIDATION`, không ghi DB |
| TC-010 | âm | A | — | `name = "   "` | `ERR_VALIDATION` |

## SPEC-003 — Tạo link mời · F02

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-011 | happy | A | Người gọi là Admin | Tạo link mời | Trả token, DB lưu bản hash, không lưu token thô |
| TC-012 | âm | A | Người gọi chỉ là Member | Tạo link mời | `ERR_NOT_GROUP_ADMIN` |

## SPEC-004 — Tham gia bằng link mời · BR-006

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-013 | happy | I | Token hợp lệ chưa dùng | Tham gia | Thành Member, token đánh dấu đã dùng, cùng transaction |
| TC-014 | âm | I | Token đã dùng | Tham gia lần hai | `ERR_INVITE_ALREADY_USED` |
| TC-015 | âm | I | User đã là Member | Dùng token | `ERR_ALREADY_GROUP_MEMBER`, token **vẫn dùng được** cho người khác |
| TC-016 | biên | A | Token tạo 8 ngày trước | Tham gia | `ERR_INVITE_INVALID` |

## SPEC-005 — Thêm Dish · BR-001

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-017 | happy | A | Chưa có Dish nào | Thêm `"  Canh   Chua  "` | Tạo Global Dish, `normalized_name = "canh chua"` |
| TC-018 | happy | A | Đã có Global Dish `Canh chua` | Thêm `"canh chua"`, không `forceCreate` | Trả ứng viên, không tạo Dish |
| TC-019 | happy | A | Đã có Global Dish `Canh chua` | Thêm với `forceCreate = true` | Tạo Global Dish thứ hai kèm provenance |
| TC-020 | happy | I | Dish đang `INACTIVE` trong Group | Thêm lại | Chuyển `ACTIVE`, không tạo Global Dish mới |
| TC-021 | âm | A | — | `systemTags = ["BREAKFAST"]` | `ERR_INVALID_SYSTEM_TAG` |

## SPEC-006 — Gán System Tag · BR-003, BR-008

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-022 | happy | A | Dish có `[MAIN]` | Set `[MAIN, SOUP]` | Dish có đúng hai tag |
| TC-023 | biên | A | Dish có `[MAIN]` | Set `[]` | Dish không còn tag nào |
| TC-024 | happy | I | Cùng Dish ở hai Group | Đổi tag ở Group A | Tag ở Group B không đổi |
| TC-025 | âm | A | Người gọi là Member | Đổi tag | `ERR_NOT_GROUP_ADMIN` |

## SPEC-007 — Tạo Session · BR-020, BR-025

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-026 | happy | A | Chưa có Session hôm nay | Tạo | `DRAFT`, người tạo là Creator kiêm Participant |
| TC-027 | âm | I | Đã có Session `ACTIVE` hôm nay | Tạo | `ERR_SESSION_EXISTS_TODAY` |
| TC-028 | happy | I | Có Session `INVALID` hôm nay | Tạo | Tạo được Session mới |
| TC-029 | âm | I | Đã có Session `FINALIZED` hôm nay | Tạo | `ERR_SESSION_EXISTS_TODAY` |

## SPEC-008 — Bắt đầu Session · BR-021, BR-025

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-030 | happy | I | Draft hợp lệ | Start | `ACTIVE`, `started_at` ghi, Session Rule đã snapshot |
| TC-031 | âm | A | Một Participant đã rời Group | Start | `ERR_PARTICIPANT_NOT_MEMBER` kèm `userId`, giữ `DRAFT` |
| TC-032 | âm | I | Group đã có Session khác `ACTIVE` cùng ngày | Start Draft này | `ERR_SESSION_EXISTS_TODAY` |
| TC-033 | âm | A | Session đã `ACTIVE` | Start lần nữa | `ERR_SESSION_NOT_DRAFT` |
| TC-034 | âm | A | Người gọi không phải Creator | Start | `ERR_NOT_SESSION_CREATOR` |
| TC-035 | lỗi | I | Start thất bại ở bước 4 | Kiểm tra DB | Không có Session Rule nào được tạo |

## SPEC-009 — Thêm Participant · BR-026

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-036 | happy | A | Session `ACTIVE`, User là Member | Thêm | Participant `ACTIVE`, 0 Interaction |
| TC-037 | âm | A | User không thuộc Group | Thêm | `ERR_PARTICIPANT_NOT_MEMBER` |
| TC-038 | âm | I | User đã là Participant | Thêm lại | `ERR_PARTICIPANT_EXISTS` |
| TC-039 | âm | A | Session `FINALIZED` | Thêm | `ERR_SESSION_NOT_ACTIVE` |

## SPEC-010 — Dựng deck · BR-033, BR-045

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-040 | happy | A | Group có 30 Dish `ACTIVE` | Mở deck lần đầu | Deck chứa đúng 30 Dish |
| TC-041 | happy | A | Đã dựng deck | Mở lần thứ hai cùng Session | Thứ tự giống hệt |
| TC-042 | happy | D | Hai User cùng Session | So sánh deck | Thứ tự khác nhau |
| TC-043 | happy | D | User ăn Dish A hôm qua, chưa từng ăn Dish B | Dựng deck | Dish B xếp trước Dish A |
| TC-044 | happy | A | Hai User có Eating History khác nhau | Dựng deck | Thứ tự phản ánh history từng người |

## SPEC-011 — Lấy trang deck · F07

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-045 | happy | A | Deck 30 Dish | `cursor = 0` | 20 item, `nextCursor = 20` |
| TC-046 | biên | A | Deck 30 Dish | `cursor = 20` | 10 item, `nextCursor = null` |
| TC-047 | âm | A | Người gọi không phải Participant | Lấy trang | `ERR_NOT_PARTICIPANT` |

## SPEC-012 — Interaction và Undo · BR-040, BR-041, BR-042

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-048 | happy | A | Chưa có interaction | `SWIPE_RIGHT` | Effective `SWIPE_RIGHT`, 1 event |
| TC-049 | happy | A | Effective `SWIPE_RIGHT` | `SWIPE_LEFT` | Effective `SWIPE_LEFT`, 2 event |
| TC-050 | happy | A | Effective `SWIPE_LEFT` | `UNDO` | Effective `null`, 3 event |
| TC-051 | biên | A | Chưa có interaction | `UNDO` | Effective `null`, không lỗi |
| TC-052 | âm | A | Session `FINALIZED` | `SWIPE_RIGHT` | `ERR_SESSION_NOT_ACTIVE` |
| TC-053 | biên | I | — | `SWIPE_RIGHT` hai lần liên tiếp | Effective vẫn `SWIPE_RIGHT`, idempotent |

## SPEC-013 — Completed · BR-026, BR-044

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-054 | happy | A | Participant `ACTIVE` | `completed = true` | `state = COMPLETED` |
| TC-055 | happy | A | Participant `COMPLETED` | Gửi `SWIPE_RIGHT` | Interaction ghi bình thường |
| TC-056 | happy | A | Participant `COMPLETED` | `completed = false` | `state = ACTIVE` |
| TC-057 | âm | A | Session `FINALIZED` | Set `completed` | `ERR_SESSION_NOT_ACTIVE` |

## SPEC-014 — Session Ranking · BR-049

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-058 | happy | D | `T=4`, Dish có `P=3, N=0, H=0` | Tính | `session_score = 0.75` |
| TC-059 | happy | D | `T=4`, Dish có `P=3, N=1, H=2` | Tính | `session_score = 0.43` |
| TC-060 | biên | D | Thêm Participant thứ 5, Dish có `P=3, N=0` | Tính lại | `session_score = 0.60` |
| TC-061 | biên | A | Dish chưa ai tương tác | Tính | Nằm trong `untouched`, không có điểm |
| TC-062 | âm | A | Người gọi không phải Creator | Gọi | `ERR_NOT_SESSION_CREATOR` |

## SPEC-015 — Final Meal nháp · BR-050

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-063 | happy | A | Creator, 3 Dish hợp lệ | Lưu nháp | Nháp chứa đúng 3 Dish |
| TC-064 | âm | A | Danh sách trùng `dishId` | Lưu | `ERR_DUPLICATE_DISH_IN_MEAL` |
| TC-065 | âm | I | Dish vừa bị gỡ khỏi pool | Lưu nháp có Dish đó | `ERR_DISH_NOT_IN_POOL` |
| TC-066 | happy | A | Dish không ai swipe | Lưu | Thành công |

## SPEC-016 — Finalize · BR-052

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-067 | happy | I | Nháp 3 Dish hợp lệ | Finalize | Final Meal tạo, Session `FINALIZED` |
| TC-068 | âm | A | Nháp rỗng | Finalize | `ERR_EMPTY_FINAL_MEAL`, giữ `ACTIVE` |
| TC-069 | âm | I | Dish bị gỡ sau khi lưu nháp | Finalize | `ERR_DISH_NOT_IN_POOL`, giữ `ACTIVE` |
| TC-070 | âm | A | Session `FINALIZED` | Finalize lần nữa | `ERR_SESSION_NOT_ACTIVE` |
| TC-071 | happy | I | Finalize thành công | Kiểm tra Eating History | Record tồn tại trong cùng transaction |
| TC-072 | âm | D | Rule `REQUIRED SOUP >= 1`, nháp không có `SOUP` | Finalize | `ERR_REQUIRED_RULE_FAILED` kèm rule, giữ `ACTIVE` |
| TC-073 | biên | D | Rule `MAIN >= 1` và `SOUP >= 1`, một Dish mang cả hai tag | Finalize | Thành công — independent tag counting |
| TC-074 | happy | I | Admin đổi Group Rule sau khi Start | Finalize | Validate theo Session Rule đã snapshot |
| TC-075 | happy | I | Admin đổi System Tag sau khi Start | Finalize | Validate theo System Tag **mới** |

## SPEC-017 — Default Eating History · BR-056

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-076 | happy | A | Final Meal 3 Dish, 4 Participant | Sinh history | Đúng 12 record |
| TC-077 | biên | I | Cùng `finalMealId` xử lý hai lần | Kiểm tra | Vẫn 12 record, idempotent |
| TC-078 | biên | A | `decision_date = 2026-08-14` | Kiểm tra record | `eating_date = 2026-08-14` bất kể giờ UTC |

## SPEC-020 — Recency penalty · BR-046

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-079 | biên | D | Ăn hôm nay | Tính | `R = 1.0` |
| TC-080 | happy | D | Ăn 3 ngày trước | Tính | `R ≈ 0.57` |
| TC-081 | biên | D | Ăn đúng 7 ngày trước | Tính | `R = 0` |
| TC-082 | biên | D | Ăn 20 ngày trước | Tính | `R = 0` |
| TC-083 | biên | D | Chưa từng ăn | Tính | `R = 0` |
| TC-084 | biên | D | Hai record cùng Dish cùng ngày, hai Final Meal | Tính | Kết quả như chỉ có một record |

## SPEC-021 — Cấu hình Group Rule · BR-010, BR-012, BR-013

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-085 | happy | A | Admin | Đặt `REQUIRED SOUP >= 1` | Rule set chứa đúng một rule |
| TC-086 | âm | I | — | `minimumCount = 0` | `ERR_INVALID_MINIMUM_COUNT`, rule set cũ không đổi |
| TC-087 | âm | I | — | Hai rule cùng `REQUIRED + MAIN` | `ERR_DUPLICATE_RULE` |
| TC-088 | biên | A | Group đang có 2 rule | Lưu danh sách rỗng | Group không còn rule nào |
| TC-089 | âm | A | Người gọi là Member | Lưu | `ERR_NOT_GROUP_ADMIN` |
| TC-090 | happy | I | Một Session đang `ACTIVE` | Admin đổi Group Rule | Session Rule của Session đó không đổi |

## SPEC-022 — Snapshot Session Rule · BR-015, BR-016

| TC | Loại | Tầng | Tiền điều kiện | Bước | Kỳ vọng |
|---|---|---|---|---|---|
| TC-091 | happy | I | Group có 2 rule | Start Session | Session Rule chứa đúng 2 rule cùng giá trị |
| TC-092 | biên | I | Group không có rule nào | Start Session | Session Rule rỗng, Session vẫn `ACTIVE` |
| TC-093 | happy | I | Session đã snapshot | Admin sửa Group Rule | Session Rule không đổi |
| TC-094 | biên | I | Session đã `ACTIVE` | Gọi snapshot lần nữa | Không tạo bản sao thứ hai |

---

# 3. Test case bổ sung — biên và trường hợp âm

Không có trong SDD. Chúng đến từ ràng buộc schema, giới hạn đầu vào và các rủi ro trong Tech Spec §9.

| TC | Nguồn | Loại | Tầng | Nội dung | Kỳ vọng |
|---|---|---|---|---|---|
| TC-095 | SPEC-002 | biên | A | `name` dài 60 ký tự | Chấp nhận |
| TC-096 | SPEC-002 | âm | A | `name` dài 61 ký tự | `ERR_VALIDATION` |
| TC-097 | SPEC-005 | biên | A | Tên Dish dài 120 ký tự | Chấp nhận |
| TC-098 | SPEC-005 | biên | A | Hai tên chỉ khác dấu: `Ca kho` và `Cá kho` | Cùng `normalized_name`, bị coi là trùng |
| TC-099 | SPEC-005 | âm | I | Thêm Dish đã `ACTIVE` trong Group | `ERR_DISH_ALREADY_IN_POOL` |
| TC-100 | SPEC-006 | biên | A | `systemTags` 5 giá trị khác nhau | Chấp nhận |
| TC-101 | SPEC-006 | biên | A | `systemTags` có giá trị lặp | Khử trùng trước khi lưu |
| TC-102 | SPEC-010 | biên | A | Group có 0 Dish `ACTIVE` | Deck rỗng, không lỗi |
| TC-103 | SPEC-011 | âm | A | `cursor` âm | `ERR_VALIDATION` |
| TC-104 | SPEC-011 | biên | A | `cursor` lớn hơn kích thước deck | 0 item, `nextCursor = null` |
| TC-105 | SPEC-012 | âm | A | Swipe Dish không thuộc Group Dish Pool | `ERR_DISH_NOT_IN_POOL` |
| TC-106 | R-04 | biên | A | Hai swipe cùng Dish, bản đến sau có timestamp cũ hơn | Server bỏ qua bản đến muộn, giữ bản mới hơn |
| TC-107 | R-03 | lỗi | I | Hai lệnh Start đồng thời cho hai Draft cùng `group + date` | Đúng một thành công; bên kia nhận `ERR_SESSION_EXISTS_TODAY` |
| TC-108 | R-02 | biên | I | Dish bị gỡ sau khi deck đã materialize | Không xuất hiện ở trang đọc sau đó |
| TC-109 | SPEC-016 | lỗi | I | `INSERT eating_history` thất bại giữa transaction | Session **không** chuyển `FINALIZED`, không có Final Meal |
| TC-110 | SPEC-016 | biên | D | Nháp 1 Dish, rule set rỗng | Finalize thành công |
| TC-111 | SPEC-014 | biên | D | `T = 1`, Dish có `P = 1` | `session_score = 1.0`, không chia cho 0 |
| TC-112 | SPEC-004 | biên | A | Token hết hạn đúng thời điểm `expires_at` | `ERR_INVITE_INVALID` — biên đóng |

Ba test đáng chú ý nhất trong nhóm này:

- **TC-107** là test duy nhất chứng minh partial unique index thực sự hoạt động. Nó phải chạy hai transaction song song thật, không phải gọi hàm hai lần tuần tự.
- **TC-109** chứng minh transaction ở SPEC-016 bao trọn bốn lệnh ghi. Không có nó thì `INSERT` thứ ba thất bại sẽ để lại một Session `FINALIZED` không có lịch sử ăn.
- **TC-098** là lý do dữ liệu mẫu phải dùng tiếng Việt có dấu thật.

---

# 4. Kịch bản khói thủ công

Thay cho e2e tự động. Chạy trước mỗi lần deploy production, trên **điện thoại thật**, mạng di động không phải wifi.

| ID | Gắn với | Kịch bản | Đạt nghĩa là |
|---|---|---|---|
| MS-01 | M2 | Tạo nhóm, thêm 5 món, mở phiên, vuốt hết, chốt bữa | Thấy Final Meal và lịch sử ăn của chính mình |
| MS-02 | M3 | Người thứ hai vào bằng link mời, cùng vuốt trong một phiên | Creator thấy số đếm của cả hai trong Session Ranking |
| MS-03 | M4 | Chốt bữa hôm nay, hôm sau mở phiên mới | Món hôm qua nằm dưới trong deck |
| MS-04 | M5 | Đặt rule `phải có canh`, chốt bữa không có canh | Bị chặn, thông báo nêu rõ thiếu gì |
| MS-05 | NFR-01 | Mở app lần đầu trong ngày sau khi Neon đã ngủ | Deck hiện trong 2.5 giây |

MS-05 là kịch bản duy nhất kiểm chứng R-01. Nó phải chạy sau ít nhất 10 phút không ai dùng app, nếu không compute vẫn đang thức và số đo vô nghĩa.

---

# 5. Traceability

## 5.1 SPEC → TC

Cả 22 SPEC đều có ít nhất một TC.

| SPEC | TC |
|---|---|
| SPEC-001 | TC-001 → TC-003 |
| SPEC-002 | TC-008 → TC-010, TC-095, TC-096 |
| SPEC-003 | TC-011, TC-012 |
| SPEC-004 | TC-013 → TC-016, TC-112 |
| SPEC-005 | TC-017 → TC-021, TC-097 → TC-099 |
| SPEC-006 | TC-022 → TC-025, TC-100, TC-101 |
| SPEC-007 | TC-026 → TC-029 |
| SPEC-008 | TC-030 → TC-035, TC-107 |
| SPEC-009 | TC-036 → TC-039 |
| SPEC-010 | TC-040 → TC-044, TC-102, TC-108 |
| SPEC-011 | TC-045 → TC-047, TC-103, TC-104 |
| SPEC-012 | TC-048 → TC-053, TC-105, TC-106 |
| SPEC-013 | TC-054 → TC-057 |
| SPEC-014 | TC-058 → TC-062, TC-111 |
| SPEC-015 | TC-063 → TC-066 |
| SPEC-016 | TC-067 → TC-075, TC-109, TC-110 |
| SPEC-017 | TC-076 → TC-078 |
| SPEC-018 | TC-004, TC-005 |
| SPEC-019 | TC-006, TC-007 |
| SPEC-020 | TC-079 → TC-084 |
| SPEC-021 | TC-085 → TC-090 |
| SPEC-022 | TC-091 → TC-094 |

## 5.2 BR-ID → TC

Chỉ liệt kê 29 BR-ID nằm trong phạm vi v1.0. 32 BR-ID còn lại thuộc tính năng ở v1.1 và v1.2; chúng chưa có TC vì chưa có code, và đây là khoảng trống **có chủ ý**, không phải bỏ sót.

| BR-ID | Chủ đề | TC |
|---|---|---|
| BR-001 | Global Dish Pool | TC-017 → TC-019, TC-098, TC-099 |
| BR-003 | System Tag | TC-021 → TC-025, TC-100, TC-101 |
| BR-005 | Group Dish Pool | TC-020, TC-065, TC-069, TC-108 |
| BR-006 | Group Membership Model | TC-006, TC-008, TC-013 |
| BR-007 | Quyền Group Member | TC-012, TC-025, TC-089 |
| BR-008 | Quyền Group Admin | TC-007, TC-011, TC-024 |
| BR-010 | Group Rule | TC-085, TC-088 |
| BR-012 | Tag Rule Structure | TC-086, TC-087, TC-073 |
| BR-013 | Required Rule | TC-072, TC-073, TC-110 |
| BR-015 | Session Rule | TC-091 → TC-093, TC-074 |
| BR-016 | Draft Editing | TC-090, TC-094 |
| BR-020 | Session Lifecycle | TC-004, TC-005, TC-026 |
| BR-021 | Draft | TC-030 → TC-035 |
| BR-022 | Active | TC-036, TC-052, TC-055 |
| BR-023 | Finalized | TC-067, TC-070 |
| BR-025 | Session Uniqueness | TC-027 → TC-029, TC-032, TC-107 |
| BR-026 | Participant Lifecycle | TC-036 → TC-039, TC-054 |
| BR-033 | Candidate Discovery | TC-040, TC-042, TC-102 |
| BR-039 | User Interaction | TC-048 → TC-051 |
| BR-040 | Effective Interaction | TC-048 → TC-053, TC-106 |
| BR-041 | Swipe Right | TC-048, TC-053 |
| BR-042 | Swipe Left | TC-049 |
| BR-044 | Session Participation | TC-054 → TC-057 |
| BR-045 | Personal Ranking | TC-043, TC-044 |
| BR-046 | History Cooldown | TC-079 → TC-084 |
| BR-049 | Session Ranking | TC-058 → TC-062, TC-111 |
| BR-050 | Final Meal | TC-063 → TC-066 |
| BR-052 | Finalize Validation | TC-067 → TC-075, TC-109 |
| BR-056 | Default Eating History | TC-076 → TC-078 |

Không ô nào trống. Ô trống trong bảng này là chỗ sẽ vỡ ở production.

## 5.3 Rủi ro → TC

| Rủi ro | TC |
|---|---|
| R-01 cold start | MS-05 |
| R-02 deck lệch khi Dish bị gỡ | TC-108 |
| R-03 race condition khi Start | TC-107 |
| R-04 swipe ghi đè sai thứ tự | TC-106 |
| R-05 Eating History sai do thiếu `Cannot Eat` | **Không có TC** — đây là món nợ đã biết, không phải lỗi có thể test |

---

# 6. Change History

| Version | Date | Section | Change | Reason / Decision |
|---|---|---|---|---|
| 0.1 | 2026-08-14 | Toàn bộ | Bản draft đầu tiên: 94 TC ánh xạ 1–1 từ SDD, 18 TC biên bổ sung, 5 kịch bản khói thủ công, ba bảng traceability | Phase 8.1 |
