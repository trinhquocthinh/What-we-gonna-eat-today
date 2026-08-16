# Plan & Scope — What We Gonna Eat Today

## Version 0.1

**Status:** Draft — Awaiting review
**Created:** 2026-08-14
**Upstream:** Tech Spec & Architecture v0.1, SDD v0.2, PRD v0.4
**Downstream:** Master Plan, Setup & Ops Guide

Kế hoạch mức cao cho **v1.0 — 17 tính năng**. Chia subtask chi tiết thuộc Master Plan (phase 9).

---

# 1. Nguyên tắc sắp thứ tự

Thứ tự các giai đoạn không theo epic mà theo **rủi ro và phụ thuộc kỹ thuật**:

1. Thứ gì sai thì phải làm lại nhiều nhất → làm trước. Cụ thể là ranh giới tầng, Decision Date theo timezone, và Session uniqueness ở tầng DB.
2. Thứ gì chỉ đo được sau khi deploy thật → đo sớm. Cụ thể là cold start của Neon (R-01), thứ đang ăn gần hết ngân sách 2.5 giây của NFR-01.
3. Walking skeleton chạy suốt trước khi bất kỳ tính năng nào được làm sâu. Một luồng mỏng từ UI tới DB có giá trị hơn ba tính năng hoàn chỉnh không nối được với nhau.
4. Rule engine làm sau deck, vì nó chỉ chặn ở bước finalize và không ai bị kẹt nếu chưa có.

---

# 2. Giai đoạn

## P0 — Scaffold

**Mục tiêu:** repo chạy được, mọi cổng chất lượng xanh, deploy được lên Vercel.

| Việc | Giờ |
|---|---|
| Repo, yarn Berry qua corepack, Next.js App Router, TypeScript strict | 2 |
| Cấu trúc thư mục theo feature, ESLint `import/no-restricted-paths` chặn luật tầng | 2 |
| husky, lint-staged, prettier, commitlint, jscpd, knip, gộp thành `yarn verify` | 2 |
| Vitest + Testing Library, một test mẫu ở `domain/` | 1 |
| Neon project, Drizzle, migration đầu tiên, ba branch DB | 2 |
| GitHub Actions chạy `yarn verify`, Vercel nối repo, deploy trang trắng | 1 |

**Cơ sở:** 10 giờ. Copy cấu hình từ starter kit, không sinh lại từ đầu.

Luật tầng phải được máy chặn **ngay ở P0**. Thêm sau khi đã có 20 file là lúc đã có vi phạm phải gỡ.

---

## P1 — Walking skeleton

**Mục tiêu:** một luồng mỏng nhất chạy suốt từ đăng nhập tới Eating History. Cố ý bỏ qua mọi validation không bắt buộc.

Bao gồm: SPEC-001, SPEC-002, SPEC-018, SPEC-019, và phiên bản rút gọn của SPEC-005, SPEC-007, SPEC-008, SPEC-010, SPEC-011, SPEC-012, SPEC-015, SPEC-016, SPEC-017.

| Việc | Giờ |
|---|---|
| Auth.js Google, `users`, SPEC-001 | 3 |
| SPEC-002 tạo Group, SPEC-019 guard, SPEC-018 Decision Date theo timezone | 4 |
| Thêm Dish thô, chưa chuẩn hoá tên, chưa dedupe | 2 |
| Tạo và Start Session, kèm partial unique index và xử lý unique violation (R-03) | 4 |
| Deck không ranking, chỉ liệt kê; swipe qua Route Handler, optimistic UI | 5 |
| Chọn Final Meal và finalize, chưa có rule; sinh Eating History | 4 |
| Deploy production, đo cold start thật trên 4G (R-01) | 2 |

**Cơ sở:** 24 giờ.

Rút gọn có chủ ý ở P1: chưa có link mời, chưa chuẩn hoá tên Dish, chưa có System Tag, chưa revalidate lúc Start, chưa có cooldown, chưa có rule.

---

## P2 — Group và Dish hoàn chỉnh

**Mục tiêu:** nhiều người vào được nhóm, danh mục món dùng được thật.

Bao gồm: SPEC-003, SPEC-004, SPEC-005 đầy đủ, SPEC-006.

