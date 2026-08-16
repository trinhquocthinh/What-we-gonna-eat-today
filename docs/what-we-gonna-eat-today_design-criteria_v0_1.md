# Design Criteria — What We Gonna Eat Today

## Version 0.1

**Status:** Draft — Awaiting review
**Created:** 2026-08-14
**Upstream:** PRD v0.4, SDD v0.2, Tech Spec & Architecture v0.2

Tài liệu này **tự đủ**. Người đọc không có ngữ cảnh gì về dự án vẫn dựng được giao diện đúng tinh thần.

---

# 0. Bối cảnh tối thiểu cần biết

Ứng dụng giúp một **gia đình** quyết định **hôm nay ăn món gì**.

Cách dùng thực tế: khoảng 5–6 giờ chiều, một người mở phiên chọn món. Mọi người trong nhà vuốt qua các món trên điện thoại, mỗi người mất khoảng 30 giây. Người tổ chức nhìn tổng hợp rồi chốt danh sách món của hôm đó.

Ba điều định hình mọi quyết định thị giác:

1. **Người dùng đang đói và hơi mệt.** Không ai muốn học cách dùng app lúc đó.
2. **Toàn bộ trải nghiệm trên điện thoại, một tay.** Tay kia đang cầm đồ, bế con, hoặc đảo chảo.
3. **Không có ảnh món ăn.** v1.0 không có upload ảnh. Mọi thẻ món chỉ có chữ. Đây là ràng buộc lớn nhất của thiết kế này, không phải thiếu sót cần lấp bằng ảnh stock hay icon minh hoạ.

Quy mô: dưới 10 người dùng, một nhóm, khoảng 30–100 món.

---

# 1. Tính cách sản phẩm

| Là | Không phải |
|---|---|
| **Ấm** | Không phải dễ thương. Không rau củ hoạt hình, không mặt cười, không emoji làm icon. |
| **Dứt khoát** | Không phải hối thúc. Không đồng hồ đếm ngược, không huy hiệu đỏ, không "còn 2 tiếng nữa". |
| **Nhẹ** | Không phải trống rỗng. Khoảng trắng rộng nhưng luôn có một thứ rõ ràng để làm tiếp. |

Đây là công cụ dùng mỗi ngày trong nhiều năm, không phải một trải nghiệm gây ấn tượng lần đầu. Thiết kế nào vui ở lần thứ nhất mà phiền ở lần thứ ba trăm thì sai.

---

# 2. Design token

Khai báo dưới dạng CSS custom property. v1.0 chỉ có chế độ sáng; token đặt tên theo vai trò để thêm chế độ tối sau này không phải sửa component.

## 2.1 Màu

```css
:root {
  /* Nền và chữ */
  --surface:          #FBF8F4;  /* nền chính, giấy ấm */
  --surface-raised:   #FFFFFF;  /* thẻ món, sheet */
  --surface-sunken:   #F3EEE7;  /* vùng nhóm, thanh tiến trình */
  --ink:              #1C1917;  /* chữ chính */
  --ink-muted:        #6B6259;  /* chữ phụ, nhãn */
  --ink-faint:        #9C9187;  /* placeholder, chữ bị vô hiệu */
  --border:           #E7E0D6;
  --border-strong:    #D2C7B8;

  /* Màu nhấn duy nhất */
  --accent:           #B4531F;  /* nút chính, liên kết, trạng thái đang chọn */
  --accent-hover:     #9A4419;
  --accent-soft:      #FBEDE4;  /* nền nhấn nhạt */
  --on-accent:        #FFFFFF;

  /* Ngữ nghĩa vuốt */
  --yes:              #3F6B3F;  /* đề xuất món này */
  --yes-soft:         #E9F0E7;
  --no:               #7A6A5C;  /* không muốn hôm nay — TRUNG TÍNH, không đỏ */
  --no-soft:          #EFEAE4;

  /* Chỉ dùng cho lỗi thật */
  --danger:           #A3261C;
  --danger-soft:      #FBE9E7;
  --warning:          #8A6A18;
  --warning-soft:     #FBF3DC;
}
```

**Quyết định quan trọng nhất trong bảng màu: vuốt trái không dùng màu đỏ.**

