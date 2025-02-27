export interface Tenant {
  id: string;
  name: string;
  email?: string;
  subdomain: string;
  customDomain: string | null;
  status: TenantStatus;
  plan: TenantPlan;
  settings: any;
  branding: any;
  features: any;
  trialEndsAt: Date | null;
}

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
export type TenantPlan = 'FREE' | 'BASIC' | 'PRO';