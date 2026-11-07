'use client';

/**
 * Two-factor authentication, in the account settings.
 *
 * The API could do all of this — setup, verify, recovery codes, disable —
 * and the dashboard could do none of it. The only sign of a second factor
 * in the whole product was a read-only "Not enabled" label.
 */
import { useState } from 'react';

import { Button, Card } from '@fidscript/ui';
import { MfaEnroll } from './mfa-enroll';
import { MfaRecoveryCodes } from './mfa-recovery-codes';
import { MfaDisableModal } from './mfa-disable-modal';
import { useMfaSettings } from './use-mfa-settings';

export function MfaSettings() {
  const mfa = useMfaSettings();
  const [disableOpen, setDisableOpen] = useState(false);

  return (
    <Card id="mfa" className="border border-[var(--rail)] mb-6 scroll-mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Two-factor authentication</h2>
        {mfa.state?.enabled && (
          <span className="text-xs text-[var(--success)]">On</span>
        )}
      </div>

      {mfa.loading ? (
        <p className="text-sm text-[var(--text-muted)]">Checking…</p>
      ) : mfa.setup ? (
        <MfaEnroll
          secret={mfa.setup.secret}
          otpauthUrl={mfa.setup.otpauthUrl}
          submitting={mfa.verifying}
          error={mfa.setupError}
          onVerify={mfa.verify}
          onCancel={mfa.clearSetup}
        />
      ) : mfa.recoveryCodes ? (
        <MfaRecoveryCodes codes={mfa.recoveryCodes} onDone={() => mfa.load()} />
      ) : mfa.state?.enabled ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            Your account asks for a code from your authenticator app when you sign in.
            {mfa.state.recoveryCodesRemaining > 0 && (
              <> You have <strong className="text-[var(--text)]">{mfa.state.recoveryCodesRemaining}</strong> recovery
              code{mfa.state.recoveryCodesRemaining === 1 ? '' : 's'} left.</>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" loading={mfa.generating} onClick={mfa.generateRecoveryCodes}>
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
          {mfa.setupError && (
            <p className="text-sm text-[var(--danger)]" role="alert">{mfa.setupError}</p>
          )}
          <div>
            <Button variant="secondary" size="sm" onClick={mfa.startSetup}>Turn on</Button>
          </div>
        </div>
      )}

      <MfaDisableModal
        isOpen={disableOpen}
        onClose={() => setDisableOpen(false)}
        onConfirm={async (proof) => {
          await mfa.disable(proof);
          setDisableOpen(false);
        }}
      />
    </Card>
  );
}
