import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateBuildConfigDto } from './update-build-config.dto';

/**
 * The ceiling a project may claim for its container.
 *
 * The DTO is the edge: what reaches the runner has already been checked
 * here, so the band (128 MB to 8 GB, 0.05 to 8 cores) cannot be widened
 * by a payload.
 */
describe('the build-config limits, at the edge', () => {
  function problems(dto: Partial<UpdateBuildConfigDto>): string[] {
    const instance = plainToClass(UpdateBuildConfigDto, dto);
    return validateSync(instance).map((e) => e.property);
  }

  it('accepts ceilings inside the band', () => {
    expect(problems({ memoryLimitMb: 1024, cpuLimitMillicpu: 2000 })).toHaveLength(0);
  });

  it('accepts the band edges', () => {
    expect(problems({ memoryLimitMb: 128, cpuLimitMillicpu: 50 })).toHaveLength(0);
    expect(problems({ memoryLimitMb: 8192, cpuLimitMillicpu: 8000 })).toHaveLength(0);
  });

  it('refuses memory below the floor', () => {
    expect(problems({ memoryLimitMb: 64 })).toContain('memoryLimitMb');
  });

  it('refuses memory above the ceiling', () => {
    expect(problems({ memoryLimitMb: 16384 })).toContain('memoryLimitMb');
  });

  it('refuses CPU outside the band', () => {
    expect(problems({ cpuLimitMillicpu: 1 })).toContain('cpuLimitMillicpu');
    expect(problems({ cpuLimitMillicpu: 16000 })).toContain('cpuLimitMillicpu');
  });

  it('leaves the limits out when nobody set them', () => {
    expect(problems({ port: 3000 })).toHaveLength(0);
  });
});
