/**
 * Email webhook subscription service — facade.
 *
 * Split into:
 *   - EmailWebhookSubscriptionCrudService — list / create / update / delete
 *   - EmailWebhookDispatchService — event listener + signed delivery
 */
import { Injectable } from '@nestjs/common';
import { EmailWebhookSubscriptionCrudService } from './email-webhook-subscription-crud.service';
import { EmailWebhookDispatchService } from './email-webhook-dispatch.service';

@Injectable()
export class EmailWebhookSubscriptionService {
  constructor(
    private readonly crud: EmailWebhookSubscriptionCrudService,
    private readonly dispatch: EmailWebhookDispatchService,
  ) {}

  // ── CRUD ─────────────────────────────────────────────────────────────
  list = (projectId: string) => this.crud.list(projectId);
  create = (projectId: string, input: Parameters<EmailWebhookSubscriptionCrudService['create']>[1]) =>
    this.crud.create(projectId, input);
  update = (
    projectId: string,
    id: string,
    input: Parameters<EmailWebhookSubscriptionCrudService['update']>[2],
  ) => this.crud.update(projectId, id, input);
  delete = (projectId: string, id: string) => this.crud.delete(projectId, id);
  test = (projectId: string, id: string) => this.dispatch.test(projectId, id);
}
