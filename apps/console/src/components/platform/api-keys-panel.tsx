'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState, ErrorState } from '@/components/ui/feedback';

import {
  createApiKeyAction,
  revokeApiKeyAction,
  registryLinkAction,
  registryUnlinkAction,
  mcpToggleAction,
} from '@/app/(platform)/settings/actions';
import type { ApiKey } from '@/lib/api/types';
import type { RegistryStatus } from '@/lib/api/platform';

/**
 * The keys that act as you — and the registry that one login links.
 *
 * A key is shown once, when it is made; the platform keeps only its hash,
 * so it cannot be shown again. The registry token is the same: shown once,
 * kept on the machine that asked for it.
 */
export function ApiKeysPanel({
  keys,
  scopes,
  registry,
}: {
  keys: ApiKey[];
  scopes: string[];
  registry: RegistryStatus;
}) {
  return (
    <div className="space-y-3">
      <CreateKeyCard scopes={scopes} />
      <KeysList keys={keys} />
      <RegistryCard registry={registry} />
      <CliHint />
    </div>
  );
}

function CreateKeyCard({ scopes }: { scopes: string[] }) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expiresDays, setExpiresDays] = useState('');
  const [mcp, setMcp] = useState(false);
  const [made, setMade] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleScope = (scope: string) => {
    const next = new Set(selected);
    if (next.has(scope)) next.delete(scope);
    else next.add(scope);
    setSelected(next);
  };

  const create = () => {
    setError(null);
    setMade(null);
    startTransition(async () => {
      const expiresAt = expiresDays
        ? new Date(Date.now() + Number(expiresDays) * 86_400_000).toISOString()
        : undefined;
      const result = await createApiKeyAction(name.trim(), {
        permissions: selected.size ? Array.from(selected) : undefined,
        expiresAt,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (mcp && result.id) await mcpToggleAction(result.id, true);
      setMade(result.key ?? null);
      setName('');
      setSelected(new Set());
      setExpiresDays('');
      setMcp(false);
    });
  };

  return (
    <Card>
      <div className="max-w-2xl space-y-4 p-4">
        <Input
          label="Name"
          hint="What the key is for — 'the website', 'the nightly job'."
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="The website"
        />

        {scopes.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-medium text-text-dim">
              Scopes{' '}
              <span className="text-text-dim/70">(leave all off for full access)</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {scopes.map((scope) => (
                <label
                  key={scope}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-rail bg-surface-2 px-2.5 py-1.5 text-xs text-text transition-colors hover:border-rail-light"
                >
                  <input
                    type="checkbox"
                    className="accent-[var(--color-accent)]"
                    checked={selected.has(scope)}
                    onChange={() => toggleScope(scope)}
                  />
                  <span className="truncate">{scope}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-4">
          <div className="w-40">
            <Input
              label="Expires in (days)"
              hint="Leave empty for no expiry."
              value={expiresDays}
              onChange={(e) => setExpiresDays(e.target.value)}
              placeholder="90"
            />
          </div>
          <label className="mb-1.5 flex cursor-pointer items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              className="accent-[var(--color-accent)]"
              checked={mcp}
              onChange={(e) => setMcp(e.target.checked)}
            />
            Usable with the MCP server
          </label>
        </div>

        {error ? <ErrorState message={error} /> : null}
        {made ? (
          <div className="rounded-md border border-success/40 bg-success/5 p-3">
            <p className="text-xs font-medium text-success">
              The key is shown once. Copy it now.
            </p>
            <p className="mt-1 break-all font-mono text-xs text-text">{made}</p>
          </div>
        ) : null}

        <Button
          variant="primary"
          size="sm"
          onClick={create}
          loading={pending}
          disabled={!name.trim()}
        >
          Make a key
        </Button>
      </div>
    </Card>
  );
}

function KeysList({ keys }: { keys: ApiKey[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const revoke = (keyId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await revokeApiKeyAction(keyId);
      if (result.error) setError(result.error);
    });
  };

  const toggleMcp = (key: ApiKey) => {
    setError(null);
    startTransition(async () => {
      const result = await mcpToggleAction(key.id, !key.mcpEnabled);
      if (result.error) setError(result.error);
    });
  };

  return (
    <Card>
      {keys.length === 0 ? (
        <EmptyState
          title="No keys yet"
          body="A key acts as you, from a script, a CLI or an agent."
        />
      ) : (
        <ul className="divide-y divide-rail">
          {keys.map((key) => (
            <li
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm text-text">{key.name}</p>
                  {key.mcpEnabled ? <Badge tone="info">MCP</Badge> : null}
                </div>
                <p className="mt-0.5 truncate text-xs text-text-dim">
                  {key.permissions.length > 0
                    ? key.permissions.join(', ')
                    : 'No scopes — full access'}
                  {key.expiresAt
                    ? ` · expires ${new Date(key.expiresAt).toLocaleDateString()}`
                    : ''}
                  {' · '}
                  {key.lastUsedAt
                    ? `used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                    : 'never used'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMcp(key)}
                  loading={pending}
                >
                  {key.mcpEnabled ? 'MCP off' : 'MCP on'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revoke(key.id)}
                  loading={pending}
                >
                  Revoke
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <div className="px-4 py-2">
          <ErrorState message={error} />
        </div>
      ) : null}
    </Card>
  );
}

function RegistryCard({ registry }: { registry: RegistryStatus }) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const link = () => {
    setError(null);
    setToken(null);
    startTransition(async () => {
      const result = await registryLinkAction();
      if (result.error) setError(result.error);
      else setToken(result.token ?? null);
    });
  };

  const unlink = () => {
    setError(null);
    setToken(null);
    startTransition(async () => {
      const result = await registryUnlinkAction();
      if (result.error) setError(result.error);
    });
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-medium text-text">Registry</p>
          <p className="mt-0.5 text-xs text-text-dim">
            {registry.linked
              ? `Linked as ${registry.registryUser} — one login reaches the platform and the npm registry. Unlinking revokes the registry tokens issued under it; it does not touch the account keys above.`
              : 'Not linked. Link it and a single login covers the registry too.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={registry.linked ? 'success' : 'neutral'}>
            {registry.linked ? 'linked' : 'not linked'}
          </Badge>
          {registry.linked ? (
            <Button variant="ghost" size="sm" onClick={unlink} loading={pending}>
              Unlink
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={link} loading={pending}>
              Link registry
            </Button>
          )}
        </div>
      </div>
      {error ? (
        <div className="px-4 pb-3">
          <ErrorState message={error} />
        </div>
      ) : null}
      {token ? (
        <div className="border-t border-rail px-4 py-3">
          <p className="text-xs font-medium text-success">
            The registry token is shown once. Copy it now.
          </p>
          <p className="mt-1 break-all font-mono text-xs text-text">{token}</p>
          <p className="mt-1 text-[11px] text-text-dim">
            Or, from the terminal: <code>fidscript registry link</code> stores it for you.
          </p>
        </div>
      ) : null}
    </Card>
  );
}

function CliHint() {
  return (
    <Card>
      <div className="p-4">
        <p className="text-sm font-medium text-text">Use it with the CLI</p>
        <p className="mt-1 text-xs text-text-dim">
          One login reaches everything. <code>fidscript login</code> signs in, stores
          a revocable token, and links the registry — so the terminal and this
          screen share one credential. A key made here can also be stored
          directly with <code>fidscript login {'<'}key{'> '}</code>.
        </p>
      </div>
    </Card>
  );
}
