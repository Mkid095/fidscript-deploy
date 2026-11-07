import { Injectable } from '@nestjs/common';
import { FunctionsCrudService } from '@/modules/functions/services/functions-crud.service';
import { FunctionsRuntimeService } from '@/modules/functions/services/functions-runtime.service';
import { FunctionsLogsService } from '@/modules/functions/services/functions-logs.service';

export { FunctionsCrudService } from '@/modules/functions/services/functions-crud.service';

@Injectable()
export class FunctionsService {
  constructor(
    private crud: FunctionsCrudService,
    private runtime: FunctionsRuntimeService,
    private logs: FunctionsLogsService,
  ) {}

  createFunction(projectId: string, dto: any) { return this.crud.createFunction(projectId, dto); }
  listFunctions(projectId: string, canSeeSecrets = false) { return this.crud.listFunctions(projectId, canSeeSecrets); }
  getFunction(projectId: string, functionId: string, canSeeSecrets = false) { return this.crud.getFunction(projectId, functionId, canSeeSecrets); }
  updateFunction(projectId: string, functionId: string, dto: any) { return this.crud.updateFunction(projectId, functionId, dto); }
  deleteFunction(projectId: string, functionId: string) { return this.crud.deleteFunction(projectId, functionId); }

  deployFunction(projectId: string, functionId: string, dto: any) { return this.runtime.deployFunction(projectId, functionId, dto); }
  invokeFunction(projectId: string, functionId: string, dto: any) { return this.runtime.invokeFunction(projectId, functionId, dto); }
  getFunctionLogs(projectId: string, functionId: string, limit?: number, cursor?: string) { return this.logs.getFunctionLogs(projectId, functionId, limit, cursor); }
  getFunctionVersions(projectId: string, functionId: string) { return this.logs.getFunctionVersions(projectId, functionId); }
  getFunctionCode(projectId: string, functionId: string, version?: string) { return this.logs.getFunctionCode(projectId, functionId, version); }
}
