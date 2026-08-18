# 📊 Implementation Guide — E1 Slice S7: Đo lường Cold Start Production (M2)

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to run`
> - **Created:** `2026-08-18` | **Last Updated:** `2026-08-18`
> - **Upstream:** [Master Plan](what-we-gonna-eat-today_master-plan_v1_0.md) (`E1-T12`) • [PRD](what-we-gonna-eat-today_prd_v0_1.md) (`NFR-01`) • [Test Cases Spec](what-we-gonna-eat-today_test-cases-specification_v0_1.md) (`MS-01, MS-05`) • [Setup & Ops Guide](what-we-gonna-eat-today_setup-and-ops-guide_v0_1.md)
> - **Tiền đề:** `E1-T1` đến `E1-T11` đã hoàn thành (S1→S6).
>
> 📌 *Runbook hướng dẫn thao tác nghiệm thu Cột mốc M2: Triển khai Production, đo lường độ trễ Cold Start thực tế trên thiết bị di động 4G/5G.*

---

# 0. Phạm vi và điều kiện xong

| ID | Việc | Giờ | Xong nghĩa là |
|---|---|---|---|
| E1-T12 | Deploy production, đo cold start trên 4G | 2 | Có con số thật ghi vào Setup Guide; chạy sau ≥10 phút app không ai dùng — **cột mốc M2** |

- [ ] Production deploy xanh (Vercel build + migration thành công trên Neon branch `main`)
- [ ] MS-01 đạt trên điện thoại thật, mạng di động
- [ ] MS-05 đạt (hoặc quyết định nới ngưỡng theo §6) — đo **sau ít nhất 10 phút** không ai dùng app
- [ ] Số đo thật đã ghi vào Setup & Ops Guide §5.4 (mới)
- [ ] Master Plan tick E1-T12, ghi ngày đạt milestone **M2**

---

# 1. Việc KHÔNG làm ở slice này

- **MS-02, MS-03, MS-04 không chạy ở đây.** MS-02 cần link mời (E2-T1/T2, chưa landed). MS-03 cần chờ qua ngày thật VÀ Session Ranking để thấy rõ (E4). MS-04 cần Group Rule (E5). Cả ba gắn milestone M3/M4/M5, không phải M2.
- **Không viết code TDD mới.** Nếu §6 dẫn tới cần thêm `loading.tsx`, đó là một thay đổi nhỏ, làm trực tiếp không cần guide riêng.
- **Không tự động hoá phép đo.** NFR-01 là một cổng chặn một lần trước khi qua epoch tiếp theo (Master Plan §11: *"đây là điểm dừng quan trọng nhất"*), không phải một chỉ số theo dõi liên tục — chưa cần dashboard hay CI check cho việc này (đó là E6-T3: *"Đo NFR-01 đến NFR-05 bằng số thật... không phải cảm nhận"*, một slice riêng ở E6).

---

# 2. Checklist tiền đề

- [ ] `git log` xác nhận E1-T1 → E1-T11 đã merge vào nhánh đang deploy
- [ ] `yarn verify && yarn arch:probe && yarn build` xanh trên `main` (hoặc nhánh chuẩn bị merge vào `main`)
- [ ] `yarn test:integration` xanh (cần `.env.test.local` đã cấu hình từ S4)
- [ ] Mọi migration (`0000` → migration mới nhất của S6) đã commit vào repo, đúng thứ tự, không file nào bị sửa tay sau khi đã chạy trên branch `dev`/`test`
- [ ] Decision log có đủ DEC-013 → DEC-020 (kiểm bằng `grep -c "^# DEC-" docs/what-we-gonna-eat-today_decision-log_v1.1.md` — phải ≥20)

---

# 3. Cấu hình production trên Vercel — làm một lần

Vercel đã nối với GitHub repo và tự deploy khi merge vào `main` từ **E0-T7 (milestone M1)** — không cần dựng lại kết nối đó. Việc còn thiếu là **biến môi trường scope Production** và **redirect URI** cho Google OAuth.

## 3.1 Biến môi trường (Vercel Dashboard → Project → Settings → Environment Variables, scope **Production**)

| Biến | Giá trị | Ghi chú |
| --- | --- | --- |
| `DATABASE_URL` | Connection string Neon branch **`main`** | Khác branch `dev`/`test`/preview — đây là dữ liệu thật |
| `AUTH_SECRET` | `openssl rand -base64 32` — **giá trị RIÊNG**, không dùng lại của local | Setup Guide §3: *"Production và local KHÔNG dùng chung giá trị."* |
| `AUTH_URL` | **ĐỂ TRỐNG** | Đã verify ở guide S1 (`reqWithEnvURL`): biến này ghi đè origin của MỌI request. Đặt giá trị vào sẽ làm sai origin trên chính production. `VERCEL=1` (Vercel tự đặt) đã đủ để `next-auth` bật `trustHost` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Từ Google Cloud Console | Có thể dùng lại cùng OAuth Client đã tạo ở S1 — không cần Client mới cho production, chỉ cần đăng ký thêm redirect URI (§3.2) |

## 3.2 Google Cloud Console — thêm redirect URI production

APIs & Services → Credentials → OAuth Client đã tạo ở S1 → Authorized redirect URIs → thêm:

```
https://<domain-production>/api/auth/callback/google
```

(Đường dẫn `/api/auth/callback/google` đã verify từ mã nguồn `@auth/core` ở guide S1 — không phải đoán.) Nếu domain production chưa có (chỉ dùng domain Vercel mặc định `*.vercel.app`), dùng chính domain đó.

**Nếu app còn ở Google OAuth consent screen dạng "Testing"** (S1 đã đặt): mọi người dùng thật (không chỉ Test Users) sẽ bị Google chặn đăng nhập. Với quy mô một gia đình dưới 10 người, thêm từng email vào danh sách Test Users là đủ — không cần nộp app để Google verify (đó là quy trình cho ứng dụng công khai).

---

# 4. Deploy

1. Merge PR chứa E1-T1 → E1-T11 vào `main` (nếu chưa merge) — hoặc nếu đã merge từng phần qua các slice, xác nhận `main` hiện tại có đủ toàn bộ.
2. Vercel tự build + chạy migration trong bước build (Tech Spec §6.2: *"Migration chạy trong bước build của Vercel. Không có migration tự động khi runtime khởi động."*). Theo dõi Vercel Dashboard → Deployments cho tới khi build xanh.
3. Xác nhận migration đã áp đúng lên branch `main`:

   ```bash
   DATABASE_URL="<connection string branch main>" yarn db:studio
   ```

   Thấy đủ bảng: `users`, `groups`, `group_members`, `selection_sessions`, `participants`, `global_dishes`, `group_dishes`, `interactions`, `interaction_events`, `final_meals`, `final_meal_items`, `eating_history`. Nếu thiếu bảng nào, dừng lại — đừng chạy MS-01/MS-05 trên schema thiếu.

**Nếu build thất bại**: xem Setup & Ops Guide §8 "Sự cố thường gặp" — dòng *"Build thất bại ở bước migration | Migration xung đột với schema hiện có | Kiểm tra thứ tự file migration"*. Đây đúng là chỗ rủi ro "đụng số thứ tự migration" mà S3/S4/S5/S6 đều đã cảnh báo nếu code không theo đúng thứ tự.

---

# 5. Kịch bản khói thủ công

Cả hai chạy **trên điện thoại thật, mạng di động — không wifi, không trình giả lập** (Test Cases §4, nguyên văn).

## 5.1 MS-01 — đường đi trọn vẹn (gắn milestone M2)

> *"Tạo nhóm, thêm 5 món, mở phiên, vuốt hết, chốt bữa | Thấy Final Meal và lịch sử ăn của chính mình."*

1. Đăng nhập bằng Google trên điện thoại thật.
2. Tạo một Group.
3. Thêm 5 món (S3 — `/groups/<id>/dishes`).
4. Tạo và Start một Session (S4 — hiện chưa có route UI, xem ghi chú dưới).
5. Mở deck (S5 — `/sessions/<id>`), vuốt hết 5 món.
6. Lưu nháp Final Meal và Finalize (S6 — hiện chưa có route UI, xem ghi chú dưới).
7. **Đạt**: thấy `selection_sessions.state = 'FINALIZED'` và `eating_history` có dòng của chính mình (qua `yarn db:studio`, vì S6 không có UI để tự xem).

**Ghi chú quan trọng**: S4 (tạo/Start Session) và S6 (lưu nháp/Finalize) **chưa có route UI** theo đúng thiết kế walking-skeleton của chúng (Master Plan cột "File" của E1-T6/T7/T10/T11 không có `app/`). Nếu tới lúc chạy MS-01 mà chưa có cách nào gọi các use case này từ giao diện, hai lựa chọn:

- (a) Viết tạm một route/script gọi thẳng use case (không cần đẹp, xoá sau khi đo xong) — đúng tinh thần walking skeleton "chạy thật, không cần đẹp".
- (b) Gọi trực tiếp qua một Node REPL/script tạm import `createSession`/`startSession`/`saveFinalMealDraft`/`finalizeSession` với `getDb()` đã trỏ production.

Đây **không phải lỗi của S4/S6** — đúng theo thiết kế đã chốt, UI nối các bước đó là việc của E3/E5. MS-01 ở đây chỉ cần **chứng minh dữ liệu đi được trọn đường qua các use case**, không nhất thiết phải qua giao diện đẹp.

## 5.2 MS-05 — đo cold start thật (lõi của E1-T12)

> *"Mở app lần đầu trong ngày sau khi Neon đã ngủ | Deck hiện trong 2.5 giây."*
> *"MS-05 là kịch bản duy nhất kiểm chứng R-01. Nó phải chạy sau ít nhất 10 phút không ai dùng app, nếu không compute vẫn đang thức và số đo vô nghĩa."* (Test Cases §4)

**Vì sao 10 phút, không phải 5**: Tech Spec §1.1 — *"Compute tự ngủ sau 5 phút không hoạt động."* Đợi 10 phút (gấp đôi) để chắc chắn qua ngưỡng ngủ trước khi đo, tránh trường hợp biên (compute vừa ngủ được vài giây, request đo tình cờ không chịu cold start đầy đủ).

### Quy trình

1. Đảm bảo **không ai** (kể cả bạn, kể cả CI, kể cả bot health-check) chạm vào app trong ít nhất 10 phút liên tục ngay trước khi đo. Đóng hẳn tab/app trên mọi thiết bị.
2. Trên điện thoại thật, tắt wifi, dùng mạng di động (4G — ghi rõ nhà mạng nếu số đo cần đối chiếu sau này).
3. Mở trình duyệt, gõ URL production, **bắt đầu bấm giờ ngay lúc chạm Enter/tap link**, dừng khi deck (danh sách món) hiện đầy đủ trên màn hình.
4. Ghi lại số giây.
5. Lặp lại **3 lần**, mỗi lần cách nhau ≥10 phút không hoạt động (R-01 tự ghi cold start dao động 0.5–2 giây — một điểm dữ liệu không đại diện).

### Cách bấm giờ

- **Đơn giản (đủ dùng)**: đồng hồ bấm giờ có sẵn trên điện thoại. NFR-01 là một cổng chặn một lần (Master Plan §11), không phải chỉ số theo dõi liên tục — sai số vài trăm mili-giây do phản xạ tay không đáng kể so với ngưỡng 2.5 giây.
- **Chính xác hơn (nếu số đo sát ngưỡng 2.5s và cần quyết định rạch ròi)**: nối điện thoại vào laptop qua remote debugging (Safari Web Inspector cho iPhone, `chrome://inspect` cho Android), mở tab Network, lọc theo request đầu tiên, đọc thời gian tới khi trang có nội dung (`DOMContentLoaded`/`Load` hoặc thời điểm response cuối cùng của dữ liệu deck).

