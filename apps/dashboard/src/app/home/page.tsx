import { redirect } from 'next/navigation';

/** The landing page lives at the root now. */
export default function Home() {
  redirect('/');
}
