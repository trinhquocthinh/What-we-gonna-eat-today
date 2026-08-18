# Master Plan — What We Gonna Eat Today

## Version 1.0

**Status:** Approved
**Release:** R1 — baseline cho phạm vi v1.0
**Supersedes:** Version 0.1
**Created:** 2026-08-14
**Upstream:** Toàn bộ 11 tài liệu trước

Đây là tài liệu bạn mở ra mỗi ngày. Nó phải dùng được, không phải để trưng.

**56 subtask, 121 giờ cơ sở, 157 giờ có dự phòng 30%.**

Mọi subtask được thiết kế để **xong trong một buổi ngồi** — 1 đến 4 giờ. Subtask lớn hơn sẽ bị hoãn vô hạn.

---

# 1. Bảng tiến độ

| Epic | Nội dung | Subtask | Giờ | Trạng thái |
| --- | --- | --- | --- | --- |
| E0 | Scaffold | 7 | 10 | ☒ |
| E1 | Walking skeleton | 12 | 24 | ☐ |
| E2 | Group và Dish | 7 | 16 | ☐ |
| E3 | Phiên và người tham gia | 6 | 14 | ☐ |
| E4 | Deck và ranking | 9 | 21 | ☐ |
| E5 | Rule và chốt bữa | 9 | 21 | ☐ |
| E6 | Hoàn thiện | 6 | 15 | ☐ |

Cột trạng thái dùng để tick. Nếu sau ba tuần chưa có ô nào được tick, vấn đề không nằm ở kế hoạch.

---

# 2. E0 — Scaffold

Phải xong trước mọi thứ khác. Không có ngoại lệ.

| ID | Tiêu đề | Nguồn | Giờ | Phụ thuộc | Xong nghĩa là | File |
| --- | --- | --- | --- | --- | --- | --- |
| E0-T1 | Khởi tạo repo, yarn Berry, Next.js, TS strict | Tech §1 | 2 | — | `yarn dev` chạy, `tsc --noEmit` xanh, `.nvmrc` ghim Node 24 | `package.json`, `tsconfig.json`, `.nvmrc` |
| E0-T2 | Dựng khung thư mục và ESLint chặn luật tầng | Tech §2.1, §2.2 | 2 | E0-T1 | Import từ `domain/` sang `application/` bị ESLint báo lỗi — thử bằng một file cố tình sai rồi xoá | `eslint.config.js`, `src/features/*/` |
| E0-T3 | Husky, lint-staged, Prettier, commitlint | Tech §8.1 | 1.5 | E0-T1 | Commit sai Conventional Commits bị chặn | `.husky/`, `commitlint.config.js` |
| E0-T4 | jscpd, knip, gộp `yarn verify` | Tech §8.1 | 0.5 | E0-T3 | `yarn verify` chạy đủ 6 công cụ | `package.json`, `.jscpd.json`, `knip.json` |
| E0-T5 | Vitest và một test mẫu ở `domain/` | Tech §8.2 | 1 | E0-T2 | `yarn test` xanh, coverage in ra được | `vitest.config.ts` |
| E0-T6 | Neon project, Drizzle, migration đầu tiên, ba branch DB | Tech §6.1, §6.2 | 2 | E0-T1 | `yarn db:migrate` tạo được một bảng thật trên branch `dev` | `drizzle.config.ts`, `src/shared/db/` |
| E0-T7 | GitHub Actions và Vercel, deploy trang trắng | Tech §8.1 | 1 | E0-T4, E0-T6 | CI xanh, preview URL mở được trên điện thoại — **cột mốc M1** | `.github/workflows/ci.yml` |

**Điểm kiểm tra scope sau E0:** nếu E0 vượt 15 giờ, nguyên nhân gần như luôn là cấu hình dựng lại từ đầu thay vì chép từ starter kit. Dừng và chép.

---

# 3. E1 — Walking skeleton

Một luồng mỏng nhất chạy suốt UI → application → domain → infrastructure → DB → quay lại UI. Không đẹp, không đủ tính năng, nhưng chạy thật và deploy được.

