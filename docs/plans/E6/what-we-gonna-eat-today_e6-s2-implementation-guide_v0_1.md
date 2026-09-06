# 🗣️ Implementation Guide — E6 Slice S2: Bảng dịch mã lỗi và lỗi tại chỗ

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-21`
> - **Upstream:** [Master Plan](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E6-T2`) • [SDD §2.5](../../what-we-gonna-eat-today_sdd_v1.3.md) • [Design Criteria §5, §10](../../what-we-gonna-eat-today_design-criteria_v1.0.md)
> - **Tiền đề:** S1 đã code (`SYSTEM_TAG_LABELS` đã ở `shared/ui/`).
>
> 🗣️ *Một bảng tra duy nhất cho 22 mã lỗi, và một component `InlineError` duy nhất để hiện chúng. Không thêm tính năng, chỉ gom.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | :---: | --- | --- |
| `E6-T2` | Bảng dịch mã lỗi và lỗi tại chỗ | 2 | `src/shared/errors/messages.ts`, `src/shared/ui/inline-error.tsx` | Một bảng tra **duy nhất**; không popup modal cho lỗi form |

- [ ] `src/shared/errors/messages.ts` phủ **đủ 22 mã**, ép bởi `satisfies` chứ không bởi trí nhớ
- [ ] 6 hàm `toVietnameseMessage` + `toVietnameseBlockText` ở `app/**` bị **xoá sạch**
- [ ] `yarn dup` báo ít khối trùng lặp hơn trước — ghi số liệu trước/sau vào PR
- [ ] Mọi lỗi hiển thị đều đi qua `InlineError`; không `role="alert"` viết tay nào còn lại
- [ ] `yarn verify && yarn arch:probe` xanh

---

# 1. Bốn phát hiện — đọc trước khi gõ

## 1.1 `shared/errors.ts` phải thành thư mục, và đó là thao tác không mất gì

Master Plan chỉ định `src/shared/errors/messages.ts`, mà hiện tại [errors.ts](../../../src/shared/errors/index.ts) là **file**.

```bash
git mv src/shared/errors.ts src/shared/errors/index.ts
```

Đường import `@/shared/errors` giữ nguyên hiệu lực (Node/TS phân giải `index.ts`), nên **không file nào trong 20+ chỗ đang import phải sửa**. `git mv` giữ lịch sử. Làm bước này trước tiên và chạy `yarn typecheck` để xác nhận trước khi viết một dòng nào của bảng dịch.

`errors.test.ts` đi theo thành `src/shared/errors/index.test.ts`.

## 1.2 Bảng KHÔNG thể là `Record<ErrorCode, string>` phẳng — hai mã cần tham số

Đếm thật: **22 mã lỗi** trong union `ErrorCode`. Hai mã trong đó không dịch được nếu chỉ nhìn `code`:

- **`ERR_REQUIRED_RULE_FAILED`** — E5-S3 gắn `details.shortfalls` vào failure đúng để câu lỗi nói được *"Còn thiếu 1 món canh."* thay vì *"Mâm cơm chưa đủ."*. Một bảng phẳng vứt bỏ chính thứ E5 đã cất công mang theo.
- **`ERR_VALIDATION`** — phân biệt theo `details.field` (xem §1.3).

Nên chữ ký là:

```ts
export function messageFor(failure: Failure): string
```

nhận **cả `Failure`**, không chỉ `code`. Bảng phẳng vẫn tồn tại bên trong cho 20 mã còn lại, và nó **phải** được ép đầy đủ:

```ts
const BASE_MESSAGES = { … } satisfies Record<ErrorCode, string>
```

`satisfies` là điểm mấu chốt: thêm một mã lỗi mới vào `ErrorCode` mà quên dịch thì **`tsc` đỏ**, không phải người dùng phát hiện bằng cách gặp một câu tiếng Anh giữa màn hình.

