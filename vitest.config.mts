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
        /**
         * M3-T8 — `presentation/` vào phép đo.
         *
         * Nó nằm ngoài suốt v1.0 và v1.1, và ba trong bốn lỗi mà đợt rà soát
         * sau v1.1 tìm ra đều ở đây (`deck-screen` gãy bất biến
         * `marks.length === cursor`, `finalize-bar` khớp luật sai loại,
         * `handleCannotEat` nuốt lỗi mạng). Con số 98% của `domain/` không nói
         * gì về lớp đang chứa lỗi — một phép đo không chạm tới chỗ hỏng là một
         * phép đo đang trấn an nhầm chỗ.
         */
        'src/features/*/presentation/**/*.{ts,tsx}',
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
        /**
         * Ngưỡng RIÊNG và THẤP HƠN, không gộp vào 80% của hai lớp kia. Cùng lý
         * lẽ đã tách `domain/` khỏi `application/`: một con số gộp để lớp phủ
         * dày kéo lớp phủ mỏng lên và che đúng chỗ cần nhìn.
         *
         * 70% vì `presentation/` có phần không đáng test và cũng không test nổi
         * cho ra hồn — chuỗi className, nhánh dựng style. Đặt bằng 80% là mời
         * người ta viết test giả cho chúng, đúng thứ ghi chú `exclude` bên trên
         * đã từ chối một lần rồi.
         */
        'src/features/*/presentation/**': { lines: 70 },
        'src/shared/time/**': { lines: 80 },
      },
    },
  },
})
