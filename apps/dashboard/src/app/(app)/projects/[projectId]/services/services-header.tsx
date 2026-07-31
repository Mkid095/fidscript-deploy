// Services page header

import { Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, RefreshIcon } from '@hugeicons/core-free-icons';

interface ServicesHeaderProps {
  loading: boolean;
  serviceCount: number;
  healthyCount: number;
  activeCount: number;
  onRefresh: () => void;
  onNewService: () => void;
}

export function ServicesHeader({ loading, serviceCount, healthyCount, activeCount, onRefresh, onNewService }: ServicesHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">Services</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          {loading ? 'Loading…' : (
            <>
              {serviceCount} service{serviceCount !== 1 ? 's' : ''}
              {healthyCount > 0 && ` · ${healthyCount} live`}
              {activeCount > 0 && <span className="text-[var(--warning)]"> · {activeCount} active</span>}
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onRefresh} className="text-[var(--text-muted)]" aria-label="Refresh">
          <HugeiconsIcon icon={RefreshIcon} size={14} />
        </Button>
        <Button variant="primary" size="sm" onClick={onNewService} className="flex items-center gap-1.5">
          <HugeiconsIcon icon={Add01Icon} size={13} /> New service
        </Button>
      </div>
    </div>
  );
}
