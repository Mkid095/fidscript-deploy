import { NextResponse } from 'next/server';
import { requireMailbox } from '@/lib/auth/require';
import {
  saveDraft,
  sendMessage,
  uploadAttachment,
} from '@/lib/stalwart/mail';

/**
 * The composer's back end. One route, three verbs by "op":
 *
 *   upload  { filename, contentType, dataBase64 }  → { attachments: [{blobId,...}] }
 *   send    { to, cc?, bcc?, subject?, text?, html?, attachments? } → { messageId }
 *   draft   { draftId?, to?, subject?, text?, html? } → { draftId }
 *
 * Attachments arrive base64 (the composer has them as files in memory) and
 * are handed to Stalwart as blobs, which the submission then references —
 * the bytes never sit in our own database.
 */
export async function POST(request: Request) {
  const context = await requireMailbox(request);
  if (!context) {
    return NextResponse.json({ error: 'Sign in to your mailbox.' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A JSON form is expected.' }, { status: 400 });
  }

  try {
    switch (body.op) {
      case 'upload': {
        const dataBase64 = String(body.dataBase64 ?? '');
        const bytes = Uint8Array.from(
          atob(dataBase64),
          (char) => char.charCodeAt(0),
        );
        const attachment = await uploadAttachment(
          context.cred,
          bytes.buffer,
          String(body.contentType ?? 'application/octet-stream'),
          String(body.filename ?? 'attachment'),
        );
        return NextResponse.json({ attachments: [attachment] });
      }

      case 'send': {
        const messageId = await sendMessage(context.cred, {
          to: Array.isArray(body.to) ? (body.to as string[]) : [],
          cc: Array.isArray(body.cc) ? (body.cc as string[]) : [],
          bcc: Array.isArray(body.bcc) ? (body.bcc as string[]) : [],
          subject: body.subject ? String(body.subject) : undefined,
          text: body.text ? String(body.text) : undefined,
          html: body.html ? String(body.html) : undefined,
          identityId: body.identityId ? String(body.identityId) : null,
          attachments: Array.isArray(body.attachments)
            ? (body.attachments as Array<{
                blobId: string;
                filename: string;
                contentType: string;
                size: number;
              }>)
            : undefined,
        });
        return NextResponse.json({ messageId });
      }

      case 'draft': {
        const draftId = await saveDraft(context.cred, {
          draftId: body.draftId ? String(body.draftId) : undefined,
          to: Array.isArray(body.to) ? (body.to as string[]) : undefined,
          subject: body.subject ? String(body.subject) : undefined,
          text: body.text ? String(body.text) : undefined,
          html: body.html ? String(body.html) : undefined,
        });
        return NextResponse.json({ draftId });
      }

      default:
        return NextResponse.json({ error: 'An unknown op.' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
