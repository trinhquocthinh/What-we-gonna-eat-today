# 🚪 Implementation Guide — E6 Slice S4: Cổng chất lượng — Coverage, a11y, NFR

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-21`
> - **Upstream:** [Master Plan](../what-we-gonna-eat-today_master-plan_v1_0.md) (`E6-T5`, `E6-T6`, `E6-T3` — **Cột mốc M6**) • [Tech Spec §8.2](../what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) • [Design Criteria §8, §10](../what-we-gonna-eat-today_design-criteria_v0_1.md) • [PRD `NFR-01`→`NFR-05`](../what-we-gonna-eat-today_prd_v0_1.md) • [Test Cases `MS-01`→`MS-05`](../what-we-gonna-eat-today_test-cases-specification_v0_1.md)
> - **Tiền đề:** S1, S2, S3 đã code. `MS-01` chỉ chạy được sau S1.
>
> 🚪 *Slice cuối của v1.0. Không thêm màn hình, không thêm tính năng — dựng ba cái cổng và đo bằng số thật. Xong slice này là mốc M6.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E6-T5` | Rà coverage `domain/` và `application/` đạt 80% | 3 | `vitest.config.mts`, `.github/workflows/ci.yml` | **CI ép ngưỡng**, không chỉ báo cáo |
| `E6-T6` | Rà a11y: tương phản, focus, nhãn | 1 | Mọi `presentation/` | Không thông tin nào chỉ truyền tải bằng màu sắc |
| `E6-T3` | Đo `NFR-01`→`NFR-05` bằng số thật | 3 | Setup & Ops Guide §5.5 | Có con số định lượng cho từng NFR |

- [ ] `yarn test:coverage` **đỏ** khi cố tình xoá một test — chứng minh ngưỡng thật sự ép
- [ ] Ngưỡng đặt **riêng** cho `domain/` và `application/`, không gộp một số chung (§1.1)
- [ ] `--ink-faint` không còn dùng cho thông tin thật (§1.3)
- [ ] `MS-01`→`MS-05` chạy hết trên production, số liệu ghi vào Setup & Ops Guide
- [ ] `yarn verify && yarn arch:probe && yarn test:integration` xanh — **Cột mốc M6**

---

# 1. Năm phát hiện — đọc trước khi gõ

## 1.1 Tech Spec đòi HAI ngưỡng, cấu hình hiện tại chỉ cho MỘT số

[Tech Spec §8.2](../what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) đặt ngưỡng theo **từng tầng**:

| Tầng | Ngưỡng |
| --- | :---: |
| `domain/` | ≥ 80% |
| `application/` | ≥ 80% |
| `infrastructure/` | Không đặt ngưỡng |
| `presentation/` | Không đặt ngưỡng |

Còn [vitest.config.mts](../../vitest.config.mts) gộp cả hai vào một `include`:

```js
include: [
  'src/features/*/domain/**/*.ts',
  'src/features/*/application/**/*.ts',
  'src/shared/time/**/*.ts',
],
// thresholds: { lines: 80 },
```

Bỏ comment dòng đó cho ra **một con số gộp**. `domain/` của dự án này phủ rất dày (hàm thuần, không mock — `ranking.test.ts`, `evaluate.test.ts`, `recency.test.ts` …), nên nó sẽ kéo con số gộp lên và che một `application/` yếu. Ngưỡng gộp không phải thứ Tech Spec §8.2 nói.

Vitest nhận **ngưỡng theo glob**:

```js
thresholds: {
  'src/features/*/domain/**': { lines: 80 },
  'src/features/*/application/**': { lines: 80 },
  'src/shared/time/**': { lines: 80 },
},
```

Dùng dạng này. Nó cũng cho biết tầng nào đang thiếu, thay vì chỉ nói "chưa đủ 80%".

## 1.2 12 trong 16 "file thiếu test" không có gì để test — phải loại trừ, không phải viết test

Đếm thật trên `domain/` + `application/` + `shared/time/`: **56 file nguồn, 40 file test, 16 file không có test cạnh bên.** Nhưng danh sách 16 file đó gần như toàn file chỉ khai kiểu:

