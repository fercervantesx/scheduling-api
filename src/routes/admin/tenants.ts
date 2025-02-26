import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { checkJwt } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/require-admin';
import { Prisma } from '@prisma/client';
import { PLANS } from '../../config/tenant-plans';

const router = Router();

// List all tenants
router.get('/', [checkJwt, requireAdmin], async (_req: Request, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return res.json(tenants);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// Get tenant details
router.get('/:id', [checkJwt, requireAdmin], async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        locations: true,
        employees: true,
        services: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    return res.json(tenant);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch tenant details' });
  }
});

// Update tenant settings
router.patch('/:id/settings', [checkJwt, requireAdmin], async (req: Request, res: Response) => {
  const { id } = req.params;
  const { settings } = req.body;

  try {
    // Fetch existing settings first
    const currentTenant = await prisma.tenant.findUnique({
      where: { id },
      select: { settings: true },
    });

    // Merge existing settings with new ones
    const existingSettings = currentTenant?.settings ? 
      (typeof currentTenant.settings === 'object' ? currentTenant.settings : {}) : {};
      
    const mergedSettings = {
      ...existingSettings,
      ...settings,
    };

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        settings: mergedSettings as Prisma.InputJsonValue,
      },
    });
    return res.json(tenant);
  } catch (error) {
    console.error('Failed to update tenant settings:', error);
    return res.status(500).json({ error: 'Failed to update tenant settings' });
  }
});

// Create a new tenant
router.post('/', [checkJwt, requireAdmin], async (req: Request, res: Response) => {
  const { name, subdomain, plan } = req.body;

  try {
    const tenant = await prisma.tenant.create({
      data: {
        name,
        subdomain,
        plan,
        status: 'ACTIVE',
        features: {
          customBranding: false,
          apiAccess: false,
          webhooks: false,
          multipleLocations: false,
          analytics: false,
        },
      },
    });
    return res.status(201).json(tenant);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// Update tenant status
router.patch('/:id/status', [checkJwt, requireAdmin], async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const tenant = await prisma.tenant.update({
      where: { id },
      data: { status },
    });
    return res.json(tenant);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update tenant status' });
  }
});

// Update tenant plan
router.patch('/:id/plan', [checkJwt, requireAdmin], async (req: Request, res: Response) => {
  const { id } = req.params;
  const { plan } = req.body;

  if (!plan || !PLANS[plan as keyof typeof PLANS]) {
    return res.status(400).json({ error: 'Invalid plan specified' });
  }

  try {
    // Get plan features based on plan level
    const planConfig = PLANS[plan as keyof typeof PLANS];
    
    // Update tenant with new plan and default features for that plan
    const tenant = await prisma.tenant.update({
      where: { id },
      data: { 
        plan,
        features: planConfig.features
      },
    });
    
    return res.json(tenant);
  } catch (error) {
    console.error('Failed to update tenant plan:', error);
    return res.status(500).json({ error: 'Failed to update tenant plan' });
  }
});

export default router; 