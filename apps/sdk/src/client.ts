import axios, { AxiosInstance } from 'axios';
import { FIDScriptConfig, Project, Deployment } from './index.js';
import { AuthModule } from './auth/index.js';
import { ProjectsModule } from './projects/index.js';
import { DeploymentsModule } from './deployments/index.js';
import { StorageModule } from './storage/index.js';
import { EmailModule } from './email/index.js';
import { FunctionsModule } from './functions/index.js';
import { QueuesModule } from './queues/index.js';
import { CronModule } from './cron/index.js';
import { RealtimeModule } from './realtime/index.js';
import { MonitoringModule } from './monitoring/index.js';
import { LoggingModule } from './logging/index.js';

export class FIDScript {
  public auth: AuthModule;
  public projects: ProjectsModule;
  public deployments: DeploymentsModule;
  public storage: StorageModule;
  public email: EmailModule;
  public functions: FunctionsModule;
  public queues: QueuesModule;
  public cron: CronModule;
  public realtime: RealtimeModule;
  public monitoring: MonitoringModule;
  public logs: LoggingModule;

  private client: AxiosInstance;
  private config: FIDScriptConfig;

  constructor(config: FIDScriptConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.fidscript.com',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error.response?.data?.message || error.message;
        throw new Error(`FIDScript API Error: ${message}`);
      }
    );

    // Initialize modules
    this.auth = new AuthModule(this.client, config.projectId);
    this.projects = new ProjectsModule(this.client);
    this.deployments = new DeploymentsModule(this.client);
    this.storage = new StorageModule(this.client);
    this.email = new EmailModule(this.client);
    this.functions = new FunctionsModule(this.client);
    this.queues = new QueuesModule(this.client);
    this.cron = new CronModule(this.client);
    this.realtime = new RealtimeModule(this.client);
    this.monitoring = new MonitoringModule(this.client);
    this.logs = new LoggingModule(this.client);
  }

  setProject(projectId: string) {
    this.auth.setProject(projectId);
    this.projects.setProject(projectId);
    this.deployments.setProject(projectId);
    this.storage.setProject(projectId);
    this.email.setProject(projectId);
    this.functions.setProject(projectId);
    this.queues.setProject(projectId);
    this.cron.setProject(projectId);
    this.realtime.setProject(projectId);
    this.monitoring.setProject(projectId);
    this.logs.setProject(projectId);
  }
}

export default FIDScript;
export * from './index.js';