# What We Gonna Eat Today

Chốt bữa cho cả nhà mà không phải hỏi vòng quanh.

Tài liệu đầy đủ nằm ở [`docs/`](docs/). Ba file cần nhất: **Tech Spec & Architecture**
(kiến trúc và cổng chất lượng), **Master Plan** (kế hoạch theo epic), **Setup & Ops Guide**
(vận hành).

---

## Chạy lần đầu

```bash
nvm install && nvm use     # đọc .nvmrc → Node 24
corepack enable            # yarn 4, KHÔNG cài yarn toàn cục
yarn install --immutable

cp .env.example .env.local # rồi điền theo Setup & Ops Guide §3
yarn dev                   # http://localhost:3000
```

Node 24 và yarn 4 là bắt buộc, không phải khuyến nghị. Git hook sẽ từ chối chạy nếu sai
phiên bản, vì hook chạy sai phiên bản thì hỏng theo kiểu khó đoán chứ không báo thẳng.

## Lệnh

| Lệnh                                   | Việc                                                            |
| -------------------------------------- | --------------------------------------------------------------- |
| `yarn dev`                             | Chạy local                                                      |
| `yarn verify`                          | **Cổng chính.** tsc → eslint → prettier → jscpd → knip → vitest |
| `yarn arch:probe`                      | Kiểm luật tầng có thật sự chặn (xem bên dưới)                   |
| `yarn test` / `yarn test:coverage`     | Unit test / kèm coverage                                        |
| `yarn db:generate` / `yarn db:migrate` | Sinh và áp migration                                            |

`yarn verify` xanh thì đẩy code được.

---

## Kiến trúc

Chia theo feature trước, theo tầng sau (Tech Spec §2.1). Mỗi feature có bốn tầng:

```
src/features/<feature>/
├── domain/           # hàm thuần, không React/Drizzle/process.env
├── application/      # use case, định nghĩa port dạng interface
├── infrastructure/   # hiện thực port
└── presentation/
    ├── containers/   # gọi use case, giữ state, xử lý lỗi
    ├── components/   # thuần props, không biết application/ tồn tại
    └── hooks/
```

Luật phụ thuộc — không mũi tên nào đi ngược:

```
presentation → application → domain
infrastructure → application
```

**Container/Presentational:** container biết use case, component chỉ nhận props.
ESLint chặn `presentation/components/` import `application/`, nên ranh giới này do máy
giữ chứ không do trí nhớ.

**Giữa các feature:** chỉ bốn chiều được phép (§2.3) — `selection → history`,
`selection → dish`, `meal → rule`, `meal → history`. Mọi chiều khác bị ESLint chặn.

Guard phân quyền (SPEC-019) **không** tạo thêm chiều nào: nó được lắp ở `app/` trước khi
gọi use case. Nếu thấy mình cần thêm một chiều, hãy kiểm tra xem việc lắp ráp có thuộc về
`app/` hay không trước đã.

### Vì sao có `yarn arch:probe`

`import/no-restricted-paths` **im lặng khi cấu hình sai**. Dùng glob `*` trong `target`
thì luật không khớp gì cả mà cũng không báo lỗi — một cấu hình hỏng nhìn y hệt một
codebase sạch. Chuyện này đã xảy ra thật lúc dựng E0.

`yarn arch:probe` dựng file vi phạm cố ý, khẳng định ESLint bắt đủ 5 lỗi và không đụng
vào chiều hợp lệ, rồi dọn sạch. CI chạy nó cạnh `yarn verify`.

---

## Quy ước

- Commit theo Conventional Commits, `scope` là tên feature. commitlint chặn ở `commit-msg`.
- Nhánh: `feat/<feature>-<mô-tả-ngắn>`, `fix/...`, `chore/...`
- File test đặt cạnh file nguồn: `ranking.ts` → `ranking.test.ts`
- Hàm thuần trong `domain/` test **không mock gì**; nhận `now`, `referenceDate` làm tham số
  thay vì tự gọi `new Date()`.