Cố ý bỏ qua ở epic này: link mời, chuẩn hoá tên món, System Tag, revalidate lúc Start, cooldown, rule.

## S1 — Đăng nhập

| ID | Tiêu đề | Nguồn | Giờ | Phụ thuộc | Xong nghĩa là | File |
|---|---|---|---|---|---|---|
| E1-T1 | Auth.js Google, bảng `users` | SPEC-001, TC-001→003 | 3 | E0-T7 | Đăng nhập được trên preview; TC-001→003 pass | `features/auth/**` |

## S2 — Group tối thiểu

| ID | Tiêu đề | Nguồn | Giờ | Phụ thuộc | Xong nghĩa là | File |
| --- | --- | --- | --- | --- | --- | --- |
| E1-T2 | Schema `groups`, `group_members`, use case tạo Group | SPEC-002, TC-008→010 | 2 | E1-T1 | Tạo Group được, người tạo là Admin; TC-008→010 pass | `features/group/**` |
| E1-T3 | Authorization guard | SPEC-019, TC-006, TC-007 | 1 | E1-T2 | Gọi thao tác Group khi không phải Member trả `ERR_NOT_GROUP_MEMBER` | `features/group/application/assert-group-access.ts` |
| E1-T4 | Decision Date theo timezone Group | SPEC-018, TC-004, TC-005 | 1 | E1-T2 | Hàm thuần, nhận `now` làm tham số, không mock `Date`; TC-004, TC-005 pass | `features/session/domain/decision-date.ts` |

## S3 — Dish thô

| ID | Tiêu đề | Nguồn | Giờ | Phụ thuộc | Xong nghĩa là | File |
|---|---|---|---|---|---|---|
| E1-T5 | Schema `global_dishes`, `group_dishes`, thêm món không chuẩn hoá | SPEC-005 rút gọn | 2 | E1-T2 | Thêm được món và thấy trong danh sách (đã xong ở S3) | `features/dish/**` |


## S4 — Session tối thiểu

| ID | Tiêu đề | Nguồn | Giờ | Phụ thuộc | Xong nghĩa là | File |
| --- | --- | --- | --- | --- | --- | --- |
| E1-T6 | Schema `selection_sessions`, `participants`, partial unique index | SPEC-007, BR-025 | 2 | E1-T4 | Migration tạo được index một phần; kiểm bằng `\d+` trong psql (đã xong ở S4) | `shared/db/schema.ts` |
| E1-T7 | Tạo và Start Session, bắt lỗi unique violation | SPEC-007, TC-026→029, TC-107 | 2 | E1-T6 | Hai Start đồng thời: đúng một thành công — **TC-107 phải chạy hai transaction song song thật** (đã xong ở S4) | `features/session/**` |

## S5 — Deck và swipe thô

| ID | Tiêu đề | Nguồn | Giờ | Phụ thuộc | Xong nghĩa là | File |
| --- | --- | --- | --- | --- | --- | --- |
| E1-T8 | Deck liệt kê không ranking, phân trang | SPEC-010 rút gọn, SPEC-011 | 2 | E1-T5, E1-T7 | Mở phiên thấy danh sách món, cuộn hết được (đã xong ở S5) | `features/selection/**` |
| E1-T9 | Route Handler ghi Interaction, optimistic UI | SPEC-012, TC-048→053 | 3 | E1-T8 | Vuốt 10 món liên tiếp không xếp hàng; TC-048→053 pass (đã xong ở S5) | `app/api/sessions/[id]/interactions/route.ts` |

## S6 — Chốt bữa thô

| ID | Tiêu đề | Nguồn | Giờ | Phụ thuộc | Xong nghĩa là | File |
| --- | --- | --- | --- | --- | --- | --- |
| E1-T10 | Chọn món và finalize, chưa có rule | SPEC-015, SPEC-016 rút gọn | 2 | E1-T9 | Session chuyển `FINALIZED`, không reopen được | `features/meal/**` |
| E1-T11 | Sinh Default Eating History trong cùng transaction | SPEC-017, TC-076→078, TC-109 | 2 | E1-T10 | TC-109 pass: `INSERT` thất bại giữa chừng thì Session **không** `FINALIZED` | `features/history/**` |

