'use client';

/**
 * The GitHub connection dialog.
 *
 * One dialog for every screen that offers to connect a GitHub account, so
 * the two ways in are always the same: the popup sign-in when the
 * deployment has a GitHub OAuth app, and a personal access token when it
 * does not.
 */
import { useState } from 'react';
import { Modal, Input, Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { GithubIcon, Key01Icon } from '@hugeicons/core-free-icons';

interface GithubConnectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Whether this deployment has a GitHub OAuth app. Null while unknown. */
  oauthConfigured: boolean | null;
  connecting: boolean;
  error?: string;
  onSignInWithGithub: () => void;
  onSubmitToken: (token: string) => Promise<void>;
}

export function GithubConnectDialog({
  isOpen,
  onClose,
  oauthConfigured,
  connecting,
  error,
  onSignInWithGithub,
  onSubmitToken,
}: GithubConnectDialogProps) {
  const [token, setToken] = useState('');
  const [touched, setTouched] = useState(false);

  const tooShort = touched && token.trim().length < 20;

  async function handleSubmit() {
    setTouched(true);
    if (token.trim().length < 20) return;
    await onSubmitToken(token.trim());
  }

  function handleClose() {
    setToken('');
    setTouched(false);
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Connect GitHub"
      size="md"
      description="A connected account lets the platform read your repositories, follow a branch and redeploy on a push."
    >
      <div className="space-y-4">
        {oauthConfigured !== false && (
          <div className="flex flex-col gap-2">
            <Button variant="primary" size="sm" onClick={onSignInWithGithub} loading={connecting}>
              <HugeiconsIcon icon={GithubIcon} size={14} />
              Sign in with GitHub
            </Button>
            <p className="text-[10px] text-[var(--text-dim)] text-center">or use a personal access token</p>
          </div>
        )}

        {oauthConfigured === false && (
          <p className="text-xs text-[var(--text-muted)]">
            This deployment has no GitHub sign-in app, so a personal access token is the way in.
          </p>
        )}

        <Input
          label="Personal access token"
          type="password"
          autoComplete="off"
          placeholder="ghp_…"
          value={token}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToken(e.target.value)}
          error={tooShort ? 'That token is too short to be a GitHub token.' : error}
          hint="A token with the `repo` scope. Create one at github.com/settings/tokens."
        />

        <div className="flex items-start gap-2 text-xs text-[var(--text-muted)]">
          <HugeiconsIcon icon={Key01Icon} size={14} className="mt-0.5 flex-shrink-0 text-[var(--text-dim)]" />
          <p>
            The token is sent once, over HTTPS, to the FIDScript API. It is stored encrypted and is
            never returned to the browser.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" size="sm" loading={connecting} onClick={handleSubmit}>
            <HugeiconsIcon icon={Key01Icon} size={14} />
            Connect with token
          </Button>
        </div>
      </div>
    </Modal>
  );
}
