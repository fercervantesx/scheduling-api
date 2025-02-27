import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { SupabaseService } from '../../../common/services/supabase.service';

@ApiTags('tenant')
@ApiBearerAuth()
@Controller('api/tenant')
@UseGuards(AuthGuard)
export class TenantController {
  constructor(private readonly supabase: SupabaseService) {}
  @Get('plan')
  @ApiOperation({ summary: 'Get current tenant plan details' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 400, description: 'Tenant context required' })
  getTenantPlan(@Req() req: Request) {
    if (!req.tenant) {
      return {
        error: 'Tenant context required'
      };
    }

    // Extract features from tenant
    const features = [];
    
    if (req.tenant.features) {
      for (const [feature, enabled] of Object.entries(req.tenant.features)) {
        if (enabled) {
          features.push(feature);
        }
      }
    }

    return {
      plan: req.tenant.plan,
      status: req.tenant.status,
      trialEndsAt: req.tenant.trialEndsAt,
      features
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get current tenant info' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 400, description: 'Tenant context required' })
  getTenantInfo(@Req() req: Request) {
    if (!req.tenant) {
      return {
        error: 'Tenant context required'
      };
    }

    return {
      id: req.tenant.id,
      name: req.tenant.name,
      subdomain: req.tenant.subdomain,
      customDomain: req.tenant.customDomain,
      plan: req.tenant.plan,
      status: req.tenant.status,
      branding: req.tenant.branding
    };
  }

  @Get('debug')
  @ApiOperation({ summary: 'Debug tenant resolution' })
  @ApiResponse({ status: 200, description: 'Success' })
  debugTenant(@Req() req: Request) {
    return {
      tenant: req.tenant || null,
      hostname: req.hostname,
      subdomains: req.subdomains,
      headers: {
        'x-tenant-id': req.headers['x-tenant-id'],
        host: req.headers['host']
      }
    };
  }

  @Get('features')
  @ApiOperation({ summary: 'Get tenant features' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 400, description: 'Tenant context required' })
  getTenantFeatures(@Req() req: Request) {
    if (!req.tenant) {
      return {
        error: 'Tenant context required'
      };
    }

    const features = [];
    
    if (req.tenant.features) {
      for (const [feature, enabled] of Object.entries(req.tenant.features)) {
        if (enabled) {
          features.push(feature);
        }
      }
    }

    return { features };
  }
  
  @Get('branding')
  @ApiOperation({ summary: 'Get tenant branding' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 400, description: 'Tenant context required' })
  getTenantBranding(@Req() req: Request) {
    if (!req.tenant) {
      return {
        error: 'Tenant context required'
      };
    }

    return req.tenant.branding || {};
  }
  
  @Patch('branding')
  @ApiOperation({ summary: 'Update tenant branding' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 400, description: 'Invalid branding data' })
  async updateTenantBranding(@Body() brandingData: any, @Req() req: Request) {
    if (!req.tenant) {
      return {
        error: 'Tenant context required'
      };
    }
    
    // Check if tenant has branding feature
    const hasCustomBranding = req.tenant.features?.customBranding === true;
    
    if (!hasCustomBranding) {
      return {
        error: 'Custom branding not available on current plan'
      };
    }
    
    try {
      const { error } = await this.supabase.supabase
        .from('tenants')
        .update({
          branding: brandingData
        })
        .eq('id', req.tenant.id);
      
      if (error) {
        throw error;
      }
      
      return { message: 'Branding updated successfully' };
    } catch (error) {
      return { 
        error: 'Failed to update tenant branding',
        details: error.message
      };
    }
  }
}