## S7 — Đo thật

| ID | Tiêu đề | Nguồn | Giờ | Phụ thuộc | Xong nghĩa là | File |
| --- | --- | --- | --- | --- | --- | --- |
| E1-T12 | Deploy production, đo cold start trên 4G | R-01, MS-05 | 2 | E1-T11 | Có con số thật ghi vào Setup Guide; chạy sau ≥10 phút app không ai dùng — **cột mốc M2** | — |

**Điểm kiểm tra scope sau E1:** đây là điểm dừng quan trọng nhất.

- Quá 35 giờ mà chưa xong E1 → ước lượng toàn bộ phần còn lại cũng sai theo cùng tỉ lệ. Cắt theo Plan & Scope §7.
- Cold start đo được vượt 2 giây → NFR-01 không cứu được bằng tối ưu frontend. Quyết định lại: nới ngưỡng, hay đổi database.

---

## 4. E2 — Group và Dish hoàn chỉnh

| ID | Tiêu đề | Nguồn | Giờ | Phụ thuộc | Xong nghĩa là | File |
| --- | --- | --- | --- | --- | --- | --- |
| E2-T1 | Tạo link mời, lưu hash, hạn 7 ngày | SPEC-003, TC-011, TC-012 | 2 | E1-T3 | DB chỉ chứa hash, không chứa token thô | `features/group/**` |
| E2-T2 | Tham gia bằng link, transaction, các trường hợp âm | SPEC-004, TC-013→016, TC-112 | 2 | E2-T1 | TC-015 pass: Member cũ dùng token thì token **vẫn dùng được** cho người khác | `features/group/application/join-by-invite.ts` |
| E2-T3 | Chuẩn hoá tên món bỏ dấu, hàm thuần | SPEC-005, TC-098 | 2 | — | `Ca kho` và `Cá kho` cùng `normalized_name` (thêm bước bỏ dấu vào `normalize-name.ts` đã có + migration backfill); dữ liệu test dùng tiếng Việt có dấu thật | `features/dish/domain/normalize-name.ts` |

| E2-T4 | Phát hiện trùng, `forceCreate`, khôi phục Dish Inactive | SPEC-005, TC-017→021, TC-097→099 | 3 | E2-T3 | Thêm lại Dish Inactive chuyển `ACTIVE`, không tạo Global Dish mới | `features/dish/application/**` |
| E2-T5 | Gán System Tag, ghi đè toàn bộ, cách ly theo Group | SPEC-006, TC-022→025, TC-100, TC-101 | 3 | E1-T5 | Đổi tag ở Group A không ảnh hưởng Group B | `features/dish/**` |
| E2-T6 | Màn hình danh mục món | S-05, S-06 | 2 | E2-T4 | Thêm, sửa tag, tìm kiếm được trên điện thoại | `features/dish/presentation/**` |
| E2-T7 | Trạng thái phát hiện trùng trên UI | S-06 | 2 | E2-T6 | Nút "Dùng món này" **nổi bật hơn** "vẫn tạo mới" | `features/dish/presentation/duplicate-sheet.tsx` |

**Điểm kiểm tra sau E2:** đạt cột mốc M3 khi kết hợp với E3. Nếu tổng đã vượt 70 giờ, cắt F04 System Tag và F20 rule cùng lúc.

---

# 5. E3 — Phiên và người tham gia

