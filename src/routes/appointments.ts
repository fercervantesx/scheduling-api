import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { checkJwt, decodeUserInfo } from '../middleware/auth';
import { Prisma } from '@prisma/client';

const router = Router();

// List appointments with filtering
router.get('/', [checkJwt, decodeUserInfo], async (req: Request, res: Response) => {
  const { locationId, employeeId, status, startDate, endDate } = req.query;
  
  console.log('Appointments route - Headers:', {
    authorization: req.headers.authorization,
    contentType: req.headers['content-type'],
  });

  console.log('Appointments route - User info:', {
    user: req.user,
    permissions: req.user?.permissions,
  });

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
  // Extremely detailed debug logging
  console.log('============ APPOINTMENT CREATE DEBUG ============');
  console.log('Raw request body:', req.body);
  console.log('Request headers:', req.headers);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body type:', typeof req.body);
  console.log('Is body array?', Array.isArray(req.body));
  
  // Check if the body might be stringified JSON
  if (typeof req.body === 'string') {
    try {
      const parsedBody = JSON.parse(req.body);
      console.log('Parsed string body:', parsedBody);
      req.body = parsedBody;
    } catch (e) {
      console.log('Failed to parse body as JSON string');
    }
  }
  
  // Try extracting with both camelCase and snake_case
  const serviceId = req.body.serviceId || req.body.service_id;
  const locationId = req.body.locationId || req.body.location_id;
  const employeeId = req.body.employeeId || req.body.employee_id;
  const startTime = req.body.startTime || req.body.start_time;

  console.log('Extracted appointment fields:', { serviceId, locationId, employeeId, startTime });

  if (!serviceId || !locationId || !employeeId || !startTime) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      received: { serviceId, locationId, employeeId, startTime },
      rawBody: typeof req.body === 'object' ? JSON.stringify(req.body) : req.body,
      bodyKeys: typeof req.body === 'object' ? Object.keys(req.body) : []
    });
  }

  try {
    // First, get the service to check duration
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Log JWT token information
    console.log('JWT User Info:', {
      email: req.user?.email,
      name: req.user?.name,
      nickname: req.user?.nickname,
      sub: req.user?.sub,
      raw: req.user
    });

    // Extract user information from JWT token
    const userEmail = req.user?.email || 'unknown';
    const userName = req.user?.name || req.user?.nickname || userEmail.split('@')[0];
    const userId = req.user?.sub || 'unknown';

    // Log extracted user information
    console.log('Extracted User Info:', {
      userEmail,
      userName,
      userId
    });

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

// Update appointment status (cancel, reschedule)
router.patch('/:id', [checkJwt, decodeUserInfo], async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, startTime, canceledBy, cancelReason } = req.body;

  try {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status,
        startTime: startTime ? new Date(startTime) : undefined,
        canceledBy,
        cancelReason,
      },
      include: {
        service: true,
        employee: true,
        location: true,
      },
    });

    return res.json(appointment);
  } catch (error) {
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