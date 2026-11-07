import { RegistryCatalogueService } from './registry-catalogue.service';

/**
 * The package manager's page.
 *
 * The registry hides its private scopes from a visitor who has not signed
 * in, so the platform can only list the public ones — and it must say so
 * rather than show an empty registry. A registry that does not answer is
 * reported as unreachable, not as an empty one.
 */
function makeService(domain = 'fidscript.com') {
  const config = { get: jest.fn((key: string, fallback?: string) => (key === 'PLATFORM_DOMAIN' ? domain : fallback)) };
  return new RegistryCatalogueService(config as any);
}

describe('the package manager', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('names the registry and the token page on the platform\'s own domain', () => {
    const { registryUrl, tokenUrl } = makeService().addresses();
    expect(registryUrl).toBe('https://registry.fidscript.com');
    expect(tokenUrl).toBe('https://registry.fidscript.com/-/static/token');
  });

  it('lists the packages the registry holds', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { name: '@fidscript/instant-mcp', version: '0.6.4', description: 'The Instant MCP launcher' },
        { name: '@viventure/cli', version: '1.0.0' },
      ],
    } as any);

    const result = await makeService().catalogue();
    expect(result.reachable).toBe(true);
    expect(result.packages.map(p => p.name)).toEqual(['@fidscript/instant-mcp', '@viventure/cli']);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://registry.fidscript.com/-/verdaccio/data/packages',
      expect.anything(),
    );
  });

  it('reports a registry that does not answer as unreachable', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 502, json: async () => ({}) } as any);
    const result = await makeService().catalogue();
    expect(result.reachable).toBe(false);
    expect(result.packages).toEqual([]);
    // The addresses are still right — the registry is there, it just did not answer.
    expect(result.tokenUrl).toBe('https://registry.fidscript.com/-/static/token');
  });
});