> [!NOTE]
> `ERR_UNAUTHENTICATED` hiện **không được `failure()` nào ném ra** — nó chỉ sống trong bảng ánh xạ HTTP ở [http-error.ts](../../../src/shared/http-error.ts). Vẫn phải có câu dịch (vì `satisfies` đòi đủ), và đó là đúng: mã tồn tại trong hợp đồng thì phải có câu cho nó, không đợi tới lúc ai đó ném ra mới đi tìm chữ.

## 1.3 `ERR_VALIDATION` + `field: 'name'` đang mang HAI nghĩa khác nhau

Đây là phát hiện quan trọng nhất của slice, và nó chỉ lộ ra khi gom bảng lại một chỗ.

| Nơi ném | `details` | Câu hiện tại |
| --- | --- | --- |
| [add-dish-to-group.ts](../../../src/features/dish/application/add-dish-to-group.ts) | `{ code: 'ERR_VALIDATION', field: 'name', … }` | *"Nhập tên món trước đã."* |
| [create-group.ts](../../../src/features/group/application/create-group.ts) | `FAILURE_DETAILS[…]` → `field: 'name'` | *"Đặt tên để cả nhà nhận ra nhóm."* |

Cùng `code`, cùng `field`, **hai câu khác nhau**. Hôm nay việc đó chạy được vì mỗi màn có bảng dịch riêng và mỗi bảng chỉ biết một ngữ cảnh. Gom vào một bảng thì một trong hai câu biến mất.

Hai lối, chọn lối thứ nhất:

| Lối | Đánh giá |
| --- | --- |
| **Đổi `field` tại NGUỒN cho cụ thể**: `'dishName'` và `'groupName'` ✅ | Failure tự nói nó nói về cái gì. Sửa 2 chỗ ném + 2 chỗ đọc, không thêm tham số nào |
| `messageFor(failure, context)` | Thêm một tham số mà mọi caller có thể truyền sai, để bù cho việc failure mô tả thiếu chính xác. Chữa triệu chứng |

Cùng việc đó áp cho `field: 'cursor'` ([list-deck.ts](../../../src/features/selection/application/list-deck.ts)) — giữ nguyên tên, nó đã đủ riêng. Kiểm lại `provision-user.ts` khi làm.

**Không sửa test cũ cho khớp một cách máy móc:** hai test hiện khẳng định `field === 'name'`; đổi chúng sang tên mới là một phần của việc này, không phải hiệu ứng phụ.

## 1.4 "Lỗi tại chỗ" chưa có component chung, và hai chỗ đang dùng sai token màu

Master Plan `E6-T2` DoD có hai vế: *"Một bảng tra duy nhất"* **và** *"không popup modal cho lỗi form"*. Vế thứ hai đã đúng ở mọi nơi (dự án không dùng modal ở đâu cả — Design Criteria §10 anti-pattern 7). Nhưng vế đó còn kéo theo Design Criteria §5:

> **`InlineError`:** Thông báo lỗi màu `--danger` đặt ngay cạnh input, tuyệt đối không dùng alert popup.

Không có component `InlineError` nào tồn tại. Bảy chỗ hiện lỗi bằng markup viết tay, và **chúng không thống nhất**:

| Token | Nơi dùng |
| --- | --- |
| `text-danger` | `text-field.tsx`, `system-tag-field.tsx`, `start-session-screen.tsx`, `banner.tsx` |
| `text-no` | `group-rules-screen.tsx`, `finalize-bar.tsx` — **cả hai thêm ở E5** |

`--no` là *"Nâu đất TRUNG TÍNH (Không bao giờ dùng đỏ)"* dành cho **vuốt trái** — nói "món này tôi không muốn", không phải "thao tác của bạn thất bại". Dùng nó cho lỗi form làm lỗi trông như một lựa chọn.

