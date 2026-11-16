'use client';

import { useEffect } from 'react';

import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * What lands on the initializer when the project already has one.
 *
 * The project has a deployment already — new deployments update it, they
 * do not create a second one. The screen says so, gives the plain way
 * back to the deployment (its history, its current version, the rollback),
 * and moves the person there.
 */
export function DeploymentAlreadyInitialized({
  backHref,
}: {
  backHref: string;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.replace(backHref);
    }, 3000);
    return () => clearTimeout(timer);
  }, [backHref]);

  return (
    <Card className="p-4">
      <p className="text-sm font-medium text-text">
        This project has already been initialized with a deployment.
      </p>
      <p className="mt-1 text-sm leading-relaxed text-text-dim">
        New deployments will update the existing project deployment rather
        than create a separate deployment.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link href={backHref}>
          <Button variant="primary" size="sm">
            Back to the deployments
          </Button>
        </Link>
        <Link href={backHref} className="text-xs text-text-dim hover:text-text">
          The current production, the next version, the history, the
          rollback.
        </Link>
      </div>
    </Card>
  );
}
