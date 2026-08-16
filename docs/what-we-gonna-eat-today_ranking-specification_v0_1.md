# Ranking Specification — What We Gonna Eat Today

## Version 0.2

**Status:** Draft — Awaiting review
**Created:** 2026-08-14
**Last Updated:** 2026-08-14
**Upstream:** Problem Definition v1.4, Business Rules v1.6, Decision Log v1.2
**Downstream:** PRD, SDD, Tech Spec

Tài liệu này định nghĩa cách hệ thống sắp xếp Personal Candidate và Session Ranking. Nó cụ thể hoá các chỗ mà Business Rules v1.4 đã cố ý defer.

---

# 1. Nguyên tắc thiết kế

1. **Deterministic.** Cùng input → cùng output. Không dùng ML, embedding hay model học online trong MVP.
2. **Explainable.** Mỗi Dish trong Personal Candidate phải trả về được lý do vì sao nó ở vị trí đó.
3. **Filter trước, score sau.** Hard constraint không bao giờ được biểu diễn bằng trọng số âm lớn.
4. **Trọng số tập trung.** Mọi hằng số nằm trong một config block duy nhất (§8), không rải rác trong code.
5. **Composition rule không tham gia ranking.** Theo DEC-011, Required / Preferred / Target Dish Count không xuất hiện trong bất kỳ công thức nào dưới đây.
6. **Ranking là gợi ý, không phải quyết định.** Creator luôn có thể chọn Dish nằm ngoài top ranking.

---

# 2. Personal Candidate Pipeline

```text
Group Dish Pool (Active)
        ↓  Stage 1 — Hard Filter
Eligible Set
        ↓  Stage 2 — Personal Score
Scored List
        ↓  Stage 3 — Exploit / Explore Interleave
Ordered Deck
        ↓  Stage 4 — Paging & Cursor
Personal Candidate
```

## 2.1 Stage 1 — Hard Filter

Dish bị loại khỏi Eligible Set nếu bất kỳ điều kiện nào đúng:

| Điều kiện | Nguồn rule |
|---|---|
| Group Dish relationship = `Inactive` | BR-005 |
| User có `Cannot Eat` với Dish | BR-034 |
| Dish nằm trong Blacklist của User | BR-035 |

Hard filter không có trọng số. Constraint của Participant khác không filter deck của User này (BR-033).

## 2.2 Stage 2 — Personal Score

```text
score = w_explicit  × E
      + w_implicit  × I
      + w_chef      × C
      + w_source    × S
      − w_recency   × R
```

Mọi thành phần nằm trong `[-1, 1]` hoặc `[0, 1]`. Score thô không cần chuẩn hoá về `[0,1]` vì chỉ thứ tự có ý nghĩa.

### E — Explicit Preference `[-1, 1]`

| Explicit Preference | E |
|---|---|
| Like | `+1` |
| Neutral / chưa set | `0` |
| Dislike | `-1` |

`Dislike` chỉ hạ ranking, không loại Dish khỏi deck (BR-037).

### I — Implicit Preference `[-1, 1]`

Tính từ effective Session Interaction của **chính User**, có time decay và smoothing:

```text
weight(t)  = 0.5 ^ (age_days(t) / IMPLICIT_HALF_LIFE_DAYS)

R_w        = Σ weight(t) với mọi Swipe Right hợp lệ
L_w        = Σ weight(t) với mọi Swipe Left hợp lệ

I = (R_w − L_w) / (R_w + L_w + IMPLICIT_PRIOR_K)
```

Interaction chỉ hợp lệ khi **tất cả** điều kiện sau đúng:

- Thuộc Session ở trạng thái `Finalized`. Interaction của Session `Invalid`, `Active` hoặc `Draft` không dùng để học (BR-038, BR-061).
- User không bị remove khỏi Session đó (BR-061).
- Timestamp mới hơn `implicit_reset_at(user, dish)` nếu User đã reset Implicit Preference cho Dish này (BR-038).
- Không thuộc Session hiện tại đang Active — tránh vòng lặp phản hồi trong cùng một phiên.

`IMPLICIT_PRIOR_K = 3` là smoothing prior. Với 1 lần Swipe Right duy nhất, `I = 1/4 = 0.25` chứ không phải `1.0`. Đây là biện pháp chống nhiễu bắt buộc ở quy mô ~30 interaction/user/tháng.

### C — Chef Context `[0, 1]`

Chỉ áp dụng khi Chef Mode được bật cho Session (BR-029).

| Cooking Capability của ít nhất một Chef trong Session | C |
|---|---|
| `Can Cook` | `+1` |
| `Unknown` hoặc không có record | `0` |