Vế còn lại của Design Criteria §3.1 ghi `--danger` là *"CHỈ dành cho lỗi hệ thống thật"*. Không mâu thuẫn: với người dùng, một form không lưu được **là** lỗi thật. Ranh giới đúng là **lỗi dùng `--danger`, từ chối món dùng `--no`** — và có một component chung là cách duy nhất để ranh giới đó không trôi lần nữa.

→ Thêm `src/shared/ui/inline-error.tsx`, đổi cả bảy chỗ sang dùng nó.

---

# 2. File tree

```
src/shared/errors/
  index.ts                       ~ CHUYỂN từ src/shared/errors.ts (§1.1)
  index.test.ts                  ~ CHUYỂN từ src/shared/errors.test.ts
  messages.ts                    + MỚI (§3)
  messages.test.ts               + MỚI (§3.2)

src/shared/ui/
  inline-error.tsx               + MỚI (§4)
  inline-error.test.tsx          + MỚI (§4.1)
  system-tag-label.ts            ~ SỬA — thêm TAG_IN_SENTENCE (§3.1)

src/features/dish/application/
  add-dish-to-group.ts           ~ SỬA — field: 'dishName' (§1.3)
  add-dish-to-group.test.ts      ~ SỬA

src/features/group/application/
  create-group.ts                ~ SỬA — field: 'groupName' (§1.3)
  create-group.test.ts           ~ SỬA

src/features/rule/presentation/components/
  rule-sentence.ts               ~ SỬA — ruleShortfallPhrase chuyển đi (§3.1)

src/app/**/actions.ts            ~ SỬA — xoá 6 hàm dịch, gọi messageFor (§5)
src/features/**/presentation/**  ~ SỬA — 7 chỗ dùng InlineError (§4.2)
```

---

# 3. `src/shared/errors/messages.ts` — MỚI

## 3.1 Chuẩn bị: mảnh câu cho `ERR_REQUIRED_RULE_FAILED`

`messageFor` cần dựng *"Còn thiếu 1 món canh."* từ `details.shortfalls`. Mảnh câu đó hiện nằm ở `ruleShortfallPhrase` trong [rule-sentence.ts](../../../src/features/rule/presentation/components/rule-sentence.ts) — tức là ở **presentation của feature `rule`**.

`shared/` import `features/` là chiều ngược của mọi thứ trong dự án này. ESLint chưa chặn nó (`CROSS_FEATURE_ZONES` chỉ lấy `./src/features/*` làm `target`), nhưng "lint chưa bắt" không phải "được phép" — `shared/` là thứ mọi feature import, cho nó import ngược lại một feature là mở đường cho vòng lặp phụ thuộc.

→ Chuyển `TAG_IN_SENTENCE` và `ruleShortfallPhrase` sang `src/shared/ui/system-tag-label.ts` — file S1 vừa tạo cho `SYSTEM_TAG_LABELS`. Hai dạng nhãn của cùng một `SystemTag` (đứng một mình trên chip, và nằm trong câu) sống cạnh nhau là đúng chỗ. `rule/presentation/rule-sentence.ts` giữ `ruleSentence` và import mảnh câu từ `shared/ui`.

## 3.2 Bảng

```ts
import type { ErrorCode, Failure } from './index'
import { ruleShortfallPhrase } from '@/shared/ui/system-tag-label'

/**
 * SDD §2.5 — BẢNG TRA DUY NHẤT từ mã lỗi sang tiếng Việt. Trước slice này có
 * SÁU bảng rải ở `app/**\/actions.ts`, mỗi bảng biết một phần và không bảng nào
 * biết đủ.
 *
 * `satisfies Record<ErrorCode, string>` là ràng buộc quan trọng nhất ở đây:
 * thêm một mã vào `ErrorCode` mà quên dịch thì `tsc` đỏ ngay, chứ không phải
 * người dùng gặp một chuỗi tiếng Anh giữa màn hình rồi mới biết.
 *
 * Giọng văn — theo Design Criteria §2, và đây là hợp đồng, không phải gu:
 * - Nói với người dùng, không nói về hệ thống. "Món này đã có trong danh mục
 *   rồi." chứ không "Vi phạm ràng buộc duy nhất."
 * - Nêu VIỆC CẦN LÀM TIẾP khi có. "Nhập tên món trước đã." chứ không "Tên món
 *   không hợp lệ."
 * - Không xin lỗi, không đổ lỗi, không dấu chấm than.
 */
