/**
 * The three levels.
 *
 * The old page never said them, and that is most of why the platform felt
 * confusing: a person could not tell a platform page from a project page
 * from an application. Here they are, in the order they nest.
 */
const LEVELS = [
  {
    level: 'Platform',
    question: 'What is installed, and who am I?',
    body: 'Your account, your projects, your keys — and the applications this platform has. The top bar.',
  },
  {
    level: 'Project',
    question: 'What does this project do, and what does it have?',
    body: 'One workspace: its members, its settings, and the capabilities switched on for it. The sidebar.',
  },
  {
    level: 'Application',
    question: 'Is the tooling this platform relies on healthy?',
    body: 'Installed once, checked on occasion. It lives in the platform’s settings — never in a permanent menu.',
  },
];

export function LandingLevels() {
  return (
    <section id="levels" className="border-b border-rail bg-canvas py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-text">
            Three levels, and you always know which one you are in
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            A screen belongs to exactly one level. A menu is derived from what the thing really
            has. And a one-time thing never sits in a permanent menu.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {LEVELS.map((level) => (
            <div key={level.level} className="rounded-xl border border-rail bg-surface p-5">
              <h3 className="text-sm font-semibold text-text">{level.level}</h3>
              <p className="mt-1 text-[13px] italic text-text-dim">“{level.question}”</p>
              <p className="mt-2 text-[13px] leading-relaxed text-text-muted">{level.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
