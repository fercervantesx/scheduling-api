import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { PLANS } from '../config/tenant-plans';
import { Redis } from 'ioredis';

// Initialize Redis client for rate limiting and quota tracking
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Cache key prefixes
const API_REQUESTS_KEY = 'api_requests';
const APPOINTMENTS_KEY = 'appointments';

interface QuotaCheck {
  resource: 'locations' | 'employees' | 'services' | 'appointments' | 'storage' | 'api';
  count?: number;
}

export const checkQuota = ({ resource, count = 1 }: QuotaCheck) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) {
        return next();
      }

      const plan = PLANS[req.tenant.plan as keyof typeof PLANS];
      if (!plan) {
        return res.status(400).json({ error: 'Invalid plan' });
      }

      // Check API rate limits
      if (resource === 'api') {
        const key = `${API_REQUESTS_KEY}:${req.tenant.id}:${new Date().toISOString().split('T')[0]}`;
        const requests = await redis.incr(key);
        
        // Set key expiration to 24 hours if it's new
        if (requests === 1) {
          await redis.expire(key, 24 * 60 * 60);
        }

        if (requests > plan.quotas.apiRequestsPerDay && plan.quotas.apiRequestsPerDay !== -1) {
          return res.status(429).json({
            error: 'API rate limit exceeded',
            limit: plan.quotas.apiRequestsPerDay,
            reset: await redis.ttl(key),
          });
        }
      }

      // Check other resource limits
      let currentCount = 0;
      switch (resource) {
        case 'locations':
          currentCount = await prisma.location.count({
            where: { tenantId: req.tenant.id },
          });
          break;

        case 'employees':
          currentCount = await prisma.employee.count({
            where: { tenantId: req.tenant.id },
          });
          break;

        case 'services':
          currentCount = await prisma.service.count({
            where: { tenantId: req.tenant.id },
          });
          break;

        case 'appointments':
          // Check monthly appointment quota
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);
          
          currentCount = await prisma.appointment.count({
            where: {
              tenantId: req.tenant.id,
              createdAt: { gte: startOfMonth },
            },
          });
          break;

        case 'storage':
          // Implement storage quota check here
          // This would involve checking file sizes, etc.
          break;
      }

      const quota = plan.quotas[`${resource}${resource === 'appointments' ? 'PerMonth' : ''}`];
      if (quota !== -1 && currentCount + count > quota) {
        return res.status(403).json({
          error: `${resource} quota exceeded`,
          limit: quota,
          current: currentCount,
          requested: count,
          available: Math.max(0, quota - currentCount),
        });
      }

      next();
    } catch (error) {
      console.error(`Error checking ${resource} quota:`, error);
      next(error);
    }
  };
}; 