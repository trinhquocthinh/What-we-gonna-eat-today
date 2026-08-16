# Bộ prompt cho Claude Design — What We Gonna Eat Today

Dẫn xuất từ `design-criteria v1.0`. Mỗi khối dưới đây chép nguyên vào ô chat của Claude Design tại `claude.ai/design`.

**Nguyên tắc quan trọng nhất: đừng yêu cầu cả 13 màn hình trong một prompt.** Claude Design dựng một bản nháp rồi bạn tinh chỉnh qua hội thoại — đưa 13 màn hình cùng lúc sẽ ra 13 bản nháp nông và không màn nào dùng được. Làm từng màn, theo thứ tự ở §3.

---

# 1. Prompt mở đầu — thiết lập hệ thống

Gửi khối này **trước tiên**, một mình, và đợi Claude Design xác nhận trước khi đi tiếp.

```text
Tôi đang thiết kế một app cho gia đình quyết định hôm nay ăn món gì. Người dùng mở app khoảng 5–6 giờ chiều, đang đói và hơi mệt, dùng trên điện thoại bằng MỘT tay. Mỗi người vuốt qua các món khoảng 30 giây.

Trước khi vẽ bất cứ thứ gì, hãy thiết lập design system sau và xác nhận lại với tôi.

TÍNH CÁCH
- Ấm, KHÔNG dễ thương. Không rau củ hoạt hình, không mặt cười, không emoji làm icon.
- Dứt khoát, KHÔNG hối thúc. Không đếm ngược, không huy hiệu đỏ.
- Nhẹ, KHÔNG trống rỗng. Khoảng trắng rộng nhưng luôn có một việc rõ ràng để làm tiếp.

MÀU — dùng đúng các mã này, không tự đổi
--surface: #FBF8F4        nền chính, giấy ấm
--surface-raised: #FFFFFF thẻ món, sheet
--surface-sunken: #F3EEE7 vùng nhóm
--ink: #1C1917            chữ chính
--ink-muted: #6B6259      chữ phụ
--ink-faint: #9C9187      placeholder
--border: #E7E0D6
--accent: #B4531F         MÀU NHẤN DUY NHẤT
--accent-soft: #FBEDE4
--yes: #3F6B3F            vuốt phải, đề xuất món
--no: #7A6A5C             vuốt trái — TRUNG TÍNH, TUYỆT ĐỐI KHÔNG DÙNG ĐỎ
--danger: #A3261C         CHỈ dùng cho lỗi thật

CHỮ
Font: Be Vietnam Pro, dự phòng Inter. Bắt buộc, vì tên món tiếng Việt đầy dấu chồng (ế, ộ, ữ) và nhiều font làm hỏng chỗ đó.
display 28/34 700 · title 22/28 600 · subtitle 17/24 600 · body-lg 17/26 400 · body 15/22 400 · caption 13/18 500
Chiều cao dòng rộng hơn bình thường ở mọi cấp.
Số trong bảng thống kê dùng font-variant-numeric: tabular-nums.

KHOẢNG CÁCH — thang 4px: 4, 8, 12, 16, 24, 32, 48, 64. Lề màn hình 16px.
BO GÓC: 8 chip/input · 12 nút/hàng · 20 thẻ món/sheet · 999 nút tròn
BÓNG: chỉ 2 mức, rất nhẹ. Mọi thứ khác dùng viền.

RÀNG BUỘC TUYỆT ĐỐI
1. KHÔNG có ảnh món ăn. App không có upload ảnh. Thẻ món CHỈ CÓ CHỮ. Đừng lấp chỗ trống bằng ảnh stock, ảnh minh hoạ hay icon món ăn — hãy để cỡ chữ và khoảng trắng tự đứng vững.
2. KHÔNG gradient, ở bất kỳ đâu.
3. Chỉ MỘT màu nhấn. Nếu thấy cần màu nhấn thứ hai, hãy nói cho tôi biết thay vì tự thêm.
4. Mọi thao tác chính nằm ở NỬA DƯỚI màn hình.
5. Vùng chạm tối thiểu 44×44px.
6. Thiết kế cho khung 390px trước. Từ 768px trở lên chỉ căn giữa, rộng tối đa 560px. Không bố cục nhiều cột.
7. Chế độ sáng. Đặt tên biến màu theo vai trò để thêm chế độ tối sau.

Hãy dựng một style guide ngắn thể hiện bảng màu, thang chữ, nút ở 4 kiểu, và một chip nhãn. Chưa vẽ màn hình nào cả.
```

---

# 2. Vì sao phải làm đúng thứ tự này

Ba lý do khiến prompt mở đầu tách riêng:

