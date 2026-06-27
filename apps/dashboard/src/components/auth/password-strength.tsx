'use client';

interface PasswordStrengthProps {
  password: string;
}

type Strength = 'none' | 'weak' | 'fair' | 'strong';

function getStrength(password: string): Strength {
  if (!password) return 'none';
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (score <= 2) return 'weak';
  if (score <= 4) return 'fair';
  return 'strong';
}

const labelColor: Record<Strength, string> = {
  none: '',
  weak: 'text-[var(--danger)]',
  fair: 'text-[var(--warning)]',
  strong: 'text-green-400',
};

const barColor: Record<Strength, string> = {
  none: 'bg-[var(--rail)]',
  weak: 'bg-[var(--danger)]',
  fair: 'bg-yellow-500',
  strong: 'bg-green-500',
};

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = getStrength(password);
  if (strength === 'none') return null;

  const bars = [0, 1, 2].map((i) => {
    const level = i === 0 ? 'weak' : i === 1 ? 'fair' : 'strong';
    const active = strength === 'weak' ? i === 0 : strength === 'fair' ? i <= 1 : true;
    return (
      <div
        key={i}
        className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
          active ? barColor[strength] : 'bg-[var(--rail)]'
        }`}
      />
    );
  });

  return (
    <div className="space-y-1">
      <div className="flex gap-1">{bars}</div>
      <p className={`text-xs ${labelColor[strength]}`}>
        {strength === 'weak' ? 'Weak' : strength === 'fair' ? 'Fair' : 'Strong'}
      </p>
    </div>
  );
}
