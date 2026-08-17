import Link from 'next/link'
import type { ReactElement } from 'react'

import { EmptyStateCard } from '@/shared/ui/empty-state-card'

const DISH_EXAMPLES = ['Cá basa kho tiêu', 'Canh chua cá lóc', 'Gà chiên nước mắm']

export type GroupOverviewScreenProps = {
  groupName: string
  dateCaption: string
}

/**
 * S-04 ở trạng thái rỗng. CỐ Ý chưa có: ba hàng lối tắt (Danh mục món / Quy
 * định bữa ăn / Thành viên), CTA "Thêm món đầu tiên", nút "Nhóm" ở góc — cả bốn
 * dẫn tới màn hình chưa tồn tại. Nút bấm không làm gì tệ hơn không có nút.
 *
 * E1-T5: thay khối dưới bằng ba hàng lối tắt + CTA "Thêm món đầu tiên".
 */
export function GroupOverviewScreen({
  groupName,
  dateCaption,
}: GroupOverviewScreenProps): ReactElement {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex flex-col gap-1 px-4 pb-3 pt-6">
        <span className="text-caption font-medium text-ink-muted">{dateCaption}</span>
        <h1 className="text-title font-semibold text-ink">{groupName}</h1>
      </header>

      <div className="flex-1 px-4 pt-3">
        <EmptyStateCard
          title="Trước tiên hãy thêm vài món nhà bạn hay ăn."
          description="Chưa có món thì chưa mở phiên chọn được. Khoảng 15–20 món là đủ để bắt đầu."
        >
          <hr className="border-border" />
          <span className="text-caption font-medium text-ink-muted">
            Cứ viết như cách cả nhà gọi tên
          </span>
          {DISH_EXAMPLES.map((example) => (
            <span key={example} className="text-body-lg font-normal text-ink-faint">
              {example}
            </span>
          ))}
        </EmptyStateCard>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-8 pt-4">
        <Link
          href="/groups"
          className="flex min-h-11 items-center justify-center self-center rounded-control px-4 text-body font-semibold text-ink-muted hover:bg-surface-sunken"
        >
          Nhóm của bạn
        </Link>
      </div>
    </main>
  )
}
