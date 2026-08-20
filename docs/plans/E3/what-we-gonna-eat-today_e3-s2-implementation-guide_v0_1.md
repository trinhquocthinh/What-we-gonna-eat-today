# 👥 Implementation Guide — E3 Slice S2: Thêm Participant

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-19`
> - **Upstream:** [Master Plan](../what-we-gonna-eat-today_master-plan_v1_0.md) (`E3-T3`, `E3-T4`) • [SDD](../what-we-gonna-eat-today_sdd_v0_1.md) (`SPEC-009`) • [Business Rules](../what-we-gonna-eat-today_business-rules_v1.4.md) (`BR-026`) • [Test Cases](../what-we-gonna-eat-today_test-cases-specification_v0_1.md) (`TC-036→039`)
> - **Tiền đề bắt buộc:** `S1` (`E3-T1`) đã code — slice này tái dùng `findForStart`/`SessionForStart` nguyên vẹn.
>
> 👥 *Backend thuần — không có UI ở slice này. Master Plan không gán route/component nào cho E3-T3/T4; màn hình thêm người thật (S-08 picker đa người đã hoãn từ S1) chờ E3-T6 (S3).*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | --- | --- | --- |
| `E3-T3` | Thêm Participant khi Draft | 1.5 | `src/features/session/application/add-participant.ts` | Participant mới có 0 Interaction |
| `E3-T4` | Thêm Participant khi Active | 1.5 | Như trên | `TC-038` pass: Thêm trùng trả `ERR_PARTICIPANT_EXISTS` |

- [ ] `addParticipant` chấp nhận cả session `DRAFT` lẫn `ACTIVE` (đúng SPEC-009), từ chối `FINALIZED`/`INVALID`
- [ ] `TC-036`, `TC-037`, `TC-039` pass ở tầng `A`
- [ ] `TC-038` pass ở tầng `I` — thêm trùng trả `ERR_PARTICIPANT_EXISTS`, không tạo hàng thứ hai
- [ ] `yarn verify && yarn arch:probe && yarn test:integration` xanh

---

# 1. Một điểm tài liệu lệch nhau — đã đối chiếu verbatim

Master Plan gán `TC-036, TC-037` cho `E3-T3` ("Thêm Participant **khi Draft**"), và `TC-038, TC-039` cho `E3-T4` ("...**khi Active**"). Nhưng đọc verbatim Test Cases Specification (`SPEC-009 — Thêm Participant`, dòng 138-145):

```
| TC-036 | Happy | A | Session ACTIVE, User là Member | Thêm Participant | Tạo Participant ACTIVE với 0 tương tác |
| TC-037 | Âm | A | User không thuộc Group | Thêm Participant | Trả ERR_PARTICIPANT_NOT_MEMBER |
| TC-038 | Âm | I | User đã có tên trong phiên | Thêm lại | Trả ERR_PARTICIPANT_EXISTS |
| TC-039 | Âm | A | Session đã FINALIZED | Thêm Participant | Trả ERR_SESSION_NOT_ACTIVE |
```

**Tiền điều kiện của TC-036 ghi rõ `Session ACTIVE`** — dù nó được Master Plan gán cho subtask mang tên "khi Draft". Không có TC nào trong bốn cái này thật sự dựng tiền điều kiện `Session DRAFT`.

**Cách đọc hợp lý nhất** (SPEC-009 tự nói: *"Cho phép thêm khi phiên ở `DRAFT` hoặc `ACTIVE`"*): đây là **một** use case duy nhất, đúng như cột "File" của cả hai subtask đều trỏ về cùng `add-participant.ts`. Nhãn "khi Draft"/"khi Active" trong tiêu đề Master Plan mô tả **ví dụ minh hoạ**, không phải một điều kiện trạng thái tách rời — code không cần (và không nên) phân nhánh theo "đang thêm lúc Draft hay lúc Active". Cách chia T3/T4 thật sự là chia theo **độ khó của test case**: T3 = đường happy + kiểm quyền thành viên (TC-036, TC-037); T4 = hai ca âm khó hơn — trùng lặp cần DB thật để kiểm (TC-038, tầng `I`) và trạng thái chặn hẳn (TC-039). Slice này viết cả bốn cùng lúc trong một hàm, đúng cột "File" đã gộp — không tách thành hai lần TDD giả tạo.

---

# 2. File tree

```
src/features/session/
  application/
    add-participant.ts        + MỚI
    add-participant.test.ts   + MỚI
  infrastructure/
    drizzle-session-repository.ts                          SỬA (+ 1 method)
    drizzle-session-repository.integration.test.ts          SỬA (mở rộng, TC-038)

