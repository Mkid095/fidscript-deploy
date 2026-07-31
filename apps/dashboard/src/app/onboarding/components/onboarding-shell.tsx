'use client';

interface OnboardingShellProps {
  title: string;
  subtitle: string;
  maxWidth?: '420' | '480' | '560';
  children: React.ReactNode;
}

export function OnboardingShell({
  title,
  subtitle,
  maxWidth = '480',
  children,
}: OnboardingShellProps) {
  const widthClass = maxWidth === '420' ? 'max-w-[420px]' : maxWidth === '560' ? 'max-w-[560px]' : 'max-w-[480px]';
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] px-4 py-12">
      <div className={`w-full ${widthClass}`}>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            {subtitle}
          </p>
        </div>
        <div className="bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--rail-light)] p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
