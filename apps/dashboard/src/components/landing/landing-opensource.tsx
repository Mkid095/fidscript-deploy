import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { OpenSourceIcon, SquareLock01Icon, GitBranchIcon, ArrowRight02Icon } from '@hugeicons/core-free-icons';

const PILLARS = [
  {
    icon: OpenSourceIcon,
    title: 'Open source',
    desc: 'No black boxes. Every service is auditable code you can read, fork, and extend. Your platform is yours.',
  },
  {
    icon: SquareLock01Icon,
    title: 'Your data, your box',
    desc: 'Databases, files, mail, and secrets never leave your VPS. No third party sees your traffic or your users.',
  },
  {
    icon: GitBranchIcon,
    title: 'No lock-in',
    desc: 'Standard Postgres, MinIO, NATS, Redis, Docker, Traefik. Fork it, migrate away anytime — nothing is proprietary.',
  },
];

export function LandingOpenSource() {
  return (
    <section id="opensource" className="relative overflow-hidden border-y border-slate-900 bg-ink-900/40">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-20" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fire-600/5 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built for people who <span className="text-fire-500">don&apos;t rent their infrastructure</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
            FIDScript exists so a single developer can run a real platform — not a dependency on someone else&apos;s.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="glass-panel rounded-xl p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-fire-500/20 bg-fire-500/10 text-fire-500">
                <HugeiconsIcon icon={p.icon} size={20} color="currentColor" />
              </div>
              <h3 className="mb-1.5 font-semibold text-white">{p.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <p className="font-mono text-sm text-slate-500">$ ssh root@your-vps · one command · your cloud is live</p>
          <Link
            href="/docs"
            className="group flex items-center gap-2 rounded-xl bg-fire-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_-5px_rgba(239,68,68,0.6)] transition hover:bg-fire-600"
          >
            Read the installation guide
            <HugeiconsIcon icon={ArrowRight02Icon} size={16} color="currentColor" className="transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
