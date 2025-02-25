import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { checkJwt } from '../middleware/auth';
import { checkQuota } from '../middleware/quota-enforcement';

const router = Router();

// List all locations
router.get('/', checkJwt, async (req: Request, res: Response) => {
  try {
    console.log('🏙️ Fetching locations for tenant:', req.tenant?.id);
    
    const locations = await prisma.location.findMany({
      where: {
        tenantId: req.tenant?.id,
      },
    });
    
    console.log(`📍 Found ${locations.length} locations for tenant ${req.tenant?.id || 'unknown'}`);
    
    if (locations.length === 0) {
      // Add debug information for empty locations
      const allLocations = await prisma.location.findMany({
        select: { id: true, name: true, tenantId: true }
      });
      console.log('📊 All locations in system:', JSON.stringify(allLocations));
    }
    
    return res.json(locations);
  } catch (error) {
    console.error('❌ Error fetching locations:', error);
    return res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Create a new location (requires authentication)
router.post('/', [
  checkJwt,
  checkQuota({ resource: 'locations' }),
], async (req: Request, res: Response) => {
  const { name, address } = req.body;

  try {
    // First, check if req.tenant exists in development mode
    if (process.env.NODE_ENV === 'development' && !req.tenant) {
      console.log('Creating location without tenant in development mode');
      // Create a default tenant if it doesn't exist
      const defaultTenant = await prisma.tenant.findFirst({
        where: { status: 'ACTIVE' }
      });
      
      let tenantId;
      
      if (defaultTenant) {
        tenantId = defaultTenant.id;
      } else {
        const newTenant = await prisma.tenant.create({
          data: {
            name: 'Development Tenant',
            subdomain: 'dev',
            status: 'ACTIVE',
            plan: 'PRO',
            features: { locations: true, employees: true },
          }
        });
        tenantId = newTenant.id;
      }
      
      const location = await prisma.location.create({
        data: {
          name,
          address,
          tenantId: tenantId,
        },
      });
      return res.status(201).json(location);
    } else {
      // Normal flow with tenant
      console.log('Creating location with tenant:', req.tenant?.id);
      const location = await prisma.location.create({
        data: {
          name,
          address,
          tenantId: req.tenant!.id,
        },
      });
      return res.status(201).json(location);
    }
  } catch (error) {
    console.error('Error creating location:', error);
    return res.status(500).json({ error: 'Failed to create location', details: process.env.NODE_ENV === 'development' ? String(error) : undefined });
  }
});

// Get a specific location
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const location = await prisma.location.findFirst({
      where: {
        id,
        tenantId: req.tenant?.id,
      },
      include: {
        employees: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    return res.json(location);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch location' });
  }
});

// Update a location (requires authentication)
router.put('/:id', [
  checkJwt,
], async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, address } = req.body;

  try {
    // Check if the location exists and belongs to the tenant
    const existingLocation = await prisma.location.findFirst({
      where: {
        id,
        tenantId: req.tenant?.id,
      },
    });

    if (!existingLocation) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Update the location
    const location = await prisma.location.update({
      where: { id },
      data: {
        name,
        address,
      },
    });

    return res.json(location);
  } catch (error) {
    console.error('Error updating location:', error);
    return res.status(500).json({ error: 'Failed to update location', details: process.env.NODE_ENV === 'development' ? String(error) : undefined });
  }
});

// Delete a location (requires authentication)
router.delete('/:id', [
  checkJwt,
], async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Check if the location exists and belongs to the tenant
    const existingLocation = await prisma.location.findFirst({
      where: {
        id,
        tenantId: req.tenant?.id,
      },
      include: {
        employees: true,
        schedules: true,
        appointments: true,
      },
    });

    if (!existingLocation) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Get counts before deletion for reporting
    const relatedCounts = {
      employeeCount: existingLocation.employees.length,
      scheduleCount: existingLocation.schedules.length,
      appointmentCount: existingLocation.appointments.length,
    };

    // With cascading deletes in place, we can directly delete the location
    // and all related records will be automatically deleted
    await prisma.location.delete({
      where: { id },
    });

    return res.json({ 
      success: true, 
      message: 'Location deleted successfully',
      cascaded: relatedCounts
    });
  } catch (error) {
    console.error('Error deleting location:', error);
    return res.status(500).json({ error: 'Failed to delete location', details: process.env.NODE_ENV === 'development' ? String(error) : undefined });
  }
});

export default router; 