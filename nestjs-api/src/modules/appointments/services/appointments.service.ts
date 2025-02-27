import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../../common/services/supabase.service';
import { CreateAppointmentDto } from '../dto/create-appointment.dto';
import { UpdateAppointmentDto, AppointmentStatus } from '../dto/update-appointment.dto';
import { Appointment } from '../entities/appointment.entity';

@Injectable()
export class AppointmentsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(filters: any, tenantId: string): Promise<Appointment[]> {
    const query = this.supabase.supabase
      .from('appointments')
      .select(`
        *,
        service:services(*),
        employee:employees(*),
        location:locations(*)
      `)
      .eq('tenant_id', tenantId)
      .order('start_time', { ascending: true });

    // Apply filters
    if (filters.locationId) {
      query.eq('location_id', filters.locationId);
    }
    
    if (filters.employeeId) {
      query.eq('employee_id', filters.employeeId);
    }
    
    if (filters.status) {
      query.eq('status', filters.status);
    }
    
    if (filters.startDate || filters.endDate) {
      if (filters.startDate) {
        query.gte('start_time', filters.startDate);
      }
      
      if (filters.endDate) {
        query.lte('start_time', filters.endDate);
      }
    }
    
    // Add user-specific filtering if not an admin
    if (filters.userId && !filters.isAdmin) {
      query.eq('user_id', filters.userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch appointments: ${error.message}`);
    }

    return data.map(this.mapToAppointment);
  }

  async findOne(id: string, tenantId: string): Promise<Appointment> {
    const { data, error } = await this.supabase.supabase
      .from('appointments')
      .select(`
        *,
        service:services(*),
        employee:employees(*),
        location:locations(*)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return this.mapToAppointment(data);
  }

  async create(createAppointmentDto: CreateAppointmentDto, tenantId: string, userInfo: any): Promise<Appointment> {
    // First, get the service to check duration
    const { data: service, error: serviceError } = await this.supabase.supabase
      .from('services')
      .select('*')
      .eq('id', createAppointmentDto.serviceId)
      .eq('tenant_id', tenantId)
      .single();

    if (serviceError || !service) {
      throw new NotFoundException('Service not found');
    }

    // Extract user information
    const userEmail = userInfo?.email || 'unknown';
    const userName = userInfo?.name || userInfo?.nickname || userEmail.split('@')[0];
    const userId = userInfo?.sub || 'unknown';

    // Parse appointment time
    const startTime = new Date(createAppointmentDto.startTime);
    
    // Need to get all appointments for the employee on that day
    const startOfDay = new Date(startTime);
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    const endOfDay = new Date(startTime);
    endOfDay.setUTCHours(23, 59, 59, 999);
    
    const { data: existingAppointments, error: fetchError } = await this.supabase.supabase
      .from('appointments')
      .select('*')
      .eq('employee_id', createAppointmentDto.employeeId)
      .eq('status', 'SCHEDULED')
      .eq('tenant_id', tenantId)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString());
      
    if (fetchError) {
      throw new Error(`Failed to check for conflicts: ${fetchError.message}`);
    }
    
    // Calculate appointment end time for overlap checking
    const appointmentEndTime = new Date(startTime.getTime() + service.duration * 60000);
    
    const conflicts = existingAppointments?.filter(appointment => {
      const existingStart = new Date(appointment.start_time);
      const existingEnd = new Date(existingStart.getTime() + service.duration * 60000);
      
      // Check for overlap
      return (
        (startTime < existingEnd && appointmentEndTime > existingStart) ||
        (existingStart < appointmentEndTime && existingEnd > startTime)
      );
    });
    
    if (conflicts && conflicts.length > 0) {
      throw new ConflictException('Time slot is already booked');
    }

    // Create the appointment
    const { data, error } = await this.supabase.supabase
      .from('appointments')
      .insert({
        tenant_id: tenantId,
        service_id: createAppointmentDto.serviceId,
        location_id: createAppointmentDto.locationId,
        employee_id: createAppointmentDto.employeeId,
        start_time: startTime.toISOString(),
        status: 'SCHEDULED',
        booked_by: userEmail,
        booked_by_name: userName,
        user_id: userId,
      })
      .select(`
        *,
        service:services(*),
        employee:employees(*),
        location:locations(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create appointment: ${error.message}`);
    }

    return this.mapToAppointment(data);
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto, tenantId: string): Promise<Appointment> {
    // First get the current appointment to check time constraints
    const { data: currentAppointment, error: fetchError } = await this.supabase.supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !currentAppointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    // Check reschedule time constraints
    if (updateAppointmentDto.startTime && currentAppointment.status !== 'CANCELLED') {
      // Get the tenant settings
      const { data: tenant, error: tenantError } = await this.supabase.supabase
        .from('tenants')
        .select('settings')
        .eq('id', tenantId)
        .single();

      if (tenantError) {
        throw new Error(`Failed to fetch tenant settings: ${tenantError.message}`);
      }

      // Default reschedule time limit - 2 hours
      let rescheduleTimeLimit = 2;
      
      // Safely extract reschedule time limit from settings if it exists
      if (tenant?.settings && typeof tenant.settings === 'object') {
        const settings = tenant.settings as Record<string, any>;
        if (settings.rescheduleTimeLimit !== undefined) {
          rescheduleTimeLimit = Number(settings.rescheduleTimeLimit);
        }
      }

      const now = new Date();
      const appointmentTime = new Date(currentAppointment.start_time);
      const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Check if within the allowed reschedule window
      if (hoursUntilAppointment < rescheduleTimeLimit) {
        throw new BadRequestException(
          `Cannot reschedule appointments less than ${rescheduleTimeLimit} hours before the appointment time`
        );
      }
    }

    // Prepare data for update
    const updateData: any = {
      status: updateAppointmentDto.status,
    };

    if (updateAppointmentDto.startTime) {
      updateData.start_time = new Date(updateAppointmentDto.startTime).toISOString();
    }

    if (updateAppointmentDto.canceledBy) {
      updateData.canceled_by = updateAppointmentDto.canceledBy;
    }

    if (updateAppointmentDto.cancelReason) {
      updateData.cancel_reason = updateAppointmentDto.cancelReason;
    }

    // Add fulfillment_date when marking as fulfilled
    if (updateAppointmentDto.status === AppointmentStatus.FULFILLED) {
      updateData.fulfillment_date = new Date().toISOString();
    }

    // Update the appointment
    const { data, error } = await this.supabase.supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(`
        *,
        service:services(*),
        employee:employees(*),
        location:locations(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update appointment: ${error.message}`);
    }

    return this.mapToAppointment(data);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    // First, get the appointment to check its status and date
    const { data: appointment, error: fetchError } = await this.supabase.supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    const now = new Date();
    const isAppointmentPast = new Date(appointment.start_time) < now;
    const isCancelled = appointment.status === 'CANCELLED';

    if (!isAppointmentPast && !isCancelled) {
      throw new BadRequestException(
        'Cannot delete appointment. It must be either cancelled or past its scheduled date.'
      );
    }

    // If validation passes, delete the appointment
    const { error } = await this.supabase.supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete appointment: ${error.message}`);
    }
  }

  private mapToAppointment(data: any): Appointment {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      serviceId: data.service_id,
      locationId: data.location_id,
      employeeId: data.employee_id,
      startTime: new Date(data.start_time),
      status: data.status,
      canceledBy: data.canceled_by,
      cancelReason: data.cancel_reason,
      bookedBy: data.booked_by,
      bookedByName: data.booked_by_name,
      userId: data.user_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}