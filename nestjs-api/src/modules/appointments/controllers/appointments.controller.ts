import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AppointmentsService } from '../services/appointments.service';
import { CreateAppointmentDto } from '../dto/create-appointment.dto';
import { UpdateAppointmentDto } from '../dto/update-appointment.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { Request } from 'express';

@ApiTags('appointments')
@ApiBearerAuth()
@Controller('api/appointments')
@UseGuards(AuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new appointment' })
  @ApiResponse({ status: 201, description: 'The appointment has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 409, description: 'Conflict - time slot already booked.' })
  create(@Body() createAppointmentDto: CreateAppointmentDto, @Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    return this.appointmentsService.create(createAppointmentDto, req.tenant.id, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all appointments with optional filtering' })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Returns all appointments matching the criteria.' })
  findAll(@Query() query: any, @Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    const filters = {
      locationId: query.locationId,
      employeeId: query.employeeId,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      userId: req.user?.user_id,
      // Check if user has admin permissions
      isAdmin: req.user?.permissions?.includes('admin'),
    };
    
    return this.appointmentsService.findAll(filters, req.tenant.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an appointment by ID' })
  @ApiResponse({ status: 200, description: 'Returns the appointment.' })
  @ApiResponse({ status: 404, description: 'Appointment not found.' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    return this.appointmentsService.findOne(id, req.tenant.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an appointment' })
  @ApiResponse({ status: 200, description: 'The appointment has been successfully updated.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Appointment not found.' })
  update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @Req() req: Request,
  ) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    return this.appointmentsService.update(id, updateAppointmentDto, req.tenant.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an appointment' })
  @ApiResponse({ status: 204, description: 'The appointment has been successfully deleted.' })
  @ApiResponse({ status: 400, description: 'Bad request - appointment must be cancelled or past date.' })
  @ApiResponse({ status: 404, description: 'Appointment not found.' })
  async remove(@Param('id') id: string, @Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    await this.appointmentsService.remove(id, req.tenant.id);
  }
}