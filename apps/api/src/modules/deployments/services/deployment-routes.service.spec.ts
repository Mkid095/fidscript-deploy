import { DeploymentRoutesService } from './deployment-routes.service';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

/**
 * The deployment routes file, and the edge it feeds.
 *
 * **An empty map is not a valid Traefik dynamic file.** Traefik v3 rejects
 * `routers: {}` — and when one file in the directory is rejected, the whole
 * file provider is rejected with it: the edge then serves the configuration
 * it had before, silently, and no route written afterwards is ever applied.
 *
 * The platform writes this file every time a deployment succeeds, and it
 * writes it empty whenever no deployment has a custom domain — which is the
 * usual case. That is what took the edge down.
 */
describe("the deployment routes file", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'traefik-routes-'));
    process.env.TRAEFIK_DYNAMIC_DIR = dir;
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
    delete process.env.TRAEFIK_DYNAMIC_DIR;
  });

  function makeService(deployments: any[] = []) {
    const prisma = { deployment: { findMany: jest.fn(async () => deployments) } };
    const config = { get: jest.fn((key: string, fallback?: string) => fallback) };
    const events = { on: jest.fn(), emit: jest.fn(async () => undefined) };
    const service = new DeploymentRoutesService(prisma as any, config as any, events as any);
    return { service };
  }

  it('is written WITHOUT an empty map when there is nothing to publish', async () => {
    const { service } = makeService([]);
    await service.sync();
    const written = await fs.readFile(path.join(dir, 'dynamic-deployments.yml'), 'utf8');
    // An empty map is what Traefik rejects.
    expect(written).not.toContain('{}');
    expect(written).not.toContain('routers:');
    expect(written).not.toContain('services:');
  });

  it('is written with the router and its service when there is one', async () => {
    const { service } = makeService([
      {
        id: 'deployment-1234',
        deploymentUrl: 'https://app.example.com',
        project: { slug: 'kennedy-test' },
        release: { runtimePort: 3000 },
        domains: [{ domain: 'custom.example.com', dnsMode: 'manual', sslStatus: 'ACTIVE' }],
      },
    ]);
    await service.sync();
    const written = await fs.readFile(path.join(dir, 'dynamic-deployments.yml'), 'utf8');
    expect(written).not.toContain('{}');
    expect(written).toContain('routers:');
    expect(written).toContain('custom.example.com');
    expect(written).toContain('services:');
  });
});