| Nhóm | File | Biên dịch ra |
| --- | --- | --- |
| Port (8) | `auth/application/user-repository.ts`, `dish/application/dish-repository.ts`, `group/application/{group,invite,membership}-repository.ts`, `history/application/history-repository.ts`, `meal/application/meal-repository.ts`, `rule/application/rule-repository.ts`, `selection/application/selection-repository.ts`, `session/application/session-repository.ts` | JavaScript **rỗng** — chỉ `export interface` / `export type` |
| Kiểu thuần (4) | `dish/domain/group-dish.ts`, `selection/domain/{dish-card,interaction}.ts`, `session/domain/session.ts` | JavaScript **rỗng** |

Viết test cho chúng là viết test cho `typeof x === 'object'` — vô nghĩa, và `tsc` đã kiểm rồi. Nhưng để chúng trong `include` thì v8 tính file không có câu lệnh nào theo cách không nhất quán và làm con số mất ý nghĩa.

**Bước 1 của `E6-T5` là thêm chúng vào `coverage.exclude`, không phải viết test cho chúng.** Dùng mẫu chứ không liệt kê tay:

```js
exclude: [
  // Port và file chỉ khai kiểu: biên dịch ra JavaScript rỗng, `tsc` đã là
  // "test" của chúng. Để trong phép đo chỉ làm loãng con số.
  'src/features/*/application/*-repository.ts',
  'src/features/*/domain/{group-dish,dish-card,interaction,session}.ts',
],
```

Khoảng trống **thật** sau khi loại trừ chỉ còn hai file, và cả hai đều rẻ:

- `rule/application/list-group-rules.ts` — pass-through ba dòng; một ca test là đủ.
- `selection/domain/ranking-config.ts` — hằng số. Test đúng cho nó không phải "gọi hàm" mà là **khẳng định giá trị**: `wRecency === 0.25`, `cooldownWindowDays === 7`, `pageSize === 20` khớp Ranking Spec §5. Loại test đó bắt được đúng thứ đáng sợ: ai đó chỉnh một trọng số mà không đọc spec.

## 1.3 `--ink-faint` trượt chuẩn tương phản, và E5 đang dùng nó cho thông tin thật

[Design Criteria §8](../what-we-gonna-eat-today_design-criteria_v0_1.md) đòi tương phản **≥ 4.5:1**. Tính thật trên bảng token của §3.1:

| Token | trên `--surface` | trên `--surface-raised` | trên `--surface-sunken` |
| --- | :---: | :---: | :---: |
| `--ink` `#1C1917` | 16.52 ✅ | 17.49 ✅ | 15.15 ✅ |
| `--ink-muted` `#6B6259` | 5.64 ✅ | 5.97 ✅ | 5.17 ✅ |
| **`--ink-faint` `#9C9187`** | **2.91 ❌** | **3.08 ❌** | **2.67 ❌** |
| `--accent` `#B4531F` | 4.73 ✅ | 5.00 ✅ | **4.33 ❌** |
| `--yes` `#3F6B3F` | 5.86 ✅ | 6.20 ✅ | 5.37 ✅ |
| `--no` `#7A6A5C` | 4.91 ✅ | 5.19 ✅ | 4.50 ⚠️ (đúng mép) |
| `--warning` `#8A6A18` | 4.77 ✅ | 5.05 ✅ | **4.38 ❌** |
| `--danger` `#A3261C` | 6.96 ✅ | 7.37 ✅ | 6.38 ✅ |
| `--on-accent` trên `--accent` | — | — | 5.00 ✅ |

`--ink-faint` trượt ở mọi nền. Design Criteria §3.1 định nghĩa nó cho *"Placeholder và disabled"* — WCAG miễn trừ điều khiển bị vô hiệu hoá, và placeholder là vùng xám. Nhưng **E5 đã dùng nó cho thông tin thật**:

- [count-tone.ts](../../src/features/meal/presentation/components/count-tone.ts) — số `0` trong bảng đếm ở S-10 (`E5-T7` DoD: *"số 0 hiện mờ chứ không ẩn"*).
- Ví dụ món mẫu ở S-05.

