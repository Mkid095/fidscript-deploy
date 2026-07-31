'use client';

import { Button, Card } from '@fidscript/ui';

interface Props {
  deleting: boolean;
  onDelete: () => void;
}

export function DbSettings({ deleting, onDelete }: Props) {
  return (
    <div className="space-y-6">
      <Card className="border border-red-900/30" padding="lg">
        <h2 className="text-sm font-semibold text-[var(--danger)] mb-4">Danger Zone</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Permanently delete this database and all its data. This cannot be undone.
        </p>
        <Button variant="danger" size="sm" loading={deleting} onClick={onDelete}>
          Delete Database
        </Button>
      </Card>
    </div>
  );
}
