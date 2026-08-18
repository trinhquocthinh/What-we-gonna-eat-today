'use client'

import { Banner } from '@/shared/ui/banner'
import { Button } from '@/shared/ui/button'

/** Prop là `retry`, KHÔNG phải `reset` (bẫy 15): `reset()` render lại dữ liệu
 *  cũ, `retry()` mới là "Thử lại" theo nghĩa thiết kế. */
export default function DishesError({ retry }: { error: Error; retry: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-app flex-col gap-3 px-4 pt-24">
      <Banner tone="danger">Không tải được danh mục món.</Banner>
      <Button type="button" variant="secondary" size="md" className="self-start" onClick={retry}>
        Thử lại
      </Button>
    </div>
  )
}
