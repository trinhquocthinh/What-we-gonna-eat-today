import { config } from 'dotenv'
import { eq } from 'drizzle-orm'

config({ path: '.env.local', quiet: true })
config({ path: '.env', quiet: true })

import { inferSystemTag } from '../src/features/dish/domain/infer-system-tag'
import { getDb } from '../src/shared/db/client'
import { globalDishes, groupDishes, groupDishTags } from '../src/shared/db/schema'

/**
 * Gắn lại nhãn cho những món ĐANG mang đúng MỘT nhãn do máy suy luận sai.
 *
 * Vì sao cần script riêng thay vì chạy lại `seed:dishes`: bước backfill của
 * seed chỉ gắn nhãn cho món CHƯA CÓ nhãn nào (`isNull(groupDishTags.systemTag)`).
 * Món đã bị gắn sai thì nó bỏ qua, nên sửa `inferSystemTag` xong chạy lại seed
 * cũng không chữa được gì.
 *
 * AN TOÀN CÓ CHỦ Ý — chỉ đụng vào món có ĐÚNG MỘT nhãn:
 * món nhiều nhãn gần như chắc chắn là do người dùng tự gắn tay (máy chỉ suy ra
 * được một nhãn), và ghi đè lựa chọn của con người bằng phỏng đoán của máy là
 * việc không được phép làm.
 *
 * Chạy `--dry` để chỉ xem khác biệt, không ghi gì:
 *   DATABASE_URL="…" yarn tsx scripts/retag-dishes.ts --dry
 */
async function main() {
  const dryRun = process.argv.includes('--dry')

  console.log(
    `🏷️  [What We Gonna Eat Today] Gắn lại nhãn món${dryRun ? ' (DRY RUN — không ghi)' : ''}...\n`,
  )

  const db = getDb()

  const rows = await db
    .select({
      groupDishId: groupDishes.id,
      groupId: groupDishes.groupId,
      name: globalDishes.name,
      systemTag: groupDishTags.systemTag,
    })
    .from(groupDishes)
    .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
    .innerJoin(groupDishTags, eq(groupDishTags.groupDishId, groupDishes.id))

  // Gom theo món để biết món nào đang có nhiều hơn một nhãn.
  const tagsByDish = new Map<string, { name: string; tags: string[] }>()
  for (const row of rows) {
    const entry = tagsByDish.get(row.groupDishId)
    if (entry === undefined) {
      tagsByDish.set(row.groupDishId, { name: row.name, tags: [row.systemTag] })
    } else {
      entry.tags.push(row.systemTag)
    }
  }

  console.log(`📦 Tổng số món có nhãn: ${tagsByDish.size}`)

  let changed = 0
  let skippedMultiTag = 0

  for (const [groupDishId, { name, tags }] of tagsByDish) {
    if (tags.length > 1) {
      skippedMultiTag++
      continue
    }

    const current = tags[0]
    const recomputed = inferSystemTag(name)
    if (recomputed === current) continue

    console.log(`   ✏️  "${name}": ${current} → ${recomputed}`)
    changed++

    if (!dryRun) {
      await db.delete(groupDishTags).where(eq(groupDishTags.groupDishId, groupDishId))
      await db.insert(groupDishTags).values({ groupDishId, systemTag: recomputed })
    }
  }

  console.log(`\n⏭️  Bỏ qua ${skippedMultiTag} món nhiều nhãn (do người dùng tự gắn).`)
  console.log(
    dryRun
      ? `✅ Xong (dry run). Sẽ sửa ${changed} món nếu chạy thật.`
      : `✅ Xong. Đã sửa nhãn cho ${changed} món.`,
  )
}

main().catch((error) => {
  console.error('❌ Lỗi gắn lại nhãn:', error)
  process.exit(1)
})