Vuốt trái nghĩa là "hôm nay tôi không muốn ăn món này" — không phải lỗi, không phải từ chối, không phải điều gì tiêu cực. Dùng đỏ sẽ khiến người dùng ngần ngại vuốt trái, mà vuốt trái chính là tín hiệu hệ thống cần nhất. Đỏ chỉ dành cho lỗi thật.

Chỉ có **một** màu nhấn. Nếu một màn hình cần màu nhấn thứ hai để phân biệt hai thứ, vấn đề nằm ở cấu trúc thông tin chứ không ở bảng màu.

## 2.2 Chữ

Font: **Be Vietnam Pro** (SIL Open Font License, self-host được).

Lý do chọn không phải thẩm mỹ: nó được thiết kế cho tiếng Việt, nên các tổ hợp dấu chồng như `ế`, `ộ`, `ữ`, `ằ` không bị va vào dòng trên hoặc cắt cụt. Rất nhiều font phổ biến hỏng ở đúng chỗ này, và tên món tiếng Việt thì đầy dấu.

Dự phòng: `Inter` (có bộ ký tự Việt), rồi `system-ui`.

```css
--font-sans: 'Be Vietnam Pro', 'Inter', system-ui, sans-serif;
```

| Vai trò | Cỡ / dòng | Đậm | Dùng ở đâu |
|---|---|---|---|
| `display` | 28 / 34 | 700 | Tên món trên thẻ vuốt |
| `title` | 22 / 28 | 600 | Tiêu đề màn hình |
| `subtitle` | 17 / 24 | 600 | Tiêu đề mục |
| `body-lg` | 17 / 26 | 400 | Nội dung chính |
| `body` | 15 / 22 | 400 | Mặc định |
| `caption` | 13 / 18 | 500 | Nhãn, siêu dữ liệu |
| `mono-num` | 15 / 22 | 600 | Số đếm trong bảng tổng hợp, dùng `font-variant-numeric: tabular-nums` |

Chiều cao dòng rộng hơn thông thường ở mọi cấp. Tiếng Việt có dấu ở cả trên và dưới; dòng chật làm chữ trông bẩn và khó đọc lúc lướt nhanh.

`mono-num` phải dùng chữ số đều bề ngang, nếu không cột số trong Session Ranking sẽ nhảy khi giá trị đổi từ 9 sang 10.

## 2.3 Khoảng cách

Thang gốc 4px.

```css
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;
--space-4: 16px;  --space-5: 24px;  --space-6: 32px;
--space-7: 48px;  --space-8: 64px;
```

Lề màn hình: `--space-4` (16px) trên điện thoại. Khoảng cách giữa các khối nội dung: `--space-5`. Giữa các nhóm lớn: `--space-6`.

## 2.4 Bo góc và đổ bóng

```css
--radius-sm:   8px;    /* chip, ô nhập */
--radius-md:   12px;   /* nút, hàng danh sách */
--radius-lg:   20px;   /* thẻ món, sheet */
--radius-full: 999px;  /* nút tròn, huy hiệu đếm */

--shadow-card:  0 1px 2px rgba(28,25,23,.06), 0 4px 12px rgba(28,25,23,.05);
--shadow-lift:  0 2px 4px rgba(28,25,23,.08), 0 12px 28px rgba(28,25,23,.10);
```

Chỉ hai mức bóng. `--shadow-lift` chỉ dùng cho thẻ món đang được kéo và cho sheet nổi lên. Mọi thứ khác dùng viền, không dùng bóng.

Không gradient. Ở đâu cũng vậy.

---

# 3. Kiểm kê màn hình

13 màn hình cho v1.0. Mỗi màn hình liệt kê đủ bốn trạng thái. **Trạng thái rỗng là thứ hay bị quên nhất, và ở app dữ liệu thì nó chính là màn hình đầu tiên người dùng thấy.**

## S-01 Đăng nhập
Mục đích: vào được app.
Phần tử: tên sản phẩm, một câu mô tả, nút "Tiếp tục với Google".
Trạng thái: mặc định · đang chuyển hướng · lỗi xác thực (một dòng, kèm nút thử lại).

## S-02 Trang chủ — danh sách nhóm
Mục đích: chọn nhóm hoặc thấy phiên hôm nay.
Phần tử: thẻ nhóm kèm trạng thái phiên hôm nay, nút tạo nhóm.
- **Rỗng:** "Bạn chưa có nhóm nào." Một nút chính "Tạo nhóm", một liên kết phụ "Tôi có link mời".
- Đang tải: hai thẻ khung xương, không quay vòng.
- Lỗi: một dòng kèm nút thử lại.
- Có dữ liệu: nhóm có phiên đang chạy luôn nằm trên cùng, có chấm nhấn.

