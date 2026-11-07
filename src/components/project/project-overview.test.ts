import { describe, it, expect } from 'vitest';

import { nextStep } from './project-overview';

/**
 * The next step.
 *
 * The rule is the guide's, and the order matters: the first that applies
 * is the one shown. A project is never told to do two things at once.
 */
const BASE = {
  hasBackend: false,
  hasApp: false,
  deploymentOn: true,
  deploymentCount: 0,
  memberCount: 1,
  href: '/projects/abc',
};

describe('the next step', () => {
  it('asks for the backend first when the shape has one and it does not exist', () => {
    const step = nextStep({ ...BASE, hasBackend: true });
    expect(step?.label).toBe('Create the application backend');
  });

  it('does not ask for the backend when the shape does not have one', () => {
    const step = nextStep({ ...BASE, hasBackend: false });
    expect(step?.label).not.toBe('Create the application backend');
  });

  it('asks for a deployment when deployments are on and there is none', () => {
    const step = nextStep({ ...BASE, deploymentOn: true, deploymentCount: 0 });
    expect(step?.label).toBe('Deploy your application');
  });

  it('does not ask for a deployment when the deployment service is off', () => {
    const step = nextStep({ ...BASE, deploymentOn: false, deploymentCount: 0 });
    expect(step?.label).not.toBe('Deploy your application');
  });

  it('asks for a domain once there is a deployment', () => {
    const step = nextStep({ ...BASE, deploymentCount: 1 });
    expect(step?.label).toBe('Connect a domain');
  });

  it('asks for a teammate when nobody else is in the project', () => {
    const step = nextStep({ ...BASE, deploymentOn: false, memberCount: 1 });
    expect(step?.label).toBe('Invite a teammate');
  });

  it('says nothing is waiting when everything is in place', () => {
    const step = nextStep({ ...BASE, deploymentOn: false, memberCount: 3 });
    expect(step).toBeNull();
  });

  it('points at the project it belongs to', () => {
    const step = nextStep({ ...BASE });
    expect(step?.href).toBe('/projects/abc/deployments');
  });
});
