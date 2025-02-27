import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../common/services/supabase.service';
import { Tenant } from '../interfaces/tenant.interface';
import { Request } from 'express';

@Injectable()
export class TenantService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findById(id: string): Promise<Tenant | null> {
    const { data, error } = await this.supabaseService.supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToTenant(data);
  }

  async findBySubdomain(subdomain: string): Promise<Tenant | null> {
    const { data, error } = await this.supabaseService.supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', subdomain)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToTenant(data);
  }

  async findByCustomDomain(domain: string): Promise<Tenant | null> {
    const { data, error } = await this.supabaseService.supabase
      .from('tenants')
      .select('*')
      .eq('custom_domain', domain)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToTenant(data);
  }

  async extractTenantFromRequest(req: Request): Promise<Tenant | null> {
    try {
      // First check for query parameter tenant_id (highest priority)
      const queryTenantId = req.query.tenant_id as string;
      
      if (queryTenantId) {
        // Try to find tenant by ID first if it looks like a UUID
        if (queryTenantId.includes('-')) {
          const tenant = await this.findById(queryTenantId);
          if (tenant) {
            return tenant;
          }
        }
        
        // If not found by ID or not a UUID format, try by subdomain
        const tenant = await this.findBySubdomain(queryTenantId);
        if (tenant) {
          return tenant;
        }
      }
      
      // Next check for X-Tenant-ID header for mobile app support
      const tenantId = req.headers['x-tenant-id'] as string;
      if (tenantId) {
        // First check if the header contains a UUID
        if (tenantId.includes('-')) {
          const tenant = await this.findById(tenantId);
          if (tenant) {
            return tenant;
          }
        }
        
        // Then try to find by subdomain
        const tenant = await this.findBySubdomain(tenantId);
        if (tenant) {
          return tenant;
        }
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
      if (subdomain) {
        // Try to find by subdomain first
        const tenant = await this.findBySubdomain(subdomain);
        if (tenant) {
          return tenant;
        }
      }
      
      // If not found by subdomain, try custom domain
      return await this.findByCustomDomain(hostname);
    } catch (error) {
      console.error('Error extracting tenant:', error);
      return null;
    }
  }

  async createDefaultTenant(): Promise<Tenant | null> {
    try {
      const { data, error } = await this.supabaseService.supabase
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
      
      if (error || !data) {
        return null;
      }
      
      return this.mapToTenant(data);
    } catch (error) {
      console.error('Error creating default tenant:', error);
      return null;
    }
  }

  async findFirstActiveTenant(): Promise<Tenant | null> {
    const { data, error } = await this.supabaseService.supabase
      .from('tenants')
      .select('*')
      .eq('status', 'ACTIVE')
      .limit(1)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return this.mapToTenant(data);
  }

  private mapToTenant(data: any): Tenant {
    return {
      id: data.id,
      name: data.name,
      email: data.email || undefined,
      subdomain: data.subdomain,
      customDomain: data.custom_domain,
      status: data.status,
      plan: data.plan,
      settings: data.settings || {},
      branding: data.branding || {},
      features: data.features || {},
      trialEndsAt: data.trial_ends_at ? new Date(data.trial_ends_at) : null
    };
  }
}