## S-03 Tạo nhóm
Phần tử: tên nhóm, múi giờ (mặc định theo thiết bị), nút tạo.
Trạng thái: mặc định · đang gửi · lỗi từng trường ngay dưới ô nhập.

## S-04 Trang nhóm
Mục đích: điểm xuất phát mỗi ngày.
Phần tử: thẻ phiên hôm nay chiếm phần lớn màn hình đầu, ba lối tắt là Danh mục món, Quy định, Thành viên.
- **Rỗng — chưa có món nào:** đây là màn hình quan trọng nhất của toàn bộ thiết kế. Không được hiện nút "Mở phiên" khi nhóm chưa có món. Thay bằng: "Trước tiên hãy thêm vài món nhà bạn hay ăn." kèm nút "Thêm món" và gợi ý "Khoảng 15–20 món là đủ để bắt đầu."
- Rỗng — có món, chưa có phiên: nút chính "Mở phiên hôm nay".
- Có phiên đang chạy: hiện đã có bao nhiêu người xong, nút vào phiên.
- Đã chốt: hiện Final Meal của hôm nay.

## S-05 Danh mục món
Phần tử: ô tìm, danh sách món kèm chip nhãn, nút thêm.
- **Rỗng:** "Chưa có món nào" kèm nút thêm và ba ví dụ mờ để người dùng hiểu định dạng: `Cá basa kho tiêu`, `Canh chua cá lóc`, `Gà chiên nước mắm`.
- Đang tải · lỗi · có dữ liệu (nhóm theo nhãn, món ẩn hiện ở mục riêng cuối danh sách).

## S-06 Thêm món
Phần tử: ô tên món, chọn nhãn hệ thống.
Trạng thái đặc biệt: **phát hiện trùng.** Khi tên chuẩn hoá trùng món đã có, hiện danh sách ứng viên với nút "Dùng món này", và bên dưới là liên kết mờ hơn "Đây là món khác, vẫn tạo mới". Nút tạo mới không được nổi bật hơn nút dùng lại.

## S-07 Quy định nhóm
Phần tử: danh sách rule dạng `Phải có ít nhất 1 món Canh`, nút thêm rule.
- **Rỗng:** "Nhóm chưa đặt quy định nào. Bữa ăn sẽ được chốt mà không cần kiểm tra gì." Nêu rõ hệ quả, không chỉ nói trống.
- Lỗi: trùng nhãn, số lượng nhỏ hơn 1 — hiện ngay tại hàng, không dùng hộp thoại.

## S-08 Mở phiên
Phần tử: danh sách thành viên có ô tick, nút bắt đầu.
Trạng thái lỗi quan trọng: một người trong danh sách đã rời nhóm — hiện tên họ ngay tại hàng đó, không phải một thông báo chung chung ở đầu màn.

## S-09 Deck vuốt
Đây là màn hình người dùng gặp nhiều nhất.
Phần tử: một thẻ món chiếm phần lớn khung nhìn, tên món cỡ `display`, chip nhãn, chỉ báo tiến độ, hai nút rõ ràng ở nửa dưới, nút hoàn tác.
- Đang tải: một thẻ khung xương.
- **Rỗng — hết món:** "Bạn đã xem hết. Xong lượt của mình chứ?" kèm nút "Tôi chọn xong".
- Lỗi mạng: dải mỏng ở đỉnh "Đang thử gửi lại", **không chặn thao tác vuốt**. Người dùng vuốt tiếp được, hệ thống gửi lại sau.

## S-10 Chốt bữa
Phần tử: danh sách món xếp theo tổng hợp, mỗi hàng có số đếm; mục riêng "Chưa ai chọn"; khay món đã chọn cố định ở đáy; nút chốt.
- **Rỗng — chưa ai vuốt:** "Chưa có ai chọn xong. Bạn vẫn chốt được ngay bây giờ." kèm lối vào danh mục món đầy đủ.
- Lỗi thiếu món bắt buộc: hiện ngay trên nút chốt, nêu đúng thiếu gì (`Còn thiếu: 1 món Canh`), không dùng hộp thoại.

