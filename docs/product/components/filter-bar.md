# Component Spec — `FilterBar`

> The canonical filter bar: search + status + time + sort. Used by every list.

## 1. Purpose
The user narrows a list to what they care about. The principle: **filters are first-class;
the user can see the active filters and clear them.**

## 2. Props
```ts
type FilterBarProps<TFilters> = {
  /** The current filter state. */
  filters: TFilters;
  /** The change callback. */
  onChange: (filters: TFilters) => void;
  /** The search placeholder. */
  searchPlaceholder?: string;
  /** Status filter options (key, label, color). */
  statusOptions?: Array<{ key: string; label: string }>;
  /** Time range options. */
  timeOptions?: Array<{ key: '1h' | '24h' | '7d' | '30d' | 'custom'; label: string }>;
  /** Sort options. */
  sortOptions?: Array<{ key: string; label: string }>;
};
```

## 3. Visual anatomy
```
[Search...]  Status: [● Pending] [○ Failed] [○ All]   Time: [Last 24h ▼]   Sort: [Created ▼]
```

## 4. States
- **Idle**: all filters at their defaults.
- **Searching**: input focused; results filter live.
- **Active filters**: chips appear below the bar with × to remove.
- **Empty**: not applicable.

## 5. Variants
- **Density**: comfortable (default); compact.
- **Theme**: dark/light.

## 6. Interactions
- **Type**: filters live (debounced 100ms for async).
- **Click status**: toggle.
- **Click time**: open dropdown.
- **Clear all**: removes all active filters.

## 7. Accessibility
- **Search**: `role="searchbox"`.
- **Status chips**: `role="group"` with `aria-label="Status filter"`.
- **Active filter chips**: `aria-label="Remove <filter>"` on the × button.

## 8. Telemetry / events
- `filter_bar.changed` → `{ filters, activeCount }`.

## 9. Cross-references
- **Screens**: every list (Deployments, Functions, Databases, Queues, Logs, etc.).

## 10. Acceptance criteria
- Renders search + status + time + sort.
- Active filters appear as chips with × to remove.
- Clear all removes all chips.
- Live filter.
- Keyboard navigation works.
- Theme-aware.