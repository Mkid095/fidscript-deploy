'use client';

import Image from 'next/image';

export function SetupLogo() {
  return (
    <div className="mb-8 text-center">
      <Image
        src="https://res.cloudinary.com/dfp7uhzy3/image/upload/v1782017464/Generated_Image_June_21__2026_-_2_00AM-removebg-preview_ekpdad.png"
        alt="FIDScript"
        width={64}
        height={64}
        className="mx-auto mb-3 rounded-xl"
      />
      <p className="text-sm font-bold tracking-widest text-[var(--warning)] uppercase">fidscript deploy</p>
    </div>
  );
}
