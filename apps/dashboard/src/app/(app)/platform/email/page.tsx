'use client';

import { useState } from 'react';
import { Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { PlatformEmailTopbar } from './platform-email-topbar';
import { PlatformEmailCreateMailboxModal } from './platform-email-create-mailbox-modal';
import { PlatformEmailComposeModal } from './platform-email-compose-modal';
import { PlatformEmailMailboxCreatedCard } from './platform-email-mailbox-created-card';
import { sendPlatformMail } from './platform-email-send-mail';
import { PlatformEmailThreePanel } from './platform-email-three-panel';
import { useEmailPage } from './platform-email-page-hooks';
import type { Folder } from './platform-email-page-types';


export default function PlatformEmailPage() {
  const sdk = useAuth().getSdk();
  const {
    mailboxes, selectedLocal, setSelectedLocal,
    activeFolder, setActiveFolder,
    messages, total,
    selectedMessage, setSelectedMessage,
    loadingMailboxes, loadingMessages,
    error, setError,
    createResult, setCreateResult,
    sendResult, setSendResult,
    loadMessages,
    openMessage, starMessage, moveMessage, deleteMessage,
    handleCreateMailbox,
  } = useEmailPage(sdk);

  const [showCreate, setShowCreate] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  if (loadingMailboxes) {
    return <div className="flex items-center justify-center min-h-96"><Spinner size="lg" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      <PlatformEmailTopbar
        mailboxes={mailboxes}
        onCompose={() => setShowCompose(true)}
        onNewMailbox={() => setShowCreate(true)}
      />

      {error && <p className="text-[var(--danger)] mb-4 text-sm">{error}</p>}
      {sendResult && <p className="text-[var(--success)] mb-4 text-sm">{sendResult}</p>}

      <PlatformEmailThreePanel
        mailboxes={mailboxes}
        selectedLocal={selectedLocal}
        messages={messages}
        total={total}
        activeFolder={activeFolder}
        selectedMessage={selectedMessage}
        loadingMessages={loadingMessages}
        onSelectMailbox={name => { setSelectedLocal(name); setSelectedMessage(null); }}
        onSelectMessage={openMessage}
        onStar={starMessage}
        onMove={(msg, folder) => moveMessage(msg, folder as Folder)}
        onDelete={deleteMessage}
      />

      <PlatformEmailCreateMailboxModal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setCreateResult(null); }}
        onCreated={(email, password) => setCreateResult({ email, password })}
        onCreate={handleCreateMailbox}
      />

      {createResult && (
        <PlatformEmailMailboxCreatedCard
          email={createResult.email}
          password={createResult.password}
          onDone={() => setCreateResult(null)}
        />
      )}

      <PlatformEmailComposeModal
        isOpen={showCompose}
        onClose={() => { setShowCompose(false); setSendResult(null); }}
        selectedLocal={selectedLocal}
        onSent={() => loadMessages()}
        sendMail={opts => sendPlatformMail(sdk, opts, () => loadMessages(), setSendResult, setActiveFolder as (folder: string) => void)}
      />
    </div>
  );
}