src/shared/testing/factories.ts   (không đổi — makeParticipant đã đủ dùng)
```

Không đụng `app/` — không có route nào gọi `addParticipant` ở slice này (xem §7).

---

# 3. Port `session-repository.ts` — thêm 1 method

```ts
export type AddParticipantOutcome =
  | { readonly outcome: 'ADDED'; readonly participantId: string }
  | { readonly outcome: 'ALREADY_EXISTS' }

export interface SessionRepository {
  // ...các method cũ giữ nguyên, kể cả findForStart/findDraftToday từ S1...

  /**
   * SPEC-009. Chèn `participants` với `state='ACTIVE'`, 0 tương tác (đúng
   * nghĩa "chưa có hàng interactions nào" — không cần cột đếm riêng).
   *
   * KHÔNG SELECT trước để kiểm trùng — dựa thẳng vào
   * `participants_session_user_unique` (đã có từ E1-T7/T8) và bắt lỗi vi
   * phạm, đúng khuôn `isSessionUniquenessViolation` đã dùng cho
   * `startDraft`. TC-038 ở tầng `I` (không phải `A`) chính là vì hành vi này
   * chỉ chứng minh được với DB thật.
   */
  addParticipant(input: { sessionId: string; userId: string }): Promise<AddParticipantOutcome>
}
```

---

# 4. Use case `add-participant.ts` — MỚI

```ts
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { SessionRepository } from './session-repository'

export type AddParticipantDeps = {
  readonly sessions: SessionRepository
  /**
   * Truyền từ `app/` — `session` không được import `group`
   * (`eslint.config.mjs` → `ALLOWED_CROSS_FEATURE`). Cùng khuôn
   * `findInvalidParticipants` đã dùng ở `start-session.ts` (S1), nhưng đơn
   * giản hơn: chỉ cần biết ĐÚNG-hay-SAI cho MỘT user, không cần trả tên —
   * không có "hàng" nào để hiện lỗi ở slice backend-thuần này.
   */
  readonly isActiveGroupMember: (input: { groupId: string; userId: string }) => Promise<boolean>
}

export type AddParticipantInput = {
  readonly sessionId: string
  readonly userId: string
  readonly requestedByUserId: string
}

export type AddParticipantOutput = {
  readonly participantId: string
}

/**
 * SPEC-009 — Thêm Participant vào phiên. Một hàm cho cả hai subtask Master
 * Plan (E3-T3 "khi Draft" + E3-T4 "khi Active") — xem Implementation Guide
 * §1 cho lý do gộp.
 *
 * Thứ tự: session tồn tại & đúng trạng thái → người gọi là Creator → target
 * còn là Member → ghi (DB tự chặn trùng qua unique index, không SELECT trước).
 */
