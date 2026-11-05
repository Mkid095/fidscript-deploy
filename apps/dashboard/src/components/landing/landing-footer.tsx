import Link from 'next/link';
import Image from 'next/image';
import { HugeiconsIcon } from '@hugeicons/react';
import { SourceCodeIcon } from '@hugeicons/core-free-icons';

// Every link goes somewhere real. A footer's job is to be a map, and a
// link that goes nowhere is worse than no link.
const COLS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: 'Platform',
    links: [
      { label: 'Deployments', href: '/docs/deploy-an-app' },
      { label: 'Databases', href: '/docs/databases' },
      { label: 'Edge functions', href: '/docs/edge-functions' },
      { label: 'Queues', href: '/docs/queues' },
      { label: 'Scheduler', href: '/docs/scheduler' },
      { label: 'Email', href: '/docs/email' },
      { label: 'Storage', href: '/docs/storage' },
      { label: 'Domains & TLS', href: '/docs/domains' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Getting started', href: '/docs/getting-started' },
      { label: 'Installation', href: '/docs/installation' },
      { label: 'Monitoring', href: '/docs/monitoring' },
      { label: 'MCP & AI agents', href: '/docs/ai-mcp' },
      { label: 'Log in', href: '/login' },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'GitHub', href: 'https://github.com/Mkid095/fidscript-deploy', external: true },
      { label: 'Changelog', href: 'https://github.com/Mkid095/fidscript-deploy/blob/main/CHANGELOG.md', external: true },
      { label: 'License (OSS)', href: 'https://github.com/Mkid095/fidscript-deploy/blob/main/LICENSE', external: true },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--rail)] bg-[var(--canvas)]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Image
                src="/logo.png"
                alt="FIDScript"
                width={28}
                height={28}
                className="rounded"
              />
              <div>
                <p className="text-xs font-bold tracking-widest text-[var(--warning)] uppercase leading-none">fidscript deploy</p>
                <p className="text-xs text-[var(--text-dim)] leading-none mt-0.5">by NextMavens</p>
              </div>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-[var(--text-dim)]">
              The self-hosted developer operating system. Open source. Run it on any VPS.
            </p>
          </div>

          {COLS.map((c) => (
            <div key={c.title}>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{c.title}</h4>
              <ul className="space-y-2">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noreferrer" className="text-xs text-[var(--text-dim)] transition hover:text-[var(--accent)]">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="text-xs text-[var(--text-dim)] transition hover:text-[var(--accent)]">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[var(--rail)] pt-6 sm:flex-row">
          <p className="text-xs text-[var(--text-dim)]">
            © {new Date().getFullYear()} FIDScript · A <span className="font-medium text-[var(--text-muted)]">NextMavens</span> project · MIT-style open source
          </p>
          <a
            href="https://github.com/Mkid095/fidscript-deploy"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-[var(--text-dim)] transition hover:text-[var(--text)]"
          >
            <HugeiconsIcon icon={SourceCodeIcon} size={14} color="currentColor" /> github.com/Mkid095
          </a>
        </div>
      </div>
    </footer>
  );
}