`0 không muốn` **là** thông tin, và là tin tốt (E5-S4 §1.3 đã lập luận đúng điều đó khi từ chối ẩn nó). Hiện nó ở 2.91:1 là ẩn nó bằng cách khác.

→ **`E6-T6` đổi `count-tone.ts` từ `text-ink-faint` sang `text-ink-muted`** (5.64:1). Phân cấp thị giác vẫn còn — `--ink-muted` vẫn nhạt hơn hẳn `--ink` và `--yes` — mà không trượt chuẩn. `--ink-faint` chỉ còn dùng cho placeholder thật và ví dụ mờ trang trí ở S-05 (chúng không mang thông tin: người dùng không cần đọc được "Cá basa kho tiêu" để dùng màn hình).

Hai ô còn lại (`--accent` và `--warning` trên `--surface-sunken`) là **cặp cần rà**: tìm xem có chỗ nào đặt chúng lên nền sunken không. Nếu có, đổi nền hoặc đổi chữ; nếu không, ghi nhận là tổ hợp không tồn tại.

## 1.4 Ba trong tám anti-pattern kiểm được bằng máy — viết test thay vì tin mắt

[Design Criteria §10](../what-we-gonna-eat-today_design-criteria_v0_1.md) liệt kê 8 anti-pattern. Ba cái là bài kiểm tra tự động được, và E4-S4 đã dựng sẵn khuôn ở [dish-swipe-card.test.tsx](../../src/features/selection/presentation/components/dish-swipe-card.test.tsx):

```ts
describe('DIRECTION_STYLES — bất biến thiết kế', () => {
  it('KHÔNG hướng nào dùng màu đỏ/danger — Design Criteria §10 anti-pattern', () => {
    for (const style of Object.values(DIRECTION_STYLES)) {
      expect(style.background).not.toMatch(/red|danger/)
      …
```

Mở rộng khuôn đó thành một file kiểm bất biến toàn dự án — quét **mã nguồn** chứ không quét DOM, vì anti-pattern là thứ không được tồn tại ở bất kỳ trạng thái nào:

| Anti-pattern (§10) | Kiểm bằng |
| --- | --- |
| 1. Không gradient | `grep` `bg-gradient`, `linear-gradient` trong `src/**` → phải rỗng |
| 4. Không đỏ cho vuốt trái | Đã có (E4-S4) |
| 7. Không modal giữa màn hình | `Sheet` là component duy nhất dùng `role="dialog"`; không file nào khác có chuỗi đó |
| 8. Không spinner | `grep` `animate-spin`, `spinner` → phải rỗng (dự án dùng `Skeleton`) |

Bốn cái còn lại (ảnh stock, emoji chibi, đếm ngược, pháo hoa) không có dấu hiệu văn bản đáng tin — rà bằng mắt và ghi kết luận vào PR.

## 1.5 `NFR-04` không có đơn vị đo — "con số" của nó là số test

`E6-T3` DoD ghi *"Có con số định lượng cho từng NFR"*. Bốn NFR có đơn vị rõ:

| NFR | Đơn vị | Cách đo |
| :---: | --- | --- |
| `NFR-01` | giây | `MS-05` — mở app sau ≥ 10 phút Neon idle, 4G, điện thoại thật |
| `NFR-02` | ms | DevTools Performance: từ `pointerup` tới khung hình thẻ kế tiếp |
| `NFR-03` | px | Đo vùng chạm trong DevTools; kiểm nút nằm ở nửa dưới |
| `NFR-05` | có/không + giây | Tắt mạng, vuốt 5 thẻ, bật lại — đếm số tương tác tới được server |

`NFR-04` (*Tenant Isolation — không rò rỉ dữ liệu chéo*) **không đo bằng con số nào cả**. Không có milli giây, không có phần trăm. Cố tìm một con số cho nó sẽ làm `E6-T3` mắc kẹt.

"Định lượng" đúng cho nó là **đếm bằng chứng**:

