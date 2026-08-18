# 🛠️ Setup & Ops Guide — What We Gonna Eat Today

> **Document Metadata**
>
> - **Version:** `0.2` | **Status:** `Approved`
> - **Created:** `2026-08-14` | **Last Updated:** `2026-08-18`
> - **Supersedes:** `v0.1` | **Upstream:** [Tech Spec & Architecture](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) • [Plan & Scope](what-we-gonna-eat-today_plan-and-scope_v0_1.md)
> - **Downstream:** [Master Plan](what-we-gonna-eat-today_master-plan_v1_0.md) • Môi trường triển khai Production & Dev
>
> 📌 *Cẩm nang vận hành và hướng dẫn cài đặt hệ thống: Yêu cầu môi trường (Node 24, Yarn 4), cấu hình biến môi trường, chuyển đổi Authentik (Family Hub), quy trình Database Branching, sao lưu/khôi phục và xử lý sự cố.*

---

## 📑 Mục lục (Table of Contents)

1. [Yêu cầu phiên bản môi trường (Environment Requirements)](#1-yêu-cầu-phiên-bản-môi-trường-environment-requirements)
2. [Hướng dẫn cài đặt lần đầu (First-time Setup)](#2-hướng-dẫn-cài-đặt-lần-đầu-first-time-setup)
3. [Danh mục biến môi trường (Environment Variables)](#3-danh-mục-biến-môi-trường-environment-variables)
   - [3.1 Hướng dẫn chuyển đổi sang Authentik / Family Hub](#31-hướng-dẫn-chuyển-đổi-sang-authentik--family-hub)
   - [3.2 Thiết lập môi trường Integration Test (Neon branch `test` + GitHub Secret)](#32-thiết-lập-môi-trường-integration-test-neon-branch-test--github-secret)
4. [Danh sách lệnh vận hành thường dùng (CLI Commands)](#4-danh-sách-lệnh-vận-hành-thường-dùng-cli-commands)
5. [Quy trình triển khai (Deployment Workflows)](#5-quy-trình-triển-khai-deployment-workflows)
   - [5.1 Preview Deployment](#51-preview-deployment)
   - [5.2 Production Deployment](#52-production-deployment)
   - [5.3 Quay lui bản Deploy (Rollback)](#53-quay-lui-bản-deploy-rollback)
   - [5.4 Bảng ghi nhận đo lường Cold Start thực tế (M2)](#54-bảng-ghi-nhận-đo-lường-cold-start-thực-tế-m2)
6. [Quản trị Database Migration & Tương thích ngược](#6-quản-trị-database-migration--tương-thích-ngược)
7. [Chiến lược sao lưu và diễn tập khôi phục (Backup & Restore)](#7-chiến-lược-sao-lưu-và-diễn-tập-khôi-phục-backup--restore)
8. [Cẩm nang xử lý sự cố thường gặp (Troubleshooting)](#8-cẩm-nang-xử-lý-sự-cố-thường-gặp-troubleshooting)
9. [Giám sát hạn mức gói dịch vụ miễn phí (Free Tier Limits)](#9-giám-sát-hạn-mức-gói-dịch-vụ-miễn-phí-free-tier-limits)
10. [Lịch trình công việc định kỳ (Periodic Ops Tasks)](#10-lịch-trình-công-việc-định-kỳ-periodic-ops-tasks)
11. [Lịch sử thay đổi (Change History)](#11-lịch-sử-thay-đổi-change-history)

---

# 1. Yêu cầu phiên bản môi trường (Environment Requirements)

| Thành phần | Phiên bản yêu cầu | Ghi chú & Lý do ghim phiên bản |
| :--- | :--- | :--- |
| **Node.js** | **`24.x LTS`** (Krypton) | Active LTS, hỗ trợ tới 30/04/2028. Ghim trong `.nvmrc` và `package.json#engines` |
| **Corepack** | Tích hợp sẵn Node 24 | Kích hoạt bằng `corepack enable`, **tuyệt đối không cài yarn global** |
| **Yarn** | **`4.x`** (Berry) | Quản lý qua `packageManager` trong `package.json` |
| **Git** | $\ge 2.40$ | Quản lý mã nguồn và Git hooks |
| **PostgreSQL CLI (`psql`)** | $\ge 16$ | Phục vụ sao lưu thủ công (`pg_dump`) và diễn tập khôi phục |

### 📦 Các thư viện chính

- **Next.js:** `16.3.1` (App Router)
- **React:** `19.2.8`
- **TypeScript:** `6.0.3` (Strict mode)
- **Drizzle ORM / Kit:** `0.45.2` / `0.31.10`
- **Auth.js:** `next-auth@5.0.0-beta.32` (`@auth/core@0.41.3`)
- **Tailwind CSS:** `4.3.3`
- **Vitest:** `4.1.10`

---

# 2. Hướng dẫn cài đặt lần đầu (First-time Setup)

```bash
# 1. Lấy mã nguồn dự án
git clone <repo-url> what-we-gonna-eat-today
cd what-we-gonna-eat-today

# 2. Thiết lập đúng phiên bản Node.js
nvm install && nvm use          # Đọc file .nvmrc -> Node 24.x
node -v                          # Xác nhận in ra v24.x

# 3. Kích hoạt corepack và cài đặt dependencies
corepack enable
yarn install --immutable

# 4. Thiết lập biến môi trường
cp .env.example .env.local
# Mở .env.local và điền các giá trị theo bảng §3

# 5. Đẩy schema migration lên Neon branch dev
yarn db:migrate

# 6. Khởi chạy máy chủ phát triển cục bộ
yarn dev                         # Truy cập http://localhost:3000
```

> [!TIP]
> Nếu lệnh `yarn db:migrate` báo lỗi kết nối, hãy kiểm tra chuỗi `DATABASE_URL` đã có đuôi `?sslmode=require` hay chưa (Neon bắt buộc kết nối SSL mã hóa).

---

# 3. Danh mục biến môi trường (Environment Variables)

> [!CAUTION]
> **Tuyệt đối KHÔNG commit giá trị thật** vào Git repository hoặc file `.env.example`.

| Tên biến | Bắt buộc | Nguồn lấy cấu hình | Ví dụ định dạng |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Có | Neon Console $\to$ Project $\to$ Connection string | `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/wwget?sslmode=require` |
| `AUTH_SECRET` | Có | Tự sinh ngẫu nhiên qua lệnh shell | Sinh bằng: `openssl rand -base64 32` |
| `AUTH_URL` | Chỉ Local | URL gốc của môi trường (**Để trống trên Vercel**) | `http://localhost:3000` |
| `AUTH_GOOGLE_ID` | Có (tạm) | Google Cloud Console $\to$ Credentials $\to$ OAuth client | `xxxxx.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | Có (tạm) | Cùng nơi trên | `GOCSPX-xxxx` |
| `CRON_SECRET` | Không | Vercel tự động cấu hình khi có cronjob | Chuỗi bảo mật ngẫu nhiên |

---

## 3.1 Hướng dẫn chuyển đổi sang Authentik / Family Hub

Ứng dụng được thiết kế như một service trong hệ sinh thái **Family Hub** — nơi các thành viên gia đình sử dụng chung một tài khoản Authentik duy nhất.

### 📌 2 Quyết định kiến trúc bất biến

1. **Subject mode bắt buộc chọn UUID:** Cặp `(provider, provider_subject)` là khóa định danh vĩnh viễn ([SPEC-001](what-we-gonna-eat-today_sdd_v0_1.md)). Không dùng email/username làm subject vì chúng có thể thay đổi.
2. **Authentik xác thực ("Anh là ai") — App phân quyền ("Anh thuộc nhà nào"):** Quan hệ thành viên `group_members` hoàn toàn do app quản lý nội bộ.

### Các biến môi trường thay thế

```bash
AUTH_AUTHENTIK_ID="<client-id-tu-authentik>"
AUTH_AUTHENTIK_SECRET="<client-secret-tu-authentik>"
AUTH_AUTHENTIK_ISSUER="https://auth.familyhub.example/application/o/wwget"
```

---

## 3.2 Thiết lập môi trường Integration Test (Neon branch `test` + GitHub Secret)

Để các bài test tích hợp (`yarn test:integration`) chạy an toàn mà không làm mất dữ liệu của môi trường phát triển (`dev`):

### 1. Tạo Database Branch `test` trên Neon Console

- Mở **Neon Console** $\to$ **Branches** $\to$ **Create branch** (tách từ `main`), đặt tên là **`test`**.

### 2. Cấu hình cục bộ (.env.test.local)

```bash
cp .env.test.example .env.test.local
# Điền DATABASE_URL của branch test vào .env.test.local

# Chạy migration cho branch test:
DATABASE_URL="$(grep DATABASE_URL .env.test.local | cut -d= -f2- | tr -d '\"')" yarn db:migrate

# Chạy test tích hợp:
yarn test:integration
```

### 3. Cấu hình GitHub Actions Secret

- Thêm Secret `DATABASE_URL_TEST` trong mục **Settings $\to$ Secrets and variables $\to$ Actions** trên GitHub repository.

---

# 4. Danh sách lệnh vận hành thường dùng (CLI Commands)

| Lệnh thực thi | Mục đích / Tác vụ |
| :--- | :--- |
| `yarn dev` | Khởi chạy server development cục bộ |
| `yarn build` | Biên dịch bundle production |
| `yarn verify` | **Cổng kiểm tra chất lượng toàn diện:** `tsc` + `eslint` + `prettier` + `jscpd` + `knip` + `vitest` |
| `yarn test` | Chạy bộ Unit Tests |
| `yarn test:integration` | Chạy bộ Integration Tests trên cơ sở dữ liệu thật |
| `yarn test --coverage` | Chạy kiểm thử và xuất báo cáo độ bao phủ mã nguồn |
| `yarn arch:probe` | Kiểm tra tính hiệu lực của luật ranh giới tầng kiến trúc |
| `yarn db:generate` | Sinh file SQL migration từ thay đổi schema Drizzle |
| `yarn db:migrate` | Áp dụng SQL migration vào database đang kết nối |
| `yarn db:studio` | Mở giao diện trực quan quản lý dữ liệu Drizzle Studio |

---

# 5. Quy trình triển khai (Deployment Workflows)

## 5.1 Preview Deployment

- Tự động kích hoạt khi mở Pull Request trên GitHub.
- Vercel dựng preview URL độc lập; Neon tự động rẽ nhánh database tương ứng (copy-on-write).
- **Yêu cầu nghiệm thu:** Mở và kiểm thử trực tiếp trên **điện thoại thật**.

## 5.2 Production Deployment

- Tự động triển khai khi PR được merge vào nhánh `main`.
- Migration tự động chạy trong tiến trình build của Vercel.
- Chạy 5 kịch bản Smoke Tests (`MS-01` đến `MS-05`) trước khi thông báo cho gia đình sử dụng.

## 5.3 Quay lui bản Deploy (Rollback)

```text
Vercel Dashboard ──► Deployments ──► Chọn bản ổn định trước đó ──► Promote to Production
```

> [!WARNING]
> Thao tác Rollback trên Vercel chỉ quay lui **mã nguồn**, không quay lui **Database Schema**. Do đó mọi migration phải tuân thủ nghiêm ngặt nguyên tắc tương thích ngược (§6).

## 5.4 Bảng ghi nhận đo lường Cold Start thực tế (M2)

*(Thực hiện đo lường theo [MS-05](what-we-gonna-eat-today_test-cases-specification_v0_1.md) trên điện thoại thật qua mạng 4G/5G sau $\ge 10\text{ phút}$ idle)*

| Ngày đo | Model thiết bị | Nhà mạng / Kết nối | Lần 1 | Lần 2 | Lần 3 | Kết luận đánh giá |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `2026-08-18` | iPhone 15 Pro | Viettel 5G | 1.8s | 0.9s | 0.8s | ✅ Đạt NFR-01 ($\le 2.5\text{s}$) |

---

# 6. Quản trị Database Migration & Tương thích ngược

> [!IMPORTANT]
> **Quy tắc vàng:** Mọi thay đổi cấu trúc bảng bắt buộc phải **tương thích ngược ít nhất một phiên bản deploy**.

### Quy trình 3 bước khi đổi tên hoặc xóa cột

1. **Deploy Phase A:** Thêm cột mới song song, ghi đồng thời vào cả 2 cột, đọc từ cột cũ.
2. **Deploy Phase B:** Chuyển mã nguồn sang đọc từ cột mới (đến bước này vẫn có thể an toàn rollback về Phase A).
3. **Deploy Phase C:** Xóa bỏ cột cũ sau khi Phase B đã chạy ổn định trên Production nhiều ngày.

---

# 7. Chiến lược sao lưu và diễn tập khôi phục (Backup & Restore)

> [!CAUTION]
> **CẢNH BÁO QUAN TRỌNG VỀ NEON FREE TIER:**  
> Gói Neon Free **chỉ hỗ trợ khôi phục tức thời (Point-in-time Recovery) trong vòng 6 TIẾNG**. Do đó việc sao lưu thủ công định kỳ hằng tuần là **BẮT BUỘC**.

### Lệnh sao lưu thủ công hằng tuần

```bash
pg_dump "$DATABASE_URL_PRODUCTION" \
  --no-owner --no-privileges --format=custom \
  --file="backup-wwget-$(date +%Y%m%d).dump"
```

### Quy trình diễn tập khôi phục hằng quý

1. Tạo branch tạm `restore-test` trên Neon Console.
2. Nạp dữ liệu từ file dump:

   ```bash
   pg_restore --no-owner --no-privileges --dbname="<branch-restore-test-url>" backup-wwget-20260814.dump
   ```

3. Trỏ `DATABASE_URL` cục bộ vào branch `restore-test` và kiểm tra tính toàn vẹn:
   - Bản ghi `eating_history` có đầy đủ?
   - Thực đơn `final_meals` gần nhất có chính xác?
   - Đăng nhập người dùng hoạt động bình thường?
4. Xóa branch tạm `restore-test` sau khi hoàn tất kiểm tra.

---

# 8. Cẩm nang xử lý sự cố thường gặp (Troubleshooting)

| Hiện tượng / Triệu chứng | Nguyên nhân gốc rễ | Hướng dẫn khắc phục |
| :--- | :--- | :--- |
| Mở app lần đầu trong ngày mất 3–4 giây | Neon Compute tự ngủ sau 5 phút idle ([R-01](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md)) | Hiện tượng bình thường của gói Free. Render skeleton shell trước |
| Báo lỗi `ERR_SESSION_EXISTS_TODAY` dù không thấy phiên | Có phiên `ACTIVE` ngày cũ chưa được đóng | Chuyển `state = 'INVALID'` thủ công trên DB cho phiên cũ |
| Lỗi đăng nhập Google trên Preview Vercel | Redirect URI chưa được khai báo trên Google Console | Cấu hình Preview URL cố định trên Vercel và thêm vào OAuth Client |
| Lệnh `yarn install` báo lỗi không tương thích | Node.js sai phiên bản hoặc chưa bật Corepack | Chạy `nvm use` và `corepack enable` |
| Build Vercel thất bại ở bước Migration | Xung đột thứ tự migration file | Kiểm tra lại journal migration; không chỉnh sửa file migration cũ đã áp dụng |
| Lỗi tích hợp `test:integration` fail ngẫu nhiên | Bảng DB chưa được dọn sạch giữa các bài test | Đảm bảo hook `beforeEach` thực thi truncate bảng sạch sẽ |

---

# 9. Giám sát hạn mức gói dịch vụ miễn phí (Free Tier Limits)

| Dịch vụ & Chỉ số | Hạn mức Free Tier | Mức tiêu thụ dự kiến | Hành vi khi vượt ngưỡng |
| :--- | :--- | :--- | :--- |
| **Vercel: Data Transfer** | 100 GB / tháng | $< 1\text{ GB}$ | Tạm dừng dịch vụ, không phát sinh tiền |
| **Vercel: Function Execution** | 1.000.000 lượt / tháng | $< 20.000\text{ lượt}$ | Tạm dừng dịch vụ |
| **Vercel: Active CPU** | 4 CPU-hours / tháng | $< 0.5\text{ giờ}$ | Tạm dừng dịch vụ |
| **Neon: Compute Hours** | 100 CU-hours / tháng | $\approx 5\text{ CU-hours}$ | Tạm dừng Compute đến đầu tháng sau |
| **Neon: Storage Capacity** | 0.5 GB / project | $< 50\text{ MB}$ | Chặn ghi thêm dữ liệu |
| **Neon: Recovery Window** | **6 tiếng** | — | Mất dữ liệu vĩnh viễn nếu không có backup thủ công |

---

# 10. Lịch trình công việc định kỳ (Periodic Ops Tasks)

| Hạng mục công việc | Tần suất | Hướng dẫn chi tiết |
| :--- | :---: | :--- |
| **Sao lưu Database thủ công** | Hằng tuần | Chạy lệnh `pg_dump` (§7.2) và lưu trữ an toàn |
| **Diễn tập khôi phục Database** | Hằng quý | Khôi phục thử nghiệm trên branch tạm (§7.3) |
| **Kiểm tra dung lượng Free Tier** | Hằng quý | Rà soát dashboard Vercel và Neon (§9) |
| **Nâng cấp gói Dependencies** | Hằng tháng | Chạy `yarn upgrade-interactive` và kiểm tra bằng `yarn verify` |
| **Rà soát & Tinh chỉnh Ranking** | Sau 4 tuần chạy thật | Xem xét lại các hệ số trọng số theo phản hồi của gia đình |

---

# 11. Lịch sử thay đổi (Change History)

| Version | Ngày | Phần tác động | Nội dung thay đổi | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- | :--- |
| `0.2` | 2026-08-18 | §3.1, §3.2, §5.4 | Thêm hướng dẫn Authentik, cấu hình Neon branch `test` và runbook đo Cold Start | Bổ sung theo yêu cầu E1-S4 & E1-S7 |
| `0.1` | 2026-08-14 | Toàn bộ | Bản thảo đầu tiên: Yêu cầu môi trường, setup, biến môi trường, backup/restore | Khởi tạo baseline vận hành |
