import type { ReactElement } from 'react'

import { Skeleton } from '@/shared/ui/skeleton'

/**
 * Loading skeleton cho Deck Screen (S-09) — render shell tĩnh trước, stream
 * dữ liệu sau (E1-S7 §6.2 / NFR-01 fallback).
 */
export default function SessionLoading(): ReactElement {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col px-4 pb-6 pt-4">
      <div className="flex flex-col gap-3 pb-3">
        <div className="flex min-h-6 items-center justify-between gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-1 w-full rounded-full" />
      </div>

      <div className="flex flex-1 flex-col py-2">
        <Skeleton className="h-[420px] w-full rounded-card" />
      </div>

      <div className="flex items-center justify-center gap-3 pt-4">
        <Skeleton className="h-12 w-28 rounded-control" />
        <Skeleton className="h-12 w-28 rounded-control" />
      </div>
    </main>
  )
}
