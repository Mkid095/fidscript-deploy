import Link from 'next/link';

import { CopyCommand } from './copy-command';

/**
 * The front door.
 *
 * The platform is a **control plane**: it installs best-in-class applications
 * once and lets every project switch on only what it needs.
 */
export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-rail bg-canvas">
      <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="mb-8 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-lg border border-rail bg-surface px-3 py-1.5 text-[13px] text-text">
            Your own application cloud
          </span>
        </div>

        <h1 className="mx-auto max-w-4xl text-center text-4xl font-semibold leading-[1.05] tracking-tight text-text sm:text-6xl">
          A control plane for
          <br />
          <span className="text-accent">your own hardware</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-text-muted">
          FIDScript installs best-in-class applications once — a realtime
          backend, mail, a private package registry, WhatsApp, observability —
          and lets every project switch on only what it needs.
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-text-dim">
          The deployment engine and the mail server are part of the platform.
          Everything else you install from the applications screen, one at a
          time.
        </p>

        <div className="mt-8">
          <CopyCommand />
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/docs"
            className="rounded-md border border-accent px-5 py-2.5 text-[14px] font-medium text-text transition hover:bg-accent/10"
          >
            Read the docs
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-rail px-5 py-2.5 text-[14px] font-medium text-text-muted transition hover:border-rail-light hover:text-text"
          >
            Log in
          </Link>
        </div>
      </div>
    </section>
  );
}
