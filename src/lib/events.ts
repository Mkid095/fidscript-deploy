/**
 * The events, said in words.
 *
 * The platform emits names like `projects.project.updated`. They are exact
 * and they are for machines; a person reads "A project was changed".
 *
 * Every name the platform can emit for a project is here. A name that is
 * not here is shown as it is — the console does not pretend to know what
 * something it has not heard of.
 */
const WORDS: Record<string, string> = {
  // Projects.
  'projects.project.created': 'A project was created.',
  'projects.project.updated': 'A project was changed.',
  'projects.project.deleted': 'A project was deleted.',
  'projects.project.archived': 'A project was archived.',
  'projects.project.restored': 'A project was restored.',
  'projects.project.suspended': 'A project was suspended.',
  'projects.project.cloned': 'A project was cloned.',
  'projects.project.provisioned': 'A project was provisioned.',
  'projects.project.purged': 'A project was purged.',

  // The people in it.
  'projects.member.added': 'Somebody was added to the project.',
  'projects.member.removed': 'Somebody was removed from the project.',
  'projects.member.role_changed': "Somebody's role was changed.",
  'projects.invitation.created': 'An invitation was made.',
  'projects.invitation.accepted': 'An invitation was accepted.',
  'projects.invitation.revoked': 'An invitation was withdrawn.',

  // Its settings.
  'projects.env_var.updated': 'The environment variables were changed.',
  'projects.env_var.deleted': 'An environment variable was removed.',
  'projects.api_key.created': 'An API key was made.',
  'projects.api_key.revoked': 'An API key was revoked.',

  // What it holds.
  'database.provisioned': 'A database was provisioned.',
  'database.updated': 'A database was changed.',
  'database.deleted': 'A database was removed.',
  'database.backup_started': 'A backup started.',
  'database.backup_completed': 'A backup finished.',
  'function.created': 'A function was created.',
  'function.deployed': 'A function was deployed.',
  'function.deleted': 'A function was removed.',
  'domains.repair.failed': 'A domain repair failed.',
  'storage.bucket.created': 'A storage bucket was created.',
  'storage.bucket.deleted': 'A storage bucket was removed.',

  // Its mail.
  'email.domain_added': 'A mail domain was added.',
  'email.domain_deleted': 'A mail domain was removed.',
  'email.domain_verified': 'A mail domain was verified.',
  'email.alias_created': 'An alias was created.',
  'email.alias_deleted': 'An alias was removed.',
  'email.api_key_created': 'A mail key was made.',
  'email.api_key_deleted': 'A mail key was removed.',
  'email.message_sent': 'A message was sent.',
  'email.message_delivered': 'A message was delivered.',
  'email.bounced': 'A message bounced.',
  'email.failed': 'A message failed.',

  // The platform itself.
  'auth.login_succeeded': 'Somebody signed in.',
  'auth.user_created': 'An account was created.',
};

/** An event, said in words. */
export function sayEvent(eventType: string): string {
  return WORDS[eventType] ?? eventType;
}

/** When it happened, in the platform's own words. */
export function sayWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}
