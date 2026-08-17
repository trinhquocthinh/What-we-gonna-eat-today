'use client'

import type { KeyboardEvent, ReactElement, ReactNode } from 'react'
import { useCallback, useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

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

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
    return () => previouslyFocused?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        onClose()
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
    [onClose],
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Scrim là <button> chứ không phải <div onClick>: bấm ra ngoài để đóng
          phải dùng được bằng bàn phím, và jsx-a11y không phải kêu. */}
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 bg-scrim"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={handleKeyDown}
        className="relative flex max-h-[88%] w-full max-w-app flex-col gap-4 rounded-t-card bg-surface-raised p-6 shadow-lift"
      >
        {children}
      </div>
    </div>
  )
}
