// ─── Helpers ─────────────────────────────────────────────────────────────────

export function inferTabName(sql: string): string {
  const trimmed = sql.trim();
  if (!trimmed) return 'Untitled';
  const upper = trimmed.toUpperCase();
  if (upper.startsWith('SELECT')) {
    const match = trimmed.match(/FROM\s+(\w+)/i);
    if (match) return `${match[1]} query`;
    return 'SELECT query';
  }
  if (upper.startsWith('INSERT')) return 'INSERT';
  if (upper.startsWith('UPDATE')) return 'UPDATE';
  if (upper.startsWith('DELETE')) return 'DELETE';
  if (upper.startsWith('CREATE TABLE')) return 'CREATE TABLE';
  if (upper.startsWith('CREATE INDEX')) return 'CREATE INDEX';
  if (upper.startsWith('CREATE FUNCTION')) return 'CREATE FUNCTION';
  if (upper.startsWith('ALTER')) return 'ALTER';
  if (upper.startsWith('DROP')) return 'DROP';
  if (upper.startsWith('EXPLAIN')) return 'EXPLAIN';
  if (upper.startsWith('SET')) return 'SET';
  return trimmed.split('\n')[0].slice(0, 40);
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(columns: string[], rows: Record<string, unknown>[]) {
  const header = columns.map(c => `"${c}"`).join(',');
  const lines = rows.map(row =>
    columns.map(c => {
      const v = row[c];
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(',')
  );
  downloadBlob([header, ...lines].join('\n'), 'query_result.csv', 'text/csv');
}

export function exportJSON(rows: Record<string, unknown>[]) {
  downloadBlob(JSON.stringify(rows, null, 2), 'query_result.json', 'application/json');
}

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}
