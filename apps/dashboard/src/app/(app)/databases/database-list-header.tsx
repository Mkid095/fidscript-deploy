'use client';

import { Button } from '@fidscript/ui';

interface Props {
  count: number;
  showCreate: boolean;
  onToggleCreate: () => void;
}

export function DatabaseListHeader({ count, showCreate, onToggleCreate }: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)] mb-1">Databases</h1>
        <p className="text-sm text-[var(--text-muted)]">
          {count} database{count !== 1 ? 's' : ''}
        </p>
      </div>
      <Button variant="primary" size="sm" onClick={onToggleCreate}>
        {showCreate ? 'Cancel' : 'Create Database'}
      </Button>
    </div>
  );
}
