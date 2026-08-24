import { groupEatingHistory, type EatingDay } from '../domain/eating-history'
import type { HistoryRepository } from './history-repository'

/** S-12 — 30 ngày gần đây. Cửa sổ là hằng số của màn hình này, không phải của
 *  thuật toán: KHÔNG dùng `RANKING_CONFIG.history.cooldownWindowDays` (7 ngày,
 *  của SPEC-020). Hai con số nói về hai việc khác nhau và không được nối vào
 *  nhau — nếu ai đó chỉnh cooldown xuống 3 ngày, lịch sử ăn không được co lại
 *  theo. */
export const HISTORY_WINDOW_DAYS = 30

function computePastDate(isoDate: string, daysAgo: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) {
    throw new RangeError(`computePastDate: ngày không hợp lệ: "${isoDate}"`)
  }
  const dateUtc = new Date(Date.UTC(y, m - 1, d))
  dateUtc.setUTCDate(dateUtc.getUTCDate() - daysAgo)
  const yyyy = dateUtc.getUTCFullYear()
  const mm = String(dateUtc.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dateUtc.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export async function listEatingHistory(
  deps: { readonly history: HistoryRepository },
  input: { readonly userId: string; readonly today: string },
): Promise<EatingDay[]> {
  const from = computePastDate(input.today, HISTORY_WINDOW_DAYS)
  const records = await deps.history.findEatingHistory({
    userId: input.userId,
    from,
    to: input.today,
  })

  return groupEatingHistory(records)
}
