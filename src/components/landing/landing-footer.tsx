import Link from 'next/link';

/**
 * The footer's links.
 *
 * Every one of them leads to a page that exists. The old footer listed
 * "Services" — the word the guide retires — so the links here are the
 * platform's own vocabulary.
 */
export const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Build',
    links: [
      { label: 'Getting started', href: '/docs/getting-started' },
      { label: 'Installation', href: '/docs/installation' },
      { label: 'Deploy an app', href: '/docs/deploy-an-app' },
      { label: 'Configuration', href: '/docs/configuration' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'Databases', href: '/docs/databases' },
      { label: 'Email', href: '/docs/email' },
      { label: 'Storage', href: '/docs/storage' },
      { label: 'Packages', href: '/docs/packages' },
      { label: 'Domains & TLS', href: '/docs/domains' },
    ],
  },
  {
    title: 'Operate',
    links: [
      { label: 'Edge functions', href: '/docs/edge-functions' },
      { label: 'Queues', href: '/docs/queues' },
      { label: 'Scheduler', href: '/docs/scheduler' },
      { label: 'Monitoring', href: '/docs/monitoring' },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="bg-surface py-14">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-text">fidscript</p>
            <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-text-dim">
              A control plane for your own hardware. Self-hosted, open source, and yours.
            </p>
            <a
              href="https://github.com/Mkid095/fidscript-deploy"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-[13px] text-text-muted transition hover:text-text"
            >
              View source
            </a>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                {col.title}
              </p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-text-muted transition hover:text-text"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-rail pt-6">
          <p className="text-[12px] text-text-dim">
            FIDScript Deploy — open source, self-hosted.
          </p>
          <Link href="/login" className="text-[12px] text-text-muted transition hover:text-text">
            Log in
          </Link>
        </div>
      </div>
    </footer>
  );
}
