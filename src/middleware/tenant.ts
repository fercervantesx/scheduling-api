import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { supabase, extractTenantFromRequest, setTenantContext, uploadTenantFile, deleteTenantFile } from '../lib/supabase';

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

// Temporary uploads directory for multer - will be replaced by Supabase Storage
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads with temporary disk storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const tenantId = req.tenant?.id || 'unknown';
    cb(null, `tenant-${tenantId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Create multer upload middleware that can be used throughout the application
export const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed') as any);
    }
  }
});

// Helper function to upload a file to Supabase storage from the temporary storage
export const uploadToSupabase = async (req: Request, filePath: string): Promise<string | null> => {
  try {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    // Read the file from temporary storage
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const contentType = fileName.endsWith('.png') ? 'image/png' : 
                         fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? 'image/jpeg' : 
                         fileName.endsWith('.gif') ? 'image/gif' : 'application/octet-stream';
    
    // Upload to Supabase storage
    const publicUrl = await uploadTenantFile(req.tenant.id, fileBuffer, fileName, contentType);
    
    // Delete the temporary file
    fs.unlinkSync(filePath);
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    return null;
  }
};

// Helper function to delete a file from Supabase storage
export const deleteFromSupabase = async (req: Request, fileUrl: string): Promise<boolean> => {
  try {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    const urlObj = new URL(fileUrl);
    const filePath = urlObj.pathname.split('/').pop() || '';
    
    return await deleteTenantFile(req.tenant.id, filePath);
  } catch (error) {
    console.error('Error deleting from Supabase:', error);
    return false;
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
    
    // Extract tenant from request (query, header, hostname)
    const tenant = await extractTenantFromRequest(req);
    
    if (!tenant) {
      // DEVELOPMENT MODE: For plain localhost without subdomain, use default
      const parts = hostname.split('.');
      const isPlainLocalhost = (hostname === 'localhost' || hostname === '127.0.0.1') && parts.length === 1;
      
      if (process.env.NODE_ENV === 'development' && isPlainLocalhost) {
        // Get the first active tenant for development
        const { data: defaultTenant, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('status', 'ACTIVE')
          .limit(1)
          .single();
        
        if (!error && defaultTenant) {
          req.tenant = {
            id: defaultTenant.id,
            name: defaultTenant.name,
            email: defaultTenant.email || undefined,
            subdomain: defaultTenant.subdomain,
            customDomain: defaultTenant.custom_domain,
            status: defaultTenant.status,
            plan: defaultTenant.plan,
            settings: defaultTenant.settings,
            branding: defaultTenant.branding,
            features: defaultTenant.features,
            trialEndsAt: defaultTenant.trial_ends_at ? new Date(defaultTenant.trial_ends_at) : null
          };
          
          // Set tenant context for RLS
          await setTenantContext(defaultTenant.id);
          
          next();
          return;
        } else {
          // Create a default tenant for development
          const { data: newTenant, error } = await supabase
            .from('tenants')
            .insert({
              name: 'Development Tenant',
              subdomain: 'dev',
              status: 'ACTIVE',
              plan: 'PRO',
              features: { locations: true, employees: true }
            })
            .select()
            .single();
          
          if (!error && newTenant) {
            req.tenant = {
              id: newTenant.id,
              name: newTenant.name,
              email: newTenant.email || undefined,
              subdomain: newTenant.subdomain,
              customDomain: newTenant.custom_domain,
              status: newTenant.status,
              plan: newTenant.plan,
              settings: newTenant.settings || {},
              branding: newTenant.branding || {},
              features: newTenant.features || {},
              trialEndsAt: newTenant.trial_ends_at ? new Date(newTenant.trial_ends_at) : null
            };
            
            // Set tenant context for RLS
            await setTenantContext(newTenant.id);
            
            next();
            return;
          }
        }
      }
      
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    
    // Check tenant status
    if (tenant.status !== 'ACTIVE' && tenant.status !== 'TRIAL') {
      res.status(403).json({ 
        error: 'Tenant access denied',
        status: tenant.status
      });
      return;
    }
    
    // Check if trial has expired
    if (tenant.status === 'TRIAL' && tenant.trial_ends_at && new Date(tenant.trial_ends_at) < new Date()) {
      res.status(402).json({ 
        error: 'Trial period has expired',
        trialEndDate: tenant.trial_ends_at
      });
      return;
    }
    
    // Attach tenant to request
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email || undefined,
      subdomain: tenant.subdomain,
      customDomain: tenant.custom_domain,
      status: tenant.status,
      plan: tenant.plan,
      settings: tenant.settings,
      branding: tenant.branding,
      features: tenant.features,
      trialEndsAt: tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null
    };
    
    // Set tenant context for RLS
    await setTenantContext(tenant.id);
    
    next();
  } catch (error) {
    console.error('Error resolving tenant:', error);
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
    
    // Allow access to all features for ADMIN in dev environment
    if (process.env.NODE_ENV === 'development' && 
        req.user && 
        req.user.permissions && 
        Array.isArray(req.user.permissions) && 
        req.user.permissions.includes('admin')) {
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