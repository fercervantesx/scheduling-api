import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { PLANS, PlanId } from '../config/tenant-plans';
import { redis } from '../lib/redis';

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
      // In development mode with localhost, skip quota enforcement
      if (process.env.NODE_ENV === 'development' && (req.hostname === 'localhost' || req.hostname === '127.0.0.1')) {
        next();
        return;
      }
      
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
          // Calculate storage usage by estimating based on database records
          // This is an estimation based on database records, not actual file sizes
          const storageRecords = await Promise.all([
            prisma.appointment.count({ where: { tenantId: req.tenant.id } }),
            prisma.service.count({ where: { tenantId: req.tenant.id } }),
            prisma.employee.count({ where: { tenantId: req.tenant.id } }),
            prisma.location.count({ where: { tenantId: req.tenant.id } }),
            prisma.schedule.count({ where: { tenantId: req.tenant.id } })
          ]);
          
          // Estimate storage usage based on record counts (approximate values in KB)
          const recordSizes = {
            appointment: 5, // 5KB per appointment
            service: 2,     // 2KB per service
            employee: 3,    // 3KB per employee
            location: 3,    // 3KB per location
            schedule: 2     // 2KB per schedule
          };
          
          // Calculate total storage in KB, then convert to GB
          const totalStorageKB = 
            storageRecords[0] * recordSizes.appointment +
            storageRecords[1] * recordSizes.service +
            storageRecords[2] * recordSizes.employee +
            storageRecords[3] * recordSizes.location +
            storageRecords[4] * recordSizes.schedule;
            
          currentUsage = Math.ceil(totalStorageKB / (1024 * 1024)); // Convert KB to GB
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