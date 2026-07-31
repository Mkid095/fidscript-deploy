'use client';

import { Icon } from '@iconify/react';
import { Card, Button } from '@fidscript/ui';

interface BucketEmptyStateProps {
  prefix: string;
  onUploadInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function BucketEmptyState({ prefix, onUploadInputChange }: BucketEmptyStateProps) {
  return (
    <Card className="border border-[var(--rail)]" padding="lg">
      <div className="text-center py-10">
        <Icon icon="icons8:folder" width={32} height={32} className="text-[var(--text-dim)] mx-auto mb-3" />
        <p className="text-xs font-semibold text-[var(--text)] mb-1">
          {prefix ? 'Folder is empty' : 'Bucket is empty'}
        </p>
        <p className="text-[10px] text-[var(--text-dim)] mb-4">
          {prefix ? 'Upload files to this folder.' : 'Upload your first file or drag and drop to get started.'}
        </p>
        <label className="cursor-pointer inline-block">
          <input type="file" multiple className="hidden" onChange={onUploadInputChange} />
          <Button variant="primary" size="sm" className="bg-[var(--accent)] hover:bg-[var(--accent-dim)]">
            <Icon icon="icons8:upload" width={12} height={12} className="mr-1.5" />
            Upload Files
          </Button>
        </label>
      </div>
    </Card>
  );
}
