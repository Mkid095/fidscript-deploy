import { PlatformBackupService } from './platform-backup.service';

/**
 * Retention on encrypted backups.
 *
 * The manifests are stored ciphertext, so the retention pass had to read
 * them the way they were written — decrypted. The old pass parsed the
 * ciphertext, swallowed the error, and deleted nothing: the bucket grew
 * for thirty days at a time while it looked like it was being kept in
 * line.
 */
describe('retention of encrypted backups', () => {
  const oldDate = new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString();
  const newDate = new Date().toISOString();

  function makeService({
    stored,
    retentionDays = 30,
  }: {
    stored: Record<string, string>; // key -> ENCRYPTED manifest (as on the wire)
    retentionDays?: number;
  }) {
    const deletions: string[] = [];
    const minio = {
      list: jest.fn().mockResolvedValue(Object.keys(stored)),
      download: jest.fn(async (key: string) => Buffer.from(stored[key] ?? '', 'utf8')),
      delete: jest.fn(async (key: string) => {
        deletions.push(key);
      }),
      upload: jest.fn(),
      makeBucket: jest.fn(),
    };
    // The real CryptoService speaks base64 AES-GCM; here the round trip is
    // the point: what is stored is NOT the JSON.
    const cryptoService = {
      encrypt: (plain: string) => Buffer.from(plain, 'utf8').toString('base64'),
      decrypt: (cipher: string) => Buffer.from(cipher, 'base64').toString('utf8'),
    };
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([]) };
    const admin = { pgEnv: () => ({}) };
    const redis = { acquireLock: jest.fn().mockResolvedValue(true), releaseLock: jest.fn() };
    const config = { get: jest.fn((_k: string, d: unknown) => d) };
    const secrets = {
      tryGet: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(true),
    };

    const service = new PlatformBackupService(
      prisma as never,
      minio as never,
      cryptoService as never,
      admin as never,
      redis as never,
      config as never,
      secrets as never,
    );

    // Retention now runs against the store the backups live in — here the
    // internal one, with the same surface the S3 store has.
    const store = { ...minio, kind: 'internal', description: 'test store' } as never;
    const retention = (service as unknown as { enforceRetention(s: unknown): Promise<number> }).enforceRetention.bind(service);
    // Retention days come from the config default; force the fixture's value.
    (service as unknown as { retentionDays: number }).retentionDays = retentionDays;

    return { service, minio, store, deletions, retention: (s: unknown = store) => retention(s) };
  }

  function manifestJson(createdAt: string) {
    return JSON.stringify({
      createdAt,
      postgresFile: 'postgres/old.dump.gz.enc',
      manifestFile: 'manifests/old.json.enc',
      tableCounts: { projects: 3 },
    });
  }

  it('deletes the expired backup and keeps the live one', async () => {
    const oldKey = 'manifests/2026-10-01_old.json.enc';
    const newKey = 'manifests/2026-11-26_new.json.enc';
    // What is on the wire: the ENCRYPTED manifest, exactly as runBackup writes it.
    const stored: Record<string, string> = {
      [oldKey]: Buffer.from(manifestJson(oldDate), 'utf8').toString('base64'),
      [newKey]: Buffer.from(manifestJson(newDate), 'utf8').toString('base64'),
    };
    const { minio, deletions, retention } = makeService({ stored });
    // minio.download hands back the ciphertext; the service decrypts it.
    minio.download.mockImplementation(async (key: string) => Buffer.from(stored[key], 'utf8'));

    await retention();

    // Retention deletes the files the manifest names: the expired backup's
    // postgres dump and its manifest both go; the live one is kept.
    expect(deletions).toContain('postgres/old.dump.gz.enc');
    expect(deletions).toContain('manifests/old.json.enc');
    expect(deletions).toHaveLength(2);
  });

  it('deletes nothing when every backup is inside the window', async () => {
    const stored: Record<string, string> = {
      'manifests/new.json.enc': Buffer.from(manifestJson(newDate), 'utf8').toString('base64'),
    };
    const { minio, deletions, retention } = makeService({ stored });
    minio.download.mockImplementation(async (key: string) => Buffer.from(stored[key], 'utf8'));

    await retention();
    expect(deletions).toHaveLength(0);
  });

  it('reports the table counts it will be verified against', async () => {
    const prisma = {
      project: { findMany: jest.fn().mockResolvedValue([1, 2, 3]) },
      cronJob: { findMany: jest.fn().mockResolvedValue([]) },
      domain: { findMany: jest.fn().mockResolvedValue([1]) },
      user: { findMany: jest.fn().mockResolvedValue([1]) },
      organization: { findMany: jest.fn().mockResolvedValue([]) },
      deployment: { findMany: jest.fn().mockResolvedValue([1, 2]) },
      credential: { findMany: jest.fn().mockResolvedValue([1, 2, 3, 4]) },
    };
    const { service } = makeService({ stored: {} });
    (service as unknown as { prisma: unknown }).prisma = prisma;
    const built = await (
      service as unknown as {
        buildManifestJson(
          id: string,
          refs: { postgresFile: string; manifestFile: string },
        ): Promise<{ buffer: Buffer; tableCounts: Record<string, number> }>;
      }
    ).buildManifestJson('backup-1', {
      postgresFile: 'postgres/x.dump.gz.enc',
      manifestFile: 'manifests/x.json.enc',
    });
    expect(built.tableCounts).toEqual({
      projects: 3,
      cronJobs: 0,
      domains: 1,
      users: 1,
      organizations: 0,
      deployments: 2,
      credentials: 4,
    });
    // The wire manifest must name its own files: retention deletes them and
    // verify-restore reads the dump back out of it. The manifest that once
    // omitted them made both of those silently no-ops.
    const wire = JSON.parse(built.buffer.toString('utf8'));
    expect(wire.postgresFile).toBe('postgres/x.dump.gz.enc');
    expect(wire.manifestFile).toBe('manifests/x.json.enc');
  });
});
