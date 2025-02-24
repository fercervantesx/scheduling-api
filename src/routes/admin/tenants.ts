import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { validateRequest } from '../../middleware/validate-request';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/require-admin';

const router = Router();

// Schema for creating a new tenant
const createTenantSchema = z.object({
  name: z.string().min(1),
  subdomain: z.string().min(1).regex(/^[a-z0-9-]+$/),
  customDomain: z.string().optional(),
  plan: z.enum(['FREE', 'BASIC', 'PRO']),
  features: z.object({
    customBranding: z.boolean(),
    apiAccess: z.boolean(),
    webhooks: z.boolean(),
    multipleLocations: z.boolean(),
    analytics: z.boolean(),
  }),
});

// Schema for updating tenant status
const updateTenantStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'TRIAL', 'SUSPENDED']),
});

// Get all tenants
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      subdomain: true,
      customDomain: true,
      plan: true,
      status: true,
      features: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json(tenants);
});

// Create a new tenant
router.post(
  '/',
  requireAuth,
  requireAdmin,
  validateRequest(createTenantSchema),
  async (req, res) => {
    const { name, subdomain, customDomain, plan, features } = req.body;

    // Check if subdomain is already taken
    const existingTenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { subdomain },
          ...(customDomain ? [{ customDomain }] : []),
        ],
      },
    });

    if (existingTenant) {
      return res.status(400).json({
        error: 'Subdomain or custom domain is already taken',
      });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        subdomain,
        customDomain,
        plan,
        features,
        status: 'TRIAL',
      },
    });

    res.status(201).json(tenant);
  }
);

// Update tenant status
router.patch(
  '/:id/status',
  requireAuth,
  requireAdmin,
  validateRequest(updateTenantStatusSchema),
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { status },
    });

    res.json(tenant);
  }
);

export default router; 