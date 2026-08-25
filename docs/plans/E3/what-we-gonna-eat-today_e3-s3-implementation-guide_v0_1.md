# 🏁 Implementation Guide — E3 Slice S3: Completed + Màn hình Creator

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-19`
> - **Upstream:** [Master Plan](../what-we-gonna-eat-today_master-plan_v1_0.md) (`E3-T5`, `E3-T6`) • [SDD](../what-we-gonna-eat-today_sdd_v0_1.md) (`SPEC-013`) • [Business Rules](../what-we-gonna-eat-today_business-rules_v1.4.md) (`BR-026`, `BR-044`) • [Test Cases](../what-we-gonna-eat-today_test-cases-specification_v0_1.md) (`TC-054→057`) • Mockup `docs/designs/designs/S-04 Trang nhom.dc.html`, `docs/designs/designs/S-09 Deck vuot prototype.dc.html`
> - **Tiền đề bắt buộc:** `S1` (`E3-T1`) và `S2` (`E3-T3`/`E3-T4`) đã code.
>
> 🏁 *Slice cuối của E3 — mốc M3. Nối một UI đã có sẵn (E1-T8) vào backend thật, và dựng trạng thái "phiên đang mở" trên trang chủ nhóm.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | --- | --- | --- |
| `E3-T5` | Completed và mở lại | 3 | `src/features/session/**` | `TC-055` pass: Participant `COMPLETED` **vẫn vuốt được tiếp** |
| `E3-T6` | Màn hình phiên cho Creator | 4 | `src/features/session/presentation/**` | Thấy ai xong ai chưa, vào phiên được — **Cột mốc M3** |

- [ ] Bấm "Tôi chọn xong" trong deck → `participants.state` đổi `COMPLETED` thật trong DB
- [ ] Bấm "Mở lại lượt chọn" → đổi lại `ACTIVE`, vuốt tiếp được (`TC-055` qua UI thật)
- [ ] Reload trang deck sau khi đã Completed → vẫn ở màn "Xong lượt của bạn", không reset về deck
- [ ] `TC-054`, `TC-056`, `TC-057` pass ở tầng `A`
- [ ] `/groups/{id}` hiện đúng trạng thái "Phiên đang mở" kèm danh sách ai xong ai chưa khi có phiên `ACTIVE` hôm nay
- [ ] `yarn verify && yarn arch:probe` xanh

---

# 1. Phát hiện quan trọng nhất — UI đã có sẵn, chỉ chưa nối backend

Đã đọc verbatim `src/features/selection/presentation/components/deck-screen.tsx` (đã ship từ E1-T8, chưa đổi gì tới slice này). Cả khối `isEmpty` (hết thẻ) lẫn `isDone` **đã có sẵn**, đúng copy mockup `S-09 Deck vuot prototype.dc.html`:

```tsx
// isDeck / isEmpty — nút "Tôi chọn xong":
<Button type="button" variant="quiet" size="sm" onClick={() => setView('done')}>
  Tôi chọn xong
</Button>

// isDone — nút "Mở lại lượt chọn":
<Button type="button" variant="secondary" onClick={() => setView('deck')}>
  Mở lại lượt chọn
</Button>
```

Cả hai chỉ đổi `view` — biến state **cục bộ**, không gọi API, không đụng `participants.state`. `DeckScreenProps` hiện chỉ có `{sessionId, dateCaption, dishes}` — không có trường nào về trạng thái participant. Nghĩa là: reload trang sau khi bấm "Tôi chọn xong" sẽ mất trạng thái, luôn quay về deck.

**Việc thật của `E3-T5` là nối dây, không phải dựng UI mới**: một use case + 2 method port đọc/ghi `participants.state`, một Route Handler, sửa `deck-screen.tsx` để `onClick` gọi request thật thay vì chỉ `setView`, và khởi tạo `view` ban đầu theo dữ liệu server.

`record-interaction.ts` (SPEC-012) và `list-deck.ts` (SPEC-011) đã đọc kỹ — **cả hai đã đúng sẵn**:

- `record-interaction.ts` chỉ chặn `participant === null || participant.state === 'REMOVED'` — danh sách **đen**, không chặn `COMPLETED`.
- `list-deck.ts` chấp nhận `ACTIVE`/`COMPLETED` — danh sách **trắng**, viết khác cách nhưng cùng kết quả (comment trong file giải thích chủ ý giữ hai cách viết khác nhau, khớp đúng lời văn của từng SPEC).

**`TC-055` đã pass từ E1-T9, trước cả khi slice này tồn tại.** Không sửa hai file đó — chạm vào là thừa.

**Một comment cũ ghi sai epic**, `src/shared/db/schema.ts` dòng 199-200:

```ts
/** SDD §2.2. Ở S4 chỉ `ACTIVE` khả thi — `COMPLETED` là SPEC-013 (E4),
 *  `REMOVED` là F25 (ngoài v1.0, SPEC-009 nói rõ). */
