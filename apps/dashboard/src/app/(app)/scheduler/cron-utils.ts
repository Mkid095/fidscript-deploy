const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return expr;
  const [min, hour, dom, mon, dow] = parts;
  if (expr === '* * * * *') return 'Every minute';
  if (min.startsWith('*/')) return `Every ${min.slice(2)} minutes`;
  if (hour === '*' && dom === '*' && mon === '*' && dow === '*')
    return `Every hour at minute ${min}`;
  if (dom === '*' && mon === '*' && dow === '*')
    return `Daily at ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  if (dom === '*' && mon === '*')
    return `Weekly on ${DOW_LABELS[parseInt(dow)]} at ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  if (mon === '*' && dow === '*')
    return `Monthly on day ${dom} at ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  return expr;
}

export function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000);
}

function setDateTimeParts(date: Date, hour: number, minute: number): Date {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function getNextRuns(expr: string, count: number): Date[] {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return [];
  const [min, hour, dom, mon, dow] = parts;
  const now = new Date();
  const runs: Date[] = [];
  const minVal = parseInt(min);
  const hourVal = parseInt(hour);
  const domVal = parseInt(dom);
  const dowVal = parseInt(dow);

  if (expr === '* * * * *') {
    let cursor = addMinutes(now, 1);
    while (runs.length < count) { runs.push(new Date(cursor)); cursor = addMinutes(cursor, 1); }
    return runs;
  }
  if (min.startsWith('*/')) {
    const step = parseInt(min.slice(2));
    let cursor = addMinutes(now, 1);
    while (runs.length < count) { runs.push(new Date(cursor)); cursor = addMinutes(cursor, step); }
    return runs;
  }
  if (hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    let cursor = setDateTimeParts(now, now.getHours(), minVal);
    if (cursor <= now) cursor = addMinutes(cursor, 60);
    while (runs.length < count) { runs.push(new Date(cursor)); cursor = addMinutes(cursor, 60); }
    return runs;
  }
  if (dom === '*' && mon === '*' && dow === '*') {
    let cursor = setDateTimeParts(now, hourVal, minVal);
    if (cursor <= now) cursor = addMinutes(cursor, 1440);
    while (runs.length < count) { runs.push(new Date(cursor)); cursor = addMinutes(cursor, 1440); }
    return runs;
  }
  if (dom === '*' && mon === '*') {
    let cursor = setDateTimeParts(now, hourVal, minVal);
    while (cursor <= now || cursor.getDay() !== dowVal) cursor = addMinutes(cursor, 1);
    while (runs.length < count) {
      while (cursor.getDay() !== dowVal) cursor = addMinutes(cursor, 1);
      runs.push(new Date(cursor));
      cursor = addMinutes(cursor, 10080);
    }
    return runs;
  }
  if (mon === '*' && dow === '*') {
    let cursor = setDateTimeParts(now, hourVal, minVal);
    cursor.setDate(domVal);
    if (cursor <= now) cursor = addMinutes(cursor, 43200);
    while (runs.length < count) {
      while (cursor.getDate() !== domVal) cursor = addMinutes(cursor, 1440);
      runs.push(new Date(cursor));
      cursor = addMinutes(cursor, 43200);
    }
    return runs;
  }
  let cursor = addMinutes(now, 1);
  while (runs.length < count && cursor.getTime() - now.getTime() < 525600 * 60_000) {
    runs.push(new Date(cursor));
    cursor = addMinutes(cursor, 1);
  }
  return runs;
}
