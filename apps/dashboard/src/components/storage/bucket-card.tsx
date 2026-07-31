'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { Card } from '@fidscript/ui';
import { ProviderBadge } from './provider-badge';
import { StatusBadge } from './status-badge';

const PROVIDER_ICONS: Record<string, string> = {
  cloudinary: 'icons8:database',
  telegram:   'icons8:share',
  s3:         'icons8:hdd',
  internal:   'icons8:database',
};

export interface Bucket {
  id: string; name: string; provider: string; status: string; createdAt: string;
}

interface BucketCardProps {
  bucket: Bucket;
  projectId: string;
  onDelete: (bucket: Bucket) => void;
}

export function BucketCard({ bucket, projectId, onDelete }: BucketCardProps) {
  const router = useRouter();

  return (
    <div className="relative group">
      <button
        onClick={() => router.push(`/projects/${projectId}/storage/${bucket.id}`)}
        className="w-full text-left"
      >
        <Card
          className="border border-[var(--rail)] hover:border-[var(--accent)]/50 hover:bg-[var(--surface-2)] transition-all duration-150 pr-16"
          padding="md"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--rail)] flex items-center justify-center flex-shrink-0">
                <Icon icon={PROVIDER_ICONS[bucket.provider] ?? 'icons8:database'} width={14} height={14} className="text-[var(--text-dim)]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-[var(--text)] truncate">{bucket.name}</h3>
                  <ProviderBadge provider={bucket.provider} />
                </div>
                <p className="text-[10px] text-[var(--text-dim)] mt-0.5">
                  Created {new Date(bucket.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <StatusBadge status={bucket.status} />
              <Icon icon="icons8:right-arrow" width={14} height={14} className="text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors" />
            </div>
          </div>
        </Card>
      </button>

      {/* Delete button — positioned absolute top-right of the card */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(bucket); }}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-[var(--text-dim)] hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
        title="Delete bucket"
      >
        <Icon icon="icons8:trash" width={14} height={14} />
      </button>
    </div>
  );
}
