'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Share01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@fidscript/ui';
import { usePublishMessage } from './publish-message.use';
import { PublishMessageHeaders, type HeaderRow } from './publish-message-headers';

interface PublishMessageModalProps {
  queueId: string;
  queueName: string;
  projectId: string;
  onClose: () => void;
  onPublished: () => void;
  getSdk: () => import('@fidscript-deploy/sdk').FidscriptSDK;
}

export function PublishMessageModal({ queueId, queueName, projectId, onClose, onPublished, getSdk }: PublishMessageModalProps) {
  const [message, setMessage] = useState('{\n  \n}');
  const [delaySeconds, setDelaySeconds] = useState<number>(0);
  const [headerRows, setHeaderRows] = useState<HeaderRow[]>([{ key: '', value: '' }]);
  const [showHeaders, setShowHeaders] = useState(false);
  const { publishing, error, publish } = usePublishMessage(projectId, queueId, getSdk);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers: Record<string, string> = {};
    for (const row of headerRows) {
      if (row.key.trim()) headers[row.key.trim()] = row.value;
    }
    const ok = await publish({
      body: message,
      delaySeconds: delaySeconds > 0 ? delaySeconds : undefined,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
    if (ok) {
      onPublished();
      onClose();
    }
  };

  const activeHeaderCount = headerRows.filter((r) => r.key.trim()).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--surface)] border border-[var(--rail)] rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--rail)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
              <HugeiconsIcon icon={Share01Icon} size={14} className="text-[var(--accent)]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">Publish Message</h2>
              <p className="text-[10px] text-[var(--text-dim)] mt-0.5">{queueName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)] transition-colors"
            aria-label="Close"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
          </button>
        </div>

        <form onSubmit={handlePublish} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label htmlFor="publish-body" className="block text-xs font-medium text-[var(--text-dim)] mb-1.5">Message Body (JSON)</label>
            <textarea
              id="publish-body"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 text-xs font-mono bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg text-[var(--text)] placeholder:text-[var(--text-dim)]/40 focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20 resize-none"
              placeholder='{"type":"email","to":"user@example.com"}'
              autoFocus
            />
            <p className="text-[10px] text-[var(--text-dim)] mt-1.5">
              Valid JSON will be stored as a JSON object; plain text will be stored as-is.
            </p>
          </div>

          <div>
            <label htmlFor="publish-delay" className="block text-xs font-medium text-[var(--text-dim)] mb-1.5">Delay (seconds)</label>
            <input
              id="publish-delay"
              type="number"
              min={0}
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20"
            />
            <p className="text-[10px] text-[var(--text-dim)] mt-1.5">
              Delay delivery by N seconds. 0 = publish immediately.
            </p>
          </div>

          <div className="border-t border-[var(--rail)] pt-3">
            <button
              type="button"
              onClick={() => setShowHeaders((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
              aria-expanded={showHeaders}
            >
              {showHeaders ? 'Hide' : 'Add'} Headers
              {activeHeaderCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                  {activeHeaderCount}
                </span>
              )}
            </button>
            {showHeaders && <div className="mt-3"><PublishMessageHeaders rows={headerRows} onChange={setHeaderRows} /></div>}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-lg px-3 py-2">
              <HugeiconsIcon icon={Cancel01Icon} size={13} />
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={publishing}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={publishing}>
              {publishing ? (
                <>
                  <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block mr-1.5" />
                  Publishing…
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={Share01Icon} size={13} className="mr-1.5" />
                  Publish Message
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
