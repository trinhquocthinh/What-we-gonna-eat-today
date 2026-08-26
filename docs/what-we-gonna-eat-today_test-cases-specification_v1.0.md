# 🧪 Test Cases Specification — What We Gonna Eat Today

> **Document Metadata**
>
> - **Version:** `1.0` | **Status:** `Approved`
> - **Created:** `2026-08-14` | **Last Updated:** `2026-08-14`
> - **Upstream:** [SDD](what-we-gonna-eat-today_sdd_v0_1.md) • [Tech Spec & Architecture](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) • [Business Rules](what-we-gonna-eat-today_business-rules_v1.4.md)
> - **Downstream:** [Master Plan](what-we-gonna-eat-today_master-plan_v1_0.md) • Bộ mã kiểm thử tự động Vitest
>
> 📌 *Tài liệu đặc tả toàn diện 112 ca kiểm thử tự động (`TC-001` đến `TC-112`) và 5 kịch bản kiểm thử khói thủ công (Smoke Tests) cho 17 tính năng cốt lõi của phiên bản v1.0.*

---

## 📑 Mục lục (Table of Contents)

1. [Quy ước & Kỷ luật kiểm thử (Test Conventions)](#1-quy-ước--kỷ-luật-kiểm-thử-test-conventions)
2. [Ma trận Test Cases ánh xạ từ SDD (TC-001 → TC-094)](#2-ma-trận-test-cases-ánh-xạ-từ-sdd-tc-001--tc-094)
3. [Test Cases bổ sung — Biên và Trường hợp âm (TC-095 → TC-112)](#3-test-cases-bổ-sung--biên-và-trường-hợp-âm-tc-095--tc-112)
4. [Kịch bản kiểm thử khói thủ công trên thiết bị di động (Smoke Tests)](#4-kịch-bản-kiểm-thử-khói-thủ-công-trên-thiết-bị-di-động-smoke-tests)
5. [Bảng ma trận truy vết (Traceability Matrices)](#5-bảng-ma-trận-truy-vết-traceability-matrices)
6. [Lịch sử thay đổi (Change History)](#6-lịch-sử-thay-đổi-change-history)

---

# 1. Quy ước & Kỷ luật kiểm thử (Test Conventions)

### 🏷️ Ký hiệu phân tầng kiểm thử

- **`D` (Domain Unit Test):** Hàm thuần túy, tuyệt đối **không mock**.
- **`A` (Application Unit Test):** Use cases kiểm thử với Port Mocks viết tay tối giản.
- **`I` (Integration Test):** Kiểm thử tích hợp thực tế với Neon PostgreSQL database.

```text
src/features/selection/
├── domain/ranking.ts
├── domain/ranking.test.ts                         # Unit test (D)
├── application/build-deck.ts
├── application/build-deck.test.ts                  # Unit test (A)
└── infrastructure/deck-repository.integration.test.ts # Integration test (I)
```

> [!IMPORTANT]
> **Kỷ luật Mock:**
>
> 1. `domain/` tuyệt đối **KHÔNG MOCK BẤT CỨ ĐIỀU GÌ**. Nếu hàm domain cần mock, hàm đó đã bị đặt sai tầng.
> 2. **Không mock `Date`:** Mọi hàm phụ thuộc thời gian đều nhận `now` hoặc `referenceDate` qua tham số.
> 3. Dữ liệu kiểm thử mẫu bắt buộc dùng tiếng Việt có dấu thật (`Cá basa kho tiêu`, `Canh chua cá lóc`) để kiểm chứng chuẩn hóa bỏ dấu.

---

# 2. Ma trận Test Cases ánh xạ từ SDD (TC-001 → TC-094)

### SPEC-001 — Đăng nhập Google OAuth (`F01`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-001` | Happy | `A` | Chưa có User nào | Callback OAuth Google hợp lệ | Tạo đúng 1 User, cấp cookie phiên |
| `TC-002` | Happy | `A` | Đã có User với `provider_subject` X | Callback lại với X | Đăng nhập thành công, không tạo User mới |
| `TC-003` | Biên | `A` | 2 tài khoản Google khác nhau trùng email | Cả hai lần lượt đăng nhập | Tồn tại 2 bản ghi User độc lập |

### SPEC-018 — Quy đổi Decision Date theo Timezone (`BR-020`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-004` | Biên | `D` | Group timezone `Asia/Ho_Chi_Minh` | Mốc thời gian `2026-08-14T18:30:00Z` | `decisionDate = 2026-08-15` (01:30 sáng) |
| `TC-005` | Biên | `D` | Group timezone `Asia/Ho_Chi_Minh` | Mốc thời gian `2026-08-14T16:00:00Z` | `decisionDate = 2026-08-14` (23:00 cùng ngày) |

### SPEC-019 — Authorization Guard (`BR-006, BR-008`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-006` | Âm | `A` | User không thuộc Group | Gọi thao tác Group bất kỳ | Trả `ERR_NOT_GROUP_MEMBER`, không đổi dữ liệu |
| `TC-007` | Âm | `A` | User là Member (không phải Admin) | Gọi thao tác yêu cầu Admin | Trả `ERR_NOT_GROUP_ADMIN` |

### SPEC-002 — Tạo Group (`BR-006`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-008` | Happy | `A` | Đã đăng nhập | Tạo Group với dữ liệu hợp lệ | Người tạo là Member và có quyền `is_admin` |
| `TC-009` | Âm | `A` | — | Nhập `timezone = "Asia/Saigon_typo"` | Trả `ERR_VALIDATION`, không ghi DB |
| `TC-010` | Âm | `A` | — | Nhập `name = "   "` (khoảng trắng rỗng) | Trả `ERR_VALIDATION` |

### SPEC-003 — Tạo Link mời (`F02`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-011` | Happy | `A` | Người gọi là Group Admin | Tạo link mời | Trả token, DB lưu hash SHA-256 |
| `TC-012` | Âm | `A` | Người gọi là Member thông thường | Tạo link mời | Trả `ERR_NOT_GROUP_ADMIN` |

### SPEC-004 — Tham gia bằng Link mời (`BR-006`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-013` | Happy | `I` | Token hợp lệ chưa dùng | Tham gia nhóm | Thành Member, token đổi trạng thái used trong 1 transaction |
| `TC-014` | Âm | `I` | Token đã được sử dụng trước đó | Dùng lại token lần 2 | Trả `ERR_INVITE_ALREADY_USED` |
| `TC-015` | Âm | `I` | User đã là Member của nhóm | Dùng link mời | Trả `ERR_ALREADY_GROUP_MEMBER`, token vẫn còn hiệu lực |
| `TC-016` | Biên | `A` | Token tạo 8 ngày trước | Tham gia nhóm | Trả `ERR_INVITE_INVALID` (quá hạn 7 ngày) |

### SPEC-005 — Thêm Dish vào Group Dish Pool (`BR-001`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-017` | Happy | `A` | Chưa có món nào | Thêm `"  Canh   Chua  "` | Tạo Global Dish, `normalized_name = "canh chua"` |
| `TC-018` | Happy | `A` | Đã có Global Dish `Canh chua` | Thêm `"canh chua"` không cờ force | Trả danh sách ứng viên trùng, không tạo món mới |
| `TC-019` | Happy | `A` | Đã có Global Dish `Canh chua` | Thêm với cờ `forceCreate = true` | Tạo Global Dish thứ 2 kèm provenance đầy đủ |
| `TC-020` | Happy | `I` | Món đang `INACTIVE` trong Group | Thêm lại món | Chuyển `ACTIVE`, không tạo thêm Global Dish |
| `TC-021` | Âm | `A` | — | Nhập `systemTags = ["BREAKFAST"]` | Trả `ERR_INVALID_SYSTEM_TAG` |

### SPEC-006 — Gán System Tag trong Group (`BR-003, BR-008`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-022` | Happy | `A` | Dish có tag `[MAIN]` | Gán `[MAIN, SOUP]` | Dish cập nhật có đúng 2 tags |
| `TC-023` | Biên | `A` | Dish có tag `[MAIN]` | Gán `[]` (rỗng) | Dish không còn tag nào |
| `TC-024` | Happy | `I` | Cùng món thuộc 2 Group | Đổi tag ở Group A | Tag của món ở Group B giữ nguyên |
| `TC-025` | Âm | `A` | Người gọi là Member | Đổi tag món | Trả `ERR_NOT_GROUP_ADMIN` |

### SPEC-007 — Tạo Session (`BR-020, BR-025`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-026` | Happy | `A` | Chưa có Session nào hôm nay | Tạo phiên | Phiên `DRAFT`, người tạo là Creator kiêm Participant |
| `TC-027` | Âm | `I` | Đã có Session `ACTIVE` hôm nay | Tạo phiên mới | Trả `ERR_SESSION_EXISTS_TODAY` |
| `TC-028` | Happy | `I` | Có Session `INVALID` hôm nay | Tạo phiên mới | Tạo thành công phiên mới |
| `TC-029` | Âm | `I` | Đã có Session `FINALIZED` hôm nay | Tạo phiên mới | Trả `ERR_SESSION_EXISTS_TODAY` |

### SPEC-008 — Bắt đầu Session (`BR-021, BR-025`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-030` | Happy | `I` | Phiên Draft hợp lệ | Bấm Start | Chuyển `ACTIVE`, ghi `started_at`, snapshot Session Rules |
| `TC-031` | Âm | `A` | 1 Participant đã rời Group | Bấm Start | Trả `ERR_PARTICIPANT_NOT_MEMBER`, giữ nguyên `DRAFT` |
| `TC-032` | Âm | `I` | Group đã có phiên `ACTIVE` cùng ngày | Bấm Start Draft này | Trả `ERR_SESSION_EXISTS_TODAY` |
| `TC-033` | Âm | `A` | Phiên đã ở trạng thái `ACTIVE` | Bấm Start lần nữa | Trả `ERR_SESSION_NOT_DRAFT` |
| `TC-034` | Âm | `A` | Người gọi không phải Creator | Bấm Start | Trả `ERR_NOT_SESSION_CREATOR` |
| `TC-035` | Lỗi | `I` | Start thất bại ở bước revalidate 4 | Kiểm tra Database | Không có Session Rule nào bị ghi rác |

### SPEC-009 — Thêm Participant (`BR-026`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-036` | Happy | `A` | Session `ACTIVE`, User là Member | Thêm Participant | Tạo Participant `ACTIVE` với 0 tương tác |
| `TC-037` | Âm | `A` | User không thuộc Group | Thêm Participant | Trả `ERR_PARTICIPANT_NOT_MEMBER` |
| `TC-038` | Âm | `I` | User đã có tên trong phiên | Thêm lại | Trả `ERR_PARTICIPANT_EXISTS` |
| `TC-039` | Âm | `A` | Session đã `FINALIZED` | Thêm Participant | Trả `ERR_SESSION_NOT_ACTIVE` |

### SPEC-010 — Dựng Candidate Deck (`BR-033, BR-045`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-040` | Happy | `A` | Group có 30 món `ACTIVE` | Mở deck lần đầu | Deck chứa đúng 30 món |
| `TC-041` | Happy | `A` | Đã dựng deck trước đó | Mở lại deck lần 2 | Thứ tự các thẻ giữ nguyên không đổi |
| `TC-042` | Happy | `D` | 2 User khác nhau trong cùng phiên | So sánh thứ tự deck | Thứ tự khác nhau theo lịch sử ăn |
| `TC-043` | Happy | `D` | Ăn món A hôm qua, chưa từng ăn món B | Dựng deck | Món B xếp trên món A |
| `TC-044` | Happy | `A` | 2 User có Eating History khác nhau | Dựng deck | Thứ tự phản ánh chính xác lịch sử từng người |

### SPEC-011 — Lấy phân trang Deck (`F07`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-045` | Happy | `A` | Deck có 30 món | Lấy với `cursor = 0` | Trả về 20 món, `nextCursor = 20` |
| `TC-046` | Biên | `A` | Deck có 30 món | Lấy với `cursor = 20` | Trả về 10 món còn lại, `nextCursor = null` |
| `TC-047` | Âm | `A` | Người gọi không phải Participant | Lấy trang deck | Trả `ERR_NOT_PARTICIPANT` |

### SPEC-012 — Tương tác Swipe & Undo (`BR-040→042`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-048` | Happy | `A` | Chưa có tương tác | Gửi `SWIPE_RIGHT` | Effective `SWIPE_RIGHT`, ghi 1 event |
| `TC-049` | Happy | `A` | Đang `SWIPE_RIGHT` | Gửi `SWIPE_LEFT` | Effective đổi sang `SWIPE_LEFT`, ghi 2 events |
| `TC-050` | Happy | `A` | Đang `SWIPE_LEFT` | Gửi `UNDO` | Effective xóa về `null`, ghi 3 events |
| `TC-051` | Biên | `A` | Chưa có tương tác | Gửi `UNDO` | Trả `null`, không báo lỗi |
| `TC-052` | Âm | `A` | Session đã `FINALIZED` | Gửi `SWIPE_RIGHT` | Trả `ERR_SESSION_NOT_ACTIVE` |
| `TC-053` | Biên | `I` | — | Gửi `SWIPE_RIGHT` 2 lần liên tiếp | Effective vẫn là `SWIPE_RIGHT`, idempotent |

### SPEC-013 — Completed và Mở lại (`BR-026, BR-044`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-054` | Happy | `A` | Participant `ACTIVE` | Gửi `completed = true` | Trạng thái chuyển `COMPLETED` |
| `TC-055` | Happy | `A` | Participant `COMPLETED` | Gửi tiếp `SWIPE_RIGHT` | Ghi nhận tương tác bình thường |
| `TC-056` | Happy | `A` | Participant `COMPLETED` | Gửi `completed = false` | Trạng thái chuyển lại `ACTIVE` |
| `TC-057` | Âm | `A` | Session đã `FINALIZED` | Gửi cập nhật completed | Trả `ERR_SESSION_NOT_ACTIVE` |

### SPEC-014 — Session Ranking (`BR-049`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-058` | Happy | `D` | $T=4$, món có $P=3, N=0, H=0$ | Tính điểm | $\text{Score} = \frac{3 \times 1.0}{4} = 0.75$ |
| `TC-059` | Happy | `D` | $T=4$, món có $P=3, N=1, H=2$ | Tính điểm | $\text{Score} = \frac{3 - 0.7 - 0.6}{4} = 0.43$ |
| `TC-060` | Biên | `D` | Thêm người thứ 5, món có $P=3, N=0$ | Tính lại | $\text{Score} = \frac{3}{5} = 0.60$ |
| `TC-061` | Biên | `A` | Món chưa ai tương tác | Lấy ranking | Nằm trong mục `untouched`, không có điểm |
| `TC-062` | Âm | `A` | Người gọi không phải Creator | Lấy ranking | Trả `ERR_NOT_SESSION_CREATOR` |

### SPEC-015 — Final Meal nháp (`BR-050`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-063` | Happy | `A` | Creator, chọn 3 món hợp lệ | Lưu nháp | Nháp lưu đúng 3 món |
| `TC-064` | Âm | `A` | Danh sách trùng `dishId` | Lưu nháp | Trả `ERR_DUPLICATE_DISH_IN_MEAL` |
| `TC-065` | Âm | `I` | Món vừa bị gỡ khỏi nhóm | Lưu nháp | Trả `ERR_DISH_NOT_IN_POOL` |
| `TC-066` | Happy | `A` | Chọn món không ai vuốt | Lưu nháp | Lưu thành công |

### SPEC-016 — Finalize chốt bữa (`BR-052`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-067` | Happy | `I` | Nháp 3 món hợp lệ | Bấm Finalize | Tạo Final Meal, Session sang `FINALIZED` |
| `TC-068` | Âm | `A` | Danh sách nháp rỗng | Bấm Finalize | Trả `ERR_EMPTY_FINAL_MEAL`, giữ `ACTIVE` |
| `TC-069` | Âm | `I` | Món bị gỡ sau khi lưu nháp | Bấm Finalize | Trả `ERR_DISH_NOT_IN_POOL`, giữ `ACTIVE` |
| `TC-070` | Âm | `A` | Session đã `FINALIZED` | Bấm Finalize lần 2 | Trả `ERR_SESSION_NOT_ACTIVE` |
| `TC-071` | Happy | `I` | Finalize thành công | Kiểm tra Eating History | Bản ghi lịch sử tồn tại trong cùng transaction |
| `TC-072` | Âm | `D` | Rule `Required SOUP >= 1`, nháp thiếu | Bấm Finalize | Trả `ERR_REQUIRED_RULE_FAILED`, giữ `ACTIVE` |
| `TC-073` | Biên | `D` | Rule `MAIN >= 1` & `SOUP >= 1`, 1 món mang cả 2 tag | Bấm Finalize | Thành công (Independent Tag Counting) |
| `TC-074` | Happy | `I` | Admin đổi Group Rule sau Start | Bấm Finalize | Validate theo Session Rule đã snapshot |
| `TC-075` | Happy | `I` | Admin đổi System Tag sau Start | Bấm Finalize | Validate theo System Tag **mới nhất** |

### SPEC-017 — Default Eating History (`BR-056`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-076` | Happy | `A` | Final Meal 3 món, 4 thành viên | Sinh lịch sử | Tạo đúng 12 bản ghi Eating History |
| `TC-077` | Biên | `I` | Xử lý cùng `finalMealId` 2 lần | Kiểm tra | Vẫn giữ 12 bản ghi, đảm bảo Idempotent |
| `TC-078` | Biên | `A` | `decision_date = 2026-08-14` | Kiểm tra bản ghi | `eating_date = 2026-08-14` bất kể giờ UTC |

### SPEC-020 — Tính toán Recency Penalty (`BR-046`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-079` | Biên | `D` | Ăn hôm nay ($d = 0$) | Tính penalty | $R = 1.0$ |
| `TC-080` | Happy | `D` | Ăn 3 ngày trước ($d = 3$) | Tính penalty | $R \approx 0.57$ |
| `TC-081` | Biên | `D` | Ăn đúng 7 ngày trước ($d = 7$) | Tính penalty | $R = 0.0$ |
| `TC-082` | Biên | `D` | Ăn 20 ngày trước ($d = 20$) | Tính penalty | $R = 0.0$ |
| `TC-083` | Biên | `D` | Chưa từng ăn bao giờ | Tính penalty | $R = 0.0$ |
| `TC-084` | Biên | `D` | 2 bản ghi cùng món cùng ngày | Tính penalty | Collapse thành 1 lần ăn duy nhất |

### SPEC-021 — Cấu hình Group Rule (`BR-010, 012, 013`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-085` | Happy | `A` | Group Admin | Đặt `REQUIRED SOUP >= 1` | Lưu đúng 1 rule trong Rule Set |
| `TC-086` | Âm | `I` | — | Đặt `minimumCount = 0` | Trả `ERR_INVALID_MINIMUM_COUNT` |
| `TC-087` | Âm | `I` | — | Đặt 2 rule cùng `REQUIRED + MAIN` | Trả `ERR_DUPLICATE_RULE` |
| `TC-088` | Biên | `A` | Group đang có 2 rules | Lưu danh sách rỗng `[]` | Group không còn rule nào |
| `TC-089` | Âm | `A` | Người gọi là Member | Lưu quy định | Trả `ERR_NOT_GROUP_ADMIN` |
| `TC-090` | Happy | `I` | Phiên đang `ACTIVE` | Admin đổi Group Rule | Session Rule của phiên đang chạy không đổi |

### SPEC-022 — Snapshot Session Rule (`BR-015, BR-016`)

| TC ID | Loại ca | Tầng | Tiền điều kiện | Bước thực hiện | Kết quả kỳ vọng |
| :---: | :---: | :---: | :--- | :--- | :--- |
| `TC-091` | Happy | `I` | Group có 2 rules | Start Session | Session Rule snapshot đúng 2 rules |
| `TC-092` | Biên | `I` | Group không có rule nào | Start Session | Session Rule rỗng, Session `ACTIVE` |
| `TC-093` | Happy | `I` | Session đã snapshot | Admin sửa Group Rule | Session Rule của phiên không đổi |
| `TC-094` | Biên | `I` | Session đã `ACTIVE` | Gọi snapshot lần 2 | Không tạo bản sao thứ hai |

---

# 3. Test Cases bổ sung — Biên và Trường hợp âm (TC-095 → TC-112)

| TC ID | Nguồn | Loại ca | Tầng | Nội dung kiểm thử | Kết quả kỳ vọng |
| :---: | :--- | :---: | :---: | :--- | :--- |
| `TC-095` | `SPEC-002` | Biên | `A` | Tên Group dài đúng 60 ký tự | Chấp nhận hợp lệ |
| `TC-096` | `SPEC-002` | Âm | `A` | Tên Group dài 61 ký tự | Trả `ERR_VALIDATION` |
| `TC-097` | `SPEC-005` | Biên | `A` | Tên món dài đúng 120 ký tự | Chấp nhận hợp lệ |
| `TC-098` | `SPEC-005` | Biên | `A` | 2 tên chỉ khác dấu: `Ca kho` và `Cá kho` | Cùng `normalized_name`, phát hiện trùng |
| `TC-099` | `SPEC-005` | Âm | `I` | Thêm món đã `ACTIVE` trong Group | Trả `ERR_DISH_ALREADY_IN_POOL` |
| `TC-100` | `SPEC-006` | Biên | `A` | `systemTags` có đủ 5 giá trị khác nhau | Chấp nhận hợp lệ |
| `TC-101` | `SPEC-006` | Biên | `A` | `systemTags` có giá trị bị lặp lại | Tự động khử trùng trước khi lưu |
| `TC-102` | `SPEC-010` | Biên | `A` | Group có 0 món `ACTIVE` | Deck rỗng, không báo lỗi hệ thống |
| `TC-103` | `SPEC-011` | Âm | `A` | Truyền `cursor` là số âm | Trả `ERR_VALIDATION` |
| `TC-104` | `SPEC-011` | Biên | `A` | `cursor` lớn hơn tổng số món trong deck | Trả về 0 item, `nextCursor = null` |
| `TC-105` | `SPEC-012` | Âm | `A` | Swipe món không thuộc Group Dish Pool | Trả `ERR_DISH_NOT_IN_POOL` |
| `TC-106` | `R-04` | Biên | `A` | 2 Swipe cùng món, bản đến sau có timestamp cũ hơn | Server bỏ qua bản đến muộn, giữ bản mới nhất |
| `TC-107` | `R-03` | Lỗi | `I` | **2 transaction Start song song cùng group + date** | Đúng 1 thành công; bên kia nhận `ERR_SESSION_EXISTS_TODAY` |
| `TC-108` | `R-02` | Biên | `I` | Món bị gỡ sau khi deck đã materialize | Tự động loại khỏi trang đọc kế tiếp |
| `TC-109` | `SPEC-016` | Lỗi | `I` | **`INSERT eating_history` fail giữa transaction** | Session **KHÔNG** chuyển `FINALIZED`, rollback toàn bộ |
| `TC-110` | `SPEC-016` | Biên | `D` | Nháp có 1 món, Rule Set rỗng | Finalize thành công |
| `TC-111` | `SPEC-014` | Biên | `D` | $T = 1$, món có $P = 1$ | $\text{Score} = 1.0$, không bị lỗi chia cho 0 |
| `TC-112` | `SPEC-004` | Biên | `A` | Token hết hạn đúng mốc `expires_at` | Trả `ERR_INVITE_INVALID` (biên đóng) |

> [!CAUTION]
> **3 Test Cases then chốt ép tính toàn vẹn hệ thống:**
>
> - **`TC-107`:** Chạy 2 database transaction song song thật để chứng minh Partial Unique Index chặn race condition.
> - **`TC-109`:** Khẳng định tính nguyên tử của Finalize: Nếu ghi lịch sử thất bại, phiên không bao giờ được phép chuyển sang `FINALIZED`.
> - **`TC-098`:** Kiểm thử chuẩn hóa tiếng Việt với dữ liệu thật.

---

# 4. Kịch bản kiểm thử khói thủ công trên thiết bị di động (Smoke Tests)

Chạy trước mỗi lần Deploy Production trên **điện thoại thật sử dụng mạng di động 4G/5G**:

| Mã | Cột mốc | Kịch bản thực hiện | Tiêu chuẩn đạt yêu cầu |
| :---: | :---: | :--- | :--- |
| `MS-01` | `M2` | Tạo nhóm, thêm 5 món, mở phiên, vuốt hết, chốt bữa | Thấy thực đơn Final Meal và lịch sử ăn cá nhân |
| `MS-02` | `M3` | Người thứ 2 vào bằng link mời, cùng vuốt trong phiên | Creator thấy số đếm tương tác của cả 2 trong Session Ranking |
| `MS-03` | `M4` | Chốt bữa hôm nay, hôm sau mở phiên mới | Món vừa ăn hôm trước bị đẩy xuống dưới trong deck |
| `MS-04` | `M5` | Đặt rule `Phải có canh`, chốt bữa không có canh | Bị chặn, thông báo nêu rõ thiếu món Canh |
| `MS-05` | `NFR-01` | Mở app lần đầu sau khi Neon DB đã ngủ $\ge 10\text{ phút}$ | Màn hình Deck hiển thị trong vòng $\le 2.5\text{ giây}$ |

---

# 5. Bảng ma trận truy vết (Traceability Matrices)

### 5.1 Phủ sóng SPEC $\to$ Test Cases

Toàn bộ **22 SPEC** đều có độ bao phủ kiểm thử:
`SPEC-001` (TC-001→003) • `SPEC-002` (TC-008→010, 095, 096) • `SPEC-003` (TC-011, 012) • `SPEC-004` (TC-013→016, 112) • `SPEC-005` (TC-017→021, 097→099) • `SPEC-006` (TC-022→025, 100, 101) • `SPEC-007` (TC-026→029) • `SPEC-008` (TC-030→035, 107) • `SPEC-009` (TC-036→039) • `SPEC-010` (TC-040→044, 102, 108) • `SPEC-011` (TC-045→047, 103, 104) • `SPEC-012` (TC-048→053, 105, 106) • `SPEC-013` (TC-054→057) • `SPEC-014` (TC-058→062, 111) • `SPEC-015` (TC-063→066) • `SPEC-016` (TC-067→075, 109, 110) • `SPEC-017` (TC-076→078) • `SPEC-018` (TC-004, 005) • `SPEC-019` (TC-006, 007) • `SPEC-020` (TC-079→084) • `SPEC-021` (TC-085→090) • `SPEC-022` (TC-091→094).

---

# 6. Lịch sử thay đổi (Change History)

| Version | Ngày | Phần tác động | Nội dung thay đổi | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- | :--- |
| `0.1` | 2026-08-14 | Toàn bộ | Bản thảo đầu tiên: 94 TC từ SDD, 18 TC biên, 5 Smoke Tests | Khởi tạo baseline kiểm thử v1.0 |
