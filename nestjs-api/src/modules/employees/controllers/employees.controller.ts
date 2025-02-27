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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Express } from 'express';
import { EmployeesService } from '../services/employees.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { UpdateEmployeeLocationsDto } from '../dto/update-employee-locations.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { Request } from 'express';

@ApiTags('employees')
@ApiBearerAuth()
@Controller('api/employees')
@UseGuards(AuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiResponse({ status: 201, description: 'The employee has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(@Body() createEmployeeDto: CreateEmployeeDto, @Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    try {
      console.log('Creating employee with data:', JSON.stringify(createEmployeeDto));
      console.log('Tenant ID:', req.tenant.id);
      return await this.employeesService.create(createEmployeeDto, req.tenant.id);
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all employees' })
  @ApiResponse({ status: 200, description: 'Returns all employees.' })
  findAll(@Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    return this.employeesService.findAll(req.tenant.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an employee by ID' })
  @ApiResponse({ status: 200, description: 'Returns the employee.' })
  @ApiResponse({ status: 404, description: 'Employee not found.' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    return this.employeesService.findOne(id, req.tenant.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an employee' })
  @ApiResponse({ status: 200, description: 'The employee has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Employee not found.' })
  update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Req() req: Request,
  ) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    return this.employeesService.update(id, updateEmployeeDto, req.tenant.id);
  }

  @Patch(':id/locations')
  @ApiOperation({ summary: 'Update employee locations' })
  @ApiResponse({ status: 200, description: 'The employee locations have been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Employee not found.' })
  updateLocations(
    @Param('id') id: string,
    @Body() updateLocationsDto: UpdateEmployeeLocationsDto,
    @Req() req: Request,
  ) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    return this.employeesService.updateLocations(id, updateLocationsDto, req.tenant.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an employee' })
  @ApiResponse({ status: 204, description: 'The employee has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Employee not found.' })
  async remove(@Param('id') id: string, @Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    await this.employeesService.remove(id, req.tenant.id);
  }

  @Post(':id/image')
  @ApiOperation({ summary: 'Upload employee image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Image uploaded successfully.' })
  @ApiResponse({ status: 404, description: 'Employee not found.' })
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    if (!file) {
      throw new Error('No image file provided');
    }
    
    const imageUrl = await this.employeesService.uploadImage(
      id,
      file.buffer,
      file.originalname,
      req.tenant.id
    );
    
    return { imageUrl };
  }
}