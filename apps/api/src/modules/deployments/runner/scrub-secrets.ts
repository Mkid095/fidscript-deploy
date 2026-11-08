/**
 * A credential that reaches a log is a credential that has leaked.
 *
 * Git clone commands embed the token in the URL, build tools echo their
 * arguments, and error messages quote the command. Everything a deployment
 * writes into a log a person reads goes through this first: anything that
 * looks like `scheme://user:secret@` keeps its scheme and its shape, and
 * loses its secret.
 */
export function scrubSecrets(text: string): string {
  return text.replace(
    /([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+:[^\s/@]+@/gi,
    '$1***:***@',
  );
}
