import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useSwipeGesture } from './use-swipe-gesture'

function fakePointerEvent(clientX: number) {
  return {
    clientX,
    currentTarget: { setPointerCapture: undefined },
    pointerId: 1,
  } as unknown as Parameters<ReturnType<typeof useSwipeGesture>['handlers']['onPointerDown']>[0]
}

describe('useSwipeGesture', () => {
  it('pointerDown rồi pointerMove: dx cập nhật, dragging=true', () => {
    const { result } = renderHook(() => useSwipeGesture(vi.fn()))

    act(() => result.current.handlers.onPointerDown(fakePointerEvent(100)))
    act(() => result.current.handlers.onPointerMove(fakePointerEvent(150)))

    expect(result.current.dragging).toBe(true)
    expect(result.current.dx).toBe(50)
  })

  it('thả tay DƯỚI ngưỡng commit: dx về 0, KHÔNG gọi onCommit', () => {
    const onCommit = vi.fn()
    const { result } = renderHook(() => useSwipeGesture(onCommit))

    act(() => result.current.handlers.onPointerDown(fakePointerEvent(0)))
    act(() => result.current.handlers.onPointerMove(fakePointerEvent(50))) // < COMMIT_THRESHOLD_PX (90)
    act(() => result.current.handlers.onPointerUp())

    expect(result.current.dx).toBe(0)
    expect(result.current.dragging).toBe(false)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('thả tay TRÊN ngưỡng commit: bay ra rồi gọi onCommit đúng hướng', async () => {
    vi.useFakeTimers()
    const onCommit = vi.fn()
    const { result } = renderHook(() => useSwipeGesture(onCommit))

    act(() => result.current.handlers.onPointerDown(fakePointerEvent(0)))
    act(() => result.current.handlers.onPointerMove(fakePointerEvent(120))) // > 90
    await act(async () => {
      result.current.handlers.onPointerUp()
    })

    expect(result.current.flying).toBe(1) // đã bắt đầu bay ngay lúc thả tay

    act(() => {
      vi.advanceTimersByTime(180)
    }) // FLY_DURATION_MS

    expect(onCommit).toHaveBeenCalledWith(1)
    expect(result.current.flying).toBe(0) // reset sau khi bay xong
    vi.useRealTimers()
  })

  it('commitByButton: giả lập nút bấm thay vì kéo — vẫn bay và gọi onCommit', () => {
    vi.useFakeTimers()
    const onCommit = vi.fn()
    const { result } = renderHook(() => useSwipeGesture(onCommit))

    act(() => result.current.commitByButton(-1))
    act(() => vi.advanceTimersByTime(180))

    expect(onCommit).toHaveBeenCalledWith(-1)
    vi.useRealTimers()
  })

  it('rotationDeg/previewDirection phản ánh đúng dx hiện tại (uỷ quyền cho hàm domain đã test)', () => {
    const { result } = renderHook(() => useSwipeGesture(vi.fn()))

    act(() => result.current.handlers.onPointerDown(fakePointerEvent(0)))
    act(() => result.current.handlers.onPointerMove(fakePointerEvent(50)))

    expect(result.current.previewDirection).toBe(1)
    expect(result.current.rotationDeg).toBeCloseTo(50 / 18, 3)
  })
})
