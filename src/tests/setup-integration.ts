import { config } from 'dotenv'

/**
 * Nạp `.env.test.local` TRƯỚC khi bất kỳ file `*.integration.test.ts` nào gọi
 * `getDb()`. `vitest`, khác `next dev`/`next build`, KHÔNG tự nạp `.env.local`
 * — đây là lỗ hổng chưa lộ ra vì S1/S2 chưa có test nào chạm database thật.
 *
 * Đặt tên `.env.test.local` (không phải `.env.local`): tách bạch khỏi branch
 * "dev" mà `.env.local` trỏ tới, vì integration test xoá dữ liệu giữa các lần
 * chạy (Test Cases §1.3).
 */
config({ path: '.env.test.local', quiet: true })
