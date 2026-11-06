'use client';

// The GitHub connection banner.
//
// It opens the connection dialog — the one place that offers the way in that
// works on this deployment: the popup sign-in when there is a GitHub OAuth
// app, and a personal access token when there is not.

import { Card, Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { GithubIcon } from '@hugeicons/core-free-icons';

interface GithubConnectBannerProps {
  onOpenDialog: () => void;
  /** Whether this deployment has a GitHub OAuth app. Null while unknown. */
  oauthConfigured: boolean | null;
}

export function GithubConnectBanner({ onOpenDialog, oauthConfigured }: GithubConnectBannerProps) {
  return (
    <Card className="border border-[var(--rail)] p-5">
      <div className="flex items-center gap-3 mb-3">
        <HugeiconsIcon icon={GithubIcon} size={20} className="text-[var(--text-muted)]" />
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Connect GitHub</h2>
          <p className="text-xs text-[var(--text-muted)]">Browse your repositories and branches with one click.</p>
        </div>
      </div>

      <Button variant="primary" size="sm" onClick={onOpenDialog} className="flex items-center gap-2">
        <HugeiconsIcon icon={GithubIcon} size={14} />
        Connect GitHub
      </Button>

      {oauthConfigured === false && (
        <p className="text-xs text-[var(--text-dim)] mt-3">
          This deployment has no GitHub sign-in app, so a personal access token is the way in.
        </p>
      )}
    </Card>
  );
}
