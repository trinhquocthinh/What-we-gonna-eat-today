# 🍲 What We Gonna Eat Today

> **Chốt bữa cho cả nhà mà không phải hỏi vòng quanh.**  
> Nền tảng hỗ trợ gia đình / nhóm quyết định thực đơn mỗi ngày nhanh chóng, cá nhân hoá và không tranh luận.

---

## 📚 Tài liệu dự án (Documentation)

Toàn bộ tài liệu thiết kế và đặc tả kỹ thuật chi tiết nằm trong thư mục [`docs/`](./docs/):

| Nhóm tài liệu                | Tài liệu chính                                                                                                                                               | Mô tả                                                                                                                            |
| :--------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| **🚀 Khởi đầu & Vận hành**   | [Setup & Ops Guide](./docs/what-we-gonna-eat-today_setup-and-ops-guide_v1.2.md)                                                                              | Hướng dẫn cài đặt, môi trường, DB branch và deploy                                                                               |
| **🗺️ Lộ trình & Kế hoạch**   | [Master Plan](./docs/what-we-gonna-eat-today_master-plan_v2.1.md)                                                                                            | Kế hoạch thực thi theo từng Epic / Subtask — v1.0 đã phát hành, [v1.1 ở §16](./docs/what-we-gonna-eat-today_master-plan_v2.1.md) |
| **🏗️ Kiến trúc & Thiết kế**  | [Tech Spec & Architecture](./docs/what-we-gonna-eat-today_tech-spec-architecture_v1.2.md)                                                                    | Kiến trúc Clean Architecture, luật tầng & chất lượng                                                                             |
| **📐 Thiết kế phần mềm**     | [SDD](./docs/what-we-gonna-eat-today_sdd_v1.3.md) • [Diagrams](./docs/what-we-gonna-eat-today_diagrams_v1.1.md)                                              | Đặc tả module (SPEC-xxx), C4 Context/Container & ERD                                                                             |
| **📋 Yêu cầu & Nghiệp vụ**   | [PRD](./docs/what-we-gonna-eat-today_prd_v1.5.md) • [Business Rules](./docs/what-we-gonna-eat-today_business-rules_v1.8.md)                                  | Persona, User Stories và quy tắc nghiệp vụ (`BR-xxx`)                                                                            |
| **🧪 Kiểm thử & Thuật toán** | [Test Cases](./docs/what-we-gonna-eat-today_test-cases-specification_v1.1.md) • [Ranking Spec](./docs/what-we-gonna-eat-today_ranking-specification_v1.3.md) | Bộ kiểm thử (`TC-xxx`) & thuật toán chấm điểm gợi ý                                                                              |

---

## ⚡ Hướng dẫn chạy lần đầu (Quickstart)

```bash
# 1. Cài đặt phiên bản Node.js yêu cầu (Node 24)
nvm install && nvm use

# 2. Kích hoạt Yarn Modern (Yarn 4) — KHÔNG cài đặt yarn global
corepack enable
yarn install --immutable

# 3. Thiết lập biến môi trường
cp .env.example .env.local  # Điền cấu hình theo Setup & Ops Guide §3

# 4. Khởi chạy máy chủ phát triển
yarn dev                    # Truy cập http://localhost:3000
```

> [!IMPORTANT]
> **Node 24** và **Yarn 4** là yêu cầu bắt buộc, không phải khuyến nghị. Git hooks sẽ từ chối thực thi nếu sai phiên bản để ngăn ngừa lỗi tiềm ẩn khó chẩn đoán.

---

## 🛠️ Danh sách lệnh thông dụng (Commands)

