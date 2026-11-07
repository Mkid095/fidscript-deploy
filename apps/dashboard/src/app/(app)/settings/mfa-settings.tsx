'use client';

/**
 * Two-factor authentication, in the account settings.
 *
 * The API could do all of this — setup, verify, recovery codes, disable —
 * and the dashboard could do none of it. The only sign of a second factor
 * in the whole product was a read-only "Not enabled" label.
 */
import { useCallback, useEffect, useState } from 'react';

import { Button, Card, Modal, Input } from '@fidscript/ui';
import { MfaEnroll } from './mfa-enroll';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';

interface MfaState {
  enabled: boolean;
  recoveryCodesRemaining: number;
}

export function MfaSettings() {
  const { getSdk } = useAuth();
  const { showToast } = useToast();

  const [state, setState] = useState<MfaState | null>(null);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [setupError, setSetupError] = useState<string | undefined>();
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [proof, setProof] = useState('');
  const [disabling, setDisabling] = useState(false);
  const [disableError, setDisableError] = useState<string | undefined>();

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

  async function handleStartSetup() {
    setSetupError(undefined);
    try {
      const sdk = getSdk();
      const res = await sdk.auth.mfaSetup();
      setSetup({ secret: res.secret, otpauthUrl: res.otpauthUrl });
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'Could not start the setup');
    }
  }

  async function handleVerify(code: string) {
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
  }

  async function handleGenerateRecoveryCodes() {
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
  }

  async function handleDisable() {
    setDisabling(true);
    setDisableError(undefined);
    try {
      const sdk = getSdk();
      await sdk.auth.mfaDisable({ password: proof });
      setDisableOpen(false);
      setProof('');
      setRecoveryCodes(null);
      showToast({ type: 'success', message: 'Two-factor authentication is off.' });
      await load();
    } catch (err) {
      setDisableError(err instanceof Error ? err.message : 'Could not turn it off');
    } finally {
      setDisabling(false);
    }
  }

  return (
    <Card id="mfa" className="border border-[var(--rail)] mb-6 scroll-mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Two-factor authentication</h2>
        {state?.enabled && (
          <span className="text-xs text-[var(--success)]">On</span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Checking…</p>
      ) : setup ? (
        <MfaEnroll
          secret={setup.secret}
          otpauthUrl={setup.otpauthUrl}
          submitting={verifying}
          error={setupError}
          onVerify={handleVerify}
          onCancel={() => { setSetup(null); setSetupError(undefined); }}
        />
      ) : recoveryCodes ? (
        <RecoveryCodes codes={recoveryCodes} onDone={() => setRecoveryCodes(null)} />
      ) : state?.enabled ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            Your account asks for a code from your authenticator app when you sign in.
            {state.recoveryCodesRemaining > 0 && (
              <> You have <strong className="text-[var(--text)]">{state.recoveryCodesRemaining}</strong> recovery
              code{state.recoveryCodesRemaining === 1 ? '' : 's'} left.</>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" loading={generating} onClick={handleGenerateRecoveryCodes}>
              New recovery codes
            </Button>
            <Button variant="danger" size="sm" onClick={() => setDisableOpen(true)}>
              Turn off
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            Ask for a code from an authenticator app when you sign in. It is the one thing that
            stops a stolen password from being enough.
          </p>
          {setupError && (
            <p className="text-sm text-[var(--danger)]" role="alert">{setupError}</p>
          )}
          <div>
            <Button variant="secondary" size="sm" onClick={handleStartSetup}>Turn on</Button>
          </div>
        </div>
      )}

      <Modal
        isOpen={disableOpen}
        onClose={() => { setDisableOpen(false); setDisableError(undefined); }}
        title="Turn off two-factor authentication"
        description="Confirm it is you — enter your password, or a code from your authenticator app."
        size="md"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Password or authenticator code"
            type="password"
            value={proof}
            onChange={(e) => setProof(e.target.value)}
            autoComplete="current-password"
            error={disableError}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDisableOpen(false)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={disabling} onClick={handleDisable}>
              Turn off
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

/**
 * The recovery codes, shown once.
 *
 * They are never readable again — the platform keeps only their hashes — so
 * this is the one chance to write them down.
 */
function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--text)]">
        Save these somewhere safe. Each one signs you in once if you lose your authenticator app.
        <strong className="text-[var(--text)]"> They are not shown again.</strong>
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-md border border-[var(--rail)] bg-[var(--surface-2)] p-3 font-mono text-xs text-[var(--text)]">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Button variant="primary" size="sm" onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}
