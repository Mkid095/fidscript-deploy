import type { QueueMessage } from './use-queues-realtime';

export const STATUS_COLORS: Record<string, string> = {
  pending:      'text-[var(--warning)] bg-[var(--warning)]/10 border-[var(--warning)]/20',
  delivered:    'text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/20',
  'dead-letter': 'text-[var(--danger)] bg-[var(--danger)]/10 border-[var(--danger)]/20',
  active:       'text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/20',
  paused:       'text-[var(--warning)] bg-[var(--warning)]/10 border-[var(--warning)]/20',
};
