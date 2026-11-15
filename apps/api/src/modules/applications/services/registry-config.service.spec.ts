import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { dirname, join } from 'path';
import { RegistryConfigService } from './registry-config.service';

/**
 * The registry's scope access rules.
 *
 * A rule is written into the registry's own config — the file the container
 * reads at start — and the container is restarted to honour it. What is
 * checked here: the rewrite keeps the rest of the config intact, the
 * rendered rules say what the toggle said, and a config the api cannot
 * reach is refused, not silently skipped.
 */

const REPO_CONFIG = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  '..',
  'applications',
  'package-manager',
  'verdaccio',
  'config.yaml',
);

function makeService(
  dir: string,
  overrides: {
    rows?: Array<{ scope: string; anonymousRead: boolean }>;
    packages?: Array<{ name: string }>;
  } = {},
) {
  const prisma = {
    registryScopeAccess: {
      findMany: async () => overrides.rows ?? [],
      upsert: async () => ({}),
    },
  };
  const config = {
    get: (key: string, fallback?: string) =>
      key === 'APPLICATIONS_DIR' ? dir : fallback,
  };
  const commands: string[] = [];
  const shell = {
    runStreaming: jest.fn(async (cmd: string) => {
      commands.push(cmd);
    }),
  };
  const registry = {
    catalogue: async () => ({
      registryUrl: 'https://registry.fidscript.com',
      tokenUrl: 'https://registry.fidscript.com/-/static/token',
      packages: overrides.packages ?? [],
      reachable: true,
    }),
  };
  return {
    service: new RegistryConfigService(
      prisma as any,
      config as any,
      shell as any,
      registry as any,
    ),
    commands,
  };
}

function makeConfigDir(): string {
  const dir = mkdtempSync(join('/tmp', 'fidscript-registry-config-'));
  const base = readFileSync(REPO_CONFIG, 'utf-8');
  const configPath = join(dir, 'package-manager', 'verdaccio', 'config.yaml');
  // The service derives the path from APPLICATIONS_DIR — create the file
  // where it will look for it.
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, base, { mode: 0o644 });
  return dir;
}

describe('the registry’s scope access rules', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeConfigDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('renders an open scope into the config, and restarts the registry with it', async () => {
    const { service, commands } = makeService(dir, {
      rows: [{ scope: '@soostori', anonymousRead: true }],
    });

    await service.apply();

    const configPath = join(dir, 'package-manager', 'verdaccio', 'config.yaml');
    const rendered = readFileSync(configPath, 'utf-8');
    const group = /'@soostori\/\*':\n(?:    [^\n]*\n)+/.exec(rendered)![0];
    expect(group).toContain('access: $all');
    expect(group).toContain('publish: $authenticated');
    // A scope rule is local-only: nothing is proxied, so a package
    // published under it can never be shadowed by one from npmjs.org.
    expect(group).not.toContain('proxy');
    // The rest of the config survives the rewrite.
    expect(rendered).toContain('url: https://registry.npmjs.org/');
    expect(rendered).toContain('proxy: npmjs');
    expect(rendered).toContain('log:');
    expect(commands.some((c) => c.includes('docker restart fidscript_npm_registry'))).toBe(true);
  });

  it('renders a closed scope as authenticated reads', async () => {
    const { service } = makeService(dir, {
      rows: [{ scope: '@soostori', anonymousRead: false }],
    });

    await service.apply();

    const configPath = join(dir, 'package-manager', 'verdaccio', 'config.yaml');
    const rendered = readFileSync(configPath, 'utf-8');
    const group = /'@soostori\/\*':\n(?:    [^\n]*\n)+/.exec(rendered)![0];
    expect(group).toContain('access: $authenticated');
  });

  it('writes the file atomically — no .tmp is left behind', async () => {
    const { service } = makeService(dir);
    await service.apply();
    const configPath = join(dir, 'package-manager', 'verdaccio', 'config.yaml');
    expect(existsSync(`${configPath}.tmp`)).toBe(false);
  });

  it('refuses to apply where the config is not reachable', async () => {
    const bareDir = mkdtempSync(join('/tmp', 'fidscript-registry-config-bare-'));
    const { service } = makeService(bareDir);
    try {
      await expect(service.apply()).rejects.toThrow(
        /not reachable/,
      );
    } finally {
      rmSync(bareDir, { recursive: true, force: true });
    }
  });

  it('lists the stored rules, and the scopes the registry holds packages under', async () => {
    const { service } = makeService(dir, {
      rows: [{ scope: '@soostori', anonymousRead: true }],
      packages: [
        { name: '@soostori/inventory' },
        { name: '@fidscript-deploy/sdk' },
      ],
    });

    const scopes = await service.listScopes();
    expect(scopes).toEqual([
      { scope: '@fidscript-deploy', anonymousRead: false, published: true },
      { scope: '@soostori', anonymousRead: true, published: true },
    ]);
  });
});
