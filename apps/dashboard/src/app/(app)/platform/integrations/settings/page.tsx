'use client';

import { IntegrationConfigModal } from './integration-config-modal';

export default function IntegrationsSettingsPage() {
  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--text)]">Integrations</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage third-party service integrations for this platform.</p>
      </div>
      <IntegrationConfigModal />
    </div>
  );
}
