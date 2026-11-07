/**
 * Email message types — shared across API, SDK, and MCP contracts.
 */

// ── Enums (must match prisma/schema.prisma) ─────────────────────────────────

export type EmailStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'SENT'
  | 'DELIVERED'
  | 'OPENED'
  | 'CLICKED'
  | 'BOUNCED'
  | 'SOFT_BOUNCE'
  | 'DEAD'
  | 'FAILED'
  | 'RECEIVED';

export type EmailFailureType =
  | 'NONE'
  | 'SMTP_TIMEOUT'
  | 'SMTP_AUTH_FAILURE'
  | 'RECIPIENT_REJECTED'
  | 'SPAM_REJECTED'
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR'
  | 'SYSTEM_ERROR';

// ── Email Message ────────────────────────────────────────────────────────────

/** A sent/received email message row in the project mailbox. */
export interface EmailMessage {
  id: string;
  mailboxId: string | null;
  senderIdentityId: string | null;
  projectId: string;
  from: string;
  to: string;
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  sizeBytes: number | string; // BigInt serialized as string in JSON
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  spamScore: number | null;
  status: EmailStatus;
  error: string | null;
  failureType?: EmailFailureType | null;
  jmapMessageId?: string | null;
  receivedAt?: string | null;
  lastAttemptAt?: string | null;
  nextRetryAt?: string | null;
  retryCount?: number;
  createdAt: string;
}

/** A message row inside a project mailbox — shape returned by MAIL-25/26/27/28/29. */
export interface MailboxMessage {
  id: string;
  mailboxId: string | null;
  senderIdentityId: string | null;
  projectId: string;
  from: string;
  to: string;
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  sizeBytes: number | string;
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  spamScore: number | null;
  status: string;
  error: string | null;
  createdAt: string;
}

/** Individual delivery attempt record — append-only audit log. */
export interface EmailDeliveryAttempt {
  id: string;
  messageId: string;
  attempt: number;
  provider: string;
  status: 'sent' | 'bounced' | 'soft_bounce' | 'failed';
  response?: string | null;
  durationMs?: number | null;
  failureType?: EmailFailureType | null;
  createdAt: string;
}

/** Full message delivery status with attempt history. */
export interface EmailMessageStatus {
  id: string;
  projectId: string;
  from: string;
  to: string;
  subject: string;
  status: EmailStatus;
  failureType?: EmailFailureType | null;
  retryCount: number;
  lastAttemptAt?: string | null;
  nextRetryAt?: string | null;
  createdAt: string;
  attempts: EmailDeliveryAttempt[];
}

// ── Send result ──────────────────────────────────────────────────────────────

/** API response from POST /api/v1/projects/:id/email/send */
export interface EmailSendResult {
  messageId: string;
  accepted: string[];
  status: EmailStatus;
  error?: string;
}

// ── Mailbox / Alias ──────────────────────────────────────────────────────────

export interface Mailbox {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface EmailAlias {
  id: string;
  alias: string;
  forwardsTo: string[];
  createdAt: string;
}

/** An email domain registered under a project — distinct from project deployment domains. */
export interface EmailDomain {
  id: string;
  projectId: string;
  domain: string;
  status: string;
  dkimVerified: boolean;
  spfVerified: boolean;
  dmarcVerified: boolean;
  mxVerified: boolean;
  dkimSelector?: string;
  dkimPublicKey?: string;
  catchAllTarget?: string;
  verifiedAt?: string;
  createdAt: string;
}

// ── Platform-admin mailbox types ─────────────────────────────────────────────

export interface PlatformMailboxMessage {
  id: string;
  mailbox: string;
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  subject: string;
  preview: string;
  receivedAt: string;
  sentAt?: string;
  isRead: boolean;
  isStarred: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'junk' | 'archive';
  hasAttachments: boolean;
  attachmentCount: number;
  sizeBytes: number;
  bodyHtml?: string;
  bodyText?: string;
}

export type StorageBackend = 'internal' | 'telegram' | 'cloudinary';

export interface PlatformMailboxSummary {
  id: string;
  name: string;
  email: string;
  domainId: string;
  quotaBytes: number | null;
}

export interface PlatformMailboxesResponse {
  domain: string;
  domainId: string;
  mailboxes: PlatformMailboxSummary[];
}

export interface CreatePlatformMailboxResponse {
  mailbox: PlatformMailboxSummary;
  password: string;
  message: string;
}

export interface ListPlatformMessagesResponse {
  messages: PlatformMailboxMessage[];
  total: number;
}

export interface AdminSendMailResponse {
  status: string;
  messageId: string;
  from: string;
  to: string;
  attachmentsStored: number;
}

export interface AdminAttachmentConfig {
  provider: StorageBackend;
  isActive: boolean;
  hasCredentials: boolean;
}
