'use client';

// Root route — redirect to the canonical projects page.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/projects'); }, [router]);
  return null;
}
