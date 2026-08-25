import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { drizzleSelectionRepository } from '@/features/selection/infrastructure/drizzle-selection-repository'
import { recordInteraction } from '@/features/selection/application/record-interaction'
import type { InteractionAction } from '@/features/selection/domain/interaction'
import { httpStatusForErrorCode } from '@/shared/http-error'

// Khai kiểu thủ công, KHÔNG dùng helper `RouteContext` (bẫy 19, §1.2).
type RouteParams = { params: Promise<{ id: string }> }

const VALID_ACTIONS: readonly InteractionAction[] = ['SWIPE_RIGHT', 'SWIPE_LEFT', 'UNDO']

function isValidAction(value: unknown): value is InteractionAction {
  return typeof value === 'string' && (VALID_ACTIONS as readonly string[]).includes(value)
}

/**
 * SPEC-012 — Route Handler, KHÔNG phải Server Action (Tech Spec §4.1): React
 * serialise Server Action liên tiếp, mà NFR-02 đòi phản hồi ≤100ms cho mỗi
 * lượt vuốt. Route Handler cho phép gửi song song.
 */
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
    return Response.json(
      { code: 'ERR_VALIDATION' },
      { status: httpStatusForErrorCode('ERR_VALIDATION') },
    )
  }

  const dishId =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)['dishId']
      : undefined
  const action =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)['action']
      : undefined
  const clientTimestampRaw =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)['clientTimestamp']
      : undefined

  const clientTimestamp =
    typeof clientTimestampRaw === 'string' ? new Date(clientTimestampRaw) : null

  if (
    typeof dishId !== 'string' ||
    dishId === '' ||
    !isValidAction(action) ||
    clientTimestamp === null ||
    Number.isNaN(clientTimestamp.getTime())
  ) {
    return Response.json(
      { code: 'ERR_VALIDATION' },
      { status: httpStatusForErrorCode('ERR_VALIDATION') },
    )
  }

  const result = await recordInteraction(
    { selection: drizzleSelectionRepository },
    { sessionId, userId: user.id, groupDishId: dishId, action, clientTimestamp },
  )

  if (!result.ok) {
    return Response.json(
      { code: result.error.code, details: result.error.details },
      { status: httpStatusForErrorCode(result.error.code) },
    )
  }

  return Response.json({ effectiveInteraction: result.value.effectiveInteraction }, { status: 200 })
}
