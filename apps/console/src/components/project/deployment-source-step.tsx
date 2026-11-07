'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { browserApi } from '@/lib/api/browser';
import { Input } from '@/components/ui/input';
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
 * use. When no account is connected, the field is still there: a public
 * repository needs no connection at all.
 */
export function DeploymentSourceStep({
  gitUrl,
  branch,
  onChange,
}: {
  gitUrl: string;
  branch: string;
  onChange: (next: { gitUrl: string; branch: string }) => void;
}) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [account, setAccount] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const status = await browserApi.get<{ connected: boolean; username?: string }>(
          '/users/me/github/status',
        );
        if (cancelled) return;
        setAccount(status.connected ? (status.username ?? 'your account') : null);

        if (status.connected) {
          const response = await browserApi.get<{ repos?: Repo[] }>('/users/me/github/repos');
          if (!cancelled) setRepos(response.repos ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'GitHub could not be reached.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
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
    <div className="space-y-4">
      {account ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-text-dim">
            The repositories of <span className="text-text-muted">{account}</span>.
          </p>
          <Link href="/settings/integrations" className="text-xs text-accent hover:underline">
            Another account
          </Link>
        </div>
      ) : (
        <p className="text-xs text-text-dim">
          No GitHub account is connected —{' '}
          <Link href="/settings/integrations" className="text-accent hover:underline">
            connect one
          </Link>{' '}
          to pick from your repositories. A public repository needs no connection.
        </p>
      )}

      {repos.length > 0 ? (
        <>
          <Input
            label="Search"
            placeholder="Search the repositories"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoComplete="off"
          />

          {shown.length === 0 ? (
            <p className="text-xs text-text-dim">Nothing matches that.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-rail overflow-y-auto rounded-lg border border-rail">
              {shown.map((repo) => (
                <li key={repo.full_name}>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        gitUrl: `https://github.com/${repo.full_name}`,
                        branch: repo.default_branch ?? 'main',
                      })
                    }
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-2 ${
                      gitUrl === `https://github.com/${repo.full_name}` ? 'bg-surface-3' : ''
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-text">{repo.full_name}</span>
                      {repo.description ? (
                        <span className="block truncate text-xs text-text-dim">
                          {repo.description}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[11px] text-text-dim">
                      {repo.private ? 'private' : 'public'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      <Input
        label="Repository address"
        hint="owner/repository, or the https address of the repository."
        value={gitUrl}
        onChange={(event) => onChange({ gitUrl: event.target.value, branch })}
        placeholder="mkid095/acme-store"
      />

      <Input
        label="Branch"
        value={branch}
        onChange={(event) => onChange({ gitUrl, branch: event.target.value })}
        placeholder="main"
      />

      {error ? <ErrorState message={error} /> : null}
      {loading ? <p className="text-xs text-text-dim">Looking for your repositories…</p> : null}
    </div>
  );
}
