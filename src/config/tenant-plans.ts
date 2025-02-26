import { z } from 'zod';

export type PlanId = 'FREE' | 'BASIC' | 'PRO';
export type FeatureKey = 'customBranding' | 'apiAccess' | 'webhooks' | 'multipleLocations' | 'analytics' | 'paymentProcessing';

export const PLANS: Record<PlanId, {
  name: string;
  price: number;
  quotas: {
    locations: number;
    employees: number;
    services: number;
    appointmentsPerMonth: number;
    storageGB: number;
    apiRequestsPerDay: number;
  };
  features: Record<FeatureKey, boolean>;
  trialDays: number;
}> = {
  FREE: {
    name: 'Free',
    price: 0,
    quotas: {
      locations: 1,
      employees: 5,
      services: 10,
      appointmentsPerMonth: 100,
      storageGB: 1,
      apiRequestsPerDay: 0,
    },
    features: {
      customBranding: false,
      apiAccess: false,
      webhooks: false,
      multipleLocations: false,
      analytics: false,
      paymentProcessing: false,
    },
    trialDays: 14,
  },
  BASIC: {
    name: 'Basic',
    price: 29,
    quotas: {
      locations: 3,
      employees: 15,
      services: 25,
      appointmentsPerMonth: 500,
      storageGB: 5,
      apiRequestsPerDay: 1000,
    },
    features: {
      customBranding: true,
      apiAccess: false,
      webhooks: false,
      multipleLocations: true,
      analytics: false,
      paymentProcessing: true,
    },
    trialDays: 14,
  },
  PRO: {
    name: 'Professional',
    price: 99,
    quotas: {
      locations: -1, // unlimited
      employees: -1, // unlimited
      services: -1, // unlimited
      appointmentsPerMonth: -1, // unlimited
      storageGB: 50,
      apiRequestsPerDay: 10000,
    },
    features: {
      customBranding: true,
      apiAccess: true,
      webhooks: true,
      multipleLocations: true,
      analytics: true,
      paymentProcessing: true,
    },
    trialDays: 14,
  },
};

export const quotaSchema = z.object({
  locations: z.number(),
  employees: z.number(),
  services: z.number(),
  appointmentsPerMonth: z.number(),
  storageGB: z.number(),
  apiRequestsPerDay: z.number(),
});

export type QuotaLimits = z.infer<typeof quotaSchema>;

export const featureSchema = z.object({
  customBranding: z.boolean(),
  apiAccess: z.boolean(),
  webhooks: z.boolean(),
  multipleLocations: z.boolean(),
  analytics: z.boolean(),
  paymentProcessing: z.boolean(),
});

export type FeatureFlags = z.infer<typeof featureSchema>;

export const planSchema = z.object({
  name: z.string(),
  price: z.number(),
  quotas: quotaSchema,
  features: featureSchema,
  trialDays: z.number(),
});

export type PlanConfig = z.infer<typeof planSchema>; 