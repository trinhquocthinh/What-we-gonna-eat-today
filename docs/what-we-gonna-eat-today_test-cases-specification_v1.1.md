# 🧪 Test Cases Specification — What We Gonna Eat Today

> **Document Metadata**
>
> - **Version:** `1.2` | **Status:** `Approved`
> - **Created:** `2026-08-14` | **Last Updated:** `2026-08-26`
> - **Supersedes:** `v1.0` | **Upstream:** [SDD](what-we-gonna-eat-today_sdd_v1.3.md) • [Tech Spec & Architecture](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) • [Business Rules](what-we-gonna-eat-today_business-rules_v1.8.md)
> - **Downstream:** [Master Plan](what-we-gonna-eat-today_master-plan_v2.1.md) • Bộ mã kiểm thử tự động Vitest
>
> 📌 *Tài liệu đặc tả toàn diện 158 ca kiểm thử tự động (`TC-001` đến `TC-158`) và 5 kịch bản kiểm thử khói thủ công (Smoke Tests): 112 ca cho 17 tính năng v1.0, 46 ca cho 12 tính năng v1.1.*

---

## 📑 Mục lục (Table of Contents)

1. [Quy ước & Kỷ luật kiểm thử (Test Conventions)](#1-quy-ước--kỷ-luật-kiểm-thử-test-conventions)
2. [Ma trận Test Cases ánh xạ từ SDD (TC-001 → TC-094)](#2-ma-trận-test-cases-ánh-xạ-từ-sdd-tc-001--tc-094)
3. [Test Cases bổ sung — Biên và Trường hợp âm (TC-095 → TC-112)](#3-test-cases-bổ-sung--biên-và-trường-hợp-âm-tc-095--tc-112)
3b. [Test Cases v1.1 (TC-113 → TC-158)](#3b-test-cases-v11-tc-113--tc-158)
3c. [Test Cases v1.2 (TC-159 → TC-178)](#3c-test-cases-v12-tc-159--tc-178)
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

# 3b. Test Cases v1.1 (TC-113 → TC-158)

Ánh xạ 1–1 với `SPEC-024` → `SPEC-035` của [SDD §8](what-we-gonna-eat-today_sdd_v1.3.md).

## 3b.1 E7 — Ràng buộc và sở thích cá nhân

| TC ID | Nguồn | Loại ca | Tầng | Nội dung kiểm thử | Kết quả kỳ vọng |
| :---: | :--- | :---: | :---: | :--- | :--- |
| `TC-113` | `SPEC-024` | Thuận | `A` | Đánh dấu `Cannot Eat` một món | Món biến khỏi deck ở lần dựng kế tiếp |
| `TC-114` | `SPEC-024` | **Then chốt** | `I` | Đã `SWIPE_RIGHT` món X rồi mới đánh dấu `Cannot Eat` | Tương tác cũ bị xoá; $P$ của món X giảm đúng 1 |
| `TC-115` | `SPEC-024` | Biên | `A` | Gỡ `Cannot Eat` sau khi đã xoá tương tác | **KHÔNG** khôi phục tương tác cũ |
| `TC-116` | `SPEC-024` | Biên | `I` | Cùng món ở hai Group khác nhau | Ràng buộc áp cho **cả hai** (gắn theo `global_dishes.id`) |
| `TC-117` | `SPEC-024` | Biên | `A` | Payload kèm trường `userId` của người khác | Trường bị **bỏ qua**; ràng buộc ghi cho người đang đăng nhập |
| `TC-118` | `SPEC-025` | Thuận | `D` | `LIKE` / không đặt / `DISLIKE` | $E$ lần lượt bằng $+1$, $0$, $-1$ |
| `TC-119` | `SPEC-025` | **Then chốt** | `A` | Đặt `DISLIKE` một món | Món **vẫn nằm trong deck**, chỉ tụt hạng |
| `TC-120` | `SPEC-025` | Biên | `A` | Đặt `preference = null` khi đang là `LIKE` | Xoá dòng, không lưu giá trị enum thứ ba |
| `TC-121` | `SPEC-014` | Thuận | `D` | Món có $X = 2$, $T = 4$, $P = 2$ | $\text{Score} = (2 - 2) / 4 = 0$ |
| `TC-122` | `BR-056` | **Then chốt** | `I` | Chốt bữa có món X; người B đã khai `Cannot Eat` món X | **KHÔNG** sinh lịch sử ăn cho B; Cooldown của B không đổi |

## 3b.2 E8 — Deck ngắn và có nhịp

| TC ID | Nguồn | Loại ca | Tầng | Nội dung kiểm thử | Kết quả kỳ vọng |
| :---: | :--- | :---: | :---: | :--- | :--- |
| `TC-123` | `SPEC-026` | Thuận | `D` | Nhóm có 150 món đủ điều kiện | Deck đúng 30 thẻ |
| `TC-124` | `SPEC-026` | Biên | `D` | Nhóm có 12 món đủ điều kiện | Deck đúng 12 thẻ, không đệm thêm |
| `TC-125` | `SPEC-027` | Thuận | `D` | Deck 30 thẻ, cả hai luồng đều dư món | Vị trí `#5, #10, …, #30` là thẻ Explore |
| `TC-126` | `SPEC-026` | **Then chốt** | `D` | Nhóm 150 món, đếm nguồn của từng thẻ | **Đúng 6/30 thẻ đến từ luồng Explore** — canh thứ tự cắt trần |
| `TC-127` | `SPEC-027` | Biên | `D` | Luồng Explore cạn (mọi món đều vừa ăn) | Khối lấy trọn từ Exploit, không để trống vị trí |
| `TC-128` | `SPEC-027` | Biên | `D` | Món $d = 30$ đúng mốc | Đủ điều kiện vào luồng Explore (biên đóng) |
| `TC-129` | `SPEC-028` | Thuận | `I` | Thêm món mới khi `cursor = 8` | Mọi thẻ `index < 8` giữ nguyên vị trí |
| `TC-130` | `SPEC-028` | Biên | `I` | Gỡ món nằm ở `index < cursor` | Phần đã xem giữ nguyên, `cursor` không lệch |
| `TC-147` | `SPEC-027` | **Then chốt** | `D` | Món chưa từng ăn — có mặt ở **cả hai** luồng Exploit và Explore | Deck **không** chứa id nào hai lần: `new Set(deck).size === deck.length` |
| `TC-148` | `SPEC-027` | Âm | `D` | Món $d = 400$ nhưng `explicit = -1` (Dislike) | **Không** vào luồng Explore |
| `TC-149` | `SPEC-028` | Hồi quy | `I` | Gọi `listDeck` hai lần liên tiếp | Thứ tự giống hệt; `session_decks` có đúng một dòng |
| `TC-150` | `SPEC-028` | Hồi quy | `I` | Thêm món mới vào nhóm giữa phiên rồi gọi lại `listDeck` | Món mới **không** xuất hiện; thứ tự cũ không đổi |
| `TC-145` | `SPEC-036` | Thuận | `D` | 30 thẻ, 12 thẻ đầu đã có `effectiveInteraction` | `cursor = 12`, `marks.length = 12` |
| `TC-146` | `SPEC-036` | **Then chốt** | `D` | Thẻ #5 đã Undo (`null`), các thẻ #1→#12 còn lại có tương tác | `cursor = 12` — **không** phải `4`; `marks[4] === 'cannot'` |

## 3b.3 E9 — Chế độ vuốt theo chặng

| TC ID | Nguồn | Loại ca | Tầng | Nội dung kiểm thử | Kết quả kỳ vọng |
| :---: | :--- | :---: | :---: | :--- | :--- |
| `TC-131` | `SPEC-029` | Thuận | `I` | Start với `deck_mode = COURSE`, 3 chặng | `session_courses` có 3 dòng `position` 0→2, ghi cùng giao dịch với `session_rules` |
| `TC-132` | `SPEC-029` | Âm | `A` | `deck_mode = COURSE` mà `courses` rỗng | Trả `ERR_VALIDATION` |
| `TC-133` | `SPEC-029` | Biên | `I` | Đổi cấu hình nhóm sau khi phiên đã `ACTIVE` | Phiên đang chạy **không** đổi chặng |
| `TC-134` | `SPEC-030` | Thuận | `D` | 3 chặng, mỗi chặng dư món | Mỗi chặng đúng 10 thẻ |
| `TC-135` | `SPEC-030` | **Then chốt** | `D` | 3 chặng, chặng `SOUP` chỉ có 4 món | 4 + 13 + 13 = 30; phần dư được chia lại |
| `TC-136` | `SPEC-030` | **Then chốt** | `D` | Món mang cả `STAPLE` và `MAIN`, cả hai đều là chặng | Xuất hiện ở **đúng một** chặng — chặng đầu tiên khớp |
| `TC-137` | `SPEC-030` | Biên | `D` | `deck_mode = FREE` | Trả đúng một "chặng" chứa toàn bộ deck |
| `TC-138` | `BR-050` | Hồi quy | `I` | Chốt bữa sau phiên `COURSE` | Luồng Finalize hoạt động y hệt phiên `FREE` |
| `TC-151` | `SPEC-010` | Thuận | `I` | Món "Bún chả" gắn `STAPLE`+`MAIN`, món chưa gắn nhãn nào | Deck trả `['STAPLE','MAIN']` đúng thứ tự chuẩn và `[]` — **không** phải `[]` cho mọi món như trước E9 |
| `TC-152` | `SPEC-030` | **Then chốt** | `D` | 100 món, top-30 theo điểm **không có món `SOUP`** nào; danh mục có 15 món canh ở đuôi bảng | Chặng Canh **có món**, không rỗng — canh thứ tự chia chặng trước cắt trần |

## 3b.4 E10 & E11

| TC ID | Nguồn | Loại ca | Tầng | Nội dung kiểm thử | Kết quả kỳ vọng |
| :---: | :--- | :---: | :---: | :--- | :--- |
| `TC-139` | `SPEC-031` | **Then chốt** | `D` | Thiếu 1 `REQUIRED` và 1 `PREFERRED` | `blocking` có 1 phần tử, `warnings` có 1; chỉ `blocking` chặn Finalize |
| `TC-140` | `SPEC-033` | Biên | `I` | Chốt bữa không có cảnh báo nào | `finalize_warnings` **không** thêm dòng nào |
| `TC-141` | `SPEC-034` | Thuận | `I` | Phiên `ACTIVE` của hôm qua, mở phiên hôm nay | Phiên cũ chuyển `INVALID`; tương tác cũ được bảo toàn; phiên mới tạo được |
| `TC-142` | `SPEC-035` | Biên | `I` | Gỡ món rồi thêm lại | **Cùng một dòng** `group_dishes` lật `ACTIVE` → `INACTIVE` → `ACTIVE`; unique index không cho dòng thứ hai; nhãn còn nguyên |
| `TC-156` | `SPEC-034` | **Then chốt** | `A` | Phiên `ACTIVE`, `decisionDate` = hôm qua, quét **chưa chạy** | `finalizeSession` trả `ERR_SESSION_NOT_ACTIVE`; `commitFinalize` **không** được gọi — chốt chặn độc lập với nhịp quét |
| `TC-157` | `SPEC-034` | Hồi quy | `I` | Phiên có 5 dòng `interactions` → quét chuyển `INVALID` | `interactions` **vẫn đúng 5 dòng** (`BR-061` — bảo toàn, không xoá) |
| `TC-158` | `SPEC-035` | Âm | `A` | Member (không phải Admin) gọi gỡ món | Trả `ERR_NOT_GROUP_ADMIN`, không ghi gì |
| `TC-143` | `SPEC-032` | Thuận | `D` | `targetCount = 4`, nháp có 6 món | Cảnh báo mềm nêu rõ chiều lệch (thừa 2), **không** chặn Finalize |
| `TC-144` | `SPEC-032` | Biên | `D` | `targetCount = null` (nhóm chưa đặt) | Không sinh cảnh báo nào |
| `TC-153` | `SPEC-021` | Thuận | `A` | Rule set gồm `REQUIRED MAIN 1` **và** `PREFERRED MAIN 2` — cùng tag, khác loại | Hợp lệ, ghi đủ hai dòng; khoá khử trùng là cặp `(ruleType, systemTag)` chứ không phải tag đơn |
| `TC-154` | `SPEC-022` | Hồi quy | `I` | Nhóm có 1 luật `REQUIRED` + 1 luật `PREFERRED`, Start phiên | `session_rules` có **đủ hai dòng** mà **không** sửa đường ghi nào — `buildSnapshotStatement` vốn không lọc `ruleType` |
| `TC-155` | `SPEC-031` | **Then chốt** | `D` | Còn cảnh báo mềm; bấm "Chốt bữa" lần đầu, rồi **đổi tập món**, rồi bấm lần nữa | Lần đầu **không** submit (nhãn đổi thành "Vẫn chốt · …"); đổi món **reset** cờ xác nhận nên lần bấm kế tiếp lại chỉ là nhịp một |

> [!CAUTION]
> **5 Test Cases then chốt của v1.1** — mỗi cái canh một lỗi mà không tầng nào phía trên bắt được:
>
> - **`TC-126`:** cắt trần trước khi trộn Explore thì deck vẫn đủ 30 thẻ và vẫn chạy, chỉ là vĩnh viễn không có món lạ. Đây là ca duy nhất phát hiện được.
> - **`TC-136`:** món hai tag lọt vào hai chặng thì người dùng vuốt nó hai lần và $P$ bị đếm trùng — bảng xếp hạng sai mà không có gì báo.
> - **`TC-114`:** giữ lại `SWIPE_RIGHT` cũ khiến $+1.0$ của $P$ triệt tiêu $-1.0$ của $X$; cả nhà thấy một món trung tính trong khi có người không ăn được.
> - **`TC-122`:** không có ngoại lệ này thì hệ thống ghi rằng người ta đã ăn món họ không ăn được, rồi tin vào chính dữ kiện đó ở phiên sau (rủi ro `R-05`).
> - **`TC-135`:** không trả phần dư thì mọi nhóm có một chặng nghèo món sẽ vĩnh viễn dùng chưa hết trần.

---

# 3c. Test Cases v1.2 (TC-159 → TC-178)

Ánh xạ từ [SDD §9](what-we-gonna-eat-today_sdd_v1.3.md). Phạm vi theo [DEC-069](what-we-gonna-eat-today_decision-log_v3.9.md).

## 3c.1 E13 — Học sở thích tự động

| TC ID | Nguồn | Loại ca | Tầng | Nội dung kiểm thử | Kết quả kỳ vọng |
| :---: | :--- | :---: | :---: | :--- | :--- |
| `TC-159` | `SPEC-037` | Thuận | `D` | 1 Swipe Right hôm nay, không có Left | $I = 1/(1+0+3) = 0.25$ — **không** phải $1.0$; $K_{\text{prior}}$ giữ một mẫu đơn lẻ khỏi nói to |
| `TC-160` | `SPEC-037` | **Then chốt** | `D` | 1 Swipe Right cách **đúng 60 ngày**, so với 1 Swipe Right hôm nay | Lượt cũ đóng góp trọng số $0.5$, lượt mới đóng góp $1.0$ — canh đúng mốc phân rã. Sai hằng số `HALF_LIFE_DAYS` thì chỉ ca này đỏ |
| `TC-161` | `SPEC-037` | Biên | `D` | Không có lượt vuốt nào | $I = 0$, **không** phải `NaN` — mẫu số luôn $\ge 3$ |
| `TC-162` | `SPEC-037` | Biên | `D` | $R_w = L_w$ (vuốt phải và trái cân nhau) | $I = 0$ — trung tính, không nghiêng bên nào |
| `TC-163` | `SPEC-037` | **Then chốt** | `I` | Cùng một món: 1 lượt ở phiên `FINALIZED`, 1 lượt ở phiên `ACTIVE`, 1 lượt ở phiên `INVALID` | Chỉ lượt của phiên `FINALIZED` được tính. Học từ phiên đang chạy nghĩa là deck tự sửa mình giữa lượt vuốt |
| `TC-164` | `SPEC-037` | Hồi quy | `I` | Vuốt phải rồi **Undo** trong một phiên đã `FINALIZED` | Lượt đó **không** tính vào $I$ — `interactions` giữ trạng thái hiệu lực, khác `interaction_events` |
| `TC-165` | `SPEC-037` | Biên | `I` | Cùng một Global Dish có mặt ở hai Group qua hai `group_dishes` | $I$ gộp cả hai — nó gắn theo `global_dishes.id`, cùng khuôn `eating_history` |
| `TC-166` | `SPEC-038` | **Then chốt** | `I` | Đang có `SWIPE_RIGHT` cho món X trong phiên `ACTIVE`, bật Blacklist X | Món biến khỏi deck ở lần tải sau, **nhưng $P$ KHÔNG đổi** — khác hẳn `TC-114` của `Cannot Eat` |
| `TC-167` | `SPEC-038` | Thuận | `I` | Bật Blacklist rồi tải lại deck | Món bị lọc cứng ở Stage 1, không phải hạ điểm |
| `TC-168` | `SPEC-038` | Hồi quy | `I` | Bật Blacklist cho món đã khai `Cannot Eat` | Hai dòng cùng `(user, dish)` khác `kind`; gỡ một cái không đụng cái kia |
| `TC-169` | `SPEC-039` | Thuận | `D` | Món ăn hôm qua ($d = 1$, $R = 0.86$), có trong Whitelist | $R$ ép về $0$; điểm không bị trừ |
| `TC-170` | `SPEC-039` | Biên | `D` | Món trong Whitelist **và** có `Like` | Hai hiệu ứng cộng dồn, không loại trừ nhau: $E = +1$ vẫn cộng, $R = 0$ vẫn gỡ phạt |
| `TC-171` | `SPEC-040` | **Then chốt** | `I` | Có lịch sử vuốt; bấm Quên; dựng deck cho phiên **mới** | $I = 0$ cho mọi món, **nhưng số dòng `interactions` KHÔNG đổi** — mốc thời gian, không phải lệnh xoá (`BR-061`) |
| `TC-172` | `SPEC-040` | Hồi quy | `I` | Bấm Quên khi đang có phiên `ACTIVE` đã materialize deck | Deck phiên đang chạy **không đổi thứ tự** (`BR-048`); chỉ phiên kế tiếp mới khác |
| `TC-173` | `SPEC-040` | Biên | `A` | Bấm Quên khi đã có `Like`/`Dislike`/`Cannot Eat` | Bốn thứ khai tay **còn nguyên**; chỉ $I$ bị bỏ qua |
| `TC-174` | `SPEC-037` | Hồi quy | `I` | Deck của nhóm 150 món, người dùng có 500 lượt vuốt lịch sử | Tải deck lần đầu vẫn trong ngưỡng `NFR-01` — canh index `participants(user_id)` và `interactions(participant_id)` |

## 3c.2 E14 — Ba món nợ của v1.1

| TC ID | Nguồn | Loại ca | Tầng | Nội dung kiểm thử | Kết quả kỳ vọng |
| :---: | :--- | :---: | :---: | :--- | :--- |
| `TC-175` | `SPEC-041` | **Then chốt** | `I` | Participant đã vuốt 5 món, Creator gỡ người đó | $T$ giảm 1, các lượt vuốt thôi tính vào $P$/$N$, **`interactions` vẫn đúng 5 dòng** (`BR-061`) |
| `TC-176` | `SPEC-041` | Âm | `A` | Creator gỡ **chính mình** | Trả `ERR_VALIDATION`, không ghi gì — `BR-020` buộc Creator luôn là Participant |
| `TC-177` | `SPEC-041` | Hồi quy | `I` | Gỡ Participant rồi chốt bữa | Người bị gỡ **không** nhận Default Eating History (`SPEC-017` vốn đã lọc `'REMOVED'`) |
| `TC-178` | `SPEC-042` | **Then chốt** | `I` | Tự thêm một món vào lịch sử ăn hôm nay, rồi Creator chốt lại bữa | Dòng `MANUAL` **không bị ghi đè** (`BR-060`); dòng `DEFAULT` vẫn sinh bình thường |

> [!CAUTION]
> **4 Test Cases then chốt của v1.2** — mỗi cái canh một lỗi im lặng:
>
> - **`TC-160`:** sai `HALF_LIFE_DAYS` thì $I$ vẫn ra số hợp lệ, deck vẫn chạy, chỉ là hệ thống nhớ dai hoặc quên nhanh hơn thiết kế. Không tầng nào phía trên bắt được.
> - **`TC-163`:** học từ phiên `ACTIVE` khiến deck tự sắp lại mình theo chính những lượt vừa vuốt — người dùng thấy thẻ nhảy dưới tay, đúng thứ `BR-048` sinh ra để ngăn.
> - **`TC-166`:** nếu Blacklist chép nhầm đường ghi của `Cannot Eat`, nó xoá lượt vuốt và $P$ tụt — cả nhà thấy một món mất phiếu mà không ai bỏ phiếu chống.
> - **`TC-171`:** "Quên" cài bằng `DELETE` thì Session Ranking của các phiên cũ đổi theo, và `BR-061` bị vi phạm ở một chỗ không ai nghĩ tới lúc bấm nút.
> - **`TC-175`:** phía đọc của `'REMOVED'` đã đúng từ v1.0 nhưng **chưa từng được chạy thật** — ca này là lần đầu tiên nó được kiểm với dữ liệu do ứng dụng tạo ra, chứ không phải do test `INSERT` vào.

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

Toàn bộ **22 SPEC** của v1.0 đều có độ bao phủ kiểm thử:
`SPEC-001` (TC-001→003) • `SPEC-002` (TC-008→010, 095, 096) • `SPEC-003` (TC-011, 012) • `SPEC-004` (TC-013→016, 112) • `SPEC-005` (TC-017→021, 097→099) • `SPEC-006` (TC-022→025, 100, 101) • `SPEC-007` (TC-026→029) • `SPEC-008` (TC-030→035, 107) • `SPEC-009` (TC-036→039) • `SPEC-010` (TC-040→044, 102, 108, 151) • `SPEC-011` (TC-045→047, 103, 104) • `SPEC-012` (TC-048→053, 105, 106) • `SPEC-013` (TC-054→057) • `SPEC-014` (TC-058→062, 111, 121) • `SPEC-015` (TC-063→066) • `SPEC-016` (TC-067→075, 109, 110) • `SPEC-017` (TC-076→078) • `SPEC-018` (TC-004, 005) • `SPEC-019` (TC-006, 007) • `SPEC-020` (TC-079→084) • `SPEC-021` (TC-085→090, 153) • `SPEC-022` (TC-091→094, 154).

### 5.2 Phủ sóng SPEC v1.1 $\to$ Test Cases

Toàn bộ **13 SPEC** của v1.1 đều có độ bao phủ kiểm thử:
`SPEC-024` (TC-113→117) • `SPEC-025` (TC-118→120) • `SPEC-026` (TC-123, 124, 126) • `SPEC-027` (TC-125, 127, 128, 147, 148) • `SPEC-028` (TC-129, 130, 149, 150) • `SPEC-036` (TC-145, 146) • `SPEC-029` (TC-131→133) • `SPEC-030` (TC-134→137, 152) • `SPEC-031` (TC-139, 155) • `SPEC-032` (TC-143, 144) • `SPEC-033` (TC-140) • `SPEC-034` (TC-141, 156, 157) • `SPEC-035` (TC-142, 158).

`SPEC-023` (gợi ý catalog chung, bảo trì sau v1.0) chưa có TC trong tài liệu này — nợ kiểm thử đã ghi nhận, không thuộc phạm vi v1.1.

---

# 6. Lịch sử thay đổi (Change History)

| Version | Ngày | Phần tác động | Nội dung thay đổi | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- | :--- |
| `1.2` | 2026-09-04 | §3c | Bổ sung §3c với `TC-159`→`TC-178` cho 7 tính năng v1.2 (`SPEC-037`→`SPEC-042`); 5 ca then chốt, trong đó `TC-160` canh mốc phân rã 60 ngày và `TC-166` canh ranh giới Blacklist ↔ Cannot Eat | [DEC-069](what-we-gonna-eat-today_decision-log_v3.9.md) |
| `1.1` | 2026-09-02 | §3b, §5 | Bổ sung `TC-156` (phiên hôm qua không chốt được dù quét chưa chạy), `TC-157` (`BR-061` — tương tác của phiên `INVALID` giữ nguyên), `TC-158` (chỉ Admin gỡ được món); sửa `TC-142`: thêm lại hồi sinh **chính dòng cũ**, không tạo dòng mới — unique index không cho phép | E11 Guide §1.1, §4.1 |
| `1.1` | 2026-09-02 | §3b, §5 | Bổ sung `TC-153` (một tag mang cả luật Bắt buộc lẫn Nên có), `TC-154` (Preferred đông cứng qua snapshot mà không sửa đường ghi), `TC-155` (xác nhận hai nhịp và cờ reset khi đổi tập món) | E10-S1/S2 Guide |
| `1.1` | 2026-09-01 | §3b, §5 | Bổ sung `TC-151` (deck mang System Tag — trước E9 trường này luôn rỗng) và `TC-152` (chặng không rỗng dù top-30 lệch hẳn về một tag — canh thứ tự chia chặng trước cắt trần) | E9-S1 Guide §1.1, §1.2 |
| `1.1` | 2026-08-26 | §3b, §5.2 | Bổ sung `TC-145`→`TC-150` cho E8: khử trùng hai luồng Exploit/Explore (`TC-147` — hai luồng chồng nhau nên món chưa từng ăn nằm ở cả hai), ghim bất biến đóng băng deck (`TC-149`, `TC-150`), và suy vị trí tiếp tục (`TC-145`, `TC-146` — `F51`) | E8-S1/S2 Guide |
| `1.1` | 2026-08-26 | §3b | Sửa `TC-117`: hành vi "đặt ràng buộc thay người khác" không biểu diễn được vì `userId` lấy từ phiên đăng nhập, và `ERR_FORBIDDEN` không có trong `ErrorCode` — đổi thành ca khẳng định `userId` trong body bị bỏ qua | E7-S2 Guide §1.4 |
| `1.1` | 2026-08-26 | §3b, §5.2 | Bổ sung 32 TC cho v1.1 (`TC-113`→`TC-144`) ánh xạ `SPEC-024`→`SPEC-035`; 5 ca then chốt canh các lỗi im lặng (thứ tự cắt trần, món đa tag hai chặng, tương tác cũ sau Cannot Eat, ngoại lệ lịch sử ăn, chia lại phần dư chặng); ma trận truy vết v1.1 | [DEC-056](what-we-gonna-eat-today_decision-log_v3.9.md) → [DEC-060](what-we-gonna-eat-today_decision-log_v3.9.md) |
| `0.1` | 2026-08-14 | Toàn bộ | Bản thảo đầu tiên: 94 TC từ SDD, 18 TC biên, 5 Smoke Tests | Khởi tạo baseline kiểm thử v1.0 |