const BASE_MESSAGES = {
  ERR_UNAUTHENTICATED: 'Bạn cần đăng nhập lại.',
  ERR_NOT_GROUP_MEMBER: 'Bạn không ở trong nhóm này.',
  ERR_NOT_GROUP_ADMIN: 'Chỉ người quản lý nhóm mới làm được việc này.',
  ERR_NOT_SESSION_CREATOR: 'Chỉ người mở phiên mới làm được việc này.',
  ERR_NOT_PARTICIPANT: 'Bạn chưa được thêm vào phiên này.',
  ERR_VALIDATION: 'Kiểm tra lại thông tin vừa nhập giúp mình.',
  ERR_INVITE_INVALID: 'Link mời không còn hiệu lực.',
  ERR_INVITE_ALREADY_USED: 'Link mời này đã được dùng rồi.',
  ERR_ALREADY_GROUP_MEMBER: 'Bạn đã ở trong nhóm này rồi.',
  ERR_DISH_ALREADY_IN_POOL: 'Món này đã có trong danh mục rồi.',
  ERR_DISH_NOT_IN_POOL: 'Có món vừa bị gỡ khỏi nhóm. Chọn lại giúp mình.',
  ERR_INVALID_SYSTEM_TAG: 'Chọn một nhãn để quy định bữa ăn kiểm tra được.',
  ERR_SESSION_EXISTS_TODAY: 'Hôm nay nhà mình đã có một phiên rồi.',
  ERR_SESSION_NOT_DRAFT: 'Phiên này đã bắt đầu rồi.',
  ERR_SESSION_NOT_ACTIVE: 'Bữa này chốt rồi.',
  ERR_PARTICIPANT_NOT_MEMBER: 'Bỏ những người đã rời nhóm ra trước khi bắt đầu.',
  ERR_PARTICIPANT_EXISTS: 'Người này đã có trong phiên rồi.',
  ERR_DUPLICATE_DISH_IN_MEAL: 'Mỗi món chỉ chọn được một lần.',
  ERR_EMPTY_FINAL_MEAL: 'Chọn ít nhất một món trước đã.',
  ERR_REQUIRED_RULE_FAILED: 'Mâm cơm còn thiếu món bắt buộc.',
  ERR_DUPLICATE_RULE: 'Mỗi nhãn chỉ đặt được một quy định.',
  ERR_INVALID_MINIMUM_COUNT: 'Số lượng phải từ 1 trở lên.',
} satisfies Record<ErrorCode, string>

/**
 * Câu cụ thể theo `details.field`. Chỉ chứa những field mà một câu chung
 * KHÔNG đủ tử tế — không phải mọi field đều cần mặt ở đây.
 *
 * `dishName`/`groupName` chứ không phải `name` cho cả hai: xem Guide §1.3.
 */
const VALIDATION_MESSAGES: Record<string, string> = {
  dishName: 'Nhập tên món trước đã.',
  groupName: 'Đặt tên để cả nhà nhận ra nhóm.',
}

type RuleShortfall = { systemTag: SystemTag; missing: number }

/**
 * "Còn thiếu 1 món canh." / "Còn thiếu 1 món mặn và 1 món canh."
 *
 * `details.shortfalls` do `finalizeSession` gắn vào (E5-S3) đúng để câu này
 * nói được thiếu GÌ. Nếu `details` không có nó — ví dụ lỗi tới từ một đường
 * chưa cập nhật — rơi về câu chung của bảng, không throw.
 */