export async function addParticipant(
  deps: AddParticipantDeps,
  input: AddParticipantInput,
): Promise<Result<AddParticipantOutput, Failure>> {
  const session = await deps.sessions.findForStart(input.sessionId)

  if (session === null || (session.state !== 'DRAFT' && session.state !== 'ACTIVE')) {
    return err(failure('ERR_SESSION_NOT_ACTIVE', { sessionId: input.sessionId }))
  }

  if (session.creatorUserId !== input.requestedByUserId) {
    return err(failure('ERR_NOT_SESSION_CREATOR', { sessionId: input.sessionId }))
  }

  const isMember = await deps.isActiveGroupMember({ groupId: session.groupId, userId: input.userId })
  if (!isMember) {
    return err(failure('ERR_PARTICIPANT_NOT_MEMBER', { userId: input.userId }))
  }

  const outcome = await deps.sessions.addParticipant({
    sessionId: input.sessionId,
    userId: input.userId,
  })

  if (outcome.outcome === 'ALREADY_EXISTS') {
    return err(failure('ERR_PARTICIPANT_EXISTS', { userId: input.userId }))
  }

  return ok({ participantId: outcome.participantId })
}
```

**Tái dùng `findForStart` (S1) thay vì thêm method đọc mới**: nó đã có đúng hình dạng cần — `groupId`, `creatorUserId`, `state`. Không cần `participantUserIds` ở đây (không dùng), nhưng lấy dư một field còn rẻ hơn viết thêm một câu SELECT gần như giống hệt.

**`ERR_SESSION_NOT_ACTIVE` cho cả "không tồn tại" lẫn "FINALIZED/INVALID"**: TC-039 chỉ định rõ mã này cho ca `FINALIZED`; không có TC nào cho "sessionId sai". Gộp chung vào cùng một nhánh là lựa chọn thực dụng — cả hai đều có nghĩa "không thêm được vào đây", và tách riêng một nhánh "not found" sẽ cần một mã lỗi mới không có trong SDD.

**Không thêm hàm domain nào** (ví dụ `canAddParticipant(state)`) — `domain/session.ts` đã ghi rõ nguyên tắc *"Thêm hàm khi có luật thật cần, không thêm trước"*. Điều kiện `state !== 'DRAFT' && state !== 'ACTIVE'` chỉ dùng đúng một chỗ; tách ra sớm là dự đoán nhu cầu chưa có.

## 4.1 Test — `add-participant.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest'

import { addParticipant } from './add-participant'
import type { SessionForStart, SessionRepository } from './session-repository'

function makeSession(overrides: Partial<SessionForStart> = {}): SessionForStart {
  return {
    id: 's1',
    groupId: 'g1',
    creatorUserId: 'creator',
    state: 'ACTIVE',
    participantUserIds: ['creator'],
    ...overrides,
  }
}

function makeDeps(overrides: {
  session?: SessionForStart | null
  isMember?: boolean
  addOutcome?: 'ADDED' | 'ALREADY_EXISTS'
} = {}) {
  const sessions: Partial<SessionRepository> = {
    findForStart: vi.fn(async () => (overrides.session === undefined ? makeSession() : overrides.session)),
    addParticipant: vi.fn(async () => {
      const outcome = overrides.addOutcome ?? 'ADDED'
      return outcome === 'ADDED' ? { outcome: 'ADDED', participantId: 'p-new' } : { outcome: 'ALREADY_EXISTS' }
    }),
  }
  const isActiveGroupMember = vi.fn(async () => overrides.isMember ?? true)
  return { sessions: sessions as SessionRepository, isActiveGroupMember }
}

const BASE_INPUT = { sessionId: 's1', userId: 'mem-2', requestedByUserId: 'creator' }

