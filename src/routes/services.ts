import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { checkJwt } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();

// List all services
router.get('/', async (_req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany();
    return res.json(services);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Create a new service
router.post('/', checkJwt, async (req: Request, res: Response) => {
  const { name, duration } = req.body;

  try {
    const service = await prisma.service.create({
      data: {
        name,
        duration,
      },
    });
    return res.status(201).json(service);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create service' });
  }
});

// Get a specific service
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    return res.json(service);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// Delete a service and cancel related appointments
router.delete('/:id', checkJwt, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Start a transaction to handle both appointment cancellation and service deletion
    await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>) => {
      // Cancel all scheduled appointments for this service
      await tx.appointment.updateMany({
        where: {
          serviceId: id,
          status: 'SCHEDULED',
        },
        data: {
          status: 'CANCELLED',
          canceledBy: 'ADMIN',
          cancelReason: 'Service removed from system',
        },
      });

      // Delete the service
      await tx.service.delete({
        where: { id },
      });
    });

    return res.json({ message: 'Service and related appointments deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete service' });
  }
});

export default router; 