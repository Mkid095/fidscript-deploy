'use client';

import { Tabs, type TabItem } from '@fidscript/ui';

import { DomainsTab } from './domains-tab';
import { MailboxesTab } from './mailboxes-tab';
import { AliasesTab } from './aliases-tab';
import { IdentitiesTab } from './identities-tab';
import { ApiKeysTab } from './api-keys-tab';
import { MessagesTab } from './messages-tab';

export type EmailTab = 'domains' | 'mailboxes' | 'aliases' | 'identities' | 'api-keys' | 'messages';

interface Props {
  active: EmailTab;
  onChange: (tab: EmailTab) => void;
}

const TABS: TabItem[] = [
  { id: 'domains',    label: 'Domains' },
  { id: 'mailboxes',  label: 'Mailboxes' },
  { id: 'aliases',    label: 'Aliases' },
  { id: 'identities', label: 'Identities' },
  { id: 'api-keys',   label: 'API Keys' },
  { id: 'messages',   label: 'Messages' },
];

export function EmailTabs({ active, onChange }: Props) {
  return (
    <div className="space-y-5">
      <Tabs tabs={TABS} value={active} onChange={(id) => onChange(id as EmailTab)} />
      <div>
        {active === 'domains'    && <DomainsTab />}
        {active === 'mailboxes'  && <MailboxesTab />}
        {active === 'aliases'    && <AliasesTab />}
        {active === 'identities' && <IdentitiesTab />}
        {active === 'api-keys'   && <ApiKeysTab />}
        {active === 'messages'   && <MessagesTab />}
      </div>
    </div>
  );
}
