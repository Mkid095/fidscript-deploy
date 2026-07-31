'use client';

import { Card, Button, Input } from '@fidscript/ui';
import { Icon } from '@iconify/react';

interface Props {
  telegramCredsSet: boolean;
  savingTg: boolean;
  tgBotToken: string;
  tgChatId: string;
  setTgBotToken: (v: string) => void;
  setTgChatId: (v: string) => void;
  onSave: (e: React.FormEvent) => void;
  onDelete: () => void;
}

export function StorageSettingsTelegram({
  telegramCredsSet, savingTg,
  tgBotToken, tgChatId,
  setTgBotToken, setTgChatId,
  onSave, onDelete,
}: Props) {
  return (
    <Card className="border border-[var(--rail)]" padding="lg">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[var(--rail)] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon icon="icons8:telegram" width={14} height={14} className="text-[var(--text-dim)]" />
        </div>
        <div>
          <h2 className="text-xs font-semibold text-[var(--text)]">Telegram</h2>
          <p className="text-[10px] text-[var(--text-dim)] mt-0.5">Connect a Telegram bot to store files as documents in a chat.</p>
        </div>
      </div>

      {telegramCredsSet && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded bg-emerald-500/10 border border-emerald-500/20">
          <Icon icon="icons8:checkmark" width={12} height={12} className="text-emerald-400 flex-shrink-0" />
          <span className="text-[10px] font-medium text-emerald-400">Telegram credentials are configured</span>
        </div>
      )}

      <form onSubmit={onSave} noValidate className="space-y-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)] mb-1.5">Bot Token</label>
          <Input type="password" value={tgBotToken} onChange={e => setTgBotToken(e.target.value)}
            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] text-xs" />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)] mb-1.5">Chat ID</label>
          <Input value={tgChatId} onChange={e => setTgChatId(e.target.value)} placeholder="e.g. -1001234567890"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] text-xs" />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" variant="primary" size="sm" loading={savingTg}
            className="bg-[var(--accent)] hover:bg-[var(--accent-dim)]">
            {savingTg ? 'Saving...' : 'Save Telegram Credentials'}
          </Button>
          {telegramCredsSet && (
            <Button type="button" variant="ghost" size="sm" onClick={onDelete}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
              Remove
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
