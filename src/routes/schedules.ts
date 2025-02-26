import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { checkJwt } from '../middleware/auth';

const router = Router();

// List all schedules
router.get('/', async (req: Request, res: Response) => {
  try {
    const schedules = await prisma.schedule.findMany({
      where: {
        tenantId: req.tenant?.id,
      },
      include: {
        employee: true,
        location: true,
      },
      orderBy: [
        { weekday: 'asc' },
        { startTime: 'asc' }
      ],
    });
    return res.json(schedules);
  } catch (error) {
    console.error('Failed to fetch schedules:', error);
    return res.status(500).json({ error: 'Failed to fetch schedules', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Create a new schedule
router.post('/', checkJwt, async (req: Request, res: Response) => {
  const { employeeId, locationId, startTime, endTime, weekday, blockType } = req.body;

  // Validate required fields
  if (!employeeId || !locationId || !startTime || !endTime || !weekday || !blockType) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['employeeId', 'locationId', 'startTime', 'endTime', 'weekday', 'blockType'],
      received: req.body,
    });
  }

  // Validate time format (HH:mm)
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return res.status(400).json({
      error: 'Invalid time format',
      message: 'Time must be in HH:mm format',
      received: { startTime, endTime },
    });
  }

  try {
    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Check for overlapping schedules on the same weekday
    const overlapping = await prisma.schedule.findFirst({
      where: {
        employeeId,
        locationId,
        weekday,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      return res.status(409).json({
        error: 'Schedule overlaps with existing schedule',
        existing: overlapping,
      });
    }

    const schedule = await prisma.schedule.create({
      data: {
        employee: {
          connect: { id: employeeId }
        },
        location: {
          connect: { id: locationId }
        },
        tenant: {
          connect: { id: req.tenant?.id }
        },
        startTime,
        endTime,
        weekday,
        blockType,
      },
    });
    return res.status(201).json(schedule);
  } catch (error) {
    console.error('Failed to create schedule:', error);
    return res.status(500).json({
      error: 'Failed to create schedule',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete a schedule
router.delete('/:id', checkJwt, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.schedule.delete({
      where: { id },
    });
    return res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Failed to delete schedule:', error);
    return res.status(500).json({
      error: 'Failed to delete schedule',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router; 