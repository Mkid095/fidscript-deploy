'use client';

/**
 * The sessions.
 *
 * The API has had them for a while — list, revoke one, revoke them all — and
 * the dashboard had none of it. A person cannot see where they are signed
 * in, or sign out the place they do not recognise.
 */
import { useCallback, useEffect, useState } from 'react';

import { Button, Card } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';

interface Session {
  id: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export function SessionSettings() {
  const { getSdk } = useAuth();
  const { showToast } = useToast();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const res = await sdk.auth.sessions();
      setSessions(res.sessions ?? []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [getSdk]);

  useEffect(() => { void load(); }, [load]);

  async function handleRevoke(id: string) {
    setRevoking(id);
    try {
      const sdk = getSdk();
      await sdk.auth.revokeSession(id);
      showToast({ type: 'success', message: 'Session signed out.' });
      await load();
    } catch (err) {
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not sign that session out',
      });
    } finally {
      setRevoking(null);
    }
  }

  async function handleRevokeAll() {
    setRevoking('all');
    try {
      const sdk = getSdk();
      await sdk.auth.revokeAllSessions();
      showToast({ type: 'success', message: 'Every other session was signed out.' });
      await load();
    } catch (err) {
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not sign them out',
      });
    } finally {
      setRevoking(null);
    }
  }

  return (
    <Card id="sessions" className="border border-[var(--rail)] mb-6 scroll-mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Sessions</h2>
        {sessions.length > 1 && (
          <Button variant="ghost" size="sm" loading={revoking === 'all'} onClick={handleRevokeAll}>
            Sign out everywhere
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Checking…</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No other sessions.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--rail)]">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-[var(--text)] truncate">{describe(session)}</p>
                <p className="text-xs text-[var(--text-dim)]">
                  Started {new Date(session.createdAt).toLocaleString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                loading={revoking === session.id}
                onClick={() => void handleRevoke(session.id)}
              >
                Sign out
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** What a session looks like to a person: the browser and the place. */
function describe(session: Session): string {
  const agent = session.userAgent ?? 'Unknown device';
  const place = session.ipAddress ? ` · ${session.ipAddress}` : '';
  return `${shorten(agent)}${place}`;
}

function shorten(agent: string): string {
  if (agent.length <= 48) return agent;
  return `${agent.slice(0, 45)}…`;
}
