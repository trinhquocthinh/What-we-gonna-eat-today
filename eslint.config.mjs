import js from '@eslint/js'
import importPlugin from 'eslint-plugin-import'
import tseslint from 'typescript-eslint'
import next from 'eslint-config-next'

/**
 * Tech Spec §2.1–2.3. Luật kiến trúc ở đây do máy giữ, không do trí nhớ.
 *
 * Muốn tắt một luật trong file này thì gần như luôn là đặt sai tầng chứ không
 * phải luật sai — xem bảng rủi ro ở Master Plan §11.
 */

const FEATURES = ['auth', 'group', 'dish', 'rule', 'session', 'selection', 'meal', 'history']

/**
 * §2.3 — đúng bốn chiều được phép, tất cả đi qua application port.
 * Mọi chiều khác bị cấm, kể cả những chiều "hiển nhiên tiện".
 *
 * Guard phân quyền (SPEC-019) KHÔNG nằm ở đây: nó được lắp ở `app/` trước khi
 * gọi use case, nên `session` không cần import `group`. Nếu bạn thấy mình muốn
 * thêm một chiều vào bảng này, hãy kiểm tra xem việc lắp ráp có thuộc về `app/`
 * hay không trước đã.
 */
const ALLOWED_CROSS_FEATURE = {
  selection: ['history', 'dish'],
  meal: ['rule', 'history'],
}

/**
 * Zone của `import/no-restricted-paths` không khớp khi `target` chứa glob `*`,
 * nên bung sẵn theo từng feature thay vì dựa vào wildcard. Đã kiểm bằng file vi
 * phạm cố ý: với glob thì luật im lặng, với đường dẫn cụ thể thì luật báo lỗi.
 */
const LAYER_ZONES = FEATURES.flatMap((f) => {
  const layer = (name) => `./src/features/${f}/${name}`

  return [
    // presentation → application → domain. Không mũi tên nào đi ngược.
    {
      target: layer('domain'),
      from: [
        layer('application'),
        layer('infrastructure'),
        layer('presentation'),
        './src/shared/db',
      ],
      message: `domain/ của "${f}" là tầng trong cùng: không biết tới tầng nào khác, cũng không chạm db.`,
    },
    {
      target: layer('application'),
      from: [layer('infrastructure'), layer('presentation')],
      message: `application/ của "${f}" định nghĩa port; infrastructure/ hiện thực chúng. Chiều import là infrastructure → application.`,
    },
    {
      target: layer('infrastructure'),
      from: layer('presentation'),
      message: `infrastructure/ của "${f}" không được biết tới presentation/.`,
    },

    // Container / Presentational.
    // components/ là tầng thuần props — không use case, không action, không db.
    {
      target: layer('presentation/components'),
      from: [layer('application'), layer('infrastructure'), './src/shared/db'],
      message:
        'Presentational component chỉ nhận props. Đưa việc gọi use case lên containers/ và truyền kết quả xuống.',
    },
  ]
})

/** §2.3 — mỗi feature chỉ thấy chính nó và các feature được phép. */
const CROSS_FEATURE_ZONES = FEATURES.map((feature) => ({
  target: `./src/features/${feature}`,
  from: './src/features',
  except: [feature, ...(ALLOWED_CROSS_FEATURE[feature] ?? [])].map((allowed) => `./${allowed}`),
  message: `Feature "${feature}" không được import feature này. Bốn chiều hợp lệ ghi ở Tech Spec §2.3.`,
}))

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      '.yarn/**',
      'node_modules/**',
      'coverage/**',
      'report/**',
      'next-env.d.ts',
      'src/shared/db/migrations/**',
      'docs/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...next,

  {
    files: ['**/*.{ts,tsx,mjs}'],
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      'import/no-restricted-paths': ['error', { zones: [...LAYER_ZONES, ...CROSS_FEATURE_ZONES] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Luật cần type information chỉ chạy trên mã nguồn, không chạy trên file cấu hình.
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // verbatimModuleSyntax bắt buộc phân biệt import type
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
    },
  },

  // §2.2 — domain/ không React, không Drizzle, không process.env.
  {
    files: ['src/features/*/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-dom',
                'next',
                'next/*',
                'server-only',
                'drizzle-orm',
                'drizzle-orm/*',
                '@neondatabase/*',
              ],
              message:
                'domain/ phải chạy được không cần React, Next hay database. Đưa phần phụ thuộc ra application/ hoặc infrastructure/.',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'domain/ không đọc cấu hình môi trường. Nhận giá trị qua tham số để test không phải mock.',
        },
      ],
    },
  },

  // File cấu hình ở gốc repo: export thẳng object là đúng quy ước của từng công
  // cụ, đặt tên biến trung gian chỉ để làm vừa lòng luật lint là nhiễu.
  {
    files: ['*.config.mjs', '*.config.ts', '.lintstagedrc.mjs'],
    rules: {
      'import/no-anonymous-default-export': 'off',
    },
  },

  // Test được nới: cần dựng dữ liệu giả và import chéo tầng.
  {
    files: ['**/*.test.{ts,tsx}', 'src/tests/**'],
    rules: {
      'import/no-restricted-paths': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
