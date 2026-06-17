export class CreateMailboxDto {
  /** Domain name this mailbox belongs to, e.g. "example.com" */
  domain!: string;
  /** Local part of the address, e.g. "john" (becomes john@example.com) */
  localPart!: string;
  /** Plain-text password — shown only once, never stored in plaintext */
  password!: string;
  /** Display name */
  name?: string;
  /** Quota in MB (default 1024) */
  quotaMb?: number;
}
