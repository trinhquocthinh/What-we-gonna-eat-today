#!/usr/bin/env bash
# Kiểm tra luật tầng ở Tech Spec §2.2–2.3 có thật sự được ESLint chặn hay không.
#
# Vì sao cần: luật `import/no-restricted-paths` im lặng khi cấu hình sai — ví dụ
# dùng glob `*` trong `target` thì không khớp gì cả mà cũng không báo lỗi. Một
# cấu hình hỏng nhìn y hệt một codebase sạch. Script này dựng file vi phạm cố ý
# rồi khẳng định ESLint bắt được, sau đó dọn sạch.
#
# Chạy: yarn arch:probe

set -euo pipefail
cd "$(dirname "$0")/.."

PROBES=(
  src/features/selection/application/_probe-port.ts
  src/features/history/domain/_probe-target.ts
  src/features/preference/domain/_probe-pref-target.ts
  src/features/selection/domain/_probe-1.ts
  src/features/history/domain/_probe-2.ts
  src/features/selection/presentation/components/_probe-3.ts
  src/features/selection/domain/_probe-4.ts
  src/features/preference/domain/_probe-6.ts
  src/features/selection/domain/_probe-ok.ts
  src/features/selection/domain/_probe-ok-2.ts
)

cleanup() { rm -f "${PROBES[@]}"; }
trap cleanup EXIT

mkdir -p \
  src/features/selection/application \
  src/features/history/domain \
  src/features/preference/domain \
  src/features/selection/domain \
  src/features/selection/presentation/components

cat > src/features/selection/application/_probe-port.ts <<'EOF'
export type ProbePort = { readonly ok: boolean }
EOF
cat > src/features/history/domain/_probe-target.ts <<'EOF'
export const probeValue = 1
EOF
cat > src/features/preference/domain/_probe-pref-target.ts <<'EOF'
export const probeValue = 1
EOF

# 1. domain -> application, cùng feature
cat > src/features/selection/domain/_probe-1.ts <<'EOF'
import type { ProbePort } from '../application/_probe-port'
export const a: ProbePort | null = null
EOF

# 2. cross-feature bị cấm: history -> selection
cat > src/features/history/domain/_probe-2.ts <<'EOF'
import type { ProbePort } from '../../selection/application/_probe-port'
export const b: ProbePort | null = null
EOF

# 3. presentational component -> application
cat > src/features/selection/presentation/components/_probe-3.ts <<'EOF'
import type { ProbePort } from '../../application/_probe-port'
export const c: ProbePort | null = null
EOF

# 4 và 5. domain -> react, domain -> process.env
cat > src/features/selection/domain/_probe-4.ts <<'EOF'
import { useState } from 'react'
export const d = useState
export const e = process.env.DATABASE_URL
EOF

# 6. cross-feature bị cấm: preference -> selection (preference là feature lá)
cat > src/features/preference/domain/_probe-6.ts <<'EOF'
import type { ProbePort } from '../../selection/application/_probe-port'
export const f: ProbePort | null = null
EOF

# Chiều ĐƯỢC PHÉP theo §2.3: selection -> history. Không được báo lỗi.
cat > src/features/selection/domain/_probe-ok.ts <<'EOF'
import { probeValue } from '../../history/domain/_probe-target'
export const ok = probeValue
EOF

# Chiều ĐƯỢC PHÉP mới theo §2.3: selection -> preference. Không được báo lỗi.
cat > src/features/selection/domain/_probe-ok-2.ts <<'EOF'
import { probeValue } from '../../preference/domain/_probe-pref-target'
export const okPref = probeValue
EOF

npx eslint "${PROBES[@]}" --format json > .probe-result.json 2>/dev/null || true
trap 'cleanup; rm -f .probe-result.json' EXIT

node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs'

const EXPECTED = 6
const results = JSON.parse(readFileSync('.probe-result.json', 'utf8'))

let caught = 0
let falsePositives = 0

for (const file of results) {
  const name = file.filePath.split('/').pop()
  for (const m of file.messages) {
    if (name.startsWith('_probe-ok')) {
      falsePositives++
      console.log(`  BÁO NHẦM  ${name}  ${m.ruleId}: ${m.message}`)
    } else if (/^_probe-[1-6]\.ts$/.test(name)) {
      caught++
      console.log(`  bắt được  ${name}  ${m.ruleId}`)
    }
  }
}

console.log('---')
console.log(`vi phạm bắt được: ${caught}/${EXPECTED}    báo nhầm chiều hợp lệ: ${falsePositives}`)

if (caught !== EXPECTED || falsePositives !== 0) {
  console.error('THẤT BẠI: luật tầng không chặn đúng. Kiểm tra zones trong eslint.config.mjs.')
  process.exit(1)
}
console.log('OK: luật tầng chặn đúng 6 vi phạm và không đụng chiều hợp lệ.')
NODE
