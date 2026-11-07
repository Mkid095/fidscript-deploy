import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RegistryService, ServiceRegistration } from './registry.service';
import { Public } from '@/modules/auth/decorators/public.decorator';

@ApiTags('services')
@Controller('services')
export class RegistryController {
  constructor(private registry: RegistryService) {}

  @Get()

  @Public()
  @ApiOperation({ summary: 'List all registered platform services' })
  @ApiResponse({ status: 200, description: 'List of registered services' })
  getServices(): ServiceRegistration[] {
    return this.registry.getServices();
  }

  @Get(':name')

  @Public()
  @ApiOperation({ summary: 'Get a specific service by name' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Service not found' })
  getService(@Param('name') name: string): ServiceRegistration {
    const service = this.registry.getService(name);
    if (!service) throw new NotFoundException(`Service "${name}" not found`);
    return service;
  }
}