/**
 * The answer to "does this backup actually restore".
 *
 * verifyLatestBackup decrypts the newest dump, restores it into a scratch
 * database it created and drops again, and counts the rows of every table
 * the manifest promised. A dump that restores but loses rows is not a
 * backup, so the counts are the proof.
 */
import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// Preserve the real module (the Prisma runtime in the import graph needs
// its other exports) and replace only what the service shells out with.
jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  spawn: jest.fn(),
}));
jest.mock('pg', () => ({ Pool: jest.fn() }));

import { PlatformBackupService, BACKUP_DESTINATION_KEY, BACKUP_EVENTS_KEY, RestoreVerifyResult } from './platform-backup.service';
import { Pool } from 'pg';
import { spawn } from 'child_process';

const spawnMock = spawn as unknown as jest.Mock;
const poolMock = Pool as unknown as jest.Mock;

/** A fake child process: it exits on the next tick, like the real thing. */
function proc(code = 0) {
  const p = new EventEmitter();
  setImmediate(() => p.emit('exit', code));
  return p;
}

/**
 * The wire forms the service actually writes:
 *  - a manifest is CryptoService's `iv:authTag:ciphertext` base64;
 *  - a postgres dump is the PBKDF2-GCM frame encryptLargeFile emits:
 *    salt(32) || iv(12) || authTag(16) || ciphertext.
 */
const KEY = crypto.randomBytes(32);

function encManifest(plainJson: string): string {
  const iv = crypto.randomBytes(16);
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const ct = Buffer.concat([c.update(plainJson, 'utf8'), c.final()]);
  return `${iv.toString('base64')}:${c.getAuthTag().toString('base64')}:${ct.toString('base64')}`;
}

function decManifest(wire: string): string {
  const [ivB64, tagB64, ctB64] = wire.split(':');
  const d = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivB64, 'base64'));
  d.setAuthTag(Buffer.from(tagB64, 'base64'));
  return d.update(Buffer.from(ctB64, 'base64')).toString() + d.final('utf8');
}

function encDump(payload: Buffer): Buffer {
  const salt = crypto.randomBytes(32);
  const k = crypto.pbkdf2Sync(KEY, salt, 100_000, 32, 'sha512');
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', k, iv);
  const ct = Buffer.concat([c.update(payload), c.final()]);
  return Buffer.concat([salt, iv, c.getAuthTag(), ct]);
}

const MANIFEST = {
  version: 1,
  backupId: 'backup-1',
  createdAt: new Date().toISOString(),
  postgresFile: 'postgres/dump.gz.enc',
  manifestFile: 'manifests/m.json.enc',
  tableCounts: { projects: 3, users: 1 },
};

function makeService({
  store,
  destinationRaw = null,
  spawnBehavior = () => proc(0),
  poolQuery,
  eventsRaw = null,
}: {
  store: Record<string, unknown>;
  destinationRaw?: string | null;
  spawnBehavior?: (cmd: string) => EventEmitter;
  poolQuery?: (sql: string) => Promise<{ rows: Array<{ count: string }> }>;
  eventsRaw?: string | null;
}) {
  const executeCalls: string[] = [];
  const admin = {
    adminHost: 'db',
    adminPort: 5432,
    adminUser: 'admin',
    adminPassword: 'pw',
    adminDatabase: 'fidscript',
    pgEnv: () => process.env,
    execute: async (sql: string) => { executeCalls.push(sql); },
  };
  const prisma = { $queryRaw: jest.fn() };
  const redis = { acquireLock: jest.fn().mockResolvedValue(true), releaseLock: jest.fn() };
  const config = { get: jest.fn((_k: string, d: unknown) => d) };
  const setCalls: Array<{ key: string; value: string }> = [];
  const secrets = {
    tryGet: jest.fn(async (_p: string | null, key: string) =>
      key === BACKUP_DESTINATION_KEY ? destinationRaw : key === BACKUP_EVENTS_KEY ? eventsRaw : null,
    ),
    set: jest.fn(async (_p: string | null, key: string, value: string) => {
      setCalls.push({ key, value });
    }),
    delete: jest.fn(),
  };
  const cryptoService = { key: KEY, encrypt: encManifest, decrypt: decManifest };

  spawnMock.mockImplementation((cmd: string) => spawnBehavior(cmd));
  const fakePool = {
    query: jest.fn(poolQuery ?? (() => Promise.resolve({ rows: [{ count: '0' }] }))),
    end: jest.fn().mockResolvedValue(undefined),
  };
  poolMock.mockImplementation(() => fakePool);

  const service = new PlatformBackupService(
    prisma as never,
    store as never,
    cryptoService as never,
    admin as never,
    redis as never,
    config as never,
    secrets as never,
  );

  return { service, executeCalls, secrets, setCalls, fakePool };
}

/** The internal store, in the shape the service reads. */
function storeReturning(manifestWire: string, dumpWire: Buffer) {
  return {
    kind: 'internal' as const,
    description: 'test internal store',
    list: jest.fn().mockResolvedValue(['manifests/m.json.enc']),
    download: jest.fn(async (key: string) =>
      key.startsWith('manifests/') ? Buffer.from(manifestWire, 'utf8') : dumpWire,
    ),
    delete: jest.fn().mockResolvedValue(undefined),
    upload: jest.fn().mockResolvedValue(undefined),
    makeBucket: jest.fn().mockResolvedValue(undefined),
    testConnection: jest.fn().mockResolvedValue({ ok: true }),
  };
}

