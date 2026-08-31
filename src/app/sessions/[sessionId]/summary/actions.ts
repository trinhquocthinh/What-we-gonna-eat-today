'use server'

import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { finalizeSession } from '@/features/meal/application/finalize-session'
import { saveFinalMealDraft } from '@/features/meal/application/save-final-meal-draft'
import { drizzleMealRepository } from '@/features/meal/infrastructure/drizzle-meal-repository'
import type { FinalizeFormState } from '@/features/meal/presentation/components/finalize-meal-screen'
import { drizzlePreferenceRepository } from '@/features/preference/infrastructure/drizzle-preference-repository'
import { drizzleRuleRepository } from '@/features/rule/infrastructure/drizzle-rule-repository'
import { messageFor } from '@/shared/errors'

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
    return { error: messageFor(saved.error) }
  }

  const finalized = await finalizeSession(
    {
      meal: drizzleMealRepository,
      rules: drizzleRuleRepository,
      preferences: drizzlePreferenceRepository,
    },
    { sessionId, userId: user.id },
  )
  if (!finalized.ok) {
    return { error: messageFor(finalized.error) }
  }

  // Session vừa chuyển FINALIZED — trang này (`findSessionForRanking` chỉ
  // nhận `ACTIVE`) sẽ 404 nếu còn ở lại. Điều hướng thẳng sang mâm cơm đã
  // chốt thay vì `refresh()` tại chỗ.
  redirect(`/sessions/${sessionId}/meal`)
}
