'use client'
import type { ChangeEvent } from 'react';;

import { useState } from 'react';
import { Button, Input, Modal } from '@fidscript/ui';

interface ConnectCloudflareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOAuth: () => Promise<void>;
  onToken: (token: string) => Promise<void>;
}

export function ConnectCloudflareModal({ isOpen, onClose, onOAuth, onToken }: ConnectCloudflareModalProps) {
  const [cfToken, setCfToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState<'oauth' | 'token'>('oauth');

  async function handleOAuth() {
    setConnecting(true);
    setConnectError(null);
    try {
      await onOAuth();
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Failed to start OAuth');
    } finally {
      setConnecting(false);
    }
  }

  async function handleToken(e: React.FormEvent) {
    e.preventDefault();
    if (!cfToken.trim()) return;
    setConnecting(true);
    setConnectError(null);
    try {
      await onToken(cfToken.trim());
      setCfToken('');
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Failed to connect Cloudflare');
    } finally {
      setConnecting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect Cloudflare"
      size="md"
    >
      <div className="flex gap-1 mb-4 border-b border-[var(--rail)]">
        {[{ id: 'oauth', label: '☁️ OAuth (Recommended)' }, { id: 'token', label: '🔑 API Token' }].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setConnectMode(tab.id as 'oauth' | 'token'); setConnectError(null); }}
            className={`px-4 py-2 text-sm border-b-2 transition-colors -mb-px ${
              connectMode === tab.id ? 'border-[var(--accent)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
            } bg-none cursor-pointer`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {connectMode === 'oauth' && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            Authorize FIDScript to manage DNS records in your Cloudflare account.
          </p>
          <div className="rounded-lg border border-[var(--rail)] p-3 space-y-1.5">
            {['Zone:Read', 'DNS:Edit', 'Account:Read'].map(perm => (
              <p key={perm} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span className="text-[var(--success)]">✓</span> {perm}
              </p>
            ))}
          </div>
          {connectError && <p className="text-[var(--danger)] text-xs">{connectError}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" loading={connecting} onClick={handleOAuth}>
              {connecting ? 'Redirecting...' : 'Connect with Cloudflare'}
            </Button>
          </div>
        </div>
      )}

      {connectMode === 'token' && (
        <form onSubmit={handleToken} noValidate>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Enter a Cloudflare API token with <strong>Zone:Read</strong> and <strong>DNS:Edit</strong> permissions.
          </p>
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">API Token</label>
            <Input type="password" value={cfToken} onChange={(e: ChangeEvent<HTMLInputElement>) => setCfToken(e.target.value)}
              placeholder="cfut_..."
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full font-mono" />
          </div>
          <div className="mb-5 rounded-lg border border-[var(--rail)] p-3">
            <p className="text-xs text-[var(--text-muted)] mb-2">Required permissions:</p>
            <ul className="text-xs text-[var(--text-muted)] space-y-1">
              <li className="flex items-center gap-2"><span className="text-[var(--success)]">✓</span> Zone:Read</li>
              <li className="flex items-center gap-2"><span className="text-[var(--success)]">✓</span> DNS:Edit</li>
            </ul>
          </div>
          {connectError && <p className="text-[var(--danger)] text-xs mb-4">{connectError}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" loading={connecting}>
              {connecting ? 'Connecting...' : 'Connect Cloudflare'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