```

Sửa `(E4)` thành `(E3-T5)` — nhãn cũ lệch với Master Plan hiện tại.

---

# 2. Hai quyết định đã hỏi và chốt

1. **Độ chi tiết trạng thái hàng participant: đủ 3 tầng như mockup S-04.** Dữ liệu mẫu: `"Bạn" / "Chưa xong"`, `"Mẹ" / "Xong · 6 món"`, `"Bố" / "Xong · 3 món"`, `"Em Trâm" / "Chưa mở"`. Mockup không có ca "đang vuốt dở, chưa xong, không phải bạn" — tự suy `"Đang chọn"` cho ca đó (ACTIVE, đã có ≥1 tương tác, không phải người xem). Cần đếm `interactions` theo từng participant.
2. **Mọi thành viên nhóm đều xem được "ai xong ai chưa"**, không riêng Creator — đúng mockup (không phân vai trò trong dữ liệu). Giữ nguyên guard `MEMBER` đã có, không thêm kiểm `creatorUserId === user.id`.

## 2.1 Phạm vi KHÔNG làm

- **"Xem tổng hợp cả nhà"** (nút phụ trong mockup, trỏ hướng Session Ranking/SPEC-014) — epic sau (E4/E5), chưa có route đích. Không dựng — không tạo link chết.
- **Trạng thái "Đã chốt" của S-04** — `finalizeSession` (E1-T10/T11) chưa nối route nào, nên về mặt UI thật không session nào tới được `FINALIZED`. Không xây nhánh hiển thị cho state này; nếu gặp (lý thuyết), rơi về nhánh mặc định "không có phiên đang mở" — không crash là đủ.
- **Sửa `record-interaction.ts`/`list-deck.ts`** — đã đúng sẵn, xem §1.

---

# 3. File tree

```
src/features/session/
  application/
    session-repository.ts                    SỬA (+ 4 method, xem §4/§7)
    set-participant-completed.ts              + MỚI
    set-participant-completed.test.ts         + MỚI
  infrastructure/
    drizzle-session-repository.ts             SỬA (+ 4 method)
    drizzle-session-repository.integration.test.ts   SỬA (mở rộng)
  presentation/components/
    participant-status.ts                     + MỚI (suy trạng thái hiển thị)
    participant-status.test.ts                + MỚI

src/features/selection/presentation/components/
  deck-screen.tsx / .test.tsx                 SỬA (nối dây, xem §6)

src/features/group/presentation/components/
  group-overview-screen.tsx / .test.tsx       SỬA (+ trạng thái "Phiên đang mở")

src/app/
  api/sessions/[id]/completed/route.ts        + MỚI
  sessions/[sessionId]/page.tsx               SỬA (+ initialParticipantState)
  groups/[groupId]/page.tsx                   SỬA (+ overview phiên đang mở)

src/shared/db/schema.ts                       SỬA (sửa comment "(E4)" → "(E3-T5)")
```

---

# 4. Port `session-repository.ts` — thêm 2 method cho E3-T5

```ts
export interface SessionRepository {
  // ...các method từ E1/S1/S2 giữ nguyên...

  /**
   * MỚI. Dùng ở CẢ HAI nơi: `setParticipantCompleted` (đọc trạng thái hiện
   * tại trước khi ghi) và `app/sessions/[sessionId]/page.tsx` (khởi tạo
   * `view` ban đầu của `DeckScreen` — reload trang phải giữ đúng trạng thái
   * server, không phải luôn về `'deck'`).
   */
  findParticipantState(sessionId: string, userId: string): Promise<ParticipantState | null>

  /**
   * MỚI. Ghi trực tiếp, không kiểm tồn tại lại — người gọi (`setParticipantCompleted`)
   * đã xác nhận qua `findParticipantState` trước đó. `outcome: 'NOT_FOUND'`
   * là lưới an toàn cho trường hợp hiếm: participant bị đổi trạng thái giữa
   * lúc đọc và lúc ghi (ví dụ Creator gỡ ngay lúc đó — F25, ngoài v1.0 nhưng
   * cột `REMOVED` đã tồn tại).
   */
  setParticipantState(
    sessionId: string,
    userId: string,
    state: 'ACTIVE' | 'COMPLETED',
  ): Promise<{ outcome: 'UPDATED' | 'NOT_FOUND' }>
}
```

`ParticipantState` import từ `../domain/session` (đã có từ E1).

---

# 5. Use case `set-participant-completed.ts` — MỚI

```ts
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { SessionRepository } from './session-repository'

export type SetParticipantCompletedDeps = {
  readonly sessions: SessionRepository
}

export type SetParticipantCompletedInput = {
  readonly sessionId: string
  readonly userId: string
  readonly completed: boolean
}

/**
 * SPEC-013 — Đánh dấu Completed & Mở lại.
 *
 * KHÔNG kiểm "người gọi là Creator" — đây là hành động TỰ THÂN của chính
 * participant đang vuốt. SPEC-013's `Đầu vào` chính thức là `{sessionId,
 * completed}`, không có `userId` — vì US-014 xác nhận rõ: *"Given tôi đang
 * duyệt món, When bấm 'Tôi đã chọn xong'"* — người bấm và người bị đổi trạng
 * thái LUÔN là cùng một người. `userId` ở đây lấy từ danh tính đã xác thực
 * của caller (Route Handler truyền vào), không phải tham số người dùng tự
 * chọn.
 *
 * Idempotent có chủ ý: gửi `completed=true` khi đã `COMPLETED` không phải
 * lỗi — input là MỘT TRẠNG THÁI (`{completed: boolean}`), không phải một
 * LỆNH CHUYỂN TIẾP. Không có TC nào đòi lỗi cho ca này.
 */
