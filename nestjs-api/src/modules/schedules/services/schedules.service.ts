import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../../common/services/supabase.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { Schedule } from '../entities/schedule.entity';

@Injectable()
export class SchedulesService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(filters: any, tenantId: string): Promise<Schedule[]> {
    const query = this.supabase.supabase
      .from('schedules')
      .select(`
        *,
        employee:employees(*),
        location:locations(*)
      `)
      .eq('tenant_id', tenantId);

    // Apply filters
    if (filters.employeeId) {
      query.eq('employee_id', filters.employeeId);
    }
    
    if (filters.locationId) {
      query.eq('location_id', filters.locationId);
    }
    
    if (filters.weekday !== undefined) {
      query.eq('weekday', filters.weekday);
    }
    
    if (filters.blockType) {
      query.eq('block_type', filters.blockType);
    }

    const { data, error } = await query.order('weekday').order('start_time');

    if (error) {
      throw new Error(`Failed to fetch schedules: ${error.message}`);
    }

    return data.map(this.mapToSchedule);
  }

  async findOne(id: string, tenantId: string): Promise<Schedule> {
    const { data, error } = await this.supabase.supabase
      .from('schedules')
      .select(`
        *,
        employee:employees(*),
        location:locations(*)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    return this.mapToSchedule(data);
  }

  async create(createScheduleDto: CreateScheduleDto, tenantId: string): Promise<Schedule> {
    // Validate that employee belongs to tenant
    const { data: employee, error: employeeError } = await this.supabase.supabase
      .from('employees')
      .select('id')
      .eq('id', createScheduleDto.employeeId)
      .eq('tenant_id', tenantId)
      .single();

    if (employeeError || !employee) {
      throw new BadRequestException(`Employee not found or doesn't belong to this tenant`);
    }

    // Validate that location belongs to tenant
    const { data: location, error: locationError } = await this.supabase.supabase
      .from('locations')
      .select('id')
      .eq('id', createScheduleDto.locationId)
      .eq('tenant_id', tenantId)
      .single();

    if (locationError || !location) {
      throw new BadRequestException(`Location not found or doesn't belong to this tenant`);
    }

    // Validate time format and range
    const startTime = createScheduleDto.startTime;
    const endTime = createScheduleDto.endTime;
    
    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Check for overlapping schedules for the same employee and location on the same day
    const { data: overlappingSchedules, error: overlapError } = await this.supabase.supabase
      .from('schedules')
      .select('*')
      .eq('employee_id', createScheduleDto.employeeId)
      .eq('location_id', createScheduleDto.locationId)
      .eq('weekday', createScheduleDto.weekday)
      .eq('tenant_id', tenantId)
      .or(`start_time.lt.${endTime},end_time.gt.${startTime}`);

    if (overlapError) {
      throw new Error(`Failed to check for overlapping schedules: ${overlapError.message}`);
    }

    if (overlappingSchedules && overlappingSchedules.length > 0) {
      throw new BadRequestException('This schedule overlaps with an existing schedule');
    }

    // Create schedule
    const { data, error } = await this.supabase.supabase
      .from('schedules')
      .insert({
        tenant_id: tenantId,
        employee_id: createScheduleDto.employeeId,
        location_id: createScheduleDto.locationId,
        weekday: createScheduleDto.weekday,
        start_time: startTime,
        end_time: endTime,
        block_type: createScheduleDto.blockType,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create schedule: ${error.message}`);
    }

    return this.mapToSchedule(data);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    // Check if schedule exists
    await this.findOne(id, tenantId);

    // Delete schedule
    const { error } = await this.supabase.supabase
      .from('schedules')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete schedule: ${error.message}`);
    }
  }

  private mapToSchedule(data: any): Schedule {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      employeeId: data.employee_id,
      locationId: data.location_id,
      weekday: data.weekday,
      startTime: data.start_time,
      endTime: data.end_time,
      blockType: data.block_type,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}