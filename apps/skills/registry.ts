/**
 * Phase 20 — Skills registry.
 * All installable FIDScript skills indexed here for discovery and dashboard browsing.
 */

export interface SkillManifest {
  name: string;
  description: string;
  version: string;
  platformVersion: string;
  allowedTools: string[];
  path: string;
  category: 'deploy' | 'infra' | 'functions' | 'diagnose' | 'platform';
}

export const skills: SkillManifest[] = [
  {
    name: 'fidscript-deploy',
    description: 'Scaffold, configure, and deploy a full-stack application end-to-end. Creates project, provisions infra, sets env vars, and deploys from Git.',
    version: '1.0.0',
    platformVersion: '>=1.0.0',
    allowedTools: [
      'list_projects', 'get_project', 'create_project', 'update_project', 'delete_project',
      'get_project_env_vars', 'set_project_env_vars',
      'list_deployments', 'get_deployment', 'create_deployment', 'rollback_deployment',
      'get_build_config', 'update_build_config',
    ],
    path: 'fidscript-deploy/SKILL.md',
    category: 'deploy',
  },
  {
    name: 'fidscript-database',
    description: 'Provision Postgres databases, run migrations, back up and restore, rotate credentials.',
    version: '1.0.0',
    platformVersion: '>=1.0.0',
    allowedTools: [
      'list_databases', 'get_database', 'create_database', 'delete_database',
      'rotate_database_credentials', 'list_database_backups',
      'create_database_backup', 'restore_database_backup',
    ],
    path: 'fidscript-database/SKILL.md',
    category: 'infra',
  },
  {
    name: 'fidscript-functions',
    description: 'Author, deploy, and invoke Node.js serverless functions. Wire cron triggers.',
    version: '1.0.0',
    platformVersion: '>=1.0.0',
    allowedTools: [
      'list_functions', 'get_function', 'create_function', 'update_function', 'delete_function',
      'deploy_function', 'invoke_function', 'get_function_logs', 'get_function_versions',
      'list_cron_jobs', 'create_cron_job', 'trigger_cron_job',
    ],
    path: 'fidscript-functions/SKILL.md',
    category: 'functions',
  },
  {
    name: 'fidscript-domains',
    description: 'Add and verify a custom domain with automatic TLS via Let\'s Encrypt ACME DNS-01.',
    version: '1.0.0',
    platformVersion: '>=1.0.0',
    allowedTools: ['list_projects', 'get_project'],
    path: 'fidscript-domains/SKILL.md',
    category: 'platform',
  },
  {
    name: 'fidscript-diagnose',
    description: 'Inspect logs, metrics, alerts, and queue depth to debug FIDScript services.',
    version: '1.0.0',
    platformVersion: '>=1.0.0',
    allowedTools: [
      'list_deployments', 'get_deployment',
      'get_function_logs',
      'list_cron_jobs', 'get_cron_job_runs',
      'get_queue_stats',
      'list_databases', 'get_database',
    ],
    path: 'fidscript-diagnose/SKILL.md',
    category: 'diagnose',
  },
];
