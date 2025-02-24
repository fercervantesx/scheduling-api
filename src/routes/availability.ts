import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import type { PrismaClient } from '@prisma/client';
import { checkJwt } from '../middleware/auth';

const router = Router();

type AppointmentType = Awaited<ReturnType<PrismaClient['appointment']['findFirst']>>;

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
    
    const endOfDay = new Date(localDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get existing appointments
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
      orderBy: {
        startTime: 'asc',
      },
    });

    // Parse schedule times
    const [scheduleStartHour, scheduleStartMinute] = schedule.startTime.split(':').map(Number);
    const [scheduleEndHour, scheduleEndMinute] = schedule.endTime.split(':').map(Number);

    // Create schedule boundaries in local time first
    const scheduleStart = new Date(localDate);
    scheduleStart.setHours(scheduleStartHour, scheduleStartMinute, 0, 0);
    
    const scheduleEnd = new Date(localDate);
    scheduleEnd.setHours(scheduleEndHour, scheduleEndMinute, 0, 0);

    // Calculate available slots
    const slots: { startTime: string; endTime: string }[] = [];
    let currentTime = new Date(scheduleStart);
    const slotDuration = service.duration * 60 * 1000; // Convert minutes to milliseconds

    while (currentTime.getTime() + slotDuration <= scheduleEnd.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration);
      
      // Check if slot conflicts with any appointment
      const hasConflict = appointments.some((appointment: NonNullable<AppointmentType>) => {
        const appointmentStart = new Date(appointment.startTime);
        const appointmentEnd = new Date(appointmentStart.getTime() + appointment.service.duration * 60 * 1000);

        return (
          (currentTime < appointmentEnd && slotEnd > appointmentStart)
        );
      });

      if (!hasConflict) {
        // Convert local times to UTC for storage
        const utcStart = new Date(currentTime);
        const utcEnd = new Date(slotEnd);

        slots.push({
          startTime: utcStart.toISOString(),
          endTime: utcEnd.toISOString(),
        });
      }

      // Move to next slot (30-minute intervals)
      currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
    }

    return res.json(slots);
  } catch (error) {
    console.error('Failed to fetch availability:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch availability',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 