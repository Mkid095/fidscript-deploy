'use client';

import { useEffect, useState } from 'react';

import { browserApi } from '@/lib/api/browser';
import { Input, Select } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/feedback';

interface Repo {
  full_name: string;
  html_url?: string;
  description?: string;
  private: boolean;
  default_branch: string;
}

/**
 * Where the application comes from.
 *
 * The repositories of the connected GitHub account when there is one, and a
 * repository address when there is not — a public repository needs no
 * connection at all.
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
  const [connected, setConnected] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
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
        setConnected(status.connected);
        setUsername(status.username ?? null);

        if (status.connected) {
          const list = await browserApi.get<{ repos: Repo[] }>('/users/me/github/repos');
          if (!cancelled) setRepos(list.repos);
        }
      } catch (err) {
        if (!cancelled) {
          setConnected(false);
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

  if (loading) {
    return <p className="text-sm text-text-muted">Looking for your repositories…</p>;
  }

  return (
    <div className="space-y-4">
      {connected ? (
        <>
          <Select
            label={`Repository${username ? ` — ${username}` : ''}`}
            value={gitUrl}
            onChange={(event) => {
              const repo = repos.find((candidate) => candidate.full_name === event.target.value);
              onChange({
                // The platform clones the address, so it needs the whole one.
                gitUrl: repo?.html_url ?? event.target.value,
                branch: repo?.default_branch ?? branch ?? 'main',
              });
            }}
            options={[
              { value: '', label: 'Choose a repository…' },
              ...repos.map((repo) => ({ value: repo.full_name, label: repo.full_name })),
            ]}
          />
          <p className="text-xs text-text-dim">
            The address is filled in for you. The branch is the one it deploys.
          </p>
        </>
      ) : null}

      <Input
        label="Repository address"
        hint="owner/repository, or the https address of the repository."
        value={gitUrl}
        placeholder="mkid095/acme-store"
        onChange={(event) => onChange({ gitUrl: event.target.value, branch })}
      />

      <Input
        label="Branch"
        value={branch}
        placeholder="main"
        onChange={(event) => onChange({ gitUrl, branch: event.target.value })}
      />

      {connected ? null : (
        <p className="text-xs text-text-dim">
          A public repository needs no connection. A private one needs the GitHub account
          connected in your settings.
        </p>
      )}

      {error ? <ErrorState message={error} /> : null}
    </div>
  );
}