function requiredRuleMessage(details: Record<string, unknown> | undefined): string {
  const shortfalls = details?.['shortfalls']
  if (!Array.isArray(shortfalls) || shortfalls.length === 0) {
    return BASE_MESSAGES.ERR_REQUIRED_RULE_FAILED
  }

  const phrases = (shortfalls as RuleShortfall[]).map(ruleShortfallPhrase)
  const joined =
    phrases.length === 1
      ? phrases[0]
      : `${phrases.slice(0, -1).join(', ')} và ${phrases.at(-1)}`

  return `Còn thiếu ${joined}.`
}

/** SDD §2.5 — điểm vào DUY NHẤT. Mọi `actions.ts` gọi hàm này, không hàm nào
 *  tự viết câu tiếng Việt của riêng mình nữa. */
export function messageFor(failure: Failure): string {
  if (failure.code === 'ERR_REQUIRED_RULE_FAILED') {
    return requiredRuleMessage(failure.details)
  }

  if (failure.code === 'ERR_VALIDATION') {
    const field = failure.details?.['field']
    if (typeof field === 'string' && field in VALIDATION_MESSAGES) {
      return VALIDATION_MESSAGES[field] ?? BASE_MESSAGES.ERR_VALIDATION
    }
  }

  return BASE_MESSAGES[failure.code]
}
```

## 3.3 Test — `messages.test.ts`

```ts
import { describe, expect, it } from 'vitest'

import { messageFor } from './messages'

describe('messageFor', () => {
  // Bảng phải ĐẦY ĐỦ. `satisfies` đã ép ở mức kiểu; ca này ép ở mức hành vi:
  // không mã nào trả về chuỗi rỗng hoặc chính tên mã.
  it.each([
    'ERR_UNAUTHENTICATED',
    'ERR_NOT_GROUP_MEMBER',
    // … đủ 22 mã …
  ] as const)('%s có câu tiếng Việt tử tế', (code) => {
    const message = messageFor({ code })

    expect(message.length).toBeGreaterThan(8)
    expect(message).not.toContain('ERR_')
    expect(message).toMatch(/[.]$/)
    expect(message).not.toContain('!')   // Design Criteria §2 — không dấu chấm than
  })

  it('ERR_VALIDATION phân biệt tên món với tên nhóm', () => {
    expect(messageFor({ code: 'ERR_VALIDATION', details: { field: 'dishName' } })).toBe(
      'Nhập tên món trước đã.',
    )
    expect(messageFor({ code: 'ERR_VALIDATION', details: { field: 'groupName' } })).toBe(
      'Đặt tên để cả nhà nhận ra nhóm.',
    )
  })

  it('ERR_VALIDATION với field lạ rơi về câu chung', () => {
    expect(messageFor({ code: 'ERR_VALIDATION', details: { field: 'cursor' } })).toBe(
      'Kiểm tra lại thông tin vừa nhập giúp mình.',
    )
  })

  it('ERR_REQUIRED_RULE_FAILED nêu đúng món còn thiếu', () => {
    const message = messageFor({
      code: 'ERR_REQUIRED_RULE_FAILED',
      details: { shortfalls: [{ systemTag: 'SOUP', missing: 1 }] },
    })

    expect(message).toBe('Còn thiếu 1 món canh.')
  })

  it('ERR_REQUIRED_RULE_FAILED nối hai món bằng "và"', () => {
    const message = messageFor({
      code: 'ERR_REQUIRED_RULE_FAILED',
      details: { shortfalls: [{ systemTag: 'MAIN', missing: 1 }, { systemTag: 'SOUP', missing: 2 }] },
    })

    expect(message).toBe('Còn thiếu 1 món mặn và 2 món canh.')
  })

  it('ERR_REQUIRED_RULE_FAILED không có shortfalls thì rơi về câu chung', () => {
    expect(messageFor({ code: 'ERR_REQUIRED_RULE_FAILED' })).toBe('Mâm cơm còn thiếu món bắt buộc.')
  })
})
```

> [!IMPORTANT]
> Ca `it.each` với đủ 22 mã là thứ giữ cho bảng không mục. Liệt kê tay chứ **đừng** sinh danh sách từ chính `BASE_MESSAGES` — làm thế thì test chỉ đang kiểm tra rằng bảng bằng chính nó.

---

# 4. `src/shared/ui/inline-error.tsx` — MỚI

```tsx
import type { ReactElement } from 'react'

