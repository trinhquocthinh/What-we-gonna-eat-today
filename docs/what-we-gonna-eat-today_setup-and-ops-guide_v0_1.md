# Setup & Ops Guide — What We Gonna Eat Today

## Version 0.1

**Status:** Draft — Awaiting review
**Created:** 2026-08-14
**Upstream:** Tech Spec & Architecture v0.2, Plan & Scope v0.1

Viết cho **bạn của sáu tháng sau**, người đã quên sạch mọi thứ. Không giả định người đọc nhớ bất kỳ quyết định nào.

Repo chưa tồn tại tại thời điểm viết. Các mục đánh dấu 🔒 phải được điền giá trị thật ngay khi hoàn thành giai đoạn P0.

---

# 1. Yêu cầu môi trường

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | **24.x LTS** (Krypton) | Active LTS, hỗ trợ tới 30/04/2028. Không dùng Node 26 — nó là bản Current, chỉ lên LTS từ tháng 10/2026. |
| Corepack | Đi kèm Node 24 | Bật bằng `corepack enable`, không cài yarn toàn cục |
| yarn | **4.x** (Berry) | Ghim trong `packageManager` của `package.json` |
| Git | ≥ 2.40 | |
| psql | ≥ 16 | Chỉ cần cho backup và khôi phục thủ công |

Phiên bản Node được ghim ở hai chỗ và phải khớp nhau: `.nvmrc` và trường `engines` trong `package.json`. Nếu lệch, máy bạn chạy được mà CI thì không, và mất một buổi tối để tìm ra.

| Next.js | 16.3.1 |
| React | 19.2.8 |
| TypeScript | 6.0.3 |
| Drizzle ORM / Kit | 0.45.2 / 0.31.10 |
| Auth.js | `next-auth@5.0.0-beta.32` (kéo theo `@auth/core@0.41.3`) |
| Tailwind CSS | 4.3.3 |
| Vitest | 4.1.10 |

---

# 2. Cài đặt lần đầu

Chép dán từng khối theo thứ tự.

```bash
# 1. Lấy mã nguồn
git clone <repo-url> what-we-gonna-eat-today
cd what-we-gonna-eat-today

# 2. Đúng phiên bản Node
nvm install && nvm use          # đọc .nvmrc
node -v                          # phải in ra v24.x

# 3. Bật corepack, cài phụ thuộc
corepack enable
yarn install --immutable

# 4. Tạo file biến môi trường
cp .env.example .env.local
# Mở .env.local và điền theo bảng §3

# 5. Đẩy schema lên Neon branch dev
yarn db:migrate

# 6. Chạy
yarn dev                         # http://localhost:3000
```

Nếu bước 5 báo lỗi kết nối, gần như chắc chắn `DATABASE_URL` thiếu `?sslmode=require`. Neon bắt buộc SSL.

---

# 3. Biến môi trường

**Không bao giờ ghi giá trị thật vào tài liệu này hay vào `.env.example`.**

