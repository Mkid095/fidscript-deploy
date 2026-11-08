/**
 * The applications.
 *
 * The old page called these "features" and counted them. They are
 * applications — products the operator installs once — and each one is
 * either linked out to, wrapped, or both.
 */
export const APPLICATIONS = [
  {
    name: 'Instant BaaS',
    treatment: 'Link out',
    body: 'The realtime backend: your app’s tables, users, permissions, files and realtime. FIDScript provisions it and deep-links to its console.',
  },
  {
    name: 'Deployment engine',
    treatment: 'Native',
    body: 'Git push to a running application. Build, release, roll back — the platform’s own, and the reason the platform exists.',
  },
  {
    name: 'Stalwart',
    treatment: 'Wrapped',
    body: 'Mail on your own domain. The mail server stays invisible; you get domains, mailboxes, aliases and deliverability.',
  },
  {
    name: 'Verdaccio',
    treatment: 'Wrapped',
    body: 'A private npm and Maven registry, so your packages have a home that does not depend on a public one.',
  },
  {
    name: 'Viventure',
    treatment: 'Both',
    body: 'WhatsApp on the Evolution API. Instances and tokens inside the project; the console for everything deeper.',
  },
  {
    name: 'Observability',
    treatment: 'Wrapped',
    body: 'Prometheus, Loki and Grafana. Metrics and logs per project; Grafana for the power users.',
  },
  {
    name: 'App runtime',
    treatment: 'Invisible',
    body: 'The registry that stores your built images. Health only — it has no console to open.',
  },
];

export function LandingApplications() {
  return (
    <section
      id="applications"
      className="border-b border-rail bg-surface py-20"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-text">
            The applications you install once
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            The platform does not re-implement what these do well. It installs
            them, keeps them healthy, and gives every project a consistent way
            to use them.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {APPLICATIONS.map((app) => (
            <div
              key={app.name}
              className="flex flex-col rounded-xl border border-rail bg-surface-2 p-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">{app.name}</h3>
                <span className="rounded-md border border-rail px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-dim">
                  {app.treatment}
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
                {app.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
