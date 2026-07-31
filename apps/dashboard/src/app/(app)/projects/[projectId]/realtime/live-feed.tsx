'use client';

/**
 * LiveFeed — the realtime hero.
 *
 * Opens the platform WebSocket, subscribes to the project's event room, and
 * streams every platform event (deployment state changes, realtime-enabled DB
 * row changes, channel events, …) into a live, filterable, auto-scrolling feed.
 *
 * This is the prove-it surface for realtime: if the platform emits it, it lands
 * here within milliseconds. The connection owns its own lifecycle (connect on
 * mount, disconnect on unmount) so the rest of the page stays simple.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  FlashIcon, Rocket01Icon, Database01Icon, SourceCodeIcon, Share08Icon,
  Clock01Icon, Mail01Icon, HardDriveIcon, Cancel01Icon, PauseIcon,
  PlayCircleIcon, Delete01Icon, ArrowDown01Icon, ChevronDownIcon,
} from '@hugeicons/core-free-icons';
import { Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';

type Status = 'connecting' | 'connected' | 'disconnected';

interface LiveEvent {
  id: string;
  type: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

interface Category {
  label: string;
  icon: typeof FlashIcon;
  cls: string; // tailwind classes for badge
  dot: string; // connection/row accent
}

// Event type prefix → category. The prefix is everything before the first dot.
const CATEGORIES: Record<string, Category> = {
  deployments: { label: 'Deploy', icon: Rocket01Icon, cls: 'text-blue-300 bg-blue-500/10 border-blue-500/25', dot: 'bg-blue-400' },
  database:    { label: 'Database', icon: Database01Icon, cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25', dot: 'bg-emerald-400' },
  realtime:    { label: 'Realtime', icon: FlashIcon, cls: 'text-violet-300 bg-violet-500/10 border-violet-500/25', dot: 'bg-violet-400' },
  functions:   { label: 'Function', icon: SourceCodeIcon, cls: 'text-amber-300 bg-amber-500/10 border-amber-500/25', dot: 'bg-amber-400' },
  queues:      { label: 'Queue', icon: Share08Icon, cls: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/25', dot: 'bg-cyan-400' },
  cron:        { label: 'Scheduler', icon: Clock01Icon, cls: 'text-pink-300 bg-pink-500/10 border-pink-500/25', dot: 'bg-pink-400' },
  email:       { label: 'Email', icon: Mail01Icon, cls: 'text-orange-300 bg-orange-500/10 border-orange-500/25', dot: 'bg-orange-400' },
  storage:     { label: 'Storage', icon: HardDriveIcon, cls: 'text-teal-300 bg-teal-500/10 border-teal-500/25', dot: 'bg-teal-400' },
};

const FALLBACK: Category = { label: 'Event', icon: FlashIcon, cls: 'text-slate-300 bg-slate-500/10 border-slate-500/25', dot: 'bg-slate-400' };

function categoryOf(type: string): { key: string; cat: Category } {
  const key = (type.split('.')[0] ?? '').toLowerCase();
  return { key, cat: CATEGORIES[key] ?? FALLBACK };
}

function summarize(ev: LiveEvent): string {
  const d = ev.data ?? {};
  switch (ev.type) {
    case 'database.row.changed': {
      const op = (d.operation as string) || 'CHANGE';
      const tbl = d.table ? `${d.schema ?? 'public'}.${d.table}` : '';
      return `${op} ${tbl}`.trim();
    }
    default: {
      if (d.deploymentId) return `deployment ${String(d.deploymentId).slice(0, 8)}`;
      if (d.name) return String(d.name);
      return ev.type.split('.').slice(-1)[0] ?? ev.type;
    }
  }
}

const MAX_EVENTS = 250;

export function LiveFeed({ projectId }: { projectId: string }) {
  const { getSdk } = useAuth();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [status, setStatus] = useState<Status>('connecting');
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // Connect the realtime socket + subscribe to the project event room.
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    let seq = 0;

    (async () => {
      const sdk = getSdk() as unknown as {
        realtime?: {
          connect(token: string | (() => string), projectId?: string): Promise<void>;
          subscribeProject(projectId: string, handler: (e: unknown) => void): () => void;
          disconnect(): void;
        };
      };
      const rt = sdk.realtime;
      if (!rt) { setStatus('disconnected'); return; }
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '')
        : '';
      if (!token) { setStatus('disconnected'); return; }

      try {
        setStatus('connecting');
        await rt.connect(() => localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '', projectId);
        if (cancelled) { rt.disconnect(); return; }
        setStatus('connected');
        unsub = rt.subscribeProject(projectId, (raw) => {
          if (pausedRef.current) return;
          const e = raw as { type?: string; timestamp?: string; data?: Record<string, unknown> };
          if (!e?.type) return;
          const item: LiveEvent = {
            id: `${Date.now()}-${seq++}`,
            type: e.type,
            timestamp: e.timestamp ?? new Date().toISOString(),
            data: e.data,
          };
          setEvents(prev => {
            const next = [...prev, item];
            return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
          });
        });
      } catch {
        if (!cancelled) setStatus('disconnected');
      }
    })();

    return () => {
      cancelled = true;
      try { unsub?.(); } catch { /* */ }
      try { (getSdk() as any).realtime?.disconnect?.(); } catch { /* */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Auto-scroll to newest when new events arrive (unless paused or user scrolled up).
  useEffect(() => {
    if (paused || !atBottom) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events, paused, atBottom]);

  const presentCategories = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) set.add(categoryOf(e.type).key);
    return Array.from(set).sort();
  }, [events]);

  const filtered = useMemo(
    () => (filter === 'all' ? events : events.filter(e => categoryOf(e.type).key === filter)),
    [events, filter],
  );

  const statusMeta: Record<Status, { label: string; dot: string; text: string; ring: string }> = {
    connected: { label: 'Live', dot: 'bg-emerald-400', text: 'text-emerald-300', ring: 'shadow-[0_0_0_3px_rgba(16,185,129,0.15)]' },
    connecting: { label: 'Connecting', dot: 'bg-amber-400', text: 'text-amber-300', ring: '' },
    disconnected: { label: 'Disconnected', dot: 'bg-rose-400', text: 'text-rose-300', ring: '' },
  };
  const sm = statusMeta[status];

  function jumpToLatest() {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setAtBottom(true);
  }

  return (
    <section className="rounded-xl border border-[var(--rail)] bg-[var(--surface-2)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--rail)] flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className={`relative flex h-2.5 w-2.5 ${status === 'connected' ? '' : ''}`}>
            {status === 'connected' && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/60 animate-ping" />
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${sm.dot} ${status === 'connected' ? sm.ring : ''}`} />
          </span>
          <h2 className="text-sm font-semibold text-[var(--text)]">Live event stream</h2>
          <span className={`text-[11px] font-medium ${sm.text}`}>{sm.label}</span>
          <span className="text-[11px] text-[var(--text-dim)]">{events.length} this session</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPaused(p => !p)}
            title={paused ? 'Resume stream' : 'Pause stream'}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
              paused ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                     : 'border-[var(--rail-light)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--rail)]'
            }`}
          >
            <HugeiconsIcon icon={paused ? PlayCircleIcon : PauseIcon} size={13} />
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => { setEvents([]); setFilter('all'); }}
            title="Clear"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-[var(--rail-light)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--rail)] transition-colors"
          >
            <HugeiconsIcon icon={Delete01Icon} size={13} />
          </button>
        </div>
      </div>

      {/* Category filter */}
      {presentCategories.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[var(--rail)] overflow-x-auto">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label={`All (${events.length})`} />
          {presentCategories.map(key => {
            const cat = CATEGORIES[key] ?? FALLBACK;
            const count = events.filter(e => categoryOf(e.type).key === key).length;
            return (
              <FilterChip
                key={key}
                active={filter === key}
                onClick={() => setFilter(key)}
                label={`${cat.label} (${count})`}
                accent={cat.cls}
              />
            );
          })}
        </div>
      )}

      {/* Feed */}
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={() => {
            const el = scrollRef.current;
            if (!el) return;
            setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
          }}
          className="h-[440px] overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-2">
              {status === 'connecting' ? (
                <><Spinner size="md" /><p className="text-xs text-[var(--text-muted)]">Connecting to realtime…</p></>
              ) : status === 'disconnected' ? (
                <>
                  <HugeiconsIcon icon={Cancel01Icon} size={22} className="text-rose-400" />
                  <p className="text-xs text-[var(--text-muted)]">Couldn&apos;t connect to the realtime socket.</p>
                  <p className="text-[11px] text-[var(--text-dim)]">Reload the page to retry.</p>
                </>
              ) : paused ? (
                <p className="text-xs text-[var(--text-muted)]">Stream paused — resume to capture new events.</p>
              ) : (
                <>
                  <HugeiconsIcon icon={FlashIcon} size={22} className="text-[var(--text-dim)]" />
                  <p className="text-xs text-[var(--text-muted)]">Waiting for events.</p>
                  <p className="text-[11px] text-[var(--text-dim)] max-w-xs">
                    Trigger a deploy, or mutate a realtime-enabled table — events will stream here in real time.
                  </p>
                </>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-[var(--rail)]/50 font-mono">
              {filtered.map(ev => {
                const { cat } = categoryOf(ev.type);
                const isOpen = expanded === ev.id;
                return (
                  <li key={ev.id}>
                    <button
                      onClick={() => setExpanded(isOpen ? null : ev.id)}
                      className="w-full flex items-start gap-3 px-4 py-2 hover:bg-[var(--rail)]/30 text-left transition-colors"
                    >
                      <span className="text-[11px] text-[var(--text-dim)] mt-0.5 w-16 flex-shrink-0">
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour12: false })}
                      </span>
                      <span className={`flex-shrink-0 mt-0.5 inline-flex items-center gap-1 text-[10px] font-sans font-medium uppercase tracking-wide px-1.5 py-0.5 rounded border ${cat.cls}`}>
                        <HugeiconsIcon icon={cat.icon} size={11} />
                        {cat.label}
                      </span>
                      <span className="text-xs text-[var(--text)] flex-1 min-w-0 truncate">{summarize(ev)}</span>
                      <span className="text-[10px] text-[var(--text-dim)] flex-shrink-0 mt-0.5 hidden sm:block">{ev.type}</span>
                      <HugeiconsIcon
                        icon={ChevronDownIcon}
                        size={12}
                        className={`flex-shrink-0 mt-1 text-[var(--text-dim)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <pre className="mx-4 mb-2 px-3 py-2 rounded-md bg-[#0a0c12] border border-[var(--rail)] text-[11px] leading-relaxed text-[var(--text-muted)] overflow-x-auto">
{JSON.stringify({ type: ev.type, timestamp: ev.timestamp, data: ev.data ?? {} }, null, 2)}
                      </pre>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {!atBottom && filtered.length > 0 && (
          <button
            onClick={jumpToLatest}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[var(--accent)] text-white shadow-lg hover:opacity-90 transition-opacity"
          >
            <HugeiconsIcon icon={ArrowDown01Icon} size={12} /> Latest
          </button>
        )}
      </div>
    </section>
  );
}

function FilterChip({ active, onClick, label, accent }: { active: boolean; onClick: () => void; label: string; accent?: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full border transition-colors ${
        active
          ? (accent ?? 'bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)]')
          : 'border-[var(--rail-light)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--rail)]'
      }`}
    >
      {label}
    </button>
  );
}
