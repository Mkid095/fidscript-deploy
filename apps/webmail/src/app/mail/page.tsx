import { redirect } from 'next/navigation';

/** /mail is where the inbox is. */
export default function MailIndexPage() {
  redirect('/mail/inbox');
}
