'use client';

interface AuthPageShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: '420' | '480' | '560';
}

export function AuthPageShell({
  title,
  subtitle,
  children,
  footer,
  maxWidth = '420',
}: AuthPageShellProps) {
  const widthClass = maxWidth === '480' ? 'max-w-[480px]' : maxWidth === '560' ? 'max-w-[560px]' : 'max-w-[420px]';
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
        <div className="relative bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--rail-light)] p-6 sm:p-8">
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}
