'use client';

import type { ChangeEvent } from 'react';
import { useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Attachment01Icon } from '@hugeicons/core-free-icons';
import { Button, Input } from '@fidscript/ui';
import type { StorageBackend } from '@fidscript-deploy/sdk';
import { AttachmentChips } from './platform-email-attachment-chips';

const STORAGE_LABELS: Record<StorageBackend, string> = {
  internal: 'Internal (VPS)',
  telegram: 'Telegram',
  cloudinary: 'Cloudinary',
};

interface Props {
  to: string;
  onToChange: (v: string) => void;
  subject: string;
  onSubjectChange: (v: string) => void;
  body: string;
  onBodyChange: (v: string) => void;
  files: File[];
  onFilesChange: (f: File[]) => void;
  storageBackend: StorageBackend;
  onStorageChange: (b: StorageBackend) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function ComposeForm({
  to, onToChange,
  subject, onSubjectChange,
  body, onBodyChange,
  files, onFilesChange,
  storageBackend, onStorageChange,
  onSubmit, loading,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="mb-3">
        <label className="block text-xs text-[var(--text-muted)] mb-1">To</label>
        <Input
          value={to}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onToChange(e.target.value)}
          placeholder="user@example.com"
          required
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
        />
      </div>

      <div className="mb-3">
        <label className="block text-xs text-[var(--text-muted)] mb-1">Subject</label>
        <Input
          value={subject}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onSubjectChange(e.target.value)}
          placeholder="Subject"
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
        />
      </div>

      <div className="mb-3">
        <label className="block text-xs text-[var(--text-muted)] mb-1">Body</label>
        <textarea
          value={body}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onBodyChange(e.target.value)}
          placeholder="Write your message…"
          rows={8}
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full rounded-lg px-3 py-2 text-sm font-sans"
        />
      </div>

      {/* Attachments */}
      <div className="mb-4">
        <input
          ref={fileRef}
          type="file"
          multiple
          id="compose-attachments"
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const f = Array.from(e.target.files ?? []);
            onFilesChange([...files, ...f]);
            e.target.value = '';
          }}
        />
        <label
          htmlFor="compose-attachments"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer border border-dashed border-[var(--rail)] hover:border-[var(--accent)] rounded-lg px-3 py-2 transition-colors w-full"
        >
          <HugeiconsIcon icon={Attachment01Icon} size={14} strokeWidth={1.5} />
          <span>{files.length > 0 ? `${files.length} file${files.length !== 1 ? 's' : ''} selected` : 'Add attachments'}</span>
        </label>
        <AttachmentChips
          files={files}
          onRemove={i => onFilesChange(files.filter((_, j) => j !== i))}
        />
        {files.length > 0 && storageBackend !== 'internal' && (
          <p className="text-[10px] text-[var(--accent)] mt-1">
            Files stored via <strong>{STORAGE_LABELS[storageBackend]}</strong>.
          </p>
        )}
      </div>

      <div className="mb-3">
        <label className="block text-xs text-[var(--text-muted)] mb-1">Attachment storage</label>
        <select
          value={storageBackend}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onStorageChange(e.target.value as StorageBackend)}
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
        >
          <option value="internal">Internal (VPS)</option>
          <option value="telegram">Telegram</option>
          <option value="cloudinary">Cloudinary</option>
        </select>
      </div>

      <Button variant="primary" size="sm" type="button" onClick={onSubmit} loading={loading}>
        {loading ? 'Sending…' : 'Send'}
      </Button>
    </>
  );
}
