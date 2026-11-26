import { VerdaccioRegistryProvider } from './verdaccio.provider';
import * as fsp from 'fs/promises';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  copyFile: jest.fn(),
  open: jest.fn(),
  readdir: jest.fn(),
  rm: jest.fn(),
}));

/**
 * The Verdaccio wire truth, pinned. A registry implementation is judged on
 * what it sends, not on what it claims to send — the verbs here are the
 * ones the running registry (Verdaccio 6.10.5, htpasswd) actually answers:
 * the user endpoint is PUT-only; a bare PUT creates; a Basic-authenticated
 * PUT signs in and re-mints; and revocation is deleting the user's entry
 * in the user database, which the registry itself cannot do through its
 * API.
 */

function makeProvider(opts: {
  internalUrl?: string;
  publicUrl?: string;
  userdbFile?: string;
  fetchImpl?: (...args: any[]) => Promise<any>;
}) {
  const internalUrl = opts.internalUrl ?? '';
  const publicUrl = opts.publicUrl ?? 'https://registry.example.com';
  const userdbFile = opts.userdbFile ?? '';
  const config: any = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'REGISTRY_INTERNAL_URL') return internalUrl;
      if (key === 'REGISTRY_USERDB_FILE') return userdbFile;
      return fallback;
    }),
  };
  const catalogue: any = {
    addresses: jest.fn().mockReturnValue({ registryUrl: publicUrl, tokenUrl: `${publicUrl}/-/static/token` }),
  };
  const provider = new VerdaccioRegistryProvider(config, catalogue);
  global.fetch = jest.fn(opts.fetchImpl ?? (async () => new Response('', { status: 500 })));
  return { provider, fetch: global.fetch as jest.Mock, config };
}

const ok201 = () =>
  new Response(JSON.stringify({ ok: "user 'op@example.com' created", token: 'tok.1' }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });

