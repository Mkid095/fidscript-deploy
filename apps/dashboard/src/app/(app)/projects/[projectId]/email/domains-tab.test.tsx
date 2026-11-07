import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { createFidscript, type FidscriptSDK } from '@fidscript-deploy/sdk';
import * as http from 'http';
import type { AddressInfo } from 'net';

/**
 * The email console's domains, end to end.
 *
 * The screen, the SDK and the API are all real here: the only thing that
 * is not real is the API itself, which is a small server that answers with
 * the shapes the platform actually returns. That is the point — the defect
 * this test exists for was the SDK unwrapping an envelope the API never
 * sent, and the screen rendered "0 domains" because of it. Nothing but a
 * test that runs the whole chain would have caught it.
 */

const PROJECT = 'p1';
const DOMAIN = {
  id: 'd1',
  projectId: PROJECT,
  domain: 'mail.example.com',
  status: 'PENDING',
  dkimVerified: false,
  spfVerified: false,
  dmarcVerified: false,
  mxVerified: false,
  createdAt: new Date().toISOString(),
};

/** What the platform's API really answers for the domain list: the array. */
const API_ANSWER = [DOMAIN];

let server: http.Server;
let baseURL: string;
let sdk: FidscriptSDK;

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ getSdk: () => sdk }),
}));

vi.mock('@/contexts/project-context', () => ({
  useShellProjectId: () => 'p1',
}));

beforeEach(async () => {
  server = http.createServer((req, res) => {
    // The browser enforces the origin policy — jsdom does too — so the test
    // server answers with the header a real API would send.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-API-Key');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.url === `/api/v1/projects/${PROJECT}/email/domains`) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(API_ANSWER));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Not found' }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  baseURL = `http://127.0.0.1:${port}`;
  sdk = createFidscript({ apiKey: 'test-token', baseURL });
});

afterEach(async () => {
  // The screen must be gone before the server it is talking to: a request
  // that arrives after the close is an error the test does not need.
  cleanup();
  // A request that is still in flight when the server goes away is an
  // error the test does not need to see.
  await new Promise((resolve) => setTimeout(resolve, 50));
  await new Promise<void>(resolve => server.close(() => resolve()));
});

async function renderDomainsTab() {
  const { DomainsTab } = await import('./domains-tab');
  return render(<DomainsTab />);
}

describe('the email console\'s domains', () => {
  it('lists the domains the API returns', async () => {
    await renderDomainsTab();
    await waitFor(() => {
      expect(screen.getByText('mail.example.com')).toBeTruthy();
    });
  });

  it('shows an empty state when the project has no domains', async () => {
    API_ANSWER.length = 0;
    await renderDomainsTab();
    await waitFor(() => {
      expect(screen.getByText(/no email domains/i)).toBeTruthy();
    });
  });
});
