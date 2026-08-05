'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  Rocket01Icon,
  UserGroupIcon,
  LockPasswordIcon,
  Mail01Icon,
  Database02Icon,
  Globe02Icon,
  UserWarning01Icon,
  Activity01Icon,
} from '@hugeicons/core-free-icons';

const ICON_MAP = {
  rocket: Rocket01Icon,
  users: UserGroupIcon,
  lock: LockPasswordIcon,
  mail: Mail01Icon,
  db: Database02Icon,
  globe: Globe02Icon,
  warning: UserWarning01Icon,
  activity: Activity01Icon,
} as const;

export function IconForType({ type, className }: { type: string; className?: string }) {
  const iconClass = className ?? 'text-[var(--text-muted)]';
  const Icon = ICON_MAP[type as keyof typeof ICON_MAP] ?? Activity01Icon;
  return <HugeiconsIcon icon={Icon} size={16} color="currentColor" className={iconClass} />;
}
