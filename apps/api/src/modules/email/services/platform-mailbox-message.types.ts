/**
 * Shared types for the platform-mailbox message services.
 *
 * Platform messages live inside the platform's own mailboxes (alert@, noreply@,
 * postmaster@, plus any custom mailbox on the PLATFORM_DOMAIN). They are
 * stored in Stalwart (JMAP), not in the platform DB.
 *
 * `ProjectMessage` (in `email.messages`) is a separate concern — these are
 * platform-internal mail for operator visibility, not customer-facing data.
 */
export type PlatformFolder = 'inbox' | 'sent' | 'drafts' | 'trash' | 'junk' | 'archive';

export interface PlatformMessage {
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
  folder: PlatformFolder;
  hasAttachments: boolean;
  attachmentCount: number;
  sizeBytes: number;
  /** Attachment metadata — populated on the message detail view (get()). */
  attachments?: JmapAttachment[];
}

/**
 * JMAP Email Body Part (RFC 8621 §4.1.3) — describes a single attachment on
 * a message. The `blobId` is the key to feed into Blob/get to download bytes.
 */
export interface JmapAttachment {
  blobId: string;
  type: string;
  name?: string;
  size: number;
  charset?: string;
  cid?: string;
  disposition?: string;
  partId?: string;
}
