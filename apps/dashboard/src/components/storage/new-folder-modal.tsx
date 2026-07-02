'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { Modal } from '@fidscript/ui';
import { Button, Input } from '@fidscript/ui';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrefix: string;
  onCreated: (prefix: string) => void;
}

export function NewFolderModal({ isOpen, onClose, currentPrefix, onCreated }: NewFolderModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Folder name is required');
      return;
    }
    if (trimmed.includes('/')) {
      setError('Folder name cannot contain slashes');
      return;
    }
    const prefix = currentPrefix ? `${currentPrefix}${trimmed}/` : `${trimmed}/`;
    onCreated(prefix);
    setName('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Folder" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            placeholder="e.g. images, assets, documents"
            autoFocus
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] text-sm"
          />
          {error && (
            <p className="mt-1.5 text-xs text-rose-400">{error}</p>
          )}
        </div>

        {currentPrefix && (
          <p className="text-xs text-[var(--text-dim)]">
            Will be created inside: <span className="text-[var(--text)] font-mono">{currentPrefix}</span>
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={!name.trim()} className="bg-[var(--accent)] hover:bg-[var(--accent-dim)]">
            <Icon icon="icons8:folder" width={13} height={13} className="mr-1.5" />
            Create Folder
          </Button>
        </div>
      </form>
    </Modal>
  );
}
