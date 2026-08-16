# Handoff: What We Gonna Eat Today — v1.0 UI

## Overview

Ứng dụng giúp một gia đình quyết định **hôm nay ăn món gì**. Khoảng 5–6 giờ chiều, một người mở phiên chọn món; mọi người vuốt qua các món trên điện thoại (~30 giây/người); người tổ chức xem tổng hợp rồi chốt danh sách món của ngày.

Bundle này chứa **13 màn hình v1.0** (S-01 → S-13) đã thiết kế hi-fi, cộng một style guide.

Tài liệu nguồn: `uploads/docs/` trong project gốc — PRD v0.4, Design Criteria v0.1, Ranking Specification v0.2, Business Rules v1.6.

## About the Design Files

Các file trong `designs/` là **tài liệu tham chiếu thiết kế viết bằng HTML** — prototype thể hiện hình thức và hành vi mong muốn, **không phải code production để copy**. Chúng dùng một runtime template riêng (`support.js`) không liên quan tới codebase đích.

Nhiệm vụ: **dựng lại các thiết kế này trong Next.js App Router + TypeScript strict + Tailwind**, theo pattern của codebase, không port HTML nguyên trạng.

Mở file bằng cách mở trực tiếp trong trình duyệt. Mỗi file có một hàng nút xám ở trên khung điện thoại để chuyển trạng thái — **hàng nút đó là công cụ xem, không thuộc thiết kế, không implement.**

## Fidelity

**High-fidelity.** Màu, cỡ chữ, khoảng cách, bo góc, bóng, và copy tiếng Việt đều là giá trị cuối. Dựng lại đúng pixel bằng Tailwind.

---

## Ràng buộc bắt buộc (do người đặt hàng chốt)

1. **Next.js App Router**, **TypeScript strict**, **Tailwind**.
2. Component đặt trong `src/features/<feature>/presentation/`.
3. **Không dùng `localStorage` hay `sessionStorage`** ở bất kỳ đâu. State phiên nằm ở server/URL/React state.
4. **Không thêm dependency mới** ngoài `lucide-react` cho icon. Không thư viện animation, không state manager, không UI kit, không date lib.
5. **Mọi cử chỉ vuốt phải có nút tương đương.** Nút là đường đi chính, cử chỉ là lối tắt. Không được có hành động nào chỉ làm được bằng vuốt.
6. **Tương phản chữ thường ≥ 4.5:1**; viền focus `2px solid var(--accent)`, `outline-offset: 2px`, hiện với `:focus-visible`.

### Ràng buộc thiết kế kế thừa từ Design Criteria

7. **Không có ảnh món ăn**, không ảnh stock, không icon minh hoạ món. Thẻ món chỉ có chữ. Đây là ràng buộc, không phải thiếu sót.
8. **Không gradient**, ở bất kỳ đâu.
9. **Một màu nhấn duy nhất** (`--accent`). `--yes` chỉ xuất hiện ở đúng 3 chỗ: nút "Đề xuất", nền thẻ khi kéo sang phải, số "đề xuất" trong bảng tổng hợp.
10. **Vuốt trái không bao giờ dùng màu đỏ.** `--danger` chỉ dành cho lỗi thật.
11. Mọi thao tác chính nằm ở **nửa dưới màn hình**; vùng chạm ≥ 44×44px, cách nhau ≥ 8px.
12. Lỗi kiểm tra dữ liệu **nằm ngay cạnh thứ gây ra lỗi**, không dùng dialog.
13. Trạng thái tải dùng **khung xương (skeleton)**, không dùng vòng quay.
14. Biểu mẫu dùng **sheet trượt từ đáy**, không modal giữa màn hình.
15. Không đếm ngược, không huy hiệu đỏ, không streak/điểm/gamification, không hiệu ứng ăn mừng.
16. Chỉ chế độ sáng ở v1.0. Token đặt tên theo vai trò để thêm dark mode sau.

`lucide-react` chỉ dùng cho icon chức năng (đóng, sao chép, cộng/trừ). **Không dùng icon để minh hoạ món ăn hay cảm xúc.** Thiết kế hiện tại gần như không có icon — giữ nguyên tinh thần đó; icon chỉ thêm khi thay cho chữ ở nút vuông 44px.

