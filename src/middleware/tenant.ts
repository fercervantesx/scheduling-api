import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import type { PrismaClient } from '@prisma/client';

type Tenant = NonNullable<Awaited<ReturnType<PrismaClient['tenant']['findFirst']>>>;

// Extend Express Request type to include tenant information
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        name: string;
        subdomain: string;
        customDomain?: string;
        status: string;
        plan: string;
        settings?: any;
        branding?: any;
        features?: any;
      };
    }
  }
}

// Helper function to extract tenant from hostname
const extractTenantFromHostname = async (hostname: string): Promise<Tenant | null> => {
  // Handle custom domains
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { customDomain: hostname },
        { subdomain: hostname.split('.')[0] }
      ]
    }
  });
  
  return tenant;
};

// Middleware to handle tenant resolution
export const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hostname = req.hostname;
    
    // Skip tenant resolution for the admin dashboard
    if (hostname.startsWith('admin.')) {
      return next();
    }

    // Find tenant by hostname
    const tenant = await extractTenantFromHostname(hostname);
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Check tenant status
    if (tenant.status !== 'ACTIVE') {
      return res.status(403).json({ 
        error: 'Tenant access denied',
        status: tenant.status
      });
    }

    // Check if trial has expired
    if (tenant.trialEndsAt && tenant.trialEndsAt < new Date()) {
      return res.status(402).json({ 
        error: 'Trial period has expired',
        trialEndDate: tenant.trialEndsAt
      });
    }

    // Attach tenant to request
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      customDomain: tenant.customDomain || undefined,
      status: tenant.status,
      plan: tenant.plan,
      settings: tenant.settings,
      branding: tenant.branding,
      features: tenant.features
    };

    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    res.status(500).json({ error: 'Failed to resolve tenant' });
  }
};

// Middleware to enforce tenant isolation in database queries
export const enforceTenantIsolation = (req: Request, res: Response, next: NextFunction) => {
  if (!req.tenant && !req.hostname.startsWith('admin.')) {
    return res.status(400).json({ error: 'Tenant context required' });
  }
  next();
};

// Middleware to check feature access
export const checkFeatureAccess = (featureName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return next();
    }

    const features = req.tenant.features || {};
    if (!features[featureName]) {
      return res.status(403).json({ 
        error: 'Feature not available',
        feature: featureName,
        plan: req.tenant.plan
      });
    }

    next();
  };
}; 