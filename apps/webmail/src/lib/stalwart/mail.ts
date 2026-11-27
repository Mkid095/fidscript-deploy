/**
 * The mailbox's own operations, over standard JMAP, server-side.
 *
 * Every function here takes the visit's credential and talks to Stalwart as
 * that user: Stalwart scopes the data, so nothing a user is not allowed to
 * see can come back. These are the calls the API routes run; the browser
 * never holds a JMAP credential.
 */
import { resolveAccountId, StalwartError, userClient } from '@/lib/stalwart/jmap';

export type Credential = { user: string; pass: string };

/** A person as Stalwart stores one. */
export interface Person {
  name: string | null;
  email: string;
}

/**
 * A body part, as Stalwart stores it. The content is a blob; the part
 * descriptor says what it is. The whole message is also one blob.
 */
export interface PartDescriptor {
  partId?: string;
  blobId: string;
  size: number;
  name: string | null;
  type: string;
  disposition: string | null;
}

export interface MessageSummary {
  id: string;
  from: Person | null;
  to: Person[];
  cc: Person[];
  subject: string;
  receivedAt: string;
  seen: boolean;
  flagged: boolean;
  junk: boolean;
  hasAttachment: boolean;
  preview: string;
  mailboxIds: string[];
  size: number;
}

export interface MessageDetail extends MessageSummary {
  html: string | null;
  text: string | null;
  parts: Array<PartDescriptor & { isAttachment: boolean }>;
}

interface StalwartMessage {
  id: string;
  from: Person[] | Person | null;
  to: Person[];
  cc: Person[];
  subject: string;
  receivedAt: string;
  keywords: Record<string, boolean>;
  hasAttachment?: boolean;
  preview: string | null;
  mailboxIds: Record<string, boolean>;
  size: number | null;
  textBody: PartDescriptor[];
  htmlBody: PartDescriptor[];
  attachments: PartDescriptor[];
}

