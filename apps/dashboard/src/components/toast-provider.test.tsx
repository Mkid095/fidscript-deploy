import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from './toast-provider';

/**
 * The toast.
 *
 * `useToast` falls back to a **silent no-op** when there is no provider
 * above it — so a screen that shows its own feedback but not the
 * application's renders nothing at all, and the operator clicks a button,
 * the request succeeds, and the screen does not move. That is what the
 * provider was mounted in five pages out of sixty-eight for.
 */

function Taster({ message }: { message: string }) {
  const { showToast } = useToast();
  return (
    <button onClick={() => showToast({ type: 'success', message })}>Say it</button>
  );
}

describe('the toast', () => {
  it('shows the message when there is a provider above it', () => {
    render(
      <ToastProvider>
        <Taster message="Deployment started" />
      </ToastProvider>,
    );
    act(() => {
      screen.getByRole('button', { name: 'Say it' }).click();
    });
    expect(screen.getByText('Deployment started')).toBeTruthy();
  });

  it('says nothing at all without a provider — which is why there is one everywhere', () => {
    // The silent fallback: no crash, no message. This is what 63 of the
    // application's pages were doing.
    render(<Taster message="Deployment started" />);
    act(() => {
      screen.getByRole('button', { name: 'Say it' }).click();
    });
    expect(screen.queryByText('Deployment started')).toBeNull();
  });
});
