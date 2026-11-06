'use client';

import type { RegistryPackage } from './use-package-manager';

interface PackageManagerPackagesCardProps {
  packages: RegistryPackage[];
  reachable: boolean;
  loading: boolean;
}

/**
 * The packages the registry holds.
 *
 * These are the public ones — the registry hides its private scopes from a
 * visitor who has not signed in, so the private packages are not listed
 * here. They are one token away, and the card above says where the token
 * comes from.
 */
export function PackageManagerPackagesCard({
  packages,
  reachable,
  loading,
}: PackageManagerPackagesCardProps) {
  return (
    <div className="rounded-xl border border-[var(--rail)] bg-[var(--surface)] p-5">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">Packages</h2>
        <span className="text-xs text-[var(--text-muted)]">
          {packages.length} public {packages.length === 1 ? 'package' : 'packages'}
        </span>
      </div>

      {loading ? (
        <p className="text-xs text-[var(--text-dim)]" aria-live="polite">
          Reading the registry…
        </p>
      ) : !reachable ? (
        <p className="text-xs text-[var(--warning)]">
          The registry did not answer. The console is still there — the list below is what the
          platform could read.
        </p>
      ) : packages.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">
          The registry holds no packages anyone may see without a token.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--rail)]">
          {packages.map(pkg => (
            <li key={pkg.name} className="py-2.5 flex items-baseline justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-mono text-[var(--text)] truncate">{pkg.name}</p>
                {pkg.description && (
                  <p className="text-xs text-[var(--text-muted)] truncate">{pkg.description}</p>
                )}
              </div>
              <span className="text-xs font-mono text-[var(--text-muted)] flex-shrink-0">
                {pkg.version}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-[var(--text-dim)] mt-4">
        The private packages are not on this list: the registry shows them to a signed-in visitor.
        Sign in with a token and the console lists them too.
      </p>
    </div>
  );
}
