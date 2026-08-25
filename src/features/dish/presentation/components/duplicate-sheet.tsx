'use client'

import type { ReactElement } from 'react'

import { Button } from '@/shared/ui/button'

/**
 * Hai loại ứng viên, hai hành động khác hẳn nhau — xem §2.2 guide S4.
 *
 * - `inGroup`: món ĐÃ ở trong danh mục nhóm (lọc gần giống ở client).
 *   "Dùng món này" KHÔNG ghi gì — chỉ đóng sheet và báo. `id` là `group_dishes.id`.
 * - `global`: Global Dish trùng tên do nhóm khác tạo (server trả về sau khi bấm
 *   lưu). "Dùng món này" gọi `addExistingDishToGroup`. `id` là `global_dishes.id`.
 */
export type DuplicateCandidate = {
  readonly kind: 'inGroup' | 'global'
  readonly id: string
  readonly name: string
  /** Nhãn hệ thống, ví dụ "Món mặn". Rỗng với ứng viên `global` (server chưa
   *  trả nhãn — món chưa thuộc nhóm nào của mình nên chưa có nhãn để trả). */
  readonly meta: string
}

export type DuplicateSheetProps = {
  candidates: readonly DuplicateCandidate[]
  /** Ứng viên `inGroup` — thuần client, không round-trip. */
  onUseInGroup: (name: string) => void
  /** "Đây là món khác, vẫn tạo mới" — mở khoá nút lưu. */
  onForceCreate: () => void
}

/**
 * S-06, trạng thái phát hiện trùng.
 *
 * DoD của E2-T7: nút "Dùng món này" phải NỔI BẬT HƠN "vẫn tạo mới". Ở đây điều
 * đó được thực hiện bằng ba thứ cùng lúc, đúng mockup:
 *   1. "Dùng món này" là `variant="primary"` (nền `--accent`);
 *   2. "vẫn tạo mới" là chữ gạch chân `--ink-muted`, cỡ nhỏ hơn, không nền;
 *   3. nút "Thêm vào danh mục" của form bị hạ xuống `muted` — làm ở
 *      `add-dish-sheet.tsx`, không phải ở đây.
 * Đừng "cân bằng lại" cho đẹp: sự lệch tông này là chủ ý thiết kế.
 */
export function DuplicateSheet({
  candidates,
  onUseInGroup,
  onForceCreate,
}: DuplicateSheetProps): ReactElement {
  return (
    <div className="flex flex-col gap-3 rounded-control bg-surface-sunken p-4">
      <h3 className="text-subtitle font-semibold text-ink">Nhà bạn đã có món gần giống</h3>

      <ul className="flex flex-col gap-2">
        {candidates.map((candidate) => (
          <li
            key={`${candidate.kind}-${candidate.id}`}
            className="flex items-center justify-between gap-3 rounded-control bg-surface-raised p-3"
          >
            <span className="flex flex-col">
              <span className="text-subtitle font-semibold text-ink">{candidate.name}</span>
              {candidate.meta === '' ? null : (
                <span className="text-caption font-medium text-ink-muted">{candidate.meta}</span>
              )}
            </span>

            {candidate.kind === 'global' ? (
              // Submit mang theo tên+giá trị của chính nút: `addDishAction` thấy
              // `reuseGlobalDishId` thì rẽ sang nhánh dùng lại. HTML thuần, không
              // cần state trung gian nào.
              <Button
                type="submit"
                name="reuseGlobalDishId"
                value={candidate.id}
                variant="primary"
                size="sm"
                className="flex-none"
              >
                Dùng món này
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="flex-none"
                onClick={() => onUseInGroup(candidate.name)}
              >
                Dùng món này
              </Button>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onForceCreate}
        className="min-h-11 self-start bg-transparent text-body font-medium text-ink-muted underline"
      >
        Đây là món khác, vẫn tạo mới
      </button>
    </div>
  )
}
