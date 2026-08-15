'use client';

import {
  Rocket01Icon,
  SourceCodeIcon,
  Database01Icon,
  HardDriveIcon,
  Share08Icon,
  Clock01Icon,
  Mail01Icon,
  GlobalIcon,
  FlashIcon,
  Analytics01Icon,
  Note01Icon,
  Settings01Icon,
  Layers01Icon,
  InternetIcon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import type { ProjectMode } from './use-project-mode';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: typeof Rocket01Icon;
  badge?: string;
  adminOnly?: boolean;
}

// ─── Deploy-mode nav (application developer) ─────────────────────────────────

export const DEPLOY_NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Deploy',
    items: [
      { id: 'services',    label: 'Services',    href: '/services',    icon: Rocket01Icon },
      { id: 'functions',  label: 'Functions',   href: '/functions',   icon: SourceCodeIcon },
      { id: 'deployments',label: 'Deployments', href: '/deployments', icon: InternetIcon  },
    ],
  },
  {
    label: 'Data',
    items: [
      { id: 'databases', label: 'Databases', href: '/databases', icon: Database01Icon },
      { id: 'storage',   label: 'Storage',   href: '/storage',   icon: HardDriveIcon  },
    ],
  },
  {
    label: 'Automation',
    items: [
      { id: 'domains',   label: 'Domains',   href: '/domains',   icon: GlobalIcon   },
      { id: 'email',    label: 'Email',    href: '/email',    icon: Mail01Icon   },
      { id: 'scheduler',label: 'Scheduler', href: '/scheduler', icon: Clock01Icon  },
    ],
  },
  {
    label: 'Observe',
    items: [
      { id: 'monitoring', label: 'Monitoring', href: '/monitoring', icon: Analytics01Icon },
      { id: 'logs',       label: 'Logs',       href: '/logs',       icon: Note01Icon    },
    ],
  },
  {
    label: 'Settings',
    items: [
      { id: 'settings', label: 'Settings', href: '/settings', icon: Settings01Icon, adminOnly: true },
    ],
  },
];

// ─── BaaS-mode nav (backend developer) ─────────────────────────────────────

export const BAAS_NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Platform',
    items: [
      { id: 'mcp',      label: 'API & MCP',  href: '/mcp',        icon: Layers01Icon  },
      { id: 'databases',label: 'Databases',  href: '/databases',  icon: Database01Icon },
      { id: 'storage',  label: 'Storage',    href: '/storage',    icon: HardDriveIcon  },
      { id: 'queues',   label: 'Queues',     href: '/queues',     icon: Share08Icon    },
      { id: 'realtime', label: 'Realtime',   href: '/realtime',   icon: FlashIcon      },
    ],
  },
  {
    label: 'Automation',
    items: [
      { id: 'scheduler', label: 'Scheduler', href: '/scheduler', icon: Clock01Icon },
      { id: 'email',    label: 'Email',     href: '/email',     icon: Mail01Icon },
      { id: 'domains',   label: 'Domains',   href: '/domains',   icon: GlobalIcon },
    ],
  },
  {
    label: 'Observe',
    items: [
      { id: 'monitoring', label: 'Monitoring', href: '/monitoring', icon: Analytics01Icon },
      { id: 'logs',       label: 'Logs',       href: '/logs',       icon: Note01Icon      },
    ],
  },
  {
    label: 'Settings',
    items: [
      { id: 'settings', label: 'Settings', href: '/settings', icon: Settings01Icon, adminOnly: true },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getNavGroups(mode: ProjectMode) {
  return mode === 'baas' ? BAAS_NAV_GROUPS : DEPLOY_NAV_GROUPS;
}

export const MOBILE_PRIORITY_IDS_DEPLOY = ['services', 'databases', 'storage', 'logs'];
export const MOBILE_PRIORITY_IDS_BAAS  = ['mcp', 'databases', 'storage', 'queues'];

export function getMobilePriorityIds(mode: ProjectMode) {
  return mode === 'baas' ? MOBILE_PRIORITY_IDS_BAAS : MOBILE_PRIORITY_IDS_DEPLOY;
}
