import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SchedulesService } from '../services/schedules.service';
import { CreateScheduleDto, BlockType } from '../dto/create-schedule.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { Request } from 'express';

@ApiTags('schedules')
@ApiBearerAuth()
@Controller('api/schedules')
@UseGuards(AuthGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new schedule' })
  @ApiResponse({ status: 201, description: 'The schedule has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  create(@Body() createScheduleDto: CreateScheduleDto, @Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    return this.schedulesService.create(createScheduleDto, req.tenant.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all schedules with optional filtering' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'weekday', required: false, type: Number })
  @ApiQuery({ name: 'blockType', required: false, enum: BlockType })
  @ApiResponse({ status: 200, description: 'Returns all schedules matching the criteria.' })
  findAll(@Query() query: any, @Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    const filters = {
      employeeId: query.employeeId,
      locationId: query.locationId,
      weekday: query.weekday !== undefined ? parseInt(query.weekday, 10) : undefined,
      blockType: query.blockType,
    };
    
    return this.schedulesService.findAll(filters, req.tenant.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a schedule by ID' })
  @ApiResponse({ status: 200, description: 'Returns the schedule.' })
  @ApiResponse({ status: 404, description: 'Schedule not found.' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    return this.schedulesService.findOne(id, req.tenant.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a schedule' })
  @ApiResponse({ status: 204, description: 'The schedule has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Schedule not found.' })
  async remove(@Param('id') id: string, @Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    await this.schedulesService.remove(id, req.tenant.id);
  }
}