# ⚖️ Implementation Guide — E5 Slice S3: Finalize đầy đủ và Session Score

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-20`
> - **Upstream:** [Master Plan](../what-we-gonna-eat-today_master-plan_v1_0.md) (`E5-T5`, `E5-T6`) • [SDD](../what-we-gonna-eat-today_sdd_v0_1.md) (`SPEC-014`, `SPEC-016`) • [Ranking Spec](../what-we-gonna-eat-today_ranking-specification_v0_1.md) (§3, §5) • [Business Rules](../what-we-gonna-eat-today_business-rules_v1.4.md) (`BR-050`, `BR-052`, `BR-054`) • [Test Cases](../what-we-gonna-eat-today_test-cases-specification_v0_1.md) (`TC-058`→`TC-062`, `TC-067`→`TC-075`, `TC-110`, `TC-111`)
> - **Tiền đề:** S2 đã code (`evaluateRequired`, `session_rules`), `E1-T11` đã code (`finalizeSession` rút gọn + `commitFinalize`), `E4-T5` đã code (`interactions` là effective state).
>
> ⚖️ *Slice nối dây. Không có bảng mới, không có UI. Hai việc: cho `finalizeSession` biết luật, và cho màn tổng hợp (S4) một bảng điểm để hiển thị.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E5-T5` | Finalize revalidate đầy đủ trong transaction | 4 | `src/features/meal/application/finalize-session.ts` | `TC-074` và `TC-075` pass: Rule theo snapshot, System Tag theo hiện tại |
| `E5-T6` | `computeSessionScore` chuẩn hoá theo $T$ | 2.5 | `src/features/selection/domain/ranking.ts` | `TC-111` pass: $T = 1$ không chia cho 0 |

- [ ] `TC-058`→`TC-062`, `TC-111` pass
- [ ] `TC-067`→`TC-075`, `TC-110` pass
- [ ] `finalizeSession` **không bị viết lại** — bước 5-6 chèn đúng vào dòng mốc đã chừa sẵn từ `E1-T11`
- [ ] Không có hằng số trọng số mới nào được khai: `RANKING_CONFIG.sessionRanking` đã có sẵn từ E4
- [ ] `yarn verify && yarn arch:probe && yarn test:integration` xanh

---

# 1. Sáu phát hiện — đọc trước khi gõ

## 1.1 `finalizeSession` đã chừa sẵn chỗ — dùng đúng chỗ đó

`src/features/meal/application/finalize-session.ts` viết từ `E1-T11` có ghi chú nguyên văn:

> `SPEC-016` **RÚT GỌN** — Chạy đúng bước 1-4 và 7 nguyên văn SDD; **CỐ Ý BỎ bước 5-6** (đánh giá Required Rule trên Session Rule đã snapshot) — Group Rule/Session Rule chưa tồn tại (E5). Khi E5 landed, chèn bước rule evaluation vào ĐÚNG GIỮA bước 4 và bước ghi cuối, **không viết lại hàm này từ đầu**.

và một dòng mốc trong thân hàm:

```ts
// BỎ bước 5-6 ở đây (E5-T3 chèn vào).
```

Chèn vào đúng dòng đó. Cụ thể là bốn dòng code (§4). Mọi thứ khác của hàm — thứ tự bước 1→4, `commitFinalize` nguyên tử ở cuối, `buildDefaultEatingHistory` chuẩn bị trước transaction — giữ nguyên không chạm. `TC-067`→`TC-071` đang xanh và phải **vẫn xanh** sau slice này; nếu chúng đỏ thì bạn đã viết lại thay vì chèn vào.

## 1.2 `TC-074` và `TC-075` là hai nguồn dữ liệu ở HAI thời điểm khác nhau

Đây là phần dễ làm sai nhất của `E5-T5`, và hai test case chỉ đúng khi làm đúng cả hai:

| TC | Đọc gì | Từ thời điểm nào |
| --- | --- | --- |
| `TC-074` | Rule | **Lúc Start** — bảng `session_rules` (S2), KHÔNG phải `group_rules` |
| `TC-075` | System Tag của món | **Lúc bấm Chốt** — bảng `group_dish_tags` hiện tại |

`SPEC-016` bước 2 nói đúng điều đó trong một câu: *"Đánh giá `Required Rules` theo **Session Rule Snapshot** kết hợp với **System Tag hiện tại** của món"*, và `BR-052` nhắc lại: *"Kiểm tra tính hợp lệ toàn diện tại thời điểm bấm Chốt bữa bằng System Tag hiện tại"*.

Không phải bất nhất. Hai vế trả lời hai câu hỏi khác nhau:

- *"Nhà này đòi mâm cơm có gì?"* — đã chốt lúc mở phiên, không ai được đổi luật giữa chừng (`BR-015`).
- *"Món này là món gì?"* — sự thật về món ăn, và sự thật mới nhất là sự thật đúng. Admin sửa nhãn *Bò kho bánh mì* từ `MAIN` thành `MAIN + SOUP` lúc 6 giờ chiều thì lúc 6 giờ rưỡi nó **là** món canh.

Hệ quả cho code: rule đi qua `RuleRepository.listSessionRules` (feature `rule`, `meal → rule` đã được phép), tag đi qua một method **mới** của `MealRepository` đọc thẳng `group_dish_tags`.

## 1.3 `meal` không được import `dish`, nên tag đi qua port của chính `meal`

`ALLOWED_CROSS_FEATURE.meal = ['rule', 'history']` — không có `dish`. Nhưng bước 6 cần `group_dish_tags`.

