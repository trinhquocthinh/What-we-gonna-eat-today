# 🎯 Plan & Scope — What We Gonna Eat Today

> **Document Metadata**
>
> - **Version:** `1.0` | **Status:** `Approved`
> - **Created:** `2026-08-14` | **Last Updated:** `2026-08-14`
> - **Upstream:** [Tech Spec & Architecture](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) • [SDD](what-we-gonna-eat-today_sdd_v1.3.md) • [PRD](what-we-gonna-eat-today_prd_v1.5.md)
> - **Downstream:** [Master Plan](what-we-gonna-eat-today_master-plan_v2.1.md) • [Setup & Ops Guide](what-we-gonna-eat-today_setup-and-ops-guide_v1.2.md)
>
> 📌 *Kế hoạch phân bổ giai đoạn và định vị ranh giới phạm vi thực thi cho 17 tính năng phiên bản v1.0.*

---

## 📑 Mục lục (Table of Contents)

1. [Nguyên tắc sắp xếp thứ tự thực thi](#1-nguyên-tắc-sắp-xếp-thứ-tự-thực-thi)
2. [Các giai đoạn phát triển (Phases P0–P6)](#2-các-giai-đoạn-phát-triển-phases-p0p6)
3. [Tổng hợp ước lượng thời gian](#3-tổng-hợp-ước-lượng-thời-gian)
4. [Hệ thống cột mốc quan sát được (Milestones M1–M6)](#4-hệ-thống-cột-mốc-quan-sát-được-milestones-m1m6)
5. [Quy chuẩn hoàn thành (Definition of Done)](#5-quy-chuẩn-hoàn-thành-definition-of-done)
6. [Các điểm dừng kiểm soát rủi ro (Checkpoints)](#6-các-điểm-dừng-kiểm-soát-rủi-ro-checkpoints)
7. [Thứ tự cắt giảm tính năng khi trễ hạn (De-scoping Hierarchy)](#7-thứ-tự-cắt-giảm-tính-năng-khi-trễ-hạn-de-scoping-hierarchy)
8. [Lịch sử thay đổi (Change History)](#8-lịch-sử-thay-đổi-change-history)

---

# 1. Nguyên tắc sắp xếp thứ tự thực thi

Thứ tự các giai đoạn không đi theo tính năng bề nổi mà dựa trên **mức độ rủi ro và quan hệ phụ thuộc kỹ thuật**:

1. **Rủi ro kiến trúc cao nhất làm trước:** Ranh giới tầng (Clean Architecture), quy đổi Decision Date theo múi giờ, và ràng buộc duy nhất của Session ở tầng Database.
2. **Đo lường hạ tầng thực tế sớm:** Kiểm chứng cold start của Neon Postgres ([R-01](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md)) ngay khi có Walking Skeleton để bảo vệ chỉ số [NFR-01](what-we-gonna-eat-today_prd_v1.5.md).
3. **Walking Skeleton thông suốt toàn luồng:** Một luồng mỏng chạy thông suốt từ UI đến DB có giá trị thực tế cao hơn nhiều tính năng rời rạc.
4. **Rule Engine xây dựng sau Deck:** Quy tắc mâm cơm chỉ kiểm tra ở bước cuối (Finalize) nên được làm sau khi trải nghiệm vuốt thẻ đã ổn định.

---

# 2. Các giai đoạn phát triển (Phases P0–P6)

### P0 — Scaffold & Hạ tầng kỹ thuật

- **Mục tiêu:** Khởi tạo repository chuẩn hóa, toàn bộ cổng chất lượng xanh, deploy trang trắng lên Vercel.
- **Hạng mục:** Next.js App Router, TypeScript strict, ESLint chặn luật tầng, Husky, Prettier, commitlint, jscpd, knip, Vitest, Neon project & migration đầu tiên.
- **Ước lượng:** 10 giờ cơ sở (sao chép cấu hình chuẩn, không tự tạo từ đầu).

### P1 — Walking Skeleton (End-to-End thô)

- **Mục tiêu:** Một luồng mỏng nhất chạy suốt từ Đăng nhập $\to$ Tạo nhóm $\to$ Mở phiên $\to$ Vuốt thẻ $\to$ Chốt bữa $\to$ Sinh lịch sử ăn.
- **Hạng mục:** Auth.js Google, Use case Group tối thiểu, Decision Date, Session tối thiểu (partial index), Deck thô, Finalize thô, Đo cold start thực tế trên 4G.
- **Ước lượng:** 24 giờ cơ sở.

### P2 — Group và Danh mục món hoàn chỉnh

- **Mục tiêu:** Nhiều thành viên vào nhóm qua link mời; danh mục món hoạt động hoàn chỉnh với chuẩn hóa tên tiếng Việt.
- **Hạng mục:** Link mời 7 ngày (SHA-256 hash), chuẩn hóa tên món bỏ dấu, phát hiện trùng lặp (`forceCreate`), gán System Tag theo nhóm, UI quản lý món.
- **Ước lượng:** 16 giờ cơ sở.

### P3 — Phiên và Người tham gia

- **Mục tiêu:** Phiên nhiều người chạy ổn định, tự động revalidate khi có thay đổi dữ liệu giữa chừng.
- **Hạng mục:** Revalidate 5 bước khi Start phiên, thêm Participant khi Draft/Active, quản lý trạng thái Completed, UI điều phối phiên cho Creator.
- **Ước lượng:** 14 giờ cơ sở.

### P4 — Deck vuốt và Thuật toán Ranking

- **Mục tiêu:** Thứ tự món ăn mang tính cá nhân hoá và thông minh (phân biệt app với một danh sách giấy thông thường).
- **Hạng mục:** `computeRecencyPenalty` (hàm thuần), thuật toán `buildDeck` kèm tie-break, lưu trữ `session_decks`, Route Handler xử lý vuốt siêu tốc $< 100\text{ms}$, UI vuốt 1 tay.
- **Ước lượng:** 21 giờ cơ sở.

### P5 — Rule Engine và Chốt bữa

- **Mục tiêu:** Creator có bức tranh toàn cảnh để chốt thực đơn; hệ thống tự động kiểm tra quy chuẩn mâm cơm.
- **Hạng mục:** Cấu hình Group Rules, Snapshot Session Rules trong transaction Start, `evaluateRequired` với Independent Tag Counting, Session Ranking tổng hợp, UI chốt bữa.
- **Ước lượng:** 21 giờ cơ sở.

### P6 — Hoàn thiện & Đánh giá NFRs

- **Mục tiêu:** Sản phẩm hoàn chỉnh, thân thiện, sử dụng trực quan không cần hướng dẫn.
- **Hạng mục:** Toàn bộ trạng thái rỗng (Empty States), bảng dịch mã lỗi tiếng Việt, đo kiểm 5 chỉ số NFRs, rà soát Test Coverage $\ge 80\%$.
- **Ước lượng:** 15 giờ cơ sở.

---

# 3. Tổng hợp ước lượng thời gian

| Giai đoạn | Nội dung chính | Giờ cơ sở | Giờ gồm 30% dự phòng |
| :--- | :--- | :---: | :---: |
| **P0** | Scaffold & Quality Gates | 10h | 13h |
| **P1** | Walking Skeleton | 24h | 31h |
| **P2** | Group & Dish hoàn chỉnh | 16h | 21h |
| **P3** | Phiên & Người tham gia | 14h | 18h |
| **P4** | Deck & Thuật toán Ranking | 21h | 27h |
| **P5** | Rule Engine & Chốt bữa | 21h | 27h |
| **P6** | Hoàn thiện & Đánh giá | 15h | 20h |
| | **TỔNG CỘNG** | **121h** | **157h** |

> [!NOTE]
> Với quỹ thời gian 6–8 giờ/tuần, dự án kéo dài khoảng **5–6 tháng**. Với quỹ thời gian 15 giờ/tuần, dự án hoàn thành trong khoảng **2.5 tháng**.

---

# 4. Hệ thống cột mốc quan sát được (Milestones M1–M6)

| Cột mốc | Giai đoạn | Điều kiện đạt mốc quan sát được |
| :---: | :---: | :--- |
| **M1** | Sau P0 | `yarn verify` xanh trên CI và Preview deployment mở được trên điện thoại thật |
| **M2** | Sau P1 | Tự tạo nhóm, thêm 5 món, mở phiên, vuốt thẻ, chốt bữa và thấy lịch sử hoàn toàn trên điện thoại |
| **M3** | Sau P2, P3 | Người thân vào nhóm qua Link mời và cùng tham gia vuốt chọn món trong một phiên |
| **M4** | Sau P4 | Hai người trong cùng phiên thấy thứ tự thẻ khác nhau; món vừa ăn hôm qua bị đẩy lùi xuống dưới |
| **M5** | Sau P5 | Nhóm đặt quy định "Phải có canh", hệ thống chặn chốt bữa khi thiếu và Creator hiểu rõ lý do |
| **M6** | Sau P6 | Cả nhà sử dụng thật 7 ngày liên tiếp mà không cần can thiệp thủ công vào cơ sở dữ liệu |

---

# 5. Quy chuẩn hoàn thành (Definition of Done)

- [x] Unit test được viết và pass đầy đủ (Hàm thuần trong `domain/` tuyệt đối không mock).
- [x] Mỗi kịch bản trong SDD tương ứng ít nhất một test case tự động.
- [x] Lệnh `yarn verify` chạy xanh hoàn toàn (tsc, eslint, prettier, jscpd, knip, vitest).
- [x] Ranh giới tầng kiến trúc không bị vi phạm (được kiểm chứng bởi ESLint và `yarn arch:probe`).
- [x] Preview deployment trên Vercel hoạt động trơn tru.

---

# 6. Các điểm dừng kiểm soát rủi ro (Checkpoints)

> [!CAUTION]
> **3 Ngưỡng bắt buộc phải dừng lại tái cân đối:**
>
> 1. **Vượt 35 giờ mà chưa đạt M2:** Dấu hiệu ước lượng sai lệch toàn cục $\to$ Dừng lại và cắt giảm scope ngay.
> 2. **Cold start sau P1 vượt quá 2 giây:** Tối ưu frontend không thể cứu được $\to$ Quyết định nới ngưỡng NFR-01 hoặc đổi phương án database.
> 3. **Vượt 90 giờ mà chưa đạt M4:** Thuật toán gợi ý cá nhân hoá bị tắc nghẽn $\to$ Xem xét lại thứ tự triển khai.

---

# 7. Thứ tự cắt giảm tính năng khi trễ hạn (De-scoping Hierarchy)

Khi tiến độ bị chậm, thực hiện cắt giảm theo thứ tự từ ít đau đớn nhất:

1. **`F20, F21` Rule Engine:** Đưa v1.0 về 14 tính năng ban đầu (Tiết kiệm $\approx 10\text{h}$).
2. **`F04` System Tag:** Cắt cùng lúc với Rule Engine (Tiết kiệm $\approx 3\text{h}$).
3. **`F06` Thêm Participant giữa phiên:** Mặc định tất cả Member đều tham gia (Tiết kiệm $\approx 3\text{h}$).
4. **`F10` Trạng thái Completed:** Creator tự quan sát bảng tổng hợp để quyết định thời điểm chốt (Tiết kiệm $\approx 3\text{h}$).

> [!IMPORTANT]
> **Tuyệt đối KHÔNG cắt giảm `F17 Cooldown`:** Đây là tín hiệu thông minh duy nhất của phiên bản v1.0 để phân biệt sản phẩm với một danh sách món ăn ngẫu nhiên.

---

# 8. Lịch sử thay đổi (Change History)

| Version | Ngày | Phần tác động | Nội dung thay đổi | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- | :--- |
| `0.1` | 2026-08-14 | Toàn bộ | Bản thảo đầu tiên: 7 giai đoạn, 157 giờ dự phòng, 6 cột mốc | Khởi tạo baseline kế hoạch |
