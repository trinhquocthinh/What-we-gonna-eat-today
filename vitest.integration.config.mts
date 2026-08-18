import { defineConfig } from 'vitest/config'

/**
 * Cấu hình RIÊNG cho integration test — tách khỏi `vitest.config.mts` (unit).
 *
 * `environment: 'node'` chứ không `jsdom`: test này chạm database thật, không
 * cần DOM giả lập.
 *
 * `fileParallelism: false`: TC-107 tự nó là một test đo race condition có chủ
 * đích. Để file integration KHÁC chạy song song trên cùng Neon branch (compute
 * giới hạn ở free tier) là tự thêm nhiễu không kiểm soát được vào chính phép đo
 * đó. Chạy tuần tự đổi lấy chậm hơn — chấp nhận được, integration test vốn đã
 * "chậm hơn nhiều lần" (Test Cases §1.1).
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    setupFiles: ['./src/tests/setup-integration.ts'],
    include: ['src/**/*.integration.test.ts'],
    fileParallelism: false,
  },
})
