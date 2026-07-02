// Log parsing utilities for deployment logs

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;
export type LogLevel = typeof LOG_LEVELS[number];

export const LEVEL_STYLE: Record<LogLevel, string> = {
  debug: 'text-[var(--text-muted)]',
  info:  'text-[var(--accent)]',
  warn:  'text-[var(--warning)]',
  error: 'text-[var(--danger)]',
  fatal: 'text-[var(--danger)] font-bold',
};

export interface LogLine {
  id: string;
  ts: string;
  level: LogLevel;
  text: string;
}

export function parseLogLines(raw: string): LogLine[] {
  if (!raw.trim()) return [];

  try {
    return raw.split('\n').filter(Boolean).map((line, i) => {
      try {
        const obj = JSON.parse(line);
        return {
          id: `${i}-${obj.timestamp ?? i}`,
          ts: obj.timestamp ?? '',
          level: (obj.level ?? 'info') as LogLevel,
          text: typeof obj.message === 'string' ? obj.message : typeof obj.msg === 'string' ? obj.msg : line,
        };
      } catch {
        return { id: String(i), ts: '', level: 'info' as LogLevel, text: line };
      }
    });
  } catch {
    return raw.split('\n').filter(Boolean).map((line, i) => ({
      id: String(i), ts: '', level: 'info' as LogLevel, text: line,
    }));
  }
}
