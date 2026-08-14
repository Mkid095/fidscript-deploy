'use client';

/**
 * Project Settings — tabbed settings page (Vercel-style).
 *
 * Tabs:
 *   - General        — project name/description editing, subdomain display
 *   - Environment    — encrypted env vars with reveal/hide, add/edit/delete
 *   - API Keys       — project API keys (fpk_) for BaaS-style programmatic access
 *   - Members        — team members and roles
 *   - Invitations    — pending invites
 *   - Build          — build config (strategy, build command, health checks, timeout)
 *   - Danger Zone    — delete project
 */
import { useState } from 'react';
import { Tabs } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Settings01Icon,
  LockKeyIcon,
  SourceCodeIcon,
  UserGroupIcon,
  Mail01Icon,
  Rocket01Icon,
  Delete01Icon,
} from '@hugeicons/core-free-icons';

import { GeneralTab } from './general-tab';
import { EnvironmentTab } from './environment-tab';
import { ApiKeysTab } from './apikeys-tab';
import { MembersTab } from './members-tab';
import { InvitationsTab } from './invitations-tab';
import { BuildTab } from './build-tab';
import { DangerTab } from './danger-tab';
import { useAuth } from '@/contexts/auth-context';
import type { Project } from '@/types';

type TabId = 'general' | 'environment' | 'apikeys' | 'members' | 'invitations' | 'build' | 'danger';

const TABS = [
  { id: 'general' as TabId, label: 'General', icon: <HugeiconsIcon icon={Settings01Icon} size={14} /> },
  { id: 'environment' as TabId, label: 'Environment', icon: <HugeiconsIcon icon={LockKeyIcon} size={14} /> },
  { id: 'apikeys' as TabId, label: 'API Keys', icon: <HugeiconsIcon icon={SourceCodeIcon} size={14} /> },
  { id: 'members' as TabId, label: 'Members', icon: <HugeiconsIcon icon={UserGroupIcon} size={14} /> },
  { id: 'invitations' as TabId, label: 'Invitations', icon: <HugeiconsIcon icon={Mail01Icon} size={14} /> },
  { id: 'build' as TabId, label: 'Build', icon: <HugeiconsIcon icon={Rocket01Icon} size={14} /> },
  { id: 'danger' as TabId, label: 'Danger Zone', icon: <HugeiconsIcon icon={Delete01Icon} size={14} /> },
];

export function SettingsSection({ project }: { project: Project }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>('general');
  const currentUserId = user?.id;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">Settings</h1>
        <p className="text-sm text-[var(--text-muted)]">Manage project configuration, environment, and security.</p>
      </div>

      {/* Tab bar — scrollable on mobile */}
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <Tabs tabs={TABS} value={tab} onChange={v => setTab(v as TabId)} />
      </div>

      {tab === 'general' && <GeneralTab project={project} />}
      {tab === 'environment' && <EnvironmentTab project={project} />}
      {tab === 'apikeys' && <ApiKeysTab project={project} />}
      {tab === 'members' && <MembersTab project={project} currentUserId={currentUserId} />}
      {tab === 'invitations' && <InvitationsTab project={project} />}
      {tab === 'build' && <BuildTab project={project} />}
      {tab === 'danger' && <DangerTab project={project} />}
    </div>
  );
}
