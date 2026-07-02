'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { Card, Button, Input } from '@fidscript/ui';
import type { Bucket } from './bucket';
import type { StorageProviderType } from '@/types';

interface CreateBucketFormProps {
  projectId: string;
  onCreated: (bucket: Bucket) => void;
  onError: (message: string) => void;
  getSdk: () => { storage: { createBucket: Function } };
}

const PROVIDERS: { value: StorageProviderType; label: string }[] = [
  { value: 'internal',   label: 'Internal' },
  { value: 'cloudinary', label: 'Cloudinary' },
  { value: 'telegram',  label: 'Telegram' },
  { value: 's3',         label: 'AWS S3' },
];

export function CreateBucketForm({ projectId, onCreated, onError, getSdk }: CreateBucketFormProps) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<StorageProviderType>('internal');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const created = await getSdk().storage.createBucket(projectId, name.trim(), provider);
      onCreated(created as Parameters<typeof onCreated>[0]);
      setName('');
      setShow(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to create bucket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-[var(--rail)]" padding="lg">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] mb-4">New Bucket</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)] mb-1.5">
              Bucket name
            </label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. assets, user-uploads"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)] mb-1.5">
              Provider
            </label>
            <select
              value={provider}
              onChange={e => setProvider(e.target.value as StorageProviderType)}
              className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-xs h-[36px]"
            >
              {PROVIDERS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <p className="text-[10px] text-[var(--text-dim)]">
            Files larger than the configured limit will be routed to this provider.
          </p>
          <div className="flex gap-2">
            {show && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setShow(false); setName(''); }}
                className="text-[var(--text-dim)]"
              >
                <Icon icon="icons8:cancel" width={12} height={12} className="mr-1.5" />
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={loading}
              className="bg-[var(--accent)] hover:bg-[var(--accent-dim)]"
            >
              <Icon icon="icons8:plus" width={12} height={12} className="mr-1.5" />
              {loading ? 'Creating…' : 'Create Bucket'}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
