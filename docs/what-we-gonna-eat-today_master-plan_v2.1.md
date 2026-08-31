# 🗺️ Master Plan — What We Gonna Eat Today

> **Document Metadata**
>
> - **Version:** `2.1` | **Status:** `Active (v1.1 Planning)` | **Release:** `R2`
> - **Created:** `2026-08-14` | **Last Updated:** `2026-08-26`
> - **Supersedes:** `v2.0` | **Upstream:** [PRD](what-we-gonna-eat-today_prd_v1.5.md) • [Tech Spec](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) • [SDD](what-we-gonna-eat-today_sdd_v1.3.md) • [Business Rules](what-we-gonna-eat-today_business-rules_v1.7.md)
>
> 📌 *Tài liệu này là cẩm nang thực thi hằng ngày. **v1.0 đã phát hành:** 56 subtask, 121 giờ cơ sở. **v1.1 đang mở:** 30 subtask, 81.25 giờ cơ sở ([§16](#16-v11--chi-tiết-thi-công)). Mỗi subtask được thiết kế để hoàn thành trong một buổi ngồi (1 đến 4 giờ).*

---

## 📑 Mục lục (Table of Contents)

1. [Bảng tiến độ tổng quan](#1-bảng-tiến-độ-tổng-quan)
2. [E0 — Scaffold](#2-e0--scaffold)
3. [E1 — Walking Skeleton](#3-e1--walking-skeleton)
4. [E2 — Group và Dish hoàn chỉnh](#4-e2--group-và-dish-hoàn-chỉnh)
5. [E3 — Phiên và người tham gia](#5-e3--phiên-và-người-tham-gia)
6. [E4 — Deck và Ranking](#6-e4--deck-và-ranking)
7. [E5 — Rule và chốt bữa](#7-e5--rule-và-chốt-bữa)
8. [E6 — Hoàn thiện](#8-e6--hoàn-thiện)
8b. [M1 — Bảo trì sau v1.0: Danh mục món](#8b-m1--bảo-trì-sau-v10-danh-mục-món)
9. [Đường găng (Critical Path)](#9-đường-găng-critical-path)
10. [Lịch theo quỹ giờ (Workload Scenarios)](#10-lịch-theo-quỹ-giờ-workload-scenarios)
11. [Bảng rủi ro & Phương án xử lý](#11-bảng-rủi-ro--phương-án-xử-lý)
12. [Điểm kiểm tra Scope (Checkpoints)](#12-điểm-kiểm-tra-scope-checkpoints)
13. [Sau v1.0 — Lộ trình v1.1 & v1.2](#13-sau-v10--lộ-trình-v11-và-v12)
14. [Ngoài phạm vi (Out of Scope)](#14-ngoài-phạm-vi-out-of-scope)
15. [Lịch sử thay đổi (Change History)](#15-lịch-sử-thay-đổi-change-history)
16. [v1.1 — Chi tiết thi công](#16-v11--chi-tiết-thi-công)
    - [16.1 M2 — Vá cross-link tài liệu](#161-m2--vá-cross-link-tài-liệu)
    - [16.2 E7 — Ràng buộc và sở thích cá nhân](#162-e7--ràng-buộc-và-sở-thích-cá-nhân)
    - [16.3 E8 — Deck ngắn và có nhịp](#163-e8--deck-ngắn-và-có-nhịp)
    - [16.4 E9 — Chế độ vuốt theo chặng](#164-e9--chế-độ-vuốt-theo-chặng)
    - [16.5 E10 — Chốt bữa có hướng dẫn mềm](#165-e10--chốt-bữa-có-hướng-dẫn-mềm)
    - [16.6 E11 — Vận hành tối thiểu](#166-e11--vận-hành-tối-thiểu)
    - [16.7 Đường găng và rủi ro v1.1](#167-đường-găng-và-rủi-ro-v11)

---

# 1. Bảng tiến độ tổng quan

| Epic | Nội dung | Subtask | Giờ cơ sở | Trạng thái |
| :--- | :--- | :---: | :---: | :---: |
| **E0** | Scaffold & Hạ tầng kỹ thuật | 7 | 10 | `[x]` ✅ Xong |
| **E1** | Walking skeleton (End-to-End thô) | 12 | 24 | `[x]` ✅ Xong |
| **E2** | Group và Dish hoàn chỉnh | 7 | 16 | `[x]` ✅ Xong |
| **E3** | Phiên và người tham gia | 6 | 14 | `[x]` ✅ Xong — Cột mốc M3 |
| **E4** | Deck vuốt và thuật toán Ranking | 9 | 21 | `[x]` ✅ Xong — Cột mốc M4 |
| **E5** | Rule engine và chốt bữa (Final Meal) | 10 | 23 | `[x]` ✅ Xong — Cột mốc M5 |
| **E6** | Hoàn thiện UX, Coverage & NFRs | 8 | 20.5 | `[x]` ✅ Xong — Cột mốc M6 |
| **M1** | Bảo trì sau v1.0 — Danh mục món | 5 | 9 | `[x]` ✅ Xong |
| | **— Kết thúc v1.0 —** | **56** | **121** | |
| **M2** | Vá cross-link tài liệu | 4 | 2 | `[x]` ✅ Xong |
| **E7** | Ràng buộc và sở thích cá nhân | 8 | 19.25 | `[ ]` Chưa bắt đầu |
| **E8** | Deck ngắn và có nhịp | 6 | 19 | `[ ]` Chưa bắt đầu |
| **E9** | Chế độ vuốt theo chặng | 5 | 17 | `[ ]` Chưa bắt đầu |
| **E10** | Chốt bữa có hướng dẫn mềm | 5 | 16 | `[ ]` Chưa bắt đầu |
| **E11** | Vận hành tối thiểu | 2 | 8 | `[ ]` Chưa bắt đầu |
| | **— Tổng v1.1 —** | **30** | **81.25** | |

> [!TIP]
> Cột trạng thái dùng để theo dõi tiến độ. Nếu sau ba tuần chưa có ô nào được tick, vấn đề không nằm ở kế hoạch mà ở nhịp độ thực thi.

> [!NOTE]
> Chi tiết subtask của v1.1 nằm ở [§16](#16-v11--chi-tiết-thi-công). Phạm vi v1.1 đã được re-scope ngày 2026-08-26 theo phản hồi dùng thật — xem [DEC-056](what-we-gonna-eat-today_decision-log_v3.9.md).

---

# 2. E0 — Scaffold

> [!IMPORTANT]
> **Yêu cầu tiên quyết:** Phải xong trước mọi thứ khác. Không có ngoại lệ.

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `E0-T1` | Khởi tạo repo, yarn Berry, Next.js, TS strict | [Tech §1](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) | 2 | — | `yarn dev` chạy, `tsc --noEmit` xanh, `.nvmrc` ghim Node 24 | `package.json`, `tsconfig.json`, `.nvmrc` |
| `E0-T2` | Dựng khung thư mục và ESLint chặn luật tầng | [Tech §2.1, §2.2](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) | 2 | `E0-T1` | Import từ `domain/` sang `application/` bị ESLint chặn | `eslint.config.mjs`, `src/features/*/` |
| `E0-T3` | Husky, lint-staged, Prettier, commitlint | [Tech §8.1](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) | 1.5 | `E0-T1` | Commit sai Conventional Commits bị chặn | `.husky/`, `commitlint.config.js` |
| `E0-T4` | jscpd, knip, gộp `yarn verify` | [Tech §8.1](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) | 0.5 | `E0-T3` | `yarn verify` chạy đủ 6 công cụ | `package.json`, `.jscpd.json`, `knip.json` |
| `E0-T5` | Vitest và test mẫu ở `domain/` | [Tech §8.2](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) | 1 | `E0-T2` | `yarn test` xanh, coverage in ra được | `vitest.config.ts` |
| `E0-T6` | Neon project, Drizzle, migration đầu tiên, 3 DB branch | [Tech §6.1, §6.2](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) | 2 | `E0-T1` | `yarn db:migrate` tạo được bảng thật trên branch `dev` | `drizzle.config.ts`, `src/shared/db/` |
| `E0-T7` | GitHub Actions và Vercel, deploy trang trắng | [Tech §8.1](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) | 1 | `E0-T4`, `E0-T6` | CI xanh, preview URL mở được trên điện thoại — **Cột mốc M1** | `.github/workflows/ci.yml` |

> [!WARNING]
> **Scope Checkpoint sau E0:** Nếu E0 vượt 15 giờ, nguyên nhân gần như luôn là cấu hình dựng lại từ đầu thay vì chép từ starter kit. Dừng và chép từ starter template.

---

# 3. E1 — Walking skeleton

Một luồng mỏng nhất chạy suốt: `UI` → `application` → `domain` → `infrastructure` → `DB` → quay lại `UI`. Không đẹp, không đủ tính năng, nhưng chạy thật và deploy được.

> [!NOTE]
> Cố ý bỏ qua ở epic này: Link mời, chuẩn hoá tên món, System Tag, revalidate lúc Start, cooldown, rule engine.

### S1 — Đăng nhập

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `E1-T1` | Auth.js Google, bảng `users` | [SPEC-001](what-we-gonna-eat-today_sdd_v1.3.md), `TC-001→003` | 3 | `E0-T7` | Đăng nhập được trên preview; `TC-001→003` pass | `src/features/auth/**` |

### S2 — Group tối thiểu

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `E1-T2` | Schema `groups`, `group_members`, use case tạo Group | [SPEC-002](what-we-gonna-eat-today_sdd_v1.3.md), `TC-008→010` | 2 | `E1-T1` | Tạo Group được, người tạo là Admin; `TC-008→010` pass | `src/features/group/**` |
| `E1-T3` | Authorization guard | [SPEC-019](what-we-gonna-eat-today_sdd_v1.3.md), `TC-006`, `TC-007` | 1 | `E1-T2` | Gọi thao tác Group khi không phải Member trả `ERR_NOT_GROUP_MEMBER` | `src/features/group/application/assert-group-access.ts` |
| `E1-T4` | Decision Date theo timezone Group | [SPEC-018](what-we-gonna-eat-today_sdd_v1.3.md), `TC-004`, `TC-005` | 1 | `E1-T2` | Hàm thuần, nhận `now` làm tham số, không mock `Date`; `TC-004`, `TC-005` pass | `src/features/session/domain/decision-date.ts` |

### S3 — Dish thô

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `E1-T5` | Schema `global_dishes`, `group_dishes`, thêm món không chuẩn hoá | [SPEC-005](what-we-gonna-eat-today_sdd_v1.3.md) rút gọn | 2 | `E1-T2` | Thêm được món và thấy trong danh sách | `src/features/dish/**` |

### S4 — Session tối thiểu

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `E1-T6` | Schema `selection_sessions`, `participants`, partial unique index | [SPEC-007](what-we-gonna-eat-today_sdd_v1.3.md), `BR-025` | 2 | `E1-T4` | Migration tạo được index một phần; kiểm tra bằng `\d+` trong psql | `src/shared/db/schema.ts` |
| `E1-T7` | Tạo và Start Session, bắt lỗi unique violation | [SPEC-007](what-we-gonna-eat-today_sdd_v1.3.md), `TC-026→029`, `TC-107` | 2 | `E1-T6` | Hai Start đồng thời: đúng một thành công — **`TC-107` phải chạy 2 transaction song song thật** | `src/features/session/**` |

### S5 — Deck và swipe thô

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `E1-T8` | Deck liệt kê không ranking, phân trang | [SPEC-010](what-we-gonna-eat-today_sdd_v1.3.md) rút gọn, [SPEC-011](what-we-gonna-eat-today_sdd_v1.3.md) | 2 | `E1-T5`, `E1-T7` | Mở phiên thấy danh sách món, cuộn hết được | `src/features/selection/**` |
| `E1-T9` | Route Handler ghi Interaction, optimistic UI | [SPEC-012](what-we-gonna-eat-today_sdd_v1.3.md), `TC-048→053` | 3 | `E1-T8` | Vuốt 10 món liên tiếp không bị chặn xếp hàng; `TC-048→053` pass | `src/app/api/sessions/[id]/interactions/route.ts` |

### S6 — Chốt bữa thô

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `E1-T10` | Chọn món và finalize, chưa có rule | [SPEC-015](what-we-gonna-eat-today_sdd_v1.3.md), [SPEC-016](what-we-gonna-eat-today_sdd_v1.3.md) rút gọn | 2 | `E1-T9` | Session chuyển `FINALIZED`, không reopen được | `src/features/meal/**` |
| `E1-T11` | Sinh Default Eating History trong cùng transaction | [SPEC-017](what-we-gonna-eat-today_sdd_v1.3.md), `TC-076→078`, `TC-109` | 2 | `E1-T10` | `TC-109` pass: `INSERT` thất bại giữa chừng thì Session **không** `FINALIZED` | `src/features/history/**` |

### S7 — Đo kiểm thực tế

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `E1-T12` | Deploy production, đo cold start trên 4G | `R-01`, `MS-05` | 2 | `E1-T11` | Có con số thật ghi vào Setup Guide; chạy sau ≥10 phút idle — **Cột mốc M2** | — |

> [!CAUTION]
> **Scope Checkpoint sau E1 (Quan trọng nhất):**
>
> - Nếu quá 35 giờ mà chưa xong E1 → Ước lượng toàn bộ phần còn lại cũng sai theo cùng tỉ lệ. Cắt theo [Plan & Scope §7](what-we-gonna-eat-today_plan-and-scope_v1.0.md).
> - Cold start đo được vượt 2 giây → NFR-01 không cứu được bằng tối ưu frontend. Quyết định lại: nới ngưỡng, hoặc đổi cơ sở dữ liệu.

---

# 4. E2 — Group và Dish hoàn chỉnh

### S1 — Link mời & Tham gia nhóm (Đã xong)

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `[x] E2-T1` | Tạo link mời, lưu hash, hạn 7 ngày | [SPEC-003](what-we-gonna-eat-today_sdd_v1.3.md), `TC-011`, `TC-012` | 2 | `E1-T3` | DB chỉ chứa hash, không chứa token thô | `src/features/group/**` |
| `[x] E2-T2` | Tham gia bằng link, transaction, trường hợp âm | [SPEC-004](what-we-gonna-eat-today_sdd_v1.3.md), `TC-013→016`, `TC-112` | 2 | `E2-T1` | `TC-015` pass: Member cũ dùng token thì token **vẫn dùng được** cho người khác | `src/features/group/application/join-by-invite.ts` |

### S2 — Chuẩn hoá tên món & Phát hiện trùng lặp (Đã xong)

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `[x] E2-T3` | Chuẩn hoá tên món bỏ dấu, hàm thuần | [SPEC-005](what-we-gonna-eat-today_sdd_v1.3.md), `TC-098` | 2 | — | `Ca kho` và `Cá kho` cùng `normalized_name`; test dùng tiếng Việt có dấu thật | `src/features/dish/domain/normalize-name.ts` |
| `[x] E2-T4` | Phát hiện trùng, `forceCreate`, khôi phục Dish Inactive | [SPEC-005](what-we-gonna-eat-today_sdd_v1.3.md), `TC-017→021`, `TC-097→099` | 3 | `E2-T3` | Thêm lại Dish Inactive chuyển `ACTIVE`, không tạo Global Dish mới | `src/features/dish/application/**` |

### S3 — System Tag (Đã xong)

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `[x] E2-T5` | Gán System Tag, ghi đè toàn bộ, cách ly theo Group | [SPEC-006](what-we-gonna-eat-today_sdd_v1.3.md), `TC-021→025`, `TC-100`, `TC-101` | 3 | `E1-T5` | Đổi tag ở Group A không ảnh hưởng Group B | `src/features/dish/**` |

### S4 — UI Danh mục món & Phát hiện trùng lặp (Đã xong)

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `[x] E2-T6` | Màn hình danh mục món | `S-05`, `S-06` | 2 | `E2-T4` | Thêm, sửa tag, tìm kiếm được trên điện thoại | `src/features/dish/presentation/**` |
| `[x] E2-T7` | Trạng thái phát hiện trùng trên UI | `S-06` | 2 | `E2-T6` | Nút "Dùng món này" **nổi bật hơn** "vẫn tạo mới" | `src/features/dish/presentation/duplicate-sheet.tsx` |

---

# 5. E3 — Phiên và người tham gia

### S1 — Bắt đầu phiên (Đã xong)

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `[x] E3-T1` | Revalidate 5 bước lúc Start | [SPEC-008](what-we-gonna-eat-today_sdd_v1.3.md), `TC-030→035` | 3 | `E1-T7` | Dừng ở lỗi đầu tiên, trả đúng mã lỗi tương ứng từng bước | `src/features/session/application/start-session.ts` |
| `[x] E3-T2` | Hiện Participant không hợp lệ ngay tại hàng | `S-08`, `TC-031` | 1 | `E3-T1` | Thấy tên người cụ thể, không phải thông báo chung | `src/features/session/presentation/**` |

### S2 — Thêm Participant (Đã xong)

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `[x] E3-T3` | Thêm Participant khi Draft | [SPEC-009](what-we-gonna-eat-today_sdd_v1.3.md), `TC-036`, `TC-037` | 1.5 | `E3-T1` | Participant mới có 0 Interaction | `src/features/session/application/add-participant.ts` |
| `[x] E3-T4` | Thêm Participant khi Active | [SPEC-009](what-we-gonna-eat-today_sdd_v1.3.md), `TC-038`, `TC-039` | 1.5 | `E3-T3` | `TC-038` pass: Thêm trùng trả `ERR_PARTICIPANT_EXISTS` | Như trên |

### S3 — Tiến trình & Giao diện (Đã xong)

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `[x] E3-T5` | Completed và mở lại | [SPEC-013](what-we-gonna-eat-today_sdd_v1.3.md), `TC-054→057` | 3 | `E1-T9` | `TC-055` pass: Participant `COMPLETED` **vẫn vuốt được tiếp** | `src/features/session/**` |
| `[x] E3-T6` | Màn hình phiên cho Creator | `S-04`, `S-08` | 4 | `E3-T5` | Thấy ai xong ai chưa, vào phiên được — **Cột mốc M3** | `src/features/session/presentation/**` |

---

# 6. E4 — Deck và Ranking

> [!NOTE]
> Giai đoạn quyết định sản phẩm có khác một danh sách món ăn thông thường hay không.

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `[x] E4-T1` | `computeRecencyPenalty`, hàm thuần | [SPEC-020](what-we-gonna-eat-today_sdd_v1.3.md), `TC-079→084` | 3 | `E1-T11` | Không mock gì, nhận `referenceDate` làm tham số; `TC-084` pass | `src/features/history/domain/recency.ts` |
| `[x] E4-T2` | `computePersonalScore` & `buildDeck` kèm tie-break | [SPEC-010](what-we-gonna-eat-today_sdd_v1.3.md), `TC-040→044` | 3 | `E4-T1` | `RankingConfig` nằm ở **một** module hằng số duy nhất | `src/features/selection/domain/ranking.ts` |
| `[x] E4-T3` | Lưu `session_decks`, thứ tự bất biến trong phiên | [SPEC-010](what-we-gonna-eat-today_sdd_v1.3.md), `TC-041` | 2 | `E4-T2` | Mở lại deck lần hai thứ tự giống hệt | `src/features/selection/infrastructure/**` |
| `[x] E4-T4` | Phân trang và lọc theo `group_dishes.state` | [SPEC-011](what-we-gonna-eat-today_sdd_v1.3.md), `TC-045→047`, `TC-102→104`, `TC-108` | 3 | `E4-T3` | `TC-108` pass: Dish bị gỡ sau khi deck materialize không xuất hiện | `src/features/selection/application/**` |
| `[x] E4-T5` | Upsert Interaction chống ghi đè sai thứ tự | [SPEC-012](what-we-gonna-eat-today_sdd_v1.3.md), `TC-106` | 2.5 | `E1-T9` | `TC-106` pass: Record đến muộn có timestamp cũ hơn bị bỏ qua | `src/features/selection/application/record-interaction.ts` |
| `[x] E4-T6` | Retry khi mất mạng, không chặn thao tác | `NFR-05`, `S-09` | 1.5 | `E4-T5` | Tắt mạng vẫn vuốt tiếp được, có dải thông báo ở đỉnh | `src/features/selection/presentation/**` |
| `[x] E4-T7` | Thẻ món và cử chỉ vuốt | `S-09`, [Design §4](designs/README.md) | 3 | `E4-T4` | Nghiêng tối đa 8°, lớp phủ theo hướng, **vuốt trái không dùng màu đỏ** | `src/features/selection/presentation/components/dish-swipe-card.tsx` |
| `[x] E4-T8` | Nút vuốt và khả năng tiếp cận | [Design §7](designs/README.md), `NFR-03` | 2 | `E4-T7` | Mọi cử chỉ có nút tương đương; nhãn screen reader đầy đủ; vùng chạm ≥44px | `src/features/selection/presentation/components/swipe-controls.tsx` |
| `[x] E4-T9` | Chỉ báo tiến độ và lối vào Completed | `S-09` | 1 | `E4-T8` | Hết deck hiện gợi ý "Tôi chọn xong" — **Cột mốc M4** | `src/features/selection/presentation/components/deck-screen.tsx` |

---

# 7. E5 — Rule và chốt bữa

> [!NOTE]
> **Bốn slice, bốn Implementation Guide** — đọc guide tương ứng trước khi gõ dòng code đầu tiên:
>
> | Slice | Subtask | Giờ | Guide |
> | :---: | :--- | :---: | :--- |
> | `S1` | `E5-T1`, `E5-T1b`, `E5-T2` | 6 | [E5-S1 — Quy định mâm cơm của nhóm](plans/E5/what-we-gonna-eat-today_e5-s1-implementation-guide_v0_1.md) |
> | `S2` | `E5-T3`, `E5-T4` | 5 | [E5-S2 — Rule engine và Snapshot lúc Start](plans/E5/what-we-gonna-eat-today_e5-s2-implementation-guide_v0_1.md) |
> | `S3` | `E5-T5`, `E5-T6` | 6.5 | [E5-S3 — Finalize đầy đủ và Session Score](plans/E5/what-we-gonna-eat-today_e5-s3-implementation-guide_v0_1.md) |
> | `S4` | `E5-T7`, `E5-T8`, `E5-T9` | 5.5 | [E5-S4 — Màn tổng hợp và chốt bữa](plans/E5/what-we-gonna-eat-today_e5-s4-implementation-guide_v0_1.md) |

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `[x] E5-T1` | Schema `group_rules` và CRUD | [SPEC-021](what-we-gonna-eat-today_sdd_v1.3.md), `TC-085`, `TC-088` | 2 | `E2-T5` | Lưu danh sách rỗng thì Group không còn rule nào | `src/features/rule/**` |
| `[x] E5-T1b` | Màn hình S-07 "Quy định bữa ăn" | `S-07`, [Design §4](designs/README.md) | 2 | `E5-T1` | Admin đặt được rule trên điện thoại; Member chỉ xem, không thấy nút sửa | `src/features/rule/presentation/**`, `src/app/groups/[groupId]/rules/**` |
| `[x] E5-T2` | Invariant của rule ép ở tầng DB | [SPEC-021](what-we-gonna-eat-today_sdd_v1.3.md), `TC-086`, `TC-087`, `TC-089` | 2 | `E5-T1` | `unique(group_id, rule_type, system_tag)` và `check(minimum_count >= 1)` là ràng buộc thật trong DB | `src/features/rule/infrastructure/schema.ts` |
| `[x] E5-T3` | `evaluateRequired`, independent tag counting | [SPEC-016](what-we-gonna-eat-today_sdd_v1.3.md), `TC-072`, `TC-073`, `TC-110` | 3 | `E5-T1` | **Viết `TC-073` trước khi viết hàm:** Dish mang cả `MAIN` và `SOUP` thoả cả hai rule | `src/features/rule/domain/evaluate.ts` |
| `[x] E5-T4` | Snapshot Session Rule trong transaction Start | [SPEC-022](what-we-gonna-eat-today_sdd_v1.3.md), `TC-091→094` | 2 | `E5-T2`, `E3-T1` | `TC-035` pass: Start thất bại thì không có Session Rule nào được tạo | `src/features/rule/infrastructure/drizzle-rule-repository.ts` |
| `[x] E5-T5` | Finalize revalidate đầy đủ trong transaction | [SPEC-016](what-we-gonna-eat-today_sdd_v1.3.md), `TC-067→075` | 4 | `E5-T3`, `E5-T4`, `E1-T11` | `TC-074` và `TC-075` pass: Rule theo snapshot, System Tag theo hiện tại | `src/features/meal/application/finalize-session.ts` |
| `[x] E5-T6` | `computeSessionScore` chuẩn hoá theo $T$ | [SPEC-014](what-we-gonna-eat-today_sdd_v1.3.md), `TC-058→062`, `TC-111` | 2.5 | `E4-T5` | `TC-111` pass: $T = 1$ không chia cho 0 | `src/features/selection/domain/ranking.ts` |
| `[x] E5-T7` | Màn hình tổng hợp kèm số đếm thô | `S-10`, [Design §4](designs/README.md) | 2.5 | `E5-T6` | Dùng `tabular-nums`; số 0 hiện mờ chứ không ẩn | `src/features/meal/presentation/**` (đổi khỏi `selection` — [DEC-046](what-we-gonna-eat-today_decision-log_v3.9.md)) |
| `[x] E5-T8` | Khay chọn món và dựng Final Meal | [SPEC-015](what-we-gonna-eat-today_sdd_v1.3.md), `S-10`, `TC-063→066` | 2 | `E5-T7` | Chọn được cả món trong mục "Chưa ai chọn" | `src/features/meal/presentation/**` |
| `[x] E5-T9` | Hiện Required Rule chưa đạt ngay trên nút chốt | `S-10`, `TC-072` | 1 | `E5-T5`, `E5-T8` | Ghi rõ `Còn thiếu: 1 món Canh`, không dùng modal — **Cột mốc M5** | Như trên |

---

# 8. E6 — Hoàn thiện

> [!NOTE]
> **Bốn slice, bốn Implementation Guide** — đọc guide tương ứng trước khi gõ dòng code đầu tiên:
>
> | Slice | Subtask | Giờ | Guide |
> | :---: | :--- | :---: | :--- |
> | `S1` | `E6-T7`, `E6-T8` | 5.5 | [E6-S1 — Bữa đã chốt và lịch sử ăn](plans/E6/what-we-gonna-eat-today_e6-s1-implementation-guide_v0_1.md) |
> | `S2` | `E6-T2` | 2 | [E6-S2 — Bảng dịch mã lỗi và lỗi tại chỗ](plans/E6/what-we-gonna-eat-today_e6-s2-implementation-guide_v0_1.md) |
> | `S3` | `E6-T1`, `E6-T4` | 6 | [E6-S3 — Trạng thái rỗng và chặn mở phiên](plans/E6/what-we-gonna-eat-today_e6-s3-implementation-guide_v0_1.md) |
> | `S4` | `E6-T5`, `E6-T6`, `E6-T3` | 7 | [E6-S4 — Cổng chất lượng: Coverage, a11y, NFR](plans/E6/what-we-gonna-eat-today_e6-s4-implementation-guide_v0_1.md) |
>
> **Thứ tự slice lệch bảng phụ thuộc dưới đây có chủ ý:** `E6-T7`/`E6-T8` đi trước `E6-T1` và
> `E6-T6` vì cả hai việc sau là thao tác **quét toàn bộ màn hình** — quét khi tập màn hình chưa
> đủ thì phải quét lại lần hai, mà `E6-T6` chính là mốc M6. Xem [DEC-047](what-we-gonna-eat-today_decision-log_v3.9.md).

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `[x] E6-T7` | Màn S-11 "Bữa ăn hôm nay" + trạng thái "đã chốt" của S-04 | `S-11`, `S-04`, `MS-01` | 3 | `E5-T9` | Chốt xong quay về Group Hub thấy ngay mâm cơm | `src/features/meal/**` |
| `[x] E6-T8` | Màn S-12 "Lịch sử ăn" | `S-12`, `MS-01` | 2.5 | `E6-T7` | 30 ngày gần đây, nhóm theo ngày | `src/features/history/**` |
| `[x] E6-T1` | Toàn bộ trạng thái rỗng (Empty States) | [Design Criteria §4](what-we-gonna-eat-today_design-criteria_v1.0.md) | 4 | `E5-T9` | Mỗi trạng thái rỗng nêu **việc cần làm tiếp**, không để trống trơn | Mọi `presentation/` |
| `[x] E6-T2` | Bảng dịch mã lỗi và lỗi tại chỗ | [SDD §2.5](what-we-gonna-eat-today_sdd_v1.3.md), [Design Criteria §5](what-we-gonna-eat-today_design-criteria_v1.0.md) | 2 | `E6-T1` | Một bảng tra duy nhất; không popup modal cho lỗi form | `src/shared/errors/messages.ts` |
| `[x] E6-T3` | Đo NFR-01 đến NFR-05 bằng số thật | [Tech §9](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md), `MS-01→05` | 3 | `E6-T2` | Có con số định lượng cho từng NFR | — |
| `[x] E6-T4` | Chặn mở phiên khi nhóm chưa có món | `S-04`, [Design Criteria §4](what-we-gonna-eat-today_design-criteria_v1.0.md) | 2 | `E6-T1` | Nhóm mới thấy "Thêm món" thay vì "Mở phiên" — **và server cũng từ chối** | `src/features/session/**`, `src/features/group/presentation/**` |
| `[x] E6-T5` | Rà coverage `domain/` và `application/` đạt 80% | [Tech §8.2](what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) | 3 | `E6-T3` | CI ép ngưỡng kiểm thử, không chỉ báo cáo | `vitest.config.mts` |
| `[x] E6-T6` | Rà khả năng tiếp cận: Tương phản, focus, nhãn | [Design Criteria §8, §10](what-we-gonna-eat-today_design-criteria_v1.0.md) | 1 | `E6-T4` | Không thông tin nào chỉ truyền tải bằng màu sắc — **Cột mốc M6** | Mọi `presentation/` |

---

# 8b. M1 — Bảo trì sau v1.0: Danh mục món

> [!NOTE]
> Slice này KHÔNG thuộc v1.0 (đã phát hành, mốc M6) và cũng không thuộc v1.1. Nó phát sinh
> từ ba nghi vấn khi dùng thật, trong đó **hai nghi vấn có tiền đề sai** nhưng vẫn lộ ra
> lỗi thật:
>
> - *"Check trùng chỉ trong nhóm"* — **sai**, `findGlobalCandidatesByNormalizedName` vốn đã
>   ở phạm vi toàn cục. Nhưng nó chỉ khớp tên **chính xác** và chỉ chạy **sau khi bấm lưu**,
>   nên trên thực tế không ai tìm thấy món của catalog chung. Đây là khoảng trống thật.
> - *"Chưa có cách thêm món vào global"* — **sai**, mọi món mới đều tạo một Global Dish kèm
>   provenance từ E2. Chỉ là không có lối vào nhìn thấy được.
> - *"Bún bị tag là cơm"* — **không phải lỗi phân loại**: `BR-003` ghi rõ `STAPLE` =
>   *"Món tinh bột / Cơm, bún"*. Lỗi nằm ở **nhãn hiển thị** trái với chính `BR-003`.

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `[x] M1-T1` | Sửa nhãn `STAPLE` và hợp đồng dấu nối | [DEC-052](what-we-gonna-eat-today_decision-log_v3.9.md), `BR-003` | 1 | Nhãn hiện "Cơm · Bún · Phở"; xoá bảng nhãn trùng ở `finalize-meal-screen`; có test canh bất biến dấu nối | `src/shared/ui/system-tag-label.ts` |
| `[x] M1-T2` | Dùng lại món phải ghi tag đã chọn | [DEC-053](what-we-gonna-eat-today_decision-log_v3.9.md) | 1 | Chọn nhãn rồi "Dùng món này" → món vào pool **kèm nhãn**, không rơi vào "Chưa phân nhãn" | `src/features/dish/application/add-existing-dish-to-group.ts` |
| `[x] M1-T3` | Sheet thêm món cho chọn nhiều nhãn | [DEC-054](what-we-gonna-eat-today_decision-log_v3.9.md), `BR-012` | 1.5 | "Bún chả" gán được `STAPLE`+`MAIN` ngay lúc tạo; hai sheet dùng chung `SystemTagField` | `src/features/dish/presentation/components/**` |
| `[x] M1-T4` | Sửa 2 lỗi phân loại của `inferSystemTag` | [DEC-052](what-we-gonna-eat-today_decision-log_v3.9.md) | 1.5 | "Cà pháo"→`SIDE`, "Canh gà"→`SOUP`; hàm chuyển sang `domain/` để nằm trong phạm vi coverage; có script `retag:dishes` | `src/features/dish/domain/infer-system-tag.ts`, `scripts/retag-dishes.ts` |
| `[x] M1-T5` | Gợi ý món từ catalog chung khi đang gõ | [SPEC-023](what-we-gonna-eat-today_sdd_v1.3.md), [DEC-055](what-we-gonna-eat-today_decision-log_v3.9.md) | 4 | Nhóm 0 món gõ "bún" thấy ngay gợi ý từ catalog đã seed; chọn một gợi ý không tạo Global Dish mới | `src/app/api/groups/[groupId]/dishes/search/route.ts` |

> [!IMPORTANT]
> `M1-T5` là khoản trả trước cho `F29` ("UI phát hiện trùng", v1.1/E10) — nhưng KHÔNG thay
> thế nó: `F29` là polish panel trùng lặp *phản ứng*, còn đây là ô gợi ý *chủ động*.

---

# 9. Đường găng (Critical Path)

Chuỗi subtask dài nhất quyết định ngày hoàn thành toàn bộ v1.0:

```text
E0-T1 ──► E0-T2 ──► E0-T6 ──► E0-T7                 [ 7 giờ ]
  └──► E1-T1 ──► E1-T2 ──► E1-T4 ──► E1-T6
         └──► E1-T7 ──► E1-T8 ──► E1-T9
                └──► E1-T10 ──► E1-T11 ──► E1-T12   [ 21 giờ ]
                       └──► E4-T1 ──► E4-T2 ──► E4-T3 ──► E4-T4 [ 11 giờ ]
                              └──► E5-T3 ──► E5-T4 ──► E5-T5     [ 9 giờ ]
                                     └──► E6-T3                  [ 3 giờ ]
──────────────────────────────────────────────────────────────────────────
                                                  TỔNG ĐƯỜNG GĂNG: 51 giờ
```

> [!NOTE]
> **51 trong tổng số 121 giờ nằm trên đường găng.** 70 giờ còn lại có thể đảo thứ tự hoặc cắt giảm mà không đẩy lùi ngày release — đây chính là danh sách ứng viên ưu tiên khi cần cắt giảm scope.
> **E2 và E3 nằm ngoài đường găng:** Nếu bị nghẽn thời gian, có thể hoãn chúng và đi thẳng từ E1 sang E4.

---

# 10. Lịch theo quỹ giờ (Workload Scenarios)

| Quỹ thời gian / tuần | Thời gian tới M2 (Skeleton) | Tới M4 (Deck/Ranking) | Tới M6 (Hoàn thiện v1.0) |
| :---: | :---: | :---: | :---: |
| **6 giờ / tuần** | 6 tuần | 17 tuần | **26 tuần ≈ 6 tháng** |
| **10 giờ / tuần** | 4 tuần | 10 tuần | **16 tuần ≈ 4 tháng** |
| **15 giờ / tuần** | 2.5 tuần | 7 tuần | **11 tuần ≈ 2.5 tháng** |

*(Tính toán trên 157 giờ đã bao gồm 30% dự phòng)*

---

# 11. Bảng rủi ro & Phương án xử lý

| Rủi ro kỹ thuật / quy trình | Dấu hiệu nhận biết sớm | Phương án xử lý (Mitigation) |
| :--- | :--- | :--- |
| **Cold start Neon vượt NFR-01** | `E1-T12` đo được > 2 giây | Render shell tĩnh trước, stream dữ liệu sau. Nếu vẫn vượt, nới NFR-01 lên 4 giây thay vì đổi database |
| **Ước lượng sai lệch toàn cục** | `E0` vượt 15h, hoặc `E1` vượt 35h | Cắt giảm scope theo §10 ngay lập tức, không đợi tới E4 |
| **Rò rỉ kiến trúc qua ranh giới tầng** | Xuất hiện ý định `import` từ `domain/` sang `infrastructure/` | ESLint đã chặn ở `E0-T2`. Không tắt rule mà tái cấu trúc code đúng tầng |
| **Independent tag counting sai logic** | Viết `evaluateRequired` trước khi có `TC-073` | Bắt buộc viết test case `TC-073` trước theo TDD |
| **Dữ liệu Eating History sai lệch do thiếu `Cannot Eat`** | Người nhà than phiền liên tục về món không ăn được | Đã nằm trong dự tính (`R-05`). Ưu tiên tính năng `F15` lên đầu phiên bản v1.1 |
| **Mất động lực giữa chừng** | Hai tuần liên tiếp không có subtask nào hoàn thành | Rút ngắn khoảng cách giữa các milestone, tập trung đưa bản demo chạy thật đến tay người thân |

---

# 12. Điểm kiểm tra Scope (Checkpoints)

Sau mỗi Epic, hãy tự đánh giá dựa trên 3 câu hỏi:

1. **Tổng thời gian thực tế so với ước lượng lệch bao nhiêu %?** Nếu vượt quá 40%, áp dụng cùng tỉ lệ đó cho phần còn lại và tái cân đối scope ngay.
2. **Có tính năng nào ở các Epic sau mà tuần vừa rồi tôi hoàn toàn không nghĩ tới không?** Nếu có, đó là ứng viên hàng đầu để loại bỏ.
3. **Nếu phải dừng dự án ngay ngày mai, phần đã làm có dùng được không?** Kế hoạch này được cấu trúc để từ sau E1 trở đi, câu trả lời luôn là **CÓ**.

---

# 13. Sau v1.0 — Lộ trình v1.1 và v1.2

### 13.1 v1.1 — 11 tính năng (Mục tiêu: Khẩu vị cá nhân & Deck có điểm dừng)

> [!IMPORTANT]
> Bảng dưới đây **thay thế** lộ trình 12 tính năng của `v2.0`. Chi tiết subtask ở [§16](#16-v11--chi-tiết-thi-công); lý do re-scope ở [DEC-056](what-we-gonna-eat-today_decision-log_v3.9.md).

| Epic | Nội dung | Danh sách tính năng | Ước lượng |
| :--- | :--- | :--- | :---: |
| **M2** | Tiền đề — vá cross-link tài liệu | — | 2h |
| **E7** | Ràng buộc và sở thích cá nhân | `F15` Cannot Eat, `F16` Like/Dislike | 19.25h |
| **E8** | Deck ngắn và có nhịp | **`F49` Trần 30 thẻ**, `F18` Explore Lane 20%, `F19` Deck ổn định khi tính lại | 19h |
| **E9** | Chế độ vuốt theo chặng | **`F50` Guided Course Mode** | 17h |
| **E10** | Chốt bữa có hướng dẫn mềm | `F22` Preferred Rule, `F23` Target Dish Count, `F24` Lưu vết cảnh báo | 16h |
| **E11** | Vận hành tối thiểu | `F26` Phiên hết hạn, `F27` Gỡ Dish | 8h |
| | | **Tổng v1.1** | **81.25h** |

**Ba thay đổi so với kế hoạch cũ:**

1. **Thêm `F49` và `F50`** — từ phản hồi dùng thật v1.0, không có mã trong `F01`→`F48`.
2. **Hoãn `F25`, `F28`, `F29`** sang v1.2.
3. **Thêm `M2`** — nợ kỹ thuật tài liệu phải trả trước khi viết thêm tài liệu mới.

### 13.2 v1.2 — 16 tính năng (Mục tiêu: Học hành vi & Thích ứng linh hoạt)

> [!NOTE]
> Epic đánh số lại theo [DEC-061](what-we-gonna-eat-today_decision-log_v3.9.md): `E11`→`E12`, `E12`→`E13`, `E13`→`E14`.

| Epic | Nội dung | Danh sách tính năng | Ước lượng |
| :--- | :--- | :--- | :---: |
| **E12** | Chef Role & Khả năng nấu | `F33` Chef Role & Chef Mode, `F34` Khả năng nấu, `F42` Gán/gỡ Chef Role | 23h |
| **E13** | Học sở thích tự động | `F30` Implicit Preference, `F31` Blacklist, `F32` Whitelist, `F39` Reset | 21h |
| **E14** | Linh hoạt, bổ trợ và sửa dữ liệu | `F35` Override Session Rule, `F36` Nguồn mua, `F37` Descriptive Tag, `F38` Phản hồi trực tiếp, `F40` Sửa Final Meal, `F41` Huỷ phiên, **`F25` Gỡ Participant**, **`F28` Sửa lịch sử ăn**, **`F29` UI phát hiện trùng** | 45h |
| | | **Tổng v1.2** | **89h** |

---

# 14. Ngoài phạm vi (Out of Scope)

| Tính năng | Lý do loại bỏ khỏi phạm vi cốt lõi |
| :--- | :--- |
| `F43` Một User thuộc nhiều Group | Hoãn theo quyết định [DEC-004](what-we-gonna-eat-today_decision-log_v3.9.md). Schema đã sẵn sàng `group_id` |
| `F44` Giao diện System Admin | Quy mô nhỏ (< 10 người dùng), thao tác trực tiếp qua DB |
| `F45` Logical Merge món trùng phức tạp | Tác động lớn tới quan hệ pool, tương tác, phiên chạy. Chi phí vượt quá lợi ích ở giai đoạn đầu |
| `F46` Khôi phục metadata khi thêm lại Dish | Trạng thái phức tạp, giá trị mang lại thấp |
| `F47` Deadline tuỳ chỉnh cho phiên | Kết thúc ngày theo timezone của Group là đủ |
| `F48` Sửa lịch sử ăn của ngày cũ | Chỉ hỗ trợ điều chỉnh trong ngày hiện tại |

> [!CAUTION]
> **Nhắc lại các ranh giới bất biến:**
>
> - **Quản lý dị ứng y tế:** `Cannot Eat` là khai báo cá nhân, **không phải chứng nhận an toàn y tế**.
> - **Tối ưu dinh dưỡng:** Không thuộc phạm vi hệ thống.
> - **Tự động quyết định thay con người:** Creator luôn là người nắm quyền chốt thực đơn cuối cùng.

---

# 15. Lịch sử thay đổi (Change History)

| Version | Ngày | Phần tác động | Nội dung thay đổi | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- | :--- |
| `2.1` | 2026-08-26 | §1, §13, §16.2 | Chốt kế hoạch thi công E7: chia 3 slice kèm 3 Implementation Guide; bổ sung `E7-T0` (vá 64 link gãy sau khi guide E6 chuyển thư mục); ghi rõ thứ tự `T4→T3` ở S2 và `T7→T6→T5` ở S3 | E7-S1/S2/S3 Guide |
| `2.1` | 2026-08-26 | §1, §13, §16 | Mở phạm vi v1.1: re-scope theo phản hồi dùng thật (thêm `F49` trần 30 thẻ, `F50` vuốt theo chặng; hoãn `F25`/`F28`/`F29`); bổ sung §16 với 29 subtask chi tiết `M2`→`E11`; đánh số lại epic v1.2 | Quyết định DEC-056 đến DEC-061 |
| `2.0` | 2026-08-25 | §8b | Bổ sung slice bảo trì sau v1.0 (`M1-T1`→`M1-T5`): sửa nhãn `STAPLE`, dùng lại món giữ tag, sheet thêm đa nhãn, sửa 2 lỗi `inferSystemTag`, gợi ý catalog chung (SPEC-023) | Quyết định DEC-052 đến DEC-055 |
| `1.9` | 2026-08-21 | §1, §8 | Hoàn tất thi công Slice S4 của Epic E6 (E6-T5, E6-T6, E6-T3: Coverage, a11y, NFR) — Hoàn tất toàn bộ Epic E6, Đạt cột mốc M6 và sẵn sàng phát hành v1.0 | Quyết định DEC-051 |
| `1.8` | 2026-08-21 | §1, §8 | Hoàn tất thi công Slice S3 của Epic E6 (E6-T1, E6-T4: Trạng thái rỗng và chặn mở phiên khi nhóm chưa có món) | Quyết định DEC-050 |
| `1.7` | 2026-08-20 | §1, §7 | Hoàn tất thi công toàn bộ Epic E5 (S1→S4, E5-T1 đến E5-T9: Rule engine, Snapshot lúc Start, Màn tổng hợp S-10 & Chốt bữa) — Đạt cột mốc M5 | Quyết định DEC-040 đến DEC-046 |
| `1.7` | 2026-08-21 | §1, §8 | Chốt kế hoạch thi công E6: chia 4 slice kèm 4 Implementation Guide; bổ sung `E6-T7` (màn S-11 + trạng thái "đã chốt" của S-04) và `E6-T8` (màn S-12 Lịch sử ăn) — không có chúng thì `MS-01` không pass được; sửa 4 tham chiếu Design trỏ sai file sang `design-criteria_v0_1.md` | Quyết định DEC-047 đến DEC-051 |
| `1.6` | 2026-08-20 | §1, §7 | Chốt kế hoạch thi công E5: chia 4 slice kèm 4 Implementation Guide; bổ sung subtask `E5-T1b` (màn hình S-07 Quy định bữa ăn); đổi File tác động của `E5-T7` sang `features/meal`; đồng bộ bảng tiến độ §1 với thực tế E2/E3/E4 đã xong | Quyết định DEC-040 đến DEC-046 |
| `1.5` | 2026-08-20 | §6 | Hoàn tất thi công toàn bộ Epic E4 (S1→S4, E4-T1 đến E4-T9: Deck vuốt & Thuật toán Ranking cá nhân) — Đạt cột mốc M4 | Quyết định DEC-036 đến DEC-039 |
| `1.4` | 2026-08-19 | §5 | Hoàn tất thi công Slice S3 của Epic E3 (E3-T5, E3-T6: Completed & Màn hình Creator) — Đạt cột mốc M3 | Quyết định DEC-035 |
| `1.3` | 2026-08-18 | §4 | Hoàn tất thi công Slice S2 của Epic E2 (E2-T3, E2-T4: Chuẩn hoá tên món & Phát hiện trùng lặp) | Quyết định DEC-029, DEC-030 |
| `1.2` | 2026-08-18 | §4 | Hoàn tất thi công Slice S1 của Epic E2 (E2-T1, E2-T2: Link mời & Tham gia nhóm) | Quyết định DEC-027, DEC-028 |
| `1.1` | 2026-08-18 | §1, §3 | Hoàn tất thi công toàn bộ Epic E1 (S1→S6, E1-T1 đến E1-T12), cập nhật trạng thái các subtasks | Đạt cột mốc M2 (Walking Skeleton) |
| `1.0` | 2026-08-14 | Header & Baseline | Phát hành chính thức baseline R1 | Hoàn tất review toàn bộ 11 tài liệu |
| `0.1` | 2026-08-14 | Toàn bộ | Bản thảo đầu tiên: 7 epic, 56 subtask, đường găng 51h | Khởi tạo kế hoạch thực thi |

---

# 16. v1.1 — Chi tiết thi công

> [!NOTE]
> **Mục tiêu v1.1:** gợi ý đúng người, và deck có điểm dừng.
>
> v1.0 chốt được bữa từ đầu tới cuối, nhưng nó đối xử với mọi người trong nhà như nhau và
> đưa ra một danh sách không có đáy. v1.1 sửa đúng hai chuyện đó. Phạm vi chốt theo
> [DEC-056](what-we-gonna-eat-today_decision-log_v3.9.md); mọi subtask dưới đây tuân thủ cùng
> một khuôn với §3–§8b: một buổi ngồi làm xong một dòng.

**Thứ tự thi công cố định:**

```text
M2 ──► E7 ──► E8 ──► E9 ──► E10 ──► E11
       │       │      │
       │       │      └─ E9 cần trần thẻ của E8 để phân bổ hạn mức theo chặng
       │       └─ E8 cần E7 vì Cannot Eat phải lọc TRƯỚC khi cắt trần
       └─ E7 mở khoá hai số hạng E và X đã nằm sẵn trong RANKING_CONFIG từ E4
```

---

## 16.1 M2 — Vá cross-link tài liệu

> [!NOTE]
> Slice này không tạo giá trị người dùng nào. Nó tồn tại vì đợt bump version ngày 2026-08-26
> làm gãy **357** liên kết nội bộ, và v1.1 sắp sinh thêm 9 tài liệu nữa link dày đặc vào
> đúng những file đó. Trả nợ trước khi vay thêm.

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `[x] M2-T1` | Ghi nhận 14 file đổi tên là rename trong git | — | 0.5 | `git show --stat -M` hiện đủ 14 dòng dạng `{cũ => mới}`; `git log --follow` trên tên mới vẫn thấy lịch sử cũ | — |
| `[x] M2-T2` | Thay 13 tên file cũ trong toàn bộ tài liệu | [DEC-057](what-we-gonna-eat-today_decision-log_v3.9.md) | 1 | Không còn tham chiếu nào tới tên file cũ trong `docs/`, `README.md` | `docs/**`, `README.md` |
| `[x] M2-T3` | Vá đường dẫn trong comment mã nguồn | [DEC-057](what-we-gonna-eat-today_decision-log_v3.9.md) | 0.25 | Không comment nào trong `src/` trỏ tới file tài liệu không tồn tại | `src/features/**`, `src/app/**` |
| `[x] M2-T4` | Cổng kiểm link trong `yarn verify` | [DEC-057](what-we-gonna-eat-today_decision-log_v3.9.md) | 0.25 | `yarn docs:links` xanh; cố tình phá một link thì đỏ và `exit 1` | `scripts/check-doc-links.sh`, `package.json` |

> [!IMPORTANT]
> `M2-T4` lộ thêm **120 link gãy có từ trước** đợt đổi tên — các guide ở `docs/plans/E1..E5/`
> lùi thiếu một cấp, `docs/designs/README.md` thiếu hẳn `../`, một link `file:///Users/...`
> tuyệt đối. Đã sửa trong cùng slice.

---

## 16.2 E7 — Ràng buộc và sở thích cá nhân

**19.25 giờ · `F15`, `F16` · [SPEC-024, SPEC-025](what-we-gonna-eat-today_sdd_v1.3.md) · `BR-034`, `BR-037`, `BR-056`**

Chia ba slice, mỗi slice một Implementation Guide:

| Slice | Subtask | Giờ | Guide |
| :--- | :--- | :---: | :--- |
| **S1 — Nền tảng** | `E7-T1`, `E7-T2` | 5.5 | [e7-s1](plans/E7/what-we-gonna-eat-today_e7-s1-implementation-guide_v0_1.md) |
| **S2 — Luồng dữ liệu** | `E7-T4`, `E7-T3` | 6 | [e7-s2](plans/E7/what-we-gonna-eat-today_e7-s2-implementation-guide_v0_1.md) |
| **S3 — Hiển thị & hệ quả** | `E7-T7`, `E7-T6`, `E7-T5` | 7.5 | [e7-s3](plans/E7/what-we-gonna-eat-today_e7-s3-implementation-guide_v0_1.md) |

> [!NOTE]
> **Thứ tự trong S2 và S3 ngược số thứ tự subtask, có chủ đích.** `T3` cần một use case đã tồn tại để gọi, nên `T4` đi trước. Trong S3, `T7` đi đầu vì nó là subtask vá rủi ro `R-05` — hết thời gian giữa chừng thì thứ đã xong phải là nó chứ không phải một cái nút.

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `[x] E7-T0` | Vá 64 link gãy sau khi guide E6 chuyển vào `docs/plans/E6/` | [DEC-057](what-we-gonna-eat-today_decision-log_v3.9.md) | 0.25 | `yarn docs:links` xanh; `yarn verify` xanh trọn — điều kiện của mọi subtask còn lại | `docs/plans/E6/**`, `docs/what-we-gonna-eat-today_master-plan_v2.1.md` |
| `[x] E7-T1` | Schema ràng buộc & sở thích cá nhân | [SPEC-024](what-we-gonna-eat-today_sdd_v1.3.md), [DEC-060](what-we-gonna-eat-today_decision-log_v3.9.md) | 2.5 | Hai bảng `user_dish_constraints` và `user_dish_preferences` khoá `(user_id, global_dish_id)`; enum `preference_kind`; migration chạy được cả chiều lên | `src/shared/db/schema.ts`, `src/shared/db/migrations/**` |
| `[x] E7-T2` | Domain sở thích và số hạng $E$ | [SPEC-025](what-we-gonna-eat-today_sdd_v1.3.md), `BR-037` | 3 | `computePersonalScore` đọc `wExplicit` đã có sẵn; `LIKE`→$+1$, không đặt→$0$, `DISLIKE`→$-1$; test canh mốc `DISLIKE` KHÔNG lọc món khỏi deck | `src/features/preference/domain/**`, `src/features/selection/domain/ranking.ts` |
| `[x] E7-T3` | Lọc cứng Cannot Eat và xoá tương tác cũ | [SPEC-024](what-we-gonna-eat-today_sdd_v1.3.md), `BR-034` | 3 | Đánh dấu Cannot Eat giữa phiên → món biến khỏi deck VÀ tương tác Swipe cũ bị xoá; có test khẳng định $P$ giảm đúng 1 | `src/features/selection/application/list-deck.ts`, `src/features/preference/application/**` |
| `[x] E7-T4` | Use case + Route Handler cho hai hành động | [SPEC-024](what-we-gonna-eat-today_sdd_v1.3.md), [SPEC-025](what-we-gonna-eat-today_sdd_v1.3.md) | 3 | `setDishConstraint` / `setDishPreference` chạy qua Route Handler (không phải Server Action — cùng lý lẽ `DEC-055`); chặn người không phải chính chủ | `src/features/preference/application/**`, `src/app/api/preferences/**` |
| `[ ] E7-T5` | Giao diện khai báo trên thẻ vuốt và danh mục | [Design Criteria](what-we-gonna-eat-today_design-criteria_v1.0.md), `NFR-03` | 4 | Nút "Tôi không ăn được món này" trên thẻ vuốt; màn danh mục hiện trạng thái Like/Dislike/Cannot Eat mỗi món; vùng chạm ≥ 44px ở nửa dưới màn hình | `src/features/selection/presentation/components/dish-swipe-card.tsx`, `src/features/dish/presentation/components/**` |
| `[ ] E7-T6` | Số hạng $X$ trong Session Ranking | [SPEC-014](what-we-gonna-eat-today_sdd_v1.3.md), `BR-049` | 2.5 | `computeSessionScore` trừ $1.0 \times X$ (trọng số `cCannotEat` đã có sẵn); màn tổng hợp hiện cột $X$ — cột này chỉ xuất hiện từ v1.1, v1.0 cố ý không có | `src/features/selection/domain/ranking.ts`, `src/features/meal/presentation/components/dish-score-row.tsx` |
| `[ ] E7-T7` | Lịch sử ăn mặc định bỏ qua người không ăn được | `BR-056`, [DEC-060](what-we-gonna-eat-today_decision-log_v3.9.md), rủi ro `R-05` | 1 | Chốt bữa có món X mà người B khai Cannot Eat → KHÔNG sinh bản ghi lịch sử ăn cho B; Cooldown của B với món X không đổi | `src/features/history/domain/default-eating-history.ts` |

> [!IMPORTANT]
> **`E7-T7` là lý do thật sự khiến `E7` đứng đầu v1.1.** Không có nó, hệ thống ghi rằng người
> ta đã ăn món họ không ăn được, rồi Cooldown 7 ngày trừ điểm món ấy cho chính họ — hệ thống
> tự bịa ra một dữ kiện rồi tin vào nó. Đây đúng là rủi ro `R-05` mà [§11](#11-bảng-rủi-ro--phương-án-xử-lý) đã dự báo.

> [!NOTE]
> **`preference` là feature thứ chín.** Trước khi viết dòng code đầu tiên của `E7-T2`, đã khai
> **hai** chiều mới trong `ALLOWED_CROSS_FEATURE` của `eslint.config.mjs` và bổ sung probe tương
> ứng — hiện có đúng 7 chiều được phép:
>
> - `selection → preference` (cho `E7-T2`, `E7-T3`)
> - `meal → preference` (cho `E7-T7` — `finalizeSession` phải đọc tập `Cannot Eat`)
>
> Chiều thứ hai dễ bị bỏ sót vì lịch sử ăn nằm ở feature `history`; nhưng hàm thuần
> `defaultEatingHistory` **nhận** tập ngoại lệ qua tham số, nên chỗ đọc dữ liệu là `meal`.
> Bỏ qua bước này thì ESLint chặn đúng lúc code đã viết xong.

---

## 16.3 E8 — Deck ngắn và có nhịp

**19 giờ · `F49`, `F18`, `F19` · [SPEC-026 → SPEC-028](what-we-gonna-eat-today_sdd_v1.3.md) · `BR-047`, `BR-048`, `BR-062`**

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `[ ] E8-T1` | Trần số thẻ mỗi phiên | [SPEC-026](what-we-gonna-eat-today_sdd_v1.3.md), `BR-062`, [DEC-058](what-we-gonna-eat-today_decision-log_v3.9.md) | 2 | `RANKING_CONFIG.deck.maxCards = 30`; hàm thuần `capDeck`; nhóm 150 món cho deck đúng 30 thẻ | `src/features/selection/domain/ranking-config.ts`, `src/features/selection/domain/deck-page.ts` |
| `[ ] E8-T2` | Trộn luồng Exploit / Explore theo khối | [SPEC-027](what-we-gonna-eat-today_sdd_v1.3.md), `BR-047` | 5 | Khối 5 vị trí = 4 Exploit + 1 Explore; tập Explore là món chưa ăn hoặc $d \ge 30$; **test khẳng định đúng 6/30 thẻ đến từ luồng Explore** | `src/features/selection/domain/ranking.ts` |
| `[ ] E8-T3` | Chip lý do đổi màu cho thẻ Explore | [Design Criteria](what-we-gonna-eat-today_design-criteria_v1.0.md), `NFR` a11y | 2 | Thẻ Explore có chip `reason` khác màu VÀ khác chữ — không thông tin nào chỉ truyền tải bằng màu sắc (ràng buộc từ `E6-T6`) | `src/features/selection/presentation/components/dish-swipe-card.tsx` |
| `[ ] E8-T4` | Đóng băng thẻ đã xem khi tính lại | [SPEC-028](what-we-gonna-eat-today_sdd_v1.3.md), `BR-048` | 6 | Thêm/gỡ món giữa phiên → mọi thẻ `index < cursor` giữ nguyên vị trí; `cursor` không lệch | `src/features/selection/infrastructure/**`, `src/features/selection/application/list-deck.ts` |
| `[ ] E8-T5` | Tiến trình `x/30` và màn hình hết thẻ | [Design §3](designs/README.md) | 2 | Người dùng luôn biết còn bao nhiêu thẻ; hết thẻ thì hiện trạng thái kết thúc kèm nút "Tôi đã chọn xong" | `src/features/selection/presentation/components/deck-screen.tsx` |
| `[ ] E8-T6` | Đo lại NFR sau khi deck đổi | `NFR-01`, `NFR-02` | 2 | Deck tải lần đầu ≤ 2.5s trên 4G; độ trễ vuốt ≤ 100ms — đo lại chứ không suy đoán từ số của `E1-T12` | — |

> [!CAUTION]
> **`E8-T1` phải chạy SAU `E8-T2` trong pipeline, dù số thứ tự subtask ngược lại.** Thẻ Explore
> là món lâu chưa ăn, tức nằm ở đuôi bảng xếp hạng. Cắt trần trước khi trộn thì tập nguồn của
> Explore đã bị xoá sạch: deck vẫn chạy, vẫn đủ 30 thẻ, chỉ là **không bao giờ có món lạ**.
> Không test nào ở tầng trên bắt được — đó là lý do DoD của `E8-T2` bắt buộc có test đếm đúng
> 6/30. Xem [Ranking Spec §2.4](what-we-gonna-eat-today_ranking-specification_v1.3.md) và [DEC-058](what-we-gonna-eat-today_decision-log_v3.9.md).

---

## 16.4 E9 — Chế độ vuốt theo chặng

**17 giờ · `F50` · [SPEC-029, SPEC-030](what-we-gonna-eat-today_sdd_v1.3.md) · `BR-063`**

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `[ ] E9-T1` | Schema chặng và snapshot lúc Start | [SPEC-029](what-we-gonna-eat-today_sdd_v1.3.md), [DEC-059](what-we-gonna-eat-today_decision-log_v3.9.md), [DEC-044](what-we-gonna-eat-today_decision-log_v3.9.md) | 3 | Cột `deck_mode` trên `selection_sessions`; bảng `session_courses` khoá `(session_id, position)` không cột `id`; snapshot nằm TRONG cùng giao dịch `startDraft` với `session_rules` | `src/shared/db/schema.ts`, `src/features/session/infrastructure/drizzle-session-repository.ts` |
| `[ ] E9-T2` | Màn chọn và sắp thứ tự chặng lúc mở phiên | [SPEC-029](what-we-gonna-eat-today_sdd_v1.3.md), `BR-063` | 4 | Creator tích tag và kéo sắp thứ tự; chọn `COURSE` mà không chọn chặng nào thì chặn kèm lỗi rõ nghĩa; mặc định vẫn là `FREE` | `src/features/session/presentation/**` |
| `[ ] E9-T3` | Chia chặng và phân bổ hạn mức | [SPEC-030](what-we-gonna-eat-today_sdd_v1.3.md), `BR-063` | 4 | Hàm thuần; 3 chặng → 10 thẻ mỗi chặng; chặng chỉ có 4 món thì 26 thẻ dư chia lại cho hai chặng kia; món đa tag chỉ vào **một** chặng | `src/features/selection/domain/course-deck.ts` |
| `[ ] E9-T4` | `listDeck` hiểu chặng | [SPEC-030](what-we-gonna-eat-today_sdd_v1.3.md) | 3 | `listDeck` nhận `courseIndex`; phiên `FREE` đi đúng đường cũ không rẽ nhánh thêm; tiến trình tính theo chặng | `src/features/selection/application/list-deck.ts` |
| `[ ] E9-T5` | Giao diện duyệt theo chặng | [Design §3](designs/README.md), `NFR-03` | 3 | Tiêu đề chặng hiện rõ ("Chặng 2/3 — Canh"); hết chặng thì chuyển tiếp; quay lại chặng trước vẫn được | `src/features/selection/presentation/components/deck-screen.tsx` |

> [!IMPORTANT]
> **Ranh giới không được vượt:** `rankSession`, `finalizeSession`, `BR-049` và `BR-050`
> **không đổi một dòng nào** trong cả Epic này. Chặng chỉ chia màn hình lúc vuốt; tổng hợp và
> chốt bữa vẫn diễn ra đúng một lần ở cuối như v1.0. Nếu thấy mình đang sửa `finalize-session.ts`,
> nghĩa là đã đi lạc — xem [DEC-059](what-we-gonna-eat-today_decision-log_v3.9.md) mục 4.

> [!NOTE]
> **Vì sao món đa tag chỉ vào một chặng** (`E9-T3`): quy tắc Independent Tag Counting của
> [SDD §9](what-we-gonna-eat-today_sdd_v1.3.md) cho phép một món đóng góp vào nhiều Required Rule cùng lúc — nhưng đó là
> phép cộng trên một tập đã chốt. Chia chặng là phép phân hoạch trên danh sách sắp được vuốt.
> Cho "Bún chả" vào cả chặng `STAPLE` lẫn `MAIN` nghĩa là người dùng vuốt nó hai lần và $P$
> bị đếm trùng.

---

## 16.5 E10 — Chốt bữa có hướng dẫn mềm

**16 giờ · `F22`, `F23`, `F24` · [SPEC-031 → SPEC-033](what-we-gonna-eat-today_sdd_v1.3.md) · `BR-011`, `BR-014`, `BR-053`**

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `[ ] E10-T1` | Bật Preferred Rule ở màn Luật | [SPEC-021](what-we-gonna-eat-today_sdd_v1.3.md), `BR-014` | 4 | `setGroupRules` ghi được `PREFERRED`; mục "Nên có" — vốn là một mục trống có chủ ý từ v1.0 — nay dùng được | `src/features/rule/application/set-group-rules.ts`, `src/features/rule/presentation/components/group-rules-screen.tsx` |
| `[ ] E10-T2` | Tách cảnh báo mềm khỏi chặn cứng | [SPEC-031](what-we-gonna-eat-today_sdd_v1.3.md), `BR-052` | 3 | `evaluate` trả `{ blocking, warnings }`; thiếu `REQUIRED` vẫn chặn, thiếu `PREFERRED` chỉ cảnh báo; Independent Tag Counting áp cho cả hai | `src/features/rule/domain/evaluate.ts` |
| `[ ] E10-T3` | Target Dish Count | [SPEC-032](what-we-gonna-eat-today_sdd_v1.3.md), `BR-011` | 3 | Nhóm đặt được số món mục tiêu; lệch theo cả hai chiều đều cảnh báo và nói rõ chiều lệch; chưa đặt thì im lặng | `src/features/rule/**`, `src/shared/db/schema.ts` |
| `[ ] E10-T4` | Lưu vết cảnh báo bị bỏ qua | [SPEC-033](what-we-gonna-eat-today_sdd_v1.3.md), `BR-053` | 3 | Bảng `finalize_warnings` ghi TRONG cùng giao dịch với `finalizeSession`; chốt bữa sạch thì không ghi dòng nào | `src/features/meal/application/finalize-session.ts`, `src/shared/db/schema.ts` |
| `[ ] E10-T5` | Giao diện cảnh báo mềm và xác nhận bỏ qua | [Design §4](designs/README.md) | 3 | Cảnh báo phân biệt rõ với lỗi chặn (khác chữ, không chỉ khác màu); bỏ qua cảnh báo cần một bước xác nhận có chủ đích | `src/features/meal/presentation/components/finalize-meal-screen.tsx` |

> [!NOTE]
> Enum `groupRuleType` **đã có sẵn** giá trị `'PREFERRED'` từ v1.0, kèm ghi chú "v1.1 bật
> Preferred Rule chỉ cần ghi giá trị, không cần migration". `E10-T1` không sinh migration cho
> enum này — nếu thấy `drizzle-kit generate` đòi tạo, nghĩa là đã sửa nhầm chỗ.

---

## 16.6 E11 — Vận hành tối thiểu

**8 giờ · `F26`, `F27` · [SPEC-034, SPEC-035](what-we-gonna-eat-today_sdd_v1.3.md) · `BR-005`, `BR-055`, `BR-061`**

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `[ ] E11-T1` | Tự động đóng phiên quá hạn | [SPEC-034](what-we-gonna-eat-today_sdd_v1.3.md), `BR-055`, `BR-061` | 5 | Phiên `DRAFT`/`ACTIVE` của ngày cũ chuyển `INVALID` khi mở phiên mới; xét lười theo timezone nhóm qua `SPEC-018`, không cần cron; tương tác cũ được bảo toàn nhưng không tính vào phép nào | `src/features/session/application/**`, `src/features/session/infrastructure/**` |
| `[ ] E11-T2` | Gỡ Dish khỏi danh mục nhóm | [SPEC-035](what-we-gonna-eat-today_sdd_v1.3.md), `BR-005` | 3 | Món chuyển `ACTIVE`→`INACTIVE`, KHÔNG xoá dòng; nhóm "Đã gỡ khỏi nhóm" xuất hiện trong danh mục — chỗ trống này đã được ghi chú sẵn từ v1.0 | `src/features/dish/application/**`, `src/features/dish/presentation/components/dish-catalog-screen.tsx` |

> [!NOTE]
> Cả `sessionState.INVALID` lẫn `groupDishState.INACTIVE` **đã có sẵn trong enum** từ v1.0.
> Epic này không sinh migration enum nào; nó chỉ làm cho hai giá trị vốn không tới được trở
> nên tới được.

---

## 16.7 Đường găng và rủi ro v1.1

```text
M2-T4 ──► E7-T1 ──► E7-T2 ──► E7-T3 ──► E7-T6            [ 11 giờ ]
                       └──► E8-T2 ──► E8-T1 ──► E8-T4     [ 13 giờ ]
                                        └──► E9-T1 ──► E9-T3 ──► E9-T4 [ 10 giờ ]
──────────────────────────────────────────────────────────────────────────
                                              TỔNG ĐƯỜNG GĂNG: 34 giờ
```

**34 trong tổng số 81 giờ nằm trên đường găng.** `E10` và `E11` hoàn toàn nằm ngoài — nếu hết
thời gian, cắt chúng trước, và v1.1 vẫn giao được đúng hai lời hứa chính (gợi ý đúng người,
deck có điểm dừng).

| Rủi ro | Dấu hiệu nhận biết sớm | Phương án xử lý |
| :--- | :--- | :--- |
| **Cắt trần trước khi trộn Explore** | Vuốt vài phiên liền không thấy món nào lạ | Test đếm 6/30 ở `E8-T2` phải viết TRƯỚC phần thi công, không phải sau |
| **`E9` lan vào luồng chốt bữa** | Xuất hiện ý định sửa `finalize-session.ts` hoặc `rankSession` | Dừng lại, đọc [DEC-059](what-we-gonna-eat-today_decision-log_v3.9.md) mục 4. Chặng KHÔNG đụng `BR-050` |
| **Món đa tag vuốt hai lần** | $P$ của một món lớn hơn tổng số người tham gia | `E9-T3` phải có test cho món mang hai tag thuộc hai chặng khác nhau |
| **`preference` phá luật tầng** | ESLint đỏ ở `E7-T2` sau khi code đã viết xong | Khai `ALLOWED_CROSS_FEATURE` và chạy `yarn arch:probe` NGAY ở đầu `E7-T1` |
| **Trần 30 thẻ khiến nhóm lớn thấy thiếu** | Người dùng than "sao không thấy món X bao giờ" | Đây là hành vi đúng theo `BR-062`. Lối thoát là `F18` Explore, không phải nới trần |

> [!TIP]
> **Điểm kiểm tra sau `E8`:** vuốt thật ba phiên liên tiếp trên máy thật. Nếu không phiên nào
> đưa ra một món bạn quên mất là nhà mình có, thì `F18` chưa chạy đúng — và không có `F18`
> chạy đúng thì `F49` chỉ là một cái trần chặn người dùng khỏi chính danh mục của họ.
