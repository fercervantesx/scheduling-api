import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { checkJwt } from '../middleware/auth';
import { checkQuota } from '../middleware/quota-enforcement';

const router = Router();

// List all employees
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('👥 Fetching employees for tenant:', req.tenant?.id);
    console.log('👥 Request hostname:', req.hostname);
    console.log('👥 X-Tenant-ID header:', req.headers['x-tenant-id']);
    
    const employees = await prisma.employee.findMany({
      where: {
        tenantId: req.tenant?.id,
      },
      include: {
        locations: {
          include: {
            location: true,
          },
        },
      },
    });
    
    console.log(`👥 Found ${employees.length} employees for tenant ${req.tenant?.id || 'unknown'}`);
    
    if (employees.length === 0) {
      // For debugging, show all employees when none are found
      const allEmployees = await prisma.employee.findMany({
        select: { id: true, name: true, tenantId: true }
      });
      console.log('👥 All employees in system:', JSON.stringify(allEmployees));
    }
    
    return res.json(employees);
  } catch (error) {
    console.error('❌ Error fetching employees:', error);
    return res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Create a new employee
router.post('/', [
  checkJwt,
  checkQuota({ resource: 'employees' }),
], async (req: Request, res: Response) => {
  const { name, locationIds } = req.body;

  try {
    const employee = await prisma.employee.create({
      data: {
        name,
        tenantId: req.tenant!.id,
        locations: {
          create: locationIds.map((locationId: string) => ({
            location: {
              connect: { 
                id: locationId,
                tenantId: req.tenant!.id,
              },
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
    const employee = await prisma.employee.findFirst({
      where: {
        id,
        tenantId: req.tenant?.id,
      },
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

// Update an employee
router.patch('/:id', checkJwt, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    // Update employee name
    const employee = await prisma.employee.update({
      where: {
        id,
        tenantId: req.tenant?.id,
      },
      data: {
        name,
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
    return res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Update employee locations
router.patch('/:id/locations', checkJwt, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { locationIds } = req.body;

  try {
    // First, delete all existing location associations
    await prisma.employeeLocation.deleteMany({
      where: {
        employeeId: id,
        employee: {
          tenantId: req.tenant?.id,
        },
      },
    });

    // Then create new associations
    const employee = await prisma.employee.update({
      where: {
        id,
        tenantId: req.tenant?.id,
      },
      data: {
        locations: {
          create: locationIds.map((locationId: string) => ({
            location: {
              connect: {
                id: locationId,
                tenantId: req.tenant!.id,
              },
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
    // Delete employee and related records in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete employee locations
      await tx.employeeLocation.deleteMany({
        where: {
          employeeId: id,
          employee: {
            tenantId: req.tenant?.id,
          },
        },
      });

      // Delete schedules
      await tx.schedule.deleteMany({
        where: {
          employeeId: id,
          tenantId: req.tenant?.id,
        },
      });

      // Update appointments
      await tx.appointment.updateMany({
        where: {
          employeeId: id,
          status: 'SCHEDULED',
          tenantId: req.tenant?.id,
        },
        data: {
          status: 'CANCELLED',
          canceledBy: 'ADMIN',
          cancelReason: 'Employee removed from system',
        },
      });

      // Delete the employee
      await tx.employee.delete({
        where: {
          id,
          tenantId: req.tenant?.id,
        },
      });
    });

    return res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete employee' });
  }
});

export default router; 