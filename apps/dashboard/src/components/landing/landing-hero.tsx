import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { CloudServerIcon, ArrowRight02Icon, SourceCodeIcon, InformationCircleIcon } from '@hugeicons/core-free-icons';

import { CopyCommand } from './copy-command';

const METRICS = [
  { label: 'Services', value: '11', sub: 'one stack' },
  { label: 'Runtime cost', value: '$12', sub: '/mo VPS' },
  { label: 'Vendor lock-in', value: '0', sub: 'your hardware' },
  { label: 'License', value: 'OSS', sub: 'self-hosted' },
];

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-black">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-28">
        <div className="mb-8 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--rail)] px-3 py-1.5 text-[13px] text-[var(--text)]">
            <HugeiconsIcon icon={CloudServerIcon} size={14} className="text-[var(--accent)]" />
            Transform any VPS into a private application cloud
          </span>
        </div>
        <h1 className="mx-auto max-w-3xl text-center text-5xl font-semibold leading-none tracking-tight text-[var(--text)] sm:text-7xl" style={{ letterSpacing: '-0.05em' }}>
          Self-hosted<br /><span className="text-[var(--text-muted)]">developer cloud</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-[var(--text-muted)]">
          Deploy applications, run realtime databases, fire edge functions, process queues, schedule cron, and serve mail — all on your own private hardware. Open source, fully independent, zero vendor lock-in.
        </p>
        <div className="mt-8"><CopyCommand /></div>
        <p className="mx-auto mt-3 flex max-w-xl items-center justify-center gap-1.5 text-center text-[13px] text-[var(--text-dim)]">
          <HugeiconsIcon icon={InformationCircleIcon} size={14} className="text-[var(--text-dim)]" />
          Recommended: a fresh <span className="font-medium text-[var(--text-muted)]">Ubuntu 22.04 / 24.04</span> VPS with root access.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/docs" className="group flex items-center gap-2 rounded-md border border-[var(--accent)] px-5 py-2.5 text-[14px] font-medium text-[var(--text)] transition hover:bg-[var(--accent)]/10">
            Read the docs <HugeiconsIcon icon={ArrowRight02Icon} size={15} className="transition group-hover:translate-x-0.5" />
          </Link>
          <a href="https://github.com/Mkid095/fidscript-deploy" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-2.5 text-[14px] font-medium text-[var(--text)] transition hover:text-[var(--text)]">
            <HugeiconsIcon icon={SourceCodeIcon} size={15} className="text-[var(--text-dim)]" /> View source
          </a>
        </div>
        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
          {METRICS.map((m) => (
            <div key={m.label} className="rounded-xl border border-[var(--rail)] p-4 text-center">
              <div className="font-mono text-2xl font-semibold text-[var(--text)]">{m.value}</div>
              <div className="mt-1 text-[13px] font-medium text-[var(--text-muted)]">{m.label}</div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-dim)]">{m.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
