import type { QueueMessage } from './use-queues-realtime';

export const STATUS_COLORS: Record<string, string> = {
  pending:      'text-amber-400 bg-amber-500/10 border-amber-500/20',
  delivered:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'dead-letter': 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  active:       'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  paused:       'text-amber-400 bg-amber-500/10 border-amber-500/20',
};
