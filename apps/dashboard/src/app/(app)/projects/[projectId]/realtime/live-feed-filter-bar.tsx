'use client';

/**
 * LiveFeedFilterBar — category chips that scope the visible event list.
 *
 * Pure presentation: takes the events list, the active filter, and an onChange
 * callback. Renders an "All" chip plus one chip per category that appears in
 * the events.
 */
import {
  LIVE_CATEGORIES,
  LIVE_FALLBACK_CATEGORY,
  liveCategoryOf,
  type LiveEvent,
} from './live-feed-utils';
import { FilterChip } from './live-feed-filter-chip';

interface LiveFeedFilterBarProps {
  events: LiveEvent[];
  filter: string;
  onFilterChange: (next: string) => void;
}

export function LiveFeedFilterBar({ events, filter, onFilterChange }: LiveFeedFilterBarProps) {
  const presentCategories = new Set<string>();
  for (const e of events) presentCategories.add(liveCategoryOf(e.type).key);
  const keys = Array.from(presentCategories).sort();

  return (
    <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[var(--rail)] overflow-x-auto">
      <FilterChip active={filter === 'all'} onClick={() => onFilterChange('all')} label={`All (${events.length})`} />
      {keys.map(key => {
        const cat = LIVE_CATEGORIES[key] ?? LIVE_FALLBACK_CATEGORY;
        const count = events.filter(e => liveCategoryOf(e.type).key === key).length;
        return (
          <FilterChip
            key={key}
            active={filter === key}
            onClick={() => onFilterChange(key)}
            label={`${cat.label} (${count})`}
            accent={cat.cls}
          />
        );
      })}
    </div>
  );
}
