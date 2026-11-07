import { notFound } from 'next/navigation';

import { LandingNav } from '@/components/landing/landing-nav';
import { DocView } from '@/components/docs/doc-view';
import { findDocPage } from '@/content/docs';

export const metadata = { title: 'The guide · FIDScript' };

/**
 * One page of the guide.
 *
 * The pages are written down, not fetched — so they are here even when the
 * platform is having a bad day.
 */
export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = findDocPage(slug);

  if (!page) notFound();

  return (
    <div className="min-h-screen bg-canvas">
      <LandingNav />
      <DocView page={page} />
    </div>
  );
}