---

## Design Tokens

Khai báo một lần trong `globals.css`, map sang Tailwind theme. **Không hardcode hex trong component.**

```css
:root {
  /* Nền và chữ */
  --surface:         #FBF8F4;  /* nền màn hình, giấy ấm */
  --surface-raised:  #FFFFFF;  /* thẻ món, sheet, hàng danh sách */
  --surface-sunken:  #F3EEE7;  /* vùng nhóm, khay, thanh tiến trình */
  --ink:             #1C1917;  /* chữ chính */
  --ink-muted:       #6B6259;  /* chữ phụ, nhãn, số 0 trong bảng đếm */
  --ink-faint:       #9C9187;  /* CHỈ placeholder và disabled */
  --border:          #E7E0D6;
  --border-strong:   #D2C7B8;  /* viền phần tử tương tác nổi hơn */

  /* Màu nhấn duy nhất */
  --accent:          #B4531F;
  --accent-hover:    #9A4419;
  --accent-active:   #8C3E17;
  --accent-soft:     #FBEDE4;
  --on-accent:       #FFFFFF;

  /* Ngữ nghĩa vuốt */
  --yes:             #3F6B3F;
  --yes-hover:       #365B36;
  --yes-soft:        #E9F0E7;
  --no:              #7A6A5C;   /* TRUNG TÍNH — không bao giờ đỏ */
  --no-soft:         #EFEAE4;

  /* Cảnh báo và lỗi */
  --warning:         #8A6A18;   /* cảnh báo có thể override */
  --warning-soft:    #FBF3DC;
  --danger:          #A3261C;   /* CHỈ lỗi thật */
  --danger-soft:     #FBE9E7;

  --shadow-card: 0 1px 2px rgba(28,25,23,.06), 0 4px 12px rgba(28,25,23,.05);
  --shadow-lift: 0 2px 4px rgba(28,25,23,.08), 0 12px 28px rgba(28,25,23,.10);
}
```

**Chỉ hai mức bóng.** `--shadow-card`: thẻ món trên cùng của chồng thẻ. `--shadow-lift`: thẻ đang kéo, sheet trượt lên, nút tròn chính, khung điện thoại. Mọi thứ khác dùng viền.

### Typography

Font: **Be Vietnam Pro** (400/500/600/700), dự phòng `Inter`, `system-ui`. Nạp bằng `next/font/google`. Lý do bắt buộc: tên món tiếng Việt có dấu chồng (`ế`, `ộ`, `ữ`, `ằ`) mà nhiều font làm hỏng.

| Vai trò | size/line | weight | Dùng ở đâu |
|---|---|---|---|
| `hero` | 34 / 42 | 700 | Tên món khi không có khung thẻ; tiêu đề S-01 |
| `display` | 28 / 34 | 700 | Tên món trên thẻ vuốt; món trong Final Meal |
| `title` | 22 / 28 | 600 | Tiêu đề màn hình |
| `subtitle` | 17 / 24 | 600 | Tiêu đề mục, tên trong danh sách, nhãn nút chính |
| `body-lg` | 17 / 26 | 400 | Nội dung chính, câu giải thích |
| `body` | 15 / 22 | 400 | Mặc định, nút phụ (600) |
| `caption` | 13 / 18 | 500 | Nhãn, siêu dữ liệu, số đếm |

Line-height rộng hơn thông thường ở mọi cấp — bắt buộc, do dấu tiếng Việt nằm cả trên lẫn dưới.

Mọi số trong bảng thống kê, số đếm, ngày: `font-variant-numeric: tabular-nums`.

Chữ dài dùng `text-wrap: pretty`.

### Spacing / radius

