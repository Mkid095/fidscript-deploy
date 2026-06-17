export class UpdateAliasDto {
  targets?: Array<{ type: 'mailbox' | 'external'; mailboxId?: string; address?: string }>;
  isActive?: boolean;
  description?: string;
}