Không tồn tại giá trị âm. `Unknown` là neutral, không phải `Cannot Cook`.

Nếu Chef Mode tắt: `C = 0` và `w_chef` bị bỏ qua.

### S — Purchase Source `[0, 1]`

| Trạng thái | S |
|---|---|
| Dish có ≥ 1 Purchase Source khả dụng trong Group | `+1` |
| Không có Purchase Source đã biết | `0` |

Thiếu Purchase Source không bao giờ loại Dish (BR-030).

### R — Recency Penalty `[0, 1]`

Tính từ **Effective Eating History** của User (sau Personal Correction).

```text
d = số ngày kể từ lần ăn gần nhất của (User, Dish)

R = max(0, 1 − d / COOLDOWN_WINDOW_DAYS)
```

Với `COOLDOWN_WINDOW_DAYS = 7`:

| d | R |
|---|---|
| 0 (hôm nay) | 1.00 |
| 1 | 0.86 |
| 3 | 0.57 |
| 6 | 0.14 |
| ≥ 7 | 0.00 |
| Chưa từng ăn | 0.00 |

**Multi-source collapse.** Nhiều Eating History source record cho cùng `User + Dish + Date` được collapse thành **một** eating event. Ăn Dish X ở cả Group A và Group B trong cùng ngày không tạo penalty gấp đôi. Điều này khép lại điểm defer ở BR-056.

**Whitelist.** Nếu User đã whitelist Dish này thì `R = 0` bất kể `d` (BR-036).

**Phạm vi MVP:** cooldown chỉ áp dụng ở **cấp Dish**, không áp dụng ở cấp Tag. Xem §9.1 về hệ quả với Tag Whitelist.

## 2.3 Stage 3 — Exploit / Explore Interleave

Deck được ghép theo block 5 vị trí: **4 exploit + 1 explore**, tương ứng tỉ lệ khám phá 20%.

```text
Vị trí:  1    2    3    4    5    6    7    8    9   10
Lane:   EXP  EXP  EXP  EXP  NEW  EXP  EXP  EXP  EXP  NEW
```

### Exploit lane

Eligible Set sắp giảm dần theo `score` (§2.2).

### Explore lane

Explore Pool là tập con của Eligible Set thoả:

- Chưa từng ăn, **hoặc** `d ≥ EXPLORE_STALE_DAYS` (30 ngày); và
- Explicit Preference ≠ `Dislike`; và
- Chưa được lấy vào exploit lane ở các vị trí trước đó.

Sắp xếp trong Explore Pool: `d` giảm dần (lâu chưa ăn nhất lên trước), Dish chưa từng ăn xếp trên cùng. Tie-break theo §2.5.

Nếu Explore Pool cạn, vị trí explore được lấp bằng Dish kế tiếp của exploit lane. Deck không bao giờ ngắn hơn Eligible Set.

**Lý do tồn tại của lane này:** PD §3 mục tiêu 2 yêu cầu hệ thống giúp User khám phá thêm món. Một hàm score thuần exploit sẽ đẩy đúng nhóm món quen lên đầu và tái tạo chính vấn đề nêu ở PD §2. Explore lane là cơ chế duy nhất trong MVP phục vụ mục tiêu đó, nên nó phải là cấu trúc tường minh chứ không phải hệ quả phụ của trọng số.

## 2.4 Stage 4 — Paging và Cursor

- Deck được materialize thành một ordered list tại lần load đầu tiên của User trong Session.
- Trả về theo page `DECK_PAGE_SIZE = 20`.
- `cursor` = số Dish User đã nhìn thấy.
- Khi User duyệt hết deck: hiển thị trạng thái hết món và gợi ý đánh dấu `Completed`. Hệ thống **không** sinh thêm candidate.

## 2.5 Tie-break

Khi hai Dish bằng điểm, áp dụng theo thứ tự:

1. `d` lớn hơn (lâu chưa ăn hơn) lên trước; chưa từng ăn được coi là `d = ∞`.
2. Có Purchase Source lên trước.
3. `stable_hash(session_id, user_id, dish_id)` tăng dần.

Bước 3 bảo đảm Group mới, chưa có tín hiệu nào, không bị khoá cứng vào một thứ tự alphabet, đồng thời thứ tự vẫn ổn định trong suốt một Session.

## 2.6 Cold Start

Không có nhánh logic riêng. Group mới có `E = I = R = 0` cho mọi Dish, nên thứ tự do `C`, `S` và tie-break quyết định. Đây là hành vi mong muốn: hệ thống không giả vờ biết gì về User khi chưa có dữ liệu.

