import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { PLANS, PlanId } from '../config/tenant-plans';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

type QuotaResource = 'locations' | 'employees' | 'services' | 'appointmentsPerMonth' | 'storageGB' | 'apiRequestsPerDay';

interface QuotaOptions {
  resource: QuotaResource;
}

const QUOTA_MAPPING: Record<QuotaResource, keyof typeof PLANS['FREE']['quotas']> = {
  locations: 'locations',
  employees: 'employees',
  services: 'services',
  appointmentsPerMonth: 'appointmentsPerMonth',
  storageGB: 'storageGB',
  apiRequestsPerDay: 'apiRequestsPerDay',
};

export const checkQuota = (options: QuotaOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenant) {
        next();
        return;
      }

      const { resource } = options;
      const plan = PLANS[req.tenant.plan as PlanId];

      if (!plan) {
        res.status(400).json({ error: 'Invalid plan' });
        return;
      }

      // Get quota limit for the resource
      const quotaKey = QUOTA_MAPPING[resource];
      const quota = plan.quotas[quotaKey];
      if (!quota) {
        next();
        return;
      }

      // Check current usage
      let currentUsage = 0;

      switch (resource) {
        case 'locations':
          currentUsage = await prisma.location.count({
            where: { tenantId: req.tenant.id },
          });
          break;

        case 'employees':
          currentUsage = await prisma.employee.count({
            where: { tenantId: req.tenant.id },
          });
          break;

        case 'services':
          currentUsage = await prisma.service.count({
            where: { tenantId: req.tenant.id },
          });
          break;

        case 'appointmentsPerMonth': {
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          currentUsage = await prisma.appointment.count({
            where: {
              tenantId: req.tenant.id,
              createdAt: {
                gte: startOfMonth,
              },
            },
          });
          break;
        }

        case 'storageGB':
          // TODO: Implement storage quota check
          break;

        case 'apiRequestsPerDay': {
          // Get API usage from Redis
          const apiUsage = await redis.get(`api_usage:${req.tenant.id}`);
          currentUsage = apiUsage ? parseInt(apiUsage, 10) : 0;
          break;
        }
      }

      if (currentUsage >= quota) {
        res.status(429).json({
          error: 'Quota exceeded',
          resource,
          limit: quota,
          current: currentUsage,
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}; 