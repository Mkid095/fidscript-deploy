export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string;
  from?: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailProvider {
  send(options: SendEmailOptions): Promise<{ messageId: string; accepted: string[]; rejected: string[] }>;
  sendBulk?(options: SendEmailOptions[]): Promise<{ messageId: string; accepted: string[]; rejected: string[] }[]>;
  getQuota?(mailbox: string): Promise<{ used: number; limit: number }>;
  verifyDomain?(domain: string): Promise<{ dkim: boolean; spf: boolean; dmarc: boolean }>;
  getDeliveryStatus?(messageId: string): Promise<{ status: string; delivered?: boolean; bounced?: boolean }>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');