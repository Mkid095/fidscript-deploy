export class CreateEmailApiKeyDto {
  /** Human-readable name, e.g. "Production", "Staging" */
  name!: string;
  /**
   * Scopes controlling what this key can do.
   * Defaults to ["email.send"] — only email sending.
   * Valid scopes: email.send | email.domains.read | email.mailboxes.read | email.messages.read | email.identities.read
   */
  scopes?: string[];
  /** Daily sending limit (default 1000) */
  dailyLimit?: number;
  /** Monthly sending limit (default 30000) */
  monthlyLimit?: number;
}
