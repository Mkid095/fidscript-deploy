import { VerdaccioRegistryProvider } from './verdaccio.provider';
import * as fsp from 'fs/promises';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  stat: jest.fn(),
  writeFile: jest.fn(),
  chown: jest.fn(),
  chmod: jest.fn(),
  rename: jest.fn(),
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
  const USERDB = '/opt/nextmavens-registry/storage/htpasswd';
  const FILE = `admin:$2a$10$hashline1:autocreated 2026-01-01\nop.example.com:$2a$10$hashline2:autocreated 2026-02-02\nother.example.com:$2a$10$hashline3:autocreated 2026-03-03\n`;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('without the user database, revocation is reported as user-side-only — never faked', async () => {
    const { provider } = makeProvider({});
    expect(provider.revocation).toBe('user-side-only');
    await expect(provider.revoke('op.example.com')).resolves.toMatchObject({ ok: false, unsupported: true });
  });

  it('with the user database, revocation removes the entry and keeps every other user', async () => {
    const { provider } = makeProvider({ userdbFile: USERDB });
    expect(provider.revocation).toBe('supported');
    (fsp.readFile as jest.Mock).mockResolvedValue(FILE);
    (fsp.stat as jest.Mock).mockResolvedValue({ uid: 10001, gid: 65533, mode: 0o644 });
    (fsp.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fsp.chown as jest.Mock).mockResolvedValue(undefined);
    (fsp.chmod as jest.Mock).mockResolvedValue(undefined);
    (fsp.rename as jest.Mock).mockResolvedValue(undefined);
    (fsp.readdir as jest.Mock).mockResolvedValue([]);

    const result = await provider.revoke('op.example.com');
    expect(result).toEqual({ ok: true });

    const written = (fsp.writeFile as jest.Mock).mock.calls[0][1] as string;
    expect(written).not.toContain('op.example.com:');
    expect(written).toContain('admin:');
    expect(written).toContain('other.example.com:');
    // The registry's own user keeps write access to the file it must append to.
    expect((fsp.chown as jest.Mock).mock.calls[0]).toEqual([expect.stringContaining('.revoke-'), 10001, 65533]);
    expect((fsp.chmod as jest.Mock).mock.calls[0]).toEqual([expect.stringContaining('.revoke-'), 0o644]);
  });

  it('revoking a user that is not in the database is a quiet success', async () => {
    const { provider } = makeProvider({ userdbFile: USERDB });
    (fsp.readFile as jest.Mock).mockResolvedValue(FILE);
    await expect(provider.revoke('nobody.example.com')).resolves.toEqual({ ok: true });
    expect(fsp.writeFile).not.toHaveBeenCalled();
  });

  it('a user database the platform may not read is reported, not guessed', async () => {
    const { provider } = makeProvider({ userdbFile: USERDB });
    (fsp.readFile as jest.Mock).mockRejectedValue(new Error('EACCES: permission denied'));
    const result = await provider.revoke('op.example.com');
    expect(result.ok).toBe(false);
    expect(result.unsupported).toBeUndefined();
    expect(result.error).toMatch(/could not be read/);
  });

  it('a failed rewrite is reported, so the caller does not claim what it did not do', async () => {
    const { provider } = makeProvider({ userdbFile: USERDB });
    (fsp.readFile as jest.Mock).mockResolvedValue(FILE);
    (fsp.stat as jest.Mock).mockResolvedValue({ uid: 0, gid: 0, mode: 0o644 });
    (fsp.writeFile as jest.Mock).mockRejectedValue(new Error('EACCES: permission denied'));
    (fsp.rm as jest.Mock).mockResolvedValue(undefined);
    const result = await provider.revoke('op.example.com');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/could not be updated/);
  });
});
