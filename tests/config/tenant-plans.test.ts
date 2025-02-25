import { PLANS } from '../../src/config/tenant-plans';

describe('Tenant Plans Configuration', () => {
  it('should define a FREE plan with correct properties', () => {
    expect(PLANS).toHaveProperty('FREE');
    
    const freePlan = PLANS.FREE;
    expect(freePlan).toHaveProperty('name', 'Free');
    expect(freePlan).toHaveProperty('price');
    expect(freePlan).toHaveProperty('trialDays');
    expect(freePlan).toHaveProperty('quotas');
    expect(freePlan).toHaveProperty('features');
    
    // Check quotas
    expect(freePlan.quotas).toHaveProperty('locations');
    expect(freePlan.quotas).toHaveProperty('employees');
    expect(freePlan.quotas).toHaveProperty('services');
    expect(freePlan.quotas).toHaveProperty('appointmentsPerMonth');
    expect(freePlan.quotas).toHaveProperty('apiRequestsPerDay');
    
    // Check feature flags
    expect(freePlan.features).toHaveProperty('analytics');
    expect(freePlan.features).toHaveProperty('customBranding');
  });
  
  it('should define a BASIC plan with correct properties', () => {
    expect(PLANS).toHaveProperty('BASIC');
    
    const basicPlan = PLANS.BASIC;
    expect(basicPlan).toHaveProperty('name', 'Basic');
    expect(basicPlan).toHaveProperty('price');
    expect(basicPlan).toHaveProperty('trialDays');
    expect(basicPlan).toHaveProperty('quotas');
    expect(basicPlan).toHaveProperty('features');
    
    // Basic plan should have higher quotas than Free
    expect(basicPlan.quotas.locations).toBeGreaterThan(PLANS.FREE.quotas.locations);
    expect(basicPlan.quotas.employees).toBeGreaterThan(PLANS.FREE.quotas.employees);
  });
  
  it('should define a PRO plan with correct properties', () => {
    expect(PLANS).toHaveProperty('PRO');
    
    const proPlan = PLANS.PRO;
    expect(proPlan).toHaveProperty('name', 'Professional');
    expect(proPlan).toHaveProperty('price');
    expect(proPlan).toHaveProperty('trialDays');
    expect(proPlan).toHaveProperty('quotas');
    expect(proPlan).toHaveProperty('features');
    
    // Pro plan should have higher quotas than Basic
    expect(proPlan.quotas.apiRequestsPerDay).toBeGreaterThan(PLANS.BASIC.quotas.apiRequestsPerDay);
    expect(proPlan.quotas.storageGB).toBeGreaterThan(PLANS.BASIC.quotas.storageGB);
    
    // Pro plan should enable features that may be disabled in other plans
    expect(proPlan.features.analytics).toBe(true);
    expect(proPlan.features.multipleLocations).toBe(true);
  });
  
  it('should have consistent plan structure across all plans', () => {
    // Get all plan keys
    const planKeys = Object.keys(PLANS);
    
    // Check that each plan has the same property structure
    const firstPlanProps = Object.keys(PLANS.FREE);
    const firstPlanQuotaProps = Object.keys(PLANS.FREE.quotas);
    const firstPlanFeatureProps = Object.keys(PLANS.FREE.features);
    
    // Every plan should have the same properties
    planKeys.forEach(planKey => {
      const plan = PLANS[planKey as keyof typeof PLANS];
      expect(Object.keys(plan)).toEqual(expect.arrayContaining(firstPlanProps));
      expect(Object.keys(plan.quotas)).toEqual(expect.arrayContaining(firstPlanQuotaProps));
      expect(Object.keys(plan.features)).toEqual(expect.arrayContaining(firstPlanFeatureProps));
    });
  });
  
  it('should have all plans define trialDays as a positive number', () => {
    Object.values(PLANS).forEach(plan => {
      expect(typeof plan.trialDays).toBe('number');
      expect(plan.trialDays).toBeGreaterThan(0);
    });
  });
});