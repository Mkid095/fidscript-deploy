'use client';

/**
 * Database list layout — pass-through that wraps the list page.
 * The sidebar nav lives ONLY in [databaseId]/layout.tsx (per-database),
 * so we don't get a duplicate sidebar when navigating into a specific DB.
 */
export default function DatabaseListLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
