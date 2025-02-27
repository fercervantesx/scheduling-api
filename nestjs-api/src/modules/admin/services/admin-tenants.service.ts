import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../../common/services/supabase.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { AdminTenant } from '../entities/admin-tenant.entity';
import { addDays } from 'date-fns';

@Injectable()
export class AdminTenantsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(page = 1, limit = 20): Promise<{ tenants: AdminTenant[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;

    // Get count first
    const { count, error: countError } = await this.supabase.supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to fetch tenant count: ${countError.message}`);
    }

    // Get paginated data
    const { data, error } = await this.supabase.supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch tenants: ${error.message}`);
    }

    // Get usage statistics for each tenant
    const tenantsWithStats = await Promise.all(
      data.map(async (tenant) => {
        const usage = await this.getTenantUsage(tenant.id);
        return this.mapToAdminTenant(tenant, usage);
      })
    );

    return {
      tenants: tenantsWithStats,
      total: count || 0,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<AdminTenant> {
    const { data, error } = await this.supabase.supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    const usage = await this.getTenantUsage(id);
    return this.mapToAdminTenant(data, usage);
  }

  async create(createTenantDto: CreateTenantDto): Promise<AdminTenant> {
    // Check if subdomain is available
    const { data: existingSubdomain, error: subdomainError } = await this.supabase.supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', createTenantDto.subdomain)
      .maybeSingle();

    if (subdomainError) {
      throw new Error(`Failed to check subdomain availability: ${subdomainError.message}`);
    }

    if (existingSubdomain) {
      throw new BadRequestException(`Subdomain "${createTenantDto.subdomain}" is already in use`);
    }

    // Check if custom domain is available (if provided)
    if (createTenantDto.customDomain) {
      const { data: existingDomain, error: domainError } = await this.supabase.supabase
        .from('tenants')
        .select('id')
        .eq('custom_domain', createTenantDto.customDomain)
        .maybeSingle();

      if (domainError) {
        throw new Error(`Failed to check domain availability: ${domainError.message}`);
      }

      if (existingDomain) {
        throw new BadRequestException(`Domain "${createTenantDto.customDomain}" is already in use`);
      }
    }

    // Calculate trial end date if tenant is in trial mode
    let trialEndsAt = null;
    if (createTenantDto.status === 'TRIAL') {
      trialEndsAt = addDays(new Date(), createTenantDto.trialDays || 14);
    }

    // Default features based on plan
    const features: Record<string, boolean> = {};
    
    switch (createTenantDto.plan) {
      case 'PRO':
        features.multipleLocations = true;
        features.advancedAnalytics = true;
        features.apiAccess = true;
        features.customBranding = true;
        features.webhooks = true;
        break;
      case 'BASIC':
        features.multipleLocations = true;
        features.advancedAnalytics = false;
        features.apiAccess = false;
        features.customBranding = false;
        features.webhooks = false;
        break;
      case 'FREE':
      default:
        features.multipleLocations = false;
        features.advancedAnalytics = false;
        features.apiAccess = false;
        features.customBranding = false;
        features.webhooks = false;
        break;
    }

    // Create tenant
    const { data, error } = await this.supabase.supabase
      .from('tenants')
      .insert({
        name: createTenantDto.name,
        email: createTenantDto.email,
        subdomain: createTenantDto.subdomain,
        custom_domain: createTenantDto.customDomain,
        status: createTenantDto.status,
        plan: createTenantDto.plan,
        trial_ends_at: trialEndsAt,
        features,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create tenant: ${error.message}`);
    }

    return this.mapToAdminTenant(data, { appointments: 0, locations: 0, employees: 0, services: 0 });
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<AdminTenant> {
    // Check if tenant exists
    await this.findOne(id);

    // Check if custom domain is available (if provided and changed)
    if (updateTenantDto.customDomain) {
      const { data: existingDomain, error: domainError } = await this.supabase.supabase
        .from('tenants')
        .select('id')
        .eq('custom_domain', updateTenantDto.customDomain)
        .neq('id', id)
        .maybeSingle();

      if (domainError) {
        throw new Error(`Failed to check domain availability: ${domainError.message}`);
      }

      if (existingDomain) {
        throw new BadRequestException(`Domain "${updateTenantDto.customDomain}" is already in use`);
      }
    }

    // Update tenant data
    const updateData: any = {};

    if (updateTenantDto.name !== undefined) updateData.name = updateTenantDto.name;
    if (updateTenantDto.email !== undefined) updateData.email = updateTenantDto.email;
    if (updateTenantDto.customDomain !== undefined) updateData.custom_domain = updateTenantDto.customDomain;
    if (updateTenantDto.status !== undefined) updateData.status = updateTenantDto.status;
    if (updateTenantDto.plan !== undefined) updateData.plan = updateTenantDto.plan;
    if (updateTenantDto.trialEndsAt !== undefined) updateData.trial_ends_at = updateTenantDto.trialEndsAt;
    if (updateTenantDto.settings !== undefined) updateData.settings = updateTenantDto.settings;
    if (updateTenantDto.branding !== undefined) updateData.branding = updateTenantDto.branding;
    if (updateTenantDto.features !== undefined) updateData.features = updateTenantDto.features;

    const { data, error } = await this.supabase.supabase
      .from('tenants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update tenant: ${error.message}`);
    }

    const usage = await this.getTenantUsage(id);
    return this.mapToAdminTenant(data, usage);
  }

  async remove(id: string): Promise<void> {
    // Check if tenant exists
    await this.findOne(id);

    // Check if there are any resources associated with this tenant
    const { count: resourceCount, error: resourceError } = await this.supabase.supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id);

    if (resourceError) {
      throw new Error(`Failed to check tenant resources: ${resourceError.message}`);
    }

    if (resourceCount && resourceCount > 0) {
      throw new BadRequestException('Cannot delete tenant with existing appointments. Please archive instead.');
    }

    // Delete tenant
    const { error } = await this.supabase.supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete tenant: ${error.message}`);
    }
  }

  async getTenantUsage(tenantId: string): Promise<{
    appointments: number;
    locations: number;
    employees: number;
    services: number;
  }> {
    // Count all resources for this tenant
    const [
      appointmentsResult,
      locationsResult,
      employeesResult,
      servicesResult,
    ] = await Promise.all([
      this.supabase.supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      this.supabase.supabase
        .from('locations')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      this.supabase.supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      this.supabase.supabase
        .from('services')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
    ]);

    return {
      appointments: appointmentsResult.count || 0,
      locations: locationsResult.count || 0,
      employees: employeesResult.count || 0,
      services: servicesResult.count || 0,
    };
  }

  private mapToAdminTenant(data: any, usage: any): AdminTenant {
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      subdomain: data.subdomain,
      customDomain: data.custom_domain,
      status: data.status,
      plan: data.plan,
      trialEndsAt: data.trial_ends_at ? new Date(data.trial_ends_at) : undefined,
      usage,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}