1. **Ràng buộc "không có ảnh" phải được nói trước khi vẽ.** Phản xạ mặc định của mọi công cụ dựng UI khi gặp một thẻ trống là thêm ảnh. Nói sau khi nó đã vẽ thì bạn phải sửa lại từ đầu.
2. **"Vuốt trái không dùng đỏ" đi ngược trực giác.** Xanh–đỏ là quy ước mặc định cho hai lựa chọn đối lập. Nếu không cấm rõ ràng, kết quả gần như chắc chắn ra màu đỏ.
3. **Style guide trước làm mọi màn hình sau nhất quán.** Không có nó, màn thứ tư sẽ lệch màu so với màn thứ nhất.

---

# 3. Thứ tự dựng màn hình

Không theo thứ tự người dùng gặp, mà theo **rủi ro thiết kế**.

| Thứ tự | Màn hình | Vì sao ưu tiên |
|---|---|---|
| 1 | S-09 Deck vuốt | Màn người dùng gặp nhiều nhất. Cũng là màn khó nhất vì không có ảnh |
| 2 | S-04 Trang nhóm, trạng thái chưa có món | Màn ĐẦU TIÊN mọi người dùng mới thấy |
| 3 | S-10 Chốt bữa | Màn dày dữ liệu nhất |
| 4 | S-05, S-06 Danh mục và thêm món | Có trạng thái phát hiện trùng khá tinh tế |
| 5 | Các màn còn lại | Sau khi ba màn trên đã ổn định |

---

# 4. Prompt từng màn hình

## 4.1 — S-09 Deck vuốt

```text
Dựng màn hình vuốt chọn món, dùng đúng design system vừa thiết lập.

BỐ CỤC, khung 390px
- Đỉnh: chỉ báo tiến độ dạng "Món 7 / 32", chữ caption, màu ink-muted. Không dùng thanh tiến trình.
- Giữa: MỘT thẻ món chiếm phần lớn khung nhìn. Nền surface-raised, bo góc 20, bóng nhẹ.
  Trong thẻ: tên món cỡ display 28/34 700, ví dụ "Cá basa kho tiêu". Dưới tên là 1–2 chip nhãn ("Món mặn", "Canh") nền surface-sunken, chữ ink-muted, bo tròn.
  Thẻ KHÔNG có ảnh. Đây là chủ ý, không phải thiếu sót.
- Nửa dưới: hai nút lớn cạnh nhau, mỗi nút cao ít nhất 56px.
  Nút trái "Không, hôm nay" dùng màu --no (#7A6A5C), TRUNG TÍNH, không đỏ.
  Nút phải "Muốn ăn" dùng màu --yes (#3F6B3F).
  Giữa hai nút, phía dưới, một nút hoàn tác nhỏ hơn dạng chữ.

Cho tôi xem thêm hai trạng thái:
1. Đang kéo thẻ sang phải: thẻ nghiêng tối đa 8 độ, có lớp phủ nhạt màu yes-soft (#E9F0E7).
2. Hết món: thẻ được thay bằng một thông báo "Bạn đã xem hết. Xong lượt của mình chứ?" kèm nút chính "Tôi chọn xong".

Nút bấm là ĐƯỜNG ĐI CHÍNH, cử chỉ vuốt chỉ là lối tắt. Đừng thiết kế như thể chỉ vuốt được.
```

## 4.2 — S-04 Trang nhóm, chưa có món

```text
Dựng trang chính của một nhóm, ở trạng thái NHÓM MỚI CHƯA CÓ MÓN NÀO. Đây là màn hình đầu tiên mọi người dùng mới nhìn thấy, nên nó quan trọng hơn trạng thái có dữ liệu.

- Tiêu đề nhóm ở trên, cỡ title.
- Phần chính: KHÔNG hiện nút "Mở phiên hôm nay". Thay bằng một khối hướng dẫn:
  "Trước tiên hãy thêm vài món nhà bạn hay ăn."
  Câu phụ nhỏ hơn, màu ink-muted: "Khoảng 15–20 món là đủ để bắt đầu."
  Một nút chính "Thêm món" màu accent.
- Dưới cùng: ba lối tắt mờ hơn — Danh mục món, Quy định, Thành viên.

Trạng thái rỗng này phải nêu VIỆC CẦN LÀM TIẾP, không chỉ nói là trống. Không dùng minh hoạ trang trí.

Sau đó cho tôi xem cùng màn này ở trạng thái đã có món và đang có một phiên chạy: thẻ phiên chiếm phần lớn màn hình đầu, hiển thị "2 / 4 người đã chọn xong", kèm nút vào phiên.
```

## 4.3 — S-10 Chốt bữa