describe('VerdaccioRegistryProvider.provision', () => {
  it('creates a new user with a bare PUT — no credentials, token in the answer', async () => {
    const { provider, fetch } = makeProvider({ internalUrl: 'http://nextmavens-verdaccio:4873', fetchImpl: async () => ok201() });
    const result = await provider.provision('op@example.com', 'pw', false);
    expect(result).toEqual({ ok: true, token: 'tok.1' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://nextmavens-verdaccio:4873/-/user/org.couchdb.user:op%40example.com');
    expect(init.method).toBe('PUT');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('signs an existing user in with Basic credentials and re-mints the token', async () => {
    const { provider, fetch } = makeProvider({ fetchImpl: async () => ok201() });
    const result = await provider.provision('op@example.com', 'pw', true);
    expect(result).toEqual({ ok: true, token: 'tok.1' });
    const basic = Buffer.from('op@example.com:pw').toString('base64');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe(`Basic ${basic}`);
  });

  it('reports an unmanaged existing user as already registered, not as created', async () => {
    const { provider } = makeProvider({
      fetchImpl: async () => new Response(JSON.stringify({ error: 'username is already registered' }), { status: 409 }),
    });
    const result = await provider.provision('op@example.com', 'pw', false);
    expect(result).toEqual({ ok: false, alreadyRegistered: true });
  });

  it('does not read a bad name as a taken one — the 409 kinds are different failures', async () => {
    const { provider } = makeProvider({
      fetchImpl: async () =>
        new Response(JSON.stringify({ error: 'username should not contain non-uri-safe characters' }), { status: 409 }),
    });
    const result = await provider.provision('op@x.com', 'pw', false);
    expect(result.ok).toBe(false);
    expect(result.alreadyRegistered).toBeUndefined();
    expect(result.error).toMatch(/refused the name/);
  });

  it('reports a rejected sign-in as rejected — the password no longer opens the account', async () => {
    const { provider } = makeProvider({
      fetchImpl: async () => new Response(JSON.stringify({ error: 'unauthorized access' }), { status: 401 }),
    });
    const result = await provider.provision('op@example.com', 'wrong', true);
    expect(result.rejected).toBe(true);
    expect(result.ok).toBe(false);
  });

  it('falls back to the public address when no internal one is set', async () => {
    const { provider, fetch } = makeProvider({ fetchImpl: async () => ok201() });
    await provider.provision('op@example.com', 'pw', false);
    expect(fetch.mock.calls[0][0]).toBe('https://registry.example.com/-/user/org.couchdb.user:op%40example.com');
  });

  it('reports a registry that does not answer as not provisioned — with the address', async () => {
    const { provider } = makeProvider({
      internalUrl: 'http://nextmavens-verdaccio:4873',
      fetchImpl: () => Promise.reject(new Error('fetch failed')),
    });
    const result = await provider.provision('op@example.com', 'pw', false);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/did not answer/);
    expect(result.error).toContain('http://nextmavens-verdaccio:4873');
  });

  it('reports a registry that answers without a token as not provisioned', async () => {
    const { provider } = makeProvider({ fetchImpl: async () => new Response('{}', { status: 201 }) });
    const result = await provider.provision('op@example.com', 'pw', false);
    expect(result).toEqual({ ok: false, error: 'the registry at https://registry.example.com answered without a token' });
  });
});

describe('VerdaccioRegistryProvider.revoke', () => {
  const USERDB = '/registry-userdb/htpasswd';
  const FILE = `admin:$2a$10$hashline1:autocreated 2026-01-01\nop.example.com:$2a$10$hashline2:autocreated 2026-02-02\nother.example.com:$2a$10$hashline3:autocreated 2026-03-03\n`;
  const KEPT = `admin:$2a$10$hashline1:autocreated 2026-01-01\nother.example.com:$2a$10$hashline3:autocreated 2026-03-03\n`;

  function handleOk() {
    return {
      writeFile: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (fsp.open as jest.Mock).mockResolvedValue(handleOk());
    (fsp.copyFile as jest.Mock).mockResolvedValue(undefined);
    (fsp.rm as jest.Mock).mockResolvedValue(undefined);
    (fsp.readdir as jest.Mock).mockResolvedValue([]);
  });

  it('without the user database, revocation is reported as user-side-only — never faked', async () => {
    const { provider } = makeProvider({});
    expect(provider.revocation).toBe('user-side-only');
    await expect(provider.revoke('op.example.com')).resolves.toMatchObject({ ok: false, unsupported: true });
  });

  it('with the user database, revocation removes the entry in place and keeps every other user', async () => {
    const { provider } = makeProvider({ userdbFile: USERDB });
    expect(provider.revocation).toBe('supported');
    const handle = handleOk();
    (fsp.open as jest.Mock).mockResolvedValue(handle);
    (fsp.readFile as jest.Mock)
      .mockResolvedValueOnce(FILE) // the read
      .mockResolvedValueOnce(KEPT); // the read-back
    (fsp.copyFile as jest.Mock).mockResolvedValue(undefined);
    (fsp.rm as jest.Mock).mockResolvedValue(undefined);
    (fsp.readdir as jest.Mock).mockResolvedValue([]);

    const result = await provider.revoke('op.example.com');
    expect(result).toEqual({ ok: true });

    // Written through the same open handle, in place: the inode (and its
    // ownership) is untouched, which a rename would not be.
    expect(handle.writeFile).toHaveBeenCalledWith(KEPT, 'utf8');
    // No other user's line survives into the rewrite.
    expect(KEPT).not.toContain('op.example.com:');
    expect(KEPT).toContain('admin:');
    expect(KEPT).toContain('other.example.com:');
  });

  it('revoking a user that is not in the database is a quiet success', async () => {
    const { provider } = makeProvider({ userdbFile: USERDB });
    (fsp.readFile as jest.Mock).mockResolvedValue(FILE);
    await expect(provider.revoke('nobody.example.com')).resolves.toEqual({ ok: true });
    expect(fsp.open).not.toHaveBeenCalled();
    expect(fsp.copyFile).not.toHaveBeenCalled();
  });

  it('a user database the platform may not read is reported, not guessed', async () => {
    const { provider } = makeProvider({ userdbFile: USERDB });
    (fsp.readFile as jest.Mock).mockRejectedValue(new Error('EACCES: permission denied'));
    const result = await provider.revoke('op.example.com');
    expect(result.ok).toBe(false);
    expect(result.unsupported).toBeUndefined();
    expect(result.error).toMatch(/could not be read/);
  });

  it('a failed write is reported with a kept snapshot, so the caller does not claim what it did not do', async () => {
    const { provider } = makeProvider({ userdbFile: USERDB });
    const handle = handleOk();
    handle.writeFile.mockRejectedValue(new Error('EACCES: permission denied'));
    (fsp.open as jest.Mock).mockResolvedValue(handle);
    (fsp.readFile as jest.Mock).mockResolvedValue(FILE);
    (fsp.copyFile as jest.Mock).mockResolvedValue(undefined);

    const result = await provider.revoke('op.example.com');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/could not be updated/);
    expect(result.error).toMatch(/snapshot was kept/);
    expect(fsp.rm).not.toHaveBeenCalled();
  });

  it('a rewrite that does not read back is a failure with the snapshot to recover from', async () => {
    const { provider } = makeProvider({ userdbFile: USERDB });
    const handle = handleOk();
    (fsp.open as jest.Mock).mockResolvedValue(handle);
    (fsp.readFile as jest.Mock)
      .mockResolvedValueOnce(FILE) // the read
      .mockResolvedValueOnce('something else'); // the read-back disagrees
    (fsp.copyFile as jest.Mock).mockResolvedValue(undefined);

    const result = await provider.revoke('op.example.com');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/did not verify/);
    expect(fsp.rm).not.toHaveBeenCalled();
  });
});
