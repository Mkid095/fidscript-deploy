export class SendEmailDto {
  /** Sender address. Must be a verified sender identity or mailbox. */
  from?: string;
  /** SMTP password (if auth required — normally not needed with API keys) */
  smtpPassword?: string;
  /** API key ID (from email.apiKeys) for rate limit tracking */
  apiKeyId?: string;
  /** Recipient address */
  to!: string;
  /** Subject line */
  subject!: string;
  /** Plain-text body */
  text?: string;
  /** HTML body */
  html?: string;
  /** Reply-To address */
  replyTo?: string;
  /** Attachments */
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}
