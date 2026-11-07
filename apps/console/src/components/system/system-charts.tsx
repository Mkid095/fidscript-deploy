import type { Series, Sample } from '@/lib/api/metrics';

/**
 * The charts.
 *
 * Drawn here, in SVG, with no library: a chart that is a hundred lines of
 * markup is a hundred lines less to keep working, and it looks exactly the
 * way the rest of the console looks.
 */

/** A line over time, with the area under it. */
export function AreaChart({
  series,
  height = 120,
  format = (value) => value.toFixed(1),
  empty = 'Nothing to show yet',
}: {
  series: Series[];
  height?: number;
  format?: (value: number) => string;
  empty?: string;
}) {
  const points = series.flatMap((entry) => entry.points);
  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-rail py-8 text-xs text-text-dim">
        {empty}
      </div>
    );
  }

  const width = 600;
  const times = points.map((point) => point.at);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const maxValue = Math.max(...points.map((point) => point.value), 0.0001);

  const x = (at: number) =>
    ((at - minTime) / Math.max(1, maxTime - minTime)) * (width - 8) + 4;
  const y = (value: number) => height - 12 - (value / maxValue) * (height - 24);

  const lines = series.map((entry) => ({
    name: entry.name,
    path: entry.points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.at).toFixed(1)} ${y(point.value).toFixed(1)}`)
      .join(' '),
    area: `${entry.points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.at).toFixed(1)} ${y(point.value).toFixed(1)}`)
      .join(' ')} L ${x(entry.points[entry.points.length - 1].at).toFixed(1)} ${height - 12} L ${x(entry.points[0].at).toFixed(1)} ${height - 12} Z`,
    last: entry.points[entry.points.length - 1]?.value ?? 0,
  }));

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={`${series.length} series over the last hour`}
      >
        {[0.25, 0.5, 0.75].map((step) => (
          <line
            key={step}
            x1="4"
            x2={width - 4}
            y1={height - 12 - step * (height - 24)}
            y2={height - 12 - step * (height - 24)}
            stroke="var(--rail)"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
        ))}

        {lines.map((line) => (
          <g key={line.name}>
            <path d={line.area} fill="var(--accent)" opacity="0.08" />
            <path
              d={line.path}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </g>
        ))}
      </svg>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {lines.slice(0, 6).map((line) => (
          <li key={line.name} className="flex items-center gap-1.5 text-xs text-text-dim">
            <span className="size-1.5 rounded-full bg-accent" />
            <span className="truncate">{line.name}</span>
            <span className="font-mono text-text-muted">{format(line.last)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A list of things, with a bar for each — what is using the most. */
export function BarList({
  samples,
  format = (value) => value.toFixed(0),
  limit = 8,
}: {
  samples: Sample[];
  format?: (value: number) => string;
  limit?: number;
}) {
  const sorted = [...samples].sort((a, b) => b.value - a.value).slice(0, limit);
  const max = Math.max(...sorted.map((sample) => sample.value), 0.0001);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-rail py-8 text-xs text-text-dim">
        Nothing to show yet
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {sorted.map((sample) => (
        <li key={sample.name}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-xs text-text-muted">{sample.name}</span>
            <span className="shrink-0 font-mono text-xs text-text">{format(sample.value)}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.max(2, (sample.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A number with what it is, and how much of the whole it is. */
export function Meter({
  label,
  used,
  total,
  format = (value) => `${(value / 1024 ** 3).toFixed(1)} GB`,
}: {
  label: string;
  used: number;
  total: number;
  format?: (value: number) => string;
}) {
  const share = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-text-muted">{label}</span>
        <span className="text-sm text-text">
          {format(used)}
          {total > 0 ? <span className="text-text-dim"> of {format(total)}</span> : null}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
        <div
          className={`h-full rounded-full ${share > 85 ? 'bg-danger' : share > 65 ? 'bg-warning' : 'bg-accent'}`}
          style={{ width: `${Math.max(1, share)}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-text-dim">{share}% used</p>
    </div>
  );
}