| Việc | Giờ |
|---|---|
| SPEC-003, SPEC-004 link mời dùng một lần, hash token, hết hạn 7 ngày | 4 |
| SPEC-005 chuẩn hoá tên bỏ dấu, phát hiện trùng, `forceCreate`, khôi phục Dish Inactive | 5 |
| SPEC-006 gán System Tag, ghi đè toàn bộ, cách ly theo Group | 3 |
| Màn hình quản lý danh mục món trên mobile | 4 |

**Cơ sở:** 16 giờ.

---

## P3 — Phiên và người tham gia

**Mục tiêu:** phiên nhiều người chạy đúng, kể cả khi dữ liệu đổi giữa chừng.

Bao gồm: SPEC-007, SPEC-008 đầy đủ, SPEC-009, SPEC-013.

| Việc | Giờ |
|---|---|
| SPEC-008 revalidate 5 bước lúc Start, thông báo Participant không hợp lệ | 4 |
| SPEC-009 thêm Participant khi Draft và khi Active | 3 |
| SPEC-013 Completed và mở lại, hiển thị ai xong ai chưa | 3 |
| Màn hình phiên cho Creator | 4 |

**Cơ sở:** 14 giờ.

---

## P4 — Deck và ranking

**Mục tiêu:** thứ tự món có nghĩa. Đây là giai đoạn quyết định sản phẩm có khác một danh sách hay không.

Bao gồm: SPEC-020, SPEC-010 đầy đủ, SPEC-011, SPEC-012 đầy đủ.

| Việc | Giờ |
|---|---|
| SPEC-020 `computeRecencyPenalty`, hàm thuần, test không mock | 3 |
| SPEC-010 dựng deck có score và tie-break, lưu `session_decks` | 5 |
| SPEC-011 phân trang, lọc lại theo `group_dishes.state` lúc đọc (R-02) | 3 |
| SPEC-012 upsert theo timestamp, chống ghi đè sai thứ tự (R-04), retry khi mất mạng | 4 |
| Giao diện swipe một tay, đạt NFR-02 và NFR-03 | 6 |

**Cơ sở:** 21 giờ.

`RankingConfig` phải là module hằng số duy nhất ngay từ giai đoạn này, kể cả khi mới có một số hạng. Đây là điều kiện để F16 và F18 sau này chỉ là thêm số hạng.

---

## P5 — Rule và chốt bữa

**Mục tiêu:** finalize có ý nghĩa, Creator có đủ thông tin để chốt.

Bao gồm: SPEC-021, SPEC-022, SPEC-014, SPEC-015 đầy đủ, SPEC-016 đầy đủ, SPEC-017 đầy đủ.

| Việc | Giờ |
|---|---|
| SPEC-021 cấu hình Group Rule, các invariant của BR-012 | 4 |
| SPEC-022 snapshot Session Rule trong transaction Start | 2 |
| SPEC-016 đánh giá Required Rule, independent tag counting | 4 |
| SPEC-014 Session Ranking, chuẩn hoá theo số Participant, mục "chưa ai chọn" | 5 |
| Màn hình chốt bữa: chọn món, thấy bằng chứng, thấy rule chưa đạt | 6 |

**Cơ sở:** 21 giờ.

Independent tag counting là chỗ dễ hiện thực nhầm thành slot allocation. Viết test cho trường hợp một Dish mang cả `MAIN` và `SOUP` thoả cả hai rule **trước** khi viết hàm.

---

## P6 — Hoàn thiện

**Mục tiêu:** dùng được thật mà không cần giải thích.

| Việc | Giờ |
|---|---|
| Trạng thái rỗng, trạng thái lỗi, bảng dịch mã lỗi sang tiếng Việt | 4 |
| Kiểm tra NFR-01 tới NFR-05 bằng số đo thật, xử lý R-01 nếu vượt ngưỡng | 5 |
| Onboarding tối thiểu: nhóm mới cần nhập món trước khi mở phiên | 3 |
| Rà lại coverage `domain/` và `application/` đạt 80% | 3 |

**Cơ sở:** 15 giờ.

---

# 3. Tổng ước lượng

| Giai đoạn | Cơ sở | Có dự phòng 30% |
|---|---|---|
| P0 Scaffold | 10 | 13 |
| P1 Walking skeleton | 24 | 31 |
| P2 Group và Dish | 16 | 21 |
| P3 Phiên và người tham gia | 14 | 18 |
| P4 Deck và ranking | 21 | 27 |
| P5 Rule và chốt bữa | 21 | 27 |
| P6 Hoàn thiện | 15 | 20 |
| **Tổng** | **121** | **157** |

