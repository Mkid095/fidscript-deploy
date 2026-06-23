import Link from 'next/link';
import Image from 'next/image';
import { HugeiconsIcon } from '@hugeicons/react';
import { BoltIcon, SourceCodeIcon } from '@hugeicons/core-free-icons';

const COLS = [
  { title: 'Platform', links: ['Deployments', 'Databases', 'Functions', 'Realtime', 'Queues', 'Storage'] },
  { title: 'Resources', links: ['Documentation', 'API Reference', 'SDK', 'MCP Tools', 'CLI'] },
  { title: 'Project', links: ['GitHub', 'Self-host guide', 'Changelog', 'License (OSS)'] },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-900 bg-ink-950">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Image
                src="https://res.cloudinary.com/dfp7uhzy3/image/upload/v1782017464/Generated_Image_June_21__2026_-_2_00AM-removebg-preview_ekpdad.png"
                alt="FIDScript"
                width={28}
                height={28}
                className="rounded"
              />
              <div>
                <p className="text-xs font-bold tracking-widest text-orange-500 uppercase leading-none">fidscript deploy</p>
                <p className="text-xs text-slate-600 leading-none mt-0.5">by NextMavens</p>
              </div>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-slate-500">
              The self-hosted developer operating system. Open source. Run it on any VPS.
            </p>
          </div>

          {COLS.map((c) => (
            <div key={c.title}>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-300">{c.title}</h4>
              <ul className="space-y-2">
                {c.links.map((l) =>
                  l === 'Documentation' ? (
                    <li key={l}>
                      <Link href="/docs" className="text-xs text-slate-500 transition hover:text-fire-500">
                        {l}
                      </Link>
                    </li>
                  ) : (
                    <li key={l}>
                      <a href="#" className="text-xs text-slate-500 transition hover:text-fire-500">
                        {l}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-900 pt-6 sm:flex-row">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} FIDScript · A <span className="font-medium text-slate-400">NextMavens</span> project · MIT-style open source
          </p>
          <a
            href="https://github.com/Mkid095/fidscript-deploy"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-white"
          >
            <HugeiconsIcon icon={SourceCodeIcon} size={14} color="currentColor" /> github.com/Mkid095
          </a>
        </div>
      </div>
    </footer>
  );
}
