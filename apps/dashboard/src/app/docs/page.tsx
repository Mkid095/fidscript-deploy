import { redirect } from 'next/navigation';

import { DOCS } from '@/content/docs';

// /docs → first doc in the content list.
export default function DocsIndex() {
  redirect(`/docs/${DOCS[0].slug}`);
}
