import { config } from 'dotenv'
import { eq } from 'drizzle-orm'

config({ path: '.env.local', quiet: true })
config({ path: '.env', quiet: true })

import { normalizeDishName } from '../src/features/dish/domain/normalize-name'
import { getDb } from '../src/shared/db/client'
import { globalDishes } from '../src/shared/db/schema'

async function main() {
  console.log('🔤 [What We Gonna Eat Today] Backfill normalized_name (bỏ dấu tiếng Việt)...\n')

  const db = getDb()
  const rows = await db.select().from(globalDishes)

  console.log(`📦 Tổng số Global Dish: ${rows.length}`)

  let changed = 0
  for (const row of rows) {
    const recomputed = normalizeDishName(row.name)
    if (recomputed !== row.normalizedName) {
      await db
        .update(globalDishes)
        .set({ normalizedName: recomputed })
        .where(eq(globalDishes.id, row.id))
      console.log(`   ✏️  "${row.name}": "${row.normalizedName}" → "${recomputed}"`)
      changed++
    }
  }

  console.log(`\n✅ Xong. Đã cập nhật ${changed}/${rows.length} dòng.`)
}

main().catch((error) => {
  console.error('❌ Lỗi backfill:', error)
  process.exit(1)
})
