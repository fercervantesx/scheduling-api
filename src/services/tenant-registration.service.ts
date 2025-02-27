import { prisma } from '../lib/prisma';
import { auth0Service, Auth0TenantConfig } from './auth0-service';
import { PLANS, PlanId } from '../config/tenant-plans';
import { Prisma } from '@prisma/client';

class Logger {
  private context: string;
  
  constructor(context: string) {
    this.context = context;
  }
  
  info(message: string, ...data: any[]) {
    console.log(`[${this.context}] [INFO]: ${message}`, ...data);
  }
  
  error(message: string, error?: any) {
    console.error(`[${this.context}] [ERROR]: ${message}`, error || '');
  }
}

const logger = new Logger('TenantRegistration');

export interface TenantRegistrationOptions {
  name: string;
  email?: string;
  subdomain: string;
  customDomain?: string;
  planId?: PlanId;
  adminEmail?: string;
  status?: 'ACTIVE' | 'TRIAL' | 'SUSPENDED';
}

export class TenantRegistrationService {
  /**
   * Registers a new tenant with full setup
   */
  static async registerTenant(options: TenantRegistrationOptions) {
    const {
      name,
      email,
      subdomain,
      customDomain,
      planId = 'FREE',
      adminEmail,
      status = 'TRIAL'
    } = options;
    
    logger.info(`Registering new tenant: ${name} (${subdomain})`);
    
    try {
      // 1. Create tenant record in the database
      const tenant = await this.createTenantRecord({
        name,
        email,
        subdomain,
        customDomain,
        planId,
        status
      });
      
      // 2. Set up Auth0 organization for the tenant
      const auth0OrganizationId = await this.setupAuth0Organization(tenant.id, {
        name,
        email,
        subdomain,
        customDomain
      });
      
      // 3. Update tenant record with Auth0 organization ID
      await this.updateTenantAuth0Details(tenant.id, auth0OrganizationId);
      
      // 4. Create admin user in Auth0 and invite to organization if email provided
      if (adminEmail) {
        await this.inviteAdminUser(tenant.id, auth0OrganizationId, adminEmail);
      }
      
      // 5. Start trial management if status is TRIAL
      if (status === 'TRIAL') {
        // Set trial end date
        const plan = PLANS[planId];
        const trialDays = plan.trialDays || 14;
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            trialEndsAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
          }
        });
      }
      
      logger.info(`Tenant registration complete for ${name} (${tenant.id})`);
      
      return {
        tenant,
        auth0OrganizationId
      };
    } catch (error) {
      logger.error(`Failed to register tenant: ${error.message}`, error);
      // Try to rollback if possible
      throw new Error(`Tenant registration failed: ${error.message}`);
    }
  }
  
  /**
   * Create the tenant record in database
   */
  private static async createTenantRecord({
    name,
    email,
    subdomain,
    customDomain,
    planId,
    status
  }: Omit<TenantRegistrationOptions, 'adminEmail'>) {
    logger.info(`Creating tenant database record for ${subdomain}`);
    
    const plan = PLANS[planId || 'FREE'];
    
    try {
      const tenant = await prisma.tenant.create({
        data: {
          name,
          email,
          subdomain,
          customDomain,
          status,
          plan: planId,
          features: plan.features as Prisma.InputJsonValue
        }
      });
      
      logger.info(`Created tenant record: ${tenant.id}`);
      return tenant;
    } catch (error) {
      logger.error('Failed to create tenant record', error);
      throw new Error(`Failed to create tenant record: ${error.message}`);
    }
  }
  
  /**
   * Set up Auth0 organization for the tenant
   */
  private static async setupAuth0Organization(
    tenantId: string,
    { name, email, subdomain, customDomain }: Omit<TenantRegistrationOptions, 'planId' | 'status' | 'adminEmail'>
  ) {
    logger.info(`Setting up Auth0 organization for tenant ${tenantId}`);
    
    try {
      const auth0Config: Auth0TenantConfig = {
        tenantId,
        name,
        subdomain,
        customDomain,
        email
      };
      
      // Create Auth0 organization
      const organization = await auth0Service.createTenantOrganization(auth0Config);
      
      logger.info(`Created Auth0 organization: ${organization.id} for tenant ${tenantId}`);
      
      return organization.id;
    } catch (error) {
      logger.error(`Failed to set up Auth0 organization for tenant ${tenantId}`, error);
      // Try to delete the tenant record as cleanup
      try {
        await prisma.tenant.delete({ where: { id: tenantId } });
      } catch (deleteError) {
        logger.error(`Failed to delete tenant record during rollback: ${deleteError.message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Update tenant with Auth0 organization ID
   */
  private static async updateTenantAuth0Details(tenantId: string, auth0OrganizationId: string) {
    logger.info(`Updating tenant ${tenantId} with Auth0 organization ID ${auth0OrganizationId}`);
    
    try {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          settings: {
            auth0: {
              organizationId: auth0OrganizationId
            }
          }
        }
      });
      
      logger.info(`Updated tenant ${tenantId} with Auth0 organization ID`);
    } catch (error) {
      logger.error(`Failed to update tenant with Auth0 details: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Invite admin user to the tenant's Auth0 organization
   */
  private static async inviteAdminUser(tenantId: string, auth0OrganizationId: string, adminEmail: string) {
    logger.info(`Inviting admin user ${adminEmail} to tenant ${tenantId}`);
    
    try {
      // Create tenant admin role in Auth0
      const roleId = await auth0Service.createTenantAdminRole(tenantId, auth0OrganizationId);
      
      // Invite user to organization with admin role
      await auth0Service.inviteUserToOrganization(auth0OrganizationId, adminEmail, roleId);
      
      // Create user record in database with tenant association
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: adminEmail.split('@')[0], // Default name from email
          role: 'ADMIN',
          tenantId
        }
      });
      
      logger.info(`Successfully invited admin user ${adminEmail} to tenant ${tenantId}`);
    } catch (error) {
      logger.error(`Failed to invite admin user: ${error.message}`);
      // Don't throw here, as this is not critical to tenant creation
      // Just log the error and continue
    }
  }
  
  /**
   * Deregister a tenant (cleanup)
   */
  static async deregisterTenant(tenantId: string) {
    logger.info(`Deregistering tenant: ${tenantId}`);
    
    try {
      // Get tenant settings to find Auth0 organization ID
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true }
      });
      
      // Delete Auth0 organization if it exists
      const settings = tenant?.settings as any;
      if (settings?.auth0?.organizationId) {
        try {
          await auth0Service.deleteTenantOrganization(tenantId);
        } catch (error) {
          logger.error(`Failed to delete Auth0 organization: ${error.message}`);
          // Continue with deletion even if Auth0 cleanup fails
        }
      }
      
      // Delete tenant record
      await prisma.tenant.delete({
        where: { id: tenantId }
      });
      
      logger.info(`Successfully deregistered tenant: ${tenantId}`);
    } catch (error) {
      logger.error(`Failed to deregister tenant: ${error.message}`);
      throw new Error(`Tenant deregistration failed: ${error.message}`);
    }
  }
}