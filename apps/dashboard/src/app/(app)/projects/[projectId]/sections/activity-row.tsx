'use client';

/**
 * ActivityRow — single line in the project Activity feed.
 *
 * Renders the icon (color-tinted by event outcome), description, actor label,
 * and a relative time. Pure presentation.
 */
import { formatActivityTime, type ActivityEvent } from './activity-utils';
import { ActivityIcon } from './activity-icon';

interface ActivityRowProps {
  event: ActivityEvent;
}

export function ActivityRow({ event }: ActivityRowProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--rail)]/50 last:border-0">
      <div className={`mt-0.5 flex-shrink-0 ${event.iconColor}`}>
        <ActivityIcon type={event.iconType} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-muted)] leading-snug">{event.description}</p>
        <p className="text-xs text-[var(--text-dim)] mt-0.5">
          {event.actorLabel}
        </p>
      </div>
      <span className="text-xs text-[var(--text-dim)] flex-shrink-0 mt-0.5">
        {formatActivityTime(event.timestamp)}
      </span>
    </div>
  );
}