| ID | Tiêu đề | Nguồn | Giờ | Phụ thuộc | Xong nghĩa là | File |
| --- | --- | --- | --- | --- | --- | --- |
| E3-T1 | Revalidate 5 bước lúc Start | SPEC-008, TC-030→035 | 3 | E1-T7 | Dừng ở lỗi đầu tiên, trả đúng mã lỗi tương ứng từng bước | `features/session/application/start-session.ts` |
| E3-T2 | Hiện Participant không hợp lệ ngay tại hàng | S-08, TC-031 | 1 | E3-T1 | Thấy tên người cụ thể, không phải thông báo chung | `features/session/presentation/**` |
| E3-T3 | Thêm Participant khi Draft | SPEC-009, TC-036, TC-037 | 1.5 | E3-T1 | Participant mới có 0 Interaction | `features/session/application/add-participant.ts` |
| E3-T4 | Thêm Participant khi Active | SPEC-009, TC-038, TC-039 | 1.5 | E3-T3 | TC-038 pass: thêm trùng trả `ERR_PARTICIPANT_EXISTS` | như trên |
| E3-T5 | Completed và mở lại | SPEC-013, TC-054→057 | 3 | E1-T9 | TC-055 pass: Participant `COMPLETED` **vẫn vuốt được** | `features/session/**` |
| E3-T6 | Màn hình phiên cho Creator | S-04, S-08 | 4 | E3-T5 | Thấy ai xong ai chưa, vào phiên được — **cột mốc M3** | `features/session/presentation/**` |

---

# 6. E4 — Deck và ranking

Giai đoạn quyết định sản phẩm có khác một danh sách hay không.

| ID | Tiêu đề | Nguồn | Giờ | Phụ thuộc | Xong nghĩa là | File |
| --- | --- | --- | --- | --- | --- | --- |
| E4-T1 | `computeRecencyPenalty`, hàm thuần | SPEC-020, TC-079→084 | 3 | E1-T11 | Không mock gì, nhận `referenceDate` làm tham số; TC-084 pass: hai record cùng ngày collapse thành một | `features/history/domain/recency.ts` |
| E4-T2 | `computePersonalScore` và `buildDeck` với tie-break | SPEC-010, TC-040→044 | 3 | E4-T1 | `RankingConfig` nằm ở **một** module hằng số duy nhất | `features/selection/domain/ranking.ts` |
| E4-T3 | Lưu `session_decks`, thứ tự bất biến trong phiên | SPEC-010, TC-041 | 2 | E4-T2 | Mở lại deck lần hai thứ tự giống hệt | `features/selection/infrastructure/**` |
| E4-T4 | Phân trang và lọc lại theo `group_dishes.state` | SPEC-011, TC-045→047, TC-102→104, TC-108 | 3 | E4-T3 | TC-108 pass: Dish bị gỡ sau khi deck materialize không xuất hiện | `features/selection/application/**` |
| E4-T5 | Upsert Interaction có chống ghi đè sai thứ tự | SPEC-012, TC-106 | 2.5 | E1-T9 | TC-106 pass: bản đến muộn có timestamp cũ hơn bị bỏ qua | `features/selection/application/record-interaction.ts` |
| E4-T6 | Retry khi mất mạng, không chặn thao tác | NFR-05, S-09 | 1.5 | E4-T5 | Tắt mạng vẫn vuốt tiếp được, có dải báo ở đỉnh | `features/selection/presentation/**` |
| E4-T7 | Thẻ món và cử chỉ vuốt | S-09, Design §4 | 3 | E4-T4 | Nghiêng tối đa 8°, lớp phủ theo hướng, **vuốt trái không dùng màu đỏ** | `features/selection/presentation/dish-card.tsx` |
| E4-T8 | Nút vuốt và khả năng tiếp cận | Design §7, NFR-03 | 2 | E4-T7 | Mọi cử chỉ có nút tương đương; nhãn screen reader là câu đầy đủ; vùng chạm ≥44px ở nửa dưới | `features/selection/presentation/swipe-controls.tsx` |
| E4-T9 | Chỉ báo tiến độ và lối vào Completed | S-09 | 1 | E4-T8 | Hết deck hiện gợi ý "Tôi chọn xong" — **cột mốc M4** | như trên |

**Điểm kiểm tra sau E4:** quá 90 giờ mà chưa đạt M4 → thứ tự các giai đoạn đã sai. Deck có ranking là thứ phân biệt sản phẩm này với một tờ giấy ghi món.

---

