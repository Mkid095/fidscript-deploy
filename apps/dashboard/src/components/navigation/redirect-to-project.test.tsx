import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { createFidscript, type FidscriptSDK } from '@fidscript-deploy/sdk';
import * as http from 'http';
import type { AddressInfo } from 'net';

/**
 * The old flat paths, and where they send the caller.
 *
 * `/functions`, `/databases`, `/logs` and the rest were a second way of
 * asking for a project's resources — the same screens, without a project in
 * the address. The project console is the one way, so the flat route sends
 * the caller there: to the project they were last in, and to the project
 * picker when they have none.
 */

let server: http.Server;
let sdk: FidscriptSDK;
let projects: Array<{ id: string; name: string; slug: string }> = [];
const replace = vi.fn();

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ getSdk: () => sdk }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

beforeEach(async () => {
  replace.mockClear();
  projects = [
    { id: 'uuid-1', name: 'Most Recent', slug: 'most-recent' },
    { id: 'uuid-2', name: 'Older', slug: 'older' },
  ];
  server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.url === '/api/v1/projects') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ projects, pagination: { page: 1, limit: 20, total: projects.length, pages: 1 } }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Not found' }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  sdk = createFidscript({
    apiKey: 'test-token',
    baseURL: `http://127.0.0.1:${port}`,
    maxRetries: 1,
  });
});

afterEach(async () => {
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 50));
  await new Promise<void>(resolve => server.close(() => resolve()));
});

async function renderRedirect(section: string, id?: string) {
  const { RedirectToProject } = await import('./redirect-to-project');
  return render(<RedirectToProject section={section} id={id} />);
}

describe('the flat paths', () => {
  it('send the caller to the project they were last in', async () => {
    await renderRedirect('functions');
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/projects/most-recent/functions');
    });
  });

  it('keep the id they were given', async () => {
    await renderRedirect('monitoring', 'rule-7');
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/projects/most-recent/monitoring/rule-7');
    });
  });

  it('send the caller to the project picker when they have no projects', async () => {
    projects = [];
    await renderRedirect('functions');
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/projects');
    });
  });
});