export type InlineErrorProps = {
  /** `null` = không có lỗi; component tự trả `null`, người gọi không phải
   *  viết `{error === null ? null : …}` ở bảy chỗ khác nhau. */
  message: string | null
  /** Nối với `aria-describedby` của input tương ứng khi lỗi thuộc về một ô
   *  nhập cụ thể (khuôn `text-field.tsx` đang dùng). */
  id?: string
  size?: 'caption' | 'body'
}

/**
 * Design Criteria §5 `InlineError` + §10 anti-pattern 7 (không modal giữa màn
 * hình cho lỗi form). Lỗi hiện NGAY CẠNH thứ gây ra nó.
 *
 * Token là `--danger`, KHÔNG phải `--no`. Hai chỗ ở E5 (`group-rules-screen`,
 * `finalize-bar`) đang dùng `--no` — sai: `--no` là nâu đất trung tính của
 * VUỐT TRÁI, nói "món này tôi không muốn". Dùng nó cho lỗi làm thất bại trông
 * như một lựa chọn (Guide §1.4).
 *
 * `role="alert"` để screen reader đọc ngay khi lỗi xuất hiện, không đợi người
 * dùng tab tới.
 */
export function InlineError({ message, id, size = 'caption' }: InlineErrorProps): ReactElement | null {
  if (message === null) {
    return null
  }

  return (
    <span
      {...(id === undefined ? {} : { id })}
      role="alert"
      className={`font-medium text-danger ${size === 'body' ? 'text-body' : 'text-caption'}`}
    >
      {message}
    </span>
  )
}
```

## 4.1 Test

| Ca | Khẳng định |
| --- | --- |
| `message: null` | Không render gì (`container.firstChild` là `null`) |
| Có lỗi | `getByRole('alert')` thấy đúng chuỗi |
| Token | `className` chứa `text-danger`, **không** chứa `text-no` |
| `id` | Truyền `id` → gắn đúng, để `aria-describedby` nối được |

## 4.2 Bảy chỗ phải đổi

`text-field.tsx`, `system-tag-field.tsx`, `start-session-screen.tsx` (hàng participant lỗi), `group-rules-screen.tsx`, `finalize-bar.tsx`, cộng các chỗ `E6-T1`/S3 thêm sau.

`banner.tsx` **không đổi** — nó là dải thông báo toàn màn (dùng cho mất mạng ở `NFR-05`), khác hẳn lỗi cạnh input. Giữ nguyên và đừng gộp.

---

# 5. Xoá 6 bảng dịch cũ

| File | Hàm phải xoá |
| --- | --- |
| [app/groups/actions.ts](../../../src/app/groups/actions.ts) | `toVietnameseMessage` — comment trong file đã ghi sẵn *"E6-T2 chuyển bảng này sang `shared/errors/messages.ts`"* |
| [app/groups/[groupId]/invite/actions.ts](../../../src/app/groups/[groupId]/invite/actions.ts) | `toVietnameseMessage` |
| [app/groups/[groupId]/dishes/actions.ts](../../../src/app/groups/[groupId]/dishes/actions.ts) | `toVietnameseMessage` |
| [app/groups/[groupId]/rules/actions.ts](../../../src/app/groups/[groupId]/rules/actions.ts) | `toVietnameseMessage` |
| [app/join/[token]/actions.ts](../../../src/app/join/[token]/actions.ts) | `toVietnameseMessage` (nhận `code: string`, khác chữ ký ba cái trên) |
| [app/sessions/[sessionId]/summary/actions.ts](../../../src/app/sessions/[sessionId]/summary/actions.ts) | `toVietnameseMessage` |
| [app/groups/[groupId]/sessions/new/actions.ts](../../../src/app/groups/[groupId]/sessions/new/actions.ts) | `toVietnameseBlockText` — trả `string \| null`, xem cảnh báo dưới |

> [!WARNING]
> `toVietnameseBlockText` **không** cùng hình dạng với sáu cái kia: kiểu trả về là `string | null` và `null` có nghĩa "không hiện banner". Đọc kỹ chỗ gọi trước khi thay — `StartSessionFormState.blockText` nhận `null` là trạng thái hợp lệ. `messageFor` luôn trả `string`, nên chỗ này giữ nhánh `null` của riêng nó ở ngoài, chỉ thay phần dựng chuỗi.

Ba câu sẽ **đổi chữ** sau khi gom, và đó là kết quả mong muốn chứ không phải hồi quy:

- `ERR_NOT_GROUP_ADMIN` ở màn mời hiện là *"Chỉ Admin mới tạo được link mời."* → thành *"Chỉ người quản lý nhóm mới làm được việc này."*. Bỏ chữ "Admin" là đúng: người dùng của app này là gia đình, không đọc tài liệu kỹ thuật.
- Câu rơi-về mặc định *"Không tạo được link mời. Thử lại giúp mình."* biến mất — mọi mã đều có câu riêng, không còn nhánh "không biết lỗi gì".

Nếu một câu cụ thể theo màn thật sự cần thiết, thêm nó vào `VALIDATION_MESSAGES` hoặc một bảng theo `details` — **không** dựng lại bảng riêng ở `actions.ts`.

---

# 6. Rủi ro

| Rủi ro | Dấu hiệu sớm | Xử lý |
| --- | --- | --- |
| `git mv` làm hỏng import | `yarn typecheck` đỏ sau §1.1 | Không nên đỏ (`index.ts` phân giải được). Nếu đỏ, kiểm `tsconfig.json` `moduleResolution` |
| Bảng thiếu mã | `tsc` đỏ ở `satisfies` | Đúng như thiết kế |
| Câu đổi làm test màn hình đỏ | `invite-screen.test.tsx` khẳng định chuỗi cũ | Sửa test theo câu mới (§5) — đây là thay đổi có chủ ý |
| `shared` import `features` | `yarn lint` **không** bắt | §3.1 — chuyển `ruleShortfallPhrase` sang `shared/ui` trước |
| `--no` sống sót ở chỗ lỗi | `grep -rn "text-no" src` còn kết quả ngoài `dish-swipe-card` | Kiểm bằng chính lệnh grep đó ở §7.2 |

---

# 7. Verify

## 7.1 Cổng máy

```bash
yarn verify && yarn arch:probe
```

## 7.2 Bằng chứng đã gom thật, không chỉ thêm một file nữa

```bash
grep -rn "toVietnameseMessage\|toVietnameseBlockText" src ; echo "---" ; grep -rn "text-no" src --include="*.tsx"
```

- Lệnh đầu phải **không ra kết quả nào**.
- Lệnh sau chỉ được còn `dish-swipe-card.tsx` (vuốt trái — đúng chỗ dùng `--no`).

Và ghi lại số liệu jscpd trước/sau vào PR:

```bash
yarn dup
```

## 7.3 Bằng chứng trên điện thoại

1. Ở màn Quy định, đặt `minimumCount = 0` → thấy *"Số lượng phải từ 1 trở lên."* màu `--danger`, ngay tại chỗ, không popup.
2. Ở màn Chốt bữa với rule `MAIN ≥ 1` và `SOUP ≥ 1`, chọn 0 món mặn 0 món canh rồi bấm Chốt → thấy *"Còn thiếu 1 món mặn và 1 món canh."* — một câu, hai món, nối bằng "và".

Bước 2 là bằng chứng `details.shortfalls` mà E5-S3 mang theo thật sự tới được mắt người dùng.

---

# 8. Test Cases coverage

Slice này không có `TC-xxx` riêng — SDD §2.5 là quy ước, không phải kịch bản. Nó được phủ bằng `messages.test.ts` (§3.3), `inline-error.test.tsx` (§4.1), và bằng việc **toàn bộ test màn hình hiện có phải vẫn xanh** sau khi đổi câu.

---

# 9. Thứ tự TDD

1. `git mv src/shared/errors.ts src/shared/errors/index.ts` → `yarn typecheck` xanh.
2. Chuyển `TAG_IN_SENTENCE`/`ruleShortfallPhrase` sang `shared/ui/system-tag-label.ts` → `yarn verify` xanh.
3. Đổi `field: 'name'` → `'dishName'`/`'groupName'` tại nguồn + sửa test tương ứng (§1.3).
4. `messages.test.ts` (đỏ) → `messages.ts` (xanh).
5. `inline-error.test.tsx` (đỏ) → `inline-error.tsx` (xanh).
6. Đổi 7 chỗ hiện lỗi sang `InlineError`; sửa test màn hình theo câu mới.
7. Xoá 6 hàm dịch cũ; chạy hai lệnh grep ở §7.2.

---

# 10. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v3.9.md`

