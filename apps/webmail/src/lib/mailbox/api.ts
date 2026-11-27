/**
 * The mailbox client's API layer.
 *
 * Every call goes to the existing REST routes the webmail already ships —
 * the screens never touch Stalwart themselves. Each helper returns the
 * route's exact JSON shape and throws `MailboxApiError` (with the route's
 * own message) on a non-OK answer, so a screen can show one honest error
 * note for any of them.
 */

import type {
  Identity,
  Mailbox,
  MessageDetail,
  MessageSummary,
} from './types';

export class MailboxApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'MailboxApiError';
    this.status = status;
  }
}

async function request<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new MailboxApiError(0, 'The mail server is out of reach.');
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new MailboxApiError(res.status, body.error ?? `The server answered ${res.status}.`);
  }
  return body as T;
}

// ── Messages ──────────────────────────────────────────────────────────

export interface QueryParams {
  /** A mailbox id, or 'all'. */
  mailbox?: string;
  limit?: number;
  position?: number;
}

export interface QueryResult {
  messages: MessageSummary[];
  nextPosition: number | null;
  queryState: string | null;
}

/** GET /api/mail/query — one window of a folder's messages. */
export function queryMessages(params: QueryParams): Promise<QueryResult> {
  const search = new URLSearchParams();
  if (params.mailbox) search.set('mailbox', params.mailbox);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.position !== undefined) search.set('position', String(params.position));
  return request<QueryResult>(`/api/mail/query?${search.toString()}`);
}

export type MessageAction =
  | { action: 'flags'; ids: string[]; flags: { seen?: boolean; flagged?: boolean; junk?: boolean } }
  | { action: 'move'; ids: string[]; toMailbox: string }
  | { action: 'destroy'; ids: string[] };

