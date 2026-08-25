import { Skeleton } from '@/shared/ui/skeleton'

/** Design Handoff S-02: hai khung xương 96px, khối thứ hai lệch pha .15s.
 *  Không vòng quay. */
export default function GroupsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-app flex-col gap-2 px-4 pt-24">
      <Skeleton className="h-24" />
      <Skeleton className="h-24 [animation-delay:150ms]" />
    </div>
  )
}