- `TC-006`, `TC-007` — `assertGroupAccess` chặn người ngoài nhóm.
- `TC-024`, `TC-100` — tag của Group A không ảnh hưởng Group B.
- `TC-112` — tham gia bằng link mời, các ca âm.
- Bằng chứng cấu trúc: [group-access.ts](../../src/app/groups/[groupId]/group-access.ts) trả `notFound()` chứ không `forbidden()` — *"NFR-04 — không lộ nhóm có tồn tại hay không"*, ghi ngay trong file.

Ghi vào Setup Guide dưới dạng "N test tự động đang canh, chạy mỗi lần CI", kèm danh sách mã `TC`. Đó là con số thật và kiểm lại được.

---

# 2. File tree

```
vitest.config.mts                       ~ SỬA — exclude + thresholds theo glob (§3)
.github/workflows/ci.yml                ~ SỬA — chạy test:coverage (§3.2)

src/features/rule/application/
  list-group-rules.test.ts              + MỚI (§3.1)
src/features/selection/domain/
  ranking-config.test.ts                + MỚI (§3.1)

src/features/meal/presentation/components/
  count-tone.ts                         ~ SỬA — ink-faint → ink-muted (§4.1)
  count-tone.test.ts                    ~ SỬA

src/tests/
  design-invariants.test.ts             + MỚI (§4.2)

docs/what-we-gonna-eat-today_setup-and-ops-guide_v0_1.md
                                        ~ SỬA — thêm §5.5 bảng đo NFR (§5)
```

---

# 3. `E6-T5` — Coverage

## 3.1 Cấu hình

```js
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/features/*/domain/**/*.ts',
        'src/features/*/application/**/*.ts',
        'src/shared/time/**/*.ts',
      ],
      /**
       * Port và file chỉ khai kiểu — biên dịch ra JavaScript RỖNG, nên `tsc`
       * đã là toàn bộ phép kiểm của chúng. Để trong phép đo thì v8 tính file
       * không có câu lệnh nào theo cách không nhất quán và làm con số mất
       * nghĩa. Loại trừ chứ KHÔNG viết test giả cho chúng — xem Guide §1.2.
       */
      exclude: [
        'src/features/*/application/*-repository.ts',
        'src/features/*/domain/{group-dish,dish-card,interaction,session}.ts',
      ],
      /**
       * HAI ngưỡng RIÊNG, không phải một số gộp: Tech Spec §8.2 đặt ≥80% cho
       * `domain/` và ≥80% cho `application/` như hai cam kết khác nhau. Gộp lại
       * thì `domain/` (hàm thuần, phủ rất dày) sẽ kéo con số lên và che một
       * `application/` yếu — đúng thứ ngưỡng sinh ra để ngăn.
       */
      thresholds: {
        'src/features/*/domain/**': { lines: 80 },
        'src/features/*/application/**': { lines: 80 },
        'src/shared/time/**': { lines: 80 },
      },
    },
```

Hai file test lấp khoảng trống thật:

`list-group-rules.test.ts` — một ca, xác nhận nó chuyển tiếp đúng repo (và **không** guard Admin: mọi Member đều xem được quy định, `BR-010`).

`ranking-config.test.ts` — khẳng định **giá trị**, không gọi hàm:

```ts
/**
 * Ranking Spec §5 là hợp đồng đã duyệt. Test này bắt đúng một thứ: ai đó
 * chỉnh một trọng số mà không mở spec ra đọc. Nó không kiểm logic — không có
 * logic nào để kiểm — nên nếu thấy nó "vô nghĩa", hãy thử đổi `wRecency`
 * thành 0.3 và xem nó nói gì.
 */
it('trọng số khớp Ranking Spec §5', () => {
  expect(RANKING_CONFIG.personalRanking.wRecency).toBe(0.25)
  expect(RANKING_CONFIG.history.cooldownWindowDays).toBe(7)
  expect(RANKING_CONFIG.deck.pageSize).toBe(20)
  expect(RANKING_CONFIG.sessionRanking).toEqual({
    aSwipeRight: 1.0, bSwipeLeft: 0.7, cCannotEat: 1.0, dRecent: 0.3,
  })
})
```

## 3.2 CI

`yarn verify` hiện chạy `test` (không coverage). Thêm một bước riêng sau `Verify`:

```yaml
      # Tech Spec §8.2 — ngưỡng 80% cho domain/ và application/. Bước RIÊNG chứ
      # không nhét vào `yarn verify`: coverage chậm hơn hẳn `vitest run`, và
      # tách ra thì log CI chỉ đúng chỗ nào hỏng.
      - name: Ngưỡng coverage
        run: yarn test:coverage
```

**Không** thêm vào `yarn verify` — lệnh đó chạy ở `pre-commit` qua husky, và bắt mỗi lần commit phải đợi coverage là cách người ta bắt đầu dùng `--no-verify`.

## 3.3 Chứng minh ngưỡng THẬT SỰ ép — DoD của `E6-T5`

DoD ghi *"CI ép ngưỡng kiểm thử, không chỉ báo cáo"*. Cách duy nhất biết chắc là làm nó đỏ:

```bash
git stash push src/features/rule/domain/evaluate.test.ts
yarn test:coverage    # phải ĐỎ với thông báo ngưỡng
git stash pop
yarn test:coverage    # phải XANH trở lại
```

Dán cả hai kết quả vào PR. Một cấu hình ngưỡng viết sai (glob không khớp file nào) sẽ **xanh im lặng** — nhìn y hệt một codebase đạt chuẩn. Cùng lý do dự án có `yarn arch:probe`.

---

# 4. `E6-T6` — Khả năng tiếp cận

## 4.1 Sửa tương phản (§1.3)

```ts
export function countTone(value: number, tone: 'yes' | 'neutral'): string {
  if (value === 0) {
    // E6-T6: đổi từ `text-ink-faint` (2.91:1 — TRƯỢT chuẩn 4.5:1 của Design
    // Criteria §8) sang `text-ink-muted` (5.64:1). "Số 0 hiện mờ chứ không ẩn"
    // của E5-T7 vẫn đúng — `--ink-muted` vẫn nhạt hơn hẳn `--ink` và `--yes`,
    // chỉ là đọc được. "0 không muốn" là thông tin, và là tin tốt; hiện nó ở
    // 2.91:1 là ẩn nó bằng cách khác.
    return 'text-ink-muted'
  }
  return tone === 'yes' ? 'text-yes font-medium' : 'text-ink'
}
```

Sửa `count-tone.test.ts` theo, và **thêm** một ca khoá lại kết luận:

```ts
it('số 0 KHÔNG dùng ink-faint — trượt chuẩn tương phản §8', () => {
  expect(countTone(0, 'yes')).not.toContain('ink-faint')
  expect(countTone(0, 'neutral')).not.toContain('ink-faint')
})
```

Rồi rà toàn bộ `text-ink-faint` còn lại:

```bash
grep -rn "ink-faint" src --include="*.tsx"
```

Mỗi chỗ còn lại phải rơi vào đúng một trong hai loại: **placeholder** hoặc **trang trí không mang thông tin** (ví dụ món mẫu ở S-05 — người dùng không cần đọc được chúng để dùng màn hình). Chỗ nào không thuộc hai loại đó thì đổi sang `--ink-muted`.

Cuối cùng, rà hai cặp trượt còn lại của bảng §1.3: `text-accent` và `text-warning` đặt trên `bg-surface-sunken`. `grep` tìm cặp; nếu không tồn tại thì ghi "tổ hợp không xuất hiện" vào PR — kết luận âm cũng là kết luận.

## 4.2 `src/tests/design-invariants.test.ts` — MỚI

Quét **mã nguồn**, không quét DOM: anti-pattern là thứ không được tồn tại ở bất kỳ trạng thái nào, mà một test DOM chỉ thấy các trạng thái nó dựng ra.

