import { TrialManagementService } from '../../src/services/trial-management';
import { prismaMock } from '../setup';
import { sendEmail } from '../../src/utils/email';
import { addDays, subDays } from 'date-fns';
import { PLANS } from '../../src/config/tenant-plans';

// Mock dependencies
jest.mock('../../src/utils/email');
const sendEmailMock = sendEmail as jest.MockedFunction<typeof sendEmail>;

describe('TrialManagementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processTrials', () => {
    it('should process trial expirations for expired trials', async () => {
      // Mock date to a specific value
      const mockToday = new Date('2025-01-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockToday);
      
      // Create a trial that expired 1 day ago
      const expiredTrialDate = subDays(mockToday, 1);
      const mockTenants = [
        {
          id: 'tenant-1',
          name: 'Expired Tenant',
          email: 'expired@example.com',
          trialEndsAt: expiredTrialDate,
          status: 'TRIAL',
          // Add required Tenant properties
          subdomain: 'expired-tenant',
          customDomain: null,
          plan: 'FREE',
          apiKey: null,
          features: {},
          webhookUrl: null,
          settings: {},
          branding: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock the findMany method to return an array that's iterable
      prismaMock.tenant.findMany.mockResolvedValue(mockTenants);
      
      await TrialManagementService.processTrials();
      
      // Check that tenant was updated
      expect(prismaMock.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: { status: 'EXPIRED' }
      });
      
      // Check that email was sent
      expect(sendEmailMock).toHaveBeenCalledWith({
        to: 'expired@example.com',
        subject: 'Trial Period Expired',
        template: 'trial-expired',
        data: {
          tenantName: 'Expired Tenant',
          upgradeUrl: 'https://app.example.com/upgrade?tenant=tenant-1'
        }
      });
    });

    it('should send reminder emails for trials ending soon', async () => {
      // Mock date to a specific value
      const mockToday = new Date('2025-01-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockToday);
      
      // Create a trial that will expire in 7 days (matching one of the reminder days)
      const trialEndDate = addDays(mockToday, 7);
      const mockTenants = [
        {
          id: 'tenant-2',
          name: 'Active Tenant',
          email: 'active@example.com',
          trialEndsAt: trialEndDate,
          status: 'TRIAL',
          // Add required Tenant properties
          subdomain: 'active-tenant',
          customDomain: null,
          plan: 'FREE',
          apiKey: null,
          features: {},
          webhookUrl: null,
          settings: {},
          branding: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      prismaMock.tenant.findMany.mockResolvedValue(mockTenants);
      
      await TrialManagementService.processTrials();
      
      // Check that tenant was NOT updated
      expect(prismaMock.tenant.update).not.toHaveBeenCalled();
      
      // Check that reminder email was sent
      expect(sendEmailMock).toHaveBeenCalledWith({
        to: 'active@example.com',
        subject: 'Your trial ends in 7 days',
        template: 'trial-reminder',
        data: {
          tenantName: 'Active Tenant',
          daysLeft: 7,
          trialEndDate: trialEndDate.toLocaleDateString(),
          upgradeUrl: 'https://app.example.com/upgrade?tenant=tenant-2'
        }
      });
    });

    it('should not send reminders for trials not matching reminder days', async () => {
      // Mock date to a specific value
      const mockToday = new Date('2025-01-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockToday);
      
      // Create a trial that will expire in 5 days (not matching any reminder days)
      const trialEndDate = addDays(mockToday, 5);
      const mockTenants = [
        {
          id: 'tenant-3',
          name: 'No Reminder Tenant',
          email: 'noreminder@example.com',
          trialEndsAt: trialEndDate,
          status: 'TRIAL',
          // Add required Tenant properties
          subdomain: 'no-reminder-tenant',
          customDomain: null,
          plan: 'FREE',
          apiKey: null,
          features: {},
          settings: {},
          branding: {},
          webhookUrl: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      prismaMock.tenant.findMany.mockResolvedValue(mockTenants);
      
      await TrialManagementService.processTrials();
      
      // Check that tenant was NOT updated
      expect(prismaMock.tenant.update).not.toHaveBeenCalled();
      
      // Check that NO email was sent
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it('should handle tenants without an email address', async () => {
      // Mock date to a specific value
      const mockToday = new Date('2025-01-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockToday);
      
      // Create a trial that expired 1 day ago but has no email
      const expiredTrialDate = subDays(mockToday, 1);
      const mockTenants = [
        {
          id: 'tenant-4',
          name: 'No Email Tenant',
          email: null,
          trialEndsAt: expiredTrialDate,
          status: 'TRIAL',
          // Add required Tenant properties
          subdomain: 'no-email-tenant',
          customDomain: null,
          plan: 'FREE',
          apiKey: null,
          features: {},
          settings: {},
          branding: {},
          webhookUrl: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      prismaMock.tenant.findMany.mockResolvedValue(mockTenants);
      
      await TrialManagementService.processTrials();
      
      // Check that tenant was updated
      expect(prismaMock.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-4' },
        data: { status: 'EXPIRED' }
      });
      
      // Check that NO email was sent
      expect(sendEmailMock).not.toHaveBeenCalled();
    });
  });

  describe('startTrial', () => {
    it('should start a new trial with default FREE plan', async () => {
      const tenantId = 'new-tenant';
      const mockToday = new Date('2025-01-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockToday);
      
      const expectedTrialEnd = addDays(mockToday, PLANS.FREE.trialDays);
      
      // Mock both update and findUnique
      prismaMock.tenant.update.mockResolvedValue({
        id: tenantId,
        name: 'New Tenant',
        email: 'new@example.com',
        trialEndsAt: expectedTrialEnd,
        status: 'TRIAL',
        plan: 'FREE',
        features: PLANS.FREE.features,
        // Add required Tenant properties
        subdomain: 'new-tenant',
        customDomain: null,
        apiKey: null,
        webhookUrl: null,
        settings: {},
        branding: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      prismaMock.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        name: 'New Tenant',
        email: 'new@example.com',
        trialEndsAt: expectedTrialEnd,
        status: 'TRIAL',
        plan: 'FREE',
        features: PLANS.FREE.features,
        // Add required Tenant properties
        subdomain: 'new-tenant',
        customDomain: null,
        apiKey: null,
        webhookUrl: null,
        settings: {},
        branding: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await TrialManagementService.startTrial(tenantId);
      
      // Check that tenant was updated with correct trial data
      expect(prismaMock.tenant.update).toHaveBeenCalledWith({
        where: { id: tenantId },
        data: {
          status: 'TRIAL',
          plan: 'FREE',
          trialEndsAt: expectedTrialEnd,
          features: PLANS.FREE.features
        }
      });
      
      // Check that welcome email was sent
      expect(sendEmailMock).toHaveBeenCalledWith({
        to: 'new@example.com',
        subject: 'Welcome to Your Trial',
        template: 'trial-welcome',
        data: {
          tenantName: 'New Tenant',
          trialEndDate: expectedTrialEnd.toLocaleDateString(),
          trialDays: PLANS.FREE.trialDays,
          planName: PLANS.FREE.name
        }
      });
    });

    it('should start a new trial with specified PRO plan', async () => {
      const tenantId = 'pro-tenant';
      const mockToday = new Date('2025-01-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockToday);
      
      const expectedTrialEnd = addDays(mockToday, PLANS.PRO.trialDays);
      
      // Mock both update and findUnique
      prismaMock.tenant.update.mockResolvedValue({
        id: tenantId,
        name: 'Pro Tenant',
        email: 'pro@example.com',
        trialEndsAt: expectedTrialEnd,
        status: 'TRIAL',
        plan: 'PRO',
        features: PLANS.PRO.features,
        // Add required Tenant properties
        subdomain: 'pro-tenant',
        customDomain: null,
        apiKey: null,
        webhookUrl: null,
        settings: {},
        branding: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      prismaMock.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        name: 'Pro Tenant',
        email: 'pro@example.com',
        trialEndsAt: expectedTrialEnd,
        status: 'TRIAL',
        plan: 'PRO',
        features: PLANS.PRO.features,
        // Add required Tenant properties
        subdomain: 'pro-tenant',
        customDomain: null,
        apiKey: null,
        webhookUrl: null,
        settings: {},
        branding: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await TrialManagementService.startTrial(tenantId, 'PRO');
      
      // Check that tenant was updated with correct trial data
      expect(prismaMock.tenant.update).toHaveBeenCalledWith({
        where: { id: tenantId },
        data: {
          status: 'TRIAL',
          plan: 'PRO',
          trialEndsAt: expectedTrialEnd,
          features: PLANS.PRO.features
        }
      });
      
      // Check that welcome email was sent
      expect(sendEmailMock).toHaveBeenCalledWith({
        to: 'pro@example.com',
        subject: 'Welcome to Your Trial',
        template: 'trial-welcome',
        data: {
          tenantName: 'Pro Tenant',
          trialEndDate: expectedTrialEnd.toLocaleDateString(),
          trialDays: PLANS.PRO.trialDays,
          planName: PLANS.PRO.name
        }
      });
    });
  });

  describe('extendTrial', () => {
    it('should extend a trial by the specified number of days', async () => {
      const tenantId = 'tenant-to-extend';
      const originalEndDate = new Date('2025-01-20');
      const extensionDays = 14;
      const expectedNewEndDate = addDays(originalEndDate, extensionDays);
      
      // Mock findUnique and update
      prismaMock.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        name: 'Extend Trial Tenant',
        email: 'extend@example.com',
        trialEndsAt: originalEndDate,
        status: 'TRIAL',
        plan: 'BASIC',
        // Add required Tenant properties
        subdomain: 'extend-trial-tenant',
        customDomain: null,
        apiKey: null,
        features: {},
        webhookUrl: null,
        settings: {},
        branding: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      prismaMock.tenant.update.mockResolvedValue({
        id: tenantId,
        name: 'Extend Trial Tenant',
        email: 'extend@example.com',
        trialEndsAt: expectedNewEndDate,
        status: 'TRIAL',
        plan: 'BASIC',
        // Add required Tenant properties
        subdomain: 'extend-trial-tenant',
        customDomain: null,
        apiKey: null,
        features: {},
        webhookUrl: null,
        settings: {},
        branding: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await TrialManagementService.extendTrial(tenantId, extensionDays);
      
      // Check that tenant was updated with extended trial date
      expect(prismaMock.tenant.update).toHaveBeenCalledWith({
        where: { id: tenantId },
        data: {
          status: 'TRIAL',
          trialEndsAt: expectedNewEndDate
        }
      });
      
      // Check that extension email was sent
      expect(sendEmailMock).toHaveBeenCalledWith({
        to: 'extend@example.com',
        subject: 'Your Trial Has Been Extended',
        template: 'trial-extended',
        data: {
          tenantName: 'Extend Trial Tenant',
          trialEndDate: expectedNewEndDate.toLocaleDateString(),
          additionalDays: extensionDays
        }
      });
    });

    it('should throw an error if tenant is not found', async () => {
      const tenantId = 'non-existent-tenant';
      
      // Mock tenant not found
      prismaMock.tenant.findUnique.mockResolvedValue(null);
      
      await expect(TrialManagementService.extendTrial(tenantId, 7))
        .rejects
        .toThrow('Tenant not found');
      
      // Check that tenant was NOT updated
      expect(prismaMock.tenant.update).not.toHaveBeenCalled();
      
      // Check that NO email was sent
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it('should handle extending a trial with no previous end date', async () => {
      const tenantId = 'tenant-no-end-date';
      const extensionDays = 30;
      const mockToday = new Date('2025-01-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockToday);
      
      const expectedNewEndDate = addDays(mockToday, extensionDays);
      
      // Mock findUnique and update
      prismaMock.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        name: 'No End Date Tenant',
        email: 'noend@example.com',
        trialEndsAt: null,
        status: 'ACTIVE',
        plan: 'BASIC',
        // Add required Tenant properties
        subdomain: 'no-end-date-tenant',
        customDomain: null,
        apiKey: null,
        features: {},
        webhookUrl: null,
        settings: {},
        branding: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      prismaMock.tenant.update.mockResolvedValue({
        id: tenantId,
        name: 'No End Date Tenant',
        email: 'noend@example.com',
        trialEndsAt: expectedNewEndDate,
        status: 'TRIAL',
        plan: 'BASIC',
        // Add required Tenant properties
        subdomain: 'no-end-date-tenant',
        customDomain: null,
        apiKey: null,
        features: {},
        webhookUrl: null,
        settings: {},
        branding: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await TrialManagementService.extendTrial(tenantId, extensionDays);
      
      // Check that tenant was updated with new trial date starting from today
      expect(prismaMock.tenant.update).toHaveBeenCalledWith({
        where: { id: tenantId },
        data: {
          status: 'TRIAL',
          trialEndsAt: expectedNewEndDate
        }
      });
      
      // Check that extension email was sent
      expect(sendEmailMock).toHaveBeenCalledWith({
        to: 'noend@example.com',
        subject: 'Your Trial Has Been Extended',
        template: 'trial-extended',
        data: {
          tenantName: 'No End Date Tenant',
          trialEndDate: expectedNewEndDate.toLocaleDateString(),
          additionalDays: extensionDays
        }
      });
    });
  });
});