| Tên | Bắt buộc | Lấy ở đâu | Ví dụ định dạng |
|---|---|---|---|
| `DATABASE_URL` | Có | Neon Console → Project → Connection string, chọn đúng branch | `postgresql://user:***@ep-xxx.ap-southeast-1.aws.neon.tech/wwget?sslmode=require` |
| `AUTH_SECRET` | Có | Tự sinh: `openssl rand -base64 32` | chuỗi base64 32 byte |
| `AUTH_URL` | Chỉ local | URL gốc của môi trường. **Để trống trên Vercel** — biến này ghi đè origin của mọi request, đặt giá trị production vào scope Preview sẽ làm callback trên preview trỏ nhầm domain. Vercel tự đặt `VERCEL=1`, next-auth đọc nó để bật `trustHost` | `http://localhost:3000` |
| `AUTH_GOOGLE_ID` | Có | Google Cloud Console → APIs & Services → Credentials → OAuth client | `xxxxx.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | Có | Cùng nơi trên | `GOCSPX-xxxx` |
| `CRON_SECRET` | Không ở v1.0 | Vercel tự đặt khi có cron | — |

Mỗi môi trường một bộ giá trị riêng. `AUTH_SECRET` của production **không** được dùng lại ở local.

Redirect URI phải khai báo trong Google Cloud Console cho **cả ba** môi trường, nếu không đăng nhập ở preview sẽ hỏng:

```
http://localhost:3000/api/auth/callback/google
https://<project>-<hash>-<team>.vercel.app/api/auth/callback/google
https://<domain-production>/api/auth/callback/google
```

Preview deploy của Vercel đổi URL theo mỗi nhánh. Cách xử lý là bật tính năng preview URL cố định của Vercel rồi khai báo đúng một URL đó, thay vì thêm URL mới cho từng PR.

---

# 4. Lệnh thường dùng

| Lệnh | Việc |
|---|---|
| `yarn dev` | Chạy local |
| `yarn build` | Build production |
| `yarn verify` | **Cổng chính.** Chạy tsc, eslint, prettier, jscpd, knip, vitest |
| `yarn test` | Chỉ unit test |
| `yarn test:integration` | Test chạm database, cần `DATABASE_URL` trỏ tới branch test |
| `yarn test --coverage` | Kèm báo cáo coverage |
| `yarn lint` | Chỉ ESLint, gồm cả luật ranh giới tầng |
| `yarn db:generate` | Sinh file migration từ thay đổi schema |
| `yarn db:migrate` | Áp migration lên database đang trỏ tới |
| `yarn db:studio` | Xem dữ liệu bằng Drizzle Studio |

`yarn verify` là lệnh duy nhất cần nhớ. Nó xanh thì đẩy code được.

---

# 5. Deploy

## 5.1 Preview

Tự động. Mở PR → Vercel dựng preview → Neon tạo branch database riêng cho PR đó.

Kiểm tra trước khi merge: preview mở được trên **điện thoại thật**, không phải trình giả lập trên máy tính.

## 5.2 Production

Tự động khi merge vào `main`. Migration chạy trong bước build.

Trước khi merge vào `main`, chạy 5 kịch bản khói thủ công `MS-01` đến `MS-05` trong Test Cases Specification §4. `MS-05` phải chạy sau ít nhất 10 phút không ai dùng app, nếu không compute của Neon vẫn đang thức và số đo vô nghĩa.

## 5.3 Quay lui một bản deploy

```
Vercel Dashboard → Deployments → chọn bản trước đó → Promote to Production
```

Việc này quay lui **mã nguồn**, không quay lui **database**. Nếu bản vừa deploy có migration phá vỡ tương thích, quay lui mã nguồn sẽ khiến ứng dụng cũ gặp schema mới. Xem §6.

---

# 6. Migration và quay lui

Drizzle sinh SQL, file được commit vào repo, chạy khi build.

## 6.1 Quy tắc bắt buộc

**Mọi migration phải tương thích ngược ít nhất một bản deploy.** Đây là quy tắc bảo vệ khỏi tình huống ở §5.3.

Cụ thể, đổi tên hoặc xoá một cột phải tách làm ba lần deploy:

1. Deploy A: thêm cột mới, ghi vào cả hai cột, đọc từ cột cũ.
2. Deploy B: đọc từ cột mới. Đến đây quay lui về A vẫn an toàn.
3. Deploy C: xoá cột cũ. Chỉ làm khi B đã chạy ổn định vài ngày.

Nghe rườm rà cho một dự án gia đình, nhưng lần duy nhất bạn cần nó là lúc 6 giờ chiều khi cả nhà đang chờ chọn món.

## 6.2 Quay lui migration

Drizzle không sinh migration ngược. Muốn quay lui:

```bash
# 1. Viết tay file migration đảo ngược
yarn db:generate --custom
# 2. Sửa file SQL vừa sinh cho đúng
# 3. Áp
yarn db:migrate
```

Với thay đổi phá huỷ dữ liệu, quay lui migration **không** lấy lại được dữ liệu đã mất. Phải khôi phục từ backup ở §7.

---

# 7. Backup và khôi phục

## 7.1 Cảnh báo quan trọng nhất trong tài liệu này

**Gói Neon Free chỉ giữ cửa sổ khôi phục tức thời 6 tiếng.**

Nghĩa là: nếu tối thứ Bảy bạn chạy nhầm một lệnh xoá dữ liệu, và tới sáng Chủ Nhật mới phát hiện, thì **không khôi phục được**. Cửa sổ đã trôi qua.

Đây không phải khiếm khuyết của Neon mà là điều kiện của gói miễn phí. Nhưng nó có nghĩa là **backup thủ công là bắt buộc**, không phải tuỳ chọn.

## 7.2 Backup

Chạy mỗi tuần một lần, đặt lịch nhắc thật chứ không dựa vào trí nhớ:

```bash
pg_dump "$DATABASE_URL_PRODUCTION" \
  --no-owner --no-privileges --format=custom \
  --file="wwget-$(date +%Y%m%d).dump"
```

Dữ liệu rất nhỏ — dưới 50 MB trong nhiều năm — nên lưu vào một repo Git riêng tư là đủ và miễn phí. Giữ 8 bản gần nhất.

Không commit file dump vào repo mã nguồn. Nó chứa email của người nhà bạn.

## 7.3 Khôi phục

**Bản backup chưa từng thử khôi phục thì coi như không có.**

Diễn tập khôi phục một lần sau khi hoàn thành P1, rồi định kỳ mỗi quý:

```bash
# 1. Tạo branch mới trong Neon Console, đặt tên restore-test

# 2. Nạp bản dump vào branch đó
pg_restore --no-owner --no-privileges \
  --dbname="<connection-string-cua-branch-restore-test>" \
  wwget-20260814.dump

# 3. Trỏ local vào branch đó và mở app
#    Sửa DATABASE_URL trong .env.local
yarn dev

# 4. Kiểm ba thứ, không chỉ nhìn app mở được:
#    - Số lượng dòng eating_history có khớp không
#    - Final Meal gần nhất có đủ món không
#    - Đăng nhập được không