```ts
import { readFileSync } from 'node:fs'
import { globSync } from 'node:fs'

/**
 * Design Criteria §10 — bốn anti-pattern kiểm được bằng máy. Ba cái còn lại
 * (ảnh stock, emoji chibi, đếm ngược, pháo hoa) không có dấu hiệu văn bản đáng
 * tin nên rà bằng mắt, ghi kết luận vào PR.
 *
 * Quét NGUỒN chứ không quét DOM: một anti-pattern không được tồn tại ở BẤT KỲ
 * trạng thái nào, mà test DOM chỉ thấy những trạng thái nó tự dựng ra.
 *
 * Khuôn lấy từ `dish-swipe-card.test.tsx` (E4-S4), nâng từ một component lên
 * toàn dự án.
 */
const SOURCES = globSync('src/**/*.{ts,tsx}').filter((f) => !f.includes('.test.'))

it.each([
  ['gradient — §10.1', /bg-gradient|linear-gradient|radial-gradient/],
  ['spinner — §10.8 (dùng Skeleton)', /animate-spin|\bspinner\b/i],
])('không file nguồn nào chứa %s', (_label, pattern) => {
  const offenders = SOURCES.filter((file) => pattern.test(readFileSync(file, 'utf8')))
  expect(offenders).toEqual([])
})

it('chỉ `shared/ui/sheet.tsx` được dùng role="dialog" — §10.7 không modal giữa màn hình', () => {
  const offenders = SOURCES.filter(
    (file) => /role="dialog"/.test(readFileSync(file, 'utf8')) && !file.endsWith('shared/ui/sheet.tsx'),
  )
  expect(offenders).toEqual([])
})
```

> [!WARNING]
> Test này đọc file thật nên nó **phải nằm trong `src/tests/`, không nằm cạnh component nào** — nó không thuộc về feature nào cả. Và nó chạy trong `vitest` môi trường `jsdom`; `node:fs` vẫn dùng được vì Vitest chạy trên Node, nhưng đường dẫn tương đối tính từ **thư mục gốc dự án**, không từ file test.

## 4.3 Rà bằng mắt — ghi kết luận, không ghi "đã kiểm"

Ba việc còn lại của Design Criteria §8, không tự động hoá được:

1. **Nút bấm song song:** mọi cử chỉ vuốt có nút tương đương. `SwipeControls` (E4-T8) đã làm. Xác nhận lại bằng cách **chỉ dùng nút**, không vuốt, đi hết một phiên.
2. **Nhãn screen reader là câu hoàn chỉnh:** bật VoiceOver, đi hết S-09 và S-10. Nhãn phải nghe ra *"Đề xuất món Canh chua cá lóc"*, không phải *"nút, đề xuất"*.
3. **Không thông tin nào chỉ truyền tải bằng màu sắc** (`E6-T6` DoD): dòng quy định ở S-10 phải có **chữ** *"· đã đủ"* / *"· còn thiếu 1 món canh"* chứ không chỉ đổi màu vạch bên trái — E5-S4 §4.3 đã viết đúng, xác nhận lại. Kiểm cả `count-tone`: `0 không muốn` phân biệt với `2 không muốn` bằng **số**, màu chỉ là phụ trợ.

---

# 5. `E6-T3` — Đo NFR bằng số thật

Không sinh code. Chạy trên **production**, **điện thoại thật**, **4G/5G** — không phải localhost, không phải Wi-Fi.

Thêm §5.5 vào [Setup & Ops Guide](../what-we-gonna-eat-today_setup-and-ops-guide_v0_1.md), ngay sau bảng đo cold start M2 hiện có ở §5.4 (giữ nguyên bảng đó — nó là số liệu M2, không ghi đè):

```markdown
## 5.5 Bảng đo NFR-01 → NFR-05 (M6)

| NFR | Ngưỡng cam kết | Cách đo | Kết quả đo | Kết luận |
| :---: | :--- | :--- | :---: | :---: |
| `NFR-01` | ≤ 2.5s tải Deck lần đầu trên 4G | `MS-05`, sau ≥ 10 phút Neon idle, 3 lần | … | … |
| `NFR-02` | ≤ 100ms phản hồi vuốt | DevTools Performance: `pointerup` → khung hình thẻ kế tiếp, 10 lượt | … | … |
| `NFR-03` | Vùng chạm ≥ 44px, ở nửa dưới màn hình | Đo `SwipeControls` và CTA đáy trên 360px | … | … |
| `NFR-04` | Không rò rỉ dữ liệu chéo | **Không đo bằng thời gian** — đếm test đang canh (xem dưới) | … | … |
| `NFR-05` | Mất mạng không chặn thao tác | Bật máy bay, vuốt 5 thẻ, bật lại; đếm tương tác tới server | … | … |

### NFR-04 — bằng chứng thay cho con số

`NFR-04` không có đơn vị đo. Định lượng của nó là số bằng chứng tự động đang canh, chạy mỗi lần CI:

- `TC-006`, `TC-007` — `assertGroupAccess` chặn người ngoài nhóm.
- `TC-024`, `TC-100` — System Tag của Group A không ảnh hưởng Group B.
- `TC-112` — các ca âm của luồng tham gia bằng link mời.
- Bằng chứng cấu trúc: `app/groups/[groupId]/group-access.ts` trả `notFound()` chứ không
  `forbidden()` — không lộ nhóm có tồn tại hay không.
```

