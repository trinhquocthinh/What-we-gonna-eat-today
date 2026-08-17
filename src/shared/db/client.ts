import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import * as schema from './schema'

/**
 * Driver HTTP của Neon, không giữ kết nối lâu — hợp với môi trường serverless
 * của Vercel, nơi mỗi invocation có thể là một process khác.
 *
 * Đánh đổi: driver HTTP không chạy được transaction nhiều câu lệnh. Từ E1-T7 trở
 * đi có vài chỗ bắt buộc transaction thật (Start Session, finalize + sinh Eating
 * History — TC-107, TC-109). Khi tới đó sẽ cần thêm driver WebSocket
 * (`neon-serverless`) song song, chứ không thay thế cái này.
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
