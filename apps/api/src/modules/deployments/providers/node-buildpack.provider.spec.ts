import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { NodeBuildpackProvider } from './node-buildpack.provider';

/**
 * The buildpack's handling of the npm registry.
 *
 * A deployment that carries NPM_TOKEN gets a .npmrc written into the build
 * context — and that file must reach the stage that installs: a stage that
 * copies only the manifests would install through the default registry and
 * a private scoped package 404s there. The file holds a token, so a stage
 * that ships its whole context (the monorepo builds, the single-stage
 * images) drops it again. The project's environment variables never enter
 * the build context at all — they travel as the envfile secret, and the
 * runtime gets them from the container's own environment.
 */

function makeProvider() {
  const commands: string[] = [];
  const shell = {
    runStreaming: jest.fn(async (cmd: string) => {
      commands.push(cmd);
    }),
  };
  return { provider: new NodeBuildpackProvider(shell as any), commands };
}

function makeWorkspace(files: Record<string, string>): string {
  const ws = mkdtempSync(join(tmpdir(), 'fidscript-buildpack-'));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(ws, name), content, { mode: 0o644 });
  }
  return ws;
}

function makeContext(ws: string, overrides: Record<string, unknown> = {}) {
  return {
    deploymentId: 'dep_1',
    releaseId: 'rel_1',
    projectId: 'proj_1',
    projectSlug: 'demo',
    projectType: 'NODE',
    releaseVersion: 'v1',
    source: { type: 'git' as const, url: 'https://example.com/demo.git', branch: 'main' },
    envVars: [] as Array<{ key: string; value: string }>,
    onLog: () => {},
    workspace: ws,
    ...overrides,
  } as any;
}

const PnpmMonorepoFiles = {
  'pnpm-lock.yaml': 'lockfileVersion: 9\n',
  'next.config.js': 'module.exports = {};\n',
  'package.json': JSON.stringify({
    name: 'demo',
    scripts: { build: 'next build' },
  }),
};

const SingleNextFiles = {
  'next.config.js': 'module.exports = {};\n',
  'package.json': JSON.stringify({
    name: 'demo',
    scripts: { build: 'next build', start: 'next start' },
  }),
};

