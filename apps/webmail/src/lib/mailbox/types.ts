/**
 * The mailbox client's shared types.
 *
 * The wire shapes come straight from the Stalwart layer (re-exported so a
 * screen has one import); the rest are the client's own state: which folder
 * or page is active, which message is open, the quick filter, and the
 * composer's payload.
 */

export type {
  Person,
  PartDescriptor,
  MessageSummary,
  MessageDetail,
  Mailbox,
  Identity,
} from '@/lib/stalwart/mail';

export type WorkspacePage = 'settings' | 'templates' | 'contacts';

/** What the rail is showing: a folder, or one of the workspace pages
    that live inside the app instead of on their own route. */
export type ActiveNav =
  | { kind: 'folder'; folder: string }
  | { kind: 'page'; page: WorkspacePage };

export type QuickFilter = 'all' | 'unread' | 'starred' | 'files';

/** What the composer opens with: nothing, a saved draft, or a reply/forward. */
export interface ComposeInitial {
  /** The JMAP email id being edited (drafts). */
  draftId?: string;
  mode?: 'new' | 'reply' | 'reply-all' | 'forward' | 'draft';
  to?: string;
  cc?: string;
  subject?: string;
  text?: string;
  /** An HTML body the composer should send alongside the text (templates). */
  html?: string;
  /** The template the HTML came from, shown as a note in the composer. */
  templateName?: string;
  /** A draft's existing attachments, keyed by blob. */
  attachments?: Array<{
    blobId: string;
    filename: string;
    contentType: string;
    size: number;
  }>;
}
