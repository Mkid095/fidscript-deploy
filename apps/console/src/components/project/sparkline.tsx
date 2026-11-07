/**
 * A small graph of a project's activity.
 *
 * Twenty-four points, an hour each, drawn as a bar. There is no chart
 * library here on purpose: this is forty lines of markup, and it looks
 * exactly like the rest of the console.
 */
export function Sparkline({
  values,
  width = 96,
  height = 22,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length === 0) {
    return <div style={{ width, height }} aria-hidden />;
  }

  const max = Math.max(...values, 1);
  const gap = 1;
  const barWidth = Math.max(1, (width - gap * (values.length - 1)) / values.length);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="The project's activity over the last day"
      className="shrink-0"
    >
      {values.map((value, index) => {
        const barHeight = value > 0 ? Math.max(2, (value / max) * height) : 1;
        return (
          <rect
            key={index}
            x={index * (barWidth + gap)}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            rx="1"
            fill={value > 0 ? 'var(--accent)' : 'var(--rail)'}
          />
        );
      })}
    </svg>
  );
}
