import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import MfaChallengePage from './page';

/**
 * The second factor, on the sign-in screen.
 *
 * An account with MFA on used to be unable to sign in at all: the API
 * answered with a challenge instead of tokens, the client threw the
 * challenge away, stored `undefined` as an access token, and the person was
 * bounced between the login screen and the app for as long as they tried.
 *
 * This screen is where that ends: the code is sent, the errors are said,
 * and a recovery code is accepted too.
 */
const mfaChallenge = vi.fn();
const authState = { loading: false, error: null as string | null };

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    mfaChallenge,
    loading: authState.loading,
    error: authState.error,
  }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('next=%2Fprojects'),
}));

describe('the MFA challenge screen', () => {
  beforeEach(() => {
    mfaChallenge.mockReset();
    authState.loading = false;
    authState.error = null;
  });

  it('asks for the code from the authenticator', () => {
    render(<MfaChallengePage />);
    expect(screen.getByRole('heading', { name: /two-factor/i })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Authenticator code' })).toBeTruthy();
  });

  it('sends the code that was typed', async () => {
    mfaChallenge.mockResolvedValue(undefined);
    render(<MfaChallengePage />);

    const boxes = screen.getAllByRole('textbox');
    for (const [index, box] of boxes.entries()) {
      fireEvent.change(box, { target: { value: String(index + 1) } });
    }

    await waitFor(() => expect(mfaChallenge).toHaveBeenCalledWith('123456'));
  });

  it('says what went wrong', () => {
    authState.error = 'Invalid or expired MFA challenge';
    render(<MfaChallengePage />);
    expect(screen.getByRole('alert').textContent).toContain('Invalid or expired MFA challenge');
  });

  it('offers a recovery code as well', () => {
    render(<MfaChallengePage />);
    const button = screen.getByRole('button', { name: /recovery code/i });
    fireEvent.click(button);
    expect(screen.getByLabelText('Recovery code')).toBeTruthy();
  });

  it('sends a recovery code when one is typed', async () => {
    mfaChallenge.mockResolvedValue(undefined);
    render(<MfaChallengePage />);

    fireEvent.click(screen.getByRole('button', { name: /recovery code/i }));
    fireEvent.change(screen.getByLabelText('Recovery code'), {
      target: { value: 'abcd1234-efgh56' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(mfaChallenge).toHaveBeenCalledWith('abcd1234-efgh56'));
  });
});
