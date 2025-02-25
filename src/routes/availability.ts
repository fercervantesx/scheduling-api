import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { checkJwt } from '../middleware/auth';

const router = Router();

const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

// Get available time slots
router.get('/', checkJwt, async (req: Request, res: Response) => {
  const { serviceId, locationId, employeeId, date } = req.query;

  if (!serviceId || !locationId || !employeeId || !date) {
    return res.status(400).json({
      error: 'Missing required parameters: serviceId, locationId, employeeId, date',
    });
  }

  try {
    // Get service duration
    const service = await prisma.service.findUnique({
      where: { id: serviceId as string },
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Parse the input date in local time
    const localDate = new Date(date as string + 'T00:00:00');
    
    // Get the weekday based on local time
    const dayIndex = localDate.getDay(); // Use local day
    const weekday = WEEKDAYS[dayIndex];

    console.log('Date debugging:', {
      inputDate: date,
      parsedDate: localDate.toISOString(),
      dayIndex,
      weekday,
      fullWeekdays: WEEKDAYS,
    });

    // Get employee schedule for the weekday
    const schedule = await prisma.schedule.findFirst({
      where: {
        employeeId: employeeId as string,
        locationId: locationId as string,
        weekday,
        blockType: 'WORKING_HOURS',
      },
    });

    console.log('Schedule lookup:', {
      weekday,
      employeeId,
      locationId,
      found: !!schedule,
      schedule,
    });

    if (!schedule) {
      return res.status(404).json({ error: 'No schedule found for this day' });
    }

    // Create date boundaries in local time
    const startOfDay = new Date(localDate);
    startOfDay.setHours(0, 0, 0, 0);
    console.log('Start of day (local):', startOfDay.toISOString());
    
    const endOfDay = new Date(localDate);
    endOfDay.setHours(23, 59, 59, 999);
    console.log('End of day (local):', endOfDay.toISOString());

    // Get all appointments for the employee in the date range
    const appointments = await prisma.appointment.findMany({
      where: {
        employeeId: employeeId as string,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'SCHEDULED',
      },
      include: {
        service: true,
      },
    });

    // Calculate busy slots
    const busySlots = appointments.map(appointment => {
      const appointmentStart = appointment.startTime;
      const appointmentEnd = new Date(appointmentStart.getTime() + appointment.service.duration * 60 * 1000);
      return { start: appointmentStart, end: appointmentEnd };
    });

    // Parse schedule times
    const [scheduleStartHour, scheduleStartMinute] = schedule.startTime.split(':').map(Number);
    const [scheduleEndHour, scheduleEndMinute] = schedule.endTime.split(':').map(Number);

    // Create schedule boundaries in local time first
    const scheduleStart = new Date(localDate);
    scheduleStart.setHours(scheduleStartHour, scheduleStartMinute, 0, 0);
    console.log('Schedule start (local):', scheduleStart.toISOString(), 'Original:', schedule.startTime);
    
    const scheduleEnd = new Date(localDate);
    scheduleEnd.setHours(scheduleEndHour, scheduleEndMinute, 0, 0);
    console.log('Schedule end (local):', scheduleEnd.toISOString(), 'Original:', schedule.endTime);

    // Calculate available slots
    const slots: { 
      startTime: string; 
      endTime: string; 
      displayTime: string;
      localStartTime: string;
      localEndTime: string;
    }[] = [];
    let currentTime = new Date(scheduleStart);
    const slotDuration = service.duration * 60 * 1000; // Convert minutes to milliseconds

    while (currentTime.getTime() + slotDuration <= scheduleEnd.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration);
      
      // Check if slot conflicts with any appointment
      const hasConflict = busySlots.some((busySlot) => {
        return (
          (currentTime < busySlot.end && slotEnd > busySlot.start)
        );
      });

      if (!hasConflict) {
        // Create properly formatted date objects
        const utcStart = new Date(currentTime);
        const utcEnd = new Date(slotEnd);

        // Format time display for readability in local timezone
        const displayStart = utcStart.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        });
        
        const displayEnd = utcEnd.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        });

        // Add the slot with both ISO and display formats
        slots.push({
          startTime: utcStart.toISOString(),
          endTime: utcEnd.toISOString(),
          displayTime: `${displayStart} - ${displayEnd}`,
          localStartTime: displayStart,
          localEndTime: displayEnd
        });
      }

      // Move to next slot (30-minute intervals)
      currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
    }

    console.log(`Generated ${slots.length} available slots with timezone information`);
    
    // Log a sample slot for debugging
    if (slots.length > 0) {
      console.log('Sample slot:', slots[0]);
    }
    
    return res.json({
      slots,
      tenantInfo: {
        id: req.tenant?.id || 'No tenant ID',
        name: req.tenant?.name || 'No tenant name',
        subdomain: req.tenant?.subdomain || 'No subdomain'
      }
    });
  } catch (error) {
    console.error('Failed to fetch availability:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch availability',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 