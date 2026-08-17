import type {
  AuthenticatedUser,
  ProviderIdentity,
  ProviderProfile,
} from '../domain/provider-identity'

/**
 * Tech Spec §2.2 — `application/` định nghĩa port, `infrastructure/` hiện thực.
 * Test tầng A (TC-001→003) mock cổng này bằng object thuần.
 */
export interface UserRepository {
  findByProviderIdentity(identity: ProviderIdentity): Promise<AuthenticatedUser | null>

  /**
   * Idempotent theo `(provider, provider_subject)`: gọi lại với cùng khoá phải
   * trả về đúng bản ghi cũ, không tạo bản trùng và không để unique violation
   * nổi ra ngoài. Đây là nơi race giữa hai lần đăng nhập đầu tiên được xử lý.
   */
  createFromProvider(profile: ProviderProfile): Promise<AuthenticatedUser>
}
