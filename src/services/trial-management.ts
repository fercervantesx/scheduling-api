import { prisma } from '../lib/prisma';
import { PLANS } from '../config/tenant-plans';
import { sendEmail } from '../utils/email';
import { addDays, subDays, isAfter } from 'date-fns';

export class TrialManagementService {
  private static REMINDER_DAYS = [7, 3, 1]; // Days before trial ends to send reminders

  /**
   * Process trial expirations and send notifications
   */
  static async processTrials() {
    const today = new Date();

    // Find tenants with active trials
    const trialTenants = await prisma.tenant.findMany({
      where: {
        status: 'TRIAL',
        trialEndsAt: {
          not: null,
        },
      },
    });

    for (const tenant of trialTenants) {
      if (!tenant.trialEndsAt) continue;

      // Check if trial has expired
      if (isAfter(today, tenant.trialEndsAt)) {
        await this.handleTrialExpiration(tenant);
        continue;
      }

      // Send reminders before trial expiration
      await this.sendTrialReminders(tenant);
    }
  }

  /**
   * Handle trial expiration for a tenant
   */
  private static async handleTrialExpiration(tenant: { id: string; name: string; email?: string }) {
    // Update tenant status
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        status: 'EXPIRED',
      },
    });

    // Send expiration notification
    if (tenant.email) {
      await sendEmail({
        to: tenant.email,
        subject: 'Trial Period Expired',
        template: 'trial-expired',
        data: {
          tenantName: tenant.name,
          upgradeUrl: `https://app.example.com/upgrade?tenant=${tenant.id}`,
        },
      });
    }
  }

  /**
   * Send trial reminder emails
   */
  private static async sendTrialReminders(tenant: { id: string; name: string; email?: string; trialEndsAt: Date }) {
    const today = new Date();

    for (const daysLeft of this.REMINDER_DAYS) {
      const reminderDate = subDays(tenant.trialEndsAt, daysLeft);
      
      // Check if we should send a reminder today
      if (
        reminderDate.getDate() === today.getDate() &&
        reminderDate.getMonth() === today.getMonth() &&
        reminderDate.getFullYear() === today.getFullYear() &&
        tenant.email
      ) {
        await sendEmail({
          to: tenant.email,
          subject: `Your trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
          template: 'trial-reminder',
          data: {
            tenantName: tenant.name,
            daysLeft,
            trialEndDate: tenant.trialEndsAt.toLocaleDateString(),
            upgradeUrl: `https://app.example.com/upgrade?tenant=${tenant.id}`,
          },
        });
      }
    }
  }

  /**
   * Start a new trial for a tenant
   */
  static async startTrial(tenantId: string, planId: keyof typeof PLANS = 'FREE') {
    const plan = PLANS[planId];
    const trialEndsAt = addDays(new Date(), plan.trialDays);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'TRIAL',
        plan: planId,
        trialEndsAt,
        features: plan.features,
      },
    });

    // Get tenant details for welcome email
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, email: true },
    });

    if (tenant?.email) {
      await sendEmail({
        to: tenant.email,
        subject: 'Welcome to Your Trial',
        template: 'trial-welcome',
        data: {
          tenantName: tenant.name,
          trialEndDate: trialEndsAt.toLocaleDateString(),
          trialDays: plan.trialDays,
          planName: plan.name,
        },
      });
    }
  }

  /**
   * Extend a tenant's trial period
   */
  static async extendTrial(tenantId: string, days: number) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const newTrialEnd = addDays(tenant.trialEndsAt || new Date(), days);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'TRIAL',
        trialEndsAt: newTrialEnd,
      },
    });

    if (tenant.email) {
      await sendEmail({
        to: tenant.email,
        subject: 'Your Trial Has Been Extended',
        template: 'trial-extended',
        data: {
          tenantName: tenant.name,
          trialEndDate: newTrialEnd.toLocaleDateString(),
          additionalDays: days,
        },
      });
    }
  }
} 