# 7. E5 — Rule và chốt bữa

| ID | Tiêu đề | Nguồn | Giờ | Phụ thuộc | Xong nghĩa là | File |
| --- | --- | --- | --- | --- | --- | --- |
| E5-T1 | Schema `group_rules` và CRUD | SPEC-021, TC-085, TC-088 | 2 | E2-T5 | Lưu danh sách rỗng thì Group không còn rule nào | `features/rule/**` |
| E5-T2 | Invariant của rule ép ở tầng DB | SPEC-021, TC-086, TC-087, TC-089 | 2 | E5-T1 | `unique(group_id, rule_type, system_tag)` và `check(minimum_count >= 1)` là ràng buộc thật trong migration | `features/rule/infrastructure/schema.ts` |
| E5-T3 | `evaluateRequired`, independent tag counting | SPEC-016, TC-072, TC-073, TC-110 | 3 | E5-T1 | **Viết TC-073 trước khi viết hàm.** Một Dish mang cả `MAIN` và `SOUP` thoả cả hai rule | `features/rule/domain/evaluate.ts` |
| E5-T4 | Snapshot Session Rule trong transaction Start | SPEC-022, TC-091→094 | 2 | E5-T2, E3-T1 | TC-035 pass: Start thất bại thì không có Session Rule nào được tạo | `features/rule/application/snapshot.ts` |
| E5-T5 | Finalize revalidate đầy đủ trong một transaction | SPEC-016, TC-067→075 | 4 | E5-T3, E5-T4, E1-T11 | TC-074 và TC-075 pass: rule theo snapshot, System Tag theo hiện tại | `features/meal/application/finalize.ts` |
| E5-T6 | `computeSessionScore` chuẩn hoá theo `T` | SPEC-014, TC-058→062, TC-111 | 2.5 | E4-T5 | TC-111 pass: `T = 1` không chia cho 0 | `features/selection/domain/ranking.ts` |
| E5-T7 | Màn hình tổng hợp kèm số đếm thô | S-10, Design §4 | 2.5 | E5-T6 | Dùng `tabular-nums`; số 0 hiện mờ chứ không ẩn | `features/selection/presentation/**` |
| E5-T8 | Khay chọn món và dựng Final Meal | SPEC-015, S-10, TC-063→066 | 2 | E5-T7 | Chọn được cả món trong mục "Chưa ai chọn" | `features/meal/presentation/**` |
| E5-T9 | Hiện Required Rule chưa đạt ngay trên nút chốt | S-10, TC-072 | 1 | E5-T5, E5-T8 | Ghi rõ `Còn thiếu: 1 món Canh`, không dùng hộp thoại — **cột mốc M5** | như trên |

---

# 8. E6 — Hoàn thiện

| ID | Tiêu đề | Nguồn | Giờ | Phụ thuộc | Xong nghĩa là | File |
| --- | --- | --- | --- | --- | --- | --- |
| E6-T1 | Toàn bộ trạng thái rỗng | Design §3 | 4 | E5-T9 | Mỗi trạng thái rỗng nêu **việc cần làm tiếp**, không chỉ nói trống | mọi `presentation/` |
| E6-T2 | Bảng dịch mã lỗi và lỗi tại chỗ | SDD §2.5, Design §4 | 2 | E6-T1 | Một bảng tra duy nhất; không hộp thoại cho lỗi kiểm tra dữ liệu | `shared/errors/messages.ts` |
| E6-T3 | Đo NFR-01 đến NFR-05 bằng số thật | Tech §9, MS-01→05 | 3 | E6-T2 | Có con số cho từng NFR, không phải cảm nhận | — |
| E6-T4 | Chặn mở phiên khi nhóm chưa có món | S-04, Design §3 | 2 | E6-T1 | Nhóm mới thấy "Thêm món" thay vì "Mở phiên" | `features/group/presentation/**` |
| E6-T5 | Rà coverage `domain/` và `application/` đạt 80% | Tech §8.2 | 3 | E6-T3 | CI ép ngưỡng, không chỉ báo cáo | `vitest.config.ts` |
| E6-T6 | Rà tiếp cận: tương phản, focus, nhãn | Design §7 | 1 | E6-T4 | Không thông tin nào chỉ truyền bằng màu — **cột mốc M6** | mọi `presentation/` |

