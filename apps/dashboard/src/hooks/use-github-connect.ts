'use client';

/**
 * The GitHub connection — one place, so every screen connects the same way.
 *
 * A deployment may or may not have a GitHub OAuth app. When it has one, the
 * popup sign-in works. When it does not, the only way in is a personal access
 * token — and the screen must say so rather than open a popup that cannot
 * succeed.
 *
 * The token is sent once to the API. The API checks it with GitHub and keeps
 * it encrypted. The browser never holds a copy of it.
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export interface GithubConnectionStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
}

export interface UseGithubConnectOptions {
  getSdk: () => FidscriptSDK;
  onShowToast?: (opts: { type: string; message: string }) => void;
}

export interface GithubConnect {
  status: GithubConnectionStatus | null;
  /** Whether this deployment has a GitHub OAuth app. Null while unknown. */
  oauthConfigured: boolean | null;
  connecting: boolean;
  dialogOpen: boolean;
  error?: string;
  openDialog: () => void;
  closeDialog: () => void;
  /** The OAuth popup sign-in. Only works when `oauthConfigured` is true. */
  connect: () => Promise<void>;
  /** Connects with a personal access token. */
  connectWithToken: (token: string) => Promise<void>;
  /** Disconnects the account. */
  disconnect: () => Promise<void>;
}

export function useGithubConnect({ getSdk, onShowToast }: UseGithubConnectOptions): GithubConnect {
  const router = useRouter();
  const [status, setStatus] = useState<GithubConnectionStatus | null>(null);
  const [oauthConfigured, setOauthConfigured] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    try {
      setStatus(await getSdk().github.status());
    } catch {
      setStatus({ connected: false });
    }
  }, [getSdk]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Whether the deployment has a GitHub OAuth app — so the screen knows which
  // way to offer, instead of opening a popup that cannot work.
  useEffect(() => {
    getSdk().github.oauthConfigured()
      .then(res => setOauthConfigured(res.configured))
      .catch(() => setOauthConfigured(null));
  }, [getSdk]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(undefined);
    try {
      await getSdk().github.connect();
      const next = await getSdk().github.status();
      setStatus(next);
      setDialogOpen(false);
      onShowToast?.({
        type: 'success',
        message: next.connected ? `Connected to GitHub as ${next.username}` : 'GitHub connected',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to GitHub';
      setError(message);
      onShowToast?.({ type: 'error', message });
      // A dead session is not a GitHub problem — send the person to sign in.
      if ((err as { name?: string })?.name === 'AuthError') router.replace('/login');
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [getSdk, onShowToast, router]);

  const connectWithToken = useCallback(async (token: string) => {
    setConnecting(true);
    setError(undefined);
    try {
      const result = await getSdk().github.connectWithToken(token);
      const next = await getSdk().github.status();
      setStatus(next);
      setDialogOpen(false);
      onShowToast?.({
        type: 'success',
        message: `Connected to GitHub as ${next.username ?? result.username}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'GitHub rejected that token';
      setError(message);
      onShowToast?.({ type: 'error', message });
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [getSdk, onShowToast]);

  const disconnect = useCallback(async () => {
    try {
      await getSdk().github.disconnect();
      setStatus({ connected: false });
      onShowToast?.({ type: 'success', message: 'GitHub disconnected' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect GitHub';
      onShowToast?.({ type: 'error', message });
    }
  }, [getSdk, onShowToast]);

  return {
    status,
    oauthConfigured,
    connecting,
    dialogOpen,
    error,
    openDialog: () => setDialogOpen(true),
    closeDialog: () => setDialogOpen(false),
    connect,
    connectWithToken,
    disconnect,
  };
}
