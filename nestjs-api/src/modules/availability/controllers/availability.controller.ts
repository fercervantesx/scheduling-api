import {
  Controller,
  Get,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AvailabilityService, TimeSlot } from '../services/availability.service';
import { AvailabilityRequestDto } from '../dto/availability-request.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { Request } from 'express';

@ApiTags('availability')
@ApiBearerAuth()
@Controller('api/availability')
@UseGuards(AuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  @ApiOperation({ summary: 'Get available time slots' })
  @ApiQuery({ name: 'date', required: true, description: 'Date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'serviceId', required: true })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiResponse({ status: 200, description: 'Returns available time slots.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Service not found.' })
  findAvailableSlots(@Query() query: AvailabilityRequestDto, @Req() req: Request): Promise<{ date: string; timeSlots: TimeSlot[] }> {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    return this.availabilityService.checkAvailability(query, req.tenant.id);
  }
}