---

# 9. Đường găng

Chuỗi subtask dài nhất, quyết định ngày xong:

```text
E0-T1 → E0-T2 → E0-T6 → E0-T7        7 giờ
  → E1-T1 → E1-T2 → E1-T4 → E1-T6
  → E1-T7 → E1-T8 → E1-T9 → E1-T10
  → E1-T11 → E1-T12                  21 giờ
  → E4-T1 → E4-T2 → E4-T3 → E4-T4    11 giờ
  → E5-T3 → E5-T4 → E5-T5             9 giờ
  → E6-T3                             3 giờ
                              tổng:  51 giờ
```

51 trong 121 giờ nằm trên đường găng. 70 giờ còn lại có thể đảo thứ tự hoặc cắt mà không đẩy lùi ngày xong — đó chính là danh sách ứng viên khi cần cắt scope.

Đáng chú ý: **E2 và E3 hoàn toàn nằm ngoài đường găng.** Nếu bị kẹt thời gian, hoãn chúng và đi thẳng từ E1 sang E4 vẫn ra được một sản phẩm chạy được cho một người dùng.

---

# 10. Lịch theo quỹ giờ

Tôi chưa biết quỹ giờ thực tế mỗi tuần của bạn. Ba kịch bản:

| Quỹ giờ/tuần | Thời gian tới M2 | Tới M4 | Tới M6 (xong v1.0) |
| --- | --- | --- | --- |
| 6 giờ | 6 tuần | 17 tuần | **26 tuần ≈ 6 tháng** |
| 10 giờ | 4 tuần | 10 tuần | **16 tuần ≈ 4 tháng** |
| 15 giờ | 2,5 tuần | 7 tuần | **11 tuần ≈ 2,5 tháng** |

Tính trên 157 giờ đã gồm dự phòng.

**Nói thẳng:** nếu quỹ giờ thực tế là 6 giờ mỗi tuần, sáu tháng cho một app chọn món ăn tối là quá dài — động lực sẽ hết trước khi tới M6. Trong trường hợp đó tôi khuyên cắt ngay bây giờ chứ không đợi:

- Bỏ E5 hoàn toàn (rule engine): −21 giờ, về đúng 14 tính năng như phương án ban đầu.
- Bỏ E2-T1, E2-T2 (link mời): −4 giờ, thêm thành viên bằng cách sửa DB trực tiếp cho đến khi thật sự cần.
- Bỏ E3-T3, E3-T4 (thêm Participant): −3 giờ, mặc định mọi Member đều tham gia.

Còn 93 giờ base, khoảng 121 giờ có dự phòng, tức 20 tuần ở mức 6 giờ/tuần. Vẫn dài nhưng đã khác.

Cho tôi biết quỹ giờ thật và tôi sẽ chốt lại lịch cùng danh sách cắt cụ thể.

---

# 11. Bảng rủi ro

| Rủi ro | Dấu hiệu sớm | Phản ứng |
| --- | --- | --- |
| Cold start Neon vượt NFR-01 | E1-T12 đo được > 2 giây | Render shell tĩnh trước, stream dữ liệu sau. Nếu vẫn vượt, nới NFR-01 lên 4 giây thay vì đổi database — đổi database ở giai đoạn này tốn hơn nhiều so với lợi ích |
| Ước lượng sai toàn cục | E0 vượt 15 giờ, hoặc E1 vượt 35 giờ | Cắt theo §10 ngay, không đợi tới E4 |
| Kiến trúc rò rỉ qua ranh giới tầng | Muốn viết `import` từ `domain/` sang `infrastructure/` | ESLint đã chặn ở E0-T2. Nếu thấy mình muốn tắt luật, đó là dấu hiệu đặt sai tầng chứ không phải luật sai |
| Independent tag counting bị hiện thực nhầm | Viết `evaluateRequired` trước khi viết TC-073 | Bắt buộc viết TC-073 trước. Đây là chỗ sai mà không gây lỗi, chỉ cho kết quả sai |
| Dữ liệu Eating History sai do thiếu `Cannot Eat` | Người nhà bắt đầu than "sao cứ gợi ý món tôi không ăn được" | Đã biết trước (R-05). Ưu tiên F15 lên đầu v1.1 |
| Mất động lực giữa chừng | Hai tuần liên tiếp không tick được ô nào | Đây là rủi ro lớn nhất của dự án cá nhân và không có giải pháp kỹ thuật. Cách duy nhất là rút ngắn khoảng cách tới M2 |