Và chạy `MS-01`→`MS-04` (`MS-05` = `NFR-01` ở trên):

| Smoke | Kịch bản | Ghi chú |
| :---: | --- | --- |
| `MS-01` | Tạo nhóm → 5 món → mở phiên → vuốt hết → chốt → **thấy thực đơn và lịch sử ăn** | Chỉ chạy được sau S1 |
| `MS-02` | Người thứ 2 vào bằng link mời, cùng vuốt | Creator thấy số đếm của cả hai ở S-10 |
| `MS-03` | Chốt hôm nay, hôm sau mở phiên mới | Món vừa ăn bị đẩy xuống dưới deck |
| `MS-04` | Đặt rule "phải có canh", chốt bữa không canh | Bị chặn, thông báo nêu rõ thiếu món Canh |

`MS-04` là bài kiểm cuối cho chuỗi E5 + S2: nó chỉ pass nếu `evaluateRequired`, `session_rules` snapshot **và** `messageFor` cùng đúng.

---

# 6. Rủi ro

| Rủi ro | Dấu hiệu sớm | Xử lý |
| --- | --- | --- |
| Glob ngưỡng không khớp file nào | `yarn test:coverage` xanh mà không in ngưỡng | §3.3 — phép thử xoá-một-test là bắt buộc |
| Ngưỡng gộp thay vì hai ngưỡng | Chỉ có một dòng `lines: 80` | §1.1 |
| Loại trừ quá tay | Coverage nhảy vọt lên gần 100% | `exclude` chỉ được chứa file biên dịch ra JS rỗng — kiểm từng cái |
| Thêm coverage vào `yarn verify` | Commit chậm hẳn, xuất hiện `--no-verify` | §3.2 — bước CI riêng |
| Đổi `ink-faint` làm test E5 đỏ | `count-tone.test.ts` | Sửa test — thay đổi có chủ ý (§4.1) |
| Đo NFR trên localhost | Con số đẹp bất thường (NFR-01 < 300ms) | Production + 4G + ≥ 10 phút idle, không có đường tắt |

---

# 7. Test Cases coverage

| Mã | Ở đâu |
| --- | --- |
| `MS-01`→`MS-04` | §5, thủ công trên production |
| `MS-05` | §5, `NFR-01` |
| `TC-006`, `TC-007`, `TC-024`, `TC-100`, `TC-112` | Đã xanh từ E1/E2 — **liệt kê** làm bằng chứng `NFR-04` (§1.5) |

Slice này không thêm `TC` mới. Nó thêm **cổng** cho những `TC` đã có.

---

# 8. Thứ tự

1. `vitest.config.mts`: `exclude` trước, chạy đo, xem con số thật.
2. Thêm `list-group-rules.test.ts` và `ranking-config.test.ts` nếu con số chưa đạt.
3. Bật `thresholds` theo glob → **phép thử xoá-một-test** (§3.3).
4. Thêm bước CI.
5. `count-tone.ts` + test (§4.1) → `grep ink-faint` rà phần còn lại.
6. `design-invariants.test.ts` (§4.2) — chạy ngay, sửa vi phạm nếu có.
7. Rà bằng mắt (§4.3), ghi kết luận.
8. Deploy production → chạy `MS-01`→`MS-05` → điền §5.5 Setup Guide. **Mốc M6.**

---

# 9. Verify

