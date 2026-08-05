import type { ColumnInfo } from '@/types';

export const PAGE_SIZE = 50;

export function parseCellValue(value: string, type: string): unknown {
  if (value === '' || value === 'NULL') return null;
  if (['integer', 'smallint', 'bigint', 'bigserial', 'serial'].some(t => type.includes(t))) {
    return BigInt(value);
  }
  if (['float4', 'float8', 'real', 'numeric', 'decimal'].some(t => type.includes(t))) {
    return parseFloat(value);
  }
  if (type === 'boolean') return value === 'true' || value === '1';
  if (type.startsWith('_')) return value.split(',');
  return value;
}

export function getPrimaryKey(
  colInfos: ColumnInfo[] | undefined,
  data: Record<string, unknown>[],
): string {
  return (colInfos?.find(c => c.isPrimaryKey)?.name
    ?? (data && data.length > 0 && 'id' in data[0] ? 'id'
      : (data && data.length > 0 && Object.keys(data[0]).length > 0 ? Object.keys(data[0])[0] : 'id'))) as string;
}
