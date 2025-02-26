import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { checkJwt, decodeUserInfo } from '../middleware/auth';
import { Prisma } from '@prisma/client';

const router = Router();

// List appointments with filtering
router.get('/', [checkJwt, decodeUserInfo], async (req: Request, res: Response) => {
  const { locationId, employeeId, status, startDate, endDate } = req.query;
  

  try {
    const where: Prisma.AppointmentWhereInput = {};

    if (locationId) where.locationId = locationId as string;
    if (employeeId) where.employeeId = employeeId as string;
    if (status) where.status = status as string;
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate as string);
      if (endDate) where.startTime.lte = new Date(endDate as string);
    }

    // Add user-specific filtering if not an admin
    if (!req.user?.permissions?.includes('admin')) {
      where.userId = req.user?.user_id;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        service: true,
        employee: true,
        location: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Book a new appointment with concurrency check
router.post('/', [checkJwt, decodeUserInfo], async (req: Request, res: Response) => {
  // Extract request fields (supporting both camelCase and snake_case)
  const serviceId = req.body.serviceId || req.body.service_id;
  const locationId = req.body.locationId || req.body.location_id;
  const employeeId = req.body.employeeId || req.body.employee_id;
  const startTime = req.body.startTime || req.body.start_time;

  if (!serviceId || !locationId || !employeeId || !startTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // First, get the service to check duration
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Extract user information from JWT token
    const userEmail = req.user?.email || 'unknown';
    const userName = req.user?.name || req.user?.nickname || userEmail.split('@')[0];
    const userId = req.user?.sub || 'unknown';

    const appointmentEndTime = new Date(new Date(startTime).getTime() + service.duration * 60000);

    // Check for conflicting appointments in a transaction
    const appointment = await prisma.$transaction(async (tx) => {
      // Check for existing appointments in the time slot
      const conflicts = await tx.appointment.findFirst({
        where: {
          employeeId,
          status: 'SCHEDULED',
          OR: [
            {
              AND: [
                { startTime: { lte: new Date(startTime) } },
                { startTime: { gt: new Date(startTime) } },
              ],
            },
            {
              AND: [
                { startTime: { lt: appointmentEndTime } },
                { startTime: { gte: new Date(startTime) } },
              ],
            },
          ],
        },
      });

      if (conflicts) {
        throw new Error('Time slot is already booked');
      }

      // Create the appointment if no conflicts
      return await tx.appointment.create({
        data: {
          service: { connect: { id: serviceId } },
          location: { connect: { id: locationId } },
          employee: { connect: { id: employeeId } },
          startTime: new Date(startTime),
          status: 'SCHEDULED',
          bookedBy: userEmail,
          bookedByName: userName,
          userId,
          tenant: {
            connect: {
              id: req.tenant?.id
            }
          }
        },
        include: {
          service: true,
          employee: true,
          location: true,
        },
      });
    });

    return res.status(201).json(appointment);
  } catch (error) {
    if (error instanceof Error && error.message === 'Time slot is already booked') {
      return res.status(409).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Update appointment status (cancel, reschedule, fulfill)
router.patch('/:id', [checkJwt, decodeUserInfo], async (req: Request, res: Response) => {
  const { id } = req.params;
  const { 
    status, 
    startTime, 
    canceledBy, 
    cancelReason
  } = req.body;

  try {
    // Get the current tenant settings for reschedule time limit
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant?.id || '' },
      select: { settings: true }
    });

    // Default reschedule time limit - 2 hours
    let rescheduleTimeLimit = 2;
    
    // Safely extract reschedule time limit from settings if it exists
    if (tenant?.settings && typeof tenant.settings === 'object') {
      const settings = tenant.settings as Record<string, any>;
      if (settings.rescheduleTimeLimit !== undefined) {
        rescheduleTimeLimit = Number(settings.rescheduleTimeLimit);
      }
    }

    // Get the current appointment to check time constraints
    const currentAppointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!currentAppointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check if trying to reschedule
    if (startTime && currentAppointment.status !== 'CANCELLED') {
      const now = new Date();
      const appointmentTime = new Date(currentAppointment.startTime);
      const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Check if within the allowed reschedule window
      if (hoursUntilAppointment < rescheduleTimeLimit) {
        return res.status(400).json({ 
          error: 'Cannot reschedule appointments less than ' + 
                 rescheduleTimeLimit + ' hours before the appointment time'
        });
      }
    }

    // Prepare data for update
    const updateData: any = {
      status,
      canceledBy,
      cancelReason
    };

    // Add startTime if provided
    if (startTime) {
      updateData.startTime = new Date(startTime);
    }

    // Add fulfillmentDate when marking as fulfilled
    if (status === 'FULFILLED') {
      updateData.fulfillmentDate = new Date();
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        service: true,
        employee: true,
        location: true,
      },
    });

    return res.json(appointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    return res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Delete an appointment (only if cancelled or past date)
router.delete('/:id', [checkJwt, decodeUserInfo], async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // First, get the appointment to check its status and date
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const now = new Date();
    const isAppointmentPast = appointment.startTime < now;
    const isCancelled = appointment.status === 'CANCELLED';

    if (!isAppointmentPast && !isCancelled) {
      return res.status(403).json({
        error: 'Cannot delete appointment. It must be either cancelled or past its scheduled date.'
      });
    }

    // If validation passes, delete the appointment
    await prisma.appointment.delete({
      where: { id },
    });

    return res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

export default router; 