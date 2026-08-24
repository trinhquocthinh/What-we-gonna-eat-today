'use server'

import { refresh, revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { finalizeSession } from '@/features/meal/application/finalize-session'
import { saveFinalMealDraft } from '@/features/meal/application/save-final-meal-draft'
import { drizzleMealRepository } from '@/features/meal/infrastructure/drizzle-meal-repository'
import type { FinalizeFormState } from '@/features/meal/presentation/components/finalize-meal-screen'
import { ruleShortfallPhrase } from '@/features/rule/presentation/components/rule-sentence'
import { drizzleRuleRepository } from '@/features/rule/infrastructure/drizzle-rule-repository'
import type { SystemTag } from '@/shared/domain/system-tag'
import type { Failure } from '@/shared/errors'

function toVietnameseMessage(error: Failure): string {
  switch (error.code) {
    case 'ERR_EMPTY_FINAL_MEAL':
      return 'Chọn ít nhất một món trước đã.'
    case 'ERR_REQUIRED_RULE_FAILED': {
      const shortfalls = error.details?.shortfalls as
        readonly { systemTag: SystemTag; missing: number }[] | undefined
      if (shortfalls && shortfalls.length > 0) {
        const missingText = shortfalls.map((s) => ruleShortfallPhrase(s)).join(', ')
        return `Còn thiếu ${missingText}.`
      }
      return 'Chưa đạt đủ các quy định mâm cơm.'
    }
    case 'ERR_DISH_NOT_IN_POOL':
      return 'Có món vừa bị gỡ khỏi nhóm. Chọn lại giúp mình.'
    case 'ERR_SESSION_NOT_ACTIVE':
      return 'Bữa này chốt rồi.'
    case 'ERR_NOT_SESSION_CREATOR':
      return 'Chỉ người mở phiên mới chốt được bữa.'
    default:
      return 'Không chốt được bữa. Thử lại giúp mình.'
  }
}

/**
 * MỘT action, phân nhánh theo `intent` — cùng khuôn `addDishAction` (E2-S4).
 * v1.0 chỉ có `finalize`; `save` để dành cho lúc cần giữ nháp qua reload
 * (Guide §1.5).
 *
 * Lưu nháp RỒI chốt trong cùng một lần gọi: `finalizeSession` đọc nháp từ DB
 * (SPEC-016 bước 3), nên nháp phải có mặt trước. Hai lệnh, hai giao dịch —
 * KHÔNG cần nguyên tử: nháp là dữ liệu người dùng ghi đè thoải mái, còn phần
 * cần nguyên tử (FINALIZED + eating_history) nằm trọn trong `commitFinalize`.
 */
export async function finalizeMealAction(
  sessionId: string,
  _previousState: FinalizeFormState,
  formData: FormData,
): Promise<FinalizeFormState> {
  const user = await getCurrentUser()
  if (user === null) redirect('/')

  const dishIds = formData.getAll('dishId').map(String)

  const saved = await saveFinalMealDraft(
    { meal: drizzleMealRepository },
    { sessionId, userId: user.id, dishIds },
  )
  if (!saved.ok) {
    return { error: toVietnameseMessage(saved.error), finalized: false }
  }

  const finalized = await finalizeSession(
    { meal: drizzleMealRepository, rules: drizzleRuleRepository },
    { sessionId, userId: user.id },
  )
  if (!finalized.ok) {
    return { error: toVietnameseMessage(finalized.error), finalized: false }
  }

  revalidatePath(`/sessions/${sessionId}`)
  refresh()
  return { error: null, finalized: true }
}
