'use client';

/**
 * Turning two-factor off.
 *
 * It asks for the password or a code from the authenticator: a session
 * alone should not be enough to remove a second factor.
 */
import { useState } from 'react';
import { Button, Modal, Input } from '@fidscript/ui';

interface MfaDisableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (proof: string) => Promise<void>;
}

export function MfaDisableModal({ isOpen, onClose, onConfirm }: MfaDisableModalProps) {
  const [proof, setProof] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleConfirm() {
    setBusy(true);
    setError(undefined);
    try {
      await onConfirm(proof.trim());
      setProof('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not turn it off');
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    setProof('');
    setError(undefined);
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
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
          error={error}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
          <Button variant="danger" size="sm" loading={busy} onClick={handleConfirm}>
            Turn off
          </Button>
        </div>
      </div>
    </Modal>
  );
}
