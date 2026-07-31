'use client';

import { useState, useEffect } from 'react';
import { describeCron, getNextRuns } from './cron-utils';

type Freq = 'minute' | 'hourly' | 'daily' | 'weekly' | 'monthly';

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const inputCls = 'bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-2 py-1 text-xs w-14 text-center';
const labelCls = 'text-[10px] text-[var(--text-muted)]';

export function CronBuilder({ value, timezone, onChange }: { value: string; timezone: string; onChange: (v: string) => void }) {
  const parts = value.trim().split(/\s+/);
  const isStandard = parts.length === 5;
  const [freq, setFreq] = useState<Freq>('daily');
  const [minute, setMinute] = useState(0);
  const [hour, setHour] = useState(0);
  const [dow, setDow] = useState(0);
  const [dom, setDom] = useState(1);

  useEffect(() => {
    if (!isStandard) return;
    const parse = (s: string) => s === '*' ? null : parseInt(s, 10);
    const [mS, hS, dS, moS, wS] = parts;
    const m = parse(mS), h = parse(hS), d = parse(dS), mo = parse(moS), w = parse(wS);
    if (value === '* * * * *') setFreq('minute');
    else if (m !== null && m % 5 === 0 && h === null && d === null && mo === null && w === null) setFreq('hourly');
    else if (d === null && mo === null && w === null) { setFreq('daily'); if (m !== null) setMinute(m); if (h !== null) setHour(h); }
    else if (d === null && mo === null) { setFreq('weekly'); if (m !== null) setMinute(m); if (h !== null) setHour(h); if (w !== null) setDow(w); }
    else if (mo === null && w === null) { setFreq('monthly'); if (m !== null) setMinute(m); if (h !== null) setHour(h); if (d !== null) setDom(d); }
    else { setFreq('daily'); if (m !== null) setMinute(m); if (h !== null) setHour(h); }
  }, [value, isStandard]);

  const buildExpr = (f: Freq, mi: number, hr: number, dowVal?: number, domVal?: number): string => {
    switch (f) {
      case 'minute': return '* * * * *';
      case 'hourly': return `${mi} * * * *`;
      case 'daily': return `${mi} ${hr} * * *`;
      case 'weekly': return `${mi} ${hr} * * ${dowVal ?? 0}`;
      case 'monthly': return `${mi} ${hr} ${domVal ?? 1} * *`;
    }
  };

  const handleFreqChange = (f: Freq) => {
    setFreq(f);
    onChange(buildExpr(f, minute, hour, dow, dom));
  };
  const handleMinuteChange = (v: number) => { setMinute(v); onChange(buildExpr(freq, v, hour, dow, dom)); };
  const handleHourChange = (v: number) => { setHour(v); onChange(buildExpr(freq, minute, v, dow, dom)); };
  const handleDowChange = (v: number) => { setDow(v); onChange(buildExpr(freq, minute, hour, v, dom)); };
  const handleDomChange = (v: number) => { setDom(v); onChange(buildExpr(freq, minute, hour, dow, v)); };

  const previewRuns = isStandard ? getNextRuns(value, 3) : [];
  const description = describeCron(value);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(['minute','hourly','daily','weekly','monthly'] as Freq[]).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => handleFreqChange(f)}
            className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${
              freq === f
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                : 'border-[var(--rail)] text-[var(--text-muted)] hover:border-[var(--accent)]'
            }`}
          >
            {f === 'minute' ? 'Every min' : f === 'hourly' ? 'Hourly' : f === 'daily' ? 'Daily' : f === 'weekly' ? 'Weekly' : 'Monthly'}
          </button>
        ))}
      </div>

      {freq !== 'minute' && (
        <div className="flex flex-wrap items-center gap-3">
          {freq === 'hourly' && (
            <span className="flex items-center gap-1">
              <span className={labelCls}>minute</span>
              <input type="number" min={0} max={59} value={minute} onChange={e => handleMinuteChange(parseInt(e.target.value) || 0)} className={inputCls} />
            </span>
          )}
          {(freq === 'daily' || freq === 'weekly' || freq === 'monthly') && (
            <>
              <span className="flex items-center gap-1">
                <span className={labelCls}>hour</span>
                <input type="number" min={0} max={23} value={hour} onChange={e => handleHourChange(parseInt(e.target.value) || 0)} className={inputCls} />
              </span>
              <span className="flex items-center gap-1">
                <span className={labelCls}>min</span>
                <input type="number" min={0} max={59} value={minute} onChange={e => handleMinuteChange(parseInt(e.target.value) || 0)} className={inputCls} />
              </span>
            </>
          )}
          {freq === 'weekly' && (
            <span className="flex items-center gap-1">
              <span className={labelCls}>day</span>
              <select value={dow} onChange={e => handleDowChange(parseInt(e.target.value))}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-1.5 py-1 text-xs">
                {DOW_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
              </select>
            </span>
          )}
          {freq === 'monthly' && (
            <span className="flex items-center gap-1">
              <span className={labelCls}>day of month</span>
              <input type="number" min={1} max={31} value={dom} onChange={e => handleDomChange(parseInt(e.target.value) || 1)} className={inputCls} />
            </span>
          )}
        </div>
      )}

      <div className="rounded border border-[var(--rail)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs text-[var(--text)]">
        <span className="text-[var(--text-muted)]">{description}</span>
        <span className="ml-3 text-[var(--accent)]">{value || '—'}</span>
      </div>

      {previewRuns.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-[var(--text-muted)] font-medium">Next runs</span>
          {previewRuns.map((r, i) => (
            <span key={i} className="text-[10px] text-[var(--text-dim)] font-mono">
              {r.toLocaleDateString()} {r.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
