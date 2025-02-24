import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import type { Tenant as PrismaTenant } from '@prisma/client';

// Extend Express Request type to include tenant information
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        name: string;
        email?: string;
        subdomain: string;
        customDomain: string | null;
        status: string;
        plan: string;
        settings: any;
        branding: any;
        features: any;
        trialEndsAt: Date | null;
      };
    }
  }
}

// Helper function to extract tenant from hostname
const extractTenantFromHostname = async (hostname: string): Promise<PrismaTenant | null> => {
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
export const resolveTenant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hostname = req.hostname;
    
    // Skip tenant resolution for the admin dashboard
    if (hostname.startsWith('admin.')) {
      next();
      return;
    }

    // Find tenant by hostname
    const tenant = await extractTenantFromHostname(hostname);
    
    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    // Check tenant status
    if (tenant.status !== 'ACTIVE') {
      res.status(403).json({ 
        error: 'Tenant access denied',
        status: tenant.status
      });
      return;
    }

    // Check if trial has expired
    if (tenant.trialEndsAt && tenant.trialEndsAt < new Date()) {
      res.status(402).json({ 
        error: 'Trial period has expired',
        trialEndDate: tenant.trialEndsAt
      });
      return;
    }

    // Attach tenant to request
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email || undefined,
      subdomain: tenant.subdomain,
      customDomain: tenant.customDomain,
      status: tenant.status,
      plan: tenant.plan,
      settings: tenant.settings,
      branding: tenant.branding,
      features: tenant.features,
      trialEndsAt: tenant.trialEndsAt
    };

    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    res.status(500).json({ error: 'Failed to resolve tenant' });
  }
};

// Middleware to enforce tenant isolation in database queries
export const enforceTenantIsolation = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.tenant && !req.hostname.startsWith('admin.')) {
    res.status(400).json({ error: 'Tenant context required' });
    return;
  }
  next();
};

// Middleware to check feature access
export const checkFeatureAccess = (featureName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tenant) {
      next();
      return;
    }

    const features = req.tenant.features || {};
    if (!features[featureName]) {
      res.status(403).json({ 
        error: 'Feature not available',
        feature: featureName,
        plan: req.tenant.plan
      });
      return;
    }

    next();
  };
}; 