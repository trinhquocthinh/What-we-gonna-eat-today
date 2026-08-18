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
| `AUTH_GOOGLE_ID` | Có (tạm) | Google Cloud Console → APIs & Services → Credentials → OAuth client | `xxxxx.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | Có (tạm) | Cùng nơi trên | `GOCSPX-xxxx` |
| `CRON_SECRET` | Không ở v1.0 | Vercel tự đặt khi có cron | — |

Hai biến `AUTH_GOOGLE_*` đánh dấu **(tạm)**: nhà cung cấp danh tính đích của dự án là Authentik của Family Hub, Google chỉ giữ chỗ tới khi Authentik dựng xong. Xem §3.1.

Mỗi môi trường một bộ giá trị riêng. `AUTH_SECRET` của production **không** được dùng lại ở local.

Redirect URI phải khai báo trong Google Cloud Console cho **cả ba** môi trường, nếu không đăng nhập ở preview sẽ hỏng:

```
http://localhost:3000/api/auth/callback/google
https://<project>-<hash>-<team>.vercel.app/api/auth/callback/google
https://<domain-production>/api/auth/callback/google
```

Preview deploy của Vercel đổi URL theo mỗi nhánh. Cách xử lý là bật tính năng preview URL cố định của Vercel rồi khai báo đúng một URL đó, thay vì thêm URL mới cho từng PR.

---

# 3.1 Chuyển sang Authentik (Family Hub)

App này là **một service trong Family Hub** — mục tiêu là người trong nhà tạo tài khoản đúng một lần rồi dùng được mọi service. Authentik là nhà cung cấp danh tính của hub đó. Mục này là toàn bộ những gì cần làm khi Authentik đã sẵn sàng.

Google hiện tại chỉ là chỗ đứng tạm để app đăng nhập được trong lúc chờ. Giao diện đã trung tính hoá sẵn (nút chỉ ghi "Đăng nhập", không nhắc tên nhà cung cấp), nên khi chuyển sẽ **không phải sửa gì ở phần nhìn thấy được**.

## 3.1.1 Hai quyết định đã chốt — đọc trước khi cấu hình

**Quyết định 1: Subject mode chọn UUID, và không bao giờ đổi.**

`sub` mà Authentik trả về được ghi thẳng vào cột `users.provider_subject`, và cặp `(provider, provider_subject)` là khoá định danh của người dùng (SPEC-001). Authentik cho phép sinh `sub` từ hashed ID, ID, UUID, username, email hoặc UPN. **Đổi lựa chọn này sau khi đã có người đăng nhập sẽ làm mọi người trong nhà mất tài khoản ở mọi service của hub cùng lúc** — không phải chỉ app này. Chọn **UUID**, ghi lại, coi như bất biến.

Không chọn email hay username: cả hai đều đổi được, và SPEC-001 tồn tại chính vì lý do đó.

**Quyết định 2: Authentik trả lời "anh là ai", app trả lời "anh thuộc nhà nào".**

Authentik có group riêng và bắn được vào token, nhưng `group_members` của app **không** lấy từ đó. `group_members.user_id` trỏ vào `users.id` — UUID nội bộ của app, không phải `sub` của Authentik. Lý do: thành viên nhóm và cờ `is_admin` là khái niệm riêng của app, đổi chúng không nên phải mở Authentik lên; và mỗi service trong hub cần giữ được dữ liệu riêng trong khi dùng chung một danh tính.

Nói gọn: Authentik lo **xác thực**, app lo **phân quyền**. Đừng trộn.

## 3.1.2 Dựng Authentik để thử ở local

Chạy được trọn luồng thật với `localhost:3000` trước khi dựng bản public — đủ để bắt cả ba cái bẫy ở §3.1.4.

```bash
mkdir -p ~/authentik && cd ~/authentik
curl -O https://goauthentik.io/docker-compose.yml
echo "PG_PASS=$(openssl rand -base64 36 | tr -d '\n')" >> .env
echo "AUTHENTIK_SECRET_KEY=$(openssl rand -base64 60 | tr -d '\n')" >> .env
docker compose up -d
```

Mở `http://localhost:9000/if/flow/initial-setup/` để đặt mật khẩu cho tài khoản `akadmin`. Lấy compose file trực tiếp từ goauthentik.io thay vì chép vào tài liệu này là cố ý — bộ service của Authentik (server, worker, postgresql, redis) đổi theo phiên bản, chép cứng vào đây là bảo đảm sẽ lỗi thời.

## 3.1.3 Tạo Application và OAuth2 Provider

Trong Authentik Admin Interface:

