'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Lock, Search, GitBranch, Rocket } from 'lucide-react';

import { browserApi } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/feedback';

interface Repo {
  full_name: string;
  name: string;
  private: boolean;
  description?: string | null;
  default_branch: string;
}

/**
 * Where the code comes from.
 *
 * The repositories of the GitHub account that is connected — with a search,
 * because an account with a hundred repositories is not a list anybody can
 * use. When no account is connected, the address is still there: a public
 * repository needs no connection at all.
 */
export function DeploymentSourceStep({
  gitUrl,
  branch,
  onChange,
  onPick,
  onImport,
}: {
  gitUrl: string;
  branch: string;
  onChange: (next: { gitUrl: string; branch: string }) => void;
  /**
   * Pressing a repository — it goes straight to the reading of it. A
   * repository chosen from the list should not also have to find the next
   * button; the click is the choice.
   */
  onPick?: (pick: { gitUrl: string; branch: string }) => void;
  /** The typed address is imported. */
  onImport?: (gitUrl: string, branch: string) => void;
}) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [account, setAccount] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const status = await browserApi.get<{
          connected: boolean;
          username?: string;
        }>('/users/me/github/status');
        if (cancelled) return;
        setAccount(
          status.connected ? (status.username ?? 'your account') : null,
        );

        if (status.connected) {
          const response = await browserApi.get<{ repos?: Repo[] }>(
            '/users/me/github/repos',
          );
          if (!cancelled) setRepos(response.repos ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'GitHub could not be reached.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // The search box is the place to look — and "/" is the way to it.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(tag ?? '')) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return repos.slice(0, 50);
    return repos
      .filter(
        (repo) =>
          repo.full_name.toLowerCase().includes(needle) ||
          (repo.description ?? '').toLowerCase().includes(needle),
      )
      .slice(0, 50);
  }, [repos, search]);

  return (
    <div className="space-y-5 rounded-xl border border-rail bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-text">
            Import a Git repository
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Choose a repository from GitHub, or paste any repository address.
          </p>
        </div>
        <Link
          href="/settings/integrations"
          className="text-xs text-accent-soft hover:underline"
        >
          {account ? 'Another account' : 'Connect GitHub'}
        </Link>
      </div>

      {/* The address, for anybody — a public repository needs no connection. */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor="deploy-repo-url"
            className="flex items-center gap-1.5 text-xs font-medium text-text-muted"
          >
            <GitBranch className="size-3.5 text-text-dim" aria-hidden />
            Repository address
          </label>
          <div className="flex gap-2">
            <input
              id="deploy-repo-url"
              className="flex-1 rounded-lg border border-rail bg-surface-2 px-3.5 py-2 font-mono text-xs text-text outline-none transition-colors placeholder:text-text-dim focus:border-accent"
              placeholder="owner/repository, or the https address"
              value={gitUrl}
              autoComplete="off"
              onChange={(event) =>
                onChange({ gitUrl: event.target.value, branch })
              }
            />
            <input
              aria-label="Branch"
              className="w-28 shrink-0 rounded-lg border border-rail bg-surface-2 px-3 py-2 font-mono text-xs text-text outline-none transition-colors placeholder:text-text-dim focus:border-accent"
              placeholder="main"
              value={branch}
              autoComplete="off"
              onChange={(event) =>
                onChange({ gitUrl, branch: event.target.value })
              }
            />
            <Button
              variant="primary"
              onClick={() => onImport?.(gitUrl, branch)}
              disabled={!gitUrl.trim()}
            >
              <Rocket className="size-3.5" aria-hidden />
              Import
            </Button>
          </div>
        </div>

        {repos.length > 0 ? (
          <>
            <div className="relative text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-rail" />
              </div>
              <span className="relative bg-surface px-3 font-mono text-[10px] uppercase tracking-wider text-text-dim">
                or choose from {account}
              </span>
            </div>

            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-dim"
                aria-hidden
              />
              <input
                ref={searchRef}
                className="w-full rounded-lg border border-rail bg-surface-2 py-2 pl-10 pr-10 font-mono text-xs text-text outline-none transition-colors placeholder:text-text-dim focus:border-accent"
                placeholder="Search repositories"
                aria-label="Search repositories"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-rail bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-dim">
                /
              </kbd>
            </div>

            {shown.length === 0 ? (
              <p className="text-xs text-text-dim">Nothing matches that.</p>
            ) : (
              <ul className="max-h-72 divide-y divide-rail overflow-y-auto rounded-lg border border-rail">
                {shown.map((repo) => (
                  <li key={repo.full_name}>
                    <button
                      type="button"
                      onClick={() => {
                        const pick = {
                          gitUrl: `https://github.com/${repo.full_name}`,
                          branch: repo.default_branch ?? 'main',
                        };
                        onChange(pick);
                        onPick?.(pick);
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2 ${
                        gitUrl === `https://github.com/${repo.full_name}`
                          ? 'bg-surface-3'
                          : ''
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-text">
                          {repo.full_name}
                        </span>
                        {repo.description ? (
                          <span className="block truncate text-xs text-text-dim">
                            {repo.description}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {repo.private ? (
                          <Lock className="size-3.5 text-text-dim" aria-hidden />
                        ) : null}
                        <span className="rounded-md border border-rail bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-muted">
                          Import
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-xs text-text-dim">
            No repositories are listed.{' '}
            <Link
              href="/settings/integrations"
              className="text-accent-soft hover:underline"
            >
              Connect GitHub
            </Link>{' '}
            to pick from your account, or use the address above for a public
            repository.
          </p>
        )}
      </div>

      {error ? <ErrorState message={error} /> : null}
      {loading ? (
        <p className="text-xs text-text-dim">Looking for your repositories…</p>
      ) : null}
    </div>
  );
}
