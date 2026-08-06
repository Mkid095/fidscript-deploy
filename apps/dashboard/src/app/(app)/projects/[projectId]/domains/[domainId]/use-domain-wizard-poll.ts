'use client';

import { useEffect, useState } from 'react';
import type { Domain } from '@fidscript-deploy/sdk';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 40; // 40 × 3s = 120s = 2 minutes

/**
 * Auto-polls the domain record after add so the wizard advances from
 * "records" → "verify" the moment DNS propagates.
 *
 * The server creates the domain in a PENDING state and the reconciliation
 * scheduler updates dnsStatus once records are detected. We poll every 3s
 * for up to 2 minutes, stopping on ACTIVE (advance) or FAILED (surface).
 */
export function useDomainWizardPoll({
  active,
  domainId,
  getSdk,
}: {
  active: boolean;
  domainId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSdk: () => any;
}) {
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domain, setDomain] = useState<Domain | null>(null);
  const [reachedActive, setReachedActive] = useState(false);

  useEffect(() => {
    if (!active) {
      setReachedActive(false);
      return;
    }
    setPolling(true);
    setError(null);
    setReachedActive(false);
    let cancelled = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (cancelled) return;
      if (attempt >= POLL_MAX_ATTEMPTS) {
        setPolling(false);
        setError('Verification timed out — DNS records have not propagated yet.');
        return;
      }
      attempt += 1;
      try {
        const fresh = await getSdk().domains.get(domainId) as Domain | null;
        if (cancelled) return;
        if (fresh) setDomain(fresh);
        const status = fresh?.dnsStatus;
        if (status === 'ACTIVE') {
          setPolling(false);
          setReachedActive(true);
          return;
        }
        if (status === 'FAILED') {
          setPolling(false);
          setError('DNS verification failed — check that the records are correctly configured.');
          return;
        }
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      } catch {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      }
    }

    timer = setTimeout(tick, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [active, domainId, getSdk]);

  return { polling, error, domain, reachedActive };
}