1. **Applications → Providers → Create → OAuth2/OpenID Provider**
   - Client type: **Confidential**
   - Redirect URIs: `http://localhost:3000/api/auth/callback/authentik` (thêm URL production và preview khi tới lúc)
   - Signing Key: chọn certificate có sẵn
   - Advanced protocol settings → **Subject mode: Based on the User's UUID** ← Quyết định 1
   - Advanced protocol settings → Scopes: bảo đảm có đủ **`openid`, `email`, `profile`** ← xem bẫy số 2
2. **Applications → Applications → Create**, gán provider vừa tạo. **Slug** đặt gì cũng được nhưng phải nhớ — nó nằm trong issuer URL.
3. Copy **Client ID** và **Client Secret** từ trang provider.

Nhãn trong giao diện Authentik có xê dịch giữa các phiên bản. Nếu không thấy đúng chữ như trên, tìm theo ý nghĩa chứ đừng bỏ qua — đặc biệt là Subject mode.

## 3.1.4 Ba cái bẫy

**Bẫy 1 — issuer phải kèm slug và không có `/` ở cuối.** Đây là lỗi cấu hình phổ biến nhất của provider này.

```
https://<domain-authentik>/application/o/<slug>
```

Kiểm chứng trước khi đụng code: `curl https://<domain>/application/o/<slug>/.well-known/openid-configuration` phải trả về JSON. Nếu trả 404 thì slug sai.

**Bẫy 2 — thiếu property mapping thì hỏng ở chỗ khó đoán.** Auth.js xin scope `openid profile email`. Nếu provider không được gán đủ, token về mà thiếu claim `email` hoặc `name` → `readProviderProfile` trả `null` → `provisionUser` trả `ERR_VALIDATION` → callback `jwt` **throw**. Triệu chứng người dùng thấy: bị đá về `/?error=…` với dải báo đỏ, không có manh mối nào. Kiểm ngay ở lần đăng nhập đầu tiên.

**Bẫy 3 — Authentik phải công khai truy cập được từ máy chủ Vercel, không chỉ từ trình duyệt.** Auth.js chạy **phía server** để lấy discovery document và đổi authorization code lấy token. Authentik nằm trong LAN, sau CGNAT hoặc IP động là không chạy được với app deploy trên Vercel. Cloudflare Tunnel giải quyết gọn và không tốn phí. Riêng thử ở local (`localhost:3000` gọi `localhost:9000`) thì không dính bẫy này.

## 3.1.5 Biến môi trường

Bỏ `AUTH_GOOGLE_ID` và `AUTH_GOOGLE_SECRET`, thêm:

| Tên | Bắt buộc | Lấy ở đâu | Ví dụ định dạng |
|---|---|---|---|
| `AUTH_AUTHENTIK_ID` | Có | Authentik → Providers → provider vừa tạo → Client ID | chuỗi hex dài |
| `AUTH_AUTHENTIK_SECRET` | Có | Cùng nơi trên → Client Secret | chuỗi hex dài |
| `AUTH_AUTHENTIK_ISSUER` | Có | Ghép từ domain và slug, xem bẫy 1 | `https://auth.example.com/application/o/wwget` |

Ba tên biến này là quy ước `AUTH_<PROVIDER>_*` mà `@auth/core` tự đọc — không phải đặt tuỳ ý, và không cần truyền config thủ công trong code.

## 3.1.6 Đổi code — hai dòng

| File | Đổi |
|---|---|
| `src/features/auth/infrastructure/auth.ts` | `import Authentik from 'next-auth/providers/authentik'` và `providers: [Authentik]` |
| `src/features/auth/presentation/containers/auth-actions.ts` | `signIn('authentik', { redirectTo: '/groups' })` |

Hết. **Không có migration schema.** Tầng `domain/` và `application/` không đổi một dòng — chúng chưa bao giờ biết nhà cung cấp là ai, `provider` chỉ là một chuỗi. Test của hai tầng đó pass không cần sửa. Giao diện cũng không đổi vì copy đã trung tính từ trước.

## 3.1.7 Xoá dữ liệu Google cũ

Các hàng `users` cũ mang `provider = 'google'`; sau khi chuyển thì không ai đăng nhập vào chúng được nữa, và người dùng sẽ được cấp hàng mới với `provider = 'authentik'`. Quyết định đã chốt là **xoá sạch làm lại**, vì dữ liệu hiện có chỉ là dữ liệu thử của E1.

```sql
-- Đúng thứ tự này: group_members tham chiếu cả hai bảng kia.
TRUNCATE group_members, groups, users RESTART IDENTITY;
```

