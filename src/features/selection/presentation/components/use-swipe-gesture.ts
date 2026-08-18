'use client'

import type { PointerEvent as ReactPointerEvent } from 'react'
import { useCallback, useRef, useState } from 'react'

import {
  computeDragRotationDeg,
  computeFlyOutTranslateX,
  resolvePreviewDirection,
  shouldCommitOnRelease,
  type SwipeDirection,
} from '../../domain/swipe-gesture'

export type SwipeGestureState = {
  dx: number
  dragging: boolean
  flying: SwipeDirection
}

const FLY_DURATION_MS = 180

/**
 * Hook cử chỉ — bọc toán học thuần ở `domain/swipe-gesture.ts` bằng Pointer
 * Events. `setPointerCapture` gọi qua optional chaining: jsdom không hiện
 * thực method này (§1.1 Implementation Guide) — dùng `?.()` vừa né lỗi test
 * vừa là thực hành đúng cho trình duyệt không hỗ trợ.
 */
export function useSwipeGesture(onCommit: (direction: SwipeDirection) => void) {
  const [state, setState] = useState<SwipeGestureState>({ dx: 0, dragging: false, flying: 0 })
  const startXRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    startXRef.current = event.clientX
    setState((s) => ({ ...s, dragging: true }))
  }, [])

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    setState((s) => (s.dragging ? { ...s, dx: event.clientX - startXRef.current } : s))
  }, [])

  const commit = useCallback(
    (direction: SwipeDirection) => {
      if (direction === 0) return
      setState({ dx: computeFlyOutTranslateX(direction), dragging: false, flying: direction })
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        onCommit(direction)
        setState({ dx: 0, dragging: false, flying: 0 })
      }, FLY_DURATION_MS)
    },
    [onCommit],
  )

  const handlePointerUp = useCallback(() => {
    setState((s) => {
      const direction = shouldCommitOnRelease(s.dx)
      if (direction !== 0) {
        // `commit` tự setState — trả nguyên state hiện tại để tránh setState lồng.
        queueMicrotask(() => commit(direction))
        return s
      }
      return { ...s, dragging: false, dx: 0 }
    })
  }, [commit])

  const previewDirection = resolvePreviewDirection(state.dx)
  const rotationDeg = computeDragRotationDeg(state.dx)

  return {
    dx: state.dx,
    dragging: state.dragging,
    flying: state.flying,
    previewDirection,
    rotationDeg,
    commitByButton: commit,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
  }
}
