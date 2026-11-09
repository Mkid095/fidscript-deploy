/**
 * Email templates, kept in the application database.
 *
 * A template is a stored email — an email-safe HTML document and its
 * plain-text alternative, in a category, owned by the person who made it.
 * Stalwart owns the mail system; the templates are this application's own
 * content, which is why they live here.
 */
import { db } from '@/lib/db';

export interface Template {
  id: string;
  name: string;
  category: string;
  html: string;
  text: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  'business',
  'receipt',
  'invoice',
  'notification',
  'newsletter',
  'announcement',
] as const;

export function listTemplates(
  category?: string,
): Promise<Template[]> {
  const query = db.appTemplate.findMany({
    where: category ? { category } : undefined,
    orderBy: { createdAt: 'desc' },
  });
  return query.then((rows) =>
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      html: row.html,
      text: row.text,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  );
}

export function getTemplate(id: string): Promise<Template | null> {
  return db.appTemplate
    .findUnique({ where: { id } })
    .then((row) =>
      row
        ? {
            id: row.id,
            name: row.name,
            category: row.category,
            html: row.html,
            text: row.text,
            createdBy: row.createdBy,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
          }
        : null,
    );
}

export async function saveTemplate(input: {
  id?: string;
  name: string;
  category: string;
  html: string;
  text: string;
  createdBy: string;
}): Promise<Template> {
  const category = (CATEGORIES as readonly string[]).includes(input.category)
    ? input.category
    : 'business';
  if (input.id) {
    const row = await db.appTemplate.update({
      where: { id: input.id },
      data: {
        name: input.name,
        category,
        html: input.html,
        text: input.text,
      },
    });
    return rowToTemplate(row);
  }
  const row = await db.appTemplate.create({
    data: {
      name: input.name,
      category,
      html: input.html,
      text: input.text,
      createdBy: input.createdBy,
    },
  });
  return rowToTemplate(row);
}

export function deleteTemplate(id: string): Promise<number> {
  return db.appTemplate
    .delete({ where: { id } })
    .then(() => 1)
    .catch(() => 0);
}

function rowToTemplate(row: {
  id: string;
  name: string;
  category: string;
  html: string;
  text: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}): Template {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    html: row.html,
    text: row.text,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * The starter set: one per category, present in every fresh install so the
 * designer has something real to begin from. Idempotent — they are added
 * only when the category has nothing yet.
 */
export async function ensureStarterTemplates(createdBy = 'webmail'): Promise<number> {
  let added = 0;
  for (const starter of STARTERS) {
    const existing = await db.appTemplate.findFirst({
      where: { category: starter.category, createdBy },
    });
    if (existing) continue;
    await db.appTemplate.create({
      data: {
        name: starter.name,
        category: starter.category,
        html: starter.html,
        text: starter.text,
        createdBy,
      },
    });
    added += 1;
  }
  return added;
}

const STARTERS: Array<{
  category: string;
  name: string;
  html: string;
  text: string;
}> = [
  {
    category: 'business',
    name: 'Business letter',
    text: 'Subject: [Subject]\n\nDear [Name],\n\n[Body]\n\nKind regards,\n[Your name]',
    html:
      '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1b2027;max-width:600px;margin:0 auto;padding:24px">' +
      '<p style="margin:0 0 16px">Dear [Name],</p>' +
      '<p style="margin:0 0 16px">[Body]</p>' +
      '<p style="margin:0">Kind regards,<br>[Your name]</p>' +
      '<p style="margin:24px 0 0;font-size:11px;color:#7a8694">This message was sent to [Recipient] by [Company].</p>' +
      '</div>',
  },
  {
    category: 'receipt',
    name: 'Receipt',
    text: 'Subject: Receipt [Number]\n\nThank you for your payment.\nOrder: [Number]\nTotal: [Amount] ([Currency])\nDate: [Date]',
    html:
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1b2027;max-width:600px;margin:0 auto;padding:24px">' +
      '<tr><td style="padding-bottom:16px"><strong>Thank you for your payment.</strong></td></tr>' +
      '<tr><td style="padding:10px 16px;background:#f0f2f5"><strong>Order</strong> [Number] &nbsp;·&nbsp; <strong>Total</strong> [Amount] [Currency] &nbsp;·&nbsp; <strong>Date</strong> [Date]</td></tr>' +
      '</table>',
  },
  {
    category: 'invoice',
    name: 'Invoice',
    text: 'Subject: Invoice [Number]\n\nInvoice [Number]\nDue: [Date]\nAmount due: [Amount] ([Currency])\n\n[Line items]\n\nPayment details: [Details]',
    html:
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1b2027;max-width:600px;margin:0 auto;padding:24px">' +
      '<tr><td style="font-size:20px;font-weight:bold;padding-bottom:8px">Invoice [Number]</td></tr>' +
      '<tr><td style="padding-bottom:16px">Due [Date] &nbsp;·&nbsp; Amount due <strong>[Amount] [Currency]</strong></td></tr>' +
      '<tr><td style="padding:10px 16px;background:#f0f2f5;padding-bottom:16px">[Line items]</td></tr>' +
      '<tr><td style="padding-top:16px;font-size:12px;color:#7a8694">Payment details: [Details]</td></tr>' +
      '</table>',
  },
  {
    category: 'notification',
    name: 'Notification',
    text: 'Subject: [Headline]\n\n[Message]\n\n— [Product] Team',
    html:
      '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1b2027;max-width:560px;margin:0 auto;padding:24px">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
      '<tr><td style="text-align:center;padding:24px 16px;background:#e8efff;border-radius:8px"><strong style="font-size:16px;color:#2563eb">[Headline]</strong></td></tr>' +
      '<tr><td style="padding:20px 8px">[Message]</td></tr>' +
      '<tr><td style="padding:8px;font-size:12px;color:#7a8694">— [Product] Team</td></tr>' +
      '</table></div>',
  },
  {
    category: 'newsletter',
    name: 'Newsletter',
    text: 'Subject: [Issue headline]\n\n[Lead story]\n\n[Second story]\n\n[Third story]\n\n[Unsubscribe]',
    html:
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1b2027;max-width:640px;margin:0 auto;background:#ffffff">' +
      '<tr><td style="padding:20px 24px;background:#1b2027;color:#ffffff"><strong style="font-size:18px">[Publication]</strong></td></tr>' +
      '<tr><td style="padding:20px 24px;font-size:20px;font-weight:bold">[Issue headline]</td></tr>' +
      '<tr><td style="padding:0 24px 16px">[Lead story]</td></tr>' +
      '<tr><td style="padding:0 24px 16px">[Second story]</td></tr>' +
      '<tr><td style="padding:0 24px 16px">[Third story]</td></tr>' +
      '<tr><td style="padding:16px 24px;background:#f0f2f5;font-size:11px;color:#7a8694;text-align:center">You are receiving this because you subscribed. [Unsubscribe]</td></tr>' +
      '</table>',
  },
  {
    category: 'announcement',
    name: 'Announcement',
    text: 'Subject: [What is new]\n\n[Details]\n\n[Call to action]',
    html:
      '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1b2027;max-width:560px;margin:0 auto;padding:24px">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
      '<tr><td style="text-align:center;padding-bottom:16px"><strong style="font-size:20px">[What is new]</strong></td></tr>' +
      '<tr><td>[Details]</td></tr>' +
      '<tr><td style="padding-top:20px;text-align:center"><a href="[LINK]" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px">[Call to action]</a></td></tr>' +
      '</table></div>',
  },
];

export const TEMPLATE_CATEGORIES = [...CATEGORIES];
