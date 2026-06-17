import { Injectable } from '@nestjs/common';
import { Runtime, InvocationResult } from './runtime.interface';
import { SandboxedRunnerService } from '../services/sandboxed-runner.service';

@Injectable()
export class PythonRuntime implements Runtime {
  name = 'python';
  version = '3.11';
  supportedExtensions = ['.py'];

  constructor(private sandbox: SandboxedRunnerService) {}

  async build(functionPath: string, _envVars: Record<string, string>): Promise<string> {
    return functionPath;
  }

  async invoke(functionPath: string, payload: string, timeoutSeconds: number): Promise<InvocationResult> {
    const { readFile, readdir } = await import('fs/promises');
    const files = await readdir(functionPath);
    const handlerFile = files.find(f => f.startsWith('handler') && f.endsWith('.py'));
    if (!handlerFile) return { success: false, error: 'No handler.py found', durationMs: 0 };

    const code = await readFile(`${functionPath}/${handlerFile}`, 'utf8');
    return this.sandbox.run({
      code,
      runtime: 'python',
      entryPoint: 'handler',
      payload,
      envVars: {},
      memoryMb: 256,
      timeoutSeconds,
    });
  }

  validateCode(code: string): boolean {
    // Basic heuristic — a def keyword suggests a function definition
    return code.includes('def');
  }
}