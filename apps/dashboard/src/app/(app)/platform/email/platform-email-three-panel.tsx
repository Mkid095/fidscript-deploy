'use client';

import type { PlatformMailboxMessage, PlatformMailboxSummary } from '@fidscript-deploy/sdk';
import { PlatformEmailMailboxList } from './platform-email-mailbox-list';
import { PlatformEmailMessageList } from './platform-email-message-list';
import { PlatformEmailMessageDetail } from './platform-email-message-detail';

interface Props {
  mailboxes: PlatformMailboxSummary[];
  selectedLocal: string | null;
  messages: PlatformMailboxMessage[];
  total: number;
  activeFolder: string;
  selectedMessage: PlatformMailboxMessage | null;
  loadingMessages: boolean;
  onSelectMailbox: (name: string) => void;
  onSelectMessage: (msg: PlatformMailboxMessage) => void;
  onStar: (msg: PlatformMailboxMessage) => void;
  onMove: (msg: PlatformMailboxMessage, folder: string) => void;
  onDelete: (msg: PlatformMailboxMessage) => void;
}

export function PlatformEmailThreePanel({
  mailboxes, selectedLocal, messages, total, activeFolder,
  selectedMessage, loadingMessages,
  onSelectMailbox, onSelectMessage, onStar, onMove, onDelete,
}: Props) {
  return (
    <div className="flex flex-1 gap-3 min-h-0">
      <PlatformEmailMailboxList mailboxes={mailboxes} selectedLocal={selectedLocal}
        onSelect={name => { onSelectMailbox(name); }} />

      <div className="w-96 flex-shrink-0 flex flex-col">
        <PlatformEmailMessageList messages={messages} total={total} activeFolder={activeFolder}
          selectedMessageId={selectedMessage?.id} loading={loadingMessages} onSelect={onSelectMessage} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <PlatformEmailMessageDetail message={selectedMessage} onStar={onStar}
          onMove={onMove} onDelete={onDelete} />
      </div>
    </div>
  );
}
