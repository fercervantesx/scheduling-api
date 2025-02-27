import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../common/services/supabase.service';
import { AvailabilityRequestDto } from '../dto/availability-request.dto';
import { format, addMinutes, parseISO, isValid } from 'date-fns';

interface ScheduleWithRelations {
  id: string;
  employee_id: string;
  location_id: string;
  weekday: number | string;
  start_time: string;
  end_time: string;
  block_type: string;
  employee: {
    id: string;
    name: string;
  };
  location: {
    id: string;
    name: string;
  };
}

export interface TimeSlot {
  time: string;
  available: boolean;
  employeeId?: string;
  employeeName?: string;
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly supabase: SupabaseService) {}

  async checkAvailability(
    availabilityRequest: AvailabilityRequestDto,
    tenantId: string
  ): Promise<{ date: string; timeSlots: TimeSlot[] }> {
    // Validate date format
    const date = parseISO(availabilityRequest.date);
    if (!isValid(date)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
    }

    // Get weekday (0 = Sunday, 1 = Monday, etc.)
    const weekday = date.getDay();
    
    // First, get the service to check duration
    const { data: service, error: serviceError } = await this.supabase.supabase
      .from('services')
      .select('*')
      .eq('id', availabilityRequest.serviceId)
      .eq('tenant_id', tenantId)
      .single();

    if (serviceError || !service) {
      throw new NotFoundException('Service not found');
    }

    // Build the query for employees and their schedules
    let query = this.supabase.supabase
      .from('schedules')
      .select(`
        id,
        employee_id,
        location_id,
        weekday,
        start_time,
        end_time,
        block_type,
        employee:employees(id, name),
        location:locations(id, name)
      `)
      .eq('tenant_id', tenantId)
      .eq('weekday', weekday);

    // Add filters
    if (availabilityRequest.locationId) {
      query = query.eq('location_id', availabilityRequest.locationId);
    }
    if (availabilityRequest.employeeId) {
      query = query.eq('employee_id', availabilityRequest.employeeId);
    }

    // Execute query
    const { data: schedules, error: schedulesError } = await query as { 
      data: ScheduleWithRelations[] | null, 
      error: any 
    };

    if (schedulesError) {
      throw new Error(`Failed to fetch schedules: ${schedulesError.message}`);
    }

    // If no schedules found, return empty slots
    if (!schedules || schedules.length === 0) {
      return {
        date: availabilityRequest.date,
        timeSlots: [],
      };
    }

    // Filter for work schedules
    const workSchedules = schedules.filter(s => s.block_type === 'WORK');
    
    // Get all appointments for the day to check for conflicts
    const formattedDate = format(date, 'yyyy-MM-dd');
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const formattedNextDay = format(nextDay, 'yyyy-MM-dd');

    let appointmentsQuery = this.supabase.supabase
      .from('appointments')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('start_time', `${formattedDate}T00:00:00`)
      .lt('start_time', `${formattedNextDay}T00:00:00`);

    // Add filters
    if (availabilityRequest.locationId) {
      appointmentsQuery = appointmentsQuery.eq('location_id', availabilityRequest.locationId);
    }
    if (availabilityRequest.employeeId) {
      appointmentsQuery = appointmentsQuery.eq('employee_id', availabilityRequest.employeeId);
    }

    const { data: appointments, error: appointmentsError } = await appointmentsQuery;

    if (appointmentsError) {
      throw new Error(`Failed to fetch appointments: ${appointmentsError.message}`);
    }

    // Generate all potential time slots
    const timeSlots: TimeSlot[] = [];
    const serviceDuration = service.duration;
    const interval = 15; // 15-minute intervals
    
    // For each employee schedule
    workSchedules.forEach(schedule => {
      const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
      const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
      
      let currentSlot = new Date(date);
      currentSlot.setHours(startHour, startMinute, 0, 0);
      
      const endTime = new Date(date);
      endTime.setHours(endHour, endMinute, 0, 0);
      
      // Generate time slots in the defined interval
      while (addMinutes(currentSlot, serviceDuration) <= endTime) {
        const timeSlot = format(currentSlot, 'HH:mm');
        
        // Check if this time slot conflicts with any appointments
        const isAvailable = !appointments?.some(appointment => {
          // Skip if not the same employee
          if (appointment.employee_id !== schedule.employee_id) {
            return false;
          }
          
          // Get appointment time in UTC
          const appointmentTimeUTC = new Date(appointment.start_time);
          
          // Extract hours and minutes from appointment time (in UTC)
          const appointmentHours = appointmentTimeUTC.getUTCHours();
          const appointmentMinutes = appointmentTimeUTC.getUTCMinutes();
          
          // Extract hours and minutes from the current slot
          const [slotHours, slotMinutes] = timeSlot.split(':').map(Number);
          
          // Convert both times to minutes for easier comparison
          const appointmentTotalMinutes = appointmentHours * 60 + appointmentMinutes;
          const slotTotalMinutes = slotHours * 60 + slotMinutes;
          
          // Calculate appointment end time in minutes
          const appointmentEndTotalMinutes = appointmentTotalMinutes + serviceDuration;
          
          // Calculate slot end time in minutes
          const slotEndTotalMinutes = slotTotalMinutes + serviceDuration;
          
          // Check for overlap in minutes
          const hasOverlap = (
            (slotTotalMinutes < appointmentEndTotalMinutes && slotEndTotalMinutes > appointmentTotalMinutes) ||
            (appointmentTotalMinutes < slotEndTotalMinutes && appointmentEndTotalMinutes > slotTotalMinutes)
          );
          
          if (hasOverlap) {
            console.log(`Conflict detected for time slot ${timeSlot} - appointment at ${format(appointmentTimeUTC, 'HH:mm')} UTC`);
          }
          
          return hasOverlap;
        });
        
        timeSlots.push({
          time: timeSlot,
          available: isAvailable,
          employeeId: schedule.employee.id,
          employeeName: schedule.employee.name
        });
        
        // Move to next slot
        currentSlot = addMinutes(currentSlot, interval);
      }
    });
    
    // Sort time slots by time
    timeSlots.sort((a, b) => {
      if (a.time < b.time) return -1;
      if (a.time > b.time) return 1;
      return 0;
    });
    
    return {
      date: availabilityRequest.date,
      timeSlots
    };
  }
}