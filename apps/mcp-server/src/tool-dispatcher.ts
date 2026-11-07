/**
 * The tool dispatcher.
 *
 * Every tool the platform exposes belongs to a family, and the family's
 * prefix decides who handles it. The list is one table rather than a chain
 * of `if`s, so a family is added in one place.
 */
import { emailTools, handleEmailTool } from './tools/email.js';
import { domainTools, handleDomainTool } from './tools/domains.js';
import { projectTools, handleProjectTool } from './tools/projects.js';
import { envVarTools, handleEnvVarTool } from './tools/env-vars.js';
import { authTools, handleAuthTool } from './tools/auth.js';
import { deploymentTools, handleDeploymentTool } from './tools/deployments.js';
import { functionTools, handleFunctionTool } from './tools/functions.js';
import { queueTools, handleQueueTool } from './tools/queues.js';
import { storageTools, handleStorageTool } from './tools/storage.js';
import { databaseTools, handleDatabaseTool } from './tools/databases.js';
import { cronTools, handleCronTool } from './tools/cron.js';
import { instantTools, handleInstantTool } from './tools/instant.js';
import { realtimeTools, handleRealtimeTool } from './tools/realtime.js';
import { monitoringTools, handleMonitoringTool } from './tools/monitoring/index.js';
import { loggingTools, handleLoggingTool } from './tools/logging/index.js';
import { aiTools, handleAiTool } from './tools/ai/index.js';
import { marketplaceTools, handleMarketplaceTool } from './tools/marketplace/index.js';

/** Every tool the server offers, family by family. */
export const allTools = [
  ...emailTools,
  ...domainTools,
  ...projectTools,
  ...envVarTools,
  ...authTools,
  ...deploymentTools,
  ...functionTools,
  ...queueTools,
  ...storageTools,
  ...databaseTools,
  ...cronTools,
  ...instantTools,
  ...realtimeTools,
  ...monitoringTools,
  ...loggingTools,
  ...aiTools,
  ...marketplaceTools,
];

/** The family a tool belongs to, by its prefix. */
const HANDLERS: Array<[string, (name: string, args: any, sdk: any) => Promise<unknown>]> = [
  ['email_', handleEmailTool],
  ['domain_', handleDomainTool],
  ['project_', handleProjectTool],
  ['env_var_', handleEnvVarTool],
  ['auth_', handleAuthTool],
  ['deployments_', handleDeploymentTool],
  ['functions_', handleFunctionTool],
  ['queues_', handleQueueTool],
  ['storage_', handleStorageTool],
  ['databases_', handleDatabaseTool],
  ['cron_', handleCronTool],
  ['instant_', handleInstantTool],
  ['realtime_', handleRealtimeTool],
  ['monitoring_', handleMonitoringTool],
  ['logging_', handleLoggingTool],
  ['ai_', handleAiTool],
  ['marketplace_', handleMarketplaceTool],
];

/**
 * Run a tool.
 *
 * `handled` says whether a family claimed the name — a handler may itself
 * answer with nothing, and that is not the same as "no such tool".
 */
export async function dispatchTool(
  name: string,
  args: unknown,
  sdk: any,
): Promise<{ handled: boolean; result?: unknown }> {
  const args_ = (args ?? {}) as any;
  for (const [prefix, handler] of HANDLERS) {
    if (name.startsWith(prefix)) {
      return { handled: true, result: await handler(name, args_, sdk) };
    }
  }
  return { handled: false };
}
