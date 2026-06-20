'use client';

import { useState, useEffect, useRef } from 'react';
import type { FidscriptSDK } from '@fidscript/sdk';

interface PlatformEvent {
  id: string;
  type: string;
  timestamp: string;
  actorType?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

function formatEvent(event: PlatformEvent): { label: string; desc: string; time: string } {
  const parts = event.type.split('.');
  const action = parts[parts.length - 1]?.replace(/_/g, ' ') ?? event.type;
  const resource = event.resourceType ?? '';

  const label = action.charAt(0).toUpperCase() + action.slice(1);
  const desc = resource ? `${resource}: ${label.toLowerCase()}` : label.toLowerCase();
  const time = formatTime(event.timestamp);

  return { label, desc, time };
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

interface NotificationBellProps {
  projectId: string;
  sdk: FidscriptSDK;
}

export function NotificationBell({ projectId, sdk }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Load events when opened
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await (sdk.projects as any).getEvents(projectId, 20);
        if (!cancelled) setEvents(Array.isArray(data) ? data : (data.events ?? []));
      } catch {
        if (!cancelled) setError('Could not load events');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [open, projectId, sdk]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-300 hover:bg-[#1e2130] transition-colors"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {events.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0f1117] border border-[#1e2130] rounded-lg shadow-xl z-50">
          <div className="px-4 py-3 border-b border-[#1e2130] flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-200">Notifications</span>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="py-8 text-center text-sm text-slate-500">Loading…</div>
            )}
            {error && (
              <div className="py-6 px-4 text-sm text-red-400">{error}</div>
            )}
            {!loading && !error && events.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-600">No recent events</div>
            )}
            {!loading && !error && events.map(event => {
              const { label, desc, time } = formatEvent(event);
              return (
                <div
                  key={event.id}
                  className="px-4 py-3 border-b border-[#1e2130]/50 hover:bg-[#1e2130]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-slate-600 text-xs">•</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 capitalize">{desc}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{time}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