---

# 6. Nhánh quyết định — đã duyệt sẵn trong Master Plan, không phải chọn lại

Master Plan §11 (nguyên văn, dòng 240 của bảng rủi ro):
> *"Cold start Neon vượt NFR-01 | E1-T12 đo được > 2 giây | Render shell tĩnh trước, stream dữ liệu sau. Nếu vẫn vượt, nới NFR-01 lên 4 giây thay vì đổi database — đổi database ở giai đoạn này tốn hơn nhiều so với lợi ích."*

## 6.1 Nếu cả 3 lần đo ≤ 2.5 giây

Đạt NFR-01. Ghi số vào §7, tick E1-T12, xong.

## 6.2 Nếu vượt 2.5 giây (nhưng dưới 4)

**Bước 1 — thử "shell tĩnh trước, stream dữ liệu sau" trước khi nới ngưỡng.** Đây không phải lời khuyên chung chung — kiểm tra cụ thể:

```bash
ls src/app/sessions/[sessionId]/loading.tsx 2>/dev/null && echo "đã có" || echo "CHƯA CÓ"
```

Guide S5 (deck page) **không tạo `loading.tsx`** cho route này — khác `app/groups/loading.tsx` mà guide S3 đã có. Thiếu file này nghĩa là Next.js phải chờ TOÀN BỘ `page.tsx` (kể cả truy vấn `listDeck`) xong mới gửi bất kỳ HTML nào xuống — không có shell tĩnh nào render trước. Thêm một `loading.tsx` tối giản (dùng lại `Skeleton` đã có từ `src/shared/ui/skeleton.tsx`, theo đúng khuôn `app/groups/loading.tsx` của S3) cho Next.js một shell để gửi ngay trong lúc `listDeck`/`findById` còn đang chạy — đây chính là "render shell tĩnh trước, stream dữ liệu sau" mà Next App Router làm được miễn phí khi có `loading.tsx` (Suspense boundary tự động ở cấp route).