Ước lượng theo giờ chứ không theo ngày, vì quỹ giờ của dự án cá nhân là rời rạc. Với 6–8 giờ mỗi tuần, 157 giờ tương ứng khoảng 5–6 tháng. Với 15 giờ mỗi tuần thì khoảng 2,5 tháng.

Con số này đáng nhìn thẳng: **v1.0 không phải một dự án cuối tuần.** Nếu quỹ thời gian thực tế nhỏ hơn nhiều, tốt hơn là cắt scope ngay bây giờ chứ không phải bỏ dở ở P4.

---

# 4. Cột mốc

Mỗi cột mốc có định nghĩa "xong" quan sát được, không phải "code đã viết xong".

| Mốc | Sau | Xong nghĩa là |
|---|---|---|
| M1 | P0 | `yarn verify` xanh trên CI và preview deploy mở được trên điện thoại thật |
| M2 | P1 | Bạn tự tạo nhóm, thêm 5 món, mở phiên, vuốt, chốt bữa và thấy lịch sử — toàn bộ trên điện thoại, không dùng máy tính |
| M3 | P2, P3 | Một người nhà vào nhóm bằng link mời và cùng vuốt trong một phiên với bạn |
| M4 | P4 | Hai người trong cùng phiên thấy thứ tự khác nhau, và món ăn hôm qua bị đẩy xuống dưới |
| M5 | P5 | Nhóm đặt quy định "phải có canh", finalize bị chặn khi thiếu, và Creator hiểu vì sao |
| M6 | P6 | Cả nhà dùng thật 7 ngày liên tiếp mà bạn không phải can thiệp vào DB lần nào |

M6 là cột mốc duy nhất chứng minh sản phẩm chạy được. Năm mốc trước chỉ chứng minh phần mềm chạy được.

---

# 5. Definition of Done

Áp dụng cho mọi PR:

- Test đã viết và pass. Hàm thuần trong `domain/` không được mock gì.
- Mỗi `Kịch bản` trong SDD tương ứng ít nhất một test case.
- `yarn verify` xanh: tsc, eslint, prettier, jscpd, knip, vitest.
- Preview deploy mở được.
- Mô tả PR link tới ít nhất một SPEC-ID.
- Không có luật tầng nào bị vi phạm — ESLint chặn, không dựa vào review.

---

# 6. Điểm dừng

Ba ngưỡng buộc dừng lại xem xét scope thay vì cắm đầu làm tiếp:

1. **Quá 35 giờ mà chưa đạt M2.** Walking skeleton là phần dễ ước lượng nhất; vượt 35 giờ nghĩa là ước lượng phần còn lại cũng sai. Dừng và cắt.
2. **Cold start đo được vượt 2 giây sau P1.** NFR-01 không đạt được bằng cách tối ưu frontend. Phải quyết định lại: chấp nhận ngưỡng cao hơn, hay đổi phương án database.
3. **Quá 90 giờ mà chưa đạt M4.** Deck có ranking là thứ phân biệt sản phẩm này với một tờ giấy ghi món. Nếu chưa tới đó sau 90 giờ, thứ tự các giai đoạn đã sai.

---

# 7. Cắt gì nếu chậm

Thứ tự cắt, từ ít đau nhất tới đau nhất:

1. **F20, F21 rule engine.** Bỏ chúng đưa v1.0 về 14 tính năng như phương án ban đầu. Tiết kiệm khoảng 10 giờ. Cái giá là finalize không chặn gì và F13 thành khung rỗng.
2. **F04 System Tag.** Chỉ có nghĩa khi có rule. Cắt cùng lúc với mục 1, tiết kiệm thêm 3 giờ.
3. **F06 thêm Participant giữa phiên.** Mặc định mọi Group Member đều là Participant. Tiết kiệm 3 giờ, mất chút linh hoạt.
4. **F10 Completed.** Creator tự nhìn Session Ranking để biết đủ thông tin chưa. Tiết kiệm 3 giờ.

Không được cắt: F17 cooldown. Nó là tín hiệu ranking duy nhất ở v1.0; bỏ nó thì deck trở lại thành danh sách gần như ngẫu nhiên và M4 không tồn tại.

---

# 8. Change History

| Version | Date | Section | Change | Reason / Decision |
|---|---|---|---|---|
| 0.1 | 2026-08-14 | Toàn bộ | Bản draft đầu tiên: 7 giai đoạn, 157 giờ có dự phòng, 6 cột mốc | Phase 6.4 |
