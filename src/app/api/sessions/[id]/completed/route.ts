import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { setParticipantCompleted } from '@/features/session/application/set-participant-completed'
import { drizzleSessionRepository } from '@/features/session/infrastructure/drizzle-session-repository'
import { httpStatusForErrorCode } from '@/shared/http-error'

type RouteParams = { params: Promise<{ id: string }> }

/* jscpd:ignore-start */
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

  const completed =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)['completed']
      : undefined

  if (typeof completed !== 'boolean') {
    return Response.json(
      { code: 'ERR_VALIDATION' },
      { status: httpStatusForErrorCode('ERR_VALIDATION') },
    )
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
/* jscpd:ignore-end */
