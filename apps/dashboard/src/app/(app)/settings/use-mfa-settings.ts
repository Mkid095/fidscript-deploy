'use client';

/**
 * The state behind the two-factor card.
 *
 * The calls, the flags and the messages — the card itself only renders them.
 */
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';

export interface MfaState {
  enabled: boolean;
  recoveryCodesRemaining: number;
}

export function useMfaSettings() {
  const { getSdk } = useAuth();
  const { showToast } = useToast();

  const [state, setState] = useState<MfaState | null>(null);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [setupError, setSetupError] = useState<string | undefined>();
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      setState(await sdk.auth.mfaStatus());
    } catch {
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [getSdk]);

  useEffect(() => { void load(); }, [load]);

  /** Starts the enrollment: the secret and the otpauth URL. */
  const startSetup = useCallback(async () => {
    setSetupError(undefined);
    try {
      const sdk = getSdk();
      const res = await sdk.auth.mfaSetup();
      setSetup({ secret: res.secret, otpauthUrl: res.otpauthUrl });
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'Could not start the setup');
    }
  }, [getSdk]);

  /** Confirms the first code and turns MFA on. */
  const verify = useCallback(async (code: string) => {
    setVerifying(true);
    setSetupError(undefined);
    try {
      const sdk = getSdk();
      await sdk.auth.mfaVerify(code);
      setSetup(null);
      showToast({ type: 'success', message: 'Two-factor authentication is on.' });
      await load();
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'That code was not accepted');
    } finally {
      setVerifying(false);
    }
  }, [getSdk, load, showToast]);

  /** A fresh set of recovery codes, shown once. */
  const generateRecoveryCodes = useCallback(async () => {
    setGenerating(true);
    try {
      const sdk = getSdk();
      const res = await sdk.auth.mfaRecoveryCodes();
      setRecoveryCodes(res.codes);
      await load();
    } catch (err) {
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not generate recovery codes',
      });
    } finally {
      setGenerating(false);
    }
  }, [getSdk, load, showToast]);

  /** Turns it off. The proof is checked by the API. */
  const disable = useCallback(async (proof: string) => {
    const sdk = getSdk();
    await sdk.auth.mfaDisable({ password: proof });
    setRecoveryCodes(null);
    showToast({ type: 'success', message: 'Two-factor authentication is off.' });
    await load();
  }, [getSdk, load, showToast]);

  /** Abandons the enrollment — the secret is replaced the next time. */
  const clearSetup = useCallback(() => {
    setSetup(null);
    setSetupError(undefined);
  }, []);

  return {
    state, loading, setup, verifying, setupError, recoveryCodes, generating,
    load, startSetup, clearSetup, verify, generateRecoveryCodes, disable,
  };
}