Thang 4px: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`. Lề màn hình 16px (S-01 và S-03 dùng 24px cho khối chữ lớn).

Bo góc: `8` chip/input · `12` nút/hàng danh sách · `20` thẻ món/sheet/khung · `999` nút tròn.

### Breakpoint

Thiết kế cho **390×844** trước. 431–767px: giống hệt, lề rộng hơn. ≥768px: nội dung căn giữa, `max-width: 560px`, **không bố cục nhiều cột**.

---

## Component library (dựng trong `src/features/shared/presentation/`)

| Component | Ghi chú |
|---|---|
| `Button` | 4 kiểu: `primary` (nền accent), `secondary` (nền trắng + viền `--border-strong`), `quiet` (chữ trần), `danger` (viền + chữ `--danger`). `min-height: 48px` (nút chính trong màn hình dùng 56px). Nhấn xuống: `scale(.98)` + màu đậm hơn. **Không đổi kích thước khi chuyển sang trạng thái đang xử lý.** |
| `DishCard` | Chỉ chữ. Reason chip → tên món `display` → chip nhãn → phần chân (lần cuối ăn + giải thích) → "Trong chồng". |
| `SwipeControls` | Hai nút lớn nửa dưới + hoàn tác. **Bắt buộc, không phải tuỳ chọn.** |
| `TagChip` | `--surface-sunken` + `--ink-muted`, bo 999. Chip nhấn (`--accent-soft` + `--accent`) tối đa **một** cái mỗi thẻ. |
| `EvidenceCounts` | Bốn số P/N/X/H, lưới 2×2, `tabular-nums`. Số 0 hiện ở `--ink-muted` (**không** `--ink-faint`), số khác 0 đậm hơn. |
| `EmptyState` | Một câu nêu tình trạng + một câu nêu việc cần làm + một nút. Không minh hoạ. |
| `RuleRow` | Đọc như câu: "Phải có ít nhất 1 món canh". Không hiện `minimum_count` như trường dữ liệu thô. |
| `InlineError` | Cạnh thứ gây lỗi, màu `--danger`. Không dialog. |
| `Sheet` | Trượt từ đáy, bo `20px 20px 0 0`, scrim `rgba(28,25,23,.28)`, `max-height: 88%`, focus bị giữ bên trong. |
| `Skeleton` | Khối `--surface-sunken`, `@keyframes` opacity .55↔1, chu kỳ 1.4s, lệch pha 0.1s giữa các khối. |
| `Banner` | Một dải: thanh dọc 3px màu ngữ nghĩa + nền `*-soft` + chữ `--ink`. Dùng cho cảnh báo, lỗi, xác nhận. |

---

## Screens

Tất cả kích thước dưới đây tính trong khung 390px, lề 16px (nội dung rộng 358px).

### S-01 Đăng nhập — `features/auth/presentation/`
File: `designs/S-01 S-02 S-03 S-13 Khung vao app.dc.html`

Khối chữ canh giữa theo chiều dọc: eyebrow "BỮA CƠM NHÀ" (caption, letter-spacing .08em, uppercase, `--accent`) · h1 `hero` "Hôm nay nhà mình ăn gì" · body-lg `--ink-muted` "Cả nhà vuốt qua vài món trong 30 giây. Người nấu chốt. Xong."
Đáy: nút primary 56px "Tiếp tục với Google" + caption `--ink-muted` canh giữa "Chỉ dùng để nhận diện bạn trong nhóm gia đình".
Trạng thái: mặc định · đang chuyển hướng (nút chuyển `--surface-sunken` + chữ `--ink-muted`, nhãn "Đang mở Google…", **không đổi kích thước**) · lỗi xác thực (banner `--danger` phía trên nút, một dòng + vẫn còn nút để thử lại).

### S-02 Danh sách nhóm — `features/groups/presentation/`
Header: caption ngày + title "Nhóm của bạn".
Thẻ nhóm (hàng, bo 12, nền trắng): chấm `--accent` 8px nếu có phiên đang chạy + tên (subtitle) · dòng trạng thái (body, `--ink-muted`) · dòng meta (caption, tabular-nums). Nhóm có phiên đang chạy nằm **trên cùng** và có viền `--accent`.
Đáy: primary "Tạo nhóm" + quiet "Tôi có link mời".
Trạng thái: rỗng ("Bạn chưa có nhóm nào." + câu việc cần làm) · đang tải (2 khung xương 96px, **không vòng quay**) · có dữ liệu · lỗi (banner + nút "Thử lại").

### S-03 Tạo nhóm — `features/groups/presentation/`
Trường "Tên nhóm" (input 48px, bo 8, placeholder "Ví dụ: Nhà Bảy Hiền"); lỗi nằm ngay dưới input, viền input chuyển `--danger`.
Hàng "Múi giờ": "Việt Nam · GMT+7" + caption "Theo điện thoại của bạn" + nút quiet `--accent` "Đổi". Dưới đó caption giải thích: múi giờ quyết định phiên đóng lúc nào cuối ngày.
Đáy: primary "Tạo nhóm" (mờ khi tên trống, vẫn bấm được để hiện lỗi) + caption "Bạn sẽ là người quản lý nhóm này".

### S-04 Trang nhóm — `features/groups/presentation/`
File: `designs/S-04 Trang nhom.dc.html`
Header: ngày (caption) + tên nhóm (title) + nút quiet "Nhóm".
Thẻ phiên hôm nay (bo 20, nền trắng, viền) chiếm phần lớn màn hình đầu, đổi theo 4 trạng thái:
- **Rỗng — chưa có món** (màn hình quan trọng nhất): h2 `display` "Trước tiên hãy thêm vài món nhà bạn hay ăn." + body-lg giải thích + ba ví dụ tên món màu `--ink-faint`. **Không hiện nút "Mở phiên".** CTA đáy: "Thêm món đầu tiên". Hàng "Danh mục món" hiện meta "Chưa có món nào" màu `--accent`.
- **Có món, chưa có phiên**: chip "Hôm nay chưa có phiên" + "Cả nhà chưa chọn món cho tối nay." + số món + khối "Tối qua cả nhà ăn". CTA: "Mở phiên cho tối nay".
- **Phiên đang chạy**: chip `--accent-soft` "Phiên đang mở" + "2 / 4 người xong" (tabular-nums) + danh sách người kèm trạng thái. CTA: "Vào lượt của bạn".
- **Đã chốt**: chip "Đã chốt lúc 17:42 · Mẹ chốt" + các món ở cỡ `display` + dòng ghi cảnh báo đã override. CTA: "Xem bữa hôm nay".
Dưới thẻ: ba hàng lối tắt (Danh mục món / Quy định bữa ăn / Thành viên) kèm meta bên phải.

### S-05 Danh mục món + S-06 Thêm món — `features/dishes/presentation/`
File: `designs/S-05 S-06 Danh muc mon.dc.html`
**S-05**: header + số món (tabular-nums) · ô tìm 48px · danh sách nhóm theo nhãn hệ thống (thứ tự: Cơm, Món mặn, Món phụ, Canh, Tráng miệng), mỗi nhóm có tiêu đề caption + số đếm; mục **"Đã gỡ khỏi nhóm"** nằm cuối, chữ `--ink-muted`, meta "Không gợi ý". Không khớp tìm kiếm → thẻ trắng "Không có món nào khớp “…”" + gợi ý thêm mới. Rỗng → "Chưa có món nào." + ba ví dụ mờ. Đáy: primary "Thêm món" + caption "Khoảng 15–20 món là đủ để bắt đầu".
**S-06** là **sheet trượt từ đáy**: input tên món (nhận sẵn nội dung ô tìm) · chọn **một** nhãn hệ thống (chip 44px) · primary "Thêm vào danh mục".
**Phát hiện trùng (quan trọng)**: khi tên chuẩn hoá khớp (so khớp chuỗi chuẩn hoá — lowercase, NFC, gộp khoảng trắng, so cả substring hai chiều) với món đã có, hiện khối `--surface-sunken` "Nhà bạn đã có món gần giống" liệt kê tối đa 3 ứng viên, mỗi ứng viên có nút **"Dùng món này"** nền `--accent`; bên dưới là chữ gạch chân `--ink-muted` "Đây là món khác, vẫn tạo mới".
Khi khối này hiện, **nút "Thêm vào danh mục" phải bị hạ xuống `--surface-sunken`** để "Dùng món này" là hành động mạnh nhất; bấm lưu khi chưa xác nhận → lỗi dưới input: "Chọn “Dùng món này”, hoặc xác nhận đây là món khác." Chỉ sau khi bấm "vẫn tạo mới" mới cho tạo.

### S-07 Quy định + S-08 Mở phiên — `features/rules/presentation/`, `features/sessions/presentation/`
File: `designs/S-07 S-08 Quy dinh va Mo phien.dc.html`
**S-07**: hai nhóm "Bắt buộc — thiếu thì không chốt được" và "Nên có — chỉ cảnh báo"; mỗi hàng là một câu + nút quiet "Gỡ". Khối `--surface-sunken` giải thích hệ quả hai mức. Rỗng: "Nhóm chưa đặt quy định nào." + "Bữa ăn sẽ được chốt mà không cần kiểm tra gì." (nêu hệ quả, không chỉ nói trống).
Sheet "Thêm quy định": khối xem trước câu ở trên cùng, cập nhật realtime · segmented "Bắt buộc / Nên có" · chip nhãn · bộ đếm − / số / + (tối thiểu 1, nút − mờ khi bằng 1, cả hai 44×44) · primary. Hai lỗi: trùng `mức + nhãn`; nhãn đã nằm ở mức còn lại (Required ↔ Preferred loại trừ nhau).
**S-08**: danh sách thành viên, tick chọn (nền `--accent-soft`, viền `--accent`, chữ phải "Có ăn"/"Chọn"). Thành viên đã rời nhóm mà bị tick → **lỗi ngay tại hàng đó** ("Chú Tư đã rời nhóm, không thể tham gia phiên.") cộng dải chặn trên nút. Khối "Phiên này dùng — Quy định hiện tại của nhóm", nêu rõ quy định được **chụp lại (snapshot)** khi phiên bắt đầu, kèm lối "Nới quy định cho tối nay" (v1.2, chưa có sheet). CTA: "Bắt đầu phiên với N người".

### S-09 Deck vuốt — `features/deck/presentation/` ⭐ màn hình chính
File tham chiếu chính: `designs/S-09 Deck vuot prototype.dc.html` (bản đã chọn, tương tác thật).
`designs/S-09 Deck vuot.dc.html` là ba hướng khám phá — **1a + chồng thẻ của 1b đã được chọn**, hai hướng còn lại giữ để tham khảo, không implement.

Bố cục từ trên xuống:
1. Dải mất mạng (chỉ khi có lỗi gửi): nền `--warning-soft`, thanh 3px `--warning`, chữ "Đang thử gửi lại · bạn vuốt tiếp được". **Không chặn thao tác vuốt.**
2. Header: "Bữa tối · Thứ Ba 16/8" (caption) — bên phải "4 / 20" (caption 600, tabular-nums).
3. Thanh tiến trình 4px, nền `--surface-sunken`, phần đã xem `--accent`, `transition: width .2s`.
4. Vùng thẻ (flex:1): hai thẻ nền hé phía sau (lệch 10px và 5px, chỉ viền, không bóng) + thẻ trên cùng.
   Thẻ: nền trắng, bo 20, `--shadow-lift`, padding 24, gồm — hàng reason chip (chip `--accent-soft`/`--accent` nếu đến từ explore lane, ngược lại `--surface-sunken`/`--ink-muted`) và nhãn kéo bên phải · tên món `display` · chip nhãn bo 999 · spacer · phần chân có viền trên: "Lần cuối ăn · 31 ngày trước" (caption, tabular-nums) + câu giải thích (body) · khối "Trong chồng" liệt kê 2 tên kế tiếp (subtitle, `--ink-muted`).
5. Nửa dưới: hai nút 56px cạnh nhau — "Không hôm nay" (trắng, viền `--border-strong`, chữ `--no`) và "Đề xuất" (nền `--yes`, chữ trắng, `--shadow-lift`). Dưới đó: quiet "Hoàn tác" (trái) và quiet "Tôi không ăn được món này" (phải), rồi quiet "Tôi chọn xong" canh giữa.

**Cử chỉ kéo** (Pointer Events, không thư viện):
- `pointerdown` → `setPointerCapture`, lưu `clientX`. `touch-action: none`, `user-select: none`.
- `pointermove` → `dx = clientX - x0`. Thẻ: `translateX(dx) rotate(clamp(-8, dx/18, 8))`, `transition: none` khi đang kéo.
- Ngưỡng hiển thị `|dx| > 40`: nền thẻ đổi `--yes-soft` (phải) / `--no-soft` (trái), viền đổi `--yes` / `--no`, hiện nhãn chữ "Đề xuất" / "Không hôm nay" trong hàng đầu của thẻ (**cùng hàng flex với reason chip — không dùng lớp phủ, không absolute đè lên chữ**).
- `pointerup`: `|dx| > 90` → commit; ngược lại trả về 0 với `transition: transform .18s ease`.
- Commit: `translateX(±460px)`, `opacity 0`, 180ms, rồi tăng con trỏ.
- Không truyền đạt thông tin chỉ bằng màu: luôn có nhãn chữ.

**Trạng thái**: deck · đang tải (một thẻ khung xương) · hết món ("Bạn đã xem hết N món." + "Đã đề xuất N món. Xong lượt của mình chứ?" + primary "Tôi chọn xong" + quiet "Xem lại từ đầu") · mất mạng · đã xong lượt (tóm tắt các món đã đề xuất + secondary "Mở lại lượt chọn" + caption "Sửa được cho tới khi Mẹ chốt bữa").

**Nhãn cho trình đọc màn hình phải là câu đầy đủ**: `aria-label="Đề xuất Cá basa kho tiêu"`, `aria-label="Không muốn ăn Cá basa kho tiêu hôm nay"` — không phải "Có"/"Không".

### S-10 Chốt bữa — `features/sessions/presentation/`
File: `designs/S-10 Chot bua.dc.html`
Header: "3 trong 4 người đã xong" + title "Chốt bữa tối nay" + quiet "Đóng".
Danh sách "Cả nhà nghiêng về": mỗi thẻ có tên món (subtitle) + trạng thái chọn bên phải; **lưới 2×2 bốn số đếm thô** — "3 đề xuất" (`--yes` nếu >0), "1 không muốn", "1 không ăn được" (`--warning` nếu >0), "2 vừa ăn"; số 0 dùng `--ink-muted`, số khác 0 dùng `--ink` (hoặc màu ngữ nghĩa). Nhãn hệ thống ở dòng cuối. Thẻ được chọn: nền `--accent-soft`, viền `--accent`, chữ "Đã chọn".
Mục riêng **"Chưa ai chọn"** cho món chưa có interaction — vẫn chọn được.
Khay đáy cố định (nền trắng, viền trên): chip món đã chọn (bấm để bỏ, 44px, có `aria-label` đầy đủ) · ba dòng trạng thái quy định cập nhật realtime (thanh 3px: `--yes` đủ · `--border-strong` còn thiếu · `--warning` nên có) · primary "Chốt N món cho tối nay".
**Chặn**: thiếu Required → banner `--danger` ngay trên nút, "Còn thiếu: 1 món mặn và 1 món canh." Không dialog.
**Cảnh báo có thể override**: đủ Required nhưng có Preferred chưa đạt / có người Cannot Eat / món vừa ăn trong tuần → khối `--warning-soft` ngay tại chỗ, liệt kê từng cảnh báo, hai nút "Xem lại" và "Vẫn chốt". Khi override, **lưu lại warning** (loại, rule liên quan, giá trị thực tế).
Sau khi chốt: banner `--yes-soft` + nút chuyển thành secondary "Sửa lại bữa đã chốt".

### S-11 Bữa hôm nay + S-12 Lịch sử — `features/meals/presentation/`, `features/history/presentation/`
File: `designs/S-11 S-12 Bua hom nay va Lich su.dc.html`
**S-11**: thẻ trắng bo 20 — caption "Mẹ chốt lúc 17:42" · mỗi món: tên `display`, dưới là nhãn (caption) và nút quiet "Tôi không ăn món này". Bấm → tên chuyển `--ink-muted` + `line-through`, nhãn nút đổi thành "Tôi có ăn mà" màu `--accent`, hiện caption "Đã bỏ khỏi lịch sử của riêng bạn. Món này vẫn thuộc bữa của cả nhà." + dải toast "Gợi ý những ngày tới sẽ tính theo bản sửa của bạn." Cuối thẻ: danh sách người tham gia. Dưới thẻ: banner `--warning-soft` ghi lại cảnh báo đã override. Trạng thái lỗi tải: banner `--danger` + secondary "Thử lại". Nút đáy: secondary "Sửa món đã chốt" + caption phân quyền.
**S-12**: nhóm theo ngày — tiêu đề ngày (subtitle) + số món (caption, tabular-nums), thẻ liệt kê tên món (body-lg); ngày có sửa tay hiện ghi chú ngăn bằng viền trên. Rỗng: "Chưa có gì ở đây." + "Sau bữa đầu tiên bạn sẽ thấy lịch sử ở đây, và app sẽ tránh gợi ý lại món cả nhà vừa ăn trong bảy ngày." (giải thích lợi ích, không chỉ báo trống). Caption đáy: "Chỉ sửa được lịch sử của ngày hôm nay."

### S-13 Mời thành viên — `features/groups/presentation/`
Câu giải thích: "Mỗi link dùng được một lần, cho một người."
Trạng thái: chưa tạo · đã tạo (thẻ có ngày hết hạn tabular-nums, link chữ monospace `word-break: break-all`, nút secondary "Sao chép link" → toast `--yes-soft` "Đã sao chép link mời.") · link hết hạn (khối `--surface-sunken` nêu hệ quả) · lỗi.
Danh sách "Đang trong nhóm" kèm vai trò. CTA: "Tạo link mời" / "Tạo link cho người tiếp theo".

---

## Interactions & Behavior

- **Cập nhật lạc quan cho vuốt**: UI phản hồi ≤ 100ms, đồng bộ chạy nền (NFR-02). Thất bại tạm thời → dải mỏng "Đang thử gửi lại", **không chặn thao tác**; thất bại hẳn → báo rõ, không im lặng.
- **Deck ổn định** (BR-048): phần đã xem (`index < cursor`) đóng băng — không sắp lại, không xoá. Chỉ phần chưa xem được tính lại khi đổi Like/Dislike/Whitelist/Blacklist/Cannot Eat hoặc Group Dish Pool đổi. Món vừa bị hard filter thì biến mất ngay cả khi đang ở vị trí kế tiếp.
- **Hoàn tác** đưa interaction về `None` (BR-040).
- **Completed mở lại được** cho tới khi phiên Finalized (BR-044).
- Transition: chỉ dùng cho kéo thẻ (.18s ease), thanh tiến trình (.2s), nhấn nút (`scale(.98)`, .1s). **Không có animation nào khác.** Tôn trọng `prefers-reduced-motion`: tắt transform, chuyển thẳng trạng thái.
- Sheet: focus bị giữ bên trong, `Esc` đóng, click scrim đóng, trả focus về nút đã mở.

## State Management

Dùng React state trong client component + server action/route handler. **Không localStorage, không sessionStorage.** Trạng thái cần khôi phục khi tải lại (con trỏ deck, phiên hiện tại) lấy từ server hoặc URL.

Deck: `{ deckIds: string[], cursor: number, marks: Record<dishId, 'yes'|'no'|null>, dragX: number, dragging: boolean, flying: -1|0|1, netState: 'ok'|'retrying'|'failed', completed: boolean }`.
Chốt bữa: `{ selected: string[], tried: boolean, confirming: boolean, finalized: boolean, warnings: Warning[] }`.
Thêm món: `{ draft: string, tag: SystemTag | null, forcedNew: boolean, tried: boolean }`.

System Tag v1 cố định 5 giá trị (BR-003): `Staple` (Cơm), `Main` (Món mặn), `Side` (Món phụ), `Soup` (Canh), `Dessert` (Tráng miệng). Nhóm không tạo tag mới.

## Accessibility checklist

- [ ] Chữ thường ≥ 4.5:1; chữ ≥ 24px ≥ 3:1. `--ink-faint` **chỉ** cho placeholder/disabled.
- [ ] `:focus-visible` → `outline: 2px solid var(--accent); outline-offset: 2px`.
- [ ] Mọi vùng chạm ≥ 44×44px, cách nhau ≥ 8px.
- [ ] Mọi cử chỉ vuốt có nút tương đương làm được đúng việc đó.
- [ ] `aria-label` là câu đầy đủ, có tên món.
- [ ] Không truyền đạt thông tin chỉ bằng màu — luôn kèm nhãn chữ.
- [ ] Thứ tự focus theo thứ tự đọc; sheet giữ focus bên trong.

## Ngoài phạm vi v1.0 (đã vẽ nhưng thuộc v1.1)

Các phần sau đã có trong thiết kế nhưng theo PRD §6 thuộc v1.1 — nếu build v1.0 trước thì tháo ra được mà màn hình vẫn đứng vững:

- "Tôi không ăn được món này" (S-09) và cảnh báo Cannot Eat (S-10) — F15
- Phát hiện trùng khi thêm món (S-06) — F29
- Cảnh báo Preferred Rule + xác nhận override (S-10) — F22, F24
- Sửa lịch sử cá nhân (S-11) — F28
- Chip lý do explore lane (S-09) — F18

Chưa thiết kế (giai đoạn sau): màn hình Thành viên đầy đủ + thêm/bớt Participant giữa phiên (F25), gỡ món khỏi danh mục (F27), sheet nới quy định cho riêng phiên (F35), Chef Mode (F33/F34).

## Screenshots

`screenshots/` — ảnh chụp 2x của từng màn hình và trạng thái quan trọng (khung 390×844):

| File | Nội dung |
|---|---|
| `00-style-guide.png` | Toàn bộ style guide |
| `s01-01-dang-nhap.png` · `s02-02-danh-sach-nhom.png` · `s03-03-tao-nhom.png` · `s13-04-moi-thanh-vien.png` | Khung vào app |
| `s04-01-rong.png` · `s04-02-chua-co-phien.png` · `s04-03-phien-dang-chay.png` · `s04-04-da-chot.png` | Trang nhóm, 4 trạng thái |
| `s05-01-danh-muc.png` · `s05-02-rong.png` · `s06-03-phat-hien-trung.png` | Danh mục món và sheet thêm món |
| `s07-01-quy-dinh.png` · `s07-02-sheet-them-quy-dinh.png` · `s08-03-mo-phien-loi.png` | Quy định và mở phiên (kèm lỗi thành viên đã rời nhóm) |
| `s09-00-ba-huong-kham-pha.png` | Ba hướng khám phá cho thẻ vuốt (tham khảo) |
| `s09-01-deck.png` · `s09-02-het-mon.png` · `s09-03-mat-mang.png` · `s09-04-xong-luot.png` | Deck vuốt, bản chốt |
| `s10-01-tong-hop.png` · `s10-02-canh-bao-override.png` | Chốt bữa và luồng cảnh báo override |
| `s11-01-bua-hom-nay.png` · `s12-02-lich-su.png` | Bữa hôm nay và lịch sử ăn |

Ảnh là tham chiếu thị giác; giá trị chính xác luôn lấy từ phần Design Tokens và mô tả màn hình ở trên.

## Assets

Không có ảnh, không có illustration. Font Be Vietnam Pro qua `next/font/google`. Icon: `lucide-react`, chỉ cho chức năng.

## Files

| File | Nội dung |
|---|---|
| `designs/Style Guide.dc.html` | Bảng màu, thang chữ, 4 kiểu nút, chip, bóng, bo góc, thang khoảng cách |
| `designs/S-01 S-02 S-03 S-13 Khung vao app.dc.html` | Đăng nhập, danh sách nhóm, tạo nhóm, mời thành viên |
| `designs/S-04 Trang nhom.dc.html` | Trang nhóm, 4 trạng thái |
| `designs/S-05 S-06 Danh muc mon.dc.html` | Danh mục món + sheet thêm món (có phát hiện trùng) |
| `designs/S-07 S-08 Quy dinh va Mo phien.dc.html` | Quy định nhóm + mở phiên |
| `designs/S-09 Deck vuot.dc.html` | Ba hướng khám phá cho thẻ vuốt (tham khảo) |
| `designs/S-09 Deck vuot prototype.dc.html` | **Bản chốt** của deck vuốt, tương tác đầy đủ |
| `designs/S-10 Chot bua.dc.html` | Chốt bữa, tổng hợp P/N/X/H, chặn và override |
| `designs/S-11 S-12 Bua hom nay va Lich su.dc.html` | Bữa hôm nay + lịch sử ăn |
| `designs/support.js` | Runtime của prototype — **không port sang codebase** |
