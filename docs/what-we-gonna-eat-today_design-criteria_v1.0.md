# 🎨 Design Criteria — What We Gonna Eat Today

> **Document Metadata**
>
> - **Version:** `1.0` | **Status:** `Approved`
> - **Created:** `2026-08-14` | **Last Updated:** `2026-08-14`
> - **Upstream:** [PRD](what-we-gonna-eat-today_prd_v1.5.md) • [SDD](what-we-gonna-eat-today_sdd_v1.3.md) • [Tech Spec](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md)
> - **Downstream:** [Design README](designs/README.md) • Giao diện người dùng Web & Mobile
>
> 📌 *Tài liệu định nghĩa ngôn ngữ thiết kế, Design Tokens (màu sắc, typography, spacing), kiểm kê 13 màn hình giao diện, thư viện components và các nguyên tắc chống mẫu (Anti-patterns).*

---

## 📑 Mục lục (Table of Contents)

1. [Bối cảnh sử dụng & Ràng buộc cốt lõi](#1-bối-cảnh-sử-dụng--ràng-buộc-cốt-lõi)
2. [Tính cách sản phẩm (Brand Personality)](#2-tính-cách-sản-phẩm-brand-personality)
3. [Hệ thống Design Tokens](#3-hệ-thống-design-tokens)
   - [3.1 Bảng màu (Color Palette)](#31-bảng-màu-color-palette)
   - [3.2 Kiểu chữ (Typography)](#32-kiểu-chữ-typography)
   - [3.3 Khoảng cách & Lưới (Spacing)](#33-khoảng-cách--lưới-spacing)
   - [3.4 Bo góc & Đổ bóng (Border Radius & Shadows)](#34-bo-góc--đổ-bóng-border-radius--shadows)
4. [Kiểm kê 13 màn hình & Trạng thái (Screens Catalog)](#4-kiểm-kê-13-màn-hình--trạng-thái-screens-catalog)
5. [Thư viện thành phần giao diện (UI Components)](#5-thư-viện-thành-phần-giao-diện-ui-components)
6. [Điểm ngắt kích thước màn hình (Breakpoints)](#6-điểm-ngắt-kích-thước-màn-hình-breakpoints)
7. [Trải nghiệm thao tác trên thiết bị di động](#7-trải-nghiệm-thao-tác-trên-thiết-bị-di-động)
8. [Tiêu chuẩn khả năng tiếp cận (Accessibility - a11y)](#8-tiêu-chuẩn-khả-năng-tiếp-cận-accessibility---a11y)
9. [Sản phẩm tham chiếu (Design References)](#9-sản-phẩm-tham-chiếu-design-references)
10. [Danh mục chống mẫu (Anti-Patterns — Những điều TUYỆT ĐỐI TRÁNH)](#10-danh-mục-chống-mẫu-anti-patterns--những-điều-tuyệt-đối-tránh)
11. [Lịch sử thay đổi (Change History)](#11-lịch-sử-thay-đổi-change-history)

---

# 1. Bối cảnh sử dụng & Ràng buộc cốt lõi

Ứng dụng giúp một **gia đình nhỏ** giải quyết nhanh câu hỏi **"Hôm nay chúng ta ăn gì?"** vào khoảng 5–6 giờ chiều mỗi ngày.

> [!IMPORTANT]
> **3 Ràng buộc thực tế định hình toàn bộ thiết kế thị giác:**
>
> 1. **Tâm lý người dùng:** Đang đói và mệt sau ngày làm việc. Không ai muốn phải học cách sử dụng app lúc này.
> 2. **Bối cảnh thao tác:** Toàn bộ trên điện thoại, thao tác bằng **một tay** (tay còn lại có thể đang bận xách đồ, bế con, hoặc nấu nướng).
> 3. **Ràng buộc nội dung:** **Không có hình ảnh món ăn** ở phiên bản v1.0. Mọi thẻ món chỉ hiển thị bằng chữ. Đây là ràng buộc cố ý, tuyệt đối không lấp khoảng trống bằng ảnh stock hay icon minh họa thừa thãi.

---

# 2. Tính cách sản phẩm (Brand Personality)

| Đặc tính mong muốn | Những điều KHÔNG PHẢI |
| :--- | :--- |
| **Ấm áp & Tin cậy** | Không phải hoạt hình con nít. Không rau củ chibi, không mặt cười hoạt họa, không emoji làm icon. |
| **Dứt khoát & Tinh tế** | Không tạo cảm giác hối thúc. Không đồng hồ đếm ngược, không huy hiệu đỏ cảnh báo khẩn cấp. |
| **Nhẹ nhàng & Rõ ràng** | Không để khoảng trống vô nghĩa. Mọi trạng thái rỗng đều chỉ dẫn hành động tiếp theo cụ thể. |

---

# 3. Hệ thống Design Tokens

## 3.1 Bảng màu (Color Palette)

```css
:root {
  /* Nền và màu chữ cơ bản */
  --surface:          #FBF8F4;  /* Nền chính, tone giấy ấm */
  --surface-raised:   #FFFFFF;  /* Nền thẻ nổi, bottom sheet */
  --surface-sunken:   #F3EEE7;  /* Vùng nhóm, thanh tiến trình */
  --ink:              #1C1917;  /* Màu chữ chính */
  --ink-muted:        #6B6259;  /* Chữ phụ, nhãn thông tin */
  --ink-faint:        #9C9187;  /* Placeholder, chữ bị vô hiệu */
  --border:           #E7E0D6;  /* Đường viền tiêu chuẩn */
  --border-strong:    #D2C7B8;  /* Đường viền nhấn */

  /* Màu nhấn nhận diện thương hiệu (Duy nhất 1 màu nhấn) */
  --accent:           #B4531F;  /* Nút chính, liên kết, trạng thái chọn */
  --accent-hover:     #9A4419;
  --accent-soft:      #FBEDE4;  /* Nền nhấn nhạt */
  --on-accent:        #FFFFFF;

  /* Ngữ nghĩa tương tác vuốt (Swipe Semantics) */
  --yes:              #3F6B3F;  /* Xanh lá ấm: Đề xuất món này */
  --yes-soft:         #E9F0E7;
  --no:               #7A6A5C;  /* Nâu xám trung tính: Hôm nay không muốn ăn */
  --no-soft:          #EFEAE4;

  /* Trạng thái lỗi và cảnh báo nghiệp vụ */
  --danger:           #A3261C;  /* Lỗi thực tế */
  --danger-soft:      #FBE9E7;
  --warning:          #8A6A18;  /* Cảnh báo quy định */
  --warning-soft:     #FBF3DC;
}
```

> [!NOTE]
> **Quy tắc thiết kế bảng màu quan trọng:**  
> **Thao tác vuốt trái TUYỆT ĐỐI KHÔNG dùng màu đỏ.** Vuốt trái đơn thuần có nghĩa là "hôm nay tôi chưa muốn ăn món này" — đây là tín hiệu tự nhiên, không phải lỗi. Màu đỏ `--danger` chỉ dùng cho lỗi hệ thống thực sự.

## 3.2 Kiểu chữ (Typography)

- **Phông chữ chính:** `Be Vietnam Pro` (Tối ưu dấu thanh tiếng Việt).
- **Phông chữ dự phòng:** `Inter`, `system-ui`, `sans-serif`.

```css
--font-sans: 'Be Vietnam Pro', 'Inter', system-ui, sans-serif;
```

| Tên Style | Size / Line-height | Font-weight | Ứng dụng thực tế |
| :--- | :---: | :---: | :--- |
| `display` | 28px / 34px | 700 (Bold) | Tên món ăn trên thẻ vuốt |
| `title` | 22px / 28px | 600 (SemiBold) | Tiêu đề màn hình |
| `subtitle` | 17px / 24px | 600 (SemiBold) | Tiêu đề các phân mục con |
| `body-lg` | 17px / 26px | 400 (Regular) | Nội dung chính |
| `body` | 15px / 22px | 400 (Regular) | Văn bản mặc định |
| `caption` | 13px / 18px | 500 (Medium) | Nhãn danh mục, metadata |
| `mono-num` | 15px / 22px | 600 (SemiBold) | Số đếm bảng tổng hợp (`font-variant-numeric: tabular-nums`) |

## 3.3 Khoảng cách & Lưới (Spacing)

Thang đo bội số 4px:

```css
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;
--space-4: 16px;  --space-5: 24px;  --space-6: 32px;
--space-7: 48px;  --space-8: 64px;
```

## 3.4 Bo góc & Đổ bóng (Border Radius & Shadows)

```css
--radius-sm:   8px;    /* Chips nhãn, ô nhập liệu */
--radius-md:   12px;   /* Nút bấm, hàng danh sách */
--radius-lg:   20px;   /* Thẻ vuốt món ăn, bottom sheet */
--radius-full: 999px;  /* Nút tròn, huy hiệu số đếm */

--shadow-card: 0 1px 2px rgba(28,25,23,.06), 0 4px 12px rgba(28,25,23,.05);
--shadow-lift: 0 2px 4px rgba(28,25,23,.08), 0 12px 28px rgba(28,25,23,.10);
```

---

# 4. Kiểm kê 13 màn hình & Trạng thái (Screens Catalog)

| Mã màn | Tên màn hình | Mục đích chính | Yêu cầu trạng thái đặc biệt |
| :---: | :--- | :--- | :--- |
| `S-01` | Đăng nhập | Xác thực Google OAuth | Nút tiếp tục Google, thông báo lỗi nếu fail |
| `S-02` | Danh sách nhóm | Chọn không gian gia đình | Empty state: Nút "Tạo nhóm" & "Dùng link mời" |
| `S-03` | Tạo nhóm | Thiết lập nhóm & múi giờ | Tự nhận diện múi giờ thiết bị |
| `S-04` | Trang chủ nhóm | Điểm xuất phát hàng ngày | **Nhóm chưa có món:** Chặn nút mở phiên, hướng dẫn thêm món |
| `S-05` | Danh mục món | Catalog món của nhóm | Empty state: 3 ví dụ món mẫu mờ trực quan |
| `S-06` | Thêm món mới | Nhập món & chọn tag | **Phát hiện trùng:** Nút "Dùng món này" nổi bật hơn "Vẫn tạo mới" |
| `S-07` | Quy định nhóm | Cấu hình mâm cơm | Empty state nêu rõ hệ quả nếu không đặt rule |
| `S-08` | Mở phiên chọn | Chọn người ăn & bắt đầu | Lỗi thành viên rời nhóm hiển thị trực tiếp tại hàng |
| `S-09` | Deck vuốt thẻ | Duyệt món 1 tay | Hết món: Gợi ý "Tôi chọn xong"; Mất mạng: Retry nền |
| `S-10` | Chốt mâm cơm | Bảng xếp hạng & chốt bữa | Thiếu món bắt buộc: Cảnh báo trực tiếp trên nút chốt |
| `S-11` | Bữa ăn hôm nay | Xem thực đơn đã chốt | Hiển thị danh sách món chính thức |
| `S-12` | Lịch sử ăn | Xem lịch sử theo ngày | Giải thích rõ cơ chế lưu lịch sử để tránh lặp món |
| `S-13` | Mời thành viên | Tạo & sao chép link mời | Hiển thị token hash và ngày hết hạn |

---

# 5. Thư viện thành phần giao diện (UI Components)

- **`DishCard`:** Thẻ món chữ lớn (`display`), chip tag bên dưới, nền `--surface-raised`. Khi kéo nghiêng tối đa 8° với overlay màu tương ứng.
- **`SwipeControls`:** Cụm 2 nút bấm lớn ở nửa dưới màn hình kèm nút Undo ở giữa (bắt buộc có để hỗ trợ accessibility).
- **`TagChip`:** Nhãn phân loại món ăn (Main, Soup, Side, Staple, Dessert).
- **`InlineError`:** Thông báo lỗi màu `--danger` đặt ngay cạnh input, tuyệt đối không dùng alert popup.
- **`Sheet`:** Giao diện biểu mẫu trượt từ đáy màn hình (Bottom Sheet).
- **`Skeleton`:** Khung xương tải trang, không dùng spinner quay tròn.

---

# 6. Điểm ngắt kích thước màn hình (Breakpoints)

- **`360px – 430px` (Mục tiêu chính):** Kích thước chuẩn của hầu hết smartphone hiện đại.
- **`431px – 767px`:** Giao diện điện thoại màn hình lớn / máy tính bảng dọc.
- **`≥ 768px`:** Nội dung căn giữa, giới hạn chiều rộng tối đa `560px` (không làm layout chia cột cho desktop).

---

# 7. Trải nghiệm thao tác trên thiết bị di động

- **Quy tắc nửa dưới màn hình ([NFR-03](what-we-gonna-eat-today_prd_v1.5.md)):** Toàn bộ các nút bấm và thao tác chính đều nằm trong tầm với của ngón cái ở nửa dưới màn hình.
- **Vùng chạm tối thiểu:** $44 \times 44\text{px}$, khoảng cách giữa các vùng chạm $\ge 8\text{px}$.
- **Cập nhật lạc quan (Optimistic UI):** Thao tác vuốt phản hồi tức thì $< 100\text{ms}$.

---

# 8. Tiêu chuẩn khả năng tiếp cận (Accessibility - a11y)

- Tỉ lệ tương phản màu văn bản tiêu chuẩn $\ge 4.5:1$ (văn bản lớn $\ge 3:1$).
- **Nguyên tắc nút bấm song song:** Mọi cử chỉ vuốt đều phải có nút bấm tương đương trong `SwipeControls`.
- Nhãn Screen Reader là câu hoàn chỉnh (vd: *"Đề xuất món Canh chua cá lóc"*).

---

# 9. Sản phẩm tham chiếu (Design References)

- **Things 3:** Bố cục phân cấp tinh tế bằng khoảng trắng và độ đậm nhạt chữ thay vì lạm dụng màu mè và đường kẻ.
- **Bear:** Nền giấy ấm áp (`--surface`), khoảng cách dòng thoáng đãng, dễ chịu cho mắt.
- **Tinder (Chỉ lấy cơ chế vuốt):** Giữ tiết tấu dứt khoát "1 thẻ - 1 quyết định", không học theo phong cách màu neon hay gamification.

---

# 10. Danh mục chống mẫu (Anti-Patterns — Những điều TUYỆT ĐỐI TRÁNH)

> [!CAUTION]
> **Tuyệt đối KHÔNG đưa vào dự án các yếu tố sau:**
>
> 1. Không dùng hiệu ứng chuyển màu (Gradient) ở bất kỳ đâu.
> 2. Không dùng ảnh stock món ăn mượn tạm.
> 3. Không dùng icon emoji hoạt hình, mặt cười hay rau củ chibi.
> 4. Không dùng màu đỏ cho thao tác vuốt trái (từ chối món).
> 5. Không dùng đồng hồ đếm ngược hay hiệu ứng gây áp lực thời gian.
> 6. Không dùng hiệu ứng pháo hoa, ăn mừng khi chốt bữa.
> 7. Không dùng popup modal nằm giữa màn hình trên thiết bị di động.
> 8. Không dùng vòng quay loading (spinner) — sử dụng Skeleton.

---

# 11. Lịch sử thay đổi (Change History)

| Version | Ngày | Phần tác động | Nội dung thay đổi | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- | :--- |
| `0.1` | 2026-08-14 | Toàn bộ | Bản thảo đầu tiên: Tokens, 13 màn hình, components, chống mẫu | Khởi tạo baseline thiết kế |