describe('addParticipant', () => {
  it('TC-036 — Session ACTIVE, User là Member: tạo Participant', async () => {
    const deps = makeDeps()

    const result = await addParticipant(deps, BASE_INPUT)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.participantId).toBe('p-new')
  })

  it('Session DRAFT cũng thêm được — SPEC-009 cho phép cả hai trạng thái', async () => {
    const deps = makeDeps({ session: makeSession({ state: 'DRAFT' }) })

    const result = await addParticipant(deps, BASE_INPUT)

    expect(result.ok).toBe(true)
  })

  it('TC-037 — User không thuộc Group: ERR_PARTICIPANT_NOT_MEMBER, không ghi gì', async () => {
    const deps = makeDeps({ isMember: false })

    const result = await addParticipant(deps, BASE_INPUT)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_PARTICIPANT_NOT_MEMBER')
    expect(deps.sessions.addParticipant).not.toHaveBeenCalled()
  })

  it('TC-039 — Session đã FINALIZED: ERR_SESSION_NOT_ACTIVE', async () => {
    const deps = makeDeps({ session: makeSession({ state: 'FINALIZED' }) })

    const result = await addParticipant(deps, BASE_INPUT)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_SESSION_NOT_ACTIVE')
    expect(deps.isActiveGroupMember).not.toHaveBeenCalled()
  })

  it('Session INVALID: cùng ERR_SESSION_NOT_ACTIVE (không có TC riêng, suy từ SPEC-009)', async () => {
    const deps = makeDeps({ session: makeSession({ state: 'INVALID' }) })

    const result = await addParticipant(deps, BASE_INPUT)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_SESSION_NOT_ACTIVE')
  })

  it('Người gọi không phải Creator: ERR_NOT_SESSION_CREATOR', async () => {
    const deps = makeDeps()

    const result = await addParticipant(deps, { ...BASE_INPUT, requestedByUserId: 'ai-do-khac' })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_NOT_SESSION_CREATOR')
  })

  it('port báo ALREADY_EXISTS: dịch thành ERR_PARTICIPANT_EXISTS (đường mock — TC-038 thật ở tầng I, §5.1)', async () => {
    const deps = makeDeps({ addOutcome: 'ALREADY_EXISTS' })

    const result = await addParticipant(deps, BASE_INPUT)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_PARTICIPANT_EXISTS')
  })
})
```

Ca cuối chỉ chứng minh use case **dịch đúng** outcome từ port — không chứng minh DB thật sự chặn trùng. Đó là việc của TC-038 ở tầng `I`, §5.1.

---

# 5. Infra `drizzle-session-repository.ts` — thêm `addParticipant`

```ts
const PARTICIPANT_UNIQUENESS_CONSTRAINT = 'participants_session_user_unique'

function isParticipantUniquenessViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const target: Record<string, unknown> =
    'cause' in error && typeof error.cause === 'object' && error.cause !== null
      ? (error.cause as Record<string, unknown>)
      : (error as Record<string, unknown>)

  return target.code === UNIQUE_VIOLATION && target.constraint === PARTICIPANT_UNIQUENESS_CONSTRAINT
}