---

# 12. Điểm kiểm tra scope

Sau mỗi epic, hỏi đúng ba câu:

1. Tổng giờ đã dùng so với ước lượng lệch bao nhiêu phần trăm? Nếu quá 40%, áp cùng tỉ lệ đó cho phần còn lại và quyết định lại ngay.
2. Có tính năng nào trong các epic sau mà tuần vừa rồi tôi **không hề nghĩ tới** không? Nếu có, nó là ứng viên cắt.
3. Nếu phải dừng hẳn ngày mai, thứ đã làm có dùng được không?

Câu thứ ba là câu quan trọng nhất. Kế hoạch này được xếp sao cho từ sau E1 trở đi, câu trả lời luôn là có.

---

# 13. Sau v1.0 — lộ trình v1.1 và v1.2

Phần này **không chia subtask**. Lý do: subtask cho việc còn cách 4–6 tháng sẽ lỗi thời trước khi ai chạm tới, và viết chúng bây giờ chỉ tạo cảm giác an tâm giả. Chia nhỏ khi bắt đầu epic tương ứng.

Ước lượng ở mức epic, đã gồm dự phòng 30%.

## 13.1 v1.1 — 12 tính năng

Mục tiêu: sản phẩm đủ đúng để dữ liệu tin được. v1.0 chạy được nhưng ghi lịch sử ăn cả những món người ta không ăn nổi.

| Epic | Nội dung | Tính năng | Giờ |
| --- | --- | --- | --- |
| E7 | Ràng buộc và sở thích cá nhân | F15 `Cannot Eat`, F16 Like/Dislike | 18 |
| E8 | Deck nâng cao | F18 explore lane 20%, F19 deck ổn định khi tính lại | 13 |
| E9 | Rule mở rộng và cảnh báo | F22 Preferred Rule, F23 Target Dish Count, F24 lưu vết cảnh báo | 16 |
| E10 | Vận hành và sửa dữ liệu | F25 gỡ Participant, F26 phiên hết hạn, F27 gỡ Dish, F28 sửa lịch sử ăn, F29 giao diện phát hiện trùng | 23 |
| | | **Tổng** | **70** |

**E7 phải làm trước.** `F15 Cannot Eat` là món nợ dữ liệu duy nhất của v1.0 (rủi ro R-05): mỗi ngày trôi qua là thêm một lớp lịch sử ăn sai, và lịch sử sai nuôi trực tiếp công thức cooldown. Càng để lâu càng nhiều dữ liệu phải bỏ.

**E10 chứa hai thứ gỡ bế tắc của v1.0:** F26 làm phiên cũ tự đóng thay vì phải sửa DB tay, F27 làm bốn test case đang bị chặn chạy được — xem `test-cases-specification` §3.1.

## 13.2 v1.2 — 13 tính năng

Mục tiêu: sản phẩm học được từ hành vi và linh hoạt theo hoàn cảnh.

| Epic | Nội dung | Tính năng | Giờ |
| --- | --- | --- | --- |
| E11 | Chef | F33 Chef Role và Chef Mode, F34 khả năng nấu, F42 gán/gỡ Chef Role | 23 |
| E12 | Học sở thích | F30 Implicit Preference, F31 Blacklist, F32 Whitelist, F39 reset | 21 |
| E13 | Linh hoạt và bổ trợ | F35 override Session Rule, F36 nguồn mua, F37 Descriptive Tag, F38 phản hồi trực tiếp lúc chốt, F40 sửa Final Meal, F41 huỷ phiên | 31 |
| | | **Tổng** | **75** |