function personList(value: Person[] | Person | null | undefined): Person[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function summarize(row: StalwartMessage): MessageSummary {
  const keywords = row.keywords ?? {};
  const froms = personList(row.from);
  return {
    id: row.id,
    from: froms[0] ?? null,
    to: personList(row.to),
    cc: personList(row.cc),
    subject: row.subject ?? '',
    receivedAt: row.receivedAt,
    seen: Boolean(keywords.$seen),
    flagged: Boolean(keywords.$flagged),
    junk: Boolean(keywords.$junk),
    hasAttachment:
      row.hasAttachment !== undefined
        ? Boolean(row.hasAttachment)
        : (row.attachments ?? []).length > 0,
    preview: row.preview ?? '',
    mailboxIds: Object.keys(row.mailboxIds ?? {}).filter((id) => row.mailboxIds[id]),
    size: row.size ?? 0,
  };
}

/**
 * List a mailbox's messages, newest first.
 *
 * `mailboxId` is a mailbox id, or "all" for every mailbox (the starred
 * view and the global list). The window is a plain `inMailbox` slice:
 * this Stalwart build refuses the flag filter keys and answers JSearch
 * text as if it were absent, so the app narrows a view — unread,
 * starred, files, free text — itself, over the window this returns.
 */
export async function queryMessages(
  cred: Credential,
  mailboxId: string,
  options: { limit?: number; position?: number } = {},
): Promise<{ messages: MessageSummary[]; nextPosition: number | null; queryState: string | null }> {
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  const scope = mailboxId === 'all' ? null : mailboxId;

  // This Stalwart build answers only `inMailbox` in the filter object —
  // the flag keys and the JSearch text get refused ("unsupportedFilter",
  // or matched as if absent) — so flag and text narrowing of a view
  // happens in the app, over the window this window returns.
  const filter: Record<string, unknown> = {};
  if (scope) filter.inMailbox = scope;
  const queryArgs: Record<string, unknown> = {
    accountId: accountId,
    ...(Object.keys(filter).length ? { filter } : {}),
  };
  queryArgs.sort = [{ property: 'receivedAt', isAscending: false }];
  queryArgs.limit = options.limit ?? 50;
  if (options.position) queryArgs.position = options.position;

  const query = await client.one<{
    ids: string[];
    position?: number;
    queryState?: string;
  }>('Email/query', queryArgs);
  if (!query.ids?.length) {
    return { messages: [], nextPosition: null, queryState: query.queryState ?? null };
  }
  const got = await client.one<{ list: StalwartMessage[] }>(
    'Email/get',
    {
      accountId: accountId,
      ids: query.ids,
      properties: [
        'id', 'from', 'to', 'cc', 'subject', 'receivedAt', 'keywords',
        'hasAttachment', 'preview', 'mailboxIds', 'size',
      ],
    },
  );
  const messages = (got.list ?? []).map(summarize);
  return {
    messages,
    nextPosition: query.position ?? null,
    queryState: query.queryState ?? null,
  };
}

/** One message, with its bodies and parts, read as the owner. */
export async function getMessage(
  cred: Credential,
  messageId: string,
): Promise<MessageDetail | null> {
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  const got = await client.one<{ list: StalwartMessage[]; notFound: string[] }>(
    'Email/get',
    {
      accountId,
      ids: [messageId],
      properties: [
        'id', 'from', 'to', 'cc', 'subject', 'receivedAt', 'keywords',
        'hasAttachment', 'preview', 'mailboxIds', 'size',
        'textBody', 'htmlBody', 'attachments',
      ],
    },
  );
  const row = (got.list ?? [])[0];
  if (!row) return null;
  const summary = summarize(row);

  // The bodies are blobs; pull the readable one. An HTML body wins; the
  // text body is the fallback. Each is the message's own text, so read it
  // over the download endpoint.
  let html: string | null = null;
  let text: string | null = null;
  const htmlPart = (row.htmlBody ?? [])[0];
  const textPart = (row.textBody ?? [])[0];
  if (htmlPart) html = await blobText(client, accountId, htmlPart.blobId);
  if (!html && textPart) text = await blobText(client, accountId, textPart.blobId);
  if (!html && textPart && (!text || !text.trim())) text = summary.preview;

  const parts = [
    ...[...(row.textBody ?? []), ...(row.htmlBody ?? [])].map((part) => ({
      ...part,
      isAttachment: false,
    })),
    ...(row.attachments ?? []).map((part) => ({ ...part, isAttachment: true })),
  ];

  return {
    ...summary,
    html,
    text,
    parts,
  };
}

/** Read a blob as text (the readable bodies). */
async function blobText(
  client: ReturnType<typeof userClient>,
  accountId: string,
  blobId: string,
): Promise<string | null> {
  const raw = await blobBytes(client, accountId, blobId);
  return raw ? new TextDecoder().decode(raw) : null;
}

/** Read a blob's raw bytes over Stalwart's download endpoint. */
async function blobBytes(
  client: ReturnType<typeof userClient>,
  accountId: string,
  blobId: string,
): Promise<ArrayBuffer | null> {
  const url = `${client.baseURL}/jmap/download/${accountId}/${blobId}/part`;
  const headers: Record<string, string> = {};
  if (client.authHeader) headers.Authorization = client.authHeader;
  const response = await fetch(url, { headers }).catch(() => null);
  if (!response || !response.ok) return null;
  return response.arrayBuffer();
}

/** Download one part's bytes through Stalwart's JMAP download endpoint. */
export async function downloadPart(
  cred: Credential,
  messageId: string,
  partId: string,
): Promise<{ contentType: string | null; name: string | null; data: ArrayBuffer } | null> {
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  const detail = await getMessage(cred, messageId);
  if (!detail) return null;
  // A part may be addressed by its own id or by its position among the
  // returned parts.
  const part =
    detail.parts.find((p) => p.partId === partId) ??
    detail.parts[Number(partId)] ??
    null;
  if (!part) return null;
  const data = await blobBytes(client, accountId, part.blobId);
  if (data === null) return null;
  return {
    contentType: part.type || null,
    name: part.name,
    data,
  };
}

/** Read/unread, star, junk flags on one or more messages. */
export async function setFlags(
  cred: Credential,
  ids: string[],
  flags: { seen?: boolean; flagged?: boolean; junk?: boolean },
): Promise<void> {
  if (!ids.length) return;
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  const keywords: Record<string, boolean> = {};
  if (flags.seen !== undefined) {
    keywords.$seen = flags.seen;
    keywords.$unread = !flags.seen;
  }
  if (flags.flagged !== undefined) keywords.$flagged = flags.flagged;
  if (flags.junk !== undefined) {
    keywords.$junk = flags.junk;
    // Training is the server's job when its spam filter learns from user
    // junking; we do not pretend to train anything ourselves.
  }
  await client.one('Email/set', {
    accountId,
    update: Object.fromEntries(ids.map((id) => [id, { keywords }])),
  });
}

/**
 * Move messages into a mailbox. Each message keeps its own home: the
 * move clears only the mailboxes the message is actually in (read back
 * from Stalwart), and adds the target — so moving "the selection" works
 * whether it came from one folder or from the all-mail view.
 */
export async function moveMessages(
  cred: Credential,
  ids: string[],
  toMailboxId: string,
): Promise<void> {
  if (!ids.length) return;
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  const got = await client.one<{
    list: Array<{ id: string; mailboxIds: Record<string, boolean> }>;
  }>('Email/get', {
    accountId: accountId,
    ids,
    properties: ['id', 'mailboxIds'],
  });
  const update: Record<string, unknown> = {};
  for (const row of got.list ?? []) {
    const mailboxIds: Record<string, boolean> = {};
    for (const [mailbox, member] of Object.entries(row.mailboxIds ?? {})) {
      mailboxIds[mailbox] = false;
    }
    mailboxIds[toMailboxId] = true;
    update[row.id] = { mailboxIds };
  }
  if (Object.keys(update).length) {
    await client.one('Email/set', { accountId, update });
  }
}

/** Permanely destroy messages (used when emptying the Trash). */
export async function destroyMessages(
  cred: Credential,
  ids: string[],
): Promise<void> {
  if (!ids.length) return;
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  await client.one('Email/set', { accountId, destroy: ids });
}

/**
 * Send a message through Stalwart's submission.
 *
 * Stalwart's JMAP submission is not an inline object: the message is first
 * created (as a draft), then that message id is handed to
 * `EmailSubmission/set` to be queued and delivered, then the draft is
 * removed. The bodies and attachments travel as blobs.
 */
export async function sendMessage(
  cred: Credential,
  message: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    text?: string;
    html?: string;
    /** Already-uploaded blobs. */
    attachments?: Array<{ blobId: string; filename: string; contentType: string; size: number }>;
    /** Which identity sends; the default identity when omitted. */
    identityId?: string | null;
  },
): Promise<string> {
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  const identities = await listIdentities(cred).catch(() => []);
  const identityId =
    message.identityId ??
    (identities.find((i) => i.isDefault)?.id ?? identities[0]?.id ?? null);
  const identity = identities.find((i) => i.id === identityId) ?? null;

  // Build the body as a blob. HTML wins, plain text otherwise.
  const bodyText = message.html ?? message.text ?? '';
  const isHtml = Boolean(message.html);
  const bodyBlob = bodyText
    ? await uploadBlob(client, accountId, bodyText, isHtml ? 'text/html' : 'text/plain')
    : null;

  // Recipients are Person objects in this build. The From is set on the
  // message itself: this Stalwart build's identities carry no mailFrom,
  // and a submission without a From header is RFC-noncompliant — Gmail
  // and friends refuse it on sight (5.7.1).
  const to = message.to.map((entry) => ({ name: null, email: entry }));
  const create: Record<string, unknown> = {
    from: [{ name: identity?.name ?? null, email: identity?.email ?? cred.user }],
    to,
    ...(message.cc?.length
      ? { cc: message.cc.map((entry) => ({ name: null, email: entry })) }
      : {}),
    ...(message.bcc?.length
      ? { bcc: message.bcc.map((entry) => ({ name: null, email: entry })) }
      : {}),
    ...(message.subject ? { subject: message.subject } : {}),
    // The sent copy lives where sent mail lives: the sent folder. It is
    // what the user will find under "Sent Items" afterwards.
    mailboxIds: { [await standardMailbox(client, cred, 'sent', 'Sent Items')]: true },
  };
  if (bodyBlob) {
    // A body part is a blob reference: no partId alongside a blobId.
    create[isHtml ? 'htmlBody' : 'textBody'] = [
      {
        blobId: bodyBlob.blobId,
        size: bodyBlob.size,
        type: isHtml ? 'text/html' : 'text/plain',
        charset: 'utf-8',
      },
    ];
  }
  if (message.attachments?.length) {
    create.attachments = message.attachments.map((a) => ({
      blobId: a.blobId,
      filename: a.filename,
      type: a.contentType,
      size: a.size,
      disposition: 'attachment',
    }));
  }

  const created = await client.one<{ created: Record<string, { id: string }> }>(
    'Email/set',
    {
      accountId,
      create: { newMessage: create },
    },
  );
  const messageId = created.created?.newMessage?.id;
  if (!messageId) {
    throw new Error('Stalwart did not return the message id');
  }

  // Queue and deliver it. The submitted copy stays in the sent folder;
  // delivery runs on Stalwart's own loop.
  const submission: Record<string, unknown> = { emailId: messageId };
  if (identityId) submission.identityId = identityId;
  await client.one('EmailSubmission/set', {
    accountId,
    create: { newSubmission: submission },
  });

  return messageId;
}

