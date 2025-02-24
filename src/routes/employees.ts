import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { checkJwt } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();

// List all employees
router.get('/', async (_req: Request, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        locations: {
          include: {
            location: true,
          },
        },
      },
    });
    return res.json(employees);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Create a new employee
router.post('/', checkJwt, async (req: Request, res: Response) => {
  const { name, locationIds } = req.body;

  try {
    const employee = await prisma.employee.create({
      data: {
        name,
        locations: {
          create: locationIds.map((locationId: string) => ({
            location: {
              connect: { id: locationId },
            },
          })),
        },
      },
      include: {
        locations: {
          include: {
            location: true,
          },
        },
      },
    });
    return res.status(201).json(employee);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create employee' });
  }
});

// Get a specific employee
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        locations: {
          include: {
            location: true,
          },
        },
        schedules: true,
      },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.json(employee);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// Update employee locations
router.patch('/:id/locations', checkJwt, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { locationIds } = req.body;

  try {
    // First, delete all existing location associations
    await prisma.employeeLocation.deleteMany({
      where: { employeeId: id },
    });

    // Then create new associations
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        locations: {
          create: locationIds.map((locationId: string) => ({
            location: {
              connect: { id: locationId },
            },
          })),
        },
      },
      include: {
        locations: {
          include: {
            location: true,
          },
        },
      },
    });

    return res.json(employee);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update employee locations' });
  }
});

// Delete an employee and cancel their appointments
router.delete('/:id', checkJwt, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Start a transaction to handle both appointment cancellation and employee deletion
    await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>) => {
      // Cancel all scheduled appointments
      await tx.appointment.updateMany({
        where: {
          employeeId: id,
          status: 'SCHEDULED',
        },
        data: {
          status: 'CANCELLED',
          canceledBy: 'ADMIN',
          cancelReason: 'Employee removed from system',
        },
      });

      // Delete employee's location associations
      await tx.employeeLocation.deleteMany({
        where: { employeeId: id },
      });

      // Delete employee's schedules
      await tx.schedule.deleteMany({
        where: { employeeId: id },
      });

      // Finally, delete the employee
      await tx.employee.delete({
        where: { id },
      });
    });

    return res.json({ message: 'Employee and related data deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete employee' });
  }
});

export default router; 