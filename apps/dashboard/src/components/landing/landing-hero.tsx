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
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-20 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-fire-600/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 left-10 h-[400px] w-[400px] rounded-full bg-indigo-500/5 blur-[120px]" />
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-35" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
        <div className="mb-6 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-fire-500/20 bg-fire-950/40 px-3 py-1.5 text-xs font-semibold tracking-wide text-fire-500">
            <HugeiconsIcon icon={CloudServerIcon} size={14} color="currentColor" />
            Transform any clean VPS into a private application cloud
          </span>
        </div>

        <h1 className="mx-auto max-w-3xl text-center text-4xl font-extrabold leading-none tracking-tight text-white sm:text-7xl">
          Self-Hosted Developer
          <br />
          <span className="bg-gradient-to-r from-fire-500 via-rose-500 to-fire-600 bg-clip-text text-transparent">
            Operating System
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-slate-400 sm:text-lg">
          Host applications, run realtime databases, fire edge functions, process queues, schedule
          cron, and serve mail — all on your own private hardware. Open source, fully independent,
          no vendor lock-in.
        </p>

        <div className="mt-8">
          <CopyCommand />
        </div>

        <p className="mx-auto mt-3 flex max-w-xl items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <HugeiconsIcon icon={InformationCircleIcon} size={14} color="currentColor" />
          Recommended: a fresh <span className="font-medium text-slate-400">Ubuntu 22.04 / 24.04</span> VPS with root access.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/docs"
            className="group flex items-center gap-2 rounded-xl bg-fire-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_25px_-5px_rgba(239,68,68,0.6)] transition hover:bg-fire-600"
          >
            Read the docs
            <HugeiconsIcon icon={ArrowRight02Icon} size={16} color="currentColor" className="transition group-hover:translate-x-0.5" />
          </Link>
          <a
            href="https://github.com/Mkid095/fidscript-deploy"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl border border-slate-800 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-700"
          >
            <HugeiconsIcon icon={SourceCodeIcon} size={16} color="currentColor" className="text-fire-500" /> View source
          </a>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
          {METRICS.map((m) => (
            <div key={m.label} className="glass-panel rounded-xl p-3 text-center">
              <div className="font-mono text-2xl font-bold text-white">{m.value}</div>
              <div className="mt-0.5 text-xs font-medium text-slate-300">{m.label}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{m.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
