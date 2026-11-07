import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

import { useOnboarding } from './use-onboarding';

/**
 * The first-time journey.
 *
 * It has to be **resumable** (a reload does not lose the place) and it has
 * to be **offered, not forced** (an account that already has projects is
 * never asked to make another one).
 */
const sdk = {
  projects: {
    list: vi.fn(async () => ({ projects: [] })),
    create: vi.fn(async (data: { name: string; type: string }) => ({
      id: 'p-1', name: data.name, slug: 'my-project', type: data.type, status: 'ACTIVE',
      ownerId: 'u-1', createdAt: '', updatedAt: '',
    })),
  },
  auth: {
    updateProfile: vi.fn(async () => ({})),
    completeOnboarding: vi.fn(async () => ({ onboarded: true })),
  },
};

// The real provider hands out a STABLE getSdk. A new one every render
// would make the hook's effect refetch for ever — which is what happened
// here before the mock was fixed.
const stableGetSdk = () => sdk;

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ getSdk: stableGetSdk, user: { id: 'u-1', name: 'Operator' } }),
}));

describe('the first-time journey', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sdk.projects.list.mockResolvedValue({ projects: [] });
    sdk.projects.create.mockClear();
    sdk.auth.completeOnboarding.mockClear();
  });

  it('starts at the welcome', async () => {
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.step).toBe('welcome');
  });

  it('remembers where the person was', async () => {
    sessionStorage.setItem('fidscript_onboarding_step', 'project');
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.step).toBe('project');
  });

  it('remembers what they had typed', async () => {
    sessionStorage.setItem(
      'fidscript_onboarding_draft',
      JSON.stringify({ name: 'Kennedy', projectName: 'Soostori', projectType: 'backend' }),
    );
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.draft.projectName).toBe('Soostori');
  });

  it('creates the project for real', async () => {
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setDraft({ projectName: 'Soostori', projectType: 'backend' }));
    let created: unknown;
    await act(async () => { created = await result.current.createProject(); });

    expect(sdk.projects.create).toHaveBeenCalledWith({ name: 'Soostori', type: 'backend' });
    expect(result.current.draft.projectSlug).toBe('my-project');
  });

  it('marks the journey as finished on the account', async () => {
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.finish(); });
    expect(sdk.auth.completeOnboarding).toHaveBeenCalled();
    // The place is cleared, so the journey is not offered again.
    expect(sessionStorage.getItem('fidscript_onboarding_step')).toBeNull();
  });

  it('keeps the projects the account already had', async () => {
    sdk.projects.list.mockResolvedValueOnce({
      projects: [{ id: 'p-1', name: 'Existing', slug: 'existing' }] as never,
    });
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.existingProjects).toHaveLength(1);
    expect(result.current.existingProjects[0].slug).toBe('existing');
  });
});
