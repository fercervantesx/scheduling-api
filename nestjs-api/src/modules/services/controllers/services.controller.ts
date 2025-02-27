import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ServicesService } from '../services/services.service';
import { CreateServiceDto } from '../dto/create-service.dto';
import { UpdateServiceDto } from '../dto/update-service.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { Request } from 'express';

@ApiTags('services')
@ApiBearerAuth()
@Controller('api/services')
@UseGuards(AuthGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new service' })
  @ApiResponse({ status: 201, description: 'The service has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  create(@Body() createServiceDto: CreateServiceDto, @Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    return this.servicesService.create(createServiceDto, req.tenant.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all services' })
  @ApiResponse({ status: 200, description: 'Returns all services.' })
  findAll(@Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    return this.servicesService.findAll(req.tenant.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service by ID' })
  @ApiResponse({ status: 200, description: 'Returns the service.' })
  @ApiResponse({ status: 404, description: 'Service not found.' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    return this.servicesService.findOne(id, req.tenant.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service' })
  @ApiResponse({ status: 200, description: 'The service has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Service not found.' })
  update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @Req() req: Request,
  ) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    return this.servicesService.update(id, updateServiceDto, req.tenant.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a service' })
  @ApiResponse({ status: 204, description: 'The service has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Service not found.' })
  @ApiResponse({ status: 400, description: 'Cannot delete service with appointments.' })
  async remove(@Param('id') id: string, @Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    await this.servicesService.remove(id, req.tenant.id);
  }
}