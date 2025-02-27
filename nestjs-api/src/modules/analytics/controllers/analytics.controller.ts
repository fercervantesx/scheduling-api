import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AnalyticsService, Period } from '../services/analytics.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('Analytics')
@Controller('api/analytics')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard analytics data' })
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month', 'year', 'all'], required: false, description: 'Time period for analytics' })
  async getDashboardAnalytics(
    @Req() req: Request,
    @Query('period') period: Period = 'month'
  ) {
    // Get tenant ID from request
    const tenantId = req.tenant?.id;
    
    if (!tenantId) {
      throw new Error('Tenant context required');
    }
    
    return this.analyticsService.getDashboardAnalytics(tenantId, period);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Get payment analytics data' })
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month', 'year', 'all'], required: false, description: 'Time period for analytics' })
  async getPaymentAnalytics(
    @Req() req: Request,
    @Query('period') period: Period = 'month'
  ) {
    // Get tenant ID from request
    const tenantId = req.tenant?.id;
    
    if (!tenantId) {
      throw new Error('Tenant context required');
    }
    
    return this.analyticsService.getPaymentAnalytics(tenantId, period);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get customer analytics data' })
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month', 'year', 'all'], required: false, description: 'Time period for analytics' })
  async getCustomerAnalytics(
    @Req() req: Request,
    @Query('period') period: Period = 'month'
  ) {
    // Get tenant ID from request
    const tenantId = req.tenant?.id;
    
    if (!tenantId) {
      throw new Error('Tenant context required');
    }
    
    return this.analyticsService.getCustomerAnalytics(tenantId, period);
  }
}