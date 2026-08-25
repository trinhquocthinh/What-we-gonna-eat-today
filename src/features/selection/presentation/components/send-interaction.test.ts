import { afterEach, describe, expect, it, vi } from 'vitest'

import { sendInteractionWithRetry } from './send-interaction'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('sendInteractionWithRetry', () => {
  it('thành công ngay lần đầu thì không retry, báo idle', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ effectiveInteraction: 'SWIPE_RIGHT' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const onStatusChange = vi.fn()

    const result = await sendInteractionWithRetry(
      'session-1',
      { dishId: 'dish-1', action: 'SWIPE_RIGHT' },
      onStatusChange,
    )

    expect(result).toEqual({ ok: true, effectiveInteraction: 'SWIPE_RIGHT' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(onStatusChange).toHaveBeenCalledWith('idle')
  })

  it('lỗi 400 thì KHÔNG retry, báo failed ngay', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400 })
    vi.stubGlobal('fetch', fetchMock)
    const onStatusChange = vi.fn()

    const result = await sendInteractionWithRetry(
      'session-1',
      { dishId: 'dish-1', action: 'SWIPE_RIGHT' },
      onStatusChange,
    )

    expect(result).toEqual({ ok: false })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(onStatusChange).toHaveBeenLastCalledWith('failed')
  })

  it('lỗi mạng liên tục thì retry đủ số lần rồi báo failed', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockRejectedValue(new Error('network'))
    vi.stubGlobal('fetch', fetchMock)
    const onStatusChange = vi.fn()

    const promise = sendInteractionWithRetry(
      'session-1',
      { dishId: 'dish-1', action: 'SWIPE_RIGHT' },
      onStatusChange,
    )
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toEqual({ ok: false })
    expect(fetchMock).toHaveBeenCalledTimes(4) // 1 lần đầu + 3 retry
    expect(onStatusChange).toHaveBeenCalledWith('retrying')
    expect(onStatusChange).toHaveBeenLastCalledWith('failed')
    vi.useRealTimers()
  })

  it('gửi kèm clientTimestamp, GIỮ NGUYÊN qua các lần retry', async () => {
    vi.useFakeTimers()
    const capturedTimestamps: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((_url, options) => {
        const body = JSON.parse((options as { body: string }).body)
        capturedTimestamps.push(body.clientTimestamp)
        return Promise.resolve({ ok: false, status: 503 }) // buộc retry
      }),
    )

    const promise = sendInteractionWithRetry('s1', { dishId: 'd1', action: 'SWIPE_RIGHT' }, vi.fn())
    await vi.runAllTimersAsync()
    await promise

    expect(capturedTimestamps).toHaveLength(4)
    expect(new Set(capturedTimestamps).size).toBe(1) // MỌI lần gửi cùng một giá trị
    vi.useRealTimers()
  })
})
