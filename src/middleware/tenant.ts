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

// Helper function to extract tenant from hostname, headers, or query parameters
const extractTenantFromRequest = async (req: Request): Promise<PrismaTenant | null> => {
  try {
    // First check for query parameter tenant_id (highest priority)
    const queryTenantId = req.query.tenant_id as string;
    
    if (queryTenantId) {
      
      // Try to find tenant by ID first if it looks like a UUID
      if (queryTenantId.includes('-')) {
        const tenantById = await prisma.tenant.findUnique({
          where: { id: queryTenantId }
        });
        
        if (tenantById) {
          return tenantById;
        }
      }
      
      // If not found by ID or not a UUID format, try by subdomain
      const tenantBySubdomain = await prisma.tenant.findFirst({
        where: { subdomain: queryTenantId }
      });
      
      if (tenantBySubdomain) {
        return tenantBySubdomain;
      }
    }
    
    // Next check for X-Tenant-ID header for mobile app support
    const tenantId = req.headers['x-tenant-id'] as string;
    if (tenantId) {
      // First check if the header contains a UUID
      if (tenantId.includes('-')) {
        const tenantById = await prisma.tenant.findUnique({
          where: { id: tenantId }
        });
        if (tenantById) {
          return tenantById;
        }
      }
      
      // Then try to find by subdomain
      const tenant = await prisma.tenant.findFirst({
        where: { subdomain: tenantId }
      });
      
      return tenant;
    }
    
    // Fall back to hostname-based resolution
    const hostname = req.hostname;
    
    // Extract subdomain from the hostname
    let subdomain = null;
    const parts = hostname.split('.');
    
    // Handle the "subdomain.localhost" case for development
    if (parts.length > 1) {
      // Remove any port part from the hostname (localhost:5173 -> localhost)
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].includes(':')) {
          parts[i] = parts[i].split(':')[0];
        }
      }
      
      if (parts[parts.length-1] === 'localhost' || parts[parts.length-1] === '127.0.0.1') {
        // In development with localhost, use the first part as subdomain
        subdomain = parts[0];
      } else if (parts[0] !== 'www' && parts[0] !== 'admin') {
        // Normal domain case
        subdomain = parts[0];
      }
    }
    
    // Handle custom domains and subdomains
    let tenant = null;
    
    if (subdomain) {
      // Try to find by subdomain first
      tenant = await prisma.tenant.findFirst({
        where: { subdomain: subdomain }
      });
    }
    
    // If not found by subdomain, try custom domain
    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
        where: { customDomain: hostname }
      });
    }
    
    return tenant;
  } catch (error) {
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

    // DEVELOPMENT MODE: For plain localhost without subdomain, check query and header first, then use default
    // Skip this fallback if we already found a tenant via query param or header
    const parts = hostname.split('.');
    const wasAlreadyProcessed = req.headers['x-tenant-id'] || req.query.tenant_id;
    
    if (!wasAlreadyProcessed && 
        process.env.NODE_ENV === 'development' && 
        ((hostname === 'localhost' || hostname === '127.0.0.1') && parts.length === 1)) {
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

    // Tenant successfully set for this request

    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve tenant' });
  }
};

// Middleware to enforce tenant isolation in database queries
export const enforceTenantIsolation = (req: Request, res: Response, next: NextFunction): void => {
  // Skip for admin dashboard
  if (req.hostname.startsWith('admin.')) {
    next();
    return;
  }

  // For development mode, only skip tenant isolation when using plain localhost without subdomains
  if (process.env.NODE_ENV === 'development') {
    const parts = req.hostname.split('.');
    // Only skip for plain localhost without subdomain
    if ((req.hostname === 'localhost' || req.hostname === '127.0.0.1') && parts.length === 1) {
      next();
      return;
    }
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
    // In development mode with plain localhost (no subdomain), allow all features
    if (process.env.NODE_ENV === 'development') {
      const parts = req.hostname.split('.');
      // Only skip feature checks for plain localhost without subdomain
      if ((req.hostname === 'localhost' || req.hostname === '127.0.0.1') && parts.length === 1) {
        next();
        return;
      }
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