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
      include: [
        'src/features/*/domain/**/*.ts',
        'src/features/*/application/**/*.ts',
        'src/shared/time/**/*.ts',
      ],
      /**
       * Port và file chỉ khai kiểu — biên dịch ra JavaScript RỖNG, nên `tsc`
       * đã là toàn bộ phép kiểm của chúng. Để trong phép đo thì v8 tính file
       * không có câu lệnh nào theo cách không nhất quán và làm con số mất
       * nghĩa. Loại trừ chứ KHÔNG viết test giả cho chúng — xem Guide §1.2.
       */
      exclude: [
        'src/features/*/application/*-repository.ts',
        'src/features/*/domain/{group-dish,dish-card,interaction,session}.ts',
      ],
      /**
       * HAI ngưỡng RIÊNG, không phải một số gộp: Tech Spec §8.2 đặt ≥80% cho
       * `domain/` và ≥80% cho `application/` như hai cam kết khác nhau. Gộp lại
       * thì `domain/` (hàm thuần, phủ rất dày) sẽ kéo con số lên và che một
       * `application/` yếu — đúng thứ ngưỡng sinh ra để ngăn.
       */
      thresholds: {
        'src/features/*/domain/**': { lines: 80 },
        'src/features/*/application/**': { lines: 80 },
        'src/shared/time/**': { lines: 80 },
      },
    },
  },
})