## 2.7 Recalculation trong Active Session

Theo quyết định đã chốt: **chỉ sắp xếp lại phần chưa xem.**

Trigger recalculation: thay đổi Explicit Preference, Whitelist, Blacklist, Cannot Eat, hoặc Group Dish Pool thay đổi.

Quy tắc:

| Vùng deck | Hành vi |
|---|---|
| `index < cursor` (đã xem) | Đóng băng. Không đổi thứ tự, không remove. |
| `index ≥ cursor` (chưa xem) | Tính lại score, sắp xếp lại, dựng lại block exploit/explore. |
| Dish vừa bị hard filter | Remove khỏi phần chưa xem ngay, kể cả đang ở vị trí kế tiếp. |

`I` **không** được tính lại giữa Session vì interaction của Session đang Active không tham gia learning (§2.2).

---

# 3. Session Ranking

Session Ranking phục vụ Creator, dựa **thuần tuý trên evidence** của Session. Không trộn Personal Preference của Creator hay của bất kỳ ai vào điểm số.

## 3.1 Định nghĩa biến

Trên tập Participant hiện tại của Session (đã loại Participant bị remove):

| Ký hiệu | Ý nghĩa |
|---|---|
| `T` | Tổng số Participant hiện tại |
| `P` | Số Participant có effective Swipe Right |
| `N` | Số Participant có effective Swipe Left |
| `X` | Số Participant có `Cannot Eat` với Dish |
| `H` | Số Participant đã ăn Dish trong `COOLDOWN_WINDOW_DAYS` gần nhất |

Chỉ effective Interaction hợp lệ được tính (BR-049). Interaction của Participant đã bị remove, của Dish đã bị remove khỏi Group Dish Pool, hoặc đã bị `Cannot Eat` invalidate đều không tính.

## 3.2 Công thức

```text
session_score = (a×P − b×N − c×X − d×H) / T
```

| Hằng số | Giá trị | Lý do |
|---|---|---|
| `a` (Swipe Right) | `1.00` | Tín hiệu chính |
| `b` (Swipe Left) | `0.70` | "Không muốn hôm nay" là soft signal, nhẹ hơn đề xuất |
| `c` (Cannot Eat) | `1.00` | Hard constraint cá nhân, sẽ sinh warning ở finalize |
| `d` (Recently Eaten) | `0.30` | Tín hiệu phụ, chống lặp món |

Chia cho `T` để điểm giữ nguyên ý nghĩa khi Creator thêm hoặc remove Participant giữa Session.

Ví dụ, `T = 4`:

| Dish | P | N | X | H | session_score |
|---|---|---|---|---|---|
| Cá basa kho tiêu | 3 | 0 | 0 | 0 | `0.75` |
| Canh chua | 3 | 1 | 0 | 2 | `0.43` |
| Gà chiên nước mắm | 2 | 0 | 1 | 0 | `0.25` |

## 3.3 Hiển thị

- Luôn hiển thị số đếm thô `P / N / X / H` bên cạnh, không chỉ điểm số (BR-049).
- Có thể segment theo System Tag.
- Chef context hiển thị dưới dạng badge (`Chef nấu được`), **không** cộng vào `session_score`. Giữ ranking là evidence thuần.
- Conflict với Session Rule là **display-only**, không tham gia điểm số (DEC-011).

## 3.4 Dish chưa có interaction

Dish thuộc Group Dish Pool nhưng chưa ai tương tác **không** được cho điểm và không trộn vào ranking chính. Chúng nằm ở một section riêng, ví dụ "Chưa ai chọn", để Creator vẫn có thể đưa vào Final Meal theo BR-050.

## 3.5 Tie-break

1. `P` lớn hơn.
2. `X` nhỏ hơn.
3. Timestamp của effective Interaction gần nhất mới hơn.
4. `stable_hash(session_id, dish_id)`.

## 3.6 Creator không có trọng số riêng

Swipe của Creator được tính đúng như mọi Participant khác. Creator đã là Decision Maker cuối cùng; cộng thêm trọng số cho phiếu của họ là double-count và làm ranking mất ý nghĩa "tiếng nói của Group".

---

# 4. Explainability

Mỗi Dish trong Personal Candidate trả về tối đa **2 reason code**, chọn theo `|đóng góp|` giảm dần:

| Reason code | Điều kiện |
|---|---|
| `LIKED` | `E = +1` |
| `DISLIKED` | `E = -1` |
| `OFTEN_CHOSEN` | `I ≥ 0.3` |
| `OFTEN_SKIPPED` | `I ≤ -0.3` |
| `RECENTLY_EATEN` | `R > 0` |
| `CHEF_CAN_COOK` | `C = 1` |
| `HAS_PURCHASE_SOURCE` | `S = 1` và không có reason nào mạnh hơn |
| `NEW_TO_YOU` | Dish đến từ explore lane, chưa từng ăn |
| `LONG_TIME_NO_EAT` | Dish đến từ explore lane, `d ≥ 30` |

