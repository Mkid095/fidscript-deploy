import { Brand } from '@/components/brand/brand';

/**
 * The shell the setup sits in.
 *
 * Wider than the sign-in card — the setup is a list of applications and
 * their state, and it needs the room.
 */
export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-rail px-4 py-3">
        <Brand />
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