export async function setParticipantCompleted(
  deps: SetParticipantCompletedDeps,
  input: SetParticipantCompletedInput,
): Promise<Result<{ state: 'ACTIVE' | 'COMPLETED' }, Failure>> {
  const session = await deps.sessions.findById(input.sessionId)

  if (session === null || session.state !== 'ACTIVE') {
    return err(failure('ERR_SESSION_NOT_ACTIVE', { sessionId: input.sessionId }))
  }

  const participantState = await deps.sessions.findParticipantState(input.sessionId, input.userId)
  if (participantState === null || participantState === 'REMOVED') {
    return err(failure('ERR_NOT_PARTICIPANT', { sessionId: input.sessionId }))
  }

  const nextState = input.completed ? 'COMPLETED' : 'ACTIVE'
  await deps.sessions.setParticipantState(input.sessionId, input.userId, nextState)

  return ok({ state: nextState })
}
```

Không xử lý nhánh `NOT_FOUND` từ `setParticipantState` riêng — cửa sổ race giữa hai lệnh đọc/ghi trong cùng một request là cực hiếm (không có TC nào kiểm ca này, khác hẳn `startSession`'s TC-107 vốn có race thật do hai người dùng độc lập). Nếu về sau cần chặt hơn, đây là chỗ thêm nhánh.

## 5.1 Test — `set-participant-completed.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest'

import { setParticipantCompleted } from './set-participant-completed'
import type { SessionRepository, SessionSummary } from './session-repository'

function makeSession(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return { id: 's1', groupId: 'g1', decisionDate: '2026-08-19', state: 'ACTIVE', ...overrides }
}

function makeDeps(overrides: {
  session?: SessionSummary | null
  participantState?: 'ACTIVE' | 'COMPLETED' | 'REMOVED' | null
} = {}) {
  const sessions: Partial<SessionRepository> = {
    findById: vi.fn(async () => (overrides.session === undefined ? makeSession() : overrides.session)),
    findParticipantState: vi.fn(async () =>
      overrides.participantState === undefined ? 'ACTIVE' : overrides.participantState,
    ),
    setParticipantState: vi.fn(async () => ({ outcome: 'UPDATED' as const })),
  }
  return sessions as SessionRepository
}

const BASE_INPUT = { sessionId: 's1', userId: 'u1' }

describe('setParticipantCompleted', () => {
  it('TC-054 — ACTIVE gửi completed=true: chuyển COMPLETED', async () => {
    const sessions = makeDeps()

    const result = await setParticipantCompleted({ sessions }, { ...BASE_INPUT, completed: true })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.state).toBe('COMPLETED')
    expect(sessions.setParticipantState).toHaveBeenCalledWith('s1', 'u1', 'COMPLETED')
  })

  it('TC-056 — COMPLETED gửi completed=false: chuyển lại ACTIVE', async () => {
    const sessions = makeDeps({ participantState: 'COMPLETED' })

    const result = await setParticipantCompleted({ sessions }, { ...BASE_INPUT, completed: false })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.state).toBe('ACTIVE')
    expect(sessions.setParticipantState).toHaveBeenCalledWith('s1', 'u1', 'ACTIVE')
  })

  it('TC-057 — Session đã FINALIZED: ERR_SESSION_NOT_ACTIVE, không ghi gì', async () => {
    const sessions = makeDeps({ session: makeSession({ state: 'FINALIZED' }) })

    const result = await setParticipantCompleted({ sessions }, { ...BASE_INPUT, completed: true })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_SESSION_NOT_ACTIVE')
    expect(sessions.setParticipantState).not.toHaveBeenCalled()
  })

  it('caller không phải Participant của session: ERR_NOT_PARTICIPANT', async () => {
    const sessions = makeDeps({ participantState: null })

    const result = await setParticipantCompleted({ sessions }, { ...BASE_INPUT, completed: true })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_NOT_PARTICIPANT')
  })

  it('participant REMOVED: ERR_NOT_PARTICIPANT', async () => {
    const sessions = makeDeps({ participantState: 'REMOVED' })

    const result = await setParticipantCompleted({ sessions }, { ...BASE_INPUT, completed: true })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_NOT_PARTICIPANT')
  })

  it('gửi completed=true khi đã COMPLETED: idempotent, không lỗi', async () => {
    const sessions = makeDeps({ participantState: 'COMPLETED' })

    const result = await setParticipantCompleted({ sessions }, { ...BASE_INPUT, completed: true })

    expect(result.ok).toBe(true)
  })
})
```

---

# 6. Infra `drizzle-session-repository.ts` — thêm `findParticipantState`/`setParticipantState`

```ts
async function findParticipantState(sessionId: string, userId: string): Promise<ParticipantState | null> {
  const rows = await getDb()
    .select({ state: participants.state })
    .from(participants)
    .where(and(eq(participants.sessionId, sessionId), eq(participants.userId, userId)))
    .limit(1)

  return rows[0]?.state ?? null
}

