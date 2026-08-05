/**
 * db-normalize-schema.ts
 *
 * Adapters from raw SDK schema/query/realtime shapes to the dashboard
 * `ColumnInfo`, `QueryResult`, and `RealtimeTableInfo` types.
 *
 * All functions are pure: input = raw API shape, output = dashboard shape.
 */

import type { ColumnInfo, QueryResult, RealtimeTableInfo } from '@/types';
import type { RawColumnInfo, RawDataResult, RawRealtimeSubscriber } from './db-normalize-types';

/**
 * Real API: ordinalPosition, dataType, columnDefault, characterMaximumLength, isIdentity
 * Dashboard: type, isNullable, isPrimaryKey, isForeignKey, defaultValue, references
 */
export function normalizeColumnInfo(raw: RawColumnInfo): ColumnInfo {
  return {
    name: raw.name,
    type: raw.dataType,
    isNullable: raw.isNullable,
    isPrimaryKey: raw.isPrimaryKey,
    isForeignKey: false,             // not in real API — derived from constraints if needed
    defaultValue: raw.columnDefault,
  };
}

/**
 * Real API: DataResult { rows, total, page, limit }
 * Dashboard: QueryResult { columns, rows, rowCount, executionTimeMs }
 *
 * Note: This normalizes the LIVE query result object. For SQL editor results,
 * the context's runQuery already builds a QueryResult directly from the raw
 * SDK response (columns + rows + rowCount + timing) — no normalization needed there.
 * This normalizer is for the QueryBuilder path used by fetchRows.
 */
export function normalizeQueryResult<T>(
  raw: RawDataResult<T>,
  columns?: string[],
  executionTimeMs = 0,
): QueryResult {
  // Derive column names from the first row's keys if not provided
  const derivedColumns = columns ?? (raw.rows.length > 0 ? Object.keys(raw.rows[0] as object) : []);
  return {
    columns: derivedColumns,
    rows: raw.rows as Record<string, unknown>[],
    rowCount: raw.total,
    executionTimeMs,
  };
}

/**
 * Real API: RealtimeSubscriber[] { schema, table, id, columns }
 * Dashboard: RealtimeTableInfo[] { schema, table, subscribers }
 */
export function normalizeRealtimeTables(raw: RawRealtimeSubscriber[]): RealtimeTableInfo[] {
  // Group by table to count subscribers per table
  const map = new Map<string, RealtimeTableInfo>();
  for (const sub of raw) {
    const key = `${sub.schema}.${sub.table}`;
    const existing = map.get(key);
    if (existing) {
      existing.subscribers += 1;
    } else {
      map.set(key, { schema: sub.schema, table: sub.table, subscribers: 1 });
    }
  }
  return Array.from(map.values());
}