```text
Dựng màn hình để người tổ chức chốt các món của hôm nay. Đây là màn dày dữ liệu nhất.

- Danh sách món xếp theo mức độ được ủng hộ. Mỗi hàng gồm:
  tên món, chip nhãn, và ba số đếm nhỏ dùng tabular-nums:
  số người muốn ăn, số người không muốn, số người vừa ăn gần đây.
  Số 0 hiển thị MỜ chứ không ẩn — ẩn đi làm các hàng lệch nhau.
- Một mục riêng phía dưới tiêu đề "Chưa ai chọn", vẫn chọn được.
- Khay cố định ở đáy màn hình: các món đã chọn dạng chip, và nút "Chốt bữa hôm nay".

Cho tôi xem thêm hai trạng thái:
1. Chưa ai vuốt: "Chưa có ai chọn xong. Bạn vẫn chốt được ngay bây giờ."
2. Thiếu món bắt buộc: ngay TRÊN nút chốt, một dòng lỗi màu danger ghi rõ "Còn thiếu: 1 món Canh". Lỗi nằm cạnh thứ gây ra nó, KHÔNG dùng hộp thoại.
```

## 4.4 — S-05 và S-06 Danh mục món và thêm món

```text
Dựng hai màn hình liên quan.

MÀN 1 — Danh mục món
Ô tìm kiếm ở trên, danh sách món kèm chip nhãn, nút thêm nổi ở góc dưới phải.
Kèm trạng thái rỗng: "Chưa có món nào", nút thêm, và ba ví dụ MỜ để người dùng hiểu định dạng — "Cá basa kho tiêu", "Canh chua cá lóc", "Gà chiên nước mắm".

MÀN 2 — Thêm món, dạng sheet trượt từ đáy lên, KHÔNG phải modal giữa màn hình
Ô nhập tên món, chọn nhãn từ 5 giá trị: Cơm, Món mặn, Món phụ, Canh, Tráng miệng.

Trạng thái quan trọng nhất của sheet này: PHÁT HIỆN TRÙNG.
Khi tên gõ vào trùng món đã có, hiện danh sách món đang tồn tại, mỗi món kèm nút "Dùng món này".
Bên dưới, MỜ HƠN và nhỏ hơn, một liên kết "Đây là món khác, vẫn tạo mới".
Nút dùng lại phải NỔI BẬT HƠN nút tạo mới. Đây là chủ ý.
```

---

# 5. Cách tinh chỉnh

Ba cách, dùng đúng chỗ:

| Cách | Dùng khi |
|---|---|
| Bình luận trực tiếp lên phần tử trên canvas | Sửa đúng một thứ, không phải mô tả nó nằm đâu |
| Sửa chữ trực tiếp trên canvas | Đổi nội dung chữ |
| Nhắn trong chat | Đổi bố cục, đổi cả hệ thống |

Câu tinh chỉnh hiệu quả nói **vì sao**, không chỉ nói **cái gì**:

- Kém: "Làm nút to hơn."
- Tốt: "Nút này phải chạm được bằng ngón cái khi cầm điện thoại một tay, nên cao ít nhất 56px và nằm trong 40% dưới của màn hình."

Ba câu bạn nhiều khả năng phải nói, vì đây là ba chỗ mọi công cụ đều trượt:

1. "Bỏ ảnh món ăn đi. App không có ảnh. Thẻ chỉ có chữ."
2. "Nút không muốn ăn đang màu đỏ. Đổi sang #7A6A5C. Vuốt trái không phải lỗi, nó chỉ là 'hôm nay tôi không muốn'."
3. "Đang có hai màu nhấn. Chỉ được một, là #B4531F."

---

# 6. Sau khi xong

Claude Design đóng gói được thành **handoff bundle chuyển thẳng sang Claude Code**. Khi dùng đường này, thêm ràng buộc kỹ thuật của dự án:

```text
Đóng gói handoff cho Claude Code với các ràng buộc sau:
- Next.js App Router, TypeScript strict, Tailwind
- Component đặt trong src/features/<feature>/presentation/
- Không dùng localStorage hay sessionStorage
- Không thêm dependency mới ngoài lucide-react cho icon
- Mọi cử chỉ vuốt phải có nút tương đương
- Tương phản chữ thường tối thiểu 4.5:1, viền focus 2px màu accent cách 2px
```

Lưu ý: Claude Design sinh ra HTML và CSS chạy được, **không phải mã sản xuất theo kiến trúc của dự án**. Nó là bản mẫu để bạn xem và sửa nhanh. Việc đưa vào đúng tầng `presentation/` và tuân luật phụ thuộc ở `tech-spec §2.2` vẫn là việc phải làm ở bước sau.

---

# 7. Việc không nên nhờ Claude Design

- Dựng cả 13 màn hình một lượt.
- Sinh mã sản xuất — đó là việc của Claude Code với handoff bundle.
- Quyết định thay bạn về ràng buộc ở §1. Nếu nó đề xuất đổi màu hay thêm ảnh, đó là lúc nói không.
