'use client';

import { useState } from 'react';
import { Button, Modal } from '@fidscript/ui';
import type { StorageBackend } from '@fidscript-deploy/sdk';
import { ComposeForm } from './platform-email-compose-form';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedLocal: string;
  onSent: () => void;
  sendMail: (opts: {
    fromLocal?: string;
    to: string;
    subject: string;
    text: string;
    storageBackend: StorageBackend;
    attachments?: { filename: string; mimeType: string; data: string }[];
  }) => Promise<void>;
}

export function PlatformEmailComposeModal({ isOpen, onClose, selectedLocal, onSent, sendMail }: Props) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [storageBackend, setStorageBackend] = useState<StorageBackend>('internal');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setSendResult(null);
    try {
      const attachments = await Promise.all(
        files.map(async (file) => {
          const buffer = await file.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          return { filename: file.name, mimeType: file.type || 'application/octet-stream', data: base64 };
        }),
      );
      await sendMail({
        fromLocal: selectedLocal || undefined,
        to,
        subject,
        text: body,
        storageBackend,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      setTo('');
      setSubject('');
      setBody('');
      setFiles([]);
      onSent();
      onClose();
    } catch (e) {
      setSendResult(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { onClose(); setSendResult(null); setFiles([]); }}
      title="Compose Message"
    >
      <ComposeForm
        to={to}
        onToChange={setTo}
        subject={subject}
        onSubjectChange={setSubject}
        body={body}
        onBodyChange={setBody}
        files={files}
        onFilesChange={setFiles}
        storageBackend={storageBackend}
        onStorageChange={setStorageBackend}
        onSubmit={handleSend}
        loading={sending}
      />
      {sendResult && <p className="text-[var(--success)] text-xs mt-3">{sendResult}</p>}
    </Modal>
  );
}
