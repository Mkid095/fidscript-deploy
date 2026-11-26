import { Brand } from '@/components/brand/brand';
import { Card } from '@/components/ui/card';

/**
 * The shell the auth screens sit in.
 *
 * One thing to do, nothing else to look at: the mark, the card, and the
 * way back to the front door. The card settles into place instead of
 * snapping (the motion is off for anyone who asks for less).
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex-shrink-0 border-b border-rail px-4 py-4 sm:px-6">
        <Brand />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px]">
          <Card className="panel-enter p-6 sm:p-8">{children}</Card>
          <p className="mt-6 text-center text-xs text-text-dim">
            Your own application cloud — the data, the mail, the messages and
            the packages, on your own hardware.
          </p>
        </div>
      </main>
    </div>
  );
}
