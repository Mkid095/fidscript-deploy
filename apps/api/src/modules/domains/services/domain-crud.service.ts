import { Injectable, NotFoundException } from '@nestjs/common';
import { DomainListService } from './domain-list.service';
import { DomainAddService } from './domain-add.service';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';

@Injectable()
export class DomainCrudService {
  constructor(
    private listService: DomainListService,
    private addService: DomainAddService,
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  list(userId: string, projectId: string) {
    return this.listService.list(userId, projectId);
  }

  /** One domain of the project. */
  get(userId: string, projectId: string, domainId: string) {
    return this.listService.get(userId, projectId, domainId);
  }

  add(userId: string, projectId: string, dto: any) {
    return this.addService.add(userId, projectId, dto);
  }

  getInstructions(userId: string, projectId: string, domainId: string) {
    return this.addService.getInstructions(userId, projectId, domainId);
  }

  /**
   * Point a domain at a deployment — or take it off one.
   *
   * A domain that names a deployment is the whole of the connection between
   * a name and a running application: the routing is written from it, the
   * health checks read it, the deployment page shows it. Attach and detach
   * are the same act with different arguments, and both say what they did.
   */
  async attachDeployment(
    userId: string,
    projectId: string,
    domainId: string,
    deploymentId: string | null,
  ) {
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
    });
    if (!domain)
      throw new NotFoundException('Domain not found in this project');

    if (deploymentId) {
      const deployment = await this.prisma.deployment.findFirst({
        where: { id: deploymentId, projectId },
      });
      if (!deployment)
        throw new NotFoundException('Deployment not found in this project');
    }

    const updated = await this.prisma.domain.update({
      where: { id: domainId },
      data: { deploymentId: deploymentId ?? null },
    });

    await this.eventService.emit(
      'domain.added',
      projectId,
      {
        domainId,
        domain: domain.domain,
        deploymentId: deploymentId ?? null,
        attached: Boolean(deploymentId),
      },
      {
        actorId: userId,
        actorType: 'user',
        resourceType: 'domain',
        resourceId: domainId,
      },
    );

    return updated;
  }
}