Reason code từ explore lane luôn được ưu tiên hiển thị, vì nếu không User sẽ không hiểu tại sao một món "lạ" chen vào giữa deck.

---

# 5. Ranking Config

Toàn bộ hằng số nằm ở một nơi.

```yaml
personal_ranking:
  w_explicit: 0.30
  w_implicit: 0.25
  w_recency:  0.25
  w_chef:     0.10
  w_source:   0.10

implicit:
  half_life_days: 60
  prior_k: 3

history:
  cooldown_window_days: 7

explore:
  ratio: 0.20            # 1 trong mỗi 5 vị trí
  block_size: 5
  stale_days: 30

deck:
  page_size: 20

session_ranking:
  a_swipe_right: 1.00
  b_swipe_left:  0.70
  c_cannot_eat:  1.00
  d_recent:      0.30
```

Các giá trị này là điểm khởi đầu có chủ đích, không phải kết quả tuning. Chúng nên được xem lại sau ~4 tuần dữ liệu thật.

---

# 6. Nằm ngoài phạm vi

- Học trọng số tự động, A/B testing, bandit.
- Cooldown theo Tag hoặc theo nguyên liệu.
- Ranking theo cặp Dish (Dish compatibility).
- Cross-group collaborative filtering giữa các User không cùng Group.
- Meal candidate generation.
- Dùng Required / Preferred / Target Dish Count làm ranking signal (DEC-011).

---

# 7. Tác động lên tài liệu khác

| Tài liệu | Thay đổi cần thiết |
|---|---|
| Decision Log | Thêm `DEC-012` (§8) |
| Business Rules v1.4 → v1.5 | §11.3 thu hẹp Whitelist về cấp Dish trong MVP; §12.2 bổ sung reset watermark; §15 trỏ sang tài liệu này; §19.1 chốt collapse rule |
| Problem Definition v1.3 → v1.4 | §8.2 ghi rõ conflict với Session Rule là display-only; phản ánh DEC-010/011 |

---

# 8. Quyết định cần ghi vào Decision Log (DEC-012 đề xuất)

1. Personal Ranking dùng linear weighted score, deterministic, explainable; không ML trong MVP.
2. Implicit Preference dùng exponential decay half-life 60 ngày và smoothing prior `k = 3`; chỉ học từ Session `Finalized`.
3. Cooldown window = 7 ngày, linear decay, chỉ ở cấp Dish.
4. Nhiều Eating History source record cùng `User + Dish + Date` collapse thành một eating event cho mục đích ranking.
5. Explore lane cố định 20%, block 4+1.
6. Recalculation giữa Session chỉ áp dụng cho phần deck chưa xem; phần đã xem đóng băng.
7. Session Ranking là evidence-only, chuẩn hoá theo số Participant; Creator không có trọng số riêng.

---

# 9. Điểm cần bạn quyết

## 9.1 Tag Whitelist — đã giải quyết

Business Rules v1.6 đã thu hẹp BR-036 về **Dish-level whitelist**; Tag-level cooldown nằm ngoài phạm vi. Mục này giữ lại để ghi nhận lý do.

## 9.2 Ngưỡng warning "đã ăn gần đây" ở Final Meal

Hiện `COOLDOWN_WINDOW_DAYS = 7` dùng cho ranking. Câu hỏi tách biệt: khi Creator chọn một Dish mà cả nhà vừa ăn 2 hôm trước, finalize có nên hiện warning không? Rule hiện tại không có warning loại này.

## 9.3 Trọng số `b` cho Swipe Left

`b = 0.70` nghĩa là 3 người đề xuất vẫn thắng 4 người từ chối (`3 − 2.8 = 0.2 > 0`). Nếu bạn muốn một phiếu chống có sức nặng hơn phiếu thuận trong bối cảnh gia đình, `b` nên ≥ `1.0`.

---

# 10. Change History

| Version | Date | Section | Change | Reason / Decision |
|---|---|---|---|---|
| 0.2 | 2026-08-14 | Toàn bộ | Chuyển tham chiếu business rule sang BR-ID; cập nhật upstream version | PRD v0.1 §9.1 |
| 0.1 | 2026-08-14 | Toàn bộ | Bản draft đầu tiên: Personal Score, explore lane, Session Ranking, config | DEC-012 |
