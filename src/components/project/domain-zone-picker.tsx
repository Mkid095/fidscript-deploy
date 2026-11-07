'use client';

import { useEffect, useState, useTransition } from 'react';

import { browserApi } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/feedback';

import { addDomainAction } from '@/app/(project)/projects/[projectId]/domains/actions';

interface Zone {
  id: string;
  name: string;
  status: string;
}

/**
 * The domain, out of the account that holds it.
 *
 * The zones in the connected account are scanned, and the person picks the
 * one they want — then whether the application answers on the domain itself
 * or on a subdomain of it.
 *
 * With the account connected, the platform writes the records itself.
 */
export function DomainZonePicker({ projectId }: { projectId: string }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [zone, setZone] = useState('');
  const [kind, setKind] = useState<'domain' | 'subdomain'>('domain');
  const [subdomain, setSubdomain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    browserApi
      .get<{ zones?: Zone[] }>(`/projects/${projectId}/domains/connect-cloudflare/zones`)
      .then((response) => {
        if (cancelled) return;
        const found = response.zones ?? [];
        setZones(found);
        if (found[0]) setZone(found[0].name);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'The zones could not be read.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const domain = kind === 'domain' ? zone : subdomain ? `${subdomain}.${zone}` : '';

  const add = () => {
    setError(null);
    setAdded(null);
    startTransition(async () => {
      const result = await addDomainAction(projectId, {
        domain,
        type: ['DEPLOYMENT'],
        mode: 'auto',
      });
      if (result.error) setError(result.error);
      else setAdded(domain);
    });
  };

  if (loading) {
    return <p className="px-4 py-6 text-sm text-text-muted">Looking at your domains…</p>;
  }

  if (zones.length === 0) {
    return (
      <div className="px-4 py-6">
        <p className="text-sm text-text-muted">
          The connected account has no domains in it — or the token cannot see them. A domain has
          to be in the account for the platform to write its records.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-4 p-4">
      <Select
        label="The domain"
        value={zone}
        onChange={(event) => setZone(event.target.value)}
        options={zones.map((entry) => ({ value: entry.name, label: entry.name }))}
      />

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-text-muted">What answers on it</legend>
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-rail bg-surface-2 p-3">
          <input
            type="radio"
            name="kind"
            className="mt-0.5 size-3.5 accent-[var(--accent)]"
            checked={kind === 'domain'}
            onChange={() => setKind('domain')}
          />
          <span>
            <span className="block text-sm text-text">The domain itself</span>
            <span className="mt-0.5 block text-xs text-text-dim">
              {zone} answers for the application.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-rail bg-surface-2 p-3">
          <input
            type="radio"
            name="kind"
            className="mt-0.5 size-3.5 accent-[var(--accent)]"
            checked={kind === 'subdomain'}
            onChange={() => setKind('subdomain')}
          />
          <span>
            <span className="block text-sm text-text">A subdomain of it</span>
            <span className="mt-0.5 block text-xs text-text-dim">
              The domain stays free for something else.
            </span>
          </span>
        </label>
      </fieldset>

      {kind === 'subdomain' ? (
        <Input
          label="The subdomain"
          placeholder="app"
          value={subdomain}
          onChange={(event) => setSubdomain(event.target.value)}
          hint={`The application will answer on ${subdomain || '…'}.${zone}`}
        />
      ) : null}

      {error ? <ErrorState message={error} /> : null}
      {added ? (
        <p className="rounded-md border border-success/40 bg-success/5 p-3 text-xs text-success">
          {added} was added. The platform is writing its records now.
        </p>
      ) : null}

      <Button variant="primary" onClick={add} loading={pending} disabled={!domain}>
        Add it
      </Button>
    </div>
  );
}