async function addParticipant(input: {
  sessionId: string
  userId: string
}): Promise<AddParticipantOutcome> {
  const db = getDb()
  const participantId = uuidv7()

  try {
    await db.insert(participants).values({
      id: participantId,
      sessionId: input.sessionId,
      userId: input.userId,
      state: 'ACTIVE',
    })

    return { outcome: 'ADDED', participantId }
  } catch (error) {
    if (isParticipantUniquenessViolation(error)) {
      return { outcome: 'ALREADY_EXISTS' }
    }
    throw error
  }
}
```

`UNIQUE_VIOLATION` (`'23505'`) và cách bóc `error.cause` **đã có sẵn** ở đầu file (`isSessionUniquenessViolation`, viết ở E1-T7) — dùng lại hằng số đó, không khai báo lần hai. `isParticipantUniquenessViolation` chỉ khác đúng tên constraint.

Thêm `addParticipant` vào `export const drizzleSessionRepository`.

## 5.1 Integration test — mở rộng `drizzle-session-repository.integration.test.ts`

```ts
it('TC-038 — thêm trùng userId+sessionId: lần hai ALREADY_EXISTS, không tạo hàng thứ hai', async () => {
  const db = getDb()
  const user = makeUser()
  const group = makeGroup()
  await db.insert(users).values(user)
  await db.insert(groups).values(group)
  const session = await drizzleSessionRepository.createDraftWithCreatorParticipant({
    groupId: group.id,
    decisionDate: '2026-08-19',
    creatorUserId: user.id,
  })
  const secondUser = makeUser({ id: '01920000-0000-7000-8000-0000000000f3', email: 'khac@example.com' })
  await db.insert(users).values(secondUser)

  const first = await drizzleSessionRepository.addParticipant({
    sessionId: session.id,
    userId: secondUser.id,
  })
  const second = await drizzleSessionRepository.addParticipant({
    sessionId: session.id,
    userId: secondUser.id,
  })

  expect(first.outcome).toBe('ADDED')
  expect(second.outcome).toBe('ALREADY_EXISTS')
  const rows = await db.select().from(participants).where(eq(participants.userId, secondUser.id))
  expect(rows).toHaveLength(1)
})
```

---

# 6. Cách kiểm chưa có UI

Master Plan không gán route/component nào cho `E3-T3`/`E3-T4` — cột "File" của cả hai chỉ có `application/add-participant.ts`. Đây là slice backend-thuần, đúng khuôn `create-session.ts`/`start-session.ts` ở E1-T6/T7 trước khi có route (S1 mới nối dây `startSession`).

Ba cách xác nhận hành vi đúng mà không cần UI, theo thứ tự nên làm:

1. **`yarn test && yarn test:integration` xanh** — đủ để tin toàn bộ bốn TC đúng, kể cả TC-038 (test DB thật ở §5.1).
2. **`db:studio` thủ công**: tạo Group, Session (qua `db:studio` chèn tay hoặc qua route `/groups/{id}/sessions/new` của S1), gọi `addParticipant` từ một Node REPL có `import { getDb } from './src/shared/db/client'` — hoặc tạm thêm một lệnh gọi vào `scripts/create-test-session.ts` (đã có tiền lệ gọi thẳng use case từ script, xem `createSession`/`startSession` trong đó) rồi xoá sau khi kiểm xong.
3. **Không viết Server Action/route tạm chỉ để thử tay** — `knip` sẽ báo export chết, và route đó sẽ phải xoá đi viết lại khi E3-T6 (S3) dựng UI thật. Đúng nguyên tắc đã áp dụng nhất quán từ E2-S3 (`setSystemTags` hoãn nối dây, không viết action giả).

---

# 7. UI thật đến ở đâu?

Không phải slice này. Mockup S-08 (đã đọc ở S1) vẽ picker đa người toggle-được — đó là nơi `addParticipant` sẽ được gọi từ giao diện. Master Plan gán `S-04, S-08` cho **`E3-T6`** ("Màn hình phiên cho Creator... Thấy ai xong ai chưa"), không phải T3/T4. Khi tới đó, `add-participant.ts` đã sẵn sàng dùng nguyên vẹn — không có gì ở slice này cần viết lại.

---

# 8. Rủi ro

| Rủi ro | Hậu quả | Giảm thiểu |
| --- | --- | --- |
| Nhầm `ERR_SESSION_NOT_ACTIVE` chỉ áp dụng cho `FINALIZED` (đúng TC-039) rồi vô tình chặn cả `DRAFT` | `addParticipant` từ chối cả trường hợp SPEC-009 cho phép | Test rõ ràng "Session DRAFT cũng thêm được" đã có ở §4.1 — chạy trước khi tin code đúng |
| Không dùng lại hằng số `UNIQUE_VIOLATION`/cách bóc `error.cause` đã có, viết lại một bản riêng | Trùng lặp code, `jscpd` có thể đỏ | §5 nhắc rõ dùng lại, chỉ thêm tên constraint mới |
| `findForStart` được thiết kế cho `startSession` (S1), dùng lại ở đây có thể khiến người đọc tưởng hai use case có quan hệ chặt hơn thực tế | Nhầm lẫn khi bảo trì | Đã ghi rõ lý do tái dùng trong docstring — chỉ vì hình dạng dữ liệu khớp, không có phụ thuộc logic giữa hai use case |

---

# 9. Test Cases coverage

| TC | Mô tả | Tầng | Nơi test |
| --- | --- | --- | --- |
| `TC-036` | Session ACTIVE, User là Member → tạo Participant `ACTIVE`, 0 tương tác | `A` | `add-participant.test.ts` |
| `TC-037` | User không thuộc Group → `ERR_PARTICIPANT_NOT_MEMBER` | `A` | `add-participant.test.ts` |
| `TC-038` | User đã có tên trong phiên, thêm lại → `ERR_PARTICIPANT_EXISTS` | `I` | `drizzle-session-repository.integration.test.ts` |
| `TC-039` | Session đã `FINALIZED` → `ERR_SESSION_NOT_ACTIVE` | `A` | `add-participant.test.ts` |

---

# 10. Thứ tự TDD

1. `add-participant.test.ts` (toàn bộ §4.1) → `add-participant.ts`
2. `session-repository.ts` (port — thêm type/method, không test riêng)
3. Mở rộng `drizzle-session-repository.integration.test.ts` (TC-038) → `addParticipant` trong infra
4. `yarn verify && yarn arch:probe && yarn test:integration`

---

# 11. Verify

## 11.1 Cổng máy

```bash
yarn verify && yarn arch:probe
yarn test:integration
```

`yarn test` phải in `addParticipant` (7 ca ở §4.1). `yarn test:integration` in ca mới ở §5.1 (TC-038) cộng các ca đã có từ S1 (`findForStart`, `findDraftToday`) — không có gì trong slice này được phép làm chúng đỏ.

Không có `yarn build`/thử tay trên trình duyệt ở slice này — không có route nào thay đổi (§6 giải thích lý do). Nếu `yarn dev` chạy được như trước khi bắt đầu slice, không có gì để kiểm thêm trên UI.

## 11.2 Bằng chứng TC-038 — không tạo hàng thứ hai

Integration test ở §5.1 đã assert `rows.toHaveLength(1)`, nhưng đáng nhìn tận mắt một lần vì đây là DoD chính của `E3-T4`:

1. `yarn test:integration -t "TC-038"` — chạy riêng đúng test này.
2. Đọc output: phải thấy `first.outcome === 'ADDED'` rồi `second.outcome === 'ALREADY_EXISTS'` — không phải cả hai đều `ADDED` (tức là unique index không chặn được, bug nghiêm trọng) và không phải cả hai đều lỗi (tức là lần đầu cũng bị chặn nhầm).

---

# 12. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v1.1.md`