/**
 * The account's standard mailbox for a role, opened on demand: a fresh
 * account has the standard set, and if it does not, this one does.
 */
/**
 * A JMAP `created` map's values are the created item, not its id. Stalwart
 * answers Mailbox/set with the mailbox object, so the bare id has to be
 * pulled off it; `createdId` copes with either a string or that object.
 */
function createdId(created: Record<string, unknown> | null | undefined): string | undefined {
  const value = created ? Object.values(created)[0] : undefined;
  if (value == null) return undefined;
  return typeof value === 'string' ? value : (value as { id?: string })?.id;
}

async function standardMailbox(
  client: ReturnType<typeof userClient>,
  cred: Credential,
  role: string,
  name: string,
): Promise<string> {
  const boxes = await listMailboxes(cred).catch(() => []);
  const box = boxes.find((candidate) => candidate.role === role);
  if (box) return box.id;
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  const created = await client.one<{ created: Record<string, unknown> }>(
    'Mailbox/set',
    {
      accountId,
      create: { newMailbox: { name, role } },
    },
  );
  const id = createdId(created.created);
  if (!id) throw new Error(`Could not find or create the ${role} mailbox`);
  return id;
}

/** Upload a text body and get its blob reference (account-scoped). */
async function uploadBlob(
  client: ReturnType<typeof userClient>,
  accountId: string,
  text: string,
  contentType: string,
): Promise<{ blobId: string; size: number }> {
  const bytes = new TextEncoder().encode(text);
  const buffer = bytes.buffer as ArrayBuffer;
  return client.upload(buffer, contentType, undefined, accountId);
}

