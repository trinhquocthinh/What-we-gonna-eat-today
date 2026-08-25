import { config } from 'dotenv'
import { and, eq, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

// Nạp biến môi trường từ .env.local và .env
config({ path: '.env.local', quiet: true })
config({ path: '.env', quiet: true })

import { getDb } from '../src/shared/db/client'
import { globalDishes, groupDishes, groupDishTags, groups, users } from '../src/shared/db/schema'
// `inferSystemTag` sống ở `domain/` chứ không ở đây nữa: để trong `scripts/`
// thì nằm ngoài phạm vi đo coverage nên không ai viết test, và đó đúng là lý do
// hai lỗi phân loại (cà pháo, canh gà) sống sót từ đầu.
import { inferSystemTag } from '../src/features/dish/domain/infer-system-tag'
import { collapseDishName, normalizeDishName } from '../src/features/dish/domain/normalize-name'

/**
 * Danh mục món ăn gia đình phổ biến (Backup & Bổ sung cho Wikipedia).
 * Đảm bảo các món cơm nhà quen thuộc luôn có mặt đầy đủ.
 */
const CURATED_FAMILY_DISHES = [
  // Món kho / rim / mặn
  'Thịt kho tàu',
  'Thịt kho tiêu',
  'Thịt kho trứng cút',
  'Thịt ba chỉ rang cháy cạnh',
  'Thịt heo luộc cà pháo mắm tôm',
  'Thịt băm xào bắp ngọt',
  'Sườn heo ram mặn ngọt',
  'Sườn xào chua ngọt',
  'Cá basa kho tiêu',
  'Cá lóc kho tộ',
  'Cá thu sốt cà chua',
  'Cá nục kho cà',
  'Cá bống kho tiêu',
  'Cá hú kho thơm',
  'Tôm rim mặn ngọt',
  'Tôm rang thịt ba chỉ',
  'Gà kho sả ớt',
  'Gà kho gừng',
  'Gà chiên nước mắm',
  'Đậu hũ dồn thịt sốt cà',
  'Đậu hũ chiên sả ớt',
  'Trứng chiên thịt băm',
  'Trứng chiên hành hoa',
  'Mực xào chua ngọt',
  'Mực nhồi thịt sốt cà',
  'Bò kho',
  'Bò lúc lắc',
  'Bò xào hành cần',

  // Món canh
  'Canh chua cá lóc',
  'Canh chua tôm',
  'Canh khổ qua nhồi thịt',
  'Canh rau ngót thịt băm',
  'Canh bí đỏ nấu tôm thịt',
  'Canh cua rau đay mồng tơi',
  'Canh sườn hầm rau củ',
  'Canh cải ngọt nấu tôm',
  'Canh cải thảo nấu thịt băm',
  'Canh bí đao nấu sườn',
  'Canh măng chua thịt bò',
  'Canh rong biển đậu hũ thịt băm',
  'Canh kim chi thịt heo',
  'Canh ngao nấu chua',
  'Canh hến nấu rau muống',
  'Canh bầu nấu tôm',
  'Canh mướp hương nấu lòng gà',

  // Món xào / rau / luộc
  'Rau muống xào tỏi',
  'Rau muống luộc chấm tương',
  'Rau lang xào tỏi',
  'Bông cải xanh xào thịt bò',
  'Đậu que xào thịt heo',
  'Khổ qua xào trứng',
  'Bắp cải xào cà chua',
  'Cải thìa xào nấm đông cô',
  'Su su xào tỏi',
  'Bầu luộc chấm trứng dầm nước mắm',
  'Rau củ luộc chấm kho quẹt',
  'Măng tây xào tỏi',
  'Đậu rồng xào thịt bò',

  // Món chiên / nướng / lẩu
  'Cá diêu hồng chiên xù',
  'Cá tai tượng chiên giòn',
  'Chả giò chiên giòn',
  'Chả lá lốt chiên',
  'Thịt xiên nướng than hoa',
  'Cánh gà nướng mật ong',
  'Lẩu gà lá é',
  'Lẩu thái hải sản',
  'Lẩu cá kèo lá giang',
]

/**
 * Cào danh sách món ăn từ Wikipedia tiếng Việt
 */
async function fetchDishesFromWikipedia(): Promise<string[]> {
  const url =
    'https://vi.wikipedia.org/w/api.php?action=parse&page=Danh_s%C3%A1ch_m%C3%B3n_%C4%83n_Vi%E1%BB%87t_Nam&format=json&prop=wikitext'

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'WhatWeGonnaEatToday-DishBot/1.0' },
    })
    if (!response.ok) return []

    const data = (await response.json()) as { parse?: { wikitext?: { '*'?: string } } }
    const text = data.parse?.wikitext?.['*']
    if (!text) return []

    const lines = text.split('\n')
    const extracted: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() ?? ''
      if (line.startsWith('|-')) {
        const next = lines[i + 1]?.trim() ?? ''
        if (
          next.startsWith('|') &&
          !next.startsWith('|{') &&
          !next.startsWith('| class') &&
          !next.startsWith('|-')
        ) {
          const cell =
            next
              .replace(/^\|\s*/u, '')
              .split('||')[0]
              ?.trim() ?? ''
          const match = cell.match(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/u)
          let name = match ? (match[2] ?? match[1] ?? '') : cell

          name = name
            .replace(/<ref[^>]*>.*?<\/ref>/giu, '')
            .replace(/<ref[^>]*\/>/giu, '')
            .replace(/<!--.*?-->/gu, '')
            .replace(/\(.*?\)/gu, '')
            .trim()

          if (
            name.length >= 3 &&
            name.length <= 60 &&
            !name.includes('Tập tin:') &&
            !name.includes('File:') &&
            !name.startsWith('{') &&
            !name.startsWith('!') &&
            !name.includes('http')
          ) {
            extracted.push(name)
          }
        }
      }
    }

    return extracted
  } catch (error) {
    console.warn('⚠️  Không thể tải từ Wikipedia, chuyển sang dùng danh mục nội bộ:', error)
    return []
  }
}

async function main() {
  console.log(
    '🥘 [What We Gonna Eat Today] Bắt đầu cào và nạp dữ liệu món ăn Việt Nam (kèm System Tag)...\n',
  )

  const db = getDb()

  // 1. Thu thập danh sách món từ Wikipedia + bộ món cơm nhà
  console.log('🌐 Đang tải danh sách món ăn từ Wikipedia Việt Nam...')
  const wikiDishes = await fetchDishesFromWikipedia()
  console.log(`   ✓ Lấy được ${wikiDishes.length} món từ Wikipedia`)

  const rawDishList = [...CURATED_FAMILY_DISHES, ...wikiDishes]

  // 2. Chuẩn hoá & loại bỏ trùng lặp
  const uniqueDishMap = new Map<string, string>()
  for (const rawName of rawDishList) {
    const cleaned = collapseDishName(rawName)
    const normalized = normalizeDishName(cleaned)
    if (cleaned.length >= 2 && !uniqueDishMap.has(normalized)) {
      uniqueDishMap.set(normalized, cleaned)
    }
  }

  const finalDishList = Array.from(uniqueDishMap.entries()).map(([normalized, name]) => ({
    name,
    normalizedName: normalized,
    systemTag: inferSystemTag(name),
  }))

  console.log(
    `✨ Tổng hợp được ${finalDishList.length} món ăn Việt Nam độc bản (đã phân loại Tag).\n`,
  )

  // 3. Lấy thông tin Group và User để gán vào database
  const allGroups = await db.select().from(groups)
  if (allGroups.length === 0) {
    console.error('❌ Chưa có nhóm nào trong cơ sở dữ liệu. Hãy tạo ít nhất 1 nhóm trước!')
    process.exit(1)
  }

  const allUsers = await db.select().from(users)
  const defaultUser = allUsers[0]
  if (!defaultUser) {
    console.error('❌ Chưa có người dùng nào trong cơ sở dữ liệu. Hãy đăng nhập trước!')
    process.exit(1)
  }

  // Lấy danh sách nhóm đích (mặc định lấy tất cả hoặc nhóm đầu tiên)
  const isAllGroups = process.argv.includes('--all')
  const targetGroups = isAllGroups ? allGroups : [allGroups[allGroups.length - 1]!]

  console.log(`👥 Sẽ nạp và đồng bộ món vào ${targetGroups.length} nhóm:`)
  targetGroups.forEach((g) => console.log(`   - [${g.name}] (ID: ${g.id})`))
  console.log(`👤 Người khởi tạo: ${defaultUser.displayName} (${defaultUser.email})\n`)

  // 4. Tiến hành nạp dữ liệu và gắn System Tag
  for (const group of targetGroups) {
    console.log(`🚀 Đang đồng bộ món vào nhóm "${group.name}"...`)

    // Lấy các món đã có sẵn trong nhóm
    const existingPool = await db
      .select({
        groupDishId: groupDishes.id,
        normalizedName: globalDishes.normalizedName,
      })
      .from(groupDishes)
      .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
      .where(and(eq(groupDishes.groupId, group.id), eq(groupDishes.state, 'ACTIVE')))

    const existingNormalizedSet = new Set(existingPool.map((p) => p.normalizedName))

    let addedCount = 0
    let skippedCount = 0

    for (const dish of finalDishList) {
      if (existingNormalizedSet.has(dish.normalizedName)) {
        skippedCount++
        continue
      }

      // Tạo Global Dish (hoặc tìm global dish đã có)
      const existingGlobal = await db
        .select({ id: globalDishes.id })
        .from(globalDishes)
        .where(eq(globalDishes.normalizedName, dish.normalizedName))
        .limit(1)

      let globalDishId = existingGlobal[0]?.id

      if (!globalDishId) {
        globalDishId = uuidv7()
        await db.insert(globalDishes).values({
          id: globalDishId,
          name: dish.name,
          normalizedName: dish.normalizedName,
          createdByUserId: defaultUser.id,
          createdFromGroupId: group.id,
        })
      }

      // Gắn vào Group Dish Pool kèm System Tag
      const groupDishId = uuidv7()
      await db.batch([
        db.insert(groupDishes).values({
          id: groupDishId,
          groupId: group.id,
          globalDishId,
          state: 'ACTIVE',
        }),
        db.insert(groupDishTags).values({
          groupDishId,
          systemTag: dish.systemTag,
        }),
      ])

      existingNormalizedSet.add(dish.normalizedName)
      addedCount++
    }

    console.log(`   ✅ Đã thêm mới: ${addedCount} món (đã kèm nhãn hệ thống)`)
    console.log(`   ⏩ Đã có sẵn: ${skippedCount} món`)

    // 5. Backfill tag cho các món đã có sẵn trong nhóm nhưng chưa có tag
    const untaggedDishes = await db
      .select({
        groupDishId: groupDishes.id,
        dishName: globalDishes.name,
      })
      .from(groupDishes)
      .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
      .leftJoin(groupDishTags, eq(groupDishTags.groupDishId, groupDishes.id))
      .where(and(eq(groupDishes.groupId, group.id), isNull(groupDishTags.systemTag)))

    if (untaggedDishes.length > 0) {
      console.log(
        `   🏷️  Phát hiện ${untaggedDishes.length} món chưa có nhãn. Đang gắn nhãn bổ sung...`,
      )
      for (const item of untaggedDishes) {
        const tag = inferSystemTag(item.dishName)
        await db.insert(groupDishTags).values({
          groupDishId: item.groupDishId,
          systemTag: tag,
        })
      }
      console.log(`   ✅ Đã bổ sung nhãn cho toàn bộ ${untaggedDishes.length} món thành công!`)
    } else {
      console.log(`   ✨ Toàn bộ món trong nhóm đã có nhãn đầy đủ.`)
    }
  }

  console.log('\n🎉 Hoàn thành nạp và gắn nhãn toàn bộ món ăn thành công!')
}

main().catch((error) => {
  console.error('❌ Lỗi khi nạp dữ liệu:', error)
  process.exit(1)
})
