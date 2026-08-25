import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import * as schema from './schema'

/**
 * Driver HTTP của Neon, không giữ kết nối lâu — hợp với môi trường serverless
 * của Vercel, nơi mỗi invocation có thể là một process khác.
 *
 * Đánh đổi: driver HTTP không chạy được interactive transaction nhiều câu lệnh.
 * Trước đây từng dự đoán E5-T4 (SPEC-022 snapshot Group Rule sang Session Rule lúc Start)
 * cần driver WebSocket (`neon-serverless`), nhưng thực tế snapshot là câu lệnh tự chứa
 * `INSERT … SELECT` nên `db.batch()` của driver HTTP (là transaction Postgres thật)
 * hoàn toàn đáp ứng đủ tính nguyên tử mà không cần driver WebSocket (xem DEC-043, DEC-024).
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