/** Upload a binary to Stalwart; returns the blob reference. */
export async function uploadAttachment(
  cred: Credential,
  data: ArrayBuffer,
  contentType: string,
  filename: string,
): Promise<{ blobId: string; filename: string; contentType: string; size: number }> {
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  const { blobId, size } = await client.upload(
    data,
    contentType,
    filename,
    accountId,
  );
  return { blobId, filename, contentType, size };
}

/** Save a draft (create or update), Stalwart's own way. */
export async function saveDraft(
  cred: Credential,
  draft: {
    draftId?: string;
    to?: string[];
    subject?: string;
    text?: string;
    html?: string;
  },
): Promise<string> {
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  const body = draft.html ?? draft.text ?? '';
  const isHtml = Boolean(draft.html);

  if (draft.draftId) {
    const update: Record<string, unknown> = {};
    if (draft.to) update.to = draft.to.map((entry) => ({ name: null, email: entry }));
    if (draft.subject !== undefined) update.subject = draft.subject;
    if (body) {
      const blob = await uploadBlob(client, accountId, body, isHtml ? 'text/html' : 'text/plain');
      update[isHtml ? 'htmlBody' : 'textBody'] = [
        {
          blobId: blob.blobId,
          size: blob.size,
          type: isHtml ? 'text/html' : 'text/plain',
          charset: 'utf-8',
        },
      ];
    }
    await client.one('Email/set', {
      accountId,
      update: { [draft.draftId]: update },
    });
    return draft.draftId;
  }

  const create: Record<string, unknown> = {
    to: (draft.to ?? []).map((entry) => ({ name: null, email: entry })),
    mailboxIds: { [await standardMailbox(client, cred, 'drafts', 'Drafts')]: true },
  };
  if (draft.subject) create.subject = draft.subject;
  if (body) {
    const blob = await uploadBlob(client, accountId, body, isHtml ? 'text/html' : 'text/plain');
    create[isHtml ? 'htmlBody' : 'textBody'] = [
      {
        blobId: blob.blobId,
        size: blob.size,
        type: isHtml ? 'text/html' : 'text/plain',
        charset: 'utf-8',
      },
    ];
  }
  const result = await client.one<{ created: Record<string, { id: string }> }>(
    'Email/set',
    {
      accountId,
      create: { newMessage: create },
    },
  );
  const id = result.created?.newMessage?.id;
  if (!id) throw new Error('Stalwart did not return the draft id');
  return id;
}

// ── Mailboxes ─────────────────────────────────────────────────────────

export interface Mailbox {
  id: string;
  name: string;
  role: string | null;
  totalEmails: number;
  unreadEmails: number;
}

