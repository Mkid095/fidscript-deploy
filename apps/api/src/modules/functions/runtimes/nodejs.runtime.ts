import { Injectable } from '@nestjs/common';
import { Runtime, InvocationResult } from './runtime.interface';
import { SandboxedRunnerService } from '../services/sandboxed-runner.service';

@Injectable()
export class NodeJsRuntime implements Runtime {
  name = 'nodejs';
  version = '18';
  supportedExtensions = ['.js', '.mjs'];

  constructor(private sandbox: SandboxedRunnerService) {}

  async build(functionPath: string, _envVars: Record<string, string>): Promise<string> {
    // Code written to functionPath by FunctionsRuntimeService.deployFunction
    return functionPath;
  }

  async invoke(functionPath: string, payload: string, timeoutSeconds: number): Promise<InvocationResult> {
    const { readFile } = await import('fs/promises');
    const { readdir } = await import('fs/promises');
    // Find handler file — written by deployFunction as handler.{js,mjs}
    const files = await readdir(functionPath);
    const handlerFile = files.find(f => f.startsWith('handler') && (f.endsWith('.js') || f.endsWith('.mjs')));
    if (!handlerFile) return { success: false, error: 'No handler file found', durationMs: 0 };

    const code = await readFile(`${functionPath}/${handlerFile}`, 'utf8');
    return this.sandbox.run({
      code,
      runtime: 'nodejs',
      entryPoint: 'handler',
      payload,
      envVars: {},
      memoryMb: 256,
      timeoutSeconds,
    });
  }

  validateCode(code: string): boolean {
    try {
      new Function(code);
      return true;
    } catch {
      return false;
    }
  }
}