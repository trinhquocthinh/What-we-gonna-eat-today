'use client'

import { Banner } from '@/shared/ui/banner'
import { Button } from '@/shared/ui/button'

/** S-02 trạng thái lỗi. Dùng `error.tsx` của Next thay vì tự dựng state:
 *  `retry()` chính là nút "Thử lại" của thiết kế.
 *
 *  Prop là `retry`, KHÔNG phải `reset` — `retry` stable từ Next 16.3.0
 *  (`03-file-conventions/error.md`). `reset()` chỉ xoá trạng thái lỗi rồi render
 *  lại dữ liệu CŨ, không nạp lại; đó không phải nghĩa "Thử lại" của thiết kế. */
export default function GroupsError({ retry }: { error: Error; retry: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-app flex-col gap-3 px-4 pt-24">
      <Banner tone="danger">Không tải được danh sách nhóm.</Banner>
      <Button type="button" variant="secondary" size="md" className="self-start" onClick={retry}>
        Thử lại
      </Button>
    </div>
  )
}
