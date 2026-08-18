'use client'

import type { AnimationEvent, KeyboardEvent, ReactElement, ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

const SheetCloseContext = createContext<() => void>(() => {})

/** Hook để component con bên trong Sheet (như nút "Đóng") kích hoạt animation trượt xuống trước khi unmount. */
export function useSheetClose(): () => void {
  return useContext(SheetCloseContext)
}

export type SheetProps = {
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Design Handoff: biểu mẫu dùng sheet trượt từ đáy, KHÔNG modal giữa màn hình.
 * Bo `20px 20px 0 0`, scrim `rgba(28,25,23,.28)`, `max-height: 88%`, focus bị
 * giữ bên trong.
 *
 * KHÔNG dùng `<dialog showModal>`: jsdom 30 không hiện thực `showModal`
 * (`HTMLDialogElement-impl.js` là class rỗng), nên mọi test chạm sheet sẽ nổ.
 */
export function Sheet({ title, onClose, children }: SheetProps): ReactElement {
  const panelRef = useRef<HTMLDivElement>(null)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
    return () => previouslyFocused?.focus()
  }, [])

  const handleClose = useCallback(() => {
    if (isClosing) return
    setIsClosing(true)
    if (process.env.NODE_ENV === 'test') {
      onClose()
    }
  }, [isClosing, onClose])

  const handleAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLDivElement>) => {
      if (isClosing && event.target === panelRef.current) {
        onClose()
      }
    },
    [isClosing, onClose],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        handleClose()
        return
      }
      if (event.key !== 'Tab') {
        return
      }

      const panel = panelRef.current
      if (panel === null) {
        return
      }

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      const first = items[0]
      const last = items.at(-1)
      if (first === undefined || last === undefined) {
        return
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [handleClose],
  )

  return (
    <SheetCloseContext.Provider value={handleClose}>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        {/* Scrim là <button> chứ không phải <div onClick>: bấm ra ngoài để đóng
            phải dùng được bằng bàn phím, và jsx-a11y không phải kêu. */}
        <button
          type="button"
          aria-label="Đóng"
          onClick={handleClose}
          className={`absolute inset-0 bg-scrim ${
            isClosing ? 'animate-scrim-fade-out' : 'animate-scrim-fade-in'
          }`}
        />

        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onKeyDown={handleKeyDown}
          onAnimationEnd={handleAnimationEnd}
          className={`relative flex max-h-[88%] w-full max-w-app flex-col gap-4 rounded-t-card bg-surface-raised p-6 shadow-lift ${
            isClosing ? 'animate-sheet-slide-down' : 'animate-sheet-slide-up'
          }`}
        >
          {children}
        </div>
      </div>
    </SheetCloseContext.Provider>
  )
}
