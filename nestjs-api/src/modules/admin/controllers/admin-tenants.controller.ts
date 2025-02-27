import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminTenantsService } from '../services/admin-tenants.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';

@ApiTags('admin-tenants')
@ApiBearerAuth()
@Controller('api/admin/tenants')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('admin')
export class AdminTenantsController {
  constructor(private readonly adminTenantsService: AdminTenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({ status: 201, description: 'The tenant has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.adminTenantsService.create(createTenantDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tenants with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns all tenants.' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.adminTenantsService.findAll(+page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tenant by ID' })
  @ApiResponse({ status: 200, description: 'Returns the tenant.' })
  @ApiResponse({ status: 404, description: 'Tenant not found.' })
  findOne(@Param('id') id: string) {
    return this.adminTenantsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tenant' })
  @ApiResponse({ status: 200, description: 'The tenant has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Tenant not found.' })
  update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    return this.adminTenantsService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tenant' })
  @ApiResponse({ status: 204, description: 'The tenant has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Tenant not found.' })
  @ApiResponse({ status: 400, description: 'Cannot delete tenant with existing resources.' })
  async remove(@Param('id') id: string) {
    await this.adminTenantsService.remove(id);
  }
}