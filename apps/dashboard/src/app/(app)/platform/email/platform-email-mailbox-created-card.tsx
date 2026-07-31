'use client';

import { Button, Card } from '@fidscript/ui';

interface Props {
  email: string;
  password: string;
  onDone: () => void;
}

export function PlatformEmailMailboxCreatedCard({ email, password, onDone }: Props) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <Card padding="lg" className="max-w-sm w-full mx-4">
        <p className="text-sm text-[var(--success)] mb-3">
          Mailbox <strong>{email}</strong> created.
        </p>
        <p className="text-xs text-[var(--text-muted)] mb-2">
          Initial password (save this — cannot be recovered):
        </p>
        <pre className="bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg p-3 text-xs font-mono break-all">
          {password}
        </pre>
        <div className="flex justify-end mt-4">
          <Button variant="primary" size="sm" onClick={onDone}>Done</Button>
        </div>
      </Card>
    </div>
  );
}