Sau khi thêm, deploy lại, đo lại 3 lần (§5.2).

**Bước 2 — nếu vẫn vượt 2.5 giây sau khi đã thử bước 1**: nới ngưỡng NFR-01 lên **4 giây**. Đây là quyết định **đã được duyệt trước** trong Master Plan — không phải một lựa chọn mới cần bàn lại, và **không đổi database** (Master Plan nói rõ đổi database "tốn hơn nhiều so với lợi ích" ở giai đoạn này). Cập nhật:

- `docs/what-we-gonna-eat-today_prd_v0_1.md` — sửa dòng NFR-01 từ "≤ 2.5s" thành "≤ 4s", thêm ghi chú ngày đổi + lý do (trỏ về DEC mới, xem dưới).
- Thêm một mục vào Decision Log (DEC-021, theo khuôn các entry trước) ghi lại: số đo thật, việc đã thử shell-tĩnh-trước, và quyết định nới ngưỡng.

## 6.3 Nếu vượt cả 4 giây

Đây là tình huống Master Plan **chưa** có phương án dự phòng sẵn — nghĩa là giả định "cold start Neon Free tier chấp nhận được cho sản phẩm này" đã sai ở mức cơ bản hơn dự tính. **Dừng lại, không tự quyết định tiếp** — đây là quyết định sản phẩm (chấp nhận trải nghiệm chậm, hay đổi hosting/database) cần bàn với người quyết định, không phải việc kỹ thuật đơn thuần. Ghi số đo thật vào Decision Log kèm trạng thái "chưa quyết", không tick E1-T12.