| Lệnh                 | Mục đích / Hành động                                                                                           |
| :------------------- | :------------------------------------------------------------------------------------------------------------- |
| `yarn dev`           | Khởi chạy máy chủ development cục bộ                                                                           |
| `yarn verify`        | **Cổng kiểm tra chất lượng chính:** `tsc` → `eslint` → `prettier` → `docs:links` → `jscpd` → `knip` → `vitest` |
| `yarn docs:links`    | Kiểm tra mọi liên kết tương đối trong tài liệu có trỏ tới file thật hay không                                  |
| `yarn arch:probe`    | Kiểm tra luật ranh giới tầng kiến trúc (Architecture boundary probe)                                           |
| `yarn test`          | Chạy bộ kiểm thử tự động (Unit Tests)                                                                          |
| `yarn test:coverage` | Chạy bộ kiểm thử và xuất báo cáo độ bao phủ mã nguồn (Coverage Report)                                         |
| `yarn db:generate`   | Sinh mã migration Drizzle từ schema                                                                            |
| `yarn db:migrate`    | Áp dụng migration vào cơ sở dữ liệu Postgres (Neon)                                                            |

> [!TIP]
> Trước khi tạo pull request hoặc push code lên remote branch, hãy đảm bảo lệnh `yarn verify` chạy xanh hoàn toàn.

---

## 🏛️ Kiến trúc hệ thống (Architecture)

Dự án áp dụng **Clean Architecture** kết hợp tổ chức theo **Feature-first** ([Tech Spec §2.1](./docs/what-we-gonna-eat-today_tech-spec-architecture_v1.2.md)):

### 1. Cấu trúc thư mục Feature

```text
src/features/<feature>/
├── domain/           # Hàm thuần túy, business logic cốt lõi (không React/Drizzle/process.env)
├── application/      # Use cases, định nghĩa ports dạng interface
├── infrastructure/   # Hiện thực ports (Drizzle repositories, API clients)
└── presentation/
    ├── containers/   # Gọi use cases, quản lý state & bắt lỗi
    ├── components/   # Thuần UI components, chỉ nhận props (không import application/)
    └── hooks/        # UI hooks tái sử dụng
```

### 2. Quy tắc phụ thuộc (Dependency Rule)

Luồng phụ thuộc một chiều nghiêm ngặt — không có mũi tên nào đi ngược:

```text
presentation ──► application ──► domain
                      ▲
infrastructure ───────┘
```

- **Container / Presentational:** Container kết nối Application layer; Component chỉ nhận props. ESLint chặn cứng việc `presentation/components/` import từ `application/`.
- **Ranh giới giữa các Feature:** Chỉ 7 chiều quan hệ được phép ([Tech Spec §2.3](./docs/what-we-gonna-eat-today_tech-spec-architecture_v1.2.md)):
  1. `selection → history`
  2. `selection → dish`
  3. `selection → preference`
  4. `meal → rule`
  5. `meal → history`
  6. `meal → preference`
  7. `session → rule`
     _(Mọi chiều import chéo khác đều bị ESLint chặn)._
- **Authorization Guards ([SPEC-019](./docs/what-we-gonna-eat-today_sdd_v1.3.md)):** Được kiểm tra ở tầng `app/` trước khi gọi Use Case, không tạo thêm phụ thuộc chéo giữa các feature.

### 3. Cơ chế kiểm tra ranh giới kiến trúc (`yarn arch:probe`)

> [!NOTE]
> Quy tắc `import/no-restricted-paths` có thể im lặng nếu cấu hình sai regex / glob. Lệnh `yarn arch:probe` chủ động tạo file vi phạm giả lập, xác nhận ESLint bắt chính xác 6 lỗi kiến trúc và không chặn chiều hợp lệ, sau đó tự động dọn sạch.

---

## 📏 Quy ước phát triển (Conventions)

- **Commit Message:** Tuân thủ chuẩn [Conventional Commits](https://www.conventionalcommits.org/), với `scope` là tên feature (vd: `feat(group): add invite link generation`). Được tự động kiểm tra qua `commitlint` tại hook `commit-msg`.
- **Đặt tên nhánh (Branching):** `feat/<feature>-<short-description>`, `fix/...`, `chore/...`.
- **Vị trí file kiểm thử:** Đặt cạnh file nguồn cần test (vd: `ranking.ts` → `ranking.test.ts`).
- **Domain Layer Purity:** Các hàm trong `domain/` phải là hàm thuần (pure function) — truyền `now` hoặc `referenceDate` qua tham số thay vì gọi `new Date()`, không sử dụng mock khi viết unit test.
