import Image from 'next/image';
import Link from 'next/link';

/**
 * The one face of the platform.
 *
 * The logo and the word are a single unit: one size, one style, one place
 * to change. Every shell that says "what this is" renders this and
 * nothing else — so a screen can never have one logo size while its
 * neighbour has another, and a new screen cannot forget the mark.
 */
export function Brand({
  href = '/',
  label = 'FIDScript',
}: {
  /** Where the mark leads: the front door from the outside, the place the signed-in person is from the inside. */
  href?: string;
  /** The word the mark names, for the screen reader. */
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5"
      aria-label={label}
    >
      <Image
        src="/logo.png"
        alt=""
        width={24}
        height={24}
        className="rounded-md"
      />
      <span className="text-sm font-bold uppercase tracking-widest text-text">
        fidscript
      </span>
    </Link>
  );
}