describe('verifying the newest backup restores', () => {
  it('restores into a scratch database, the counts match, the scratch goes', async () => {
    const dump = encDump(Buffer.from('a-custom-format-dump'));
    const store = storeReturning(encManifest(JSON.stringify(MANIFEST)), dump);
    const { service, executeCalls, fakePool } = makeService({
      store,
      poolQuery: async (sql) => ({ rows: [{ count: sql.includes('"users"') ? '1' : '3' }] }),
    });

    const result = await service.verifyLatestBackup();

    expect(result.ok).toBe(true);
    expect(result.countsVerified).toBe(true);
    expect(result.mismatches).toEqual({});
    expect(result.scratchDatabase).toBe(`fidscript_restore_${MANIFEST.backupId.slice(0, 12)}`);
    // A scratch database was created and dropped — never the live one.
    expect(executeCalls[0]).toMatch(/^CREATE DATABASE "fidscript_restore_/);
    expect(executeCalls[1]).toMatch(/^DROP DATABASE IF EXISTS "fidscript_restore_/);
    expect(fakePool.end).toHaveBeenCalled();
    // The result was recorded against the events secret.
    const set = (service as unknown as { secrets: { set: jest.Mock } }).secrets.set;
    expect(set).toHaveBeenCalledWith(null, BACKUP_EVENTS_KEY, expect.stringContaining('"ok":true'));
  });

  it('a count that does not match the manifest is a failed verification', async () => {
    const dump = encDump(Buffer.from('a-custom-format-dump'));
    const store = storeReturning(encManifest(JSON.stringify(MANIFEST)), dump);
    // users says 1 in the manifest, but the restored database has two.
    const { service } = makeService({
      store,
      poolQuery: async (sql) => ({ rows: [{ count: sql.includes('"users"') ? '2' : '3' }] }),
    });

    const result = await service.verifyLatestBackup();

    expect(result.ok).toBe(false);
    expect(result.countsVerified).toBe(true);
    expect(result.mismatches).toEqual({ users: { expected: 1, actual: 2 } });
  });

  it('a pg_restore that exits 1 is noise, not a verdict — the counts decide', async () => {
    const dump = encDump(Buffer.from('a-custom-format-dump'));
    const store = storeReturning(encManifest(JSON.stringify(MANIFEST)), dump);
    // pg_restore exits 1 (the known pristine-scratch noise); the rows still
    // landed, so the counts match and the check passes.
    const { service, executeCalls } = makeService({
      store,
      spawnBehavior: (cmd) => (cmd === 'pg_restore' ? proc(1) : proc(0)),
      poolQuery: async (sql) => ({ rows: [{ count: sql.includes('"users"') ? '1' : '3' }] }),
    });

    const result = await service.verifyLatestBackup();

    expect(result.ok).toBe(true);
    expect(result.countsVerified).toBe(true);
    // And the scratch still drops on the way out.
    expect(executeCalls[executeCalls.length - 1]).toMatch(/^DROP DATABASE IF EXISTS/);
  });

  it('a pg_restore that cannot start at all is a hard failure', async () => {
    const dump = encDump(Buffer.from('corrupt'));
    const store = storeReturning(encManifest(JSON.stringify(MANIFEST)), dump);
    // Spawn error: the binary is missing, the connection refused — not a
    // noise exit, no chance to count.
    const { service } = makeService({
      store,
      spawnBehavior: (cmd) => {
        if (cmd === 'gunzip') return proc(0);
        const p = new EventEmitter();
        setImmediate(() => p.emit('error', new Error('spawn pg_restore ENOENT')));
        return p;
      },
    });

    const result = await service.verifyLatestBackup();

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/could not run/);
  });

  it('a manifest without row counts still restores — it just cannot be compared', async () => {
    const oldManifest = { ...MANIFEST, tableCounts: undefined };
    const dump = encDump(Buffer.from('a-custom-format-dump'));
    const store = storeReturning(encManifest(JSON.stringify(oldManifest)), dump);
    const { service } = makeService({ store });

    const result = await service.verifyLatestBackup();

    expect(result.ok).toBe(false);
    expect(result.countsVerified).toBe(false);
    expect(result.error).toMatch(/predates row counts/);
  });

  it('with no backup at all, there is nothing to verify', async () => {
    const store = {
      ...storeReturning('', Buffer.alloc(0)),
      list: jest.fn().mockResolvedValue([]),
    };
    const { service } = makeService({ store });

    const result = await service.verifyLatestBackup();

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/No backup to verify/);
  });
});

describe('resolving the destination from its Secret row', () => {
  it('uses the internal store when no destination is set', async () => {
    const { service } = makeService({ store: storeReturning('', Buffer.alloc(0)) });
    const store = await (service as unknown as { resolveStore: () => Promise<{ kind: string }> }).resolveStore();
    expect(store.kind).toBe('internal');
  });

  it('uses an S3 store when one is configured and complete', async () => {
    const raw = JSON.stringify({
      endpoint: 's3.wasabisys.com', accessKey: 'a', secretKey: 's', bucket: 'b',
    });
    const { service } = makeService({ store: storeReturning('', Buffer.alloc(0)), destinationRaw: raw });
    const store = await (service as unknown as { resolveStore: () => Promise<{ kind: string }> }).resolveStore();
    expect(store.kind).toBe('s3');
  });

  it('falls back to the internal store when the destination is half-saved', async () => {
    const { service } = makeService({
      store: storeReturning('', Buffer.alloc(0)),
      destinationRaw: 'not-json',
    });
    const store = await (service as unknown as { resolveStore: () => Promise<{ kind: string }> }).resolveStore();
    expect(store.kind).toBe('internal');
  });
});
