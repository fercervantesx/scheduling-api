import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../common/services/supabase.service';
import { addDays, startOfDay, endOfDay, format, subDays, subMonths, subWeeks, subYears } from 'date-fns';

export type Period = 'day' | 'week' | 'month' | 'year' | 'all';

@Injectable()
export class AnalyticsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getDashboardAnalytics(tenantId: string, period: Period): Promise<any> {
    const { startDate, endDate } = this.getDateRangeForPeriod(period);
    
    // Fetch all appointments for the period
    const { data: appointments, error: appointmentsError } = await this.supabase.supabase
      .from('appointments')
      .select(`
        *,
        service:services(*),
        employee:employees(*),
        location:locations(*)
      `)
      .eq('tenant_id', tenantId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString());
    
    if (appointmentsError) {
      throw new Error(`Failed to fetch appointments: ${appointmentsError.message}`);
    }

    // Calculate appointment counts by status
    const appointmentCounts = this.calculateAppointmentCounts(appointments || []);

    // Calculate total revenue from fulfilled appointments
    const revenue = this.calculateRevenue(appointments || []);

    // Get popular services
    const popularServices = this.getPopularServices(appointments || []);

    // Get busiest employees
    const busiestEmployees = this.getBusiestEmployees(appointments || []);

    // Prepare data for charts - appointments by date and status
    const chartData = this.prepareAppointmentChartData(appointments || [], startDate, endDate);