export async function listMailboxes(
  cred: Credential,
): Promise<Mailbox[]> {
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  const result = await client.one<{ list: Array<{ id: string; name: string; role: string | null; totalEmails: number; unreadEmails: number }> }>(
    'Mailbox/get',
    {
      accountId: accountId,
      ids: null,
      properties: ['id', 'name', 'role', 'totalEmails', 'unreadEmails'],
    },
  );
  return result.list ?? [];
}

export async function createMailbox(
  cred: Credential,
  name: string,
  parentId: string | null = null,
): Promise<string> {
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  const result = await client.one<{ created: Record<string, unknown> }>(
    'Mailbox/set',
    {
      accountId,
      create: { newMailbox: { name, ...(parentId ? { parentId } : {}) } },
      onBehalfOf: null,
    },
  );
  const id = createdId(result.created);
  if (!id) throw new Error('Stalwart did not return the new mailbox id');
  return id;
}

export async function renameMailbox(
  cred: Credential,
  mailboxId: string,
  name: string,
): Promise<void> {
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  await client.one('Mailbox/set', {
    accountId,
    update: { [mailboxId]: { name } },
    onBehalfOf: null,
  });
}

export async function destroyMailbox(
  cred: Credential,
  mailboxId: string,
): Promise<void> {
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  await client.one('Mailbox/set', {
    accountId,
    destroy: [mailboxId],
  });
}

// ── Identities and signatures ─────────────────────────────────────────

export interface Identity {
  id: string;
  name: string;
  email: string;
  isDefault: boolean;
  signatureHtml: string | null;
  signatureText: string | null;
}

export async function listIdentities(
  cred: Credential,
): Promise<Identity[]> {
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  const result = await client.one<{
    list: Array<{
      id: string;
      name: string;
      email: string;
      isDefault?: boolean;
      htmlSignature?: string;
      textSignature?: string;
    }>;
  }>('Identity/get', { accountId: accountId, ids: null });
  const rows = result.list ?? [];
  // Stalwart does not mark a default; the sole identity is the default.
  return rows.map((row, index) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    isDefault: rows.length === 1 ? true : Boolean(row.isDefault),
    signatureHtml: row.htmlSignature ?? '',
    signatureText: row.textSignature ?? '',
  }));
}

export async function updateIdentity(
  cred: Credential,
  identity: {
    id: string;
    name?: string;
    email?: string;
    isDefault?: boolean;
    signatureHtml?: string;
    signatureText?: string;
  },
): Promise<void> {
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  // Stalwart's writable identity fields are the two signatures.
  const update: Record<string, unknown> = {};
  if (identity.signatureHtml !== undefined) {
    update.htmlSignature = identity.signatureHtml;
  }
  if (identity.signatureText !== undefined) {
    update.textSignature = identity.signatureText;
  }
  if (!Object.keys(update).length) return;
  await client.one('Identity/set', {
    accountId,
    update: { [identity.id]: update },
  });
}

// ── Vacation responder ────────────────────────────────────────────────

/**
 * The vacation responder. Stalwart keeps it as a singleton per account,
 * with its own field names: `isEnabled`, `fromDate`/`toDate`, and the
 * reply text as a body blob.
 */
export interface VacationState {
  enabled: boolean;
  subject: string;
  text: string;
  startDate: string | null;
  endDate: string | null;
  interval: string | null;
}

export async function getVacation(cred: Credential): Promise<VacationState | null> {
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  const result = await client.one<{ list: Array<Record<string, unknown>> }>(
    'VacationResponse/get',
    { accountId: accountId, ids: null },
  );
  const row = (result.list ?? [])[0];
  if (!row) return null;
  const any = row as Record<string, unknown>;
  // The reply text is a plain string on this resource (unlike a message's
  // body, which is a blob).
  const bodyText = any.textBody ?? any.htmlBody;
  return {
    enabled: Boolean(any.isEnabled),
    subject: String(any.subject ?? ''),
    text: bodyText ? String(bodyText) : '',
    startDate: (any.fromDate as string | null) ?? null,
    endDate: (any.toDate as string | null) ?? null,
    interval: null,
  };
}

