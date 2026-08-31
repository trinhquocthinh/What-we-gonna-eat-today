# 🎚️ Implementation Guide — E8 Slice S1: Trần thẻ và luồng khám phá

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-26`
> - **Upstream:** [Master Plan §16.3](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E8-T0`, `E8-T1`, `E8-T2`, `E8-T4`) • [SDD §8.2](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-026`, `SPEC-027`, `SPEC-028`) • [Business Rules](../../what-we-gonna-eat-today_business-rules_v1.7.md) (`BR-047`, `BR-048`, `BR-062`) • [Ranking Spec §2.3, §2.4](../../what-we-gonna-eat-today_ranking-specification_v1.3.md) • [Decision Log](../../what-we-gonna-eat-today_decision-log_v3.9.md) (`DEC-058`) • [Test Cases](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-123`→`TC-130`)
> - **Tiền đề:** E7 xong trọn (S1, S2, S3). `listEligibleDishCards` đã lọc `Cannot Eat`, `list-deck.ts` đã đọc $E$ thật.
>
> 🎚️ *Slice thuật toán. Sau slice này deck có đáy — 30 thẻ, trong đó 6 thẻ là món lâu chưa ăn — nhưng màn hình vẫn chưa nói gì về điều đó (S2 mới nói).*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E8-T0` | Bỏ theo dõi `.probe-result.json` | 0.25 | `.gitignore` | `yarn arch:probe` chạy xong thì `git status` sạch |
| `E8-T1` | Trần 30 thẻ | 2 | `ranking-config.ts`, `deck-page.ts` | Nhóm 150 món cho deck đúng 30 thẻ |
| `E8-T2` | Trộn Exploit / Explore theo khối 4+1 | 5 | `ranking.ts`, `list-deck.ts`, `dish-card.ts` | Đúng 6/30 thẻ đến từ luồng Explore, không món nào lặp |
| `E8-T4` | Ghim bất biến đóng băng | 2 | `*.integration.test.ts`, `BR-048` | Thứ tự deck không đổi qua nhiều lần `listDeck` |

- [ ] `TC-123`→`TC-130` xanh
- [ ] `TC-126` **đếm** đúng 6/30 thẻ từ luồng Explore, không phải "có ít nhất một" (§1.2)
- [ ] Có test khẳng định **không id nào xuất hiện hai lần** trong deck (§1.1)
- [ ] `BR-048` đã ghi rằng v1.1 đóng băng **toàn bộ**, không chỉ `index < cursor` (§1.4)
- [ ] `yarn verify && yarn arch:probe && yarn test:integration` xanh

---

# 1. Năm phát hiện — đọc trước khi gõ

## 1.1 Hai luồng CHỒNG NHAU — phép trộn phải khử trùng

[Ranking Spec §2.3](../../what-we-gonna-eat-today_ranking-specification_v1.3.md):

> **Exploit Lane:** Lấy các món có `Score` cao nhất từ Stage 2.
> **Explore Lane:** Lấy các món chưa từng ăn hoặc đã $\ge 30$ ngày chưa ăn (và chưa bị Dislike), sắp xếp theo $d$ giảm dần.

Một món **chưa từng ăn** có $R = 0$, tức điểm cao nhất có thể — nó đứng đầu luồng Exploit **và** đứng đầu luồng Explore. **Hai luồng không phải một phép phân hoạch.**

Cám dỗ là viết `partition()` rồi zip hai mảng. Làm vậy phải chọn một trong hai đường, và cả hai đều sai:

| Cách làm sai | Hậu quả |
| --- | --- |
| Phân hoạch loại trừ: món explore-eligible **chỉ** vào luồng Explore | Exploit chỉ còn món vừa ăn gần đây. Bốn thẻ đầu mỗi khối toàn món $R > 0$ — đúng ngược ý nghĩa của "khai thác" |
| Zip hai mảng chồng nhau, không nhớ gì | Một món xuất hiện **hai lần** trong deck |

Món lặp không phải lỗi thẩm mỹ: người dùng vuốt nó hai lần, `applyInteraction` upsert nên chỉ giữ một, nhưng người ta đã tiêu hai trong ba mươi lượt cho cùng một món — và nếu hai lượt đó ngược nhau thì lượt sau đè lượt trước một cách vô hình.

**Cách đúng:** một tập `used: Set<string>`; mỗi vị trí lấy phần tử kế tiếp **chưa dùng** từ luồng tương ứng, luồng cạn thì rơi sang luồng kia.

```ts
/**
 * BR-047 — mỗi khối `blockSize` vị trí: (blockSize - 1) thẻ Exploit + 1 thẻ
 * Explore ở vị trí cuối khối.
 *
 * HAI LUỒNG CHỒNG NHAU (Guide §1.1): món chưa từng ăn có R = 0 nên vừa đứng
 * đầu Exploit vừa đứng đầu Explore. `used` là thứ giữ cho mỗi món chỉ vào deck
 * một lần — bỏ nó đi thì deck có món lặp và không test nào ở tầng trên bắt được.
 *
 * Luồng nào cạn thì vị trí đó lấy từ luồng còn lại — không để trống.
 */
export function blendExploitExplore(input: {
  readonly exploit: readonly string[]
  readonly explore: readonly string[]
  readonly blockSize: number
}): string[]
```

Cả hai mảng đầu vào là **id đã sắp**, không phải object — hàm này chỉ trộn thứ tự, không biết gì về điểm số.

## 1.2 Cắt trần phải SAU khi trộn, và `TC-126` phải ĐẾM

[`BR-062`](../../what-we-gonna-eat-today_business-rules_v1.7.md) và [DEC-058](../../what-we-gonna-eat-today_decision-log_v3.9.md) đã ghi. Nhắc lại vì `E8-T1` (trần) mang số nhỏ hơn `E8-T2` (trộn), và cám dỗ là làm xong `capDeck` rồi cắm luôn vào `list-deck.ts`.

Thẻ Explore theo định nghĩa là món lâu chưa ăn — nằm ở **đuôi** bảng xếp hạng. Cắt trần trước khi trộn thì tập nguồn của Explore đã bị xoá sạch. Deck vẫn 30 thẻ, vẫn chạy, chỉ là **vĩnh viễn không có món lạ**.

Không có tầng nào phía trên bắt được: deck hợp lệ, độ dài đúng, thứ tự hợp lý. `TC-126` là ca duy nhất phát hiện được, và nó phải **đếm chính xác 6**, không phải khẳng định "có ít nhất một" — một deck cắt sai vẫn có thể lọt vài món chưa ăn qua đường Exploit.

Thứ tự đúng trong `list-deck.ts`:

```text
listEligibleDishCards (đã lọc Cannot Eat — E7)
  → buildDeck            (xếp theo Personal Score)
  → blendExploitExplore  (trộn 4+1)
  → capDeck              (cắt còn 30)
  → materializeDeck      (ghi session_decks)
```

## 1.3 `session_decks` KHÔNG có chỗ cho cờ `lane` — và đó là chuyện tốt

`session_decks.ordered_dish_ids` là `jsonb` chứa **mảng id trần**. Sau lần materialize đầu tiên, mọi lần đọc lấy thứ tự từ đó — thông tin "thẻ này thuộc luồng nào" **không sống sót**.

Ba đường đi, và đường thứ ba đúng:

| Cách | Vấn đề |
| --- | --- |
| Lưu `lane` vào `session_decks` | Đổi schema cho một thứ suy lại được. Và nó đóng băng một nhãn mô tả *món*, trong khi món có thể đổi trạng thái |
| Suy từ vị trí (`index % 5 === 4`) | Sai ngay khi một luồng cạn (khối lấy trọn từ luồng kia), và sai lần nữa sau khi lọc làm chỉ số dịch đi |
| **Suy lại từ dữ liệu mỗi lần đọc** | ✅ |

`list-deck.ts` **đã tính sẵn** `daysSinceLastEaten` cho mọi thẻ ở bước map cuối, và **đã có** `preferences` trong tay từ E7. Nên `lane` suy lại được chính xác, không cần thêm truy vấn, và tự đúng sau khi lọc.

Tách vị từ ra một hàm thuần dùng chung cho **cả hai** chỗ — chia luồng lúc trộn, và gắn nhãn lúc đọc:

```ts
/**
 * BR-047 — điều kiện vào luồng Explore. Dùng ở HAI chỗ và phải là CÙNG một
 * hàm: `list-deck` chia luồng lúc dựng deck, và gắn `lane` cho từng thẻ ở mỗi
 * lần đọc. Hai bản sao của cùng một vị từ là chỗ chúng sẽ lệch nhau.
 */
export function isExploreEligible(
  input: { readonly daysSinceLastEaten: number | null; readonly explicit: number },
  config: RankingConfig,
): boolean {
  if (input.explicit < 0) return false          // Dislike — BR-047 loại trừ
  return input.daysSinceLastEaten === null || input.daysSinceLastEaten >= config.explore.staleDays
}
```

`DishCard` nhận thêm `lane: 'EXPLOIT' | 'EXPLORE'`, gán ở bước `.map()` cuối của `list-deck.ts` — **không** lưu xuống DB.

> [!NOTE]
> Hệ quả có chủ đích: một món đứng ở vị trí Exploit trong deck vẫn có thể mang nhãn `EXPLORE` nếu nó lâu chưa ăn. Nhãn mô tả **món**, không mô tả **ô**. Đó là thứ người dùng cần biết — "món này lâu rồi nhà mình chưa ăn" — chứ không phải thuật toán đã xếp nó vào rổ nào.

## 1.4 `F19` đã xong sẵn, theo cách MẠNH HƠN `BR-048` đòi hỏi

[`list-deck.ts`](../../../src/features/selection/application/list-deck.ts) chỉ tính ranking khi `findMaterializedDeck` trả `null`. Sau lần đầu, thứ tự đọc thẳng từ `session_decks`.

`BR-048` nói *"khi tính toán lại giữa phiên: đóng băng toàn bộ các thẻ đã xem (`index < cursor`)"* — nhưng **không có phép tính lại nào**. Quy tắc được thoả một cách rỗng.

Hành vi thật hôm nay:

| Sự kiện giữa phiên | Hành vi |
| --- | --- |
| Món bị gỡ khỏi pool, hoặc khai `Cannot Eat` | Rơi khỏi deck ở lần đọc kế tiếp (`eligibleById` không khớp) — `TC-108` |
| Món mới thêm vào nhóm | **Không** xuất hiện — nó không nằm trong `ordered_dish_ids` |
| Đổi `Like` / `Dislike` | **Không** sắp lại thứ tự |

`E8-T4` **không viết cơ chế mới**. Nó ghim hành vi này bằng test, và sửa `BR-048` cho quy tắc nói đúng những gì code làm.

Vì sao đáng sửa quy tắc chứ không im lặng: một quy tắc lỏng hơn code thật là chỗ mà lần refactor sau sẽ nới code cho "đúng đặc tả" — và làm hỏng thứ đang chạy tốt. Đặc tả nên mô tả cam kết mạnh nhất mà hệ thống thật sự giữ.

Câu thay thế cho [`BR-048`](../../what-we-gonna-eat-today_business-rules_v1.7.md) §14.3:

> - Deck được materialize **đúng một lần** cho mỗi `(session, user)` và **không bao giờ được sắp xếp lại** trong phiên. Đây là cam kết mạnh hơn "đóng băng thẻ `index < cursor`" và bao hàm nó.
> - Món mất tư cách giữa phiên (`INACTIVE`, `Cannot Eat`) **rơi khỏi** deck ở lần đọc kế tiếp; món mới thêm vào nhóm **không** chen vào deck đang chạy.
> - Đổi `Like` / `Dislike` giữa phiên không đổi thứ tự deck hiện tại — nó có hiệu lực từ phiên sau.

## 1.5 Trần cắt lúc dựng, deck co lại thì KHÔNG bù

`capDeck` chạy trước `materializeDeck`, nên `session_decks` lưu tối đa 30 id. Về sau nếu hai món bị gỡ hoặc bị khai `Cannot Eat`, deck còn 28 và **không được bù thêm**.

Đó là hành vi đúng, và nó là hệ quả trực tiếp của §1.4: bù thẻ nghĩa là tính lại, mà tính lại là thứ `BR-048` sinh ra để ngăn. Người dùng thấy `28 / 28`, không phải `28 / 30` — `total` lấy từ độ dài mảng thật, không phải từ hằng số (S2, `E8-T5`).

Ghi vào comment tại chỗ gọi `capDeck`, vì "sao deck có 28 thẻ" sẽ là câu hỏi đầu tiên của người đọc sau.

---

# 2. File tree

```text
src/features/selection/domain/
├── ranking-config.ts            # E8-T1 — +deck.maxCards
├── ranking-config.test.ts
├── deck-page.ts                 # E8-T1 — +capDeck (cạnh getDeckPage)
├── deck-page.test.ts
├── ranking.ts                   # E8-T2 — +blendExploitExplore, +isExploreEligible
├── ranking.test.ts              # +TC-123→128, +ca khử trùng
└── dish-card.ts                 # E8-T2 — +lane

src/features/selection/application/
└── list-deck.ts                 # E8-T2 — nối blend + cap, gán lane (§1.3)

src/features/selection/infrastructure/
└── drizzle-selection-repository.integration.test.ts  # E8-T4 — TC-129, TC-130

.gitignore                       # E8-T0
docs/..._business-rules_v1.8.md  # E8-T4 — sửa BR-048 (§1.4)
```

---

# 3. `E8-T0` — Bỏ theo dõi `.probe-result.json`

[`probe-architecture.sh`](../../../scripts/probe-architecture.sh) ghi `.probe-result.json` rồi `trap` xoá ngay. File này đang **bị git theo dõi**, nên mỗi lần chạy `yarn arch:probe` là `git status` mọc thêm một dòng ` D`.

```bash
echo '.probe-result.json' >> .gitignore
git rm --cached .probe-result.json
```

**DoD:** chạy `yarn arch:probe`, rồi `git status` không nhắc tới file này.

---

# 4. `E8-T1` — Trần 30 thẻ

## 4.1 Hằng số

`RANKING_CONFIG.deck` thêm `maxCards: 30`, kèm chú thích vì sao là 30 chứ không phải số khác: chia hết cho `blockSize = 5` ⇒ đúng 24 Exploit + 6 Explore, không có khối cụt ở cuối.

Cập nhật cả `RankingConfig` type và [Ranking Spec §5](../../what-we-gonna-eat-today_ranking-specification_v1.3.md) — §5 **đã có** dòng `max_cards: 30`, kiểm lại cho khớp.

## 4.2 `capDeck`

Đặt trong [`deck-page.ts`](../../../src/features/selection/domain/deck-page.ts) cạnh `getDeckPage` — cùng bản chất (cắt một mảng đã có trong bộ nhớ), cùng lý lẽ "hàm thuần, không chạm DB".

```ts
/** BR-062 — trần số thẻ mỗi người mỗi phiên. Ngắn hơn trần thì trả nguyên
 *  vẹn, KHÔNG đệm thêm. */
export function capDeck<T>(items: readonly T[], maxCards: number): T[]
```

### Test (`TC-123`, `TC-124`)

| Ca | Đầu vào | Kỳ vọng |
| --- | --- | --- |
| `TC-123` | 150 phần tử, `maxCards = 30` | Độ dài 30, giữ đúng 30 phần tử đầu |
| `TC-124` | 12 phần tử, `maxCards = 30` | Độ dài 12, không đệm |
| — | 0 phần tử | Mảng rỗng, không ném |

---

# 5. `E8-T2` — Trộn hai luồng

## 5.1 `isExploreEligible` và `blendExploitExplore`

Chữ ký ở §1.3 và §1.1. Cả hai là hàm thuần trong `ranking.ts`, nằm trong phạm vi đo coverage.

## 5.2 Nối vào `list-deck.ts`

Trong nhánh `orderedDishIds === null`, sau `buildDeck`:

```ts
const ordered = buildDeck({ sessionId, userId, eligible: rankingInputs }, RANKING_CONFIG)

// BR-047 — chia hai luồng TỪ danh sách đã sắp, giữ nguyên thứ tự tương đối.
// Hai luồng CHỒNG NHAU (Guide §1.1) — `blendExploitExplore` khử trùng bằng Set.
const byId = new Map(rankingInputs.map((r) => [r.dishId, r]))
const explore = ordered.filter((id) => isExploreEligible(byId.get(id)!, RANKING_CONFIG))

// Thứ tự BẮT BUỘC: trộn TRƯỚC, cắt trần SAU (BR-062, DEC-058, Guide §1.2).
const blended = blendExploitExplore({
  exploit: ordered,
  explore,
  blockSize: RANKING_CONFIG.explore.blockSize,
})
const built = capDeck(blended, RANKING_CONFIG.deck.maxCards)
```

`exploit` là **toàn bộ** `ordered`, không phải phần bù của `explore` — đó chính là chỗ hai luồng chồng nhau, và `used` trong `blendExploitExplore` xử lý phần chồng.

Luồng Explore giữ thứ tự của `ordered` (theo điểm) chứ không sắp lại theo $d$ giảm dần như Ranking Spec §2.3 mô tả. Lý do: `buildDeck` đã tie-break tầng 2 bằng $d$ giảm dần, nên trong nhóm cùng điểm thứ tự đã đúng ý; sắp lại toàn bộ theo $d$ sẽ đẩy một món $d = 400$ bị `Dislike` nhẹ lên trước một món $d = 35$ được `Like`. **Ghi chú lệch này vào comment** — nó là một lệch có chủ ý so với đặc tả.

## 5.3 Gắn `lane` lúc đọc

Ở bước `.map()` cuối (nơi đã tính `daysSinceLastEaten`), thêm:

```ts
lane: isExploreEligible(
  { daysSinceLastEaten: d, explicit: explicitPreferenceScore(preferences.get(dish.globalDishId) ?? null) },
  RANKING_CONFIG,
) ? 'EXPLORE' : 'EXPLOIT',
```

Chạy ở **mọi** lần đọc, kể cả khi deck lấy từ `session_decks` — đó là điểm chính của §1.3.

## 5.4 Test

| Ca | Nội dung | Kỳ vọng |
| --- | --- | --- |
| `TC-125` | Deck 30 thẻ, cả hai luồng đều dư món | Vị trí `#5, #10, …, #30` là thẻ explore-eligible |
| `TC-126` | 150 món, đếm nguồn từng thẻ | **Đúng 6** thẻ đến từ luồng Explore (§1.2) |
| `TC-127` | Luồng Explore cạn (mọi món đều vừa ăn) | Khối lấy trọn từ Exploit, đủ 30 thẻ, không vị trí trống |
| `TC-128` | Món $d = 30$ đúng mốc `staleDays` | Đủ điều kiện Explore (biên đóng) |
| — | Món chưa từng ăn, có mặt ở cả hai luồng | **Không** id nào xuất hiện hai lần trong kết quả (§1.1) |
| — | Món chưa từng ăn nhưng `explicit = -1` | **Không** vào luồng Explore |

Ca áp chót là ca canh `used`. Viết nó bằng cách dựng đầu vào mà `exploit` và `explore` chia sẻ phần lớn phần tử, rồi khẳng định `new Set(result).size === result.length`.

---

# 6. `E8-T4` — Ghim bất biến đóng băng

Hai integration test, đặt trong `drizzle-selection-repository.integration.test.ts`:

| Ca | Kịch bản | Kỳ vọng |
| --- | --- | --- |
| `TC-129` | Gọi `listDeck` hai lần liên tiếp | Thứ tự **giống hệt**; `session_decks` có đúng một dòng |
| `TC-130` | Gọi `listDeck`, thêm món mới vào nhóm, gọi lại | Món mới **không** xuất hiện; thứ tự cũ không đổi |

Cộng một ca ở tầng `A` (mock port): đổi `Like` giữa hai lần gọi không đổi thứ tự — ghim câu thứ ba của `BR-048` mới.

Rồi sửa `BR-048` theo §1.4, bump Business Rules `v1.7` → `v1.8`, thêm dòng Change History.

---

# 7. Rủi ro

| Rủi ro | Dấu hiệu | Xử lý |
| --- | --- | --- |
| Trộn bằng `partition` loại trừ | Bốn thẻ đầu mỗi khối toàn món vừa ăn | §1.1 — `exploit` là toàn bộ danh sách |
| Quên `used` | Deck có món lặp | §1.1 — test `new Set(result).size === result.length` |
| Cắt trần trước khi trộn | Vuốt nhiều phiên không thấy món lạ; `TC-126` đếm ra 0 | §1.2 |
| Lưu `lane` vào `session_decks` | Migration không cần thiết; nhãn sai sau khi lọc | §1.3 — suy lại lúc đọc |
| Hai bản sao của vị từ explore | Chia luồng và gắn nhãn lệch nhau | §1.3 — một hàm `isExploreEligible` dùng chung |
| Bù thẻ khi deck co lại | Vi phạm chính `BR-048` vừa siết | §1.5 |

---

# 8. Test Cases coverage

`TC-123`, `TC-124` §4.2 • `TC-125`→`TC-128` §5.4 • `TC-129`, `TC-130` §6 • hai ca không mã: khử trùng và `Dislike` (§5.4).

---

# 9. Thứ tự TDD

1. `E8-T0` — một phút, làm cho xong để `git status` sạch trong suốt slice.
2. `capDeck` test (đỏ) → hàm (xanh). Chưa nối vào `list-deck.ts`.
3. `isExploreEligible` test (đỏ) → hàm (xanh).
4. `blendExploitExplore` test **gồm ca khử trùng** (đỏ) → hàm (xanh).
5. Nối cả ba vào `list-deck.ts` theo §5.2 → `TC-126` xanh.
6. `DishCard.lane` + gán lúc đọc (§5.3) → `tsc` chỉ ra chỗ dựng `DishCard` trong test cần cập nhật.
7. `E8-T4` — hai integration test, rồi sửa `BR-048`.
8. `yarn verify && yarn arch:probe && yarn test:integration`.

Bước 4 viết ca khử trùng **cùng lúc** với ca khối 4+1, không để sau: nó là bất biến chứ không phải trường hợp biên, và một `blendExploitExplore` đã xanh mọi test khác rất khó bị nghi ngờ.

---

# 10. Verify

## 10.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn test:integration
```

## 10.2 Bằng chứng deck có đáy và có món lạ

Chưa có giao diện mới ở slice này, nên bằng chứng nằm ở test và ở database:

```bash
yarn vitest run src/features/selection/domain/ranking.test.ts
```

`TC-126` phải xanh. Nếu nó đếm ra 0, thứ tự trộn/cắt đang ngược — không phải test sai.

Rồi mở một phiên thật trên nhóm có > 30 món, và `yarn db:studio`: `session_decks.ordered_dish_ids` có **đúng 30 phần tử**, và không phần tử nào lặp.

---

# 11. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v3.9.md`

```markdown
# DEC-064 — v1.1 Đóng Băng Deck Toàn Phần; `BR-048` Được Siết Cho Khớp Code

- **Ngày:** 2026-08-26
- **Trạng thái:** Accepted
- **Bối cảnh:** E8 Slice S1

## Quyết định

1. KHÔNG hiện thực phép tính lại deck giữa phiên. Deck materialize đúng một lần
   cho mỗi `(session, user)` và không bao giờ được sắp xếp lại.
2. `BR-048` đổi từ "đóng băng thẻ `index < cursor` khi tính lại" thành cam kết
   mạnh hơn: không có phép tính lại nào.
3. Deck co lại dưới trần do lọc thì KHÔNG bù thêm thẻ.
4. Cờ `lane` KHÔNG lưu vào `session_decks`; nó được suy lại ở mỗi lần đọc bằng
   `isExploreEligible`.

## Rationale

1. Hành vi đóng băng toàn phần đã tồn tại từ E4 và chưa từng gây vấn đề. `F19`
   ước lượng 6 giờ cho một cơ chế mà phần lớn đã có — và cơ chế "tính lại có
   chọn lọc" sẽ cần lưu cursor phía server, tức thêm một lượt ghi vào đường
   nóng `NFR-02`, để giải quyết một đau chưa ai gặp.
2. **Một quy tắc lỏng hơn code thật là một cái bẫy.** Nó là chỗ mà lần refactor
   sau sẽ nới code cho "đúng đặc tả" rồi làm hỏng thứ đang chạy tốt. Đặc tả nên
   ghi cam kết mạnh nhất mà hệ thống thật sự giữ.
3. Bù thẻ chính là tính lại. Cho phép nó là mở lại đúng cánh cửa vừa đóng.
4. `session_decks` lưu mảng id trần. Lưu thêm `lane` là đổi schema cho một thứ
   suy lại được từ dữ liệu đã có trong tay ở mỗi lần đọc — và nó sẽ đóng băng
   một nhãn mô tả MÓN, trong khi món đổi trạng thái được (ăn thêm một lần, đổi
   Like/Dislike). Suy lại lúc đọc thì nhãn luôn đúng với hiện tại.

## Consequence

- `F19` từ 6 giờ còn 2 giờ; bốn giờ chuyển sang `F51` (`E8-T7`) và phần dư.
- Business Rules lên `v1.8`.
- Một món đứng ở ô Exploit vẫn có thể mang nhãn `EXPLORE` — nhãn mô tả món,
  không mô tả ô. Đây là chủ đích, ghi rõ ở `E8-T3` (S2).
```

---

# 12. Master Plan

[§16.3](../../what-we-gonna-eat-today_master-plan_v2.1.md): gắn nhãn `S1` cho `E8-T0`, `E8-T1`, `E8-T2`, `E8-T4`; `E8-T4` đổi ước lượng 6h → 2h kèm lý do trỏ về `DEC-064`.
