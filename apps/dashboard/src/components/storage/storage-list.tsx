'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { Card, Button, Spinner } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import { Banner } from './banner';
import { BucketCard } from './bucket-card';
import { CreateBucketForm } from './create-bucket-form';
import { useStorageRealtime } from './use-storage-realtime';
import type { Bucket } from './bucket';

interface StorageListProps {
  projectId: string;
}

export function StorageList({ projectId }: StorageListProps) {
  const { getSdk, getToken } = useAuth();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const showBanner = useCallback((message: string, type: 'success' | 'error') => {
    setBanner({ message, type });
    setTimeout(() => setBanner(null), 4000);
  }, []);

  const loadBuckets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSdk().storage.listBuckets(projectId) as Bucket[];
      setBuckets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load buckets');
    } finally {
      setLoading(false);
    }
  }, [projectId, getSdk]);

  useEffect(() => { loadBuckets(); }, [loadBuckets]);

  useStorageRealtime(getSdk, getToken, projectId, {
    onBucketCreated: (bucket) => {
      setBuckets(prev => prev.find(b => b.id === bucket.id) ? prev : [...prev, bucket]);
    },
    onBucketDeleted: (bucketId) => {
      setBuckets(prev => prev.filter(b => b.id !== bucketId));
    },
  });

  const handleDeleteBucket = useCallback(async (bucket: Bucket) => {
    if (!confirm(`Delete bucket "${bucket.name}"? All files inside will be permanently deleted.`)) return;
    try {
      await getSdk().storage.deleteBucket(projectId, bucket.id);
      setBuckets(prev => prev.filter(b => b.id !== bucket.id));
      showBanner(`Bucket "${bucket.name}" deleted`, 'success');
    } catch (err) {
      showBanner(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  }, [projectId, getSdk, showBanner]);

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-0.5">Storage</h1>
          <p className="text-xs text-[var(--text-dim)]">
            {loading ? 'Loading…' : `${buckets.length} bucket${buckets.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href={`/projects/${projectId}/storage/settings`}>
            <Button variant="ghost" size="sm" className="text-[var(--text-dim)] hover:text-[var(--text)]">
              <Icon icon="icons8:settings" width={13} height={13} className="mr-1.5" />
              Settings
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreate(s => !s)}
            className="bg-[var(--accent)] hover:bg-[var(--accent-dim)]"
          >
            {showCreate ? 'Cancel' : 'New Bucket'}
          </Button>
        </div>
      </div>

      {error && <Banner message={error} type="error" />}

      {showCreate && (
        <CreateBucketForm
          projectId={projectId}
          onCreated={(bucket) => {
            setBuckets(prev => prev.find(b => b.id === bucket.id) ? prev : [...prev, bucket]);
            setShowCreate(false);
            showBanner(`Bucket "${bucket.name}" created successfully`, 'success');
          }}
          onError={(message) => showBanner(message, 'error')}
          getSdk={getSdk}
        />
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center min-h-48 py-12">
          <Spinner size="md" />
        </div>
      ) : buckets.length === 0 ? (
        <Card className="border border-[var(--rail)]" padding="lg">
          <div className="text-center py-10">
            <Icon icon="icons8:hdd" width={32} height={32} className="text-[var(--text-dim)] mx-auto mb-3" />
            <p className="text-xs font-semibold text-[var(--text)] mb-1">No buckets yet</p>
            <p className="text-[10px] text-[var(--text-dim)] mb-4">
              Create your first bucket to store files, backups, and assets.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreate(true)}
              className="bg-[var(--accent)] hover:bg-[var(--accent-dim)]"
            >
              <Icon icon="icons8:folder" width={12} height={12} className="mr-1.5" />
              Create Bucket
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {buckets.map(bucket => (
            <BucketCard key={bucket.id} bucket={bucket} projectId={projectId} onDelete={handleDeleteBucket} />
          ))}
        </div>
      )}
    </div>
  );
}
