import { normalizeDishName } from './normalize-name'
import type { SystemTag } from './system-tag'

/**
 * Suy luận System Tag từ tên món — dùng cho SEED và cho script gắn nhãn lại.
 * KHÔNG dùng ở luồng người dùng thêm món: ở đó người ta tự chọn nhãn (S-06).
 *
 * Chuẩn phân loại theo BR-003:
 * - `STAPLE`  — món tinh bột: cơm, bún, phở, mì, xôi, cháo, bánh mặn
 * - `MAIN`    — món mặn/đạm: thịt, cá, gà, bò, tôm, trứng, chả…
 * - `SIDE`    — rau, xào, luộc, gỏi, dưa, đồ chấm
 * - `SOUP`    — canh, súp, lẩu
 * - `DESSERT` — chè, bánh ngọt, hoa quả, đồ uống
 *
 * Trả về MỘT tag. Món ghép (bún chả = STAPLE + MAIN) không suy luận tự động
 * được cho đúng — người dùng sửa lại ở sheet Sửa nhãn, vốn đa chọn.
 *
 * Ở `domain/` chứ không ở `scripts/`: đây là hàm thuần, và để trong `scripts/`
 * thì nằm ngoài phạm vi đo coverage nên không ai viết test — đúng lý do hai lỗi
 * phân loại dưới đây sống sót từ đầu.
 */
