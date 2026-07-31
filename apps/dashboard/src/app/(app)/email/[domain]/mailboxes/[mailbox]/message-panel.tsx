'use client';

import { Card } from '@fidscript/ui';
import type { MailboxMessage } from '@fidscript-deploy/sdk';
import { MessagePreview } from './message-detail';

interface MessagePanelProps {
  message: MailboxMessage | null;
  onToggleRead: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
}

export function MessagePanel({ message, onToggleRead, onToggleStar, onDelete }: MessagePanelProps) {
  return (
    <Card className="border border-[var(--rail)] p-5">
      {message ? (
        <MessagePreview
          message={message}
          onToggleRead={onToggleRead}
          onToggleStar={onToggleStar}
          onDelete={onDelete}
        />
      ) : (
        <div className="text-center text-sm text-[var(--text-muted)] py-12">
          Select a message to preview
        </div>
      )}
    </Card>
  );
}
