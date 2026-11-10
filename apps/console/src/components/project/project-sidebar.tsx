'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  ChevronDown,
  Database,
  Globe,
  Layers,
  Link2,
  Mail,
  MessageCircle,
  Package,
  Plus,
  Rocket,
  Settings,
  Server,
  Terminal,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { groupMenuItems, type MenuItem } from '@/lib/project/menu';
import { browserApi } from '@/lib/api/browser';

/** The apex the platform's deployments answer under. */
const PLATFORM_DOMAIN =
  process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? 'fidscript.com';

/** The icon a menu item wears — so the menu reads at a glance. */
const ITEM_ICONS: Record<string, LucideIcon> = {
  overview: Layers,
  members: Users,
  activity: Activity,
  backend: Server,
  connect: Link2,
  deployments: Rocket,
  domains: Globe,
  functions: Zap,
  databases: Database,
  email: Mail,
  whatsapp: MessageCircle,
  packages: Package,
  monitoring: Activity,
  logs: Terminal,
  settings: Settings,
};

/** One of the signed-in person's other projects, for the switcher. */
interface SwitcherProject {
  id: string;
  name: string;
  slug: string;
}

/**
 * The project's sidebar.
 *
 * The items are **derived** — from the project's shape, its capabilities and
 * what it actually has — and they are filtered by what this person may use.
 * A menu item a person cannot use is hidden, not greyed out.
 *
 * It is a column of its own: the head stays, the menu scrolls inside it,
 * and the foot stays. Nothing in it is ever half off the screen.
 */
export function ProjectSidebar({
  projectName,
  projectStatus,
  projectSlug,
  projectPath,
  deploymentOn,
  items,
}: {
  projectName: string;
  projectStatus: string;
  /** The project's path segment — the switcher and the new-deployment link walk from it. */
  projectSlug: string;
  /** Where this project lives — the CTA's target. */
  projectPath: string;
  /** The deployment service is on — the foot's "New deployment" shows. */
  deploymentOn: boolean;
  items: MenuItem[];
}) {
  const pathname = usePathname();
  const groups = groupMenuItems(items);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [others, setOthers] = useState<SwitcherProject[] | null>(null);

  // The other projects the switcher offers — a real list, read from the
  // platform, and quietly absent when it cannot be read.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await browserApi.get<{ projects?: SwitcherProject[] }>(
          '/projects',
        );
        if (cancelled) return;
        const list = (result.projects ?? []).filter(
          (entry) => entry.slug !== projectSlug,
        );
        setOthers(list.length > 0 ? list : null);
      } catch {
        if (!cancelled) setOthers(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectSlug]);

  const newDeploymentHref = `${projectPath}/deployments/new`;

  return (
    <aside className="flex h-full w-full flex-col border-r border-rail bg-surface">
      {/* The head: which project this is. */}
      <div className="flex-shrink-0 border-b border-rail px-4 py-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-xs text-text-dim transition-colors hover:text-text"
        >
          <span aria-hidden>←</span> All projects
        </Link>

        {/* The switcher: the name, its status, and the others. */}
        <div className="relative mt-3">
          <button
            type="button"
            onClick={() => setSwitcherOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-rail bg-surface-2 px-3 py-2 text-left transition-colors hover:bg-surface-3"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-text">
                {projectName}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5">
                <span
                  className={`size-2 rounded-full ${
                    projectStatus === 'ACTIVE'
                      ? 'animate-pulse bg-success'
                      : 'bg-text-dim'
                  }`}
                />
                <span
                  className={`font-mono text-[11px] font-semibold uppercase ${
                    projectStatus === 'ACTIVE' ? 'text-success' : 'text-text-dim'
                  }`}
                >
                  {projectStatus.toLowerCase()}
                </span>
              </span>
            </span>
            {others ? (
              <ChevronDown
                className={`size-4 flex-shrink-0 text-text-dim transition-transform ${
                  switcherOpen ? 'rotate-180' : ''
                }`}
                aria-hidden
              />
            ) : null}
          </button>

          {switcherOpen && others ? (
            <div className="absolute inset-x-0 z-50 mt-1.5 rounded-lg border border-rail bg-surface shadow-lg">
              <p className="px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-dim">
                Switch project
              </p>
              <ul className="max-h-48 overflow-y-auto border-t border-rail">
                {others.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={`/projects/${entry.slug}`}
                      onClick={() => setSwitcherOpen(false)}
                      className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
                    >
                      <span className="truncate">{entry.name}</span>
                      <span className="font-mono text-[10px] uppercase text-text-dim">
                        {entry.slug}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {/* The menu: it scrolls, on its own. */}
      <nav
        aria-label="Project"
        className="scroll-area flex-1 overflow-y-auto px-3 py-4"
      >
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-dim">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = ITEM_ICONS[item.id];
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center gap-2.5 rounded-lg border-l-2 py-1.5 pl-3 pr-2 text-sm transition-colors ${
                          active
                            ? 'border-accent bg-surface-3 font-medium text-text'
                            : 'border-transparent text-text-muted hover:bg-surface-2 hover:text-text'
                        }`}
                      >
                        {Icon ? (
                          <Icon
                            className={`size-4 flex-shrink-0 ${
                              active ? 'text-accent' : 'text-text-dim'
                            }`}
                            aria-hidden
                          />
                        ) : null}
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* The foot: the way to the next deployment, and back to the platform. */}
      <div className="flex-shrink-0 space-y-2.5 border-t border-rail bg-surface-2 p-4">
        {deploymentOn ? (
          <Link
            href={newDeploymentHref}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
          >
            <Plus className="size-3.5" aria-hidden />
            New deployment
          </Link>
        ) : null}
        <div className="flex items-center justify-between px-1 font-mono text-[11px] text-text-dim">
          <span className="truncate">{projectName}</span>
          <span className="shrink-0">*.apps.{PLATFORM_DOMAIN}</span>
        </div>
        <Link
          href="/overview"
          className="block px-1 text-xs text-text-dim transition-colors hover:text-text"
        >
          Platform overview
        </Link>
      </div>
    </aside>
  );
}
