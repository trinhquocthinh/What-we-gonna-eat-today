import { config } from 'dotenv'
import { and, eq, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

// Nạp biến môi trường từ .env.local và .env
config({ path: '.env.local', quiet: true })
config({ path: '.env', quiet: true })

import { getDb } from '../src/shared/db/client'
import { globalDishes, groupDishes, groupDishTags, groups, users } from '../src/shared/db/schema'
import { collapseDishName, normalizeDishName } from '../src/features/dish/domain/normalize-name'
import type { SystemTag } from '../src/features/dish/domain/system-tag'

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
 * Tự động suy luận SystemTag chính xác từ tên món ăn theo ẩm thực Việt.
 */
export function inferSystemTag(name: string): SystemTag {
  const norm = normalizeDishName(name)

  // Món bắt đầu bằng 'cánh gà' là món chính, không phải canh
  if (norm.startsWith('canh ga ')) {
    return 'MAIN'
  }

  // 1. SOUP (Món canh, lẩu, súp)
  if (
    norm.startsWith('canh ') ||
    norm.startsWith('sup ') ||
    norm.startsWith('lau ') ||
    norm === 'canh' ||
    norm === 'lau' ||
    norm === 'sup' ||
    norm.includes(' nau chua') ||
    norm.includes(' ham rau cu') ||
    norm.includes(' nau chuoi dau') ||
    norm.includes(' rieu')
  ) {
    if (!norm.startsWith('bun ') && !norm.startsWith('banh ')) {
      return 'SOUP'
    }
  }

  // 2. DESSERT (Chè, bánh ngọt, đồ ngọt, giải khát)
  if (
    norm.startsWith('che ') ||
    norm.startsWith('keo ') ||
    norm.startsWith('banh flan') ||
    norm.startsWith('banh bo') ||
    norm.startsWith('banh chuoi') ||
    norm.startsWith('banh da lon') ||
    norm.startsWith('banh dau xanh') ||
    norm.startsWith('banh pia') ||
    norm.startsWith('banh com') ||
    norm.startsWith('banh phu the') ||
    norm.startsWith('banh troi') ||
    norm.startsWith('banh re') ||
    norm.startsWith('banh cay') ||
    norm.startsWith('banh gai') ||
    norm.startsWith('banh tro') ||
    norm.startsWith('banh in') ||
    norm.startsWith('banh kep') ||
    norm.startsWith('banh khoai mi') ||
    norm.startsWith('banh khao') ||
    norm.startsWith('banh lot') ||
    norm.startsWith('banh mat') ||
    norm.startsWith('banh nhan') ||
    norm.startsWith('banh tai heo') ||
    norm.startsWith('banh tieu') ||
    norm.startsWith('banh trung thu') ||
    norm.startsWith('banh ran') ||
    norm.startsWith('chuoi chien') ||
    norm.startsWith('nuoc mia') ||
    norm.startsWith('nuoc sam') ||
    norm.startsWith('sua dau nanh') ||
    norm.startsWith('ca phe') ||
    norm.startsWith('tra ') ||
    norm.startsWith('chanh muoi') ||
    norm.startsWith('soda ') ||
    norm.startsWith('bia ') ||
    norm.startsWith('ruou ') ||
    norm.startsWith('rau ma') ||
    norm.includes('sam bo luong') ||
    norm.includes('tao pho') ||
    norm.includes('suong sao') ||
    norm.includes('suong sam') ||
    norm.includes('suong sa') ||
    norm.includes('sui din') ||
    norm.includes('o mai') ||
    norm.includes('com ruou') ||
    norm === 'com' ||
    norm === 'oan'
  ) {
    return 'DESSERT'
  }

  // 3. STAPLE (Cơm, xôi, cháo, bún, phở, mì, bánh mặn)
  if (
    norm.startsWith('com ') ||
    norm.startsWith('xoi ') ||
    norm.startsWith('chao ') ||
    norm.startsWith('bun ') ||
    norm.startsWith('pho ') ||
    norm.startsWith('mi ') ||
    norm.startsWith('mien ') ||
    norm.startsWith('hu tieu') ||
    norm.startsWith('cao lau') ||
    norm.startsWith('banh canh') ||
    norm.startsWith('banh da ') ||
    norm.startsWith('banh mi') ||
    norm.startsWith('banh cuon') ||
    norm.startsWith('banh beo') ||
    norm.startsWith('banh xeo') ||
    norm.startsWith('banh khot') ||
    norm.startsWith('banh hoi') ||
    norm.startsWith('banh chung') ||
    norm.startsWith('banh tet') ||
    norm.startsWith('banh gio') ||
    norm.startsWith('banh duc') ||
    norm.startsWith('banh can') ||
    norm.startsWith('banh cong') ||
    norm.startsWith('banh nam') ||
    norm.startsWith('banh te') ||
    norm.startsWith('banh tam') ||
    norm.startsWith('banh bot loc') ||
    norm.startsWith('banh quai vac') ||
    norm.startsWith('banh khuc') ||
    norm.startsWith('banh bao') ||
    norm.startsWith('banh ba trang') ||
    norm.startsWith('banh goi') ||
    norm.startsWith('banh day') ||
    norm.startsWith('banh it') ||
    norm.startsWith('banh hon tai') ||
    norm.startsWith('banh tom') ||
    norm.startsWith('banh trang') ||
    norm.startsWith('banh phong tom') ||
    norm.startsWith('banh giay') ||
    norm.startsWith('bot chien') ||
    norm.startsWith('bo bia') ||
    norm.startsWith('nem cuon') ||
    norm.startsWith('quay') ||
    norm === 'pho' ||
    norm === 'bun' ||
    norm === 'mi' ||
    norm === 'xoi' ||
    norm === 'chao'
  ) {
    return 'STAPLE'
  }

  // 4. MAIN (Món đạm mặn: thịt, cá, gà, bò, tôm, sườn, trứng, mực, ốc, chả...)
  if (
    norm.startsWith('thit ') ||
    norm.startsWith('ca ') ||
    norm.startsWith('ga ') ||
    norm.startsWith('bo ') ||
    norm.startsWith('suon ') ||
    norm.startsWith('tom ') ||
    norm.startsWith('trung ') ||
    norm.startsWith('muc ') ||
    norm.startsWith('oc ') ||
    norm.startsWith('cha ') ||
    norm.startsWith('gio ') ||
    norm.startsWith('nem ') ||
    norm.startsWith('doi ') ||
    norm.startsWith('long ') ||
    norm.startsWith('ruoc ') ||
    norm.startsWith('tiet ') ||
    norm.startsWith('dau hu don thit') ||
    norm.startsWith('muop dang nhoi thit') ||
    norm.startsWith('duong dua') ||
    norm.startsWith('ngan') ||
    norm.startsWith('gia cay') ||
    norm === 'thit kho' ||
    norm === 'ca kho' ||
    norm === 'cha' ||
    norm === 'doi' ||
    norm === 'gio' ||
    norm === 'long non' ||
    norm === 'ruoc'
  ) {
    return 'MAIN'
  }

  // 5. SIDE (Món rau, xào, nộm, gỏi, gia vị, đồ chấm)
  if (
    norm.startsWith('rau ') ||
    norm.startsWith('goi ') ||
    norm.startsWith('nom ') ||
    norm.startsWith('dua ') ||
    norm.startsWith('ca phao') ||
    norm.startsWith('kho quet') ||
    norm.startsWith('kim chi') ||
    norm.startsWith('su su ') ||
    norm.startsWith('bap cai ') ||
    norm.startsWith('cai thia ') ||
    norm.startsWith('dau que ') ||
    norm.startsWith('mang tay ') ||
    norm.startsWith('bong cai ') ||
    norm.startsWith('bong dien dien') ||
    norm.startsWith('dau rong ') ||
    norm.startsWith('dau hu ') ||
    norm.startsWith('kho qua xao') ||
    norm.startsWith('bau luoc') ||
    norm.startsWith('rau cu luoc') ||
    norm.startsWith('nuoc mam') ||
    norm.startsWith('nuoc cham') ||
    norm.startsWith('mam ') ||
    norm.startsWith('muoi ') ||
    norm.startsWith('xi dau') ||
    norm.startsWith('tuong') ||
    norm.startsWith('sa te') ||
    norm.startsWith('cham cheo') ||
    norm.includes(' xao toi')
  ) {
    return 'SIDE'
  }

  return 'MAIN'
}

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
