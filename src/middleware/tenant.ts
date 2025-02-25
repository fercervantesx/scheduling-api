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

// Helper function to extract tenant from hostname or headers
const extractTenantFromRequest = async (req: Request): Promise<PrismaTenant | null> => {
  try {
    // First check for X-Tenant-ID header for mobile app support
    const tenantId = req.headers['x-tenant-id'] as string;
    if (tenantId) {
      console.log('🔍 Using tenant ID from X-Tenant-ID header:', tenantId);
      
      // Debug query
      console.log('🔍 Looking for tenant with subdomain:', tenantId);
      
      // Get all tenants for debugging
      const allTenants = await prisma.tenant.findMany({
        select: { id: true, name: true, subdomain: true, status: true }
      });
      console.log('🔍 All available tenants:', JSON.stringify(allTenants));
      
      const tenant = await prisma.tenant.findFirst({
        where: { subdomain: tenantId }
      });
      
      if (tenant) {
        console.log('✅ Found tenant:', tenant.name, tenant.id);
      } else {
        console.log('❌ No tenant found with subdomain:', tenantId);
      }
      
      return tenant;
    }
    
    // Fall back to hostname-based resolution
    const hostname = req.hostname;
    console.log('🔍 Using hostname for tenant resolution:', hostname);
    
    // Handle custom domains
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { customDomain: hostname },
          { subdomain: hostname.split('.')[0] }
        ]
      }
    });
    
    if (tenant) {
      console.log('✅ Found tenant via hostname:', tenant.name, tenant.id);
    } else {
      console.log('❌ No tenant found for hostname:', hostname);
    }
    
    return tenant;
  } catch (error) {
    console.error('💥 Error in extractTenantFromRequest:', error);
    return null;
  }
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

    // DEVELOPMENT MODE: For local development with localhost, use a default tenant
    if (process.env.NODE_ENV === 'development' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      // Get the first active tenant for development
      const defaultTenant = await prisma.tenant.findFirst({
        where: { status: 'ACTIVE' }
      });

      if (defaultTenant) {
        req.tenant = {
          id: defaultTenant.id,
          name: defaultTenant.name,
          email: defaultTenant.email || undefined,
          subdomain: defaultTenant.subdomain,
          customDomain: defaultTenant.customDomain,
          status: defaultTenant.status,
          plan: defaultTenant.plan,
          settings: defaultTenant.settings,
          branding: defaultTenant.branding,
          features: defaultTenant.features,
          trialEndsAt: defaultTenant.trialEndsAt
        };
        next();
        return;
      } else {
        console.log('No default tenant found for development. Creating one...');
        
        // Create a default tenant for development
        const newTenant = await prisma.tenant.create({
          data: {
            name: 'Development Tenant',
            subdomain: 'dev',
            status: 'ACTIVE',
            plan: 'PRO',
            features: { locations: true, employees: true },
          }
        });
        
        req.tenant = {
          id: newTenant.id,
          name: newTenant.name,
          email: newTenant.email || undefined,
          subdomain: newTenant.subdomain,
          customDomain: newTenant.customDomain,
          status: newTenant.status,
          plan: newTenant.plan,
          settings: newTenant.settings || {},
          branding: newTenant.branding || {},
          features: newTenant.features || {},
          trialEndsAt: newTenant.trialEndsAt
        };
        
        next();
        return;
      }
    }

    // Normal tenant resolution for production
    const tenant = await extractTenantFromRequest(req);
    
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
  // Skip for admin dashboard or in development mode with localhost
  if (
    req.hostname.startsWith('admin.') || 
    (process.env.NODE_ENV === 'development' && (req.hostname === 'localhost' || req.hostname === '127.0.0.1'))
  ) {
    next();
    return;
  }

  if (!req.tenant) {
    res.status(400).json({ error: 'Tenant context required' });
    return;
  }
  next();
};

// Middleware to check feature access
export const checkFeatureAccess = (featureName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // In development mode with localhost, allow all features
    if (process.env.NODE_ENV === 'development' && (req.hostname === 'localhost' || req.hostname === '127.0.0.1')) {
      next();
      return;
    }
    
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