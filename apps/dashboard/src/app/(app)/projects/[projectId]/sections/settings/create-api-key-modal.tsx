'use client';

import { useState } from 'react';
import { Button, Input, Modal } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Copy02Icon } from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';

interface ApiKey { id: string; name: string; createdAt: string; lastUsedAt?: string; }

interface CreateApiKeyModalProps {
  projectId: string;
  onCreated: (key: string, apiKey: ApiKey) => void;
  onClose: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-[var(--text-muted)] hover:text-[var(--text-muted)] p-1.5 rounded transition-colors flex-shrink-0"
      title="Copy"
      aria-label="Copy to clipboard"
    >
      <HugeiconsIcon icon={copied ? CheckmarkCircle02Icon : Copy02Icon} size={14} className={copied ? 'text-[var(--success)]' : ''} />
    </button>
  );
}

export function CreateApiKeyModal({ projectId, onCreated, onClose }: CreateApiKeyModalProps) {
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!keyName.trim()) return;
    setCreating(true);
    try {
      const result = await getSdk().projects.createApiKey(projectId, keyName.trim()) as { apiKey: ApiKey; key: string };
      setNewKey(result.key);
      onCreated(result.key, result.apiKey);
      showToast({ type: 'success', message: 'API key created.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create key' });
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="New API Key" size="sm">
      {newKey ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[var(--success)] text-sm">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
            Key created successfully
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-2">Copy this key now — it will not be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-[var(--surface-2)] border border-[var(--rail)] rounded px-3 py-2 font-mono text-xs text-[var(--text)] break-all">{newKey}</code>
              <CopyButton text={newKey} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Key name</label>
            <Input value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="Production Backend" className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]" autoFocus />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" loading={creating}>Create</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
