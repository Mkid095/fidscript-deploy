import { Injectable } from '@nestjs/common';
import { DomainListService } from './domain-list.service';
import { DomainAddService } from './domain-add.service';

@Injectable()
export class DomainCrudService {
  constructor(
    private listService: DomainListService,
    private addService: DomainAddService,
  ) {}

  list(userId: string, projectId: string) {
    return this.listService.list(userId, projectId);
  }

  add(userId: string, projectId: string, dto: any) {
    return this.addService.add(userId, projectId, dto);
  }

  getInstructions(userId: string, projectId: string, domainId: string) {
    return this.addService.getInstructions(userId, projectId, domainId);
  }
}
