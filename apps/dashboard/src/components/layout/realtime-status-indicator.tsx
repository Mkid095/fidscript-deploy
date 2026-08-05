'use client';

/**
 * RealtimeStatusIndicator — global, project-scoped realtime connection dot.
 *
 * Single source of truth for whether the SDK realtime socket is currently
 * reachable. Mounted once in the project header; every panel that subscribes
 * shares the same socket, so a single indicator matches reality.
 *
 * Implementation note: the SDK does not yet expose a status callback, so we
 * sample `rt.isConnected` once a second. The probe is cheap and side-effect free.
 */
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

export type RealtimeIndicatorState = 'idle' | 'connected' | 'disconnected';

const META: Record<RealtimeIndicatorState, { dot: string; text: string; label: string; title: string }> = {
  idle:         { dot: 'bg-slate-500',  text: 'text-[var(--text-dim)]',   label: 'Realtime',  title: 'Realtime not yet opened on this page' },
  connected:    { dot: 'bg-emerald-400',text: 'text-emerald-300',         label: 'Live',      title: 'Realtime gateway connected' },
  disconnected: { dot: 'bg-rose-400',   text: 'text-rose-300',            label: 'Polling',   title: 'Realtime gateway unreachable — pages are falling back to polling' },
};

export function RealtimeStatusIndicator() {
  const { getSdk } = useAuth();
  const [state, setState] = useState<RealtimeIndicatorState>('idle');

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      try {
        const sdk = getSdk() as unknown as { realtime?: { isConnected?: boolean } };
        const connected = !!sdk.realtime?.isConnected;
        if (cancelled) return;
        setState(connected ? 'connected' : 'disconnected');
      } catch {
        if (!cancelled) setState('disconnected');
      }
    };
    tick();
    const id = setInterval(tick, 2_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [getSdk]);

  const m = META[state];

  return (
    <button
      type="button"
      title={m.title}
      aria-label={m.title}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-[var(--text-muted)] hover:bg-[var(--hover)] transition-colors"
    >
      <span className="relative flex h-2 w-2">
        {state === 'connected' && (
          <span className={`absolute inline-flex h-full w-full rounded-full ${m.dot} opacity-60 animate-ping`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${m.dot}`} />
      </span>
      <span className={`hidden sm:inline ${m.text}`}>{m.label}</span>
    </button>
  );
}