async function setParticipantState(
  sessionId: string,
  userId: string,
  state: 'ACTIVE' | 'COMPLETED',
): Promise<{ outcome: 'UPDATED' | 'NOT_FOUND' }> {
  const rows = await getDb()
    .update(participants)
    .set({ state })
    .where(and(eq(participants.sessionId, sessionId), eq(participants.userId, userId)))
    .returning({ id: participants.id })

  return { outcome: rows[0] === undefined ? 'NOT_FOUND' : 'UPDATED' }
}
```

Thêm cả hai vào `export const drizzleSessionRepository`.

## 6.1 Integration test — mở rộng `drizzle-session-repository.integration.test.ts`

```ts
it('TC-054/TC-056 — đổi qua lại COMPLETED/ACTIVE, đọc lại đúng giá trị', async () => {
  // dựng group/user/session ACTIVE có sẵn creator-participant (createDraftWithCreatorParticipant + startDraft)
  await drizzleSessionRepository.setParticipantState(session.id, user.id, 'COMPLETED')
  expect(await drizzleSessionRepository.findParticipantState(session.id, user.id)).toBe('COMPLETED')

  await drizzleSessionRepository.setParticipantState(session.id, user.id, 'ACTIVE')
  expect(await drizzleSessionRepository.findParticipantState(session.id, user.id)).toBe('ACTIVE')
})
```

---

# 7. Route Handler `app/api/sessions/[id]/completed/route.ts` — MỚI

Đúng khuôn `app/api/sessions/[id]/interactions/route.ts` đã có (Route Handler, không phải Server Action — cùng lý do Tech Spec §4.1, dù ở đây tần suất thấp hơn nhiều so với vuốt liên tục, giữ nhất quán vẫn hợp lý hơn là trộn hai kiểu gọi backend trong cùng một trang).

```ts
import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { setParticipantCompleted } from '@/features/session/application/set-participant-completed'
import { drizzleSessionRepository } from '@/features/session/infrastructure/drizzle-session-repository'
import { httpStatusForErrorCode } from '@/shared/http-error'

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser()
  if (user === null) {
    return Response.json(
      { code: 'ERR_UNAUTHENTICATED' },
      { status: httpStatusForErrorCode('ERR_UNAUTHENTICATED') },
    )
  }

  const { id: sessionId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ code: 'ERR_VALIDATION' }, { status: httpStatusForErrorCode('ERR_VALIDATION') })
  }

  const completed =
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>)['completed'] : undefined

  if (typeof completed !== 'boolean') {
    return Response.json({ code: 'ERR_VALIDATION' }, { status: httpStatusForErrorCode('ERR_VALIDATION') })
  }

  const result = await setParticipantCompleted(
    { sessions: drizzleSessionRepository },
    { sessionId, userId: user.id, completed },
  )

  if (!result.ok) {
    return Response.json(
      { code: result.error.code, details: result.error.details },
      { status: httpStatusForErrorCode(result.error.code) },
    )
  }

  return Response.json({ state: result.value.state }, { status: 200 })
}
```

---

# 8. `deck-screen.tsx` — SỬA, nối hai handler đã có sẵn

## 8.1 Prop mới + khởi tạo `view` theo dữ liệu thật

```tsx
export type DeckScreenProps = {
  sessionId: string
  dateCaption: string
  dishes: DishCard[]
  initialParticipantState: 'ACTIVE' | 'COMPLETED'   // + MỚI
}

export function DeckScreen({
  sessionId,
  dateCaption,
  dishes,
  initialParticipantState,
}: DeckScreenProps): ReactElement {
  const [cursor, setCursor] = useState(0)
  const [marks, setMarks] = useState<Array<'yes' | 'no'>>([])
  const [view, setView] = useState<ViewState>(
    initialParticipantState === 'COMPLETED' ? 'done' : 'deck',
  )
  // ...phần còn lại giữ nguyên...
```

## 8.2 `onFinish`/`onReopen` — gọi request thật, optimistic

Thêm hai hàm nhỏ, thay `onClick={() => setView('done')}` và `onClick={() => setView('deck')}` bằng chúng:

```tsx
function handleFinish() {
  setView('done')   // optimistic — đúng tinh thần vuốt (E1-T9), UI đi trước
  void fetch(`/api/sessions/${sessionId}/completed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: true }),
  }).catch(() => {
    // Lỗi mạng: không revert `view`. Người dùng vẫn thấy "Xong lượt của bạn"
    // đúng ý định của họ; request thất bại sẽ được coi là đồng bộ lại ở lần
    // tương tác kế tiếp (mở lại/vuốt tiếp), không cần cơ chế retry riêng cho
    // một hành động đơn lẻ, không thường xuyên như swipe.
  })
}

function handleReopen() {
  setView('deck')
  void fetch(`/api/sessions/${sessionId}/completed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: false }),
  }).catch(() => {})
}
```

Không dùng `sendInteractionWithRetry` (retry-backoff 1s/2s/4s) — cơ chế đó phục vụ chuỗi vuốt liên tục nhiều lượt/giây (NFR-02, Tech Spec §4.1). Đây là một cú bấm đơn lẻ, có chủ ý; thêm cả bộ máy retry cho một request là phí, và optimistic-không-revert đã đủ chấp nhận được cho quy mô hộ gia đình.

## 8.3 Sửa dòng copy cứng tên "Mẹ"

```diff
- <span>Sửa được cho tới khi Mẹ chốt bữa</span>
+ <span>Sửa được cho tới khi phiên được chốt</span>
```

Bản gốc (E1-T8) copy nguyên văn tên nhân vật mẫu "Mẹ" từ mockup — đúng cho ảnh chụp màn hình nhưng sai cho một Group thật có Creator bất kỳ. Đang sửa đúng khối JSX này để nối `onClick` nên tiện sửa luôn; không thêm truy vấn nào để lấy tên Creator thật — câu trung tính vẫn đúng nghĩa.

## 8.4 Test — mở rộng `deck-screen.test.tsx`

```tsx
it('initialParticipantState COMPLETED: mở thẳng vào màn "Xong lượt của bạn"', () => {
  render(
    <DeckScreen
      sessionId="s1"
      dateCaption="Thứ Ba · 19 tháng 8"
      dishes={SOME_DISHES}
      initialParticipantState="COMPLETED"
    />,
  )

  expect(screen.getByText('Xong lượt của bạn.')).toBeDefined()
})

