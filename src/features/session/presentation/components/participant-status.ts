import type { ParticipantState } from '../../domain/session'

export type ParticipantProgress = {
  readonly userId: string
  readonly displayName: string
  readonly state: ParticipantState
  readonly proposedCount: number
  readonly totalInteractions: number
}

/**
 * S-04 — chữ hiển thị cho từng hàng participant. Ba tầng đúng mockup, tầng
 * thứ tư ("Đang chọn") tự suy vì mockup không có ca này (xem Implementation
 * Guide §2).
 *
 * Hàng CHÍNH NGƯỜI XEM luôn "Chưa xong" khi chưa COMPLETED — không phân biệt
 * "đã vuốt vài món" hay "chưa mở" cho chính mình, vì với TA thì cả hai đều
 * cùng một hành động tiếp theo: "Vào lượt của bạn". Phân biệt "Đang chọn"/
 * "Chưa mở" chỉ có ý nghĩa khi NHÌN NGƯỜI KHÁC.
 */
export function describeParticipantRow(p: ParticipantProgress, isCurrentUser: boolean): string {
  if (p.state === 'COMPLETED') {
    return `Xong · ${p.proposedCount} món`
  }
  if (isCurrentUser) {
    return 'Chưa xong'
  }
  return p.totalInteractions > 0 ? 'Đang chọn' : 'Chưa mở'
}