## 9.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn test:integration && yarn test:coverage
```

## 9.2 Bằng chứng ngưỡng ép thật

Kết quả hai lần chạy ở §3.3, dán vào PR.

## 9.3 Bằng chứng a11y

```bash
grep -rn "ink-faint" src --include="*.tsx"
```

Từng dòng còn lại kèm một câu phân loại: placeholder, hay trang trí không mang thông tin.

## 9.4 Mốc M6

Bảng §5.5 của Setup & Ops Guide điền đủ **5 dòng**, không dòng nào để trống, không dòng nào ghi "chưa đo". `NFR-04` ghi danh sách `TC` chứ không ghi một con số bịa ra.

Đó là điểm phát hành v1.0.

---

# 10. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v1.1.md`

```markdown
# DEC-051 — Coverage Thresholds Are Per-Layer and Exclude Type-Only Files; NFR-04 Is Quantified by Test Count

- **Ngày:** 2026-08-21
- **Trạng thái:** Accepted
- **Bối cảnh:** E6-S4

## Quyết định

1. Ngưỡng coverage đặt RIÊNG cho `domain/`, `application/` và `shared/time/` bằng glob, không
   phải một con số gộp.
2. Port (`*-repository.ts`) và file chỉ khai kiểu được đưa vào `coverage.exclude`, không viết
   test cho chúng.
3. `yarn test:coverage` là bước CI RIÊNG, không nằm trong `yarn verify`.
4. `NFR-04` được định lượng bằng danh sách test đang canh, không bằng một đơn vị đo.
5. `count-tone.ts` đổi `--ink-faint` sang `--ink-muted` cho số 0.

## Rationale

1. Tech Spec §8.2 đặt ≥80% cho `domain/` và ≥80% cho `application/` như hai cam kết khác nhau.
   Con số gộp để `domain/` (hàm thuần, phủ dày) che một `application/` yếu.
2. 12 trong 16 file không có test cạnh bên biên dịch ra JavaScript rỗng — `tsc` đã là toàn bộ
   phép kiểm của chúng. Để trong phép đo làm con số mất nghĩa; viết test cho chúng là viết
   test cho chính trình biên dịch.
3. `yarn verify` chạy ở pre-commit qua husky. Bắt mỗi commit đợi coverage là cách người ta bắt
   đầu dùng `--no-verify`.
4. Tenant Isolation không có milli giây hay phần trăm. Cố tìm một con số cho nó sẽ làm E6-T3
   mắc kẹt. Đếm bằng chứng tự động là định lượng thật và kiểm lại được.
5. `--ink-faint` cho tương phản 2.91:1 trên `--surface`, trượt chuẩn 4.5:1 của Design Criteria
   §8. E5-T7 dùng nó cho số 0 trong bảng đếm — mà "0 không muốn" là thông tin, và là tin tốt.
   `--ink-muted` (5.64:1) giữ nguyên phân cấp thị giác mà đọc được.

## Consequence

- Thêm một file `domain/` không test sẽ làm CI đỏ ngay, không đợi ai để ý.
- `--ink-faint` từ nay chỉ dùng cho placeholder và trang trí không mang thông tin.
- Bảng đo NFR ở Setup & Ops Guide §5.5 là tài liệu phát hành v1.0.

## Affected Documents

- Tech Spec §8.2 — ghi rõ ngưỡng đặt theo glob từng tầng.
- Design Criteria §3.1 — ghi chú `--ink-faint` không đạt 4.5:1, chỉ dùng cho placeholder.
- Setup & Ops Guide — thêm §5.5.
```

---

# 11. Master Plan

```markdown
| `[x] E6-T5` | Rà coverage `domain/` và `application/` đạt 80% | … |
| `[x] E6-T6` | Rà khả năng tiếp cận: Tương phản, focus, nhãn | [Design Criteria §8](what-we-gonna-eat-today_design-criteria_v0_1.md) | … — **Cột mốc M6** |
| `[x] E6-T3` | Đo NFR-01 đến NFR-05 bằng số thật | … |
```

và §1: dòng `E6` thành `[x] ✅ Xong — Cột mốc M6`. **v1.0 phát hành.**