```markdown
# DEC-034 — E3-T3/E3-T4 Ship as One Function; "Draft"/"Active" Are Illustrative Labels

**Ngày quyết định:** 2026-08-19 | **Trạng thái:** Accepted

## Quyết định

`addParticipant` is implemented once, accepting a session in either `DRAFT`
or `ACTIVE` state, covering all four of TC-036 through TC-039 in a single
function. The Master Plan's subtask titles ("Thêm Participant khi Draft" /
"...khi Active") do not correspond to a state-based code branch.

## Rationale

TC-036's own precondition text reads "Session ACTIVE, User là Member" —
verbatim from the Test Cases Specification — despite being the test Master
Plan assigns to the "khi Draft" subtask (`E3-T3`). No test case in the
SPEC-009 group actually exercises a `DRAFT` precondition. SPEC-009 itself
states plainly that both states are allowed. Both subtasks also share the
exact same file target (`add-participant.ts`). Splitting the implementation
into two state-gated code paths to match the subtask titles would invent a
distinction the source documents don't actually draw — the real split is
test-case difficulty (T3 = happy path + membership check; T4 = the two
harder negative cases, one of which needs a real database).

## Consequence

Anyone reading `add-participant.ts` should not look for separate
Draft-only/Active-only logic — there isn't any, by design. Future test cases
referencing "khi Draft" behavior specifically should be added to this same
function's test suite, not a new file.

## Affected Documents

- Test Cases Specification (TC-036's precondition text is inconsistent with
  Master Plan's E3-T3 label; noted here, not edited in the source doc)
```

---

# 13. Master Plan

Sau khi `yarn verify`/`yarn arch:probe`/`yarn test:integration` xanh: tick `E3-T3` và `E3-T4` ở §5.
