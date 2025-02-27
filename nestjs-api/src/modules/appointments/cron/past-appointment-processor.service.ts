import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../../../common/services/supabase.service';
import { AppointmentStatus } from '../dto/update-appointment.dto';

@Injectable()
export class PastAppointmentProcessorService {
  private readonly logger = new Logger(PastAppointmentProcessorService.name);

  constructor(private readonly supabase: SupabaseService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processPastAppointments() {
    this.logger.log('Processing past appointments...');
    
    try {
      // Get all tenants
      const { data: tenants, error: tenantError } = await this.supabase.supabase
        .from('tenants')
        .select('id')
        .eq('status', 'active');
      
      if (tenantError) {
        this.logger.error(`Error fetching tenants: ${tenantError.message}`);
        return;
      }
      
      // Process each tenant
      for (const tenant of tenants) {
        await this.processPastAppointmentsForTenant(tenant.id);
      }
      
      this.logger.log('Successfully processed past appointments');
    } catch (error) {
      this.logger.error(`Error processing past appointments: ${error}`);
    }
  }
  
  private async processPastAppointmentsForTenant(tenantId: string) {
    // Current time
    const now = new Date();
    
    // Calculate dates for grace period (1 day)
    const gracePeriodEnd = new Date(now);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() - 1); // 1 day ago
    
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1); // Limit to last month to avoid processing too many
    
    // Get scheduled appointments that are past their grace period
    const { data: pastDueAppointments, error } = await this.supabase.supabase
      .from('appointments')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'SCHEDULED')
      .lt('start_time', gracePeriodEnd.toISOString()) // Older than grace period
      .gte('start_time', monthAgo.toISOString()) // Not older than a month
      .limit(100); // Limit batch size
    
    if (error) {
      this.logger.error(`Error fetching past due appointments for tenant ${tenantId}: ${error.message}`);
      return;
    }
    
    if (pastDueAppointments.length === 0) {
      return;
    }
    
    this.logger.log(`Found ${pastDueAppointments.length} past due appointments to cancel for tenant ${tenantId}`);
    
    // Update appointments in batches to avoid timeout
    const batchSize = 20;
    for (let i = 0; i < pastDueAppointments.length; i += batchSize) {
      const batch = pastDueAppointments.slice(i, i + batchSize);
      const ids = batch.map(app => app.id);
      
      // Mark past due appointments as CANCELLED with appropriate reason
      const { error: updateError } = await this.supabase.supabase
        .from('appointments')
        .update({
          status: AppointmentStatus.CANCELLED,
          cancel_reason: 'Automatically cancelled - no status update was provided',
          canceled_by: 'system',
          updated_at: now.toISOString()
        })
        .in('id', ids)
        .eq('tenant_id', tenantId)
        .eq('status', 'SCHEDULED');
      
      if (updateError) {
        this.logger.error(`Error cancelling past due appointments for tenant ${tenantId}: ${updateError.message}`);
      } else {
        this.logger.log(`Cancelled ${batch.length} past due appointments for tenant ${tenantId}`);
      }
    }
  }
}