export async function setVacation(
  cred: Credential,
  state: VacationState,
): Promise<void> {
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  // This resource replaces the whole singleton on an update, so every
  // field is written each time — and its date fields take a full ISO-8601
  // or null, never a bare "YYYY-MM-DD" or an empty string.
  const update: Record<string, unknown> = {
    isEnabled: state.enabled,
    subject: state.subject ?? '',
    textBody: state.text ?? '',
    fromDate: toDateIso(state.startDate ?? '', false),
    toDate: toDateIso(state.endDate ?? '', true),
  };
  const result = await client.one<{
    notUpdated?: Record<string, { type?: string; description?: string }>;
  }>('VacationResponse/set', {
    accountId,
    update: { singleton: update },
  });
  // A refused field rides back in notUpdated on an otherwise clean answer.
  const failed = Object.values(result?.notUpdated ?? {})[0];
  if (failed) {
    throw new StalwartError(
      'VacationResponse/set',
      failed.type ?? 'rejected',
      failed.description ?? 'The auto-reply did not save.',
    );
  }
}

/**
 * The UI's date inputs hand over `YYYY-MM-DD`; this Stalwart wants ISO-8601.
 * The end of the range covers the whole day; empty means "no limit".
 */
function toDateIso(value: string, endOfDay: boolean): string | null {
  if (!value) return null;
  if (value.includes('T')) return value;
  return endOfDay ? `${value}T23:59:59Z` : `${value}T00:00:00Z`;
}

// ── Sieve filters ─────────────────────────────────────────────────────

export interface SieveScript {
  name: string;
  script: string;
  active: boolean;
}

const SIEVE_SCRIPT_NAME = 'webmail';

/**
 * The user's own filter script. Stalwart stores it as a blob (and the
 * system keeps its own "vacation" script in the same resource, which is
 * never touched here).
 */
export async function getSieveScript(cred: Credential): Promise<SieveScript | null> {
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  const result = await client.one<{
    list: Array<{ id: string; name: string; blobId: string | null; isActive: boolean }>;
  }>('SieveScript/get', { accountId: accountId, ids: null });
  const row = (result.list ?? []).find((entry) => entry.name === SIEVE_SCRIPT_NAME);
  if (!row) return null;
  let script = '';
  if (row.blobId) script = (await blobText(client, accountId, row.blobId)) ?? '';
  return { name: row.name, script, active: row.isActive };
}

export async function setSieveScript(
  cred: Credential,
  script: string,
  active: boolean,
): Promise<void> {
  const client = userClient(cred.user, cred.pass);
  const accountId = await resolveAccountId(client, cred.user, cred.pass);
  // The script content is a blob; Stalwart validates its syntax on write.
  const blob = await client.upload(
    new TextEncoder().encode(script).buffer as ArrayBuffer,
    'application/sieve',
    undefined,
    accountId,
  );
  const existing = await getSieveScript(cred);
  if (existing) {
    // The script id comes from the resource itself; re-read it, then
    // point it at the new blob.
    const result = await client.one<{
      list: Array<{ id: string; name: string }>;
    }>('SieveScript/get', { accountId, ids: null });
    const id = result.list?.find((entry) => entry.name === SIEVE_SCRIPT_NAME)?.id;
    if (id) {
      await writeSieveUpdate(client, accountId, id, active, blob.blobId);
      return;
    }
  }
  const created = await client.one<{
    notCreated?: Record<string, { type?: string; description?: string }>;
  }>(
    'SieveScript/set',
    {
      accountId,
      create: {
        newScript: {
          name: SIEVE_SCRIPT_NAME,
          isActive: active,
          blobId: blob.blobId,
        },
      },
    },
  );
  assertItemOk('create', created);
}

/**
 * A SieveScript answer can succeed while the item itself was refused
 * (the parser rejected the script) — the refusal rides back in
 * `notUpdated`/`notCreated` on a healthy-looking response. Surface it.
 */
function assertItemOk(
  kind: 'create' | 'update',
  result: {
    notCreated?: Record<string, { type?: string; description?: string }>;
    notUpdated?: Record<string, { type?: string; description?: string }>;
  },
): void {
  const failures = kind === 'create' ? result?.notCreated : result?.notUpdated;
  const first = failures ? Object.values(failures)[0] : undefined;
  if (first) {
    throw new StalwartError(
      'SieveScript/set',
      first.type ?? 'rejected',
      first.description ?? 'The script was not written.',
    );
  }
}

async function writeSieveUpdate(
  client: ReturnType<typeof userClient>,
  accountId: string,
  id: string,
  active: boolean,
  blobId: string,
): Promise<void> {
  const result = await client.one<{
    notUpdated?: Record<string, { type?: string; description?: string }>;
  }>('SieveScript/set', {
    accountId,
    update: {
      [id]: {
        isActive: active,
        blobId,
      },
    },
  });
  assertItemOk('update', result);
}
