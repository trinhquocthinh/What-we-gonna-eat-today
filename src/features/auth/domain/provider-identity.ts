/**
 * SPEC-001 — Đăng nhập.
 *
 * Khoá định danh là `provider + provider_subject`, KHÔNG phải email: email đổi
 * được và hai tài khoản provider khác nhau có thể mang cùng email (TC-003).
 *
 * Hàm thuần: không React, không Drizzle, không `process.env`. Mọi thứ cần biết
 * đều đi vào qua tham số, nên test không phải mock gì.
 */

export type ProviderIdentity = {
  readonly provider: string
  readonly providerSubject: string
}

export type ProviderProfile = ProviderIdentity & {
  readonly email: string
  readonly displayName: string
}

/** Hình dạng User sau khi đã đăng nhập. `id` là UUID v7 của bảng `users`. */
export type AuthenticatedUser = {
  readonly id: string
  readonly displayName: string
  readonly email: string
}

/** Dữ liệu thô từ provider — mọi trường đều có thể thiếu hoặc `null`. */
export type RawProviderProfile = {
  readonly provider?: string | null
  readonly providerSubject?: string | null
  readonly email?: string | null
  readonly displayName?: string | null
}

function clean(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

/**
 * Đọc profile thô thành `ProviderProfile`, hoặc `null` nếu thiếu thứ bắt buộc.
 *
 * `displayName` rỗng thì dùng email: cột `display_name` là `notNull`, và chặn
 * đăng nhập chỉ vì provider không trả tên là phản ứng nặng tay hơn vấn đề.
 */
export function readProviderProfile(raw: RawProviderProfile): ProviderProfile | null {
  const provider = clean(raw.provider)
  const providerSubject = clean(raw.providerSubject)
  const email = clean(raw.email).toLowerCase()

  if (provider === '' || providerSubject === '' || email === '') {
    return null
  }

  const displayName = clean(raw.displayName)

  return {
    provider,
    providerSubject,
    email,
    displayName: displayName === '' ? email : displayName,
  }
}
