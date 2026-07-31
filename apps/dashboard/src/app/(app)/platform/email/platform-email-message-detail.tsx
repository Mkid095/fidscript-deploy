'use client';

import { Button, Card, EmptyState } from '@fidscript/ui';
import type { PlatformMailboxMessage } from '@fidscript-deploy/sdk';

interface Props {
  message: PlatformMailboxMessage | null;
  onStar: (msg: PlatformMailboxMessage) => void;
  onMove: (msg: PlatformMailboxMessage, folder: string) => void;
  onDelete: (msg: PlatformMailboxMessage) => void;
}

export function PlatformEmailMessageDetail({ message, onStar, onMove, onDelete }: Props) {
  return (
    <Card className="flex-1 overflow-y-auto border border-[var(--rail)] p-0">
      {!message ? (
        <EmptyState title="Select a message" description="Pick a message from the list to view it." />
      ) : (
        <div className="p-5">
          <div className="border-b border-[var(--rail)] pb-3 mb-4">
            <h2 className="text-lg font-semibold text-[var(--text)] mb-2">{message.subject || '(no subject)'}</h2>
            <div className="text-sm text-[var(--text-muted)] space-y-1">
              <div><span className="text-[var(--text-muted)]">From:</span> {message.fromName ? `${message.fromName} <${message.from}>` : message.from}</div>
              <div><span className="text-[var(--text-muted)]">To:</span> {message.to.join(', ')}</div>
              {message.cc?.length ? <div><span className="text-[var(--text-muted)]">Cc:</span> {message.cc.join(', ')}</div> : null}
              <div><span className="text-[var(--text-muted)]">Received:</span> {new Date(message.receivedAt).toLocaleString()}</div>
            </div>
          </div>
          <div className="flex gap-2 mb-4 pb-3 border-b border-[var(--rail)]">
            <Button variant="ghost" size="sm" onClick={() => onStar(message)}>
              {message.isStarred ? '★ Unstar' : '☆ Star'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onMove(message, 'trash')}>🗑 Trash</Button>
            <Button variant="ghost" size="sm" onClick={() => onMove(message, 'junk')}>Junk</Button>
            <Button variant="ghost" size="sm" onClick={() => onMove(message, 'archive')}>Archive</Button>
            <Button variant="danger" size="sm" onClick={() => onDelete(message)}>Delete</Button>
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            {message.bodyHtml ? (
              <iframe
                srcDoc={message.bodyHtml}
                className="w-full min-h-96 border-0 bg-white"
                sandbox="allow-same-origin"
                title="Email body"
              />
            ) : message.bodyText ? (
              <pre className="whitespace-pre-wrap font-sans text-sm">{message.bodyText}</pre>
            ) : (
              <p className="italic">{message.preview || '(empty)'}</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
