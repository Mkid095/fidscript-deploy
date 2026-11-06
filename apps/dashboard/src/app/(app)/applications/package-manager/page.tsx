'use client';

import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import { PackageManagerAccessCard } from '@/components/applications/package-manager/package-manager-access-card';
import { PackageManagerPackagesCard } from '@/components/applications/package-manager/package-manager-packages-card';
import { usePackageManager } from '@/components/applications/package-manager/use-package-manager';

/**
 * The package manager, in detail.
 *
 * The Applications screen says "Package manager — a private npm registry" and
 * links to the console. The console is a dead end for anyone who has not
 * used it before: the private packages are hidden until you sign in, and
 * nothing says how to sign in or where the token comes from.
 *
 * This is that page: the console, the token page, and the packages anyone
 * may see.
 */
export default function PackageManagerApplicationPage() {
  const { getSdk } = useAuth();
  const { loading, registryUrl, tokenUrl, packages, reachable, error } = usePackageManager(getSdk);

  return (
    <div className="max-w-3xl">
      <Link
        href="/applications"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-3"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={12} /> Back to applications
      </Link>

      <h1 className="text-xl font-bold text-[var(--text)] mb-1">Package manager</h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        A private npm registry, so the platform&apos;s own packages — and yours — have a home that
        does not depend on a public registry.
      </p>

      {error && (
        <p className="text-sm text-[var(--danger)] mb-4" role="alert">
          {error}
        </p>
      )}

      <div className="space-y-4">
        <PackageManagerAccessCard
          registryUrl={registryUrl}
          tokenUrl={tokenUrl}
          reachable={reachable}
        />
        <PackageManagerPackagesCard packages={packages} reachable={reachable} loading={loading} />
      </div>
    </div>
  );
}