## S-11 Bữa ăn hôm nay
Phần tử: danh sách món đã chốt, ai đã tham gia.
Trạng thái: có dữ liệu · lỗi tải.

## S-12 Lịch sử ăn
Phần tử: nhóm theo ngày, mỗi ngày là các món.
- **Rỗng:** "Chưa có gì ở đây. Sau bữa đầu tiên bạn sẽ thấy lịch sử ở đây, và hệ thống sẽ tránh lặp lại món vừa ăn." Giải thích tại sao màn hình này có ích, không chỉ báo trống.

## S-13 Mời thành viên
Phần tử: nút tạo link, hiển thị link kèm nút sao chép, ngày hết hạn.
Trạng thái: chưa tạo · đã tạo · link hết hạn · lỗi.

---

# 4. Thư viện component

| Component | Ghi chú |
|---|---|
| `DishCard` | Chỉ chữ. Tên món cỡ `display`, chip nhãn ở dưới, nền `--surface-raised`, `--radius-lg`. Khi kéo: nghiêng tối đa 8°, hiện lớp phủ `--yes-soft` hoặc `--no-soft` theo hướng. |
| `Button` | Bốn kiểu: chính, phụ, mờ, nguy hiểm. Cao tối thiểu 48px. |
| `SwipeControls` | Hai nút lớn ở nửa dưới màn hình, kèm nút hoàn tác nhỏ hơn ở giữa. **Bắt buộc có**, không phải tuỳ chọn — xem §7. |
| `TagChip` | Nhãn hệ thống. Nền `--surface-sunken`, chữ `--ink-muted`, `--radius-full`. |
| `EvidenceCounts` | Ba số đếm trong bảng tổng hợp, dùng `mono-num`. Số 0 hiện mờ, không ẩn — ẩn đi khiến các hàng lệch nhau. |
| `EmptyState` | Biểu tượng nét mảnh hoặc không có, một câu nêu tình trạng, một câu nêu việc cần làm, một nút. Không minh hoạ trang trí. |
| `RuleRow` | Đọc như câu tiếng Việt: `Phải có ít nhất 1 món Canh`. Không hiện `minimum_count` như một trường dữ liệu thô. |
| `InlineError` | Nằm ngay cạnh thứ gây lỗi. Dùng `--danger`. Không bao giờ dùng hộp thoại cho lỗi kiểm tra dữ liệu. |
| `Sheet` | Trượt từ đáy lên cho mọi biểu mẫu. Không dùng modal giữa màn hình trên điện thoại. |
| `Skeleton` | Khung xương cho trạng thái tải. Không dùng vòng quay ở đâu cả. |

Trạng thái tương tác của mọi thành phần bấm được: mặc định, nhấn xuống (scale 0.98 kèm màu đậm hơn), focus rõ (viền 2px `--accent`, cách 2px), vô hiệu (`--ink-faint`, không đổi con trỏ), đang xử lý (chữ giữ nguyên, thêm chỉ báo, **không đổi kích thước nút**).

Nút không được đổi kích thước khi chuyển sang trạng thái đang xử lý. Bố cục nhảy lúc người dùng vừa bấm là cách nhanh nhất khiến họ bấm nhầm lần thứ hai.

---

# 5. Breakpoint

| Ngưỡng | Hành vi |
|---|---|
| 360–430px | Mục tiêu chính. Mọi màn hình được thiết kế ở đây trước. |
| 431–767px | Giống trên, lề rộng hơn. |
| ≥768px | Nội dung căn giữa, rộng tối đa 560px. Không có bố cục nhiều cột. |

Không có bố cục riêng cho máy tính ở v1.0. Không ai chọn món ăn tối trên laptop.

---

# 6. Hành vi trên điện thoại

- Mọi thao tác chính nằm ở **nửa dưới màn hình** — đây là NFR-03, đo được, không phải sở thích.
- Vùng chạm tối thiểu 44×44px, giữa hai vùng chạm cách nhau ít nhất 8px.
- Vuốt là gia tốc, không phải cách duy nhất. Mọi thứ vuốt được đều bấm được.
- Cập nhật lạc quan cho thao tác vuốt: giao diện phản hồi dưới 100ms, đồng bộ chạy nền.
- Mất mạng không chặn thao tác. Hiện dải mỏng, thử gửi lại, chỉ báo lỗi nếu thất bại hẳn.

---