# 5. Xoá branch restore-test
```

Ghi lại ngày diễn tập gần nhất ở đây: 🔒 chưa diễn tập lần nào.

---

# 8. Sự cố thường gặp

| Triệu chứng | Nguyên nhân thường gặp | Xử lý |
|---|---|---|
| Mở app lần đầu trong ngày mất 3–4 giây | Neon đã ngủ sau 5 phút, đang khởi động lại (R-01) | Bình thường ở gói Free. Nếu vượt ngưỡng NFR-01 nhiều lần, xem lại quyết định ở Tech Spec §1 |
| `ERR_SESSION_EXISTS_TODAY` mà không thấy phiên nào | Có phiên `ACTIVE` từ ngày trước chưa bao giờ đóng, vì v1.0 chưa có F26 | Đặt `state = 'INVALID'` thủ công trên DB. Đây là món nợ đã biết |
| Đăng nhập hỏng trên preview | Redirect URI của Vercel đổi theo nhánh, chưa khai báo trong Google Console | Bật preview URL cố định, xem §3 |
| `yarn install` báo lỗi phiên bản | Node không phải 24.x, hoặc quên `corepack enable` | `nvm use` rồi `corepack enable` |
| Build thất bại ở bước migration | Migration xung đột với schema hiện có | Kiểm tra thứ tự file migration; đừng sửa file đã chạy trên production |
| Test integration đỏ ngẫu nhiên | Bảng chưa được xoá sạch giữa các test, hoặc chạy song song trên cùng branch | Dùng branch database riêng cho test, xoá bảng trong `beforeEach` |
| Deploy thất bại với thông báo về cron | Biểu thức cron dày hơn một lần mỗi ngày, Hobby không cho | Xem Tech Spec §6.3 |
| Số đếm trong bảng tổng hợp nhảy lung tung | Số Participant đổi giữa phiên, điểm đã chuẩn hoá theo `T` nên giá trị thay đổi là đúng | Không phải lỗi. Xem Ranking Specification §3.2 |

---

# 9. Theo dõi hạn mức free tier

Kiểm tra mỗi quý. Số liệu xác minh ngày 2026-08-14; hạn mức free tier đổi thường xuyên nên đừng tin bảng này quá sáu tháng.

| Dịch vụ | Giới hạn | Ước tính của dự án | Vượt thì sao |
|---|---|---|---|
| Vercel Hobby — data transfer | 100 GB/tháng | < 1 GB | Tạm dừng khoảng 30 ngày, không phát sinh hoá đơn |
| Vercel Hobby — function invocation | 1 triệu/tháng | < 20 nghìn | Như trên |
| Vercel Hobby — Active CPU | 4 giờ/tháng | < 0.5 giờ | Như trên |
| Vercel Hobby — deploy | 100/ngày | Vài lần/tuần | Chặn deploy trong ngày |
| Neon Free — compute | 100 CU-hour/project/tháng | ~5 CU-hour | Compute bị treo tới kỳ sau |
| Neon Free — storage | 0.5 GB/project | < 50 MB | Chặn ghi |
| Neon Free — network transfer | 5 GB/project/tháng | < 1 GB | Chặn |
| Neon Free — cửa sổ khôi phục | **6 tiếng** | — | Mất dữ liệu vĩnh viễn nếu phát hiện muộn. Xem §7.1 |

Điều kiện thực sự phá vỡ mức 0 ₫ không nằm trong bảng này: **gói Hobby của Vercel chỉ cho dùng cá nhân, phi thương mại.** Ngày dự án thu tiền, dù một đồng, là ngày phải chuyển gói — bất kể mọi con số trên vẫn còn dư dả.

---

# 10. Việc định kỳ

| Việc | Tần suất | Ghi chú |
|---|---|---|
| Backup thủ công | Hàng tuần | §7.2. Đặt lịch nhắc, đừng dựa vào trí nhớ |
| Diễn tập khôi phục | Hàng quý | §7.3. Backup chưa thử khôi phục thì coi như không có |
| Kiểm tra hạn mức free tier | Hàng quý | §9 |
| Cập nhật dependency | Hàng tháng | `yarn upgrade-interactive`, chạy `yarn verify` trước khi commit |
| Kiểm tra Node LTS | Tháng 10 hằng năm | Node 26 lên Active LTS tháng 10/2026; Node 24 hết hạn 30/04/2028 |
| Xoay `AUTH_SECRET` | Hàng năm, hoặc ngay khi nghi ngờ lộ | Xoay sẽ khiến mọi người phải đăng nhập lại |
| Rà lại trọng số ranking | Sau 4 tuần dữ liệu thật, rồi khi thấy cần | Ranking Specification §5. Các trọng số hiện tại là điểm khởi đầu, không phải kết quả tuning |
| Dọn Session `ACTIVE` cũ | Hàng tuần, tới khi có F26 | Món nợ đã biết của v1.0 |

---

# 11. Change History

| Version | Date | Section | Change | Reason / Decision |
|---|---|---|---|---|
| 0.1 | 2026-08-14 | Toàn bộ | Bản draft đầu tiên; phiên bản Node và hạn mức free tier xác minh 2026-08-14 | Phase 8.3 |
