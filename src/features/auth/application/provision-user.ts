import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { AuthenticatedUser, RawProviderProfile } from '../domain/provider-identity'
import { readProviderProfile } from '../domain/provider-identity'
import type { UserRepository } from './user-repository'

export type ProvisionUserDeps = {
  readonly users: UserRepository
}

/**
 * SPEC-001 — tìm hoặc tạo User từ profile của provider.
 *
 * Cố ý KHÔNG cập nhật `email` / `display_name` ở những lần đăng nhập sau:
 * SPEC-001 không yêu cầu, và đồng bộ lại là một quyết định riêng có hệ quả với
 * dữ liệu đã có. Nếu muốn, mở decision mới chứ đừng lặng lẽ thêm vào đây.
 *
 * Không `try/catch` quanh port: lỗi hạ tầng để nổi lên cho tầng ngoài xử lý,
 * bảng mã lỗi SDD §2.5 không có mã nào cho "lỗi không xác định".
 */
export async function provisionUser(
  deps: ProvisionUserDeps,
  raw: RawProviderProfile,
): Promise<Result<AuthenticatedUser, Failure>> {
  const profile = readProviderProfile(raw)

  if (profile === null) {
    return err(
      failure('ERR_VALIDATION', {
        reason: 'provider, provider_subject hoặc email thiếu trong callback',
      }),
    )
  }

  const existing = await deps.users.findByProviderIdentity({
    provider: profile.provider,
    providerSubject: profile.providerSubject,
  })

  if (existing !== null) {
    return ok(existing)
  }

  return ok(await deps.users.createFromProvider(profile))
}
