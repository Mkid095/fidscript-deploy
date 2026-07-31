'use client';

interface Props {
  message: string;
  type: 'success' | 'error';
}

export function DbToast({ message, type }: Props) {
  return (
    <div className={`px-4 py-3 rounded border text-sm ${
      type === 'success'
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
    }`}>
      {message}
    </div>
  );
}
