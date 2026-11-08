'use client';

import { useEffect, useState } from 'react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/feedback';

interface InstallationStatus {
  lifecycle: string;
  lastOperation?: {
    id: string;
    status: string;
    currentStep?: string | null;
    steps?: Array<{ step: string; success?: boolean; result?: unknown }>;
  } | null;
}

/**
 * The install, while it happens.
 *
 * The platform's own steps — the DNS, the proxy, the certificate, the mail
 * and the health — and what each of them did.
 */
export function SetupInstallStep({ operationId }: { operationId: string }) {
  const [status, setStatus] = useState<InstallationStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const response = await fetch('/console/api/v1/installation/status', {
          cache: 'no-store',
        });
        const body = (await response.json()) as InstallationStatus;
        if (cancelled) return;
        setStatus(body);

        const done =
          body.lastOperation?.status === 'COMPLETED' ||
          body.lastOperation?.status === 'FAILED';
        if (!done) timer = setTimeout(poll, 2000);
      } catch {
        if (!cancelled) timer = setTimeout(poll, 4000);
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [operationId]);

  const operation = status?.lastOperation;
  const steps = operation?.steps ?? [];
  const running =
    operation?.status === 'RUNNING' || operation?.status === 'PENDING';

  return (
    <Card className="max-w-xl space-y-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text">The install</h2>
        <Badge
          tone={
            operation?.status === 'FAILED'
              ? 'danger'
              : running
                ? 'warning'
                : 'success'
          }
        >
          {(operation?.status ?? 'starting').toLowerCase()}
        </Badge>
      </div>

      <ul className="space-y-1.5">
        {steps.length === 0 ? (
          <li className="text-xs text-text-dim">Starting…</li>
        ) : (
          steps.map((step) => (
            <li
              key={step.step}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-sm capitalize text-text">{step.step}</span>
              <span
                className={`text-xs ${
                  step.success
                    ? 'text-success'
                    : step.success === false
                      ? 'text-danger'
                      : 'text-text-dim'
                }`}
              >
                {step.success
                  ? 'done'
                  : step.success === false
                    ? 'failed'
                    : 'waiting'}
              </span>
            </li>
          ))
        )}
      </ul>

      {operation?.currentStep ? (
        <p className="text-xs text-text-dim">On {operation.currentStep}…</p>
      ) : null}
    </Card>
  );
}
