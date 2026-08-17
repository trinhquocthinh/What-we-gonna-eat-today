/**
 * Tech Spec §4.3 — `application/` trả `Result<T, Failure>`, không ném exception
 * qua ranh giới tầng.
 *
 * Đặt ở `shared/` vì mọi feature đều cần. Để trong một feature thì các feature
 * khác phải import chéo, điều `CROSS_FEATURE_ZONES` chặn.
 */
export type Result<T, E> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E }

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}
