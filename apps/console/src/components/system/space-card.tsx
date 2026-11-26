'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Card, SectionHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import type { SpaceReport } from '@/lib/api/metrics';
import { reclaimSpaceAction } from '@/app/(platform)/system/actions';

/**
 * Where the machine's disk goes — and the hand that safely gets some back.
 *
 * It shows the Docker daemon's own report, including its honest
 * "reclaimable" column. The reclaim button only ever touches what the
 * daemon calls reclaimable; it will happily report "0B" when the caches
 * are the live image store, because that is the truth.
 */
export function SpaceCard({ report }: { report: SpaceReport | null }) {
  if (!report) return null;
  return <SpaceCardInner report={report} />;
}

function SpaceCardInner({ report }: { report: SpaceReport }) {
  const [lastReclaim, setLastReclaim] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const disk = report.disk;
  const docker = report.docker;
  const reclaimable =
    docker.images.reclaimable +
    docker.buildCache.reclaimable +
    docker.containers.reclaimable +
    docker.volumes.reclaimable;

  const reclaim = () => {
    startTransition(async () => {
      const result = await reclaimSpaceAction();
      if (result.error) {
        toast.error('The space could not be reclaimed.', result.error);
        return;
      }
      setLastReclaim(result.reclaimedBytes ?? 0);
      toast.success(
        'The sweep is done.',
        `${fmtBytes(result.reclaimedBytes ?? 0)} came back to the machine.`,
      );
    });
  };

  return (
    <section>
      <SectionHeader
        title="The disk"
        description="Where the machine's space goes, and what can honestly come back."
        actions={
          <div className="flex items-center gap-2">
            {lastReclaim !== null ? (
              <span className="text-xs text-text-dim">
                Last sweep freed {fmtBytes(lastReclaim)}
              </span>
            ) : null}
            <Button variant="secondary" size="sm" onClick={reclaim} loading={pending}>
              Reclaim space
            </Button>
          </div>
        }
      />
      <Card className="divide-y divide-rail p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text">Root filesystem</p>
            <p className="mt-0.5 text-xs text-text-dim">
              {fmtBytes(disk.used)} of {fmtBytes(disk.total)} — {disk.usedPercent}%
            </p>
          </div>
          <Badge
            tone={
              disk.usedPercent >= 90
                ? 'danger'
                : disk.usedPercent >= 75
                  ? 'warning'
                  : 'success'
            }
          >
            {disk.usedPercent}% used
          </Badge>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text">Reclaimable now</p>
            <p className="mt-0.5 text-xs text-text-dim">
              What the Docker daemon itself can safely let go of.
            </p>
          </div>
          <Badge tone={reclaimable > 0 ? 'accent' : 'neutral'}>
            {fmtBytes(reclaimable)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          <SpaceRow label="Images" cat={docker.images} />
          <SpaceRow label="Build cache" cat={docker.buildCache} />
          <SpaceRow label="Containers" cat={docker.containers} />
          <SpaceRow label="Volumes" cat={docker.volumes} />
        </div>

        {reclaimable === 0 ? (
          <p className="border-t border-rail px-4 py-3 text-xs text-text-dim">
            Nothing is safely reclaimable right now. That usually means the
            space is the live image store or data the platform keeps on
            purpose — reclaiming more would take the running sites down. If
            the disk still climbs, it is data growth, not Docker waste.
          </p>
        ) : null}
      </Card>
    </section>
  );
}

function SpaceRow({
  label,
  cat,
}: {
  label: string;
  cat: { total: number; reclaimable: number };
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-text">{label}</span>
        <span className="text-xs text-text-dim">{fmtBytes(cat.total)}</span>
      </div>
      {cat.reclaimable > 0 ? (
        <p className="mt-0.5 text-[11px] text-text-dim">
          {fmtBytes(cat.reclaimable)} reclaimable
        </p>
      ) : (
        <p className="mt-0.5 text-[11px] text-text-dim">all in use</p>
      )}
    </div>
  );
}

function fmtBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0B';
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} MB`;
  return `${Math.ceil(n / 1024)} KB`;
}
