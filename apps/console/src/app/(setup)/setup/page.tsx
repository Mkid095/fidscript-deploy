import { discover, installationStatus } from '@/lib/api/installation';
import { applications } from '@/lib/api/platform';
import { SetupWizard } from '@/components/setup/setup-wizard';

export const metadata = { title: 'Set up FIDScript' };

/**
 * The setup.
 *
 * The same order the installer asks in: the domain, the administrator, the
 * applications — and then it is done, with the domain's records written by
 * the platform when a Cloudflare token was given.
 */
export default async function SetupPage() {
  const [discovery, status, catalogue] = await Promise.all([
    discover(),
    installationStatus(),
    applications().catch(() => []),
  ]);

  const configured = status?.lifecycle === 'CONFIGURED';

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-text">
          Set up FIDScript
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {configured
            ? 'This platform is already set up. What is left is what it provides.'
            : 'A few details, and the platform is yours.'}
        </p>
      </header>

      <SetupWizard
        serverIp={discovery?.serverIp ?? ''}
        configured={configured}
        applications={catalogue}
      />
    </div>
  );
}