**Xoay `AUTH_SECRET` ngay sau khi truncate.** Cookie JWT hiện có vẫn mang `userId` của hàng vừa xoá; không xoay thì `getCurrentUser` trả về một User trỏ vào hàng không tồn tại, và lỗi sẽ nổ ở tận màn hình nhóm chứ không phải ở màn đăng nhập. Xoay khiến mọi người phải đăng nhập lại — đằng nào cũng phải, vì họ đang chuyển sang tài khoản hub.

## 3.1.8 Nghiệm thu

1. `curl <issuer>/.well-known/openid-configuration` trả JSON.
2. Đăng nhập lần đầu tạo được hàng `users` mới với `provider = 'authentik'`.
3. Kiểm trong database: `provider_subject` là UUID, **không** phải email hay username → xác nhận Quyết định 1 đã áp đúng.
4. `display_name` và `email` có giá trị thật, không phải email bị dùng làm tên thay → xác nhận property mapping đủ.
5. Đăng xuất rồi đăng nhập lại **không** tạo hàng `users` thứ hai → xác nhận `sub` ổn định.
6. Người thứ hai trong nhà đăng nhập ra hàng riêng, vào đúng nhóm.

Bước 3 và 5 là hai bước dễ bỏ qua nhất và cũng là hai bước đắt nhất nếu sai — phát hiện muộn thì đã có dữ liệu thật gắn vào định danh sai.

---

# 3.2 Thiết lập môi trường Integration Test (Neon branch `test` + GitHub Secret)

Từ E1-S4 trở đi, dự án có các integration test (`yarn test:integration`, cấu hình trong `vitest.integration.config.mts`) chạy trực tiếp trên cơ sở dữ liệu PostgreSQL thật để kiểm tra race conditions (TC-107) và các ràng buộc toàn vẹn dữ liệu.

Branch database `test` phải được **tách riêng biệt** khỏi branch `dev`/`main` vì integration test xoá dữ liệu giữa các lần chạy (Test Cases §1.3).

## 3.2.1 Tạo branch `test` trên Neon Console
1. Đăng nhập **Neon Console** → Chọn Project → Chọn mục **Branches**.
2. Nhấn **Create branch**, tách từ `main`, đặt tên branch là **`test`**.
3. Chọn branch `test` vừa tạo và sao chép connection string (đảm bảo có `?sslmode=require`).

## 3.2.2 Cấu hình ở môi trường Local
1. Chép file mẫu:
   ```bash
   cp .env.test.example .env.test.local
   ```
2. Mở file `.env.test.local` và điền connection string của branch `test`:
   ```bash
   DATABASE_URL="postgresql://user:password@ep-xxx.ap-southeast-1.aws.neon.tech/wwget?sslmode=require"
   ```
3. Áp dụng schema migration lên branch `test`:
   ```bash
   DATABASE_URL="$(grep DATABASE_URL .env.test.local | cut -d= -f2- | tr -d '"')" yarn db:migrate
   ```
4. Chạy thử nghiệm integration test local:
   ```bash
   yarn test:integration
   ```

## 3.2.3 Cấu hình Secret trên GitHub Actions
Để CI trên GitHub tự động chạy bước "Test tích hợp" khi có push/PR trong repo chính:
1. Mở GitHub repository → **Settings** → **Secrets and variables** → **Actions**.
2. Nhấn **New repository secret**.
3. Điền:
   - **Name:** `DATABASE_URL_TEST`
   - **Secret:** connection string của Neon branch `test` (cùng giá trị như ở local).
4. Nhấn **Add secret**.

> **Ghi chú bảo mật CI:** PR từ fork bên ngoài sẽ không đọc được secret này (cơ chế bảo mật mặc định của GitHub Actions); CI workflow đã được cấu hình để tự động bỏ qua bước này (`if: ${{ env.DATABASE_URL_TEST != '' }}`) thay vì báo lỗi đỏ.

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
| 0.1 | 2026-08-18 | §3, §3.1 mới | Thêm hướng dẫn chuyển sang Authentik; đánh dấu `AUTH_GOOGLE_*` là tạm | App là một service trong Family Hub, danh tính dùng chung đến từ Authentik. Chốt hai quyết định: subject mode UUID bất biến, và Authentik lo xác thực còn app lo phân quyền |
| 0.1 | 2026-08-18 | §3.2 mới | Thêm hướng dẫn tạo Neon branch `test` + GitHub secret `DATABASE_URL_TEST` cho integration test | E1-S4 thêm integration test chạy trên database thật để kiểm tra race conditions (TC-107) và ràng buộc toàn vẹn |
