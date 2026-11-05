import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { ApplicationCatalogueService } from './application-catalogue.service';
import { ApplicationDnsService } from './application-dns.service';
import { INSTALLER_DIR } from '../application-manifest.reader';

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
 * Installs an application in the background.
 *
 * The install is the installer's own work: `fidscript-addons enable <id>`
 * records the selection, generates the application's secrets, and brings its
 * containers up. The platform runs that script rather than reimplementing it,
 * so there is one installer and one source of truth for what an add-on
 * needs.
 *
 * `--no-recreate` matters: the install must not recreate the containers that
 * are already running — the platform's own api is one of them, and it is the
 * process asking for the install.
 */
@Injectable()
export class ApplicationInstallService {
  private readonly logger = new Logger(ApplicationInstallService.name);
  private readonly jobs = new Map<string, InstallJob>();

  constructor(
    private catalogue: ApplicationCatalogueService,
    private dns: ApplicationDnsService,
  ) {}

  /** The installs currently running, and the ones that just finished. */
  list(): InstallJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  /** The most recent install of an application, or null. */
  get(applicationId: string): InstallJob | null {
    const jobs = this.list().filter((job) => job.applicationId === applicationId);
    return jobs[0] ?? null;
  }

  /**
   * Start an install.
   *
   * It returns as soon as the process is running — an install brings up
   * containers and can take minutes, and the operator watches it from the
   * screen rather than holding a request open.
   */
  start(applicationId: string): InstallJob {
    const application = this.catalogue.get(applicationId);
    if (!application) {
      throw new NotFoundException(`There is no application called "${applicationId}".`);
    }
    if (!application.installable) {
      throw new BadRequestException(
        `"${applicationId}" is part of the platform and cannot be installed.`,
      );
    }
    if (application.installed) {
      throw new ConflictException(`"${applicationId}" is already installed.`);
    }

    const running = this.list().find(
      (job) => job.applicationId === applicationId && job.status === 'running',
    );
    if (running) {
      throw new ConflictException(`"${applicationId}" is already being installed.`);
    }

    const job: InstallJob = {
      id: randomUUID(),
      applicationId,
      status: 'running',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      output: '',
      error: null,
    };
    this.jobs.set(job.id, job);

    this.run(job);
    return job;
  }

  /** Run the installer's own command, and record what it said. */
  private run(job: InstallJob): void {
    const script = `${INSTALLER_DIR}/scripts/addons.sh`;
    const child = spawn('bash', [script, 'enable', job.applicationId, '--no-recreate'], {
      cwd: INSTALLER_DIR,
      env: { ...process.env, DEBIAN_FRONTEND: 'noninteractive' },
    });

    const collect = (chunk: Buffer) => {
      job.output += chunk.toString();
      if (job.output.length > 20_000) job.output = job.output.slice(-20_000);
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);

    child.on('error', (err) => {
      job.status = 'failed';
      job.error = err.message;
      job.finishedAt = new Date().toISOString();
      this.logger.error(`[applications] Install of ${job.applicationId} failed: ${err.message}`);
    });

    child.on('close', (code) => {
      job.finishedAt = new Date().toISOString();
      if (code === 0) {
        job.status = 'succeeded';
        this.logger.log(`[applications] Installed ${job.applicationId}`);
        // The containers are up; the hostnames still need to resolve. A
        // failure here is not a failed install — the application IS
        // installed — so it is reported and the install still succeeded.
        void this.publishDns(job);
      } else {
        job.status = 'failed';
        job.error = job.error ?? `The installer exited with code ${code}.`;
        this.logger.error(
          `[applications] Install of ${job.applicationId} exited with code ${code}`,
        );
      }
    });
  }

  /** Publish the application's DNS records once its containers are up. */
  private async publishDns(job: InstallJob): Promise<void> {
    for (const note of await this.dns.publish(job.applicationId)) {
      job.output += `\n${note}`;
    }
  }
}