---

# 7. Ghi số thật vào Setup & Ops Guide

File hiện tại chỉ còn đúng một mục 🔒 trống (dòng *"Ghi lại ngày diễn tập gần nhất ở đây: 🔒 chưa diễn tập lần nào"* — về backup, không liên quan). Chưa có chỗ nào cho số đo cold start — thêm mục mới.

## 7.1 Thêm `docs/what-we-gonna-eat-today_setup-and-ops-guide_v0_1.md` §5.4 — ngay sau §5.3 "Quay lui một bản deploy"

```markdown
## 5.4 Đo cold start thật (M2)

Đo theo MS-05 (Test Cases Specification §4), điện thoại thật, mạng di động, sau ≥10 phút không ai dùng app.

| Ngày đo | Thiết bị | Mạng | Lần 1 | Lần 2 | Lần 3 | Kết luận |
|---|---|---|---|---|---|---|
| 🔒 <YYYY-MM-DD> | 🔒 <model điện thoại> | 🔒 <nhà mạng, 4G/5G> | 🔒 <giây> | 🔒 <giây> | 🔒 <giây> | 🔒 Đạt NFR-01 (≤2.5s) / Đạt sau khi nới lên 4s / Chưa đạt |

Nếu đã thêm `loading.tsx` để qua ngưỡng (§6.2 Implementation Guide S7), ghi rõ **số đo TRƯỚC và SAU** khi thêm, không chỉ số cuối cùng — số liệu trước/sau là bằng chứng cho quyết định trong Decision Log.
```

