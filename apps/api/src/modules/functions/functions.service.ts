import { Injectable } from '@nestjs/common';
import { FunctionsCrudService } from '@/modules/functions/services/functions-crud.service';
import { FunctionsRuntimeService } from '@/modules/functions/services/functions-runtime.service';

export { FunctionsCrudService } from '@/modules/functions/services/functions-crud.service';

@Injectable()
export class FunctionsService {
  constructor(private crud: FunctionsCrudService, private runtime: FunctionsRuntimeService) {}

  createFunction(projectId: string, dto: any) { return this.crud.createFunction(projectId, dto); }
  listFunctions(projectId: string) { return this.crud.listFunctions(projectId); }
  getFunction(projectId: string, functionId: string) { return this.crud.getFunction(projectId, functionId); }
  updateFunction(projectId: string, functionId: string, dto: any) { return this.crud.updateFunction(projectId, functionId, dto); }
  deleteFunction(projectId: string, functionId: string) { return this.crud.deleteFunction(projectId, functionId); }

  deployFunction(projectId: string, functionId: string, dto: any) { return this.runtime.deployFunction(projectId, functionId, dto); }
  invokeFunction(projectId: string, functionId: string, dto: any) { return this.runtime.invokeFunction(projectId, functionId, dto); }
  getFunctionLogs(projectId: string, functionId: string, limit?: number, cursor?: string) { return this.runtime.getFunctionLogs(projectId, functionId, limit, cursor); }
  getFunctionVersions(projectId: string, functionId: string) { return this.runtime.getFunctionVersions(projectId, functionId); }
  getFunctionCode(projectId: string, functionId: string, version?: string) { return this.runtime.getFunctionCode(projectId, functionId, version); }
}
