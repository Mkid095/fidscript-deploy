'use client';

// Root route — redirect to the Applications screen, which is where an
// operator arrives: it is the answer to "what can this platform do for me".
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/applications'); }, [router]);
  return null;
}
