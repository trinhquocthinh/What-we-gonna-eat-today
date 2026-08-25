import type { GroupRuleRecord, RuleRepository } from './rule-repository'

/** SPEC-021 phía đọc. Không guard Admin: MỌI Member đều được XEM quy định của
 *  nhóm mình (BR-010 chỉ hạn chế quyền SỬA). Trang `/rules` ẩn nút sửa dựa
 *  trên `canEdit`, xem §9. */
export async function listGroupRules(
  deps: { readonly rules: RuleRepository },
  groupId: string,
): Promise<GroupRuleRecord[]> {
  return deps.rules.listGroupRules(groupId)
}
