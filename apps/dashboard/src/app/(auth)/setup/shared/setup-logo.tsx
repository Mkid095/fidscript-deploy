'use client';

import Image from 'next/image';

export function SetupLogo() {
  return (
    <div className="mb-8 text-center">
      <Image
        src="/logo.png"
        alt="FIDScript"
        width={64}
        height={64}
        className="mx-auto mb-3 rounded-xl"
      />
      <p className="text-sm font-bold tracking-widest text-[var(--warning)] uppercase">fidscript deploy</p>
    </div>
  );
}
