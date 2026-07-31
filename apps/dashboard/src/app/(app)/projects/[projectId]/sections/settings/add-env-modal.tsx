'use client';

import { useState } from 'react';
import { Button, Input, Modal } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';

interface AddEnvModalProps {
  projectId: string;
  existingVars: { key: string; value: string }[];
  onAdded: (v: { key: string; value: string }) => void;
  onClose: () => void;
}

export function AddEnvModal({ projectId, existingVars, onAdded, onClose }: AddEnvModalProps) {
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim()) return;
    setSaving(true);
    try {
      const varMap: Record<string, string> = {};
      for (const v of existingVars) varMap[v.key] = v.value;
      varMap[newKey.trim().toUpperCase()] = newValue;
      await getSdk().projects.setEnvVars(projectId, varMap);
      onAdded({ key: newKey.trim().toUpperCase(), value: newValue });
      showToast({ type: 'success', message: 'Environment variable added.' });
      onClose();
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Add Environment Variable" size="sm">
      <form onSubmit={handleAdd} className="space-y-4">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Key</label>
          <Input value={newKey} onChange={e => setNewKey(e.target.value.toUpperCase())} placeholder="DATABASE_URL" className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] font-mono" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Value</label>
          <Input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="postgresql://..." className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] font-mono" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" type="submit" loading={saving}>Add</Button>
        </div>
      </form>
    </Modal>
  );
}