```markdown
# DEC-049 — One messageFor(failure), Not a Flat Table; Validation Fields Are Named by Subject

- **Ngày:** 2026-08-21
- **Trạng thái:** Accepted
- **Bối cảnh:** E6-S2

## Quyết định

1. Bảng dịch mã lỗi có chữ ký `messageFor(failure: Failure): string` — nhận cả `Failure`, không
   chỉ `code`. Bảng phẳng bên trong được ép đầy đủ bằng `satisfies Record<ErrorCode, string>`.
2. `details.field` của `ERR_VALIDATION` đổi từ `'name'` sang `'dishName'` / `'groupName'` tại
   nơi ném.
3. Thêm `shared/ui/inline-error.tsx`; lỗi dùng token `--danger`, `--no` chỉ dành cho vuốt trái.

## Rationale

1. `ERR_REQUIRED_RULE_FAILED` mang `details.shortfalls` (E5-S3) đúng để câu lỗi nói được "Còn
   thiếu 1 món canh" thay vì một câu chung. Bảng phẳng vứt bỏ dữ liệu đó.
2. `add-dish-to-group` và `create-group` cùng ném `ERR_VALIDATION` với `field: 'name'` nhưng
   cần hai câu khác nhau. Việc đó chỉ chạy được khi mỗi màn có bảng riêng. Sửa tại nguồn cho
   failure tự mô tả chính xác, thay vì thêm tham số `context` mà caller có thể truyền sai.
3. Sau E5 có hai chỗ hiện lỗi bằng `--no` và bốn chỗ bằng `--danger`. `--no` là nâu đất trung
   tính của vuốt trái ("tôi không muốn món này"); dùng cho lỗi làm thất bại trông như một lựa
   chọn. Một component chung là cách duy nhất để ranh giới này không trôi lần nữa.

## Consequence

- Thêm mã lỗi mới mà quên dịch → `tsc` đỏ, không phải người dùng phát hiện.
- Ba câu đổi chữ khi gom (rõ nhất: bỏ chữ "Admin" khỏi câu hiện cho người dùng).
- `banner.tsx` KHÔNG gộp vào `InlineError` — dải thông báo toàn màn là thứ khác.

## Affected Documents

- SDD §2.5 — ghi chú bảng dịch nay ở `shared/errors/messages.ts`, chữ ký nhận `Failure`.
- Design Criteria §5 — `InlineError` nay là component thật.
```

---

# 11. Master Plan

```markdown
| `[x] E6-T2` | Bảng dịch mã lỗi và lỗi tại chỗ | … |
```