/** POST /api/mail/actions — bulk flags, moves and destroys. */
export function messageAction(body: MessageAction): Promise<{ ok: true }> {
  return request('/api/mail/actions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** GET /api/mail/[id] — one message with bodies and parts. */
export function getMessage(id: string): Promise<{ message: MessageDetail }> {
  return request(`/api/mail/${encodeURIComponent(id)}`);
}

/** The part's bytes, fetched by the screen (it makes a blob URL for preview). */
export async function fetchPart(id: string, partId: string): Promise<Blob> {
  const res = await fetch(`/api/mail/${encodeURIComponent(id)}/parts/${encodeURIComponent(partId)}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new MailboxApiError(res.status, body.error ?? 'The attachment could not be read.');
  }
  return res.blob();
}

/** /api/mail/[id]/parts/[partId] as a URL, for plain downloads. */
export function partUrl(id: string, partId: string): string {
  return `/api/mail/${encodeURIComponent(id)}/parts/${encodeURIComponent(partId)}`;
}

// ── Mailboxes ─────────────────────────────────────────────────────────

/** GET /api/mailboxes — the account's folders. */
export function listMailboxes(): Promise<{ mailboxes: Mailbox[] }> {
  return request('/api/mailboxes');
}

/** POST /api/mailboxes { op: 'create', name } → { id }. */
export function createFolder(name: string): Promise<{ id: string }> {
  return request('/api/mailboxes', {
    method: 'POST',
    body: JSON.stringify({ op: 'create', name }),
  });
}

/** POST /api/mailboxes { op: 'rename', id, name }. */
export function renameFolder(id: string, name: string): Promise<{ ok: true }> {
  return request('/api/mailboxes', {
    method: 'POST',
    body: JSON.stringify({ op: 'rename', id, name }),
  });
}

/** POST /api/mailboxes { op: 'destroy', id }. */
export function destroyFolder(id: string): Promise<{ ok: true }> {
  return request('/api/mailboxes', {
    method: 'POST',
    body: JSON.stringify({ op: 'destroy', id }),
  });
}

// ── Compose ───────────────────────────────────────────────────────────

export interface ComposeAttachment {
  blobId: string;
  filename: string;
  contentType: string;
  size: number;
}

/** POST /api/compose { op: 'upload' } — one file in for one blob out. */
export function uploadAttachment(
  file: File,
): Promise<{ attachments: ComposeAttachment[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
      request<{ attachments: ComposeAttachment[] }>('/api/compose', {
        method: 'POST',
        body: JSON.stringify({
          op: 'upload',
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          dataBase64: base64,
        }),
      }).then(resolve, reject);
    };
    reader.onerror = () => reject(new MailboxApiError(0, `Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export interface SendPayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  text?: string;
  html?: string;
  identityId?: string | null;
  attachments?: ComposeAttachment[];
}

/** POST /api/compose { op: 'send' }. */
export function sendMail(
  payload: SendPayload,
): Promise<{ messageId: string; suppressed: string[] }> {
  return request('/api/compose', {
    method: 'POST',
    body: JSON.stringify({ op: 'send', ...payload }),
  });
}

export interface DraftPayload {
  draftId?: string;
  to?: string[];
  subject?: string;
  text?: string;
  html?: string;
}

/** POST /api/compose { op: 'draft' }. */
export function saveDraft(payload: DraftPayload): Promise<{ draftId: string }> {
  return request('/api/compose', {
    method: 'POST',
    body: JSON.stringify({ op: 'draft', ...payload }),
  });
}

// ── Settings (for the compose From + the workspace pages) ─────────────
export interface SettingsShape {
  identities: Identity[];
  vacation: {
    enabled: boolean;
    subject: string;
    text: string;
    startDate: string | null;
    endDate: string | null;
    interval: string | null;
  } | null;
  filters: { script: string; active: boolean } | null;
}

/** GET /api/settings — identities, vacation and the sieve script. */
export function getSettings(): Promise<SettingsShape> {
  return request('/api/settings');
}

// ── Folder colours (the app's own paint; Stalwart keeps the folder) ────

export interface MailboxColor {
  mailboxId: string;
  color: string;
}

/** GET /api/mailbox-colors — this account's folder paints. */
export function listMailboxColors(): Promise<{ colors: MailboxColor[] }> {
  return request('/api/mailbox-colors');
}

/** POST /api/mailbox-colors — paint a folder; `null` clears the paint. */
export function setMailboxColor(
  mailboxId: string,
  color: string | null,
): Promise<{ ok: true }> {
  return request('/api/mailbox-colors', {
    method: 'POST',
    body: JSON.stringify({ mailboxId, color }),
  });
}

// ── Filter rules (structured; the app compiles them into the sieve) ────

export type FilterRuleMatchKey = 'from' | 'subject';
export type FilterRuleAction = 'move' | 'forward' | 'junk';

export interface FilterRule {
  id?: string;
  matchKey: FilterRuleMatchKey;
  matchValue: string;
  action: FilterRuleAction;
  /** move → the mailbox id; forward → the address; junk → ''. */
  target: string;
}

/** GET /api/filter-rules — this account's rules, in rail order. */
export function listFilterRules(): Promise<{ rules: FilterRule[] }> {
  return request('/api/filter-rules');
}

/** POST /api/filter-rules — replace the set and write the generated script. */
export function saveFilterRules(
  rules: FilterRule[],
  active?: boolean,
): Promise<{ ok: true; active: boolean; script: string }> {
  return request('/api/filter-rules', {
    method: 'POST',
    body: JSON.stringify({ rules, ...(active !== undefined ? { active } : {}) }),
  });
}

// ── Mail clients (IMAP/SMTP for external apps) ────────────────────────

export interface MailClientConfig {
  imap: { host: string; port: number; security: string; username: string };
  smtp: {
    host: string;
    port: number;
    security: string;
    auth: boolean;
    username: string;
  };
  passwordNote: string;
}

/** GET /api/mail-clients — the account's settings for Outlook & co. */
export function getMailClients(): Promise<MailClientConfig> {
  return request('/api/mail-clients');
}
