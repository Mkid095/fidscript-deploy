'use client';

/**
 * ActivityIcon — maps an event-type category key to its Hugeicons glyph.
 *
 * Receives the iconType string returned by iconTypeFor() in the utils and
 * renders the matching icon. Pure presentation.
 */
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Rocket01Icon, UserGroupIcon, LockPasswordIcon, Mail01Icon,
  Database02Icon, Globe02Icon, UserWarning01Icon, Activity01Icon,
} from '@hugeicons/core-free-icons';

interface ActivityIconProps {
  type: string;
  className?: string;
}

export function ActivityIcon({ type, className }: ActivityIconProps) {
  const iconClass = className ?? 'text-[var(--text-muted)]';
  switch (type) {
    case 'rocket':   return <HugeiconsIcon icon={Rocket01Icon} size={16} color="currentColor" className={iconClass} />;
    case 'users':    return <HugeiconsIcon icon={UserGroupIcon} size={16} color="currentColor" className={iconClass} />;
    case 'lock':     return <HugeiconsIcon icon={LockPasswordIcon} size={16} color="currentColor" className={iconClass} />;
    case 'mail':     return <HugeiconsIcon icon={Mail01Icon} size={16} color="currentColor" className={iconClass} />;
    case 'db':       return <HugeiconsIcon icon={Database02Icon} size={16} color="currentColor" className={iconClass} />;
    case 'globe':    return <HugeiconsIcon icon={Globe02Icon} size={16} color="currentColor" className={iconClass} />;
    case 'warning':  return <HugeiconsIcon icon={UserWarning01Icon} size={16} color="currentColor" className={iconClass} />;
    default:         return <HugeiconsIcon icon={Activity01Icon} size={16} color="currentColor" className={iconClass} />;
  }
}