## 7.2 Nếu rơi vào §6.2/6.3 (vượt ngưỡng gốc), thêm Decision Log DEC-021

```markdown
# DEC-021 — NFR-01 Threshold Raised to 4s After Real Cold-Start Measurement

**Date:** 🔒 <ngày đo>
**Status:** Accepted

## Decision

Real cold-start measurement at E1-T12 (MS-05, three runs on <device>/<carrier> 4G after ≥10 minutes idle) showed <X>s, <Y>s, <Z>s — exceeding the original NFR-01 threshold of 2.5s. Adding a `loading.tsx` streaming boundary to `app/sessions/[sessionId]/` (previously missing, unlike `app/groups/loading.tsx`) <did/did not> bring it under 2.5s. Per the pre-approved fallback in Master Plan §11, NFR-01 is raised to 4s rather than switching database providers.

## Rationale

Master Plan §11 pre-approved this exact fallback ladder before any real measurement existed: try shell-first rendering, then raise the threshold rather than switch database — switching at this stage costs more than the benefit for a <10-user household product.

## Consequence

PRD v0.4 §5 NFR-01 updated from "≤ 2.5s" to "≤ 4s". Future re-measurement (E6-T3) should re-check this number as real usage data accumulates.

## Affected Documents

- PRD v0.4 §5 (NFR-01)
- Tech Spec v0.2 §9 (R-01)
- Master Plan v1.0 §11
```

## 7.3 Master Plan — tick E1-T12

```markdown
| E1-T12 | Deploy production, đo cold start trên 4G | R-01, MS-05 | 2 | E1-T11 | ... | — | ☒ |
```

Và thêm một dòng ghi ngày đạt milestone **M2** (theo đúng khuôn các milestone trước — kiểm cách E0-T7/M1 đã được đánh dấu trong file để ghi nhất quán).

---

# 8. Rủi ro

| Rủi ro | Dấu hiệu | Phương án |
| --- | --- | --- |
| Đo MS-05 nhưng thực ra Neon chưa kịp ngủ (đo sớm hơn 10 phút thật) | Số đo thấp bất thường, không khớp cảm nhận thực tế lúc dùng app buổi sáng | Đảm bảo THẬT SỰ không ai chạm app — kể cả preview deploy khác, kể cả chính bạn bấm thử trước đó. Dùng đồng hồ đếm ngược, đừng ước lượng |
| Google OAuth chặn người dùng thật vì app còn "Testing" | Người nhà đăng nhập bị báo lỗi quyền truy cập | Thêm email từng người vào Test Users (§3.2) trước khi họ thử |
| `AUTH_URL` bị đặt nhầm giá trị trên Vercel Production | Đăng nhập redirect sai domain | Xoá biến đó khỏi scope Production nếu có, chỉ giữ ở `.env.local` |
| Build xanh nhưng migration không thật sự áp (chạy nhầm branch) | `db:studio` trỏ `main` thiếu bảng dù Vercel báo thành công | Luôn xác nhận bằng bước 4.3 trước khi tin build xanh là đủ |
| Số đo dao động quá lớn giữa 3 lần (ví dụ 1.2s / 1.4s / 4.8s) | Có thể một lần đo dính mạng di động yếu, không phải cold start | Đo thêm 2 lần nữa nếu độ lệch bất thường, ghi chú điều kiện mạng lúc đo cho từng lần |

---

# 9. Lịch sử thay đổi (Change History)

| Version | Ngày | Phần tác động | Nội dung thay đổi | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- | :--- |
| `0.1` | 2026-08-18 | Toàn bộ | Khởi tạo Runbook đo lường Cold Start Production M2 (E1-T12) | Cột mốc M2 |
