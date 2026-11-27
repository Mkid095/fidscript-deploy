'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { Button, Card, ErrorState, Page } from '@/components/ui';

interface Check {
  id: string;
  name: string;
  category: string;
  status: 'pass' | 'fail' | 'warn' | 'unknown';
  source: 'verified' | 'observed';
  detail: string;
  remediation?: string;
}

interface Report {
  domain: string;
  checks: Check[];
}

/**
 * The Mail Health & Deliverability report.
 *
 * Every row is something the server just did: a DNS lookup, a TLS
 * handshake, a blocklist query. The status is what that returned, not what
 * the configuration says it will do. The banner makes the one guarantee no
 * report can make — inbox placement — explicitly out of scope.
 */
export function HealthReport() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetch('/api/health');
    const body = (await response.json().catch(() => ({}))) as {
      reports?: Report[];
      error?: string;
    };
    if (!response.ok) {
      setError(body.error ?? 'The report did not come back.');
    } else {
      setReports(body.reports ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dot: Record<Check['status'], string> = {
    pass: 'bg-success',
    fail: 'bg-danger',
    warn: 'bg-warning',
    unknown: 'bg-text-dim',
  };

  return (
    <Page
      title="Mail Health & Deliverability"
      description="Live checks against the network, run moments ago."
      width="wide"
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} loading={loading}>
          Re-check
        </Button>
      }
    >
      <div className="rounded-lg border border-rail bg-surface-2 p-3 text-xs leading-relaxed text-text-muted">
        These are <strong>verified configuration</strong> checks — what the DNS,
        certificates and blocklists say right now. They do not predict{' '}
        <strong>inbox placement</strong>: that belongs to every receiving
        provider, and no system can guarantee it. A passing report means
        the foundations are in place, not that every message will land in
        the inbox.
      </div>

      {error ? <ErrorState message={error} /> : null}

      {reports.map((report) => (
        <Card key={report.domain} title={report.domain} className="mt-4">
          <ul className="divide-y divide-rail">
            {report.checks.map((check) => (
              <li key={check.id} className="flex items-start gap-3 py-2.5">
                <span
                  className={`mt-1 size-2 shrink-0 rounded-full ${dot[check.status]}`}
                  title={check.status}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text">{check.name}</span>
                    <span className="text-xs text-text-dim">
                      {check.source === 'verified' ? 'verified' : 'observed'}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted">{check.detail}</p>
                  {check.remediation ? (
                    <p className="mt-1 text-xs text-accent">→ {check.remediation}</p>
                  ) : null}
                </div>
                <span
                  className={`text-xs font-medium ${
                    check.status === 'pass'
                      ? 'text-success'
                      : check.status === 'fail'
                        ? 'text-danger'
                        : check.status === 'warn'
                          ? 'text-warning'
                          : 'text-text-dim'
                  }`}
                >
                  {check.status}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      {reports.length === 0 && !loading ? (
        <p className="text-sm text-text-dim">
          No domains to check yet. Add one in the admin area first.
        </p>
      ) : null}

      <div className="mt-2">
        <Link href="/admin" className="text-sm text-accent hover:underline">
          Back to admin
        </Link>
      </div>
    </Page>
  );
}
