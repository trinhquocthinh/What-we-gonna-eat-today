import { Skeleton } from '@/shared/ui/skeleton'

/** Design Criteria §13: khung xương, không vòng quay. Ba khung 56px = ba hàng
 *  món, khớp `min-h-14` của `DishRow`. Lệch pha để không nhấp nháy đồng loạt. */
export default function DishesLoading() {
  return (
    <div className="mx-auto flex w-full max-w-app flex-col gap-2 px-4 pt-24">
      <Skeleton className="h-14" />
      <Skeleton className="h-14 [animation-delay:150ms]" />
      <Skeleton className="h-14 [animation-delay:300ms]" />
    </div>
  )
}