# 7. Khả năng tiếp cận

| Yêu cầu | Ngưỡng |
|---|---|
| Tương phản chữ thường | ≥ 4.5:1 |
| Tương phản chữ lớn từ 24px | ≥ 3:1 |
| Vùng chạm | ≥ 44×44px |
| Viền focus | 2px `--accent`, cách 2px, hiện với `:focus-visible` |
| Thứ tự focus | Theo thứ tự đọc; sheet mở thì focus bị giữ bên trong |

**Ràng buộc bắt buộc: mọi cử chỉ vuốt phải có nút tương đương.** Giao diện chỉ dùng cử chỉ là giao diện không dùng được với trình đọc màn hình, với người run tay, và với bất kỳ ai đang cầm điện thoại bằng tay ướt trong bếp. `SwipeControls` không phải phương án dự phòng — nó là đường đi chính, còn cử chỉ là lối tắt.

Nhãn cho trình đọc màn hình phải là câu đầy đủ: `Đề xuất Cá basa kho tiêu`, không phải `Có`.

Không truyền đạt thông tin **chỉ bằng màu**. Đề xuất và không muốn phải khác nhau cả ở nhãn chữ và biểu tượng, không chỉ ở xanh với xám.

---

# 8. Tham chiếu

| Sản phẩm | Lấy cụ thể điều gì |
|---|---|
| **Things 3** | Cách phân cấp bằng khoảng trắng và độ đậm thay vì bằng đường kẻ và màu. Một màu nhấn duy nhất dùng rất tiết kiệm. Cảm giác điềm tĩnh dù màn hình đầy dữ liệu. |
| **Bear** | Nền giấy ấm thay vì trắng tinh, chữ có chiều cao dòng rộng rãi. Đây là cảm giác nền `--surface` nên đạt tới. |
| **Tinder** | **Chỉ lấy cơ chế vuốt và tiết tấu một-thẻ-một-quyết-định.** Không lấy gì về mặt thị giác: không gradient, không màu neon, không hiệu ứng ăn mừng, không trò chơi hoá. |

Dòng thứ ba quan trọng nhất và cũng dễ hiểu sai nhất. Cơ chế vuốt đến từ ứng dụng hẹn hò, nhưng ngôn ngữ thị giác của ứng dụng hẹn hò sẽ phá hỏng sản phẩm này.

---

# 9. Chống mẫu

Không làm những thứ sau:

- **Gradient**, ở bất kỳ đâu.
- **Ảnh món ăn hoặc ảnh stock.** v1.0 không có ảnh. Đừng lấp chỗ trống bằng ảnh mượn.
- **Rau củ hoạt hình, mặt cười, emoji làm icon.**
- **Đỏ cho thao tác vuốt trái.** Đỏ chỉ dành cho lỗi.
- **Đồng hồ đếm ngược hoặc bất kỳ dấu hiệu khẩn cấp nào.** Bữa tối không phải hạn chót.
- **Hiệu ứng ăn mừng khi chốt bữa.** Ngày thứ ba trăm nó chỉ còn là độ trễ.
- **Chuỗi ngày liên tiếp, huy hiệu, điểm số, trò chơi hoá.** Đây là công cụ gia đình, không phải app rèn thói quen.
- **Huy hiệu đỏ báo số.** Không có gì trong sản phẩm này gấp đến thế.
- **Hộp thoại cho lỗi kiểm tra dữ liệu.** Lỗi nằm cạnh thứ gây ra nó.
- **Vòng quay tải.** Dùng khung xương.
- **Màu nhấn thứ hai.** Nếu cần, hãy sửa cấu trúc thông tin.
- **Modal giữa màn hình trên điện thoại.** Dùng sheet trượt từ đáy.
- **Trạng thái rỗng chỉ nói "Không có dữ liệu".** Mỗi trạng thái rỗng phải nêu việc cần làm tiếp theo.
- **Chế độ tối ở v1.0.** Không nằm trong phạm vi. Token đã đặt tên theo vai trò để thêm sau mà không phải sửa component.

---

# 10. Change History

| Version | Date | Section | Change | Reason / Decision |
|---|---|---|---|---|
| 0.1 | 2026-08-14 | Toàn bộ | Bản draft đầu tiên: token, 13 màn hình kèm trạng thái rỗng, thư viện component, tiếp cận, chống mẫu | Phase 8.2 |
