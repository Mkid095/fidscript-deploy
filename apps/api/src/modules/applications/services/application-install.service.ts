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
import { ApplicationJobsService, type InstallJob } from './application-jobs.service';
import { ShellRunnerService } from '@/modules/deployments/runner/shell-runner.service';
import { INSTALLER_DIR } from '../application-manifest.reader';

@Injectable()
export class ApplicationInstallService {
  private readonly logger = new Logger(ApplicationInstallService.name);

  constructor(
    private catalogue: ApplicationCatalogueService,
    private jobs: ApplicationJobsService,
    private dns: ApplicationDnsService,
    private shell: ShellRunnerService,
  ) {}

  /** The installs currently running, and the ones that just finished. */
  list(): InstallJob[] {
    return this.jobs.list();
  }

  /** The most recent install of an application, or null. */
  get(applicationId: string): InstallJob | null {
    return this.jobs.get(applicationId);
  }

  /**
   * Start an install.
   *
   * It returns as soon as the process is running — an install brings up
   * containers and can take minutes, and the operator watches it from the
   * screen rather than holding a request open.
   */
  async start(applicationId: string): Promise<InstallJob> {
    const application = await this.catalogue.get(applicationId);
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

    if (this.jobs.isRunning(applicationId)) {
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
    this.jobs.track(job);

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
        // The installer records the selection BEFORE it runs compose, so a
        // failed install leaves the platform claiming the application is
        // installed when it is not. Take the record back, or the catalogue
        // lies until somebody reinstalls it by hand.
        void this.unrecord(job.applicationId);
      }
    });
  }

  /** Take a failed install back out of the installer's record. */
  private async unrecord(applicationId: string): Promise<void> {
    try {
      await this.shell.runStreaming(
        `bash ${INSTALLER_DIR}/scripts/addons.sh disable ${applicationId}`,
        () => {},
        { timeout: 60_000 },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[applications] Could not unrecord ${applicationId}: ${msg}`);
    }
  }

  /** Publish the application's DNS records once its containers are up. */
  private async publishDns(job: InstallJob): Promise<void> {
    for (const note of await this.dns.publish(job.applicationId)) {
      job.output += `\n${note}`;
    }
  }
}
