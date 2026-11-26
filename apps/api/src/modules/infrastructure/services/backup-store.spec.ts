import { S3Store, parseS3Destination, buildS3Store, InternalMinioStore } from './backup-store';

jest.mock('minio', () => ({
  Client: jest.fn(),
}));
const minioModule = jest.requireMock('minio') as { Client: jest.Mock };

/**
 * The destination an operator points the platform's own backups at.
 *
 * Everything S3-compatible: the client is the minio one, aimed elsewhere.
 * A configuration that is not complete must not stop the nightly backup
 * running — it means "use the internal store".
 */

const CONFIG = {
  endpoint: 's3.wasabisys.com',
  accessKey: 'wasabi-access',
  secretKey: 'wasabi-secret',
  bucket: 'off-server-backups',
};

describe('parsing the destination out of its Secret row', () => {
  it('keeps a complete configuration', () => {
    const cfg = parseS3Destination(JSON.stringify(CONFIG));
    expect(cfg).toEqual({ ...CONFIG, useSsl: undefined });
  });

  it('is null for anything that is not a complete configuration', () => {
    expect(parseS3Destination('{not json')).toBeNull();
    expect(parseS3Destination(JSON.stringify({ ...CONFIG, endpoint: '' }))).toBeNull();
    expect(parseS3Destination(JSON.stringify({ ...CONFIG, secretKey: undefined }))).toBeNull();
    expect(parseS3Destination(JSON.stringify({ bucket: 'only-a-bucket' }))).toBeNull();
  });

  it('builds an S3 store for a good row, and none for a bad one', () => {
    expect(buildS3Store(JSON.stringify(CONFIG))?.kind).toBe('s3');
    expect(buildS3Store('garbage')).toBeNull();
  });
});

describe('an S3 endpoint', () => {
  function clientWith(overrides: Record<string, unknown> = {}) {
    const fakeClient = {
      makeBucket: jest.fn().mockResolvedValue(undefined),
      putObject: jest.fn().mockResolvedValue({}),
      removeObject: jest.fn().mockResolvedValue(undefined),
      // The minio library's listObjects is a stream; for-await over it.
      listObjects: jest.fn(),
      ...overrides,
    };
    minioModule.Client.mockImplementation(() => fakeClient);
    return fakeClient;
  }

  function listObjectsYielding(files: Array<{ name: string }>) {
    const stream = {
      [Symbol.asyncIterator]: async function* () {
        for (const f of files) yield f;
      },
    };
    clientWith({ listObjects: jest.fn().mockReturnValue(stream) });
  }

  /** The minio client surfaces a failed listing by throwing from iteration. */
  function listObjectsThrowing(error: Error) {
    clientWith({
      listObjects: jest.fn().mockImplementation(async function* () {
        throw error;
        yield; // unreachable; keeps the shape a generator
      }),
    });
  }

  it('reads the host and port out of the endpoint', () => {
    expect(S3Store.splitEndpoint('s3.eu-central-1.wasabisys.com:443')).toEqual([
      's3.eu-central-1.wasabisys.com',
      443,
    ]);
    expect(S3Store.splitEndpoint('10.0.0.5')).toEqual(['10.0.0.5', undefined]);
  });

  it('a scheme is stripped, not read as the host', () => {
    expect(S3Store.splitEndpoint('https://r2.cloudflarestorage.com')).toEqual([
      'r2.cloudflarestorage.com',
      undefined,
    ]);
  });

  it('ssl is on unless the endpoint says http://', () => {
    expect(S3Store.schemeIsHttps('s3.wasabisys.com')).toBe(true);
    expect(S3Store.schemeIsHttps('https://r2.example')).toBe(true);
    expect(S3Store.schemeIsHttps('http://minio.other-host')).toBe(false);
  });

  it('answers the probe with a listing of the bucket', async () => {
    listObjectsYielding([]);
    const store = new S3Store(CONFIG);
    const probe = await store.testConnection();
    expect(probe.ok).toBe(true);
  });

  it('a missing bucket is not a broken destination — the first run creates it', async () => {
    listObjectsThrowing(new Error('NoSuchBucket: the bucket does not exist'));
    const probe = await new S3Store(CONFIG).testConnection();
    expect(probe.ok).toBe(true);
    expect(probe.detail).toMatch(/does not exist yet/);
  });

  it('rejected credentials are a failed probe', async () => {
    listObjectsThrowing(new Error('AccessDenied'));
    const probe = await new S3Store(CONFIG).testConnection();
    expect(probe).toEqual({ ok: false, error: 'The access key or secret was rejected.' });
  });

  it('an unreachable endpoint is a failed probe', async () => {
    listObjectsThrowing(new Error('connect ECONNREFUSED 10.0.0.5:443'));
    const probe = await new S3Store({ ...CONFIG, endpoint: 'http://10.0.0.5:9000' }).testConnection();
    expect(probe.ok).toBe(false);
    expect(probe.error).toMatch(/Cannot reach/);
  });
});

describe('the internal store', () => {
  it('is the minio provider, in the platform bucket', async () => {
    const minio = {
      upload: jest.fn().mockResolvedValue({}),
      download: jest.fn().mockResolvedValue(Buffer.from('x')),
      delete: jest.fn().mockResolvedValue(undefined),
      list: jest.fn().mockResolvedValue(['a']),
      makeBucket: jest.fn().mockResolvedValue(undefined),
      testConnection: jest.fn().mockResolvedValue({ ok: true, detail: 'reachable' }),
    };
    const store = new InternalMinioStore(minio as never);
    expect(store.kind).toBe('internal');
    const data = await store.download('k');
    expect(minio.download).toHaveBeenCalledWith('k', undefined, 'backups-platform');
    expect(data).toEqual(Buffer.from('x'));
    await expect(store.testConnection()).resolves.toEqual({ ok: true, detail: 'reachable' });
  });
});
