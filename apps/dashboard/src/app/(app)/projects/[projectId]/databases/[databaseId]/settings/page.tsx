'use client';
/* eslint-disable import/order */


import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useDatabase } from '../../database-context';

export default function SettingsPage() {
  const { getSdk } = useAuth();
  const { database, databaseId, refreshSchema } = useDatabase();
  const [connection, setConnection] = useState<any>(null);
  const [migrations, setMigrations] = useState<any[]>([]);
  const [migrationSql, setMigrationSql] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (!databaseId) return;
    getSdk().databases.getConnection(databaseId).then(setConnection).catch(() => {});
    getSdk().database(databaseId).migrations().then(setMigrations).catch(() => {});
  }, [databaseId, getSdk]);

  const rotate = async () => {
    if (!databaseId || !confirm('Rotate password? This will update the DATABASE_URL in the project env vars.')) return;
    await getSdk().databases.rotatePassword(databaseId);
    await refreshSchema();
  };

  const applyMigration = async () => {
    if (!databaseId || !migrationSql.trim()) return;
    try {
      await getSdk().database(databaseId).applyMigration(migrationSql);
      setMigrationSql('');
      const m = await getSdk().database(databaseId).migrations();
      setMigrations(m);
      await refreshSchema();
    } catch (err: any) {
      alert(`Migration failed: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-[var(--text)]">Settings</h1>
        <p className="text-xs text-[var(--text-dim)] mt-1">{database?.name} · {database?.type} {database?.version}</p>
      </div>

      {/* Connection info */}
      <section>
        <h2 className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-2">Connection</h2>
        <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface)] p-4 space-y-2 font-mono text-xs">
          {connection ? (
            <>
              <div><span className="text-[var(--text-dim)]">Host: </span><span className="text-[var(--text-muted)]">{connection.host}</span></div>
              <div><span className="text-[var(--text-dim)]">Port: </span><span className="text-[var(--text-muted)]">{connection.port}</span></div>
              <div><span className="text-[var(--text-dim)]">Database: </span><span className="text-[var(--text-muted)]">{connection.database}</span></div>
              <div><span className="text-[var(--text-dim)]">User: </span><span className="text-[var(--text-muted)]">{connection.username}</span></div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-dim)]">URL: </span>
                <code className="text-[var(--text-muted)] truncate flex-1 bg-[var(--surface-2)] px-2 py-1 rounded">
                  {showSecret ? connection.connectionString : connection.connectionString?.replace(/:[^:@]+@/, ':***@')}
                </code>
                <button onClick={() => setShowSecret(s => !s)} className="text-[10px] text-[var(--accent)]">
                  {showSecret ? 'Hide' : 'Reveal'}
                </button>
              </div>
            </>
          ) : (
            <p className="text-[var(--text-dim)]">Loading…</p>
          )}
        </div>
        <button onClick={rotate} className="mt-3 text-xs px-3 py-1.5 rounded border border-[var(--warning)]/30 text-[var(--warning)] hover:bg-[var(--warning)]/5">
          Rotate password
        </button>
      </section>

      {/* Migrations */}
      <section>
        <h2 className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-2">Migrations ({migrations.length})</h2>
        <textarea
          value={migrationSql}
          onChange={e => setMigrationSql(e.target.value)}
          placeholder="CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE);"
          className="w-full h-24 bg-[var(--surface-2)] border border-[var(--rail)] rounded p-2 text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[var(--accent)]/30"
        />
        <button
          onClick={applyMigration}
          disabled={!migrationSql.trim()}
          className="mt-2 text-xs px-3 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--text)] disabled:opacity-50"
        >
          Apply migration
        </button>

        {migrations.length > 0 && (
          <div className="mt-4 space-y-1 max-h-48 overflow-y-auto">
            {migrations.map(m => (
              <div key={m.id} className="text-[10px] font-mono text-[var(--text-dim)] border-b border-[var(--rail)]/40 pb-1">
                <span className="text-[var(--success)]">{m.name}</span>
                <span className="text-[var(--text-dim)] ml-2">({m.executionTimeMs}ms)</span>
                <span className="text-[var(--text-dim)] ml-2">{new Date(m.appliedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section>
        <h2 className="text-xs font-semibold text-[var(--danger)] uppercase tracking-wider mb-2">Danger zone</h2>
        <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text)]">Delete this database</p>
            <p className="text-xs text-[var(--text-dim)]">Drops the database + role. Cannot be undone.</p>
          </div>
          <button
            onClick={async () => {
              if (!databaseId || !confirm('Delete this database? This cannot be undone.')) return;
              await getSdk().databases.delete(databaseId);
              window.location.href = '..';
            }}
            className="text-xs px-3 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--text)]"
          >
            Delete
          </button>
        </div>
      </section>
    </div>
  );
}
