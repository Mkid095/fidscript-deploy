'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * The bar that says a navigation is happening.
 *
 * A click on a link that takes a server round-trip used to feel dead — the
 * old page sat there until the new one arrived. This bar starts on any
 * internal navigation's click, crawls while the request is out, and
 * finishes the moment the route answers.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const done = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setActive(false);
    setProgress(0);
  };

  // The route answering ends the bar — pathname or query, whichever moved.
  useEffect(() => {
    if (!active) return;
    if (done.current) clearTimeout(done.current);
    done.current = setTimeout(stop, 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => {
    const start = () => {
      if (timer.current) return;
      setProgress(8);
      setActive(true);
      timer.current = setInterval(() => {
        setProgress((current) => {
          if (current >= 90) return current;
          return current + Math.max(1, (92 - current) * 0.08);
        });
      }, 180);
    };

    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey
      )
        return;
      const anchor = (event.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href?.startsWith('/') || anchor.getAttribute('target') === '_blank')
        return;
      start();
    };

    document.addEventListener('click', onClick, { capture: true });
    window.addEventListener('popstate', start);
    return () => {
      document.removeEventListener('click', onClick, { capture: true });
      window.removeEventListener('popstate', start);
      if (timer.current) clearInterval(timer.current);
      if (done.current) clearTimeout(done.current);
    };
  }, []);

  if (!active) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-0.5"
    >
      <div
        className="h-full bg-accent transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: progress >= 90 ? 0.55 : 1 }}
      />
    </div>
  );
}
