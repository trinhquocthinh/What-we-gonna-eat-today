import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { GroupDraftError } from '../domain/group-draft'
import { readGroupDraft } from '../domain/group-draft'
import type { GroupRepository, GroupSummary } from './group-repository'

export type CreateGroupDeps = {
  readonly groups: GroupRepository
}

export type CreateGroupInput = {
  readonly creatorUserId: string
  readonly name: string
  readonly timezone: string
}

/** `field` là thứ presentation cần để đặt lỗi NGAY DƯỚI đúng input
 *  (Design Criteria: lỗi nằm cạnh thứ gây ra lỗi, không dùng dialog). */
const FAILURE_DETAILS: Record<GroupDraftError, { field: string; reason: string }> = {
  NAME_EMPTY: { field: 'groupName', reason: 'Tên nhóm không được để trống' },
  NAME_TOO_LONG: { field: 'groupName', reason: 'Tên nhóm tối đa 60 ký tự' },
  TIMEZONE_INVALID: { field: 'timezone', reason: 'Múi giờ không phải IANA hợp lệ' },
}

/**
 * SPEC-002 — Tạo Group. Người tạo trở thành Member kèm role ADMIN.
 *
 * Validation chạy TRƯỚC khi chạm repository, nên TC-009/TC-010 không ghi gì vào
 * database — đó chính là điều hai test đó khẳng định.
 */
export async function createGroup(
  deps: CreateGroupDeps,
  input: CreateGroupInput,
): Promise<Result<GroupSummary, Failure>> {
  const draft = readGroupDraft({ name: input.name, timezone: input.timezone })

  if (!draft.ok) {
    return err(failure('ERR_VALIDATION', FAILURE_DETAILS[draft.error]))
  }

  const created = await deps.groups.createWithAdmin({
    name: draft.value.name,
    timezone: draft.value.timezone,
    creatorUserId: input.creatorUserId,
  })

  return ok(created)
}
