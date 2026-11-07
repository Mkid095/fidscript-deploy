/**
 * Phase 18 — CLI output formatting.
 * Table, JSON, and raw output modes.
 */
import { Writable } from 'stream';

export type OutputFormat = 'table' | 'json' | 'raw';

export function print(data: unknown, format: OutputFormat, columns?: string[]): void {
  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  if (format === 'raw') {
    if (Array.isArray(data)) {
      for (const item of data) console.log(typeof item === 'object' ? JSON.stringify(item) : item);
    } else if (typeof data === 'object' && data !== null) {
      console.log(JSON.stringify(data));
    } else {
      console.log(data);
    }
    return;
  }
  // table
  printTable(Array.isArray(data) ? data : [data], columns);
}

function printTable(rows: unknown[], columns?: string[]): void {
  if (rows.length === 0) { console.log('(no data)'); return; }
  const keys = columns ?? extractKeys(rows[0]);
  const widths = computeWidths(rows, keys);
  const header = keys.map((k, i) => k.padEnd(widths[i])).join('  ');
  console.log(header);
  console.log(keys.map((_, i) => '-'.repeat(widths[i])).join('  '));
  for (const row of rows) {
    const obj = row as Record<string, unknown>;
    console.log(keys.map((k, i) => String(obj[k] ?? '').padEnd(widths[i]).slice(0, widths[i])).join('  '));
  }
}

function extractKeys(val: unknown): string[] {
  if (typeof val !== 'object' || val === null) return [];
  if (Array.isArray(val)) return extractKeys(val[0] ?? {});
  return Object.keys(val as Record<string, unknown>);
}

function computeWidths(rows: unknown[], keys: string[]): number[] {
  return keys.map((k, i) => {
    const colWidth = Math.max(...rows.map(r => String((r as Record<string, unknown>)[k] ?? '').length));
    return Math.max(k.length, colWidth);
  });
}

export function error(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}
