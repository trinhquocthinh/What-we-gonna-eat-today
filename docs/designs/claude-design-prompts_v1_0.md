# 💬 Claude Design Prompts — What We Gonna Eat Today

> **Document Metadata**
>
> - **Version:** `1.0` | **Status:** `Approved`
> - **Created:** `2026-08-14` | **Last Updated:** `2026-08-18`
> - **Upstream:** [Design Criteria](what-we-gonna-eat-today_design-criteria_v0_1.md) • [UI Design Handoff](README.md)
> - **Downstream:** Bộ prototype HTML trong `docs/designs/designs/` • Màn hình S-01 đến S-13
>
> 📌 *Bộ câu lệnh (Prompts) chuẩn hóa dùng cho công cụ Claude Design (`claude.ai/design`) nhằm thiết lập Design System và tạo mẫu 13 màn hình giao diện tuân thủ tuyệt đối quy chuẩn sản phẩm.*

---

## 📑 Mục lục (Table of Contents)

1. [Prompt khởi tạo Design System (System Prompt)](#1-prompt-khởi-tạo-design-system-system-prompt)
2. [Nguyên tắc thực thi từng bước (Step-by-step Principles)](#2-nguyên-tắc-thực-thi-từng-bước-step-by-step-principles)
3. [Thứ tự ưu tiên dựng màn hình theo rủi ro thiết kế](#3-thứ-tự-ưu-tiên-dựng-màn-hình-theo-rủi-ro-thiết-kế)
4. [Danh sách Prompt chi tiết cho từng màn hình then chốt](#4-danh-sách-prompt-chi-tiết-cho-từng-màn-hình-then-chốt)
   - [4.1 S-09 — Thẻ vuốt chọn món (Candidate Deck)](#41-s-09--thẻ-vuốt-chọn-món-candidate-deck)
   - [4.2 S-04 — Trang nhóm (Trạng thái rỗng chưa có món)](#42-s-04--trang-nhóm-trạng-thái-rỗng-chưa-có-món)
   - [4.3 S-10 — Chốt bữa ăn (Session Ranking & Finalize)](#43-s-10--chốt-bữa-ăn-session-ranking--finalize)
   - [4.4 S-05 & S-06 — Danh mục món & Bottom Sheet thêm món](#44-s-05--s-06--danh-mục-món--bottom-sheet-thêm-món)
5. [Cẩm nang tinh chỉnh & Phản hồi hiệu quả](#5-cẩm-nang-tinh-chỉnh--phản-hồi-hiệu-quả)
6. [Quy chuẩn đóng gói Handoff cho Claude Code / AI Developer](#6-quy-chuẩn-đóng-gói-handoff-cho-claude-code--ai-developer)
7. [Lịch sử thay đổi (Change History)](#7-lịch-sử-thay-đổi-change-history)

---

# 1. Prompt khởi tạo Design System (System Prompt)

> [!IMPORTANT]
> **Hướng dẫn:** Gửi khối prompt này **ĐẦU TIÊN** và đợi Claude Design xác nhận thiết lập xong style guide trước khi yêu cầu vẽ bất kỳ màn hình nào.

```text
Tôi đang thiết kế một app cho gia đình quyết định hôm nay ăn món gì. Người dùng mở app khoảng 5–6 giờ chiều, đang đói và hơi mệt, dùng trên điện thoại bằng MỘT tay. Mỗi người vuốt qua các món khoảng 30 giây.

Trước khi vẽ bất cứ thứ gì, hãy thiết lập design system sau và xác nhận lại với tôi.

TÍNH CÁCH THIẾT KẾ
- Ấm, KHÔNG dễ thương. Không rau củ hoạt hình, không mặt cười, không emoji làm icon.
- Dứt khoát, KHÔNG hối thúc. Không đếm ngược, không huy hiệu đỏ, không gamification.
- Nhẹ, KHÔNG trống rỗng. Khoảng trắng rộng nhưng luôn có một việc rõ ràng để làm tiếp.

BẢNG MÀU — Dùng đúng các mã HEX này, không tự đổi:
--surface:         #FBF8F4 (Nền chính, giấy ấm)
--surface-raised:  #FFFFFF (Thẻ món, bottom sheet)
--surface-sunken:  #F3EEE7 (Vùng nhóm, thanh tiến trình)
--ink:             #1C1917 (Chữ chính)
--ink-muted:       #6B6259 (Chữ phụ)
--ink-faint:       #9C9187 (Placeholder, disabled)
--border:          #E7E0D6 (Viền chuẩn)
--accent:          #B4531F (MÀU NHẤN DUY NHẤT)
--accent-soft:     #FBEDE4
--yes:             #3F6B3F (Vuốt phải, Đề xuất món)
--no:              #7A6A5C (Vuốt trái — NÂU TRUNG TÍNH, TUYỆT ĐỐI KHÔNG DÙNG ĐỎ)
--danger:          #A3261C (CHỈ dùng cho lỗi hệ thống thật)

KIỂU CHỮ (TYPOGRAPHY)
Font: Be Vietnam Pro, dự phòng Inter. Bắt buộc, vì tên món tiếng Việt đầy dấu chồng (ế, ộ, ữ).
- display 28/34 700 · title 22/28 600 · subtitle 17/24 600 · body-lg 17/26 400 · body 15/22 400 · caption 13/18 500
- Chiều cao dòng rộng hơn bình thường ở mọi cấp.
- Số trong bảng thống kê dùng font-variant-numeric: tabular-nums.

KHOẢNG CÁCH & BO GÓC
- Khoảng cách thang 4px: 4, 8, 12, 16, 24, 32, 48, 64. Lề màn hình 16px.
- Bo góc: 8px (chip/input) · 12px (nút/hàng) · 20px (thẻ món/sheet) · 999px (nút tròn).
- Đổ bóng: Chỉ 2 mức rất nhẹ (--shadow-card, --shadow-lift).

RÀNG BUỘC TUYỆT ĐỐI
1. KHÔNG có ảnh món ăn. App không có upload ảnh. Thẻ món CHỈ CÓ CHỮ. Đừng lấp chỗ trống bằng ảnh stock hay icon món ăn.
2. KHÔNG gradient ở bất kỳ đâu.
3. Chỉ MỘT màu nhấn duy nhất (--accent).
4. Mọi thao tác chính nằm ở NỬA DƯỚI màn hình.
5. Vùng chạm tối thiểu 44×44px.
6. Thiết kế cho khung 390px trước. Từ 768px trở lên chỉ căn giữa, rộng tối đa 560px.
7. Chế độ sáng (Light mode).

Hãy dựng một style guide ngắn thể hiện bảng màu, thang chữ, nút ở 4 kiểu, và một chip nhãn. Chưa vẽ màn hình nào cả.
```

---

# 2. Nguyên tắc thực thi từng bước (Step-by-step Principles)

1. **Tuyệt đối không yêu cầu cả 13 màn hình trong một câu lệnh:** Claude Design sẽ sinh ra các bản nháp nông và khó tinh chỉnh. Hãy làm lần lượt từng màn hình.
2. **Khóa chặt quy tắc "Không có ảnh món" ngay từ đầu:** Tránh phản xạ tự nhiên của AI khi vẽ thẻ là tự chèn ảnh stock.
3. **Giữ vững màu nâu `--no` cho thao tác từ chối:** Tuyệt đối không để AI chuyển vuốt trái sang màu đỏ.

---

# 3. Thứ tự ưu tiên dựng màn hình theo rủi ro thiết kế

| Thứ tự | Màn hình | Lý do ưu tiên thực hiện trước |
| :---: | :--- | :--- |
| **1** | `S-09` (Thẻ vuốt chọn món) | Màn hình cốt lõi nhất, có rủi ro cao vì không dùng hình ảnh minh họa |
| **2** | `S-04` (Trang nhóm rỗng) | Điểm chạm đầu tiên của người dùng mới khi chưa có dữ liệu |
| **3** | `S-10` (Chốt bữa ăn) | Màn hình dày đặc thông tin và số đếm tương tác nhất |
| **4** | `S-05`, `S-06` (Danh mục & Thêm món) | Luồng phát hiện trùng lặp tinh tế và chọn System Tags |
| **5** | Các màn hình còn lại | Dựng sau khi các màn hình then chốt đã thống nhất phong cách |

---

# 4. Danh sách Prompt chi tiết cho từng màn hình then chốt

## 4.1 S-09 — Thẻ vuốt chọn món (Candidate Deck)

```text
Dựng màn hình vuốt chọn món, dùng đúng design system vừa thiết lập.

BỐ CỤC (Khung 390px):
- Đỉnh: Chỉ báo tiến độ "Món 7 / 32", chữ caption, màu ink-muted. Không dùng thanh tiến trình.
- Giữa: MỘT thẻ món chiếm phần lớn khung nhìn. Nền surface-raised, bo góc 20, bóng nhẹ.
  Trong thẻ: Tên món cỡ display 28/34 700 (ví dụ "Cá basa kho tiêu"). Dưới tên là 1–2 chip nhãn ("Món mặn", "Canh") nền surface-sunken, chữ ink-muted.
  Thẻ KHÔNG có ảnh.
- Nửa dưới: Hai nút lớn cạnh nhau (cao >= 56px).
  Nút trái "Không, hôm nay" dùng màu --no (#7A6A5C) - NÂU TRUNG TÍNH, không dùng đỏ.
  Nút phải "Muốn ăn" dùng màu --yes (#3F6B3F).
  Giữa hai nút, phía dưới là một nút hoàn tác (Undo) nhỏ dạng chữ.

Cho tôi xem thêm 2 trạng thái:
1. Đang kéo thẻ sang phải: Thẻ nghiêng tối đa 8 độ, lớp phủ nhạt màu yes-soft (#E9F0E7).
2. Hết món: Thẻ được thay bằng thông báo "Bạn đã xem hết. Xong lượt của mình chứ?" kèm nút "Tôi chọn xong".

Nút bấm là ĐƯỜNG ĐI CHÍNH, cử chỉ vuốt là lối tắt.
```

## 4.2 S-04 — Trang nhóm (Trạng thái rỗng chưa có món)

```text
Dựng trang chính của nhóm ở trạng thái NHÓM MỚI CHƯA CÓ MÓN NÀO.

- Tiêu đề nhóm ở trên, cỡ title.
- Phần chính: KHÔNG hiện nút "Mở phiên hôm nay". Thay bằng một khối hướng dẫn:
  "Trước tiên hãy thêm vài món nhà bạn hay ăn."
  Câu phụ màu ink-muted: "Khoảng 15–20 món là đủ để bắt đầu."
  Một nút chính "Thêm món" màu accent.
- Dưới cùng: Ba lối tắt mờ hơn — Danh mục món, Quy định, Thành viên.

Trạng thái rỗng phải nêu VIỆC CẦN LÀM TIẾP, không dùng minh họa trang trí thừa thãi.
Sau đó cho tôi xem trạng thái ĐÃ CÓ MÓN và ĐANG CÓ PHIÊN CHẠY: Thẻ phiên hiển thị "2 / 4 người đã chọn xong", kèm nút vào phiên.
```

## 4.3 S-10 — Chốt bữa ăn (Session Ranking & Finalize)

```text
Dựng màn hình để người tổ chức chốt các món hôm nay.

- Danh sách món xếp theo mức độ ủng hộ. Mỗi hàng gồm: Tên món, chip nhãn, và 3 số đếm dạng tabular-nums:
  Số người muốn ăn (xanh), số người không muốn (nâu), số người vừa ăn gần đây.
  Số 0 hiển thị MỜ chứ không ẩn để không bị lệch hàng.
- Một mục riêng phía dưới "Chưa ai chọn", vẫn cho phép bấm chọn.
- Khay cố định đáy màn hình: Các món đã chọn dạng chip, và nút "Chốt bữa hôm nay".

Cho tôi xem thêm 2 trạng thái:
1. Chưa ai vuốt: "Chưa có ai chọn xong. Bạn vẫn chốt được ngay bây giờ."
2. Thiếu món bắt buộc: Ngay TRÊN nút chốt, một dòng cảnh báo màu danger: "Còn thiếu: 1 món Canh". Lỗi nằm cạnh nút, KHÔNG dùng hộp thoại popup.
```

## 4.4 S-05 & S-06 — Danh mục món & Bottom Sheet thêm món

```text
Dựng hai màn hình liên quan:

MÀN 1 — Danh mục món:
Ô tìm kiếm ở trên, danh sách món kèm chip nhãn, nút thêm nổi ở góc dưới phải.
Trạng thái rỗng: "Chưa có món nào", nút thêm, và 3 ví dụ mờ: "Cá basa kho tiêu", "Canh chua cá lóc", "Gà chiên nước mắm".

MÀN 2 — Thêm món (Bottom Sheet trượt từ đáy, KHÔNG phải modal giữa màn hình):
Ô nhập tên món, chọn nhãn từ 5 giá trị: Cơm, Món mặn, Món phụ, Canh, Tráng miệng.

Trạng thái quan trọng nhất: PHÁT HIỆN TRÙNG LẶP.
Khi tên gõ vào trùng món đã có, hiện danh sách món đang tồn tại kèm nút "Dùng món này".
Bên dưới, MỜ HƠN là liên kết "Đây là món khác, vẫn tạo mới". Nút dùng lại phải NỔI BẬT HƠN nút tạo mới.
```

---

# 5. Cẩm nang tinh chỉnh & Phản hồi hiệu quả

| Tình huống phản hồi | Cách diễn đạt khuyến nghị |
| :--- | :--- |
| **Nút bấm quá nhỏ** | *"Nút này phải chạm được bằng ngón cái khi cầm 1 tay, hãy đặt chiều cao $\ge 56\text{px}$ và nằm trong $40\%$ nửa dưới màn hình."* |
| **Bị tự động thêm ảnh món** | *"Bỏ ảnh món ăn đi. Hệ thống không có ảnh. Thẻ món ăn chỉ dùng chữ và nhãn."* |
| **Nút từ chối bị tô màu đỏ** | *"Đổi màu nút từ chối sang nâu `#7A6A5C`. Vuốt trái không phải lỗi, chỉ là 'hôm nay tôi không muốn ăn'."* |
| **Xuất hiện quá nhiều màu nhấn** | *"Chỉ dùng 1 màu nhấn duy nhất là `#B4531F`. Loại bỏ các màu trang trí khác."* |

---

# 6. Quy chuẩn đóng gói Handoff cho Claude Code / AI Developer

```text
Đóng gói handoff cho AI Developer với các ràng buộc kỹ thuật sau:
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4
- Toàn bộ Component đặt trong src/features/<feature>/presentation/
- Tuyệt đối không dùng localStorage hay sessionStorage
- Không thêm dependency mới ngoài lucide-react
- Mọi cử chỉ vuốt bắt buộc có nút bấm tương đương
- Tương phản chữ thường >= 4.5:1, viền focus 2px màu accent
```

---

# 7. Lịch sử thay đổi (Change History)

| Version | Ngày | Nội dung cập nhật | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- |
| `1.0` | 2026-08-18 | Cập nhật cấu trúc tài liệu, chuẩn hóa prompt 4 màn hình cốt lõi | [Design Criteria v0.1](what-we-gonna-eat-today_design-criteria_v0_1.md) |
| `0.1` | 2026-08-14 | Khởi tạo bộ câu lệnh Claude Design ban đầu | Tạo prototype 13 màn hình |
