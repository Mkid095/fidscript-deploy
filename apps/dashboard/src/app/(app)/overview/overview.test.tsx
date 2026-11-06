import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { createFidscript, type FidscriptSDK } from '@fidscript-deploy/sdk';
import * as http from 'http';
import type { AddressInfo } from 'net';

/**
 * The platform overview, end to end.
 *
 * The screen and the SDK are real; the API is a small server that answers
 * with the shape the platform's overview endpoint really returns. The point
 * of the test is that the page shows **real numbers** — and that when there
 * is nothing to show, it says so instead of showing zeros that look like
 * measurements.
 */

const OVERVIEW = {
  projects: {
    total: 2,
    byStatus: { ACTIVE: 1, CREATING: 1 },
    recent: [
      { id: 'p1', name: 'Kennedy Test', slug: 'kennedy-test', type: 'BACKEND', status: 'ACTIVE', updatedAt: new Date().toISOString() },
      { id: 'p2', name: 'Second Project', slug: 'second-project', type: 'FRONTEND', status: 'CREATING', updatedAt: new Date().toISOString() },
    ],
  },
  deployments: {
    total: 3,
    running: 1,
    failed: 1,
    recent: [
      { id: 'd1', projectId: 'p1', projectName: 'Kennedy Test', projectSlug: 'kennedy-test', status: 'SUCCESS', deploymentUrl: 'https://app.example.test', createdAt: new Date().toISOString(), completedAt: new Date().toISOString() },
      { id: 'd2', projectId: 'p1', projectName: 'Kennedy Test', projectSlug: 'kennedy-test', status: 'FAILED', deploymentUrl: null, createdAt: new Date().toISOString(), completedAt: null },
    ],
    failures: [
      { id: 'd2', projectId: 'p1', projectName: 'Kennedy Test', projectSlug: 'kennedy-test', status: 'FAILED', deploymentUrl: null, createdAt: new Date().toISOString(), completedAt: null },
    ],
  },
  alerts: {
    firing: 1,
    recent: [
      { id: 'a1', projectId: 'p1', projectName: 'Kennedy Test', projectSlug: 'kennedy-test', severity: 'warning', status: 'firing', message: 'The database is nearly full', createdAt: new Date().toISOString(), firedAt: new Date().toISOString() },
    ],
  },
  activity: [
    { id: 'e1', eventType: 'deployment.succeeded', resourceType: 'deployment', resourceId: 'd1', projectName: 'Kennedy Test', timestamp: new Date().toISOString(), metadata: {} },
  ],
};

let server: http.Server;
let sdk: FidscriptSDK;
let answer: unknown = OVERVIEW;
let status = 200;

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ getSdk: () => sdk }),
}));

beforeEach(async () => {
  answer = OVERVIEW;
  status = 200;
  server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-API-Key');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.url === '/api/v1/overview') {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(answer));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Not found' }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  // One attempt, no retries: the test wants the failure, not the backoff.
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

async function renderOverview() {
  const { default: OverviewPage } = await import('./page');
  return render(<OverviewPage />);
}

describe('the platform overview', () => {
  it('shows the projects the operator can reach', async () => {
    await renderOverview();
    await waitFor(() => {
      expect(screen.getByText('Kennedy Test')).toBeTruthy();
    });
    expect(screen.getByText('Second Project')).toBeTruthy();
  });

  it('shows how many projects there are', async () => {
    await renderOverview();
    await waitFor(() => {
      expect(screen.getByText('2')).toBeTruthy();
    });
  });

  it('shows the deployments that failed', async () => {
    await renderOverview();
    await waitFor(() => {
      // The failure is a link to the deployment that failed — and it is
      // shown once, not twice.
      const links = screen.getAllByRole('link', { name: /Kennedy Test — failed/i });
      expect(links.length).toBe(1);
      expect(links[0].getAttribute('href')).toBe('/projects/kennedy-test/deployments/d2');
    });
  });

  it('shows the alerts that are firing', async () => {
    await renderOverview();
    await waitFor(() => {
      expect(screen.getByText('The database is nearly full')).toBeTruthy();
    });
  });

  it('says so when there is nothing to show', async () => {
    answer = {
      projects: { total: 0, byStatus: {}, recent: [] },
      deployments: { total: 0, running: 0, failed: 0, recent: [], failures: [] },
      alerts: { firing: 0, recent: [] },
      activity: [],
    };
    await renderOverview();
    await waitFor(() => {
      expect(screen.getByText(/nothing here yet/i)).toBeTruthy();
    });
  });

  it('shows the failure when the platform cannot be read', async () => {
    status = 500;
    await renderOverview();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });
  });
});
