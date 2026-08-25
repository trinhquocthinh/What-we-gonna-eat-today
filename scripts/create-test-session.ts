import { config } from 'dotenv'
import { and, eq, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

config({ path: '.env.local', quiet: true })
config({ path: '.env', quiet: true })

import { createSession } from '../src/features/session/application/create-session'
import { startSession } from '../src/features/session/application/start-session'
import { resolveDecisionDate } from '../src/features/session/domain/decision-date'
import { drizzleMembershipRepository } from '../src/features/group/infrastructure/drizzle-group-repository'
import { drizzleDishRepository } from '../src/features/dish/infrastructure/drizzle-dish-repository'
import { drizzleSessionRepository } from '../src/features/session/infrastructure/drizzle-session-repository'
import { getDb } from '../src/shared/db/client'
import {
  groupMembers,
  groups,
  participants,
  selectionSessions,
  users,
} from '../src/shared/db/schema'

async function main() {
  console.log('🍽️  [What We Gonna Eat Today] Khởi tạo & Mở phiên chọn món (Test Session)...\n')

  const db = getDb()

  // 1. Lấy thông tin Group
  const allGroups = await db.select().from(groups)
  if (allGroups.length === 0) {
    console.error('❌ Chưa có nhóm nào. Hãy tạo nhóm trên web trước!')
    process.exit(1)
  }

  // Chọn nhóm cuối cùng tạo (hoặc nhóm có tên "Nhà làm")
  const targetGroup =
    allGroups.find((g) => g.name === 'Nhà làm') ?? allGroups[allGroups.length - 1]!

  console.log(`📌 Nhóm được chọn: "${targetGroup.name}" (ID: ${targetGroup.id})`)

  // 2. Lấy thành viên / Creator của nhóm
  const members = await db
    .select({
      userId: groupMembers.userId,
      isAdmin: groupMembers.isAdmin,
      name: users.displayName,
      email: users.email,
    })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(and(eq(groupMembers.groupId, targetGroup.id), isNull(groupMembers.removedAt)))

  if (members.length === 0) {
    console.error('❌ Nhóm chưa có thành viên nào!')
    process.exit(1)
  }

  const creator = members.find((m) => m.isAdmin) ?? members[0]!
  console.log(`👤 Người mở phiên: ${creator.name} (${creator.email})`)

  // 3. Tính ngày quyết định
  const decisionDate = resolveDecisionDate(new Date(), targetGroup.timezone)
  console.log(`📅 Ngày quyết định: ${decisionDate} (Múi giờ: ${targetGroup.timezone})`)

  // 4. Kiểm tra xem hôm nay đã có session nào chưa
  const existingSession = await db
    .select()
    .from(selectionSessions)
    .where(eq(selectionSessions.groupId, targetGroup.id))

  const todaySession = existingSession.find((s) => s.decisionDate === decisionDate)

  let sessionId: string

  if (todaySession) {
    console.log(
      `\nℹ️  Hôm nay nhóm đã có Session (ID: ${todaySession.id}, Trạng thái: ${todaySession.state})`,
    )
    sessionId = todaySession.id

    if (todaySession.state === 'DRAFT') {
      console.log('🔄 Đang chuyển phiên từ DRAFT sang ACTIVE...')
      const startResult = await startSession(
        {
          sessions: drizzleSessionRepository,
          findInvalidParticipants: ({ groupId, userIds }) =>
            drizzleMembershipRepository.findInvalidMembers(groupId, userIds),
        },
        sessionId,
        creator.userId,
      )
      if (!startResult.ok) {
        console.error('❌ Không thể bắt đầu phiên:', startResult.error)
        process.exit(1)
      }
      console.log('✅ Phiên đã được kích hoạt thành công!')
    }
  } else {
    // Tạo session mới
    console.log('\n📝 Đang tạo Session mới dạng DRAFT...')
    const createResult = await createSession(
      {
        sessions: drizzleSessionRepository,
        countActiveDishes: (gid) => drizzleDishRepository.countActiveInGroup(gid),
      },
      {
        groupId: targetGroup.id,
        creatorUserId: creator.userId,
        decisionDate,
      },
    )

    if (!createResult.ok) {
      console.error('❌ Lỗi khi tạo phiên:', createResult.error)
      process.exit(1)
    }

    sessionId = createResult.value.id
    console.log(`✅ Đã tạo Session DRAFT (ID: ${sessionId})`)

    // Kích hoạt session sang ACTIVE
    console.log('🚀 Đang bắt đầu phiên (chuyển sang ACTIVE)...')
    const startResult = await startSession(
      {
        sessions: drizzleSessionRepository,
        findInvalidParticipants: ({ groupId, userIds }) =>
          drizzleMembershipRepository.findInvalidMembers(groupId, userIds),
      },
      sessionId,
      creator.userId,
    )
    if (!startResult.ok) {
      console.error('❌ Lỗi khi bắt đầu phiên:', startResult.error)
      process.exit(1)
    }
    console.log('✅ Phiên đã được kích hoạt sang ACTIVE!')
  }

  // 5. Đảm bảo tất cả thành viên trong nhóm đều là Participants để bất kỳ user nào đăng nhập cũng test được
  for (const m of members) {
    const existingParticipant = await db
      .select()
      .from(participants)
      .where(and(eq(participants.sessionId, sessionId), eq(participants.userId, m.userId)))
      .limit(1)

    if (existingParticipant.length === 0) {
      await db.insert(participants).values({
        id: uuidv7(),
        sessionId,
        userId: m.userId,
        state: 'ACTIVE',
      })
      console.log(`   + Đã thêm thành viên [${m.name}] vào phiên tham gia`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎉 BẠN ĐÃ CÓ PHIÊN CHỌN MÓN ĐANG MỞ!')
  console.log(`👉 Đường dẫn trải nghiệm trực tiếp:`)
  console.log(`   http://localhost:3000/sessions/${sessionId}`)
  console.log('='.repeat(60) + '\n')
}

main().catch((error) => {
  console.error('❌ Lỗi:', error)
  process.exit(1)
})
