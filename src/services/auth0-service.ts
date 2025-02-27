import { ManagementClient, Organization } from 'auth0';
import { getAuth0ManagementClient } from '../utils/auth0';
import config from '../config';

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

const logger = new Logger('Auth0Service');

export interface Auth0TenantConfig {
  tenantId: string;
  name: string;
  subdomain: string;
  customDomain?: string;
  email?: string;
}

export class Auth0Service {
  private management: ManagementClient | null = null;

  private async getClient(): Promise<ManagementClient> {
    if (!this.management) {
      this.management = await getAuth0ManagementClient();
    }
    return this.management;
  }

  /**
   * Creates an Auth0 organization for a tenant
   */
  async createTenantOrganization(tenantConfig: Auth0TenantConfig): Promise<Organization> {
    try {
      const client = await this.getClient();
      
      // Create organization with tenant info
      const organization = await client.organizations.create({
        name: this.generateOrgName(tenantConfig.tenantId, tenantConfig.subdomain),
        display_name: tenantConfig.name,
        metadata: {
          tenant_id: tenantConfig.tenantId,
          subdomain: tenantConfig.subdomain,
          custom_domain: tenantConfig.customDomain || null
        }
      });
      
      logger.info(`Created Auth0 organization: ${organization.name} for tenant: ${tenantConfig.name}`);
      
      // Create connection between the organization and the default tenant database
      await this.addConnectionToOrganization(organization.id, config.auth0.defaultConnectionId || 'con_default');
      
      // Create branding for the organization if needed
      if (tenantConfig.name) {
        await this.updateOrganizationBranding(organization.id, {
          logo_url: null, // Set default logo or leave null
          colors: {
            primary: '#007bff',  // Default primary color
            background: '#ffffff'  // Default background
          }
        });
      }
      
      return organization;
    } catch (error) {
      logger.error('Failed to create Auth0 organization for tenant', error);
      throw new Error(`Failed to create Auth0 organization: ${error.message}`);
    }
  }
  
  /**
   * Updates branding for an Auth0 organization
   */
  async updateOrganizationBranding(organizationId: string, branding: any): Promise<void> {
    try {
      const client = await this.getClient();
      await client.organizations.updateBranding({ id: organizationId }, branding);
      logger.info(`Updated branding for organization: ${organizationId}`);
    } catch (error) {
      logger.error('Failed to update organization branding', error);
      throw new Error(`Failed to update organization branding: ${error.message}`);
    }
  }
  
  /**
   * Adds a connection to an Auth0 organization
   */
  async addConnectionToOrganization(organizationId: string, connectionId: string): Promise<void> {
    try {
      const client = await this.getClient();
      await client.organizations.addEnabledConnection(
        { id: organizationId },
        {
          connection_id: connectionId,
          assign_membership_on_login: true
        }
      );
      logger.info(`Added connection ${connectionId} to organization ${organizationId}`);
    } catch (error) {
      logger.error('Failed to add connection to organization', error);
      throw new Error(`Failed to add connection to organization: ${error.message}`);
    }
  }
  
  /**
   * Invites a user to an Auth0 organization
   */
  async inviteUserToOrganization(organizationId: string, email: string, role?: string): Promise<void> {
    try {
      const client = await this.getClient();
      
      // Create invitation
      await client.organizationInvitations.create(
        { id: organizationId },
        {
          inviter: {
            name: 'System'
          },
          invitee: {
            email
          },
          roles: role ? [role] : []
        }
      );
      
      logger.info(`Invited user ${email} to organization ${organizationId}`);
    } catch (error) {
      logger.error(`Failed to invite user ${email} to organization`, error);
      throw new Error(`Failed to invite user to organization: ${error.message}`);
    }
  }
  
  /**
   * Creates an Auth0 role for tenant admin
   */
  async createTenantAdminRole(tenantId: string, orgId: string): Promise<string> {
    try {
      const client = await this.getClient();
      
      // Create tenant admin role
      const role = await client.roles.create({
        name: `Tenant Admin - ${tenantId}`,
        description: `Administrator role for tenant ${tenantId}`,
      });
      
      // Assign permissions to the role
      await client.roles.addPermissions(
        { id: role.id }, 
        { permissions: this.getAdminPermissions(tenantId) }
      );
      
      logger.info(`Created tenant admin role for tenant ${tenantId}`);
      return role.id;
    } catch (error) {
      logger.error('Failed to create tenant admin role', error);
      throw new Error(`Failed to create tenant admin role: ${error.message}`);
    }
  }
  
  /**
   * Deletes an Auth0 organization for a tenant
   */
  async deleteTenantOrganization(tenantId: string): Promise<void> {
    try {
      const client = await this.getClient();
      
      // Find organization by tenant ID
      const organizations = await client.organizations.getAll({
        metadata: {
          tenant_id: tenantId
        }
      });
      
      if (organizations && organizations.length > 0) {
        for (const org of organizations) {
          await client.organizations.delete({ id: org.id });
          logger.info(`Deleted Auth0 organization: ${org.id} for tenant: ${tenantId}`);
        }
      }
    } catch (error) {
      logger.error('Failed to delete Auth0 organization', error);
      throw new Error(`Failed to delete Auth0 organization: ${error.message}`);
    }
  }
  
  /**
   * Generates a unique organization name from tenant ID and subdomain
   */
  private generateOrgName(tenantId: string, subdomain: string): string {
    // Create a name that is URL-safe and unique
    const shortId = tenantId.substring(0, 8);
    return `${subdomain}-${shortId}`.toLowerCase();
  }
  
  /**
   * Returns permissions for tenant admin
   */
  private getAdminPermissions(tenantId: string): Array<{ permission_name: string; resource_server_identifier: string }> {
    // Define permissions for tenant admin
    return [
      {
        permission_name: 'read:appointments',
        resource_server_identifier: process.env.AUTH0_AUDIENCE || '',
      },
      {
        permission_name: 'create:appointments',
        resource_server_identifier: process.env.AUTH0_AUDIENCE || '',
      },
      {
        permission_name: 'update:appointments',
        resource_server_identifier: process.env.AUTH0_AUDIENCE || '',
      },
      {
        permission_name: 'delete:appointments',
        resource_server_identifier: process.env.AUTH0_AUDIENCE || '',
      },
      {
        permission_name: 'read:employees',
        resource_server_identifier: process.env.AUTH0_AUDIENCE || '',
      },
      {
        permission_name: 'create:employees',
        resource_server_identifier: process.env.AUTH0_AUDIENCE || '',
      },
      {
        permission_name: 'update:employees',
        resource_server_identifier: process.env.AUTH0_AUDIENCE || '',
      },
      {
        permission_name: 'delete:employees',
        resource_server_identifier: process.env.AUTH0_AUDIENCE || '',
      }
    ];
  }
}

// Export a singleton instance
export const auth0Service = new Auth0Service();