Đây **không** phải lý do để nới bảng: `MealRepository` đã có tiền lệ đúng khuôn này — `findInactiveDishIds` đọc `group_dishes` mà không cần import feature `dish`, vì tầng `infrastructure` chỉ đang đọc *bảng*, không đang dùng *kiến thức miền* của feature khác. Ghi chú sẵn có trong `meal-repository.ts` giải thích chính xác cách nghĩ này.

Thêm `findSystemTagsByGroupDish` vào `MealRepository` theo đúng khuôn đó. Kiểu `SystemTag` lấy từ `@/shared/domain/system-tag` (đã chuyển ở S1, `DEC-040`) — không import từ `features/dish`.

## 1.4 `SPEC-014`: bỏ số hạng $X$, giữ $H$ — và $H$ không phải thứ đang có sẵn

Công thức `SPEC-014`:

$$\text{Score} = \frac{1.00 \times P - 0.70 \times N - 1.00 \times X - 0.30 \times H}{T}$$

| Ký hiệu | Nghĩa | v1.0 |
| :---: | --- | --- |
| $P$ | Số Participant vuốt phải | Có — `interactions.type = 'SWIPE_RIGHT'` |
| $N$ | Số Participant vuốt trái | Có — `interactions.type = 'SWIPE_LEFT'` |
| $X$ | Số Participant "Cannot Eat" | **Không** — `F15`, v1.1. Luôn bằng 0 |
| $H$ | Số Participant đã ăn gần đây | Có — `eating_history` trong cửa sổ cooldown |
| $T$ | Tổng số Participant | Có — `participants` state ≠ `REMOVED` |

$X$ **không đưa vào kiểu đầu vào** — cùng lý lẽ đã ghi ở `ranking.ts:5` (*"thêm một trường mà không hàm nào tính ra được giá trị thật cho nó chỉ tạo ảo giác tính năng đã có"*). Trọng số `cCannotEat` vẫn nằm trong `RANKING_CONFIG.sessionRanking` — hằng số tập trung là chuyện NƠI ĐỊNH NGHĨA, khác chuyện nơi sử dụng (Ranking Spec §1 nguyên tắc 4, đã áp ở E4-S1 §3).

$H$ là số hạng **duy nhất chưa có đường dữ liệu**. Nó không phải `recencyPenalty` của `SPEC-020` (thứ đó là $R \in [0,1]$ của MỘT người cho MỘT món); $H$ là **đếm số người** trong nhóm đã ăn món đó gần đây. Cần một câu truy vấn tổng hợp mới ở `HistoryRepository` (§5.2) — đừng gọi `findEatingDates` N lần cho N participant.

Đối chiếu `TC-059` để chắc chắn hiểu đúng: $T{=}4$, $P{=}3$, $N{=}1$, $H{=}2$ →

$$\frac{3 \times 1.0 - 1 \times 0.7 - 2 \times 0.3}{4} = \frac{3 - 0.7 - 0.6}{4} = \frac{1.7}{4} = 0.425 \approx 0.43$$

Khớp. Test so bằng `toBeCloseTo(0.43, 2)`, không `toBe`.

## 1.5 `T = 0` không xảy ra, nhưng vẫn phải có nhánh

`TC-111` chỉ đòi $T = 1$ không lỗi. Nhưng chia cho `participantCount` mà không nghĩ tới 0 là chỗ một `NaN` sẽ lặng lẽ đi xuyên qua cả bảng xếp hạng và hiện lên màn hình dưới dạng "NaN" bên cạnh tên món.

$T = 0$ trên thực tế không tới được: Creator luôn là Participant đầu tiên (`BR-020`, `createDraftWithCreatorParticipant`), và v1.0 chưa có `F25` Gỡ Participant. Nhưng "không tới được" là tính chất của *dữ liệu hôm nay*, còn `computeSessionScore` là hàm thuần sống lâu hơn thế. Trả `0` khi $T \le 0$ và ghi lý do ngay tại chỗ — một dòng, không phải phòng thủ thừa.

## 1.6 `SPEC-014` không định nghĩa tie-break — phải tự chọn, và phải xác định

`SPEC-010` (deck cá nhân) có tie-break ba tầng viết rõ. `SPEC-014` không có gì. Nhưng hai món cùng điểm là chuyện thường xuyên: $T{=}4$ với $P \in \{0..4\}$ chỉ cho 5 mức điểm khác nhau nếu $N{=}H{=}0$.

Thứ tự không xác định thì màn tổng hợp (S4) sẽ **đổi thứ tự giữa hai lần tải trang** — người dùng đọc đó là dữ liệu đang thay đổi. Chọn hai tầng, cả hai đều có nghĩa với người đọc:

1. `score` giảm dần.
2. `proposedCount` ($P$) giảm dần — cùng điểm thì món được nhiều người *chủ động thích* hơn lên trước, chứ không phải món ít bị ghét hơn.
3. `dishId` tăng dần — không có nghĩa gì với người dùng, nhưng xác định, và `group_dishes.id` là UUID v7 nên nó xấp xỉ "món thêm vào nhóm sớm hơn".

Không dùng `stableHash` như `buildDeck`: hash ở đó để **hai người thấy thứ tự khác nhau**, còn ở đây cả nhà nhìn cùng một bảng, thứ tự phải giống nhau.

---

# 2. File tree

```
src/features/selection/domain/
  ranking.ts                                   ~ SỬA — computeSessionScore + rankSession (§3)
  ranking.test.ts                              ~ SỬA — TC-058→061, TC-111 (§3.1)
  ranking-config.ts                            (không đụng — sessionRanking đã có từ E4)

src/features/selection/application/
  list-session-ranking.ts                      + MỚI (§5)
  list-session-ranking.test.ts                 + MỚI (§5.3)
  selection-repository.ts                      ~ SỬA — 3 method (§5.1)

src/features/history/application/
  history-repository.ts                        ~ SỬA — countRecentEatersByDish (§5.2)

src/features/selection/infrastructure/
  drizzle-selection-repository.ts               ~ SỬA (§6)
  drizzle-selection-repository.integration.test.ts ~ SỬA

src/features/history/infrastructure/
  drizzle-history-repository.ts                 ~ SỬA (§6)
  drizzle-history-repository.integration.test.ts ~ SỬA

src/features/meal/application/
  meal-repository.ts                            ~ SỬA — findSystemTagsByGroupDish (§4.1)
  finalize-session.ts                           ~ SỬA — chèn bước 5-6 (§4)
  finalize-session.test.ts                      ~ SỬA — TC-072→075, TC-110 (§4.2)

src/features/meal/infrastructure/
  drizzle-meal-repository.ts                    ~ SỬA (§4.1)
  drizzle-meal-repository.integration.test.ts   ~ SỬA — TC-074, TC-075
```

---

# 3. `ranking.ts` — thêm `computeSessionScore` và `rankSession` (E5-T6)

Thêm vào cuối `src/features/selection/domain/ranking.ts` (Master Plan chỉ định đúng file này; nó đã chứa `computePersonalScore` và `buildDeck`, và hai họ hàm ở cùng chỗ giúp thấy ngay chúng KHÁC nhau ở đâu).

```ts
/**
 * SPEC-014 — số đếm thô của MỘT món trong MỘT phiên.
 *
 * KHÔNG có `cannotEatCount` ($X$): F15 là v1.1, mọi giá trị đều sẽ là 0 —
 * cùng lý lẽ đã áp cho `RankingInput` ở đầu file. Trọng số `cCannotEat` vẫn
 * nằm trong RANKING_CONFIG vì hằng số tập trung nói về nơi ĐỊNH NGHĨA
 * (Ranking Spec §1 nguyên tắc 4).
 *
 * `recentEaterCount` ($H$) là SỐ NGƯỜI trong phiên đã ăn món này trong cửa sổ
 * cooldown — KHÁC hẳn `recencyPenalty` của SPEC-020 ($R \in [0,1]$ của MỘT
 * người cho MỘT món). Hai số hạng cùng nói về "vừa ăn gần đây" nhưng ở hai
 * đơn vị và hai phạm vi khác nhau; nhầm chúng là lỗi khó thấy nhất ở slice này.
 */
export type SessionScoreInput = {
  readonly proposedCount: number
  readonly rejectedCount: number
  readonly recentEaterCount: number
}

/**
 * $$\text{Score} = \frac{a P - b N - d H}{T}$$
 *
 * Chuẩn hoá theo $T$ để điểm so sánh được giữa các phiên có số người khác nhau
 * (TC-060: thêm người thứ 5 thì cùng $P=3$ phải cho điểm thấp hơn).
 *
 * $T \le 0$ trả 0 chứ không `NaN`. Trên thực tế không tới được — Creator luôn
 * là Participant (BR-020) và v1.0 chưa có F25 Gỡ Participant — nhưng một `NaN`
 * lọt qua đây sẽ hiện lên màn hình S-10 cạnh tên món, và không test nào ở
 * tầng trên bắt kịp. TC-111 giữ nhánh $T = 1$.
 */
export function computeSessionScore(
  input: SessionScoreInput,
  participantCount: number,
  config: RankingConfig,
): number {
  if (participantCount <= 0) {
    return 0
  }

  const { aSwipeRight, bSwipeLeft, dRecent } = config.sessionRanking

  return (
    (aSwipeRight * input.proposedCount -
      bSwipeLeft * input.rejectedCount -
      dRecent * input.recentEaterCount) /
    participantCount
  )
}

export type SessionDishInput = SessionScoreInput & {
  /** `group_dishes.id`. */
  readonly dishId: string
  readonly name: string
}

export type RankedDish = SessionDishInput & {
  readonly score: number
}

export type SessionRankingResult = {
  readonly ranked: readonly RankedDish[]
  /** TC-061 — món CHƯA AI tương tác. Không có điểm, không nằm trong `ranked`. */
  readonly untouched: readonly SessionDishInput[]
}

/**
 * SPEC-014 — tách bảng xếp hạng thành hai mục đúng như đầu ra spec mô tả:
 * `{ ranked, untouched }`.
 *
 * "Chưa ai tương tác" xét trên $P$ và $N$, KHÔNG xét $H$: một món cả nhà vừa
 * ăn hôm qua mà chưa ai vuốt vẫn là món chưa ai tương tác (TC-061). Cho nó một
 * điểm âm rồi xếp cuối bảng `ranked` là nói dối — người dùng sẽ đọc thành "cả
 * nhà không thích món này".
 *
 * Tie-break hai tầng (SPEC-014 không quy định, Guide §1.6): `score` giảm dần →
 * $P$ giảm dần → `dishId` tăng dần. KHÔNG dùng `stableHash` như `buildDeck`:
 * hash ở đó để hai người thấy thứ tự KHÁC nhau, ở đây cả nhà phải nhìn cùng
 * một bảng.
 *
 * `untouched` giữ nguyên thứ tự đầu vào (`group_dishes.id`) — không có tín
 * hiệu nào để sắp, và bịa ra một thứ tự là ngụ ý một thứ hạng không tồn tại.
 */
export function rankSession(
  input: {
    readonly dishes: readonly SessionDishInput[]
    readonly participantCount: number
  },
  config: RankingConfig,
): SessionRankingResult {
  const untouched = input.dishes.filter(
    (dish) => dish.proposedCount === 0 && dish.rejectedCount === 0,
  )

  const ranked = input.dishes
    .filter((dish) => dish.proposedCount > 0 || dish.rejectedCount > 0)
    .map((dish) => ({ ...dish, score: computeSessionScore(dish, input.participantCount, config) }))
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score
      }
      if (a.proposedCount !== b.proposedCount) {
        return b.proposedCount - a.proposedCount
      }
      return a.dishId < b.dishId ? -1 : a.dishId > b.dishId ? 1 : 0
    })

  return { ranked, untouched }
}
```

## 3.1 Test — thêm vào `ranking.test.ts`

```ts
import { RANKING_CONFIG } from './ranking-config'
import { computeSessionScore, rankSession, type SessionDishInput } from './ranking'

const dish = (over: Partial<SessionDishInput> = {}): SessionDishInput => ({
  dishId: 'd1',
  name: 'Cá kho',
  proposedCount: 0,
  rejectedCount: 0,
  recentEaterCount: 0,
  ...over,
})

describe('computeSessionScore', () => {
  // TC-058 — T=4, P=3, N=0, H=0 → 3/4.
  it('TC-058', () => {
    const score = computeSessionScore(
      { proposedCount: 3, rejectedCount: 0, recentEaterCount: 0 },
      4,
      RANKING_CONFIG,
    )
    expect(score).toBeCloseTo(0.75, 5)
  })

  // TC-059 — (3 - 0.7 - 0.6) / 4 = 0.425.
  it('TC-059', () => {
    const score = computeSessionScore(
      { proposedCount: 3, rejectedCount: 1, recentEaterCount: 2 },
      4,
      RANKING_CONFIG,
    )
    expect(score).toBeCloseTo(0.43, 2)
  })

  // TC-060 — thêm người thứ 5, cùng P=3 → 0.6.
  it('TC-060 — chuẩn hoá theo T', () => {
    const score = computeSessionScore(
      { proposedCount: 3, rejectedCount: 0, recentEaterCount: 0 },
      5,
      RANKING_CONFIG,
    )
    expect(score).toBeCloseTo(0.6, 5)
  })

  // TC-111 — T=1, P=1 → 1.0, không chia cho 0.
  it('TC-111 — T = 1', () => {
    const score = computeSessionScore(
      { proposedCount: 1, rejectedCount: 0, recentEaterCount: 0 },
      1,
      RANKING_CONFIG,
    )
    expect(score).toBe(1)
  })

  it('T = 0 trả 0, không NaN', () => {
    const score = computeSessionScore(
      { proposedCount: 1, rejectedCount: 0, recentEaterCount: 0 },
      0,
      RANKING_CONFIG,
    )
    expect(score).toBe(0)
    expect(Number.isNaN(score)).toBe(false)
  })
})

describe('rankSession', () => {
  // TC-061.
  it('món chưa ai tương tác nằm ở untouched, không có điểm', () => {
    const result = rankSession(
      {
        dishes: [dish({ dishId: 'a', proposedCount: 1 }), dish({ dishId: 'b' })],
        participantCount: 2,
      },
      RANKING_CONFIG,
    )

    expect(result.ranked.map((d) => d.dishId)).toEqual(['a'])
    expect(result.untouched.map((d) => d.dishId)).toEqual(['b'])
    expect(result.untouched[0]).not.toHaveProperty('score')
  })

  it('món chỉ bị vuốt trái VẪN nằm trong ranked', () => {
    const result = rankSession(
      { dishes: [dish({ dishId: 'a', rejectedCount: 2 })], participantCount: 2 },
      RANKING_CONFIG,
    )

    expect(result.untouched).toEqual([])
    expect(result.ranked[0]?.score).toBeCloseTo(-0.7, 5)
  })

  it('món vừa ăn gần đây nhưng chưa ai vuốt vẫn là untouched', () => {
    const result = rankSession(
      { dishes: [dish({ dishId: 'a', recentEaterCount: 3 })], participantCount: 3 },
      RANKING_CONFIG,
    )

    expect(result.untouched.map((d) => d.dishId)).toEqual(['a'])
  })

  it('tie-break tầng 2: cùng điểm thì P cao hơn lên trước', () => {
    // Cặp cho ra CÙNG một số dấu phẩy động, không phải "gần bằng":
    //   z: P=1, N=2, H=1 → 1 - 0.7*2 - 0.3*1 = -0.7
    //   a: P=0, N=1, H=0 → 0 - 0.7*1 - 0.3*0 = -0.7
    // `dishId` cố ý ngược chiều kỳ vọng ('z' > 'a') để ca này KHÔNG pass được
    // nhờ tầng 3.
    const result = rankSession(
      {
        dishes: [
          dish({ dishId: 'a', proposedCount: 0, rejectedCount: 1, recentEaterCount: 0 }),
          dish({ dishId: 'z', proposedCount: 1, rejectedCount: 2, recentEaterCount: 1 }),
        ],
        participantCount: 4,
      },
      RANKING_CONFIG,
    )

    expect(result.ranked[0]?.score).toBe(result.ranked[1]?.score)
    expect(result.ranked.map((d) => d.dishId)).toEqual(['z', 'a'])
  })

  it('tie-break tầng cuối theo dishId, xác định giữa hai lần gọi', () => {
    const dishes = [
      dish({ dishId: 'z', proposedCount: 1 }),
      dish({ dishId: 'a', proposedCount: 1 }),
    ]

    expect(rankSession({ dishes, participantCount: 2 }, RANKING_CONFIG).ranked.map((d) => d.dishId))
      .toEqual(['a', 'z'])
    expect(rankSession({ dishes, participantCount: 2 }, RANKING_CONFIG).ranked.map((d) => d.dishId))
      .toEqual(['a', 'z'])
  })
})
```

---

# 4. `finalize-session.ts` — chèn bước 5-6 (E5-T5)

Thay đúng dòng `// BỎ bước 5-6 ở đây (E5-T3 chèn vào).` bằng:

```ts
  // Bước 5 — Session Rule ĐÃ SNAPSHOT lúc Start (TC-074). KHÔNG đọc
  // `group_rules`: Admin đổi quy định sau khi phiên chạy không được đổi luật
  // của phiên đang chạy (BR-015).
  const rules = await deps.rules.listSessionRules(input.sessionId)

  // Bước 6 — System Tag HIỆN TẠI của món (TC-075, BR-052). KHÁC bước 5 về
  // thời điểm một cách CÓ CHỦ Ý: "nhà này đòi mâm cơm có gì" đã chốt lúc Start;
  // "món này là món gì" thì sự thật mới nhất là sự thật đúng.
  const tagsByDish = await deps.meal.findSystemTagsByGroupDish(draft.groupDishIds)
  const evaluation = evaluateRequired({
    rules,
    dishes: draft.groupDishIds.map((groupDishId) => ({
      systemTags: tagsByDish.get(groupDishId) ?? [],
    })),
  })
  if (!evaluation.satisfied) {
    // TC-072 — phiên GIỮ NGUYÊN `ACTIVE`. Không có lệnh ghi nào đã chạy tới
    // đây, nên "giữ nguyên" là hệ quả của thứ tự bước, không phải của một lệnh
    // rollback nào.
    return err(
      failure('ERR_REQUIRED_RULE_FAILED', {
        sessionId: input.sessionId,
        // E5-T9 in "Còn thiếu: 1 món canh" ngay trên nút chốt — chi tiết phải
        // đi kèm mã lỗi, không phải để presentation tự tra lại.
        shortfalls: evaluation.shortfalls,
      }),
    )
  }
```

và thêm `rules: RuleRepository` vào `FinalizeSessionDeps`:

```ts
export type FinalizeSessionDeps = {
  readonly meal: MealRepository
  /** `meal → rule` đã nằm sẵn trong `ALLOWED_CROSS_FEATURE` từ E0-T2 —
   *  chiều này được dự trù đúng cho khoảnh khắc này. */
  readonly rules: RuleRepository
}
```

Cập nhật khối ghi chú đầu hàm: bỏ chữ "RÚT GỌN", bỏ đoạn "CỐ Ý BỎ bước 5-6", ghi lại rằng hàm nay chạy đủ 7 bước của `SPEC-016`, và giữ lại câu giải thích vì sao bước 7 là `commitFinalize`.

## 4.1 `MealRepository` — thêm một method

```ts
import type { SystemTag } from '@/shared/domain/system-tag'

  /**
   * SPEC-016 bước 6 / BR-052 — System Tag HIỆN TẠI của các món trong nháp.
   *
   * Đọc thẳng `group_dish_tags` mà không import `features/dish`: cùng khuôn
   * `findInactiveDishIds` ngay trên — tầng infrastructure đang đọc một BẢNG,
   * không đang mượn KIẾN THỨC MIỀN của feature khác. `ALLOWED_CROSS_FEATURE`
   * không có `meal → dish` và không cần có.
   *
   * Món không có tag nào KHÔNG xuất hiện trong Map. Người gọi dùng `?? []` —
   * "món chưa gắn nhãn" là trạng thái hợp lệ (E2-T5 cho phép mảng rỗng), không
   * phải lỗi dữ liệu.
   */
  findSystemTagsByGroupDish(
    groupDishIds: readonly string[],
  ): Promise<Map<string, SystemTag[]>>
```

Hiện thực bằng một câu `SELECT group_dish_id, system_tag FROM group_dish_tags WHERE group_dish_id IN (…)` rồi gom về Map ở TS, dùng `toSystemTags`… **không** — `toSystemTags` sống ở `features/dish`. Gom tay, và giữ thứ tự theo `SYSTEM_TAGS` từ `@/shared/domain/system-tag` để `toEqual` trong test là xác định.

## 4.2 Test — mở rộng `finalize-session.test.ts`

Fake `RuleRepository` thêm vào deps hiện có. Năm ca mới, và **`TC-067`→`TC-071` phải chạy lại nguyên vẹn** với `rules.listSessionRules → []`:

| Ca | TC | Khẳng định |
| --- | :---: | --- |
| Rule rỗng | `TC-110` | Nháp 1 món, `listSessionRules → []` → chốt thành công |
| Thiếu canh | `TC-072` | Rule `SOUP≥1`, nháp toàn `MAIN` → `ERR_REQUIRED_RULE_FAILED`, `commitFinalize` **không** được gọi |
| `shortfalls` trong `details` | `TC-072` | `error.details.shortfalls` = `[{ systemTag:'SOUP', minimumCount:1, actual:0, missing:1 }]` |
| Món hai tag | `TC-073` | Rule `MAIN≥1` + `SOUP≥1`, một món `['MAIN','SOUP']` → thành công |
| Rule đọc từ snapshot | `TC-074` | `listSessionRules` được gọi với `sessionId`; `listGroupRules` **không** tồn tại trong deps — bằng chứng cấu trúc, mạnh hơn bằng chứng hành vi |
| Tag đọc lúc chốt | `TC-075` | `findSystemTagsByGroupDish` được gọi SAU `getDraft`, và giá trị nó trả về là thứ quyết định kết quả |

`TC-074` và `TC-075` ở tầng `I` cần integration test trong `drizzle-meal-repository.integration.test.ts`: đổi `group_rules` sau khi snapshot (kết quả không đổi), và đổi `group_dish_tags` sau khi Start (kết quả **đổi**).

---

# 5. `list-session-ranking.ts` — use case cho màn S-10

> [!WARNING]
> Nếu bạn thấy mình gõ `import { computeRecencyPenalty } from '@/features/history/domain/recency'` trong file này thì đang nhầm $H$ với $R$ — đọc lại §1.4. File này **không** import `recency.ts`.

```ts
import type { HistoryRepository } from '@/features/history/application/history-repository'
import { RANKING_CONFIG } from '../domain/ranking-config'
import { rankSession, type SessionRankingResult } from '../domain/ranking'
import type { SelectionRepository } from './selection-repository'
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

export type ListSessionRankingDeps = {
  readonly selection: SelectionRepository
  readonly history: HistoryRepository
}

export type ListSessionRankingInput = {
  readonly sessionId: string
  readonly userId: string
  /** `session.decisionDate` — mốc tính "gần đây" của $H$. Truyền vào chứ không
   *  đọc `new Date()`: cùng nguyên tắc đã áp cho `computeRecencyPenalty` ở
   *  E4-T1, và là điều kiện để test không phải mock thời gian. */
  readonly referenceDate: string
}

/**
 * SPEC-014 — bảng xếp hạng đồng thuận cho Creator.
 *
 * "Yêu cầu Creator" (SPEC-014 đầu vào) → TC-062. Kiểm quyền TRƯỚC mọi lần đọc
 * dữ liệu: một Member không phải Creator không được biết cả nhà đang nghiêng
 * về món gì trước khi bữa được chốt.
 *
 * BR-054 — Rule KHÔNG tham gia vào điểm. Bảng này phản ánh trung thực sở thích;
 * Rule Engine chỉ chạy lúc Finalize. Không có `evaluateRequired` ở đây, và
 * đừng thêm vào.
 */
export async function listSessionRanking(
  deps: ListSessionRankingDeps,
  input: ListSessionRankingInput,
): Promise<Result<SessionRankingResult, Failure>> {
  const session = await deps.selection.findSessionForRanking(input.sessionId)
  if (session === null) {
    return err(failure('ERR_SESSION_NOT_ACTIVE', { sessionId: input.sessionId }))
  }
  if (session.creatorUserId !== input.userId) {
    return err(failure('ERR_NOT_SESSION_CREATOR', { sessionId: input.sessionId }))
  }

  const [counts, participantUserIds] = await Promise.all([
    deps.selection.countInteractionsByDish(input.sessionId),
    deps.selection.listRankingParticipantUserIds(input.sessionId),
  ])

  const recentEaters = await deps.history.countRecentEatersByDish({
    userIds: participantUserIds,
    globalDishIds: counts.map((row) => row.globalDishId),
    referenceDate: input.referenceDate,
    windowDays: RANKING_CONFIG.history.cooldownWindowDays,
  })

  return ok(
    rankSession(
      {
        participantCount: participantUserIds.length,
        dishes: counts.map((row) => ({
          dishId: row.groupDishId,
          name: row.name,
          proposedCount: row.proposedCount,
          rejectedCount: row.rejectedCount,
          recentEaterCount: recentEaters.get(row.globalDishId) ?? 0,
        })),
      },
      RANKING_CONFIG,
    ),
  )
}
```

## 5.1 `SelectionRepository` — ba method mới

```ts
  /** SPEC-014. `null` nếu Session không tồn tại. Trả `creatorUserId` để
   *  `listSessionRanking` kiểm quyền mà không cần import feature `session`. */
  findSessionForRanking(
    sessionId: string,
  ): Promise<{ creatorUserId: string; decisionDate: string } | null>

  /**
   * SPEC-014 — MỘT câu GROUP BY cho TOÀN BỘ món ACTIVE của phiên, kể cả món
   * 0 tương tác (LEFT JOIN, không INNER): TC-061 cần chúng để xếp vào
   * `untouched`, và một câu đếm bỏ sót chúng thì không cách nào phân biệt
   * "chưa ai vuốt" với "không có trong nhóm".
   *
   * Chỉ đọc `interactions` (effective state), KHÔNG đọc `interaction_events` —
   * Tech Spec §3.2 đã ghi lý do khi tách hai bảng.
   *
   * Participant `REMOVED` không được tính (BR-026) — cùng luật với
   * `listActiveParticipantUserIds` của `meal`.
   */
  countInteractionsByDish(sessionId: string): Promise<
    {
      groupDishId: string
      globalDishId: string
      name: string
      proposedCount: number
      rejectedCount: number
    }[]
  >

  /** $T$ của SPEC-014 và đồng thời tập người để đếm $H$. ACTIVE hoặc
   *  COMPLETED — `REMOVED` không tính (BR-026). */
  listRankingParticipantUserIds(sessionId: string): Promise<string[]>
```

## 5.2 `HistoryRepository` — một method mới

```ts
  /**
   * $H$ của SPEC-014 — với mỗi món, ĐẾM SỐ NGƯỜI trong `userIds` đã ăn nó
   * trong `windowDays` ngày tính lùi từ `referenceDate`.
   *
   * KHÁC `findEatingDates` (đọc mọi ngày ăn của MỘT người để tính $R$ của
   * SPEC-020). Đừng hiện thực method này bằng cách gọi `findEatingDates` N lần:
   * $H$ là một câu `COUNT(DISTINCT user_id) … GROUP BY global_dish_id`, và N
   * round-trip cho một Group 8 người trên deck 60 món là 8 lần đi về mạng để
   * lấy thứ Postgres trả trong một lần.
   *
   * `COUNT(DISTINCT user_id)`, không `COUNT(*)`: một người ăn cùng món hai
   * ngày trong tuần vẫn là MỘT người (BR-046 Multi-source Collapse).
   *
   * Món không ai ăn gần đây KHÔNG có mặt trong Map — người gọi dùng `?? 0`.
   */
  countRecentEatersByDish(input: {
    readonly userIds: readonly string[]
    readonly globalDishIds: readonly string[]
    readonly referenceDate: string
    readonly windowDays: number
  }): Promise<Map<string, number>>
```

## 5.3 Test — `list-session-ranking.test.ts`

| Ca | TC | Khẳng định |
| --- | :---: | --- |
| Không phải Creator | `TC-062` | `ERR_NOT_SESSION_CREATOR`; `countInteractionsByDish` **không** được gọi |
| Món chưa ai vuốt | `TC-061` | Nằm ở `untouched` |
| $T$ đúng | `TC-060` | 5 participant → điểm chia cho 5 |
| $H$ nối đúng | — | `countRecentEatersByDish` trả `{ g1 → 2 }` → món có `globalDishId = g1` nhận `recentEaterCount: 2` |
| Không gọi rule | `BR-054` | deps không có `RuleRepository` — bằng chứng cấu trúc |

---

# 6. Infrastructure

`countInteractionsByDish` — một câu, `LEFT JOIN` từ `group_dishes`:

```sql
SELECT gd.id                                              AS group_dish_id,
       gd.global_dish_id,
       g.name,
       COUNT(*) FILTER (WHERE i.type = 'SWIPE_RIGHT')     AS proposed_count,
       COUNT(*) FILTER (WHERE i.type = 'SWIPE_LEFT')      AS rejected_count
FROM selection_sessions s
JOIN group_dishes gd  ON gd.group_id = s.group_id AND gd.state = 'ACTIVE'
JOIN global_dishes g  ON g.id = gd.global_dish_id
LEFT JOIN interactions i ON i.group_dish_id = gd.id AND i.session_id = s.id
LEFT JOIN participants p ON p.id = i.participant_id AND p.state <> 'REMOVED'
WHERE s.id = $1
GROUP BY gd.id, gd.global_dish_id, g.name
ORDER BY gd.id
```

> [!WARNING]
> `COUNT(*) FILTER` trả `bigint`, mà driver Neon đưa về JavaScript dưới dạng **chuỗi**. `Number(row.proposedCount)` ở tầng infrastructure trước khi trả qua port — nếu quên, `computeSessionScore` sẽ nối chuỗi thay vì cộng số và cho ra điểm vô nghĩa mà không test nào ở tầng `D` bắt được. Đây là bẫy đã gặp ở E3-T6 (`findSessionOverview`); xem cách nó xử lý ở đó và làm giống.

`countRecentEatersByDish`:

```sql
SELECT global_dish_id, COUNT(DISTINCT user_id) AS eater_count
FROM eating_history
WHERE user_id = ANY($1)
  AND global_dish_id = ANY($2)
  AND eating_date >  ($3::date - $4::int)
  AND eating_date <= $3::date
GROUP BY global_dish_id
```

Cửa sổ **mở ở đầu, đóng ở cuối**: ăn đúng $d = 7$ ngày trước thì $R = 0$ theo `SPEC-020` (`max(0, 1 - 7/7)`), nên nó cũng không được tính vào $H$. Ranh giới phải khớp với `computeRecencyPenalty`, nếu không hai số hạng "gần đây" trong cùng một sản phẩm sẽ nói hai điều khác nhau về cùng một ngày. Integration test phải có ca $d = 7$ và $d = 6$.

---

# 7. Rủi ro

| Rủi ro | Dấu hiệu sớm | Xử lý |
| --- | --- | --- |
| Viết lại `finalizeSession` thay vì chèn | `TC-067`→`TC-071` đỏ | Revert, chèn đúng 4 dòng vào dòng mốc (§1.1) |
| Nhầm $H$ với $R$ | Điểm nằm ngoài khoảng hợp lý, hoặc import `recency.ts` ở `list-session-ranking.ts` | §1.4 + dòng import-cảnh-báo ở §5 |
| `bigint` về dạng chuỗi | Điểm ra `NaN` hoặc chuỗi dài | `Number()` ở infrastructure (§6) |
| Cửa sổ $H$ lệch cửa sổ $R$ | Không có dấu hiệu — sai âm thầm | Ca $d=7$ và $d=6$ trong integration test (§6) |
| Rule lọt vào bảng xếp hạng | `listSessionRanking` nhận `RuleRepository` | `BR-054` — deps không có chỗ cho nó, giữ nguyên như vậy |

