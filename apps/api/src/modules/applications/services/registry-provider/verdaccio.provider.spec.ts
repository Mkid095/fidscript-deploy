import { VerdaccioRegistryProvider } from './verdaccio.provider';

/**
 * The Verdaccio wire truth, pinned. A registry implementation is judged on
 * what it sends, not on what it claims to send — the verbs here are the
 * ones the running registry (Verdaccio 6.10.5, htpasswd) actually answers:
 * the user endpoint is PUT-only; a bare PUT creates; a Basic-authenticated
 * PUT signs in and re-mints.
 */

function makeProvider(opts: { internalUrl?: string; publicUrl?: string; fetchImpl?: (...args: any[]) => Promise<any> }) {
  const internalUrl = opts.internalUrl ?? '';
  const publicUrl = opts.publicUrl ?? 'https://registry.example.com';
  const config: any = {
    get: jest.fn((key: string, fallback?: string) =>
      key === 'REGISTRY_INTERNAL_URL' ? internalUrl : fallback,
    ),
  };
  const catalogue: any = {
    addresses: jest.fn().mockReturnValue({ registryUrl: publicUrl, tokenUrl: `${publicUrl}/-/static/token` }),
  };
  const provider = new VerdaccioRegistryProvider(config, catalogue);
  global.fetch = jest.fn(opts.fetchImpl ?? (async () => new Response('', { status: 500 })));
  return { provider, fetch: global.fetch as jest.Mock };
}

const ok201 = () =>
  new Response(JSON.stringify({ ok: "user 'op@example.com' created", token: 'tok.1' }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });

describe('VerdaccioRegistryProvider', () => {
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

  it('reports a rejected sign-in as rejected — the password no longer opens the account', async () => {
    const { provider } = makeProvider({
      fetchImpl: async () => new Response(JSON.stringify({ error: 'unauthorized access' }), { status: 401 }),
    });
    const result = await provider.provision('op@example.com', 'wrong', true);
    expect(result.rejected).toBe(true);
    expect(result.ok).toBe(false);
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

  it('says what it can and cannot revoke', () => {
    const { provider } = makeProvider({});
    expect(provider.revocation).toBe('user-side-only');
  });
});