it('bấm "Tôi chọn xong" gọi đúng endpoint với completed=true', async () => {
  const fetchSpy = vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ state: 'COMPLETED' }) }),
  )

  render(
    <DeckScreen sessionId="s1" dateCaption="..." dishes={[]} initialParticipantState="ACTIVE" />,
  )

  await userEvent.click(screen.getByRole('button', { name: 'Tôi chọn xong' }))

  expect(fetchSpy).toHaveBeenCalledWith(
    '/api/sessions/s1/completed',
    expect.objectContaining({ body: JSON.stringify({ completed: true }) }),
  )
  vi.unstubAllGlobals()
})
```

Theo đúng idiom đã dùng ở `deck-screen.test.tsx` hiện có cho `sendInteractionWithRetry` — `vi.stubGlobal('fetch', ...)` rồi `vi.unstubAllGlobals()` cuối `it`, không đưa vào `afterEach`.

---

# 9. `app/sessions/[sessionId]/page.tsx` — SỬA

```tsx
const participantState = await drizzleSessionRepository.findParticipantState(sessionId, user.id)

// listDeck ở trên đã thành công (participant ACTIVE|COMPLETED, không REMOVED) —
// participantState ở đây không bao giờ null/REMOVED trong thực tế, nhưng vẫn
// ép kiểu tường minh thay vì `as` để tsc bắt được nếu giả định này sai sau này.
if (participantState !== 'ACTIVE' && participantState !== 'COMPLETED') {
  notFound()
}

return (
  <DeckScreen
    sessionId={sessionId}
    dateCaption={formatVietnameseDateShort(session.decisionDate)}
    dishes={deck.value.items}
    initialParticipantState={participantState}
  />
)
```

Cập nhật luôn comment cũ ở nhánh `!deck.ok` — nó nói *"E3-T3 (thêm Participant) sẽ cho lối vào hợp lệ"*; giờ E3-T3 đã landed (S2), câu đó không còn là việc tương lai nữa. Đổi thành ghi nhận đơn giản: *"ERR_NOT_PARTICIPANT — Group Member chưa từng được thêm vào Session này qua `addParticipant`."*

---

# 10. `participant-status.ts` — MỚI, suy trạng thái hiển thị

```ts
import type { ParticipantState } from '../../domain/session'

export type ParticipantProgress = {
  readonly userId: string
  readonly displayName: string
  readonly state: ParticipantState
  readonly proposedCount: number
  readonly totalInteractions: number
}

/**
 * S-04 — chữ hiển thị cho từng hàng participant. Ba tầng đúng mockup, tầng
 * thứ tư ("Đang chọn") tự suy vì mockup không có ca này (xem Implementation
 * Guide §2).
 *
 * Hàng CHÍNH NGƯỜI XEM luôn "Chưa xong" khi chưa COMPLETED — không phân biệt
 * "đã vuốt vài món" hay "chưa mở" cho chính mình, vì với TA thì cả hai đều
 * cùng một hành động tiếp theo: "Vào lượt của bạn". Phân biệt "Đang chọn"/
 * "Chưa mở" chỉ có ý nghĩa khi NHÌN NGƯỜI KHÁC.
 */
export function describeParticipantRow(p: ParticipantProgress, isCurrentUser: boolean): string {
  if (p.state === 'COMPLETED') {
    return `Xong · ${p.proposedCount} món`
  }
  if (isCurrentUser) {
    return 'Chưa xong'
  }
  return p.totalInteractions > 0 ? 'Đang chọn' : 'Chưa mở'
}
```

Đặt ở `presentation/`, không phải `domain/` — đây là CHỮ HIỂN THỊ tiếng Việt, không phải luật nghiệp vụ (cùng nguyên tắc `system-tag-label.ts` ở E2-S3).

## 10.1 Test — `participant-status.test.ts`

```ts
import { describe, expect, it } from 'vitest'

import { describeParticipantRow } from './participant-status'

function makeProgress(overrides: Partial<Parameters<typeof describeParticipantRow>[0]> = {}) {
  return {
    userId: 'u1',
    displayName: 'Mẹ',
    state: 'ACTIVE' as const,
    proposedCount: 0,
    totalInteractions: 0,
    ...overrides,
  }
}

describe('describeParticipantRow', () => {
  it('COMPLETED: "Xong · N món"', () => {
    expect(describeParticipantRow(makeProgress({ state: 'COMPLETED', proposedCount: 6 }), false)).toBe(
      'Xong · 6 món',
    )
  })

  it('chính mình, chưa xong: luôn "Chưa xong" bất kể đã tương tác bao nhiêu', () => {
    expect(describeParticipantRow(makeProgress({ totalInteractions: 3 }), true)).toBe('Chưa xong')
  })

  it('người khác, đã có tương tác, chưa xong: "Đang chọn"', () => {
    expect(describeParticipantRow(makeProgress({ totalInteractions: 2 }), false)).toBe('Đang chọn')
  })

  it('người khác, chưa tương tác nào: "Chưa mở"', () => {
    expect(describeParticipantRow(makeProgress({ totalInteractions: 0 }), false)).toBe('Chưa mở')
  })
})
```

---

# 11. Port `session-repository.ts` — thêm 2 method cho E3-T6

```ts
export type SessionOverview = {
  readonly id: string
  readonly participants: readonly ParticipantProgress[]
}

