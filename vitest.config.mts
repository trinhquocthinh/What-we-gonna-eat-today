import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  // Alias `@/*` đọc thẳng từ tsconfig.json, không cần plugin riêng (Vite 8).
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Integration test cần DATABASE_URL_TEST thật — không để `yarn test` (unit)
    // vô tình nhặt phải rồi đỏ trên máy chưa cấu hình `.env.test.local`.
    // Xem `vitest.integration.config.mts` cho `yarn test:integration`.
    exclude: ['**/*.integration.test.ts', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Tech Spec §8.2: chỉ domain/ và application/ có ngưỡng.
      // infrastructure/ và presentation/ được đo nhưng không đặt ngưỡng.
      // shared/time thêm ở E1-T4: đúng hồ sơ "sai mà không gây lỗi" của §8.2.
      include: [
        'src/features/*/domain/**/*.ts',
        'src/features/*/application/**/*.ts',
        'src/shared/time/**/*.ts',
      ],
      // Ngưỡng 80% được CI ép ở E6-T5. Bật sớm sẽ chặn E1 khi mới có vài use
      // case, nên giai đoạn này chỉ báo cáo.
      // thresholds: { lines: 80 },
    },
  },
})
