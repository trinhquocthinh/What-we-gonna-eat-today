# 🗺️ Master Plan — What We Gonna Eat Today

> **Document Metadata**
>
> - **Version:** `1.6` | **Status:** `Active (In Progress)` | **Release:** `R1`
> - **Created:** `2026-08-14` | **Last Updated:** `2026-08-20`
> - **Supersedes:** `v1.5` | **Upstream:** [PRD](what-we-gonna-eat-today_prd_v0_1.md) • [Tech Spec](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) • [SDD](what-we-gonna-eat-today_sdd_v0_1.md) • [Business Rules](what-we-gonna-eat-today_business-rules_v1.4.md)
>
> 📌 *Tài liệu này là cẩm nang thực thi hằng ngày: 56 subtask, 121 giờ cơ sở, 157 giờ gồm 30% dự phòng. Mỗi subtask được thiết kế để hoàn thành trong một buổi ngồi (1 đến 4 giờ).*

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
9. [Đường găng (Critical Path)](#9-đường-găng-critical-path)
10. [Lịch theo quỹ giờ (Workload Scenarios)](#10-lịch-theo-quỹ-giờ-workload-scenarios)
11. [Bảng rủi ro & Phương án xử lý](#11-bảng-rủi-ro--phương-án-xử-lý)
12. [Điểm kiểm tra Scope (Checkpoints)](#12-điểm-kiểm-tra-scope-checkpoints)
13. [Sau v1.0 — Lộ trình v1.1 & v1.2](#13-sau-v10--lộ-trình-v11-và-v12)
14. [Ngoài phạm vi (Out of Scope)](#14-ngoài-phạm-vi-out-of-scope)
15. [Lịch sử thay đổi (Change History)](#15-lịch-sử-thay-đổi-change-history)

---

# 1. Bảng tiến độ tổng quan

| Epic | Nội dung | Subtask | Giờ cơ sở | Trạng thái |
| :--- | :--- | :---: | :---: | :---: |
| **E0** | Scaffold & Hạ tầng kỹ thuật | 7 | 10 | `[x]` ✅ Xong |
| **E1** | Walking skeleton (End-to-End thô) | 12 | 24 | `[x]` ✅ Xong |
| **E2** | Group và Dish hoàn chỉnh | 7 | 16 | `[x]` ✅ Xong |
| **E3** | Phiên và người tham gia | 6 | 14 | `[x]` ✅ Xong — Cột mốc M3 |
| **E4** | Deck vuốt và thuật toán Ranking | 9 | 21 | `[x]` ✅ Xong — Cột mốc M4 |
| **E5** | Rule engine và chốt bữa (Final Meal) | 10 | 23 | `[ ]` ⬜ ⏳ Đang làm (3/10) |
| **E6** | Hoàn thiện UX, Coverage & NFRs | 6 | 15 | `[ ]` ⬜ Chưa bắt đầu |

> [!TIP]
> Cột trạng thái dùng để theo dõi tiến độ. Nếu sau ba tuần chưa có ô nào được tick, vấn đề không nằm ở kế hoạch mà ở nhịp độ thực thi.

---

# 2. E0 — Scaffold

> [!IMPORTANT]
> **Yêu cầu tiên quyết:** Phải xong trước mọi thứ khác. Không có ngoại lệ.

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `E0-T1` | Khởi tạo repo, yarn Berry, Next.js, TS strict | [Tech §1](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) | 2 | — | `yarn dev` chạy, `tsc --noEmit` xanh, `.nvmrc` ghim Node 24 | `package.json`, `tsconfig.json`, `.nvmrc` |
| `E0-T2` | Dựng khung thư mục và ESLint chặn luật tầng | [Tech §2.1, §2.2](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) | 2 | `E0-T1` | Import từ `domain/` sang `application/` bị ESLint chặn | `eslint.config.mjs`, `src/features/*/` |
| `E0-T3` | Husky, lint-staged, Prettier, commitlint | [Tech §8.1](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) | 1.5 | `E0-T1` | Commit sai Conventional Commits bị chặn | `.husky/`, `commitlint.config.js` |
| `E0-T4` | jscpd, knip, gộp `yarn verify` | [Tech §8.1](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) | 0.5 | `E0-T3` | `yarn verify` chạy đủ 6 công cụ | `package.json`, `.jscpd.json`, `knip.json` |
| `E0-T5` | Vitest và test mẫu ở `domain/` | [Tech §8.2](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) | 1 | `E0-T2` | `yarn test` xanh, coverage in ra được | `vitest.config.ts` |
| `E0-T6` | Neon project, Drizzle, migration đầu tiên, 3 DB branch | [Tech §6.1, §6.2](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) | 2 | `E0-T1` | `yarn db:migrate` tạo được bảng thật trên branch `dev` | `drizzle.config.ts`, `src/shared/db/` |
| `E0-T7` | GitHub Actions và Vercel, deploy trang trắng | [Tech §8.1](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) | 1 | `E0-T4`, `E0-T6` | CI xanh, preview URL mở được trên điện thoại — **Cột mốc M1** | `.github/workflows/ci.yml` |

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
| `E1-T1` | Auth.js Google, bảng `users` | [SPEC-001](what-we-gonna-eat-today_sdd_v0_1.md), `TC-001→003` | 3 | `E0-T7` | Đăng nhập được trên preview; `TC-001→003` pass | `src/features/auth/**` |

### S2 — Group tối thiểu

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `E1-T2` | Schema `groups`, `group_members`, use case tạo Group | [SPEC-002](what-we-gonna-eat-today_sdd_v0_1.md), `TC-008→010` | 2 | `E1-T1` | Tạo Group được, người tạo là Admin; `TC-008→010` pass | `src/features/group/**` |
| `E1-T3` | Authorization guard | [SPEC-019](what-we-gonna-eat-today_sdd_v0_1.md), `TC-006`, `TC-007` | 1 | `E1-T2` | Gọi thao tác Group khi không phải Member trả `ERR_NOT_GROUP_MEMBER` | `src/features/group/application/assert-group-access.ts` |
| `E1-T4` | Decision Date theo timezone Group | [SPEC-018](what-we-gonna-eat-today_sdd_v0_1.md), `TC-004`, `TC-005` | 1 | `E1-T2` | Hàm thuần, nhận `now` làm tham số, không mock `Date`; `TC-004`, `TC-005` pass | `src/features/session/domain/decision-date.ts` |

### S3 — Dish thô

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `E1-T5` | Schema `global_dishes`, `group_dishes`, thêm món không chuẩn hoá | [SPEC-005](what-we-gonna-eat-today_sdd_v0_1.md) rút gọn | 2 | `E1-T2` | Thêm được món và thấy trong danh sách | `src/features/dish/**` |

### S4 — Session tối thiểu

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `E1-T6` | Schema `selection_sessions`, `participants`, partial unique index | [SPEC-007](what-we-gonna-eat-today_sdd_v0_1.md), `BR-025` | 2 | `E1-T4` | Migration tạo được index một phần; kiểm tra bằng `\d+` trong psql | `src/shared/db/schema.ts` |
| `E1-T7` | Tạo và Start Session, bắt lỗi unique violation | [SPEC-007](what-we-gonna-eat-today_sdd_v0_1.md), `TC-026→029`, `TC-107` | 2 | `E1-T6` | Hai Start đồng thời: đúng một thành công — **`TC-107` phải chạy 2 transaction song song thật** | `src/features/session/**` |

### S5 — Deck và swipe thô

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `E1-T8` | Deck liệt kê không ranking, phân trang | [SPEC-010](what-we-gonna-eat-today_sdd_v0_1.md) rút gọn, [SPEC-011](what-we-gonna-eat-today_sdd_v0_1.md) | 2 | `E1-T5`, `E1-T7` | Mở phiên thấy danh sách món, cuộn hết được | `src/features/selection/**` |
| `E1-T9` | Route Handler ghi Interaction, optimistic UI | [SPEC-012](what-we-gonna-eat-today_sdd_v0_1.md), `TC-048→053` | 3 | `E1-T8` | Vuốt 10 món liên tiếp không bị chặn xếp hàng; `TC-048→053` pass | `src/app/api/sessions/[id]/interactions/route.ts` |

### S6 — Chốt bữa thô

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `E1-T10` | Chọn món và finalize, chưa có rule | [SPEC-015](what-we-gonna-eat-today_sdd_v0_1.md), [SPEC-016](what-we-gonna-eat-today_sdd_v0_1.md) rút gọn | 2 | `E1-T9` | Session chuyển `FINALIZED`, không reopen được | `src/features/meal/**` |
| `E1-T11` | Sinh Default Eating History trong cùng transaction | [SPEC-017](what-we-gonna-eat-today_sdd_v0_1.md), `TC-076→078`, `TC-109` | 2 | `E1-T10` | `TC-109` pass: `INSERT` thất bại giữa chừng thì Session **không** `FINALIZED` | `src/features/history/**` |

### S7 — Đo kiểm thực tế

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `E1-T12` | Deploy production, đo cold start trên 4G | `R-01`, `MS-05` | 2 | `E1-T11` | Có con số thật ghi vào Setup Guide; chạy sau ≥10 phút idle — **Cột mốc M2** | — |

> [!CAUTION]
> **Scope Checkpoint sau E1 (Quan trọng nhất):**
>
> - Nếu quá 35 giờ mà chưa xong E1 → Ước lượng toàn bộ phần còn lại cũng sai theo cùng tỉ lệ. Cắt theo [Plan & Scope §7](what-we-gonna-eat-today_plan-and-scope_v0_1.md).
> - Cold start đo được vượt 2 giây → NFR-01 không cứu được bằng tối ưu frontend. Quyết định lại: nới ngưỡng, hoặc đổi cơ sở dữ liệu.

---

# 4. E2 — Group và Dish hoàn chỉnh

### S1 — Link mời & Tham gia nhóm (Đã xong)

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `[x] E2-T1` | Tạo link mời, lưu hash, hạn 7 ngày | [SPEC-003](what-we-gonna-eat-today_sdd_v0_1.md), `TC-011`, `TC-012` | 2 | `E1-T3` | DB chỉ chứa hash, không chứa token thô | `src/features/group/**` |
| `[x] E2-T2` | Tham gia bằng link, transaction, trường hợp âm | [SPEC-004](what-we-gonna-eat-today_sdd_v0_1.md), `TC-013→016`, `TC-112` | 2 | `E2-T1` | `TC-015` pass: Member cũ dùng token thì token **vẫn dùng được** cho người khác | `src/features/group/application/join-by-invite.ts` |

### S2 — Chuẩn hoá tên món & Phát hiện trùng lặp (Đã xong)

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `[x] E2-T3` | Chuẩn hoá tên món bỏ dấu, hàm thuần | [SPEC-005](what-we-gonna-eat-today_sdd_v0_1.md), `TC-098` | 2 | — | `Ca kho` và `Cá kho` cùng `normalized_name`; test dùng tiếng Việt có dấu thật | `src/features/dish/domain/normalize-name.ts` |
| `[x] E2-T4` | Phát hiện trùng, `forceCreate`, khôi phục Dish Inactive | [SPEC-005](what-we-gonna-eat-today_sdd_v0_1.md), `TC-017→021`, `TC-097→099` | 3 | `E2-T3` | Thêm lại Dish Inactive chuyển `ACTIVE`, không tạo Global Dish mới | `src/features/dish/application/**` |

### S3 — System Tag (Đã xong)

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `[x] E2-T5` | Gán System Tag, ghi đè toàn bộ, cách ly theo Group | [SPEC-006](what-we-gonna-eat-today_sdd_v0_1.md), `TC-021→025`, `TC-100`, `TC-101` | 3 | `E1-T5` | Đổi tag ở Group A không ảnh hưởng Group B | `src/features/dish/**` |

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
| `[x] E3-T1` | Revalidate 5 bước lúc Start | [SPEC-008](what-we-gonna-eat-today_sdd_v0_1.md), `TC-030→035` | 3 | `E1-T7` | Dừng ở lỗi đầu tiên, trả đúng mã lỗi tương ứng từng bước | `src/features/session/application/start-session.ts` |
| `[x] E3-T2` | Hiện Participant không hợp lệ ngay tại hàng | `S-08`, `TC-031` | 1 | `E3-T1` | Thấy tên người cụ thể, không phải thông báo chung | `src/features/session/presentation/**` |

### S2 — Thêm Participant (Đã xong)

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `[x] E3-T3` | Thêm Participant khi Draft | [SPEC-009](what-we-gonna-eat-today_sdd_v0_1.md), `TC-036`, `TC-037` | 1.5 | `E3-T1` | Participant mới có 0 Interaction | `src/features/session/application/add-participant.ts` |
| `[x] E3-T4` | Thêm Participant khi Active | [SPEC-009](what-we-gonna-eat-today_sdd_v0_1.md), `TC-038`, `TC-039` | 1.5 | `E3-T3` | `TC-038` pass: Thêm trùng trả `ERR_PARTICIPANT_EXISTS` | Như trên |

### S3 — Tiến trình & Giao diện (Đã xong)

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `[x] E3-T5` | Completed và mở lại | [SPEC-013](what-we-gonna-eat-today_sdd_v0_1.md), `TC-054→057` | 3 | `E1-T9` | `TC-055` pass: Participant `COMPLETED` **vẫn vuốt được tiếp** | `src/features/session/**` |
| `[x] E3-T6` | Màn hình phiên cho Creator | `S-04`, `S-08` | 4 | `E3-T5` | Thấy ai xong ai chưa, vào phiên được — **Cột mốc M3** | `src/features/session/presentation/**` |

---

# 6. E4 — Deck và Ranking

> [!NOTE]
> Giai đoạn quyết định sản phẩm có khác một danh sách món ăn thông thường hay không.

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `[x] E4-T1` | `computeRecencyPenalty`, hàm thuần | [SPEC-020](what-we-gonna-eat-today_sdd_v0_1.md), `TC-079→084` | 3 | `E1-T11` | Không mock gì, nhận `referenceDate` làm tham số; `TC-084` pass | `src/features/history/domain/recency.ts` |
| `[x] E4-T2` | `computePersonalScore` & `buildDeck` kèm tie-break | [SPEC-010](what-we-gonna-eat-today_sdd_v0_1.md), `TC-040→044` | 3 | `E4-T1` | `RankingConfig` nằm ở **một** module hằng số duy nhất | `src/features/selection/domain/ranking.ts` |
| `[x] E4-T3` | Lưu `session_decks`, thứ tự bất biến trong phiên | [SPEC-010](what-we-gonna-eat-today_sdd_v0_1.md), `TC-041` | 2 | `E4-T2` | Mở lại deck lần hai thứ tự giống hệt | `src/features/selection/infrastructure/**` |
| `[x] E4-T4` | Phân trang và lọc theo `group_dishes.state` | [SPEC-011](what-we-gonna-eat-today_sdd_v0_1.md), `TC-045→047`, `TC-102→104`, `TC-108` | 3 | `E4-T3` | `TC-108` pass: Dish bị gỡ sau khi deck materialize không xuất hiện | `src/features/selection/application/**` |
| `[x] E4-T5` | Upsert Interaction chống ghi đè sai thứ tự | [SPEC-012](what-we-gonna-eat-today_sdd_v0_1.md), `TC-106` | 2.5 | `E1-T9` | `TC-106` pass: Record đến muộn có timestamp cũ hơn bị bỏ qua | `src/features/selection/application/record-interaction.ts` |
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
> | `S1` | `E5-T1`, `E5-T1b`, `E5-T2` | 6 | [E5-S1 — Quy định mâm cơm của nhóm](plans/what-we-gonna-eat-today_e5-s1-implementation-guide_v0_1.md) |
> | `S2` | `E5-T3`, `E5-T4` | 5 | [E5-S2 — Rule engine và Snapshot lúc Start](plans/what-we-gonna-eat-today_e5-s2-implementation-guide_v0_1.md) |
> | `S3` | `E5-T5`, `E5-T6` | 6.5 | [E5-S3 — Finalize đầy đủ và Session Score](plans/what-we-gonna-eat-today_e5-s3-implementation-guide_v0_1.md) |
> | `S4` | `E5-T7`, `E5-T8`, `E5-T9` | 5.5 | [E5-S4 — Màn tổng hợp và chốt bữa](plans/what-we-gonna-eat-today_e5-s4-implementation-guide_v0_1.md) |

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `[x] E5-T1` | Schema `group_rules` và CRUD | [SPEC-021](what-we-gonna-eat-today_sdd_v0_1.md), `TC-085`, `TC-088` | 2 | `E2-T5` | Lưu danh sách rỗng thì Group không còn rule nào | `src/features/rule/**` |
| `[x] E5-T1b` | Màn hình S-07 "Quy định bữa ăn" | `S-07`, [Design §4](designs/README.md) | 2 | `E5-T1` | Admin đặt được rule trên điện thoại; Member chỉ xem, không thấy nút sửa | `src/features/rule/presentation/**`, `src/app/groups/[groupId]/rules/**` |
| `[x] E5-T2` | Invariant của rule ép ở tầng DB | [SPEC-021](what-we-gonna-eat-today_sdd_v0_1.md), `TC-086`, `TC-087`, `TC-089` | 2 | `E5-T1` | `unique(group_id, rule_type, system_tag)` và `check(minimum_count >= 1)` là ràng buộc thật trong DB | `src/features/rule/infrastructure/schema.ts` |
| `[x] E5-T3` | `evaluateRequired`, independent tag counting | [SPEC-016](what-we-gonna-eat-today_sdd_v0_1.md), `TC-072`, `TC-073`, `TC-110` | 3 | `E5-T1` | **Viết `TC-073` trước khi viết hàm:** Dish mang cả `MAIN` và `SOUP` thoả cả hai rule | `src/features/rule/domain/evaluate.ts` |
| `[x] E5-T4` | Snapshot Session Rule trong transaction Start | [SPEC-022](what-we-gonna-eat-today_sdd_v0_1.md), `TC-091→094` | 2 | `E5-T2`, `E3-T1` | `TC-035` pass: Start thất bại thì không có Session Rule nào được tạo | `src/features/rule/infrastructure/drizzle-rule-repository.ts` |
| `E5-T5` | Finalize revalidate đầy đủ trong transaction | [SPEC-016](what-we-gonna-eat-today_sdd_v0_1.md), `TC-067→075` | 4 | `E5-T3`, `E5-T4`, `E1-T11` | `TC-074` và `TC-075` pass: Rule theo snapshot, System Tag theo hiện tại | `src/features/meal/application/finalize.ts` |
| `E5-T6` | `computeSessionScore` chuẩn hoá theo $T$ | [SPEC-014](what-we-gonna-eat-today_sdd_v0_1.md), `TC-058→062`, `TC-111` | 2.5 | `E4-T5` | `TC-111` pass: $T = 1$ không chia cho 0 | `src/features/selection/domain/ranking.ts` |
| `E5-T7` | Màn hình tổng hợp kèm số đếm thô | `S-10`, [Design §4](designs/README.md) | 2.5 | `E5-T6` | Dùng `tabular-nums`; số 0 hiện mờ chứ không ẩn | `src/features/meal/presentation/**` (đổi khỏi `selection` — [DEC-046](what-we-gonna-eat-today_decision-log_v1.1.md)) |
| `E5-T8` | Khay chọn món và dựng Final Meal | [SPEC-015](what-we-gonna-eat-today_sdd_v0_1.md), `S-10`, `TC-063→066` | 2 | `E5-T7` | Chọn được cả món trong mục "Chưa ai chọn" | `src/features/meal/presentation/**` |
| `E5-T9` | Hiện Required Rule chưa đạt ngay trên nút chốt | `S-10`, `TC-072` | 1 | `E5-T5`, `E5-T8` | Ghi rõ `Còn thiếu: 1 món Canh`, không dùng modal — **Cột mốc M5** | Như trên |

---

# 8. E6 — Hoàn thiện

| ID | Tiêu đề | Nguồn tham chiếu | Giờ | Phụ thuộc | Điều kiện hoàn thành (DoD) | File tác động |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `E6-T1` | Toàn bộ trạng thái rỗng (Empty States) | [Design §3](designs/README.md) | 4 | `E5-T9` | Mỗi trạng thái rỗng nêu **việc cần làm tiếp**, không để trống trơn | Mọi `presentation/` |
| `E6-T2` | Bảng dịch mã lỗi và lỗi tại chỗ | [SDD §2.5](what-we-gonna-eat-today_sdd_v0_1.md), [Design §4](designs/README.md) | 2 | `E6-T1` | Một bảng tra duy nhất; không popup modal cho lỗi form | `src/shared/errors/messages.ts` |
| `E6-T3` | Đo NFR-01 đến NFR-05 bằng số thật | [Tech §9](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md), `MS-01→05` | 3 | `E6-T2` | Có con số định lượng cho từng NFR | — |
| `E6-T4` | Chặn mở phiên khi nhóm chưa có món | `S-04`, [Design §3](designs/README.md) | 2 | `E6-T1` | Nhóm mới thấy "Thêm món" thay vì "Mở phiên" | `src/features/group/presentation/**` |
| `E6-T5` | Rà coverage `domain/` và `application/` đạt 80% | [Tech §8.2](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) | 3 | `E6-T3` | CI ép ngưỡng kiểm thử, không chỉ báo cáo | `vitest.config.ts` |
| `E6-T6` | Rà khả năng tiếp cận: Tương phản, focus, nhãn | [Design §7](designs/README.md) | 1 | `E6-T4` | Không thông tin nào chỉ truyền tải bằng màu sắc — **Cột mốc M6** | Mọi `presentation/` |

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

### 13.1 v1.1 — 12 tính năng (Mục tiêu: Dữ liệu chuẩn xác & Bền vững)

| Epic | Nội dung | Danh sách tính năng | Ước lượng |
| :--- | :--- | :--- | :---: |
| **E7** | Ràng buộc và sở thích cá nhân | `F15` Cannot Eat, `F16` Like/Dislike | 18h |
| **E8** | Deck nâng cao | `F18` Explore Lane 20%, `F19` Deck ổn định khi tính lại | 13h |
| **E9** | Rule mở rộng và cảnh báo | `F22` Preferred Rule, `F23` Target Dish Count, `F24` Lưu vết cảnh báo | 16h |
| **E10** | Vận hành và sửa dữ liệu | `F25` Gỡ Participant, `F26` Phiên hết hạn, `F27` Gỡ Dish, `F28` Sửa lịch sử ăn, `F29` UI phát hiện trùng | 23h |
| | | **Tổng v1.1** | **70h** |

### 13.2 v1.2 — 13 tính năng (Mục tiêu: Học hành vi & Thích ứng linh hoạt)

| Epic | Nội dung | Danh sách tính năng | Ước lượng |
| :--- | :--- | :--- | :---: |
| **E11** | Chef Role & Khả năng nấu | `F33` Chef Role & Chef Mode, `F34` Khả năng nấu, `F42` Gán/gỡ Chef Role | 23h |
| **E12** | Học sở thích tự động | `F30` Implicit Preference, `F31` Blacklist, `F32` Whitelist, `F39` Reset | 21h |
| **E13** | Linh hoạt và bổ trợ | `F35` Override Session Rule, `F36` Nguồn mua, `F37` Descriptive Tag, `F38` Phản hồi trực tiếp, `F40` Sửa Final Meal, `F41` Huỷ phiên | 31h |
| | | **Tổng v1.2** | **75h** |

---

# 14. Ngoài phạm vi (Out of Scope)

| Tính năng | Lý do loại bỏ khỏi phạm vi cốt lõi |
| :--- | :--- |
| `F43` Một User thuộc nhiều Group | Hoãn theo quyết định [DEC-004](what-we-gonna-eat-today_decision-log_v1.1.md). Schema đã sẵn sàng `group_id` |
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
| `1.6` | 2026-08-20 | §1, §7 | Chốt kế hoạch thi công E5: chia 4 slice kèm 4 Implementation Guide; bổ sung subtask `E5-T1b` (màn hình S-07 Quy định bữa ăn); đổi File tác động của `E5-T7` sang `features/meal`; đồng bộ bảng tiến độ §1 với thực tế E2/E3/E4 đã xong | Quyết định DEC-040 đến DEC-046 |
| `1.5` | 2026-08-20 | §6 | Hoàn tất thi công toàn bộ Epic E4 (S1→S4, E4-T1 đến E4-T9: Deck vuốt & Thuật toán Ranking cá nhân) — Đạt cột mốc M4 | Quyết định DEC-036 đến DEC-039 |
| `1.4` | 2026-08-19 | §5 | Hoàn tất thi công Slice S3 của Epic E3 (E3-T5, E3-T6: Completed & Màn hình Creator) — Đạt cột mốc M3 | Quyết định DEC-035 |
| `1.3` | 2026-08-18 | §4 | Hoàn tất thi công Slice S2 của Epic E2 (E2-T3, E2-T4: Chuẩn hoá tên món & Phát hiện trùng lặp) | Quyết định DEC-029, DEC-030 |
| `1.2` | 2026-08-18 | §4 | Hoàn tất thi công Slice S1 của Epic E2 (E2-T1, E2-T2: Link mời & Tham gia nhóm) | Quyết định DEC-027, DEC-028 |
| `1.1` | 2026-08-18 | §1, §3 | Hoàn tất thi công toàn bộ Epic E1 (S1→S6, E1-T1 đến E1-T12), cập nhật trạng thái các subtasks | Đạt cột mốc M2 (Walking Skeleton) |
| `1.0` | 2026-08-14 | Header & Baseline | Phát hành chính thức baseline R1 | Hoàn tất review toàn bộ 11 tài liệu |
| `0.1` | 2026-08-14 | Toàn bộ | Bản thảo đầu tiên: 7 epic, 56 subtask, đường găng 51h | Khởi tạo kế hoạch thực thi |