export function inferSystemTag(rawName: string): SystemTag {
  const norm = normalizeDishName(rawName)

  // ── Ưu tiên 0: các ca mà chuẩn hoá LÀM MẤT thông tin phân biệt ──────────
  //
  // `normalizeDishName` bỏ dấu, nên "cánh gà" (món mặn) và "canh gà" (món
  // canh) đều thành "canh ga". Bản cũ xử lý bằng cách cho mọi "canh ga " ra
  // MAIN — đúng cho cánh gà nướng, nhưng SAI cho "Canh gà lá giang" vốn là
  // canh thật. Chỉ tên GỐC còn dấu mới phân biệt được, nên phải soi nó TRƯỚC.
  const lowered = rawName.toLowerCase()
  if (lowered.includes('cánh gà')) return 'MAIN'
  if (lowered.includes('canh gà')) return 'SOUP'

  // ── Ưu tiên 1: món cụ thể bị tiền tố RỘNG ở dưới nuốt mất ───────────────
  //
  // `ca phao` (cà pháo — món phụ) khớp luôn tiền tố `ca ` của nhánh MAIN, mà
  // MAIN chạy trước SIDE. Hệ quả: nhánh `ca phao` trong SIDE là code chết và
  // mọi đĩa cà pháo bị gắn nhãn "Món mặn". Đưa lên đây là cách sửa rẻ nhất mà
  // không phải xếp lại toàn bộ thang.
  if (norm.startsWith('ca phao') || norm.startsWith('ca muoi') || norm.startsWith('ca na')) {
    return 'SIDE'
  }

  // ── 1. SOUP (canh, lẩu, súp) ────────────────────────────────────────────
  if (
    norm.startsWith('canh ') ||
    norm.startsWith('sup ') ||
    norm.startsWith('lau ') ||
    norm === 'canh' ||
    norm === 'lau' ||
    norm === 'sup' ||
    norm.includes(' nau chua') ||
    norm.includes(' ham rau cu') ||
    norm.includes(' nau chuoi dau') ||
    norm.includes(' rieu')
  ) {
    // "Bún riêu", "Bánh canh" là món tinh bột chan nước, không phải bát canh.
    if (!norm.startsWith('bun ') && !norm.startsWith('banh ')) {
      return 'SOUP'
    }
  }

  // ── 2. DESSERT (chè, bánh ngọt, đồ uống) ────────────────────────────────
  if (
    norm.startsWith('che ') ||
    norm.startsWith('keo ') ||
    norm.startsWith('banh flan') ||
    norm.startsWith('banh bo') ||
    norm.startsWith('banh chuoi') ||
    norm.startsWith('banh da lon') ||
    norm.startsWith('banh dau xanh') ||
    norm.startsWith('banh pia') ||
    norm.startsWith('banh com') ||
    norm.startsWith('banh phu the') ||
    norm.startsWith('banh troi') ||
    norm.startsWith('banh re') ||
    norm.startsWith('banh cay') ||
    norm.startsWith('banh gai') ||
    norm.startsWith('banh tro') ||
    norm.startsWith('banh in') ||
    norm.startsWith('banh kep') ||
    norm.startsWith('banh khoai mi') ||
    norm.startsWith('banh khao') ||
    norm.startsWith('banh lot') ||
    norm.startsWith('banh mat') ||
    norm.startsWith('banh nhan') ||
    norm.startsWith('banh tai heo') ||
    norm.startsWith('banh tieu') ||
    norm.startsWith('banh trung thu') ||
    norm.startsWith('banh ran') ||
    norm.startsWith('chuoi chien') ||
    norm.startsWith('nuoc mia') ||
    norm.startsWith('nuoc sam') ||
    norm.startsWith('sua dau nanh') ||
    norm.startsWith('ca phe') ||
    norm.startsWith('tra ') ||
    norm.startsWith('chanh muoi') ||
    norm.startsWith('soda ') ||
    norm.startsWith('bia ') ||
    norm.startsWith('ruou ') ||
    norm.startsWith('rau ma') ||
    norm.includes('sam bo luong') ||
    norm.includes('tao pho') ||
    norm.includes('suong sao') ||
    norm.includes('suong sam') ||
    norm.includes('suong sa') ||
    norm.includes('sui din') ||
    norm.includes('o mai') ||
    norm.includes('com ruou') ||
    norm === 'com' ||
    norm === 'oan'
  ) {
    return 'DESSERT'
  }

  // ── 3. STAPLE (cơm, bún, phở, mì, xôi, cháo, bánh mặn) ──────────────────
  if (
    norm.startsWith('com ') ||
    norm.startsWith('xoi ') ||
    norm.startsWith('chao ') ||
    norm.startsWith('bun ') ||
    norm.startsWith('pho ') ||
    norm.startsWith('mi ') ||
    norm.startsWith('mien ') ||
    norm.startsWith('hu tieu') ||
    norm.startsWith('cao lau') ||
    norm.startsWith('banh canh') ||
    norm.startsWith('banh da ') ||
    norm.startsWith('banh mi') ||
    norm.startsWith('banh cuon') ||
    norm.startsWith('banh beo') ||
    norm.startsWith('banh xeo') ||
    norm.startsWith('banh khot') ||
    norm.startsWith('banh hoi') ||
    norm.startsWith('banh chung') ||
    norm.startsWith('banh tet') ||
    norm.startsWith('banh gio') ||
    norm.startsWith('banh duc') ||
    norm.startsWith('banh can') ||
    norm.startsWith('banh cong') ||
    norm.startsWith('banh nam') ||
    norm.startsWith('banh te') ||
    norm.startsWith('banh tam') ||
    norm.startsWith('banh bot loc') ||
    norm.startsWith('banh quai vac') ||
    norm.startsWith('banh khuc') ||
    norm.startsWith('banh bao') ||
    norm.startsWith('banh ba trang') ||
    norm.startsWith('banh goi') ||
    norm.startsWith('banh day') ||
    norm.startsWith('banh it') ||
    norm.startsWith('banh hon tai') ||
    norm.startsWith('banh tom') ||
    norm.startsWith('banh trang') ||
    norm.startsWith('banh phong tom') ||
    norm.startsWith('banh giay') ||
    norm.startsWith('bot chien') ||
    norm.startsWith('bo bia') ||
    norm.startsWith('nem cuon') ||
    norm.startsWith('quay') ||
    norm === 'pho' ||
    norm === 'bun' ||
    norm === 'mi' ||
    norm === 'xoi' ||
    norm === 'chao'
  ) {
    return 'STAPLE'
  }

  // ── 4. MAIN (đạm mặn: thịt, cá, gà, bò, tôm, trứng, mực, chả…) ──────────
  if (
    norm.startsWith('thit ') ||
    norm.startsWith('ca ') ||
    norm.startsWith('ga ') ||
    norm.startsWith('bo ') ||
    norm.startsWith('suon ') ||
    norm.startsWith('tom ') ||
    norm.startsWith('trung ') ||
    norm.startsWith('muc ') ||
    norm.startsWith('oc ') ||
    norm.startsWith('cha ') ||
    norm.startsWith('gio ') ||
    norm.startsWith('nem ') ||
    norm.startsWith('doi ') ||
    norm.startsWith('long ') ||
    norm.startsWith('ruoc ') ||
    norm.startsWith('tiet ') ||
    norm.startsWith('dau hu don thit') ||
    norm.startsWith('muop dang nhoi thit') ||
    norm.startsWith('duong dua') ||
    norm.startsWith('ngan') ||
    norm.startsWith('gia cay') ||
    norm === 'thit kho' ||
    norm === 'ca kho' ||
    norm === 'cha' ||
    norm === 'doi' ||
    norm === 'gio' ||
    norm === 'long non' ||
    norm === 'ruoc'
  ) {
    return 'MAIN'
  }

  // ── 5. SIDE (rau, xào, luộc, gỏi, dưa, đồ chấm) ─────────────────────────
  if (
    norm.startsWith('rau ') ||
    norm.startsWith('goi ') ||
    norm.startsWith('nom ') ||
    norm.startsWith('dua ') ||
    norm.startsWith('kho quet') ||
    norm.startsWith('kim chi') ||
    norm.startsWith('su su ') ||
    norm.startsWith('bap cai ') ||
    norm.startsWith('cai thia ') ||
    norm.startsWith('dau que ') ||
    norm.startsWith('mang tay ') ||
    norm.startsWith('bong cai ') ||
    norm.startsWith('bong dien dien') ||
    norm.startsWith('dau rong ') ||
    norm.startsWith('dau hu ') ||
    norm.startsWith('kho qua xao') ||
    norm.startsWith('bau luoc') ||
    norm.startsWith('rau cu luoc') ||
    norm.startsWith('nuoc mam') ||
    norm.startsWith('nuoc cham') ||
    norm.startsWith('mam ') ||
    norm.startsWith('muoi ') ||
    norm.startsWith('xi dau') ||
    norm.startsWith('tuong') ||
    norm.startsWith('sa te') ||
    norm.startsWith('cham cheo') ||
    norm.includes(' xao toi')
  ) {
    return 'SIDE'
  }

  // Mặc định MAIN: mâm cơm Việt nào cũng có món mặn, nên đoán sai ở đây tốn
  // ít công sửa nhất.
  return 'MAIN'
}
