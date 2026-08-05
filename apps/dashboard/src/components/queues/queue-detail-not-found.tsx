'use client';

import { Button } from '@fidscript/ui';

interface QueueDetailNotFoundProps {
  projectId: string;
  onBack: () => void;
}

export function QueueDetailNotFound({ onBack }: QueueDetailNotFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="text-sm text-[var(--text-dim)]">Queue not found.</p>
      <Button variant="ghost" size="sm" onClick={onBack} className="mt-3">
        Back to queues
      </Button>
    </div>
  );
}
