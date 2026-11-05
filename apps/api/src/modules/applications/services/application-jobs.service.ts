import { Injectable } from '@nestjs/common';

/** One install, running or finished. */
export interface InstallJob {
  id: string;
  applicationId: string;
  status: 'running' | 'succeeded' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  /** The installer's own output — what the operator would have seen. */
  output: string;
  error: string | null;
}

/**
 * The installs this platform knows about.
 *
 * They live in memory, not in the database: an install takes minutes, the
 * operator watches it on screen, and when they close the tab it does not
 * matter that it is gone. The durable record of what is installed is the
 * installer's own — the catalogue reads that too.
 */
@Injectable()
export class ApplicationJobsService {
  private readonly jobs = new Map<string, InstallJob>();

  /** Every install, newest first. */
  list(): InstallJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  /** The most recent install of an application, or null. */
  get(applicationId: string): InstallJob | null {
    return this.list().find((job) => job.applicationId === applicationId) ?? null;
  }

  /** Remember a job. */
  track(job: InstallJob): void {
    this.jobs.set(job.id, job);
  }

  /** Whether an install for this application is running right now. */
  isRunning(applicationId: string): boolean {
    return this.list().some(
      (job) => job.applicationId === applicationId && job.status === 'running',
    );
  }
}