export interface SessionRepository {
  // ...

  /**
   * MỚI. Trạng thái + provenance đủ để `findBlockingSessionToday`'s caller
   * (E3-T6) biết có cần vẽ trạng thái "Phiên đang mở" hay không mà không tốn
   * thêm một round-trip `findById` riêng.
   */
  findBlockingSessionToday(
    groupId: string,
    decisionDate: string,
  ): Promise<{ id: string; state: SessionState } | null>   // SỬA — thêm `state`

  /** MỚI — E3-T6. Một câu JOIN, không round-trip riêng cho từng participant. */
  findSessionOverview(sessionId: string): Promise<SessionOverview | null>
}
```

**Sửa chữ ký của `findBlockingSessionToday`** (thêm `state`) — đã dùng ở `create-session.ts` và `openSessionAction` (S1), cả hai chỉ kiểm `!== null`, không đọc field nào khác, nên đây là mở rộng an toàn, không phá gọi cũ nào.

## 11.1 Infra

```ts
async function findBlockingSessionToday(
  groupId: string,
  decisionDate: string,
): Promise<{ id: string; state: SessionState } | null> {
  const rows = await getDb()
    .select({ id: selectionSessions.id, state: selectionSessions.state })
    .from(selectionSessions)
    .where(
      and(
        eq(selectionSessions.groupId, groupId),
        eq(selectionSessions.decisionDate, decisionDate),
        inArray(selectionSessions.state, ['ACTIVE', 'FINALIZED']),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

/**
 * JOIN `participants` + `users` (tên hiển thị) + `LEFT JOIN interactions`
 * (đếm). Lọc `state != 'REMOVED'` — F25 (gỡ participant) ngoài v1.0 nhưng
 * cột đã tồn tại, phòng hờ rẻ.
 *
 * `proposedCount` đếm riêng `SWIPE_RIGHT` (chữ hiển thị "Xong · N món"), còn
 * `totalInteractions` đếm MỌI loại — cần cả hai vì "Chưa mở" (0 tương tác
 * bất kỳ) khác "Đang chọn" (có tương tác nhưng chưa đề xuất món nào), một
 * phân biệt mà chỉ đếm `SWIPE_RIGHT` không thấy được.
 */
async function findSessionOverview(sessionId: string): Promise<SessionOverview | null> {
  const db = getDb()

  const rows = await db
    .select({
      userId: participants.userId,
      displayName: users.displayName,
      state: participants.state,
      proposedCount: sql<number>`count(${interactions.id}) filter (where ${interactions.type} = 'SWIPE_RIGHT')`,
      totalInteractions: sql<number>`count(${interactions.id})`,
    })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId))
    .leftJoin(interactions, eq(interactions.participantId, participants.id))
    .where(and(eq(participants.sessionId, sessionId), ne(participants.state, 'REMOVED')))
    .groupBy(participants.id, participants.userId, users.displayName, participants.state)

  if (rows.length === 0) {
    return null
  }

  return {
    id: sessionId,
    participants: rows.map((row) => ({
      ...row,
      proposedCount: Number(row.proposedCount),
      totalInteractions: Number(row.totalInteractions),
    })),
  }
}
```

`count(...)` của Postgres trả về kiểu `bigint`, driver trả JS string qua `sql<number>` — `Number(...)` ép kiểu tường minh, đúng cảnh báo đã ghi ở E2-S3 về `sql<T>` là một LỜI KHAI chứ không phải một phép kiểm.

Thêm cả `findSessionOverview` vào `export const drizzleSessionRepository`, cùng chữ ký mới của `findBlockingSessionToday`.

## 11.2 Integration test

```ts
it('findSessionOverview đếm đúng proposedCount và totalInteractions cho từng participant', async () => {
  // dựng session ACTIVE với 2 participant, ghi vài interactions qua
  // recordInteraction (selection feature — hoặc insert thẳng bảng interactions
  // trong test), rồi assert đúng count cho từng người.
})
```

---

# 12. `app/groups/[groupId]/page.tsx` + `GroupOverviewScreen` — SỬA

## 12.1 `GroupPage`

```tsx
const blockingSession = await drizzleSessionRepository.findBlockingSessionToday(groupId, decisionDate)
const activeSessionOverview =
  blockingSession !== null && blockingSession.state === 'ACTIVE'
    ? await drizzleSessionRepository.findSessionOverview(blockingSession.id)
    : null

return (
  <GroupOverviewScreen
    // ...props cũ...
    activeSession={
      activeSessionOverview === null
        ? null
        : { id: blockingSession!.id, participants: activeSessionOverview.participants }
    }
    currentUserId={user.id}
  />
)
```

## 12.2 `GroupOverviewScreen` — thêm nhánh "Phiên đang mở"

```tsx
export type GroupOverviewScreenProps = {
  // ...props cũ...
  activeSession: { id: string; participants: readonly ParticipantProgress[] } | null
  currentUserId: string
}
```

Chèn ngay sau header, trước khối `EmptyStateCard`/danh sách dish hiện có — chỉ hiện khi `activeSession !== null`:

```tsx
{activeSession === null ? null : (
  <div className="flex flex-col gap-4 rounded-card border border-border bg-surface-raised p-6">
    <div className="flex items-center justify-between gap-3">
      <span className="rounded-chip bg-accent-soft px-3 py-1.5 text-caption font-semibold text-accent">
        Phiên đang mở
      </span>
      <span className="text-caption font-medium tabular-nums text-ink-muted">
        {completedCount} / {activeSession.participants.length} người xong
      </span>
    </div>

    <h2 className="text-title font-semibold text-ink">
      {selfCompleted ? 'Bạn đã xong lượt của mình.' : 'Lượt của bạn chưa xong.'}
    </h2>

    <ul className="flex flex-col gap-2 border-t border-border pt-4">
      {activeSession.participants.map((p) => (
        <li key={p.userId} className="flex items-center justify-between gap-3">
          <span
            className={`text-subtitle font-semibold ${
              p.userId === currentUserId ? 'text-ink' : 'text-ink-muted'
            }`}
          >
            {p.displayName}
          </span>
          <span className="text-caption font-medium text-ink-muted">
            {describeParticipantRow(p, p.userId === currentUserId)}
          </span>
        </li>
      ))}
    </ul>

    <Link
      href={`/sessions/${activeSession.id}`}
      className="flex min-h-14 w-full items-center justify-center rounded-control bg-accent px-6 text-subtitle font-semibold text-on-accent shadow-button hover:bg-accent-hover active:scale-[0.98] active:bg-accent-active"
    >
      Vào lượt của bạn
    </Link>
  </div>
)}
```

với hai biến suy ra ngay trên:

```tsx
const selfCompleted = activeSession?.participants.find((p) => p.userId === currentUserId)?.state === 'COMPLETED'
const completedCount = activeSession?.participants.filter((p) => p.state === 'COMPLETED').length ?? 0
```

**Không đổi nút CTA đáy màn** (vẫn `Mở phiên`/`Thêm món đầu tiên` từ S1) — khối "Phiên đang mở" là một CARD MỚI chèn ở giữa, không thay thế phần dưới. Nếu `activeSession !== null`, về lý thuyết nút "Mở phiên" ở đáy vẫn hiện và bấm vào sẽ đi tới `openSessionAction`, nơi `findDraftToday`/`findBlockingSessionToday` (S1) đã tự điều hướng đúng vào phiên đang chạy — không hành vi sai, chỉ hơi thừa một bước bấm. Chấp nhận được cho slice này; ẩn hẳn nút đáy khi có phiên đang mở là một cải tiến nhỏ có thể làm sau, không phải DoD của E3-T6.

## 12.3 Test — mở rộng `group-overview-screen.test.tsx`

```tsx
it('activeSession !== null: hiện badge "Phiên đang mở", đúng số người xong, đúng tên từng hàng', () => {
  const activeSession = {
    id: 's1',
    participants: [
      { userId: 'me', displayName: 'Bạn', state: 'ACTIVE' as const, proposedCount: 0, totalInteractions: 2 },
      { userId: 'u2', displayName: 'Mẹ', state: 'COMPLETED' as const, proposedCount: 6, totalInteractions: 9 },
    ],
  }

  render(
    <GroupOverviewScreen
      {...BASE_PROPS}
      activeSession={activeSession}
      currentUserId="me"
    />,
  )

  expect(screen.getByText('Phiên đang mở')).toBeDefined()
  expect(screen.getByText('1 / 2 người xong')).toBeDefined()
  expect(screen.getByText('Lượt của bạn chưa xong.')).toBeDefined()
  expect(screen.getByText('Chưa xong')).toBeDefined()   // hàng "Bạn"
  expect(screen.getByText('Xong · 6 món')).toBeDefined() // hàng "Mẹ"
  expect(screen.getByRole('link', { name: 'Vào lượt của bạn' })).toBeDefined()
})

it('activeSession === null: không hiện khối phiên đang mở', () => {
  render(<GroupOverviewScreen {...BASE_PROPS} activeSession={null} currentUserId="me" />)
  expect(screen.queryByText('Phiên đang mở')).toBeNull()
})
```

---

# 13. Rủi ro

| Rủi ro | Hậu quả | Giảm thiểu |
| --- | --- | --- |
| `handleFinish`/`handleReopen` không revert `view` khi request lỗi mạng | UI nói "Xong" nhưng DB vẫn `ACTIVE` — lệch tạm thời | Đã chấp nhận có chủ ý (§8.2); lần tương tác kế tiếp (mở lại, hoặc reload trang) tự đồng bộ lại theo `findParticipantState` |
| `count(...)` trả `bigint`/string mà quên `Number(...)` | So sánh `proposedCount > 0` sai kiểu, hoặc hiện `"6"` lẫn `6` không nhất quán | Đã ép kiểu tường minh ở §11.1, không dùng `as` |
| `findBlockingSessionToday` đổi chữ ký (`{id}` → `{id, state}`) | Nếu có chỗ gọi cũ destructure sai | Đã kiểm: `create-session.ts` và `openSessionAction` (S1) chỉ kiểm `!== null`, không đọc field nào khác — an toàn |
| Card "Phiên đang mở" và nút "Mở phiên" đáy màn cùng hiện, gây thừa | Không sai, chỉ hơi rối | Đã ghi nhận ở §12.2, để dành cải tiến sau |

---

# 14. Test Cases coverage

| TC | Mô tả | Tầng | Nơi test |
| --- | --- | --- | --- |
| `TC-054` | Participant `ACTIVE`, gửi `completed=true` → chuyển `COMPLETED` | `A` | `set-participant-completed.test.ts` |
| `TC-055` | Participant `COMPLETED`, gửi tiếp `SWIPE_RIGHT` → ghi nhận bình thường | — | **Đã pass từ E1-T9** (`record-interaction.ts` không chặn COMPLETED) — không cần test mới |
| `TC-056` | Participant `COMPLETED`, gửi `completed=false` → chuyển lại `ACTIVE` | `A` | `set-participant-completed.test.ts` |
| `TC-057` | Session đã `FINALIZED`, gửi cập nhật completed → `ERR_SESSION_NOT_ACTIVE` | `A` | `set-participant-completed.test.ts` |

---

# 15. Thứ tự TDD

1. `set-participant-completed.test.ts` → `set-participant-completed.ts`
2. `session-repository.ts` (port — 4 method mới/sửa, không test riêng)
3. `drizzle-session-repository.ts` (infra) → mở rộng integration test (§6.1, §11.2)
4. `app/api/sessions/[id]/completed/route.ts`
5. `deck-screen.test.tsx` (mở rộng, §8.4) → `deck-screen.tsx` (§8.1-8.3)
6. `app/sessions/[sessionId]/page.tsx` (§9)
7. `participant-status.test.ts` → `participant-status.ts`
8. `group-overview-screen.test.tsx` (mở rộng, §12.3) → `group-overview-screen.tsx` (§12.2) → `group-overview-screen`'s caller `app/groups/[groupId]/page.tsx` (§12.1)
9. `yarn verify && yarn arch:probe && yarn test:integration`

---

# 16. Verify

## 16.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn build
yarn test:integration
```

## 16.2 Bằng chứng TC-055 qua UI thật — đây là DoD chính của E3-T5

1. `yarn dev`, mở một phiên đang `ACTIVE` (đường S1), vuốt vài món.
2. Bấm "Tôi chọn xong". → `db:studio` → `participants.state = 'COMPLETED'` cho đúng dòng của bạn.
3. **Reload trang** `/sessions/{id}`. → Vẫn ở màn "Xong lượt của bạn." — KHÔNG reset về deck (đây là điểm khác biệt với hành vi cũ, chứng minh `initialParticipantState` đã nối đúng).
4. Bấm "Mở lại lượt chọn". → Vào lại deck, vuốt thêm được một món. → `db:studio` → `interactions` có thêm dòng mới, `participants.state = 'ACTIVE'`.

Nếu bước 3 mà reload lại thấy deck (không phải màn "Xong") — `initialParticipantState` chưa nối đúng, kiểm lại §9.

## 16.3 Bằng chứng E3-T6 — "ai xong ai chưa" trên trang chủ nhóm

1. Với phiên đang `ACTIVE` ở trên, mở **một tài khoản Google khác** (thành viên khác trong nhóm — cần đã thêm qua S2's `addParticipant`, dựng tay qua script nếu chưa có UI).
2. Về `/groups/{id}`. → Thấy card "Phiên đang mở", đúng số "X/Y người xong", đúng tên từng hàng, đúng chữ trạng thái (`Xong · N món` / `Đang chọn` / `Chưa mở` / `Chưa xong` cho chính mình).
3. Bấm "Vào lượt của bạn" → vào đúng `/sessions/{id}`.
4. Người thứ hai bấm "Tôi chọn xong" trong phiên của họ → người thứ nhất reload `/groups/{id}` → số đếm tăng, hàng của người thứ hai đổi thành `Xong · N món`.

---

# 17. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v1.1.md`

```markdown
# DEC-035 — Complete/Reopen UI Predates Its Backend; E3-T5 Is Purely Wiring

**Ngày quyết định:** 2026-08-19 | **Trạng thái:** Accepted

## Quyết định

`deck-screen.tsx`'s "Tôi chọn xong"/"Mở lại lượt chọn" UI, shipped at E1-T8,
is left visually and structurally unchanged. E3-T5 adds a backend (use case,
two repository methods, one Route Handler) and rewires the two existing
`onClick` handlers plus the initial `view` state to reflect it — no new UI
is designed from scratch.

## Rationale

Reading the shipped file before designing showed the mockup-accurate UI
already existed as pure local `setState` calls with zero backend
integration. `record-interaction.ts` and `list-deck.ts` (SPEC-012/011) were
also independently confirmed already correct for TC-055 — both already treat
`COMPLETED` participants as eligible to keep swiping (blacklist- and
whitelist-style checks respectively, neither requiring `state === 'ACTIVE'`).
Redesigning any of this would have duplicated already-correct, already-built
work.

## Consequence

Anyone reviewing this slice's diff should expect it to touch application/
infrastructure/route files heavily and `deck-screen.tsx` only lightly (new
prop, two handler bodies, one copy fix) — a large UI diff here would be a
sign of scope drift.

## Affected Documents

- `src/shared/db/schema.ts` (stale "(E4)" comment on `participantState`,
  corrected to "(E3-T5)")
```

---

# 18. Master Plan

Sau khi `yarn verify`/`yarn arch:probe`/`yarn test:integration` xanh và §16.2/§16.3 đã kiểm tay: tick `E3-T5` và `E3-T6` ở §5, ghi ngày đạt milestone **M3**. **E3 kết thúc tại đây.**
