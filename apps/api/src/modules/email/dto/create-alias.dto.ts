export class CreateAliasDto {
  /** Domain this alias belongs to */
  domain!: string;
  /** Local part, e.g. "sales" (becomes sales@example.com) */
  localPart!: string;
  /**
   * Forwarding targets. All are processed in order.
   * [{ type: "mailbox", mailboxId: "uuid" }]
   * [{ type: "external", address: "user@gmail.com" }]
   * [{ type: "webhook", url: "https://..." }]
   */
  targets!: Array<{
    type: 'mailbox' | 'external' | 'webhook';
    mailboxId?: string;
    address?: string;
    url?: string;
  }>;
  description?: string;
}