**F32 Whitelist chỉ có nghĩa sau F17,** vốn đã có ở v1.0 — nó là nút tắt cho cooldown. Đừng làm F32 trước F31.

**E11 Chef là epic lớn nhất so với giá trị mang lại.** Ở một gia đình, người nấu thường cố định và ai cũng biết họ nấu được gì. Trước khi bắt đầu E11, hãy hỏi lại: 23 giờ này có thật sự đổi được điều gì không.

## 13.3 Tổng ba chặng

| Chặng | Giờ có dự phòng | Cộng dồn |
| --- | --- | --- |
| v1.0 | 157 | 157 |
| v1.1 | 70 | 227 |
| v1.2 | 75 | 302 |

Ở mức 10 giờ mỗi tuần, ba chặng là khoảng **30 tuần**. Ở mức 6 giờ, khoảng **50 tuần**.

Nói thẳng: đừng lập kế hoạch cho cả ba chặng. Lập kế hoạch cho v1.0, dùng nó thật một tháng, rồi quyết định v1.1 dựa trên thứ thật sự khó chịu chứ không dựa trên bảng này. Rất có khả năng một nửa số tính năng ở v1.2 sẽ không còn ai muốn sau khi dùng thật.

---

# 14. Ngoài phạm vi

Không nằm trong bất kỳ chặng nào ở trên.

| Tính năng | Vì sao |
| --- | --- |
| F43 Một User thuộc nhiều Group | Hoãn theo quyết định D-04. Schema đã giữ `group_id` ở mọi bảng nên mở lại không cần migration |
| F44 Giao diện System Admin | Dưới 10 người dùng, thao tác ngoại lệ làm trực tiếp trên DB |
| F45 Logical Merge món trùng | Ảnh hưởng đồng thời pool, phiên đang chạy, tương tác, lịch sử. Không xứng với lợi ích ở quy mô này |
| F46 Khôi phục metadata khi thêm lại Dish | Trạng thái phức tạp, giá trị nhỏ |
| F47 Deadline tuỳ chỉnh cho phiên | Hết ngày theo timezone nhóm là đủ |
| F48 Sửa lịch sử ăn của ngày cũ | Chỉ cho sửa ngày hiện tại |

Ngoài ra, toàn bộ danh sách ở `problem-definition` §11 vẫn nằm ngoài phạm vi: gợi ý ngẫu nhiên, tự động chọn món, tự sinh tổ hợp bữa ăn, lên thực đơn cho ngày tương lai, chia món theo bữa, quản lý nguyên liệu và tồn kho, tối ưu dinh dưỡng, quản lý dị ứng, công thức nấu, đặt món, và tự động hiểu món nào hợp với món nào.

Ba thứ đáng nhắc lại vì rất hay bị đề xuất thêm vào:

- **Quản lý dị ứng.** `Cannot Eat` là khai báo ăn kiêng do người dùng tự đặt, **không phải cơ chế an toàn y tế**. Đừng để ai hiểu nhầm nó là thứ bảo vệ tính mạng.
- **Tối ưu dinh dưỡng.** Cần dữ liệu thành phần món ăn mà hệ thống không có và không định thu thập.
- **Tự động quyết định thay Creator.** Đây là ranh giới sản phẩm ở `problem-definition` §3, không phải giới hạn kỹ thuật.

---

# 15. Change History

| Version | Date | Section | Change | Reason / Decision |
| --- | --- | --- | --- | --- |
| 1.0 | 2026-08-14 | Header | Duyệt và phát hành trong baseline R1 | Review toàn bộ bộ tài liệu |
| 0.1 | 2026-08-14 | Toàn bộ | Bản draft đầu tiên: 7 epic, 56 subtask, đường găng 51 giờ, ba kịch bản lịch | Phase 9 |