---

# 8. Test Cases coverage

| TC | Tầng | Ở đâu |
| --- | :---: | --- |
| `TC-058`, `TC-059`, `TC-060` | `D` | §3.1 |
| `TC-061` | `A` | §3.1 + §5.3 |
| `TC-062` | `A` | §5.3 |
| `TC-111` | `D` | §3.1 |
| `TC-067`→`TC-071` | `A`/`I` | Đã xanh từ `E1-T11` — **chạy lại**, không viết mới |
| `TC-072`, `TC-073`, `TC-110` | `A` | §4.2 (tầng `D` đã phủ ở S2) |
| `TC-074`, `TC-075` | `I` | §4.2 integration |

---

# 9. Thứ tự TDD

1. `ranking.test.ts` các ca `computeSessionScore` (đỏ) → `computeSessionScore` (xanh).
2. `ranking.test.ts` các ca `rankSession` (đỏ) → `rankSession` (xanh).
3. `meal-repository.ts` + `finalize-session.test.ts` các ca rule (đỏ) → chèn bước 5-6 (xanh) → **chạy lại `TC-067`→`TC-071`**.
4. `drizzle-meal-repository` + integration `TC-074`, `TC-075`.
5. Port `SelectionRepository` / `HistoryRepository` → `list-session-ranking.test.ts` (đỏ) → use case (xanh).
6. Infrastructure hai câu SQL + integration test (ca $d = 7$ / $d = 6$).

---

# 10. Verify

## 10.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn test:integration
```

## 10.2 Đối chiếu tay bảng điểm

| $T$ | $P$ | $N$ | $H$ | Kỳ vọng |
| :-: | :-: | :-: | :-: | :-: |
| 4 | 3 | 0 | 0 | `0.75` |
| 4 | 3 | 1 | 2 | `0.425` |
| 5 | 3 | 0 | 0 | `0.60` |
| 1 | 1 | 0 | 0 | `1.00` |
| 2 | 0 | 2 | 0 | `-0.70` |

## 10.3 Bằng chứng `TC-074` / `TC-075` bằng tay

Trên `dev`, một phiên `ACTIVE` với rule snapshot `SOUP ≥ 1`, nháp gồm đúng một món `Bò kho bánh mì` gắn nhãn `MAIN`:

1. Bấm Chốt → `ERR_REQUIRED_RULE_FAILED`, thiếu 1 món canh, phiên vẫn `ACTIVE`.
2. Vào S-05, thêm nhãn `SOUP` cho *Bò kho bánh mì*. **Không** đụng gì tới Group Rule.
3. Bấm Chốt lại → **thành công**. Đó là `TC-075`.
4. Mở lại một phiên khác, sau khi Start thì gỡ hết Group Rule ở S-07, rồi bấm Chốt với nháp thiếu canh → **vẫn** `ERR_REQUIRED_RULE_FAILED`. Đó là `TC-074`.

Bước 3 và bước 4 phải cho hai kết quả **ngược nhau** dù cùng là "đổi cấu hình rồi chốt lại". Nếu chúng cho cùng kết quả, một trong hai nguồn dữ liệu đang đọc sai thời điểm.

---

# 11. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v1.1.md`

```markdown
# DEC-045 — Session Score Drops the Cannot-Eat Term and Defines Its Own Tie-Break

- **Ngày:** 2026-08-20
- **Trạng thái:** Accepted
- **Bối cảnh:** E5-S3

## Quyết định

1. `SessionScoreInput` không có `cannotEatCount` ($X$ của SPEC-014).
2. `rankSession` dùng tie-break hai tầng tự định nghĩa: `score` giảm dần → $P$ giảm dần →
   `dishId` tăng dần.

## Rationale

1. $X$ cần F15 Cannot Eat — v1.1. Mọi giá trị ở v1.0 đều bằng 0. Trọng số `cCannotEat` vẫn ở
   lại `RANKING_CONFIG` vì nguyên tắc hằng số tập trung nói về nơi ĐỊNH NGHĨA, không về nơi
   sử dụng (Ranking Spec §1 nguyên tắc 4, đã áp ở DEC-036).
2. SPEC-014 không quy định tie-break, nhưng hai món cùng điểm là chuyện thường xuyên ($T=4$
   chỉ cho 5 mức điểm nếu $N=H=0$). Không xác định thứ tự thì màn S-10 đổi thứ tự giữa hai lần
   tải trang, và người dùng đọc đó là dữ liệu đang thay đổi. KHÔNG dùng `stableHash` như
   `buildDeck`: hash ở đó tồn tại để hai người thấy thứ tự khác nhau; ở đây cả nhà nhìn cùng
   một bảng.

## Consequence

- v1.1 thêm $X$ chỉ cần thêm một trường vào `SessionScoreInput` và một số hạng — trọng số đã có.
- Tie-break này là hợp đồng của S4: màn S-10 không được sắp lại theo tiêu chí riêng.

## Affected Documents

- SDD `SPEC-014` — ghi chú v1.0 bỏ $X$; bổ sung tie-break.
```

---

# 12. Master Plan

```markdown
| `[x] E5-T5` | Finalize revalidate đầy đủ trong transaction | … |
| `[x] E5-T6` | `computeSessionScore` chuẩn hoá theo $T$ | … |
```
