/**
 * SPEC-005 — chuẩn hoá tên món. Hàm thuần, không throw, không chạm DB.
 *
 * E1 làm MỨC 1: NFC → gộp khoảng trắng → cắt hai đầu → lowercase.
 * E2-T3 thêm MỨC 2 (bỏ dấu tiếng Việt) vào ĐÚNG hàm này — xem mốc bên dưới —
 * kèm migration backfill `normalized_name`. Đừng tạo hàm thứ hai: hai bộ chuẩn
 * hoá cùng tồn tại là cách chắc chắn nhất để `Cá kho` và `Ca kho` lệch nhau ở
 * một nửa đường dẫn code.
 */

/** Dạng HIỂN THỊ: giữ nguyên hoa/thường và dấu, chỉ dọn khoảng trắng.
 *  '  Canh   Chua  ' → 'Canh Chua'. Đây là thứ ghi vào `global_dishes.name`. */
export function collapseDishName(name: string): string {
  return name.normalize('NFC').replace(/\s+/gu, ' ').trim()
}

/** Dạng SO KHỚP: ghi vào `global_dishes.normalized_name`.
 *  '  Canh   Chua  ' → 'canh chua'. */
export function normalizeDishName(name: string): string {
  return collapseDishName(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .replaceAll('đ', 'd')
}
