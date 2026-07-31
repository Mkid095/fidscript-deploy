'use client';

import { Button, Card, Input } from '@fidscript/ui';

interface Props {
  name: string;
  type: 'postgres' | 'redis';
  creating: boolean;
  error: string | null;
  onNameChange: (v: string) => void;
  onTypeChange: (v: 'postgres' | 'redis') => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function DatabaseCreateForm({
  name, type, creating, error,
  onNameChange, onTypeChange, onSubmit,
}: Props) {
  return (
    <Card className="border border-[var(--rail)] mb-6" padding="lg">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-4">New Database</h2>
      <form onSubmit={onSubmit} noValidate>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Database name</label>
            <Input
              value={name}
              onChange={e => onNameChange(e.target.value)}
              placeholder="my-database"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Type</label>
            <select
              value={type}
              onChange={e => onTypeChange(e.target.value as 'postgres' | 'redis')}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm"
            >
              <option value="postgres">PostgreSQL</option>
              <option value="redis">Redis</option>
              <option value="mysql" disabled style={{ opacity: 0.4 }}>MySQL (not yet available)</option>
            </select>
          </div>
          <Button type="submit" variant="primary" size="sm" loading={creating}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </div>
        {error && <p className="text-[var(--danger)] text-xs mt-3">{error}</p>}
      </form>
    </Card>
  );
}
