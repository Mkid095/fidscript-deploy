import { apiRequest, handleResponse, handleError } from './utils/api.js';

export async function handleToolCall(name: string, args: any) {
  try {
    switch (name) {
      // Auth
      case 'auth_register': return handleResponse(await apiRequest('POST', '/auth/register', args));
      case 'auth_login': return handleResponse(await apiRequest('POST', '/auth/login', args));
      case 'auth_magic_link': return handleResponse(await apiRequest('POST', '/auth/magic-link', args));
      case 'auth_verify_magic_link': return handleResponse(await apiRequest('POST', '/auth/verify-magic-link', args));
      case 'auth_logout': return handleResponse(await apiRequest('POST', '/auth/logout'));
      case 'auth_get_session': return handleResponse(await apiRequest('GET', '/auth/session'));

      // Projects
      case 'list_projects': return handleResponse(await apiRequest('GET', '/projects'));
      case 'get_project': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}`));
      case 'create_project': return handleResponse(await apiRequest('POST', '/projects', args));
      case 'update_project': return handleResponse(await apiRequest('PATCH', `/projects/${args.projectId}`, args));
      case 'delete_project': return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}`));
      case 'get_project_members': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/members`));
      case 'add_project_member': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/members`, args));
      case 'remove_project_member': return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/members/${args.userId}`));
      case 'get_project_env_vars': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/env`));
      case 'set_project_env_vars': return handleResponse(await apiRequest('PUT', `/projects/${args.projectId}/env`, { envVars: args.envVars })));

      // Deployments
      case 'list_deployments': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/deployments`));
      case 'get_deployment': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/deployments/${args.deploymentId}`));
      case 'create_deployment': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/deployments`, args));
      case 'rollback_deployment': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/deployments/${args.deploymentId}/rollback`));
      case 'get_build_config': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/deployments/config`));
      case 'update_build_config': return handleResponse(await apiRequest('PATCH', `/projects/${args.projectId}/deployments/config`, args));

      // Storage
      case 'list_buckets': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/storage/buckets`));
      case 'create_bucket': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/storage/buckets`, args));
      case 'delete_bucket': return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/storage/buckets/${args.bucketId}`));
      case 'list_files': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/storage/buckets/${args.bucketId}/files`));
      case 'upload_file': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/storage/buckets/${args.bucketId}/files`, args));
      case 'delete_file': return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/storage/buckets/${args.bucketId}/files/${args.fileId}`));
      case 'get_signed_url': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/storage/buckets/${args.bucketId}/files/${args.fileId}/url`, { expiresIn: args.expiresIn })));

      // Databases
      case 'list_databases': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/databases`));
      case 'create_database': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/databases`, args));
      case 'get_database': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/databases/${args.databaseId}`));
      case 'delete_database': return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/databases/${args.databaseId}`));
      case 'rotate_database_credentials': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/databases/${args.databaseId}/credentials/rotate`, args));
      case 'list_database_backups': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/databases/${args.databaseId}/backups`));
      case 'create_database_backup': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/databases/${args.databaseId}/backups`, args));
      case 'restore_database_backup': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/databases/${args.databaseId}/backups/${args.backupId}/restore`, args));

      // Email
      case 'send_email': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/email/send`, args));
      case 'list_mailboxes': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/email/mailboxes`));
      case 'create_mailbox': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/email/mailboxes`, args));
      case 'delete_mailbox': return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/email/mailboxes/${args.mailboxId}`));
      case 'list_email_aliases': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/email/aliases`));
      case 'create_email_alias': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/email/aliases`, args));
      case 'verify_email_domain': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/email/verify-domain`, args));
      case 'get_email_logs': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/email/logs`, { limit: args.limit })));

      // Functions
      case 'list_functions': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/functions`));
      case 'get_function': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/functions/${args.functionId}`));
      case 'create_function': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/functions`, args));
      case 'update_function': return handleResponse(await apiRequest('PATCH', `/projects/${args.projectId}/functions/${args.functionId}`, args));
      case 'delete_function': return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/functions/${args.functionId}`));
      case 'deploy_function': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/functions/${args.functionId}/deploy`, args));
      case 'invoke_function': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/functions/${args.functionId}/invoke`, { payload: args.payload })));
      case 'get_function_logs': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/functions/${args.functionId}/logs`, { limit: args.limit })));
      case 'get_function_versions': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/functions/${args.functionId}/versions`));

      // Queues
      case 'list_queues': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/queues`));
      case 'create_queue': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/queues`, args));
      case 'delete_queue': return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/queues/${args.queueId}`));
      case 'publish_message': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/queues/${args.queueId}/messages`, args));
      case 'publish_batch_messages': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/queues/${args.queueId}/messages/batch`, args));
      case 'consume_messages': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/queues/${args.queueId}/consume`, args));
      case 'acknowledge_messages': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/queues/${args.queueId}/ack`, { messageIds: args.messageIds })));
      case 'retry_messages': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/queues/${args.queueId}/retry`, { messageIds: args.messageIds })));
      case 'get_queue_stats': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/queues/${args.queueId}/stats`));

      // Cron
      case 'list_cron_jobs': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/cron`));
      case 'get_cron_job': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/cron/${args.jobId}`));
      case 'create_cron_job': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/cron`, args));
      case 'update_cron_job': return handleResponse(await apiRequest('PATCH', `/projects/${args.projectId}/cron/${args.jobId}`, args));
      case 'delete_cron_job': return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/cron/${args.jobId}`));
      case 'trigger_cron_job': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/cron/${args.jobId}/trigger`, { payload: args.payload })));
      case 'get_cron_job_runs': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/cron/${args.jobId}/runs`, { limit: args.limit })));
      case 'get_cron_job_next_run': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/cron/${args.jobId}/next-run`));

      // Realtime
      case 'list_realtime_channels': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/realtime/channels`));
      case 'create_realtime_channel': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/realtime/channels`, args));
      case 'delete_realtime_channel': return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/realtime/channels/${args.channelId}`));
      case 'get_realtime_channel_presence': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/realtime/channels/${args.channelId}/presence`));

      // Monitoring
      case 'record_metric': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/monitoring/metrics`, args));
      case 'get_metrics': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/monitoring/metrics`, args));
      case 'get_metric_summary': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/monitoring/metrics/${args.metric}/summary`, { interval: args.interval })));
      case 'create_alert_rule': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/monitoring/alerts/rules`, args));
      case 'list_alert_rules': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/monitoring/alerts/rules`));
      case 'delete_alert_rule': return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/monitoring/alerts/rules/${args.ruleId}`));
      case 'get_alerts': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/monitoring/alerts`, args));
      case 'acknowledge_alert': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/monitoring/alerts/${args.alertId}/acknowledge`));
      case 'resolve_alert': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/monitoring/alerts/${args.alertId}/resolve`));
      case 'get_monitoring_stats': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/monitoring/stats`));

      // Logging
      case 'write_log': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/logs`, args));
      case 'write_batch_logs': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/logs/batch`, args));
      case 'get_logs': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/logs`, args));
      case 'get_log_stats': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/logs/stats`, { stream: args.stream })));
      case 'get_log_timeline': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/logs/streams/${args.stream}/timeline`, { interval: args.interval })));
      case 'list_log_streams': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/logs/streams`));

      // App Auth
      case 'app_auth_register': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/auth/register`, args));
      case 'app_auth_login': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/auth/login`, args));
      case 'app_auth_magic_link': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/auth/magic-link`, args));
      case 'app_auth_verify_magic_link': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/auth/verify-magic-link`, args));
      case 'app_auth_create_role': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/auth/roles`, args));
      case 'app_auth_list_roles': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/auth/roles`));
      case 'app_auth_assign_role': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/auth/roles/assign`, args));

      // AI
      case 'ai_chat': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/ai/chat`, { content: args.content })));
      case 'ai_create_conversation': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/ai/conversations`, args));
      case 'ai_list_conversations': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/ai/conversations`, { limit: args.limit })));
      case 'ai_get_conversation': return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/ai/conversations/${args.conversationId}`)));
      case 'ai_send_message': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/ai/conversations/${args.conversationId}/messages`, args));
      case 'ai_delete_conversation': return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/ai/conversations/${args.conversationId}`)));
      case 'ai_diagnose_error': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/ai/diagnose`, args));
      case 'ai_get_recommendations': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/ai/recommendations`, args));
      case 'ai_assist_deployment': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/ai/deploy`, args));
      case 'ai_assist_project_generation': return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/ai/generate`, args));

      // Marketplace
      case 'marketplace_list_items': return handleResponse(await apiRequest('GET', '/marketplace', args));
      case 'marketplace_get_item': return handleResponse(await apiRequest('GET', `/marketplace/${args.slug}`)));
      case 'marketplace_get_featured': return handleResponse(await apiRequest('GET', '/marketplace/featured')));
      case 'marketplace_get_categories': return handleResponse(await apiRequest('GET', '/marketplace/categories')));
      case 'marketplace_submit_item': return handleResponse(await apiRequest('POST', '/marketplace/submit', args));
      case 'marketplace_create_review': return handleResponse(await apiRequest('POST', `/marketplace/${args.slug}/reviews`, args));
      case 'marketplace_record_download': return handleResponse(await apiRequest('POST', `/marketplace/${args.slug}/download')));
      case 'marketplace_get_my_submissions': return handleResponse(await apiRequest('GET', '/marketplace/my/submissions')));
      case 'marketplace_update_item': return handleResponse(await apiRequest('PATCH', `/marketplace/items/${args.id}`, args));

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
    return handleError(error);
  }
}