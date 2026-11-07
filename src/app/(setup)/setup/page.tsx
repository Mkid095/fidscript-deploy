import { discover, installationStatus, validateInstallation } from '@/lib/api/installation';
import { applications } from '@/lib/api/platform';
import { SetupWizard } from '@/components/setup/setup-wizard';

export const metadata = { title: 'Set up FIDScript' };

/**
 * The setup.
 *
 * One wizard, and a **reachable** completion screen — the guide is explicit
 * that the done step must be a page somebody can land on, not a state the
 * wizard falls out of.
 */
export default async function SetupPage() {
  const [discovery, validations, status, catalogue] = await Promise.all([
    discover(),
    validateInstallation(),
    installationStatus(),
    applications().catch(() => []),
  ]);

  return (
    <SetupWizard
      discovery={discovery}
      validations={validations}
      status={status}
      applications={catalogue}
    />
  );
}
