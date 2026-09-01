# 🎨 UI Design Handoff — What We Gonna Eat Today (v1.0)

> **Document Metadata**
>
> - **Version:** `1.0` | **Status:** `Approved`
> - **Created:** `2026-08-14` | **Last Updated:** `2026-08-18`
> - **Upstream:** [Design Criteria](../what-we-gonna-eat-today_design-criteria_v1.0.md) • [PRD](../what-we-gonna-eat-today_prd_v1.5.md) • [Business Rules](../what-we-gonna-eat-today_business-rules_v1.8.md)
> - **Downstream:** [Master Plan](../what-we-gonna-eat-today_master-plan_v2.1.md) • Tầng Presentation (`src/features/*/presentation`)
>
> 📌 *Cẩm nang bàn giao thiết kế giao diện v1.0: Danh mục 13 màn hình hoàn thiện (`S-01` đến `S-13`), hệ thống Design Tokens màu sắc/typography, các ràng buộc trải nghiệm người dùng (UX) và quy tắc chuyển đổi sang Next.js App Router.*

---

## 📑 Mục lục (Table of Contents)

1. [Tổng quan & Mục tiêu sản phẩm](#1-tổng-quan--mục-tiêu-sản-phẩm)
2. [Ràng buộc thiết kế cốt lõi (Core Constraints)](#2-ràng-buộc-thiết-kế-cốt-lõi-core-constraints)
3. [Hệ thống Design Tokens & Typography](#3-hệ-thống-design-tokens--typography)
4. [Danh mục 13 màn hình chuẩn (Screen Catalog S-01 → S-13)](#4-danh-mục-13-màn-hình-chuẩn-screen-catalog-s-01--s-13)
5. [Quy tắc tổ chức Component & Clean Architecture](#5-quy-tắc-tổ-chức-component--clean-architecture)
6. [Lịch sử thay đổi (Change History)](#6-lịch-sử-thay-đổi-change-history)

---

# 1. Tổng quan & Mục tiêu sản phẩm

Ứng dụng hỗ trợ gia đình giải quyết câu hỏi muôn thuở: **"Hôm nay ăn gì?"**.
Khoảng 5–6 giờ chiều, người tổ chức (Creator) mở phiên chọn món; các thành viên trong nhà vuốt qua các thẻ món ăn trên điện thoại (~30 giây/người); Creator theo dõi bảng tổng hợp đồng thuận thời gian thực và chốt thực đơn của ngày.

> [!NOTE]
> Các file HTML trong thư mục `designs/` là **tài liệu tham chiếu giao diện trực quan** (Interactive Prototype), **không phải code production**. Nhiệm vụ kỹ thuật là dựng lại các thiết kế này bằng **Next.js App Router + TypeScript Strict + Tailwind CSS**.

---

# 2. Ràng buộc thiết kế cốt lõi (Core Constraints)

> [!IMPORTANT]
> **Các nguyên tắc bất biến kế thừa từ Design Criteria:**
>
> 1. **KHÔNG CÓ ẢNH MÓN ĂN:** Không ảnh stock, không icon đồ họa minh họa món. Thẻ món tập trung 100% vào kiểu chữ (Typography) rõ ràng.
> 2. **KHÔNG DÙNG GRADIENT:** Tuyệt đối không dùng dải màu chuyển tiếp ở bất kỳ thành phần nào.
> 3. **MỘT MÀU NHẤN DUY NHẤT (`--accent`):** Màu `--yes` chỉ xuất hiện ở đúng 3 vị trí (Nút Đề xuất, Nền kéo thẻ sang phải, Số đếm Đề xuất trong bảng tổng hợp).
> 4. **VUỐT TRÁI KHÔNG DÙNG MÀU ĐỎ:** Thao tác từ chối ("Hôm nay không muốn ăn") dùng màu nâu trung tính `--no` (`#7A6A5C`). Màu đỏ `--danger` chỉ dành cho lỗi hệ thống thật sự.
> 5. **MỌI CỬ CHỈ VUỐT PHẢI CÓ NÚT BẤM TƯƠNG ĐƯƠNG:** Nút bấm ở nửa dưới màn hình là đường đi chính; cử chỉ vuốt là phím tắt tiện lợi.
> 6. **BẢO VỆ VÙNG CHẠM:** Mọi thao tác chính nằm ở nửa dưới màn hình; kích thước vùng chạm tối thiểu **$\ge 44 \times 44\text{px}$**, khoảng cách giữa các nút $\ge 8\text{px}$.
> 7. **SKELETON TRẠNG THÁI TẢI:** Sử dụng khung xương (Skeleton loading), tuyệt đối không dùng spinner xoay tròn gây căng thẳng.
> 8. **BOTTOM SHEET BIỂU MẪU:** Mọi form nhập liệu xuất hiện dạng Sheet trượt từ đáy màn hình, không dùng Modal pop-up giữa màn hình.

---

# 3. Hệ thống Design Tokens & Typography

## 3.1 Design Tokens (`globals.css`)

```css
:root {
  /* Nền và chữ */
  --surface:         #FBF8F4;  /* Nền màn hình giấy ấm */
  --surface-raised:  #FFFFFF;  /* Thẻ món, bottom sheet, hàng danh sách */
  --surface-sunken:  #F3EEE7;  /* Khay nhóm, thanh tiến trình */
  --ink:             #1C1917;  /* Màu chữ chính */
  --ink-muted:       #6B6259;  /* Chữ phụ, nhãn, số 0 trong bảng đếm */
  --ink-faint:       #9C9187;  /* Placeholder và disabled */
  --border:          #E7E0D6;  /* Viền ngăn cách chuẩn */
  --border-strong:   #D2C7B8;  /* Viền phần tử tương tác nổi bật */

  /* Màu nhấn chủ đạo (Đất nung ấm) */
  --accent:          #B4531F;
  --accent-hover:    #9A4419;
  --accent-active:   #8C3E17;
  --accent-soft:     #FBEDE4;
  --on-accent:       #FFFFFF;

  /* Ngữ nghĩa tương tác */
  --yes:             #3F6B3F;  /* Xanh lá cây sẫm (Đề xuất / Thích) */
  --yes-hover:       #365B36;
  --yes-soft:        #E9F0E7;
  --no:              #7A6A5C;  /* Nâu đất TRUNG TÍNH (Không bao giờ dùng đỏ) */
  --no-soft:         #EFEAE4;

  /* Cảnh báo và Lỗi */
  --warning:         #8A6A18;  /* Cảnh báo có thể override */
  --warning-soft:    #FBF3DC;
  --danger:          #A3261C;  /* CHỈ dành cho lỗi hệ thống thật */
  --danger-soft:     #FBE9E7;

  /* Đổ bóng tối giản */
  --shadow-card: 0 1px 2px rgba(28,25,23,.06), 0 4px 12px rgba(28,25,23,.05);
  --shadow-lift: 0 2px 4px rgba(28,25,23,.08), 0 12px 28px rgba(28,25,23,.10);
}
```

## 3.2 Typography Scale

- **Phông chữ bắt buộc:** **`Be Vietnam Pro`** (400, 500, 600, 700) nạp qua `next/font/google`. Đảm bảo không bị lỗi dấu tiếng Việt chồng (`ế`, `ộ`, `ữ`, `ằ`).

| Tên Style | Size / Line-height | Font Weight | Phạm vi sử dụng |
| :--- | :---: | :---: | :--- |
| `hero` | $34\text{px} / 42\text{px}$ | `700` (Bold) | Tên món không khung thẻ; Tiêu đề chào mừng S-01 |
| `title-lg` | $24\text{px} / 32\text{px}$ | `700` (Bold) | Tiêu đề màn hình chính (S-02, S-08, S-11) |
| `title-md` | $20\text{px} / 28\text{px}$ | `600` (Semibold) | Tên thẻ món trong chồng bài (S-07); Tiêu đề Sheet |
| `body-lg` | $16\text{px} / 24\text{px}$ | `400` / `500` | Văn bản chính; Tên món trong danh sách; Nút bấm chính |
| `body-sm` | $14\text{px} / 20\text{px}$ | `400` / `500` | Nhãn phụ; Lý do gợi ý (Reason tags); Bảng đếm |
| `caption` | $12\text{px} / 16\text{px}$ | `500` (Medium) | Tag phân loại (`MAIN`, `SOUP`); Trạng thái metadata |

---

# 4. Danh mục 13 màn hình chuẩn (Screen Catalog S-01 → S-13)

| Mã màn hình | Tên màn hình | Tính năng & Luồng nghiệp vụ | Tham chiếu Spec |
| :---: | :--- | :--- | :---: |
| `S-01` | **Đăng nhập (Sign In)** | Đăng nhập Google OAuth / Authentik, copy trung tính | `SPEC-001` |
| `S-02` | **Danh sách nhóm (Groups Overview)** | Danh sách nhóm gia đình, trạng thái phiên hôm nay, nút tạo nhóm | `SPEC-002` |
| `S-03` | **Tạo nhóm mới (Create Group Sheet)** | Bottom sheet nhập tên nhóm và chọn múi giờ IANA | `SPEC-002` |
| `S-04` | **Tổng quan nhóm (Group Hub)** | Bảng điều khiển nhóm: Mở phiên, xem thực đơn, quản lý món/thành viên | `SPEC-007` |
| `S-05` | **Danh mục món ăn (Dish Catalog)** | Quản lý Group Dish Pool, tìm kiếm, lọc theo System Tag | `SPEC-005` |
| `S-06` | **Thêm món mới (Add Dish Sheet)** | Thêm món, chuẩn hóa tên, gợi ý trùng lặp, gán System Tags | `SPEC-005` |
| `S-07` | **Vuốt chọn món (Candidate Deck)** | Trải nghiệm vuốt thẻ 1 tay: Thích / Bỏ qua / Undo / Lý do gợi ý | `SPEC-010→012` |
| `S-08` | **Tổng hợp phiên (Session Ranking)** | Creator theo dõi bảng điểm đồng thuận thời gian thực và chọn món nháp | `SPEC-014, 015` |
| `S-09` | **Cấu hình phiên (Session Setup)** | Creator cấu hình thành viên tham gia, chọn Chef, snapshot rules | `SPEC-008, 009` |
| `S-10` | **Xem xét chốt thực đơn (Finalize Review)** | Kiểm tra ràng buộc mâm cơm, cảnh báo thiếu món, xác nhận chốt | `SPEC-016` |
| `S-11` | **Bữa ăn hôm nay (Today's Meal)** | Hiển thị thực đơn Final Meal đã chốt cho cả gia đình | `SPEC-016` |
| `S-12` | **Quy định mâm cơm (Group Rules Config)** | Admin thiết lập các chỉ tiêu món (`Required` / `Preferred`) | `SPEC-021` |
| `S-13` | **Quản lý thành viên & Mời (Members & Invite)** | Danh sách thành viên, gán vai trò Chef/Admin, tạo link mời | `SPEC-003, 004` |

---

# 5. Quy tắc tổ chức Component & Clean Architecture

- Toàn bộ Client và Server Components đặt trong `src/features/<feature>/presentation/`:
  - `containers/`: Server Components hoặc Client Containers bọc state.
  - `components/`: UI components thuần túy, nhận props, không gọi trực tiếp database.
- Dùng `Sheet` dùng chung (`src/shared/presentation/components/sheet.tsx`) với animation trượt mượt mà ([DEC-023](../what-we-gonna-eat-today_decision-log_v3.9.md)).
- State transitions trong Client Component dùng mẫu **Adjust state during render** thay vì lạm dụng `useEffect` ([DEC-022](../what-we-gonna-eat-today_decision-log_v3.9.md)).

---

# 6. Lịch sử thay đổi (Change History)

| Version | Ngày | Nội dung cập nhật | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- |
| `1.0` | 2026-08-18 | Cập nhật hoàn thiện 13 màn hình, design tokens và bảng tra cứu Clean Architecture | Đồng bộ [Master Plan v1.0](../what-we-gonna-eat-today_master-plan_v2.1.md) |
| `0.1` | 2026-08-14 | Khởi tạo tài liệu bàn giao thiết kế UI v1.0 | Khởi tạo baseline thiết kế |
