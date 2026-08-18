import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import * as schema from './schema'

/**
 * Driver HTTP của Neon, không giữ kết nối lâu — hợp với môi trường serverless
 * của Vercel, nơi mỗi invocation có thể là một process khác.
 *
 * Đánh đổi: driver HTTP không chạy được interactive transaction nhiều câu lệnh. Từ E3-T1 trở
 * đi có vài chỗ bắt buộc interactive transaction (SPEC-008 revalidate + snapshot Group Rule sang
 * Session Rule — TC-030). Khi tới đó sẽ cần thêm driver WebSocket (`neon-serverless`) song song,
 * chứ không thay thế cái này. (Xem DEC-024: E1-T7 dùng atomic single UPDATE và db.batch() nên vẫn
 * dùng driver HTTP an toàn).
 *
 * Kết nối được dựng LƯỜI và nhớ lại. Đừng đổi về `export const db = …`: module
 * này nằm trên đường import của Route Handler auth, mà `next build` nạp module
 * route để thu metadata — build trên CI không có DATABASE_URL sẽ đỏ ngay.
 */
function readDatabaseUrl(): string {
  const url = process.env['DATABASE_URL']
  if (!url) {
    throw new Error('Thiếu DATABASE_URL. Xem Setup & Ops Guide §3.')
  }
  return url
}

let cached: ReturnType<typeof createDb> | undefined

function createDb() {
  return drizzle(neon(readDatabaseUrl()), { schema })
}

export function getDb() {
  if (cached === undefined) {
    cached = createDb()
  }
  return cached
}

export type Database = ReturnType<typeof getDb>