    return {
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      appointmentCounts,
      revenue,
      popularServices,
      busiestEmployees,
      chartData
    };
  }

  async getPaymentAnalytics(tenantId: string, period: Period): Promise<any> {
    const { startDate, endDate } = this.getDateRangeForPeriod(period);
    
    // Fetch all appointments for the period
    const { data: appointments, error: appointmentsError } = await this.supabase.supabase
      .from('appointments')
      .select(`
        *,
        service:services(*),
        employee:employees(*),
        location:locations(*)
      `)
      .eq('tenant_id', tenantId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString());
    
    if (appointmentsError) {
      throw new Error(`Failed to fetch appointments: ${appointmentsError.message}`);
    }

    // Calculate payment stats
    const paymentStats = this.calculatePaymentStats(appointments || []);

    // Service revenue breakdown
    const serviceRevenue = this.calculateServiceRevenue(appointments || []);

    // Prepare data for charts
    const chartData = this.preparePaymentChartData(appointments || [], startDate, endDate);

    return {
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      paymentStats,
      serviceRevenue,
      chartData
    };
  }

  async getCustomerAnalytics(tenantId: string, period: Period): Promise<any> {
    const { startDate, endDate } = this.getDateRangeForPeriod(period);
    
    // Fetch all appointments for the period
    const { data: appointments, error: appointmentsError } = await this.supabase.supabase
      .from('appointments')
      .select(`
        *,
        service:services(*),
        employee:employees(*),
        location:locations(*)
      `)
      .eq('tenant_id', tenantId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString());
    
    if (appointmentsError) {
      throw new Error(`Failed to fetch appointments: ${appointmentsError.message}`);
    }

    // Process the appointments data to extract customer metrics
    const customerData = this.processCustomerData(appointments || []);

    return {
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      ...customerData
    };
  }

  private getDateRangeForPeriod(period: Period): { startDate: Date; endDate: Date } {
    const endDate = endOfDay(new Date());
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = startOfDay(new Date());
        break;
      case 'week':
        startDate = startOfDay(subDays(endDate, 7));
        break;
      case 'month':
        startDate = startOfDay(subMonths(endDate, 1));
        break;
      case 'year':
        startDate = startOfDay(subYears(endDate, 1));
        break;
      case 'all':
      default:
        startDate = new Date(0); // Epoch time (1970-01-01)
        break;
    }

    return { startDate, endDate };
  }

  private calculateAppointmentCounts(appointments: any[]): any {
    const total = appointments.length;
    
    // Count by status
    const byStatus = appointments.reduce((acc: any, appointment) => {
      const status = appointment.status;
      if (!acc[status]) {
        acc[status] = 0;
      }
      acc[status]++;
      return acc;
    }, {});

    return { total, byStatus };
  }

  private calculateRevenue(appointments: any[]): any {
    // Calculate total revenue from fulfilled appointments
    const total = appointments.reduce((sum, appointment) => {
      if (appointment.status === 'FULFILLED' && appointment.service.price) {
        return sum + Number(appointment.service.price);
      }
      return sum;
    }, 0);

    return { total };
  }

  private getPopularServices(appointments: any[]): any[] {
    // Count appointments by service
    const serviceCountMap = appointments.reduce((acc: Map<string, any>, appointment) => {
      const serviceId = appointment.service_id;
      const serviceName = appointment.service?.name || 'Unknown Service';
      
      if (!acc.has(serviceId)) {
        acc.set(serviceId, { serviceId, serviceName, count: 0 });
      }
      
      acc.get(serviceId).count++;
      return acc;
    }, new Map());

    // Convert to array and sort by count
    return Array.from(serviceCountMap.values())
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5); // Top 5 services
  }

  private getBusiestEmployees(appointments: any[]): any[] {
    // Count appointments by employee
    const employeeCountMap = appointments.reduce((acc: Map<string, any>, appointment) => {
      const employeeId = appointment.employee_id;
      const employeeName = appointment.employee?.name || 'Unknown Employee';
      
      if (!acc.has(employeeId)) {
        acc.set(employeeId, { employeeId, employeeName, count: 0 });
      }
      
      acc.get(employeeId).count++;
      return acc;
    }, new Map());

    // Convert to array and sort by count
    return Array.from(employeeCountMap.values())
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5); // Top 5 employees
  }

  private prepareAppointmentChartData(appointments: any[], startDate: Date, endDate: Date): any[] {
    // Initialize data with dates in the range
    const chartData: any[] = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      // Initialize counts for all statuses
      ['SCHEDULED', 'FULFILLED', 'CANCELLED'].forEach(status => {
        chartData.push({
          date: dateStr,
          status,
          count: 0
        });
      });
      
      // Move to next day
      currentDate = addDays(currentDate, 1);
    }
    
    // Fill in actual appointment counts
    appointments.forEach(appointment => {
      const status = appointment.status;
      const date = format(new Date(appointment.start_time), 'yyyy-MM-dd');
      
      // Find the corresponding entry and increment count
      const entry = chartData.find(item => item.date === date && item.status === status);
      if (entry) {
        entry.count++;
      }
    });
    
    return chartData;
  }

  private calculatePaymentStats(appointments: any[]): any {
    // Total potential revenue
    const total = appointments.reduce((sum, appointment) => {
      if (appointment.service.price) {
        return sum + Number(appointment.service.price);
      }
      return sum;
    }, 0);
    
    // Group by payment status
    const byStatus = appointments.reduce((acc: any, appointment) => {
      // Simplify to PAID or UNPAID for now (can be expanded)
      const paymentStatus = appointment.status === 'FULFILLED' ? 'PAID' : 'UNPAID';
      
      if (!acc[paymentStatus]) {
        acc[paymentStatus] = { count: 0, amount: 0 };
      }
      
      acc[paymentStatus].count++;
      
      if (appointment.service.price) {
        acc[paymentStatus].amount += Number(appointment.service.price);
      }
      
      return acc;
    }, {});
    
    return { total, byStatus };
  }

  private calculateServiceRevenue(appointments: any[]): any[] {
    // Only consider paid/fulfilled appointments
    const fulfilledAppointments = appointments.filter(a => a.status === 'FULFILLED');
    
    // Group by service
    const serviceRevenueMap = fulfilledAppointments.reduce((acc: Map<string, any>, appointment) => {
      const serviceId = appointment.service_id;
      const serviceName = appointment.service?.name || 'Unknown Service';
      const price = appointment.service?.price || 0;
      
      if (!acc.has(serviceId)) {
        acc.set(serviceId, { 
          serviceId, 
          serviceName, 
          count: 0, 
          totalAmount: 0 
        });
      }
      
      const entry = acc.get(serviceId);
      entry.count++;
      entry.totalAmount += Number(price);
      
      return acc;
    }, new Map());
    
    // Convert to array and sort by revenue
    return Array.from(serviceRevenueMap.values())
      .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
      .slice(0, 5); // Top 5 services by revenue
  }

  private preparePaymentChartData(appointments: any[], startDate: Date, endDate: Date): any[] {
    // Initialize data structure with dates
    const chartMap = new Map<string, any>();
    let currentDate = new Date(startDate);
    
    // Prepare all dates in the range
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      chartMap.set(dateStr, {
        date: dateStr,
        PAID_count: 0,
        PAID_amount: 0,
        UNPAID_count: 0,
        UNPAID_amount: 0
      });
      
      // Move to next day
      currentDate = addDays(currentDate, 1);
    }
    
    // Fill with actual data from appointments
    appointments.forEach(appointment => {
      const date = format(new Date(appointment.start_time), 'yyyy-MM-dd');
      const entry = chartMap.get(date);
      
      if (entry) {
        const status = appointment.status === 'FULFILLED' ? 'PAID' : 'UNPAID';
        entry[`${status}_count`]++;
        
        if (appointment.service.price) {
          entry[`${status}_amount`] += Number(appointment.service.price);
        }
      }
    });
    
    // Convert to array
    return Array.from(chartMap.values());
  }

  private processCustomerData(appointments: any[]): any {
    // Count unique customers
    const customerMap = new Map<string, any>();
    
    appointments.forEach(appointment => {
      const userId = appointment.user_id;
      const customerName = appointment.booked_by_name || 'Unknown';
      const customerEmail = appointment.booked_by || 'unknown@example.com';
      
      if (!customerMap.has(userId)) {
        customerMap.set(userId, {
          id: userId,
          name: customerName,
          email: customerEmail,
          appointments: [],
          totalSpend: 0
        });
      }
      
      const customer = customerMap.get(userId);
      customer.appointments.push(appointment);
      
      if (appointment.status === 'FULFILLED' && appointment.service.price) {
        customer.totalSpend += Number(appointment.service.price);
      }
    });
    
    const customers = Array.from(customerMap.values());
    
    // Calculate metrics
    const uniqueCustomers = customers.length;
    const totalAppointments = appointments.length;
    
    // Count repeat customers (more than 1 appointment)
    const repeatCustomers = customers.filter(c => c.appointments.length > 1).length;
    const repeatRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;
    
    // Top customers by number of appointments
    const topCustomersByCount = customers
      .map(c => ({
        name: c.name,
        email: c.email,
        appointmentCount: c.appointments.length
      }))
      .sort((a, b) => b.appointmentCount - a.appointmentCount)
      .slice(0, 10);
    
    // Top customers by total spend
    const topCustomersByRevenue = customers
      .map(c => ({
        name: c.name,
        email: c.email,
        appointmentCount: c.appointments.length,
        totalSpend: c.totalSpend
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 10);
    
    return {
      uniqueCustomers,
      totalAppointments,
      retention: {
        repeatCustomers,
        repeatRate
      },
      topCustomersByCount,
      topCustomersByRevenue
    };
  }
}