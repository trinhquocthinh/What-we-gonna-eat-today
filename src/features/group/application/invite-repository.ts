export type InviteSummary = {
  readonly id: string
  readonly expiresAt: Date
}

export type NewInvite = {
  readonly groupId: string
  readonly tokenHash: string
  readonly expiresAt: Date
}

export type InviteLookup = {
  readonly id: string
  readonly groupId: string
  readonly expiresAt: Date
  readonly usedAt: Date | null
}

export type ConsumeInviteInput = {
  readonly inviteId: string
  readonly groupId: string
  readonly userId: string
}

export interface InviteRepository {
  create(input: NewInvite): Promise<InviteSummary>
  findByTokenHash(tokenHash: string): Promise<InviteLookup | null>
  consumeAndAddMember(input: ConsumeInviteInput): Promise<{ readonly consumed: boolean }>
}
