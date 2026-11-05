'use client';

import {
  Analytics01Icon,
  Chat01Icon,
  CubeIcon,
  HierarchyIcon,
  Mail01Icon,
  Package01Icon,
  Rocket01Icon,
} from '@hugeicons/core-free-icons';

/**
 * The icon each application is drawn with.
 *
 * The API names the icon; this is where the name becomes a component. An
 * application the catalogue does not know about gets a neutral one — it is
 * listed either way, and the operator should still see it.
 */
export const APPLICATION_ICONS: Record<string, typeof Rocket01Icon> = {
  rocket: Rocket01Icon,
  mail: Mail01Icon,
  chat: Chat01Icon,
  hierarchy: HierarchyIcon,
  package: Package01Icon,
  analytics: Analytics01Icon,
  cube: CubeIcon,
};

export function applicationIcon(name: string): typeof Rocket01Icon {
  return APPLICATION_ICONS[name] ?? CubeIcon;
}
