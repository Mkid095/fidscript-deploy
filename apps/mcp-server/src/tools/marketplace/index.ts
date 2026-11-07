/**
 * Marketplace MCP tools — aggregated tool list and dispatcher.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

import { catalogTools, handleCatalogTool } from './catalog.js';
import { userSubmissionTools, handleUserSubmissionTool } from './submissions-user.js';
import { adminSubmissionTools, handleAdminSubmissionTool } from './submissions-admin.js';

export const marketplaceTools: Tool[] = [
  ...catalogTools,
  ...userSubmissionTools,
  ...adminSubmissionTools,
];

export async function handleMarketplaceTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  if (
    name === 'marketplace_browse' ||
    name === 'marketplace_search' ||
    name === 'marketplace_getFeatured' ||
    name === 'marketplace_listCategories' ||
    name === 'marketplace_getTemplateDetails' ||
    name === 'marketplace_submitReview'
  ) {
    return handleCatalogTool(name, args, sdk);
  }
  if (
    name === 'marketplace_submitItem' ||
    name === 'marketplace_listMySubmissions' ||
    name === 'marketplace_getSubmissionStatus' ||
    name === 'marketplace_updateSubmission'
  ) {
    return handleUserSubmissionTool(name, args, sdk);
  }
  if (
    name === 'marketplace_approveSubmission' ||
    name === 'marketplace_rejectSubmission' ||
    name === 'marketplace_featureTemplate'
  ) {
    return handleAdminSubmissionTool(name, args, sdk);
  }
  throw new Error(`Unknown marketplace tool: ${name}`);
}
