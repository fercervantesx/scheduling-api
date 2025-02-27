import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/tenant.service';
import { SupabaseService } from '../../../common/services/supabase.service';
import { ConfigService } from '@nestjs/config';

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

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantService: TenantService,
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const hostname = req.hostname;
      
      // Skip tenant resolution for the admin dashboard
      if (hostname.startsWith('admin.')) {
        next();
        return;
      }
      
      // Extract tenant from request (query, header, hostname)
      const tenant = await this.tenantService.extractTenantFromRequest(req);
      
      if (!tenant) {
        // DEVELOPMENT MODE: For plain localhost without subdomain, use default
        const isDevMode = this.configService.get<string>('environment') === 'development';
        const parts = hostname.split('.');
        const isPlainLocalhost = (hostname === 'localhost' || hostname === '127.0.0.1') && parts.length === 1;
        
        if (isDevMode && isPlainLocalhost) {
          // Get the first active tenant for development
          let defaultTenant = await this.tenantService.findFirstActiveTenant();
          
          if (!defaultTenant) {
            // Create a default tenant for development
            defaultTenant = await this.tenantService.createDefaultTenant();
          }
          
          if (defaultTenant) {
            req.tenant = defaultTenant;
            
            // Set tenant context for RLS
            await this.supabaseService.setTenantContext(defaultTenant.id);
            
            next();
            return;
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
      if (tenant.status === 'TRIAL' && tenant.trialEndsAt && tenant.trialEndsAt < new Date()) {
        res.status(402).json({ 
          error: 'Trial period has expired',
          trialEndDate: tenant.trialEndsAt
        });
        return;
      }
      
      // Attach tenant to request
      req.tenant = tenant;
      
      // Set tenant context for RLS
      await this.supabaseService.setTenantContext(tenant.id);
      
      next();
    } catch (error) {
      console.error('Error resolving tenant:', error);
      res.status(500).json({ error: 'Failed to resolve tenant' });
    }
  }
}