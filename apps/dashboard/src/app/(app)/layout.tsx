'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowTurnBackwardIcon } from '@hugeicons/core-free-icons';

import { AuthGuard } from '@/components/auth-guard';
import { AvatarDropdown } from '@/components/layout/avatar-dropdown';

/**
 * Top-level layout for the (app) route group.
 *
 * Structure:
 *   - Top bar: logo on the left, breadcrumb (back to /projects) in the middle,
 *     user avatar + sign-out on the right. No sidebar — the platform's primary
 *     navigation surface is the projects list at /projects, not a sidebar menu.
 *   - Content: children.
 *
 * Project-specific routes under /projects/[projectId] get their own sidebar via
 * the nested projects/[projectId]/layout.tsx (the project dashboard). The
 * isProjectRoute branch renders <>{children}</> so the project dashboard owns
 * its full chrome.
 *
 * ponytail: the breadcrumb's "back to /projects" button only renders when the
 * user is on a project sub-route. On /projects itself, the user is already at
 * the project picker — no back link needed.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isProjectRoute = pathname?.startsWith('/projects/') ?? false;

  return (
    <AuthGuard>
      {isProjectRoute ? (
        <>{children}</>
      ) : (
        <div className="min-h-screen flex flex-col bg-[#080a0d]">
          <header className="h-14 bg-[#0f1117] border-b border-[#1e2130] flex items-center px-6 gap-4 flex-shrink-0">
            {/* Logo — links home */}
            <Link
              href="/projects"
              className="flex items-center gap-2 group"
              aria-label="FIDScript home"
            >
              <Image
                src="https://res.cloudinary.com/dfp7uhzy3/image/upload/v1782017464/Generated_Image_June_21__2026_-_2_00AM-removebg-preview_ekpdad.png"
                alt="FIDScript"
                width={28}
                height={28}
                className="rounded-md"
              />
              <span className="text-sm font-bold tracking-widest text-orange-500 uppercase group-hover:text-orange-400 transition-colors">
                fidscript
              </span>
            </Link>

            {/* Breadcrumb — only show on project sub-routes (the user clicks
                into a project and the back link brings them here). On the
                /projects list itself, no breadcrumb is shown. */}
            {isProjectRoute && (
              <Link
                href="/projects"
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors ml-2"
              >
                <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={12} />
                <span>Back to projects</span>
              </Link>
            )}

            <div className="flex-1" />

            {/* User account dropdown */}
            <AvatarDropdown />
          </header>

          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      )}
    </AuthGuard>
  );
}