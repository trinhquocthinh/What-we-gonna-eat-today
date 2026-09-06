# 🧾 Implementation Guide — E10 Slice S2: Hệ quả lúc chốt bữa

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-09-02`
> - **Upstream:** [Master Plan §16.5](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E10-T4`, `E10-T5`) • [SDD §8.4](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-031`, `SPEC-032`, `SPEC-033`) • [Business Rules](../../what-we-gonna-eat-today_business-rules_v1.8.md) (`BR-011`, `BR-014`, `BR-051`, `BR-052`, `BR-053`) • [Design Criteria §5](../../what-we-gonna-eat-today_design-criteria_v1.0.md) • [Decision Log](../../what-we-gonna-eat-today_decision-log_v3.9.md) (`DEC-025`, `DEC-067`) • [Test Cases](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-140`, `TC-155`)
> - **Tiền đề:** `E10-S1` xong — `evaluateRules` trả `{ blocking, warnings }`, Target Count đã đông cứng vào phiên.
>
> 🧾 *Slice khép E10 và khép cả lời hứa "chốt bữa" của v1.1. Sau slice này màn chốt nói được ba mức — chặn, nhắc, và cho qua — và hệ thống nhớ những gì đã được cho qua.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E10-T4` | Lưu vết cảnh báo bị bỏ qua | 3 | `schema.ts`, `meal/application/**`, `meal/infrastructure/**` | Chốt bữa lệch chuẩn để lại vết; chốt sạch thì không |
| `E10-T5` | Giao diện cảnh báo mềm và xác nhận hai nhịp | 3 | `finalize-bar.tsx` | Cảnh báo khác lỗi chặn cả bằng chữ; bấm một lần chưa gửi |

- [ ] Cảnh báo phân biệt với lỗi chặn bằng **chữ**, không chỉ bằng màu (§1.3)
- [ ] Bấm "Chốt bữa" lần đầu khi còn cảnh báo **không** gửi request (§1.2)
- [ ] `finalize_warnings` ghi trong **cùng giao dịch** `commitFinalize` (§1.1)
- [ ] Chốt bữa không có cảnh báo nào → **không** dòng nào được ghi (`TC-140`)
- [ ] `TC-140`, `TC-155` xanh; `MS-01` và `MS-04` chạy lại vẫn xanh
- [ ] `yarn verify && yarn arch:probe && yarn test:integration` xanh

---

# 1. Năm phát hiện — đọc trước khi gõ

## 1.1 Server tự tính lại — `F24` không cần client gửi gì lên

[`finalizeSession`](../../../src/features/meal/application/finalize-session.ts) bước 6 **đã** chạy đánh giá luật trên dữ liệu server, với System Tag hiện tại của món (`BR-052`). Sau S1 nó trả cả `warnings`.

Nên `E10-T4` chỉ việc mang `warnings` đó xuống `commitFinalize`. **Không** thêm trường nào vào `FormData`, không thêm tham số nào vào `finalizeMealAction`.

Vì sao đáng nói: phản xạ tự nhiên với "lưu vết cảnh báo người dùng đã bỏ qua" là bắt client gửi lên danh sách họ đã xác nhận. Làm vậy thì audit log ghi lại **thứ client nói**, chứ không phải **thứ đã thật sự xảy ra** — và `DEC-025` đặt bảng audit ra để biết cái đã xảy ra.

**Chốt bữa *là* hành động bỏ qua cảnh báo.** Không có trạng thái "đã xác nhận" nào cần truyền: nếu `warnings` không rỗng tại thời điểm server chốt, thì đúng là chúng đã bị bỏ qua.

`commitFinalize` hiện nhận `{ sessionId, eatingHistoryRows }` và ghi tất cả trong một `db.batch()` — bất biến `Atomic Finalize` của [Business Rules §23](../../what-we-gonna-eat-today_business-rules_v1.8.md). Thêm `warningRows` vào cùng input và cùng batch; **không** thêm một lệnh ghi riêng sau đó.

`TC-109` (ghi `eating_history` hỏng giữa transaction → session **không** chuyển `FINALIZED`) vẫn phải xanh sau khi thêm bảng thứ tư vào batch.

## 1.2 Xác nhận hai nhịp là thuần client, và nó phải reset

Codebase có lập trường rõ, ghi thẳng trong [`finalize-bar.tsx`](../../../src/features/meal/presentation/components/finalize-bar.tsx):

> **KHÔNG MODAL** (E5-T9 DoD). Mọi thứ hiện tại chỗ, ngay trên nút.

Nên xác nhận diễn ra trên **chính nút đó**: bấm lần đầu khi còn cảnh báo → nhãn đổi thành *"Vẫn chốt · thiếu 1 món canh"*; bấm lần hai mới submit.

Một `useState<boolean>` trong `FinalizeBar`. Hai chi tiết dễ sai:

1. **Phải reset khi tập món đổi.** Người dùng bấm lần đầu, thấy nhãn cảnh báo, rồi **thêm món canh** cho đủ — nếu cờ còn bật, lần bấm kế tiếp submit ngay mà không ai kịp đọc gì. Reset bằng cách so `selectedDishes` với giá trị trước đó khi render, đúng khuôn [`DEC-022`](../../what-we-gonna-eat-today_decision-log_v3.9.md) (*"đồng bộ state khi render, tránh Effect thừa"*) mà `dish-catalog-screen.tsx` đã dùng cho `prevActionState`.
2. **Nút phải là `type="submit"` ở cả hai nhịp.** Đổi sang `type="button"` cho nhịp một rồi `submit` cho nhịp hai là hai cây DOM khác nhau, và React sẽ mất focus giữa hai lần render — người dùng bàn phím bị đá ra khỏi nút. Giữ `type="submit"`, chặn bằng `onClick` gọi `event.preventDefault()` ở nhịp một.

Không cảnh báo nào → không có nhịp hai. Nút chốt hoạt động y như trước E10.

## 1.3 Cảnh báo phải khác lỗi chặn bằng CHỮ, không chỉ bằng màu

Ràng buộc từ `E6-T6` (mốc M6): **không thông tin nào chỉ truyền tải bằng màu sắc**.

`FinalizeBar` hiện phân biệt rule đã đủ / chưa đủ bằng `border-yes` vs `border-border-strong` **và** bằng chữ (*"đã đủ"* / *"còn thiếu 1 món canh"*). Giữ đúng khuôn đó cho ba mức:

| Mức | Chữ | Viền |
| --- | --- | --- |
| Bắt buộc, chưa đủ | *"Còn thiếu 1 món canh"* | `border-border-strong` |
| Nên có, chưa đủ | *"Nên có thêm 1 món mặn"* | `border-warning` |
| Đã đủ | *"đã đủ"* | `border-yes` |

Chữ *"Còn thiếu"* và *"Nên có thêm"* là thứ mang thông tin; viền chỉ nhấn.

`TARGET_COUNT` không gắn tag nên không nằm trong danh sách theo rule — nó là **một dòng riêng** dưới danh sách: *"Bạn chọn 6 món · nhà mình thường ăn 4"*. Câu này không có *"còn thiếu"* hay *"nên có"* vì nó không phải một quy định về loại món, mà là một quan sát về cả mâm.

Số 0 hiện **mờ** chứ không ẩn — quy ước `E5-T7`.

## 1.4 `finalize_warnings` chỉ ghi cảnh báo, không ghi lỗi chặn

Lỗi `blocking` **không bao giờ** tới được `commitFinalize`: `finalizeSession` bước 6 `return err(...)` trước đó. Nên bảng này theo định nghĩa chỉ chứa cảnh báo mềm — không cần cột phân biệt hai loại.

Nhưng nó **cần** phân biệt hai *kind* của cảnh báo (§1.3 của S1), vì `PREFERRED_SHORTFALL` có tag còn `TARGET_COUNT` thì không:

```ts
export const finalizeWarningKind = pgEnum('finalize_warning_kind', [
  'PREFERRED_SHORTFALL',
  'TARGET_COUNT',
])

/**
 * BR-053 — nhật ký cảnh báo mềm bị bỏ qua lúc chốt bữa. APPEND-ONLY, cùng
 * tinh thần `interaction_events` (DEC-025): ghi lại cái ĐÃ XẢY RA, không phải
 * trạng thái để đọc ngược.
 *
 * KHÔNG chứa lỗi chặn: `blocking` làm `finalizeSession` dừng ở bước 6, không
 * bao giờ tới `commitFinalize` (Guide §1.4).
 *
 * `systemTag` NULL khi `kind = 'TARGET_COUNT'` — cảnh báo đó nói về cả mâm,
 * không về một loại món.
 */
export const finalizeWarnings = pgTable('finalize_warnings', {
  id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
  sessionId: uuid('session_id').notNull().references(() => selectionSessions.id),
  kind: finalizeWarningKind('kind').notNull(),
  systemTag: systemTag('system_tag'),
  /** `minimumCount` với PREFERRED_SHORTFALL; `target` với TARGET_COUNT. */
  expected: integer('expected').notNull(),
  actual: integer('actual').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

**Không** cột `acknowledgedBy`: `selection_sessions.creator_user_id` đã nói ai chốt, và chỉ Creator chốt được (`SPEC-016` bước 2). Một cột lặp lại thông tin đã có là một cột phải giữ đồng bộ.

**Không** cột `direction` cho `TARGET_COUNT`: `expected` và `actual` đã nói đủ, và suy `direction` từ hai số là một phép so sánh. Lưu nó là lưu một giá trị dẫn xuất.

## 1.5 Đừng đọc `finalize_warnings` ở S2

Bảng này là audit log. `F24` chỉ đòi **ghi**; không màn hình nào của v1.1 đọc nó.

Cám dỗ là hiện *"Mẹ đã biết thiếu canh và vẫn chốt"* trên màn mâm cơm đã chốt (S-11) — mockup có banner đó. Nhưng banner ấy là `F15` + `F24` kết hợp và [E6-S1 §1.2](../E6/what-we-gonna-eat-today_e6-s1-implementation-guide_v0_1.md) đã liệt nó vào v1.1/v1.2 mà không nói rõ slice nào.

Để lại cho v1.2 cùng `F40`. Lý do: một banner nói *"đã biết và vẫn chốt"* chỉ có nghĩa khi người đọc **sửa được** mâm cơm — nếu không, nó là một lời trách móc không có nút nào để phản hồi. `F40` Sửa Final Meal là thứ làm nó có nghĩa.

Ghi một dòng trong `meal-repository.ts` nói rõ bảng này chưa có phía đọc, kèm mã tính năng — đúng khuôn các ghi chú "cố ý chưa có" đã dùng xuyên dự án.

---

# 2. File tree

```text
src/shared/db/
├── schema.ts                       # E10-T4 — finalize_warnings + enum
└── migrations/0015_finalize_warnings.sql

src/features/meal/
├── application/
│   ├── meal-repository.ts          # E10-T4 — commitFinalize nhận warningRows
│   ├── finalize-session.ts         # E10-T4 — map warnings → rows
│   └── finalize-session.test.ts
├── infrastructure/
│   ├── drizzle-meal-repository.ts  # E10-T4 — thêm vào db.batch()
│   └── drizzle-meal-repository.integration.test.ts
└── presentation/components/
    ├── finalize-bar.tsx            # E10-T5 — ba mức + hai nhịp
    └── finalize-bar.test.tsx
```

Không file nào của `rule` đổi ở slice này — S1 đã làm xong phần đánh giá.

---

# 3. `E10-T4` — Lưu vết

## 3.1 Schema

Theo §1.4. Migration `0015_finalize_warnings.sql`; **đọc lại SQL sinh ra** trước khi `db:migrate`.

## 3.2 Port

```ts
commitFinalize(input: {
  sessionId: string
  eatingHistoryRows: readonly { /* … không đổi … */ }[]
  /**
   * BR-053 — cảnh báo mềm còn tồn tại tại thời điểm chốt. RỖNG là giá trị
   * hợp lệ và thường gặp: chốt bữa đúng chuẩn thì không ghi dòng nào (TC-140).
   */
  warningRows: readonly {
    kind: 'PREFERRED_SHORTFALL' | 'TARGET_COUNT'
    systemTag: SystemTag | null
    expected: number
    actual: number
  }[]
}): Promise<void>
```

Hiện thực: thêm một `db.insert(finalizeWarnings).values(...)` vào **cùng** `db.batch()` đã có. Mảng rỗng thì **bỏ hẳn câu lệnh** khỏi batch — `INSERT … VALUES ()` với mảng rỗng là lỗi cú pháp ở Postgres, và drizzle không tự bỏ qua.

## 3.3 `finalizeSession`

Bước 7 đã chuẩn bị `eatingHistoryRows` trước transaction. Thêm ngay cạnh:

```ts
const warningRows = evaluation.warnings.map((w) =>
  w.kind === 'PREFERRED_SHORTFALL'
    ? { kind: w.kind, systemTag: w.systemTag, expected: w.minimumCount, actual: w.actual }
    : { kind: w.kind, systemTag: null, expected: w.target, actual: w.actual },
)
```

Hàm thuần, không đọc gì — đúng nguyên tắc *"đọc trước, ghi nguyên tử sau"* mà bước 7 đã ghi.

## 3.4 Test

| Ca | Tầng | Kỳ vọng |
| --- | :---: | --- |
| `TC-140` | `I` | Chốt bữa thoả mọi luật, Target Count đúng → `finalize_warnings` **không có dòng nào** |
| — | `I` | Chốt bữa thiếu 1 Preferred + lệch Target Count → đúng **2** dòng, `systemTag` NULL ở dòng `TARGET_COUNT` |
| `TC-109` | `I` | Hồi quy — `INSERT eating_history` hỏng giữa transaction → session **không** `FINALIZED`, và **không** dòng `finalize_warnings` nào sót lại |
| — | `A` | `finalizeSession` với `blocking` không rỗng → trả lỗi, `commitFinalize` **không** được gọi |

`TC-109` là ca đáng chạy lại nhất: thêm bảng thứ tư vào một batch đang giữ bất biến nguyên tử là chỗ dễ làm vỡ nó nhất.

---

# 4. `E10-T5` — Giao diện

## 4.1 Ba mức trong danh sách rule

Theo §1.3. `FinalizeBar` hiện map trên `rules` và tra `evaluation.shortfalls`; sau S1 nó tra `evaluation.blocking` và `evaluation.warnings`.

Với mỗi rule, ba nhánh: có trong `blocking` → *"Còn thiếu …"*; có trong `warnings` dạng `PREFERRED_SHORTFALL` → *"Nên có thêm …"*; không có ở đâu → *"đã đủ"*.

`ruleSentence` sau S1 đã nhận `ruleType` nên câu đầu dòng tự đúng (*"Phải có ít nhất 1 món canh"* / *"Nên có ít nhất 2 món mặn"*).

## 4.2 Dòng Target Count

Một `<p>` riêng dưới `<ul>`, chỉ render khi có `TARGET_COUNT` trong `warnings`:

```tsx
<p className="border-l-2 border-warning pl-3 text-caption text-ink">
  Bạn chọn {actual} món · nhà mình thường ăn {target}
</p>
```

Không dùng *"còn thiếu"* / *"nên có"* — nó là quan sát về cả mâm, không phải quy định về loại món (§1.3).

## 4.3 Hai nhịp

```tsx
const [armed, setArmed] = useState(false)
const [prevSelection, setPrevSelection] = useState(selectedDishes)

// DEC-022 — đồng bộ khi render, không dùng Effect. Đổi món thì phải đọc lại
// cảnh báo từ đầu (Guide §1.2).
if (selectedDishes !== prevSelection) {
  setPrevSelection(selectedDishes)
  setArmed(false)
}

const needsConfirm = evaluation.warnings.length > 0 && !armed
```

Nút giữ `type="submit"` ở cả hai nhịp; nhịp một chặn bằng `onClick` gọi `preventDefault()` rồi `setArmed(true)` (§1.2).

Nhãn:

| Trạng thái | Nhãn |
| --- | --- |
| Chưa chọn món | *"Chọn món để chốt"* |
| Còn `blocking` | *"Chốt bữa"* (nút `muted`, bấm ra lỗi — hành vi cũ, `Design Criteria §5`) |
| Còn `warnings`, chưa `armed` | *"Chốt bữa"* |
| Còn `warnings`, đã `armed` | *"Vẫn chốt · {tóm tắt cảnh báo}"* |
| Sạch | *"Chốt bữa"* |

Tóm tắt lấy cảnh báo **đầu tiên** (*"thiếu 1 món canh"*), không liệt kê hết — nhãn nút không phải chỗ chứa danh sách, và danh sách đầy đủ đang hiện ngay trên nó.

## 4.4 Test — `finalize-bar.test.tsx`

| Ca | Kỳ vọng |
| --- | --- |
| `TC-155` | Còn cảnh báo, bấm lần đầu → **không** submit; nhãn đổi thành *"Vẫn chốt · …"* |
| — | Bấm lần hai → submit |
| — | Bấm lần đầu, rồi **đổi tập món** → nhãn quay về *"Chốt bữa"*, lần bấm kế tiếp lại chỉ là nhịp một (§1.2) |
| — | Không cảnh báo nào → bấm một lần là submit |
| — | Còn `blocking` → nút `muted`, và chữ *"Còn thiếu"* xuất hiện; **không** có chữ *"Nên có thêm"* |
| — | Thiếu Preferred → chữ *"Nên có thêm"*, nút **không** `muted` |

Ca thứ ba là ca đáng viết nhất — nó là toàn bộ lý do cờ `armed` phải reset.

---

# 5. Rủi ro

| Rủi ro | Dấu hiệu | Xử lý |
| --- | --- | --- |
| Bắt client gửi danh sách cảnh báo đã xác nhận | Audit log ghi thứ client nói, không phải thứ đã xảy ra | §1.1 — server tự tính lại |
| Ghi `finalize_warnings` ngoài `db.batch()` | `TC-109` đỏ, hoặc vết sót lại khi finalize rollback | §3.2 |
| `INSERT` với mảng rỗng | Lỗi cú pháp Postgres khi chốt bữa sạch | §3.2 — bỏ câu lệnh khỏi batch |
| Quên reset `armed` | Thêm món cho đủ rồi bấm một lần là chốt luôn | §1.2, `TC-155` ca ba |
| Đổi `type` của nút giữa hai nhịp | Người dùng bàn phím mất focus | §1.2 |
| Cảnh báo chỉ khác màu | Vi phạm ràng buộc `E6-T6` | §1.3 |
| Dựng banner "đã biết và vẫn chốt" ở S-11 | Một lời trách móc không có nút phản hồi | §1.5 — để v1.2 cùng `F40` |
| Thêm cột `acknowledgedBy` / `direction` | Lặp lại dữ liệu đã có, hoặc lưu giá trị dẫn xuất | §1.4 |

---

# 6. Test Cases coverage

`TC-140` §3.4 • `TC-155` §4.4 • `TC-109` hồi quy §3.4 • năm ca component không mã §4.4.

---

# 7. Thứ tự TDD

1. Schema + migration `0015` → đọc SQL → `db:migrate`.
2. `commitFinalize` nhận `warningRows`; integration `TC-140` + ca hai dòng (đỏ → xanh).
3. `TC-109` chạy lại — phải vẫn xanh.
4. `finalizeSession` map `warnings` → `warningRows` (§3.3); test tầng `A`.
5. `finalize-bar.test.tsx` sáu ca, **`TC-155` ca reset viết cùng lúc với ca hai nhịp** (đỏ) → `FinalizeBar` (xanh).
6. `MS-01` và `MS-04` chạy tay.
7. `yarn verify && yarn arch:probe && yarn test:integration`.

Bước 5 viết ca reset **cùng lúc** chứ không để sau: một `armed` không reset vẫn xanh mọi ca khác, và nó là lỗi chỉ lộ ra khi người dùng làm đúng thứ ta muốn họ làm — sửa mâm cho đủ.

---

# 8. Verify

## 8.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn test:integration
```

## 8.2 Bằng chứng đi trọn vòng — DoD chính của E10

Trên máy thật, nhóm đã cấu hình *"Phải có ít nhất 1 món canh"*, *"Nên có ít nhất 2 món mặn"*, Target Count = 4:

1. Chọn 1 món mặn, không canh. Danh sách hiện **"Còn thiếu 1 món canh"** và **"Nên có thêm 1 món mặn"** — hai câu khác nhau, phân biệt được cả khi nhìn ảnh xám.
2. Bấm "Chốt bữa" → bị chặn, hiện lỗi Required. (Hành vi cũ, không đổi.)
3. Thêm 1 món canh. Dòng Required chuyển *"đã đủ"*; dòng Preferred vẫn *"Nên có thêm 1 món mặn"*; thêm dòng *"Bạn chọn 2 món · nhà mình thường ăn 4"*.
4. Bấm "Chốt bữa" → **không gửi**; nhãn đổi thành *"Vẫn chốt · thiếu 1 món mặn"*.
5. Thêm 1 món mặn nữa → nhãn **quay về** *"Chốt bữa"*, dòng Preferred chuyển *"đã đủ"*.
6. Bấm "Chốt bữa" → vẫn còn cảnh báo Target Count (3 ≠ 4) nên lại là nhịp một. Bấm lần hai → chốt.
7. `yarn db:studio`: `finalize_warnings` có **đúng một** dòng, `kind = 'TARGET_COUNT'`, `systemTag` NULL, `expected = 4`, `actual = 3`.

Bước 5 là bằng chứng cờ `armed` reset. Bước 7 là bằng chứng bảng chỉ ghi cảnh báo **còn tồn tại lúc chốt** — dòng Preferred đã được sửa nên không có mặt.

## 8.3 Bằng chứng chốt bữa sạch không để lại vết

Chốt một bữa thoả mọi luật và đúng Target Count. `finalize_warnings` **không thêm dòng nào**. Bảng rỗng nghĩa là mọi lần chốt đều sạch — đó là thứ làm nó đáng đọc về sau.

---

# 9. Decision Log

`DEC-067` đã bao trọn các quyết định của E10 (xem [E10-S1 Guide §10](what-we-gonna-eat-today_e10-s1-implementation-guide_v0_1.md)). S2 không phát sinh quyết định mới — hai lựa chọn của nó (server tự tính lại, xác nhận hai nhịp) là hệ quả trực tiếp của `DEC-025` và DoD *"KHÔNG MODAL"* của `E5-T9`, không phải quyết định độc lập.

Nếu lúc thi công phát sinh lệch so với guide này, ghi một `DEC-068` mới chứ đừng sửa `DEC-067` — nó thuộc về S1.

---

# 10. Master Plan

[§16.5](../../what-we-gonna-eat-today_master-plan_v2.1.md): gắn nhãn `S2` cho `E10-T4`, `E10-T5`; DoD của `E10-T4` ghi rõ "ghi trong cùng `db.batch()` với `commitFinalize`, mảng rỗng thì bỏ câu lệnh".