describe('the buildpack and the npm registry', () => {
  let ws: string;

  afterEach(() => {
    if (ws) rmSync(ws, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('writes a .npmrc for the registry when the deployment carries NPM_TOKEN', async () => {
    ws = makeWorkspace(PnpmMonorepoFiles);
    const { provider } = makeProvider();

    const result = await provider.build(
      makeContext(ws, {
        envVars: [
          { key: 'NPM_TOKEN', value: 'tok-123' },
          { key: 'DATABASE_URL', value: 'postgres://x' },
        ],
      }),
    );

    expect(result.success).toBe(true);
    const npmrc = readFileSync(join(ws, '.npmrc'), 'utf-8');
    expect(npmrc).toContain('//registry.fidscript.com/:_authToken=tok-123');
    expect(npmrc).toContain('registry=https://registry.fidscript.com/');
  });

  it('lets an explicit NPM_REGISTRY_URL win over the platform registry', async () => {
    ws = makeWorkspace(PnpmMonorepoFiles);
    const { provider } = makeProvider();

    await provider.build(
      makeContext(ws, {
        envVars: [
          { key: 'NPM_TOKEN', value: 'tok-123' },
          { key: 'NPM_REGISTRY_URL', value: 'https://registry.example.com' },
        ],
      }),
    );

    const npmrc = readFileSync(join(ws, '.npmrc'), 'utf-8');
    expect(npmrc).toContain('registry=https://registry.example.com/');
    expect(npmrc).toContain('//registry.example.com/:_authToken=tok-123');
  });

  it('writes no .npmrc at all without a token', async () => {
    ws = makeWorkspace(SingleNextFiles);
    const { provider } = makeProvider();

    const result = await provider.build(makeContext(ws));
    expect(result.success).toBe(true);
    expect(existsSync(join(ws, '.npmrc'))).toBe(false);
  });

  it('copies a manifest-only install stage over the .npmrc when one is in the context', async () => {
    ws = makeWorkspace(SingleNextFiles);
    const { provider } = makeProvider();

    const result = await provider.build(
      makeContext(ws, { envVars: [{ key: 'NPM_TOKEN', value: 'tok-123' }] }),
    );

    expect(result.success).toBe(true);
    const dockerfile = readFileSync(join(ws, 'Dockerfile'), 'utf-8');
    // The deps stage must install through the registry the .npmrc names.
    expect(dockerfile).toContain('COPY .npmrc ./');
    const depsStage = dockerfile.slice(0, dockerfile.indexOf('AS builder'));
    const copyIdx = depsStage.indexOf('COPY .npmrc ./');
    const installIdx = depsStage.indexOf('RUN npm ci');
    expect(copyIdx).toBeGreaterThan(-1);
    expect(installIdx).toBeGreaterThan(copyIdx);
  });

  it('carries a repository .npmrc into a manifest-only install stage', async () => {
    ws = makeWorkspace({
      ...SingleNextFiles,
      '.npmrc': '@soostori:registry=https://registry.fidscript.com/\n',
    });
    const { provider } = makeProvider();

    const result = await provider.build(makeContext(ws));
    expect(result.success).toBe(true);
    const dockerfile = readFileSync(join(ws, 'Dockerfile'), 'utf-8');
    expect(dockerfile).toContain('COPY .npmrc ./');
  });

  it('drops the generated .npmrc from the whole-context monorepo image', async () => {
    ws = makeWorkspace(PnpmMonorepoFiles);
    const { provider } = makeProvider();

    const result = await provider.build(
      makeContext(ws, { envVars: [{ key: 'NPM_TOKEN', value: 'tok-123' }] }),
    );

    expect(result.success).toBe(true);
    const dockerfile = readFileSync(join(ws, 'Dockerfile'), 'utf-8');
    // The builder stage (whose directory becomes the runtime image) drops
    // the token-carrying .npmrc the provider wrote.
    expect(dockerfile).toContain('RUN rm -f .npmrc');
    // The install still happens first: the deps stage copies the context
    // whole, .npmrc included.
    const installIdx = dockerfile.indexOf('pnpm install');
    const scrubIdx = dockerfile.indexOf('RUN rm -f .npmrc');
    expect(installIdx).toBeGreaterThan(-1);
    expect(scrubIdx).toBeGreaterThan(installIdx);
  });

  it('keeps a repository .npmrc in the monorepo image — only the provider wrote one is dropped', async () => {
    ws = makeWorkspace({
      ...PnpmMonorepoFiles,
      '.npmrc': '@soostori:registry=https://registry.fidscript.com/\n',
    });
    const { provider } = makeProvider();

    const result = await provider.build(makeContext(ws));
    expect(result.success).toBe(true);
    const dockerfile = readFileSync(join(ws, 'Dockerfile'), 'utf-8');
    expect(dockerfile).not.toContain('rm -f .npmrc');
  });

  it('never puts the project env vars in the build context', async () => {
    ws = makeWorkspace(PnpmMonorepoFiles);
    const { provider, commands } = makeProvider();

    const result = await provider.build(
      makeContext(ws, {
        envVars: [
          { key: 'NPM_TOKEN', value: 'tok-123' },
          { key: 'DATABASE_URL', value: 'postgres://secret' },
        ],
      }),
    );

    expect(result.success).toBe(true);
    expect(existsSync(join(ws, '.fidscript.env'))).toBe(false);
    // The variables reach docker build as the envfile secret, from outside
    // the context — and leave the machine when the build is done.
    const cmd = commands.find((c) => c.includes('docker build'));
    expect(cmd).toContain('--secret id=envfile,src=');
    const secretPath = /src="([^"]+)"/.exec(cmd!)![1];
    expect(secretPath.startsWith(ws + '-env/')).toBe(true);
    expect(existsSync(secretPath)).toBe(false);
  });

  it('leaves the docker command unchanged when there is no env var', async () => {
    ws = makeWorkspace(SingleNextFiles);
    const { provider, commands } = makeProvider();

    await provider.build(makeContext(ws));

    const cmd = commands.find((c) => c.includes('docker build'));
    expect(cmd).not.toContain('--secret');
    expect(cmd).toContain(' -t "fidscript/demo:v1"');
  });
});

describe('the build commands the generated Dockerfile runs', () => {
  let ws: string;

  afterEach(() => {
    if (ws) rmSync(ws, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it("runs a next app's scripts by name — the binaries live in node_modules/.bin", async () => {
    // The app's build script is "next build" and its start script is
    // "next start": neither binary is on a stage's PATH. A raw
    // `RUN next build` exits 127 (the 2026-11-17 cerenity outage). The
    // package manager is what puts .bin on the PATH, so the scripts are
    // invoked by NAME through it.
    ws = makeWorkspace(SingleNextFiles);
    const { provider } = makeProvider();

    await provider.build(makeContext(ws));

    const dockerfile = readFileSync(join(ws, 'Dockerfile'), 'utf-8');
    expect(dockerfile).toContain('RUN npm run build');
    expect(dockerfile).not.toMatch(/RUN next build/);
    expect(dockerfile).toContain('npm start');
    expect(dockerfile).not.toContain('"next start"');
  });

  it('falls back to the npm-run defaults for a next app without build scripts', async () => {
    ws = makeWorkspace({
      'next.config.js': 'module.exports = {};\n',
      'package.json': JSON.stringify({ name: 'demo' }),
    });
    const { provider } = makeProvider();

    await provider.build(makeContext(ws));

    const dockerfile = readFileSync(join(ws, 'Dockerfile'), 'utf-8');
    expect(dockerfile).toContain('RUN npm run build');
    expect(dockerfile).toContain('npx next start');
  });

  it('builds a pnpm monorepo through pnpm, which its own stage activates', async () => {
    ws = makeWorkspace(PnpmMonorepoFiles);
    const { provider } = makeProvider();

    await provider.build(makeContext(ws));

    const dockerfile = readFileSync(join(ws, 'Dockerfile'), 'utf-8');
    expect(dockerfile).toContain('pnpm run build');
    expect(dockerfile).not.toMatch(/RUN next build/);
  });
});
