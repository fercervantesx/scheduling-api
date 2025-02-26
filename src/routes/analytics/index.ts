import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { checkJwt, decodeUserInfo } from '../../middleware/auth';
import { checkFeatureAccess } from '../../middleware/tenant';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, formatISO } from 'date-fns';

const router = Router();

// Analytics dashboard data
router.get('/dashboard', [
  checkJwt, 
  decodeUserInfo,
  checkFeatureAccess('analytics')
], async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const tenantId = req.tenant.id;
    const now = new Date();
    const { period = 'week' } = req.query;

    let startDate: Date;
    switch (period) {
      case 'day':
        startDate = startOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 }); // Start on Monday
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        break;
      case 'all':
        // Get earliest appointment date or default to 1 year ago
        const earliestAppointment = await prisma.appointment.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true }
        });
        
        startDate = earliestAppointment?.createdAt || new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = startOfWeek(now, { weekStartsOn: 1 });
    }

    // Format date as ISO string for consistent comparison
    const isoStartDate = formatISO(startDate);
    const isoEndDate = formatISO(endOfDay(now));

    // Get appointments by status
    const appointmentsByStatus = await prisma.appointment.groupBy({
      by: ['status'],
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      _count: {
        id: true,
      },
    });

    // Calculate total revenue
    const revenueData = await prisma.appointment.aggregate({
      where: {
        tenantId,
        status: 'FULFILLED',
        paymentStatus: 'PAID',
        fulfillmentDate: {
          gte: startDate,
          lte: now,
        },
      },
      _sum: {
        paymentAmount: true,
      },
    });

    // Get appointments by day for the chart
    const appointmentsByDay = await prisma.$queryRaw`
      SELECT 
        DATE(startTime) as date,
        COUNT(*) as count,
        status
      FROM "Appointment"
      WHERE 
        "tenantId" = ${tenantId}
        AND startTime >= ${isoStartDate}::timestamp
        AND startTime <= ${isoEndDate}::timestamp
      GROUP BY DATE(startTime), status
      ORDER BY date ASC
    `;

    // Get most popular services
    const popularServices = await prisma.appointment.groupBy({
      by: ['serviceId'],
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    // Get service details for the popular services
    const serviceIds = popularServices.map(item => item.serviceId);
    const services = await prisma.service.findMany({
      where: {
        id: {
          in: serviceIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Map service names to the popular services
    const popularServicesWithNames = popularServices.map(item => {
      const service = services.find(s => s.id === item.serviceId);
      return {
        serviceId: item.serviceId,
        serviceName: service?.name || 'Unknown Service',
        count: item._count.id,
      };
    });

    // Get busiest employees
    const busiestEmployees = await prisma.appointment.groupBy({
      by: ['employeeId'],
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    // Get employee details
    const employeeIds = busiestEmployees.map(item => item.employeeId);
    const employees = await prisma.employee.findMany({
      where: {
        id: {
          in: employeeIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Map employee names to the busiest employees
    const busiestEmployeesWithNames = busiestEmployees.map(item => {
      const employee = employees.find(e => e.id === item.employeeId);
      return {
        employeeId: item.employeeId,
        employeeName: employee?.name || 'Unknown Employee',
        count: item._count.id,
      };
    });

    // Compile the dashboard data
    const dashboardData = {
      appointmentCounts: {
        total: appointmentsByStatus.reduce((sum, item) => sum + item._count.id, 0),
        byStatus: appointmentsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
      revenue: {
        total: revenueData._sum.paymentAmount || 0,
      },
      chartData: appointmentsByDay,
      popularServices: popularServicesWithNames,
      busiestEmployees: busiestEmployeesWithNames,
      period,
      dateRange: {
        start: startDate,
        end: now,
      },
    };

    return res.json(dashboardData);
  } catch (error) {
    console.error('Error generating analytics dashboard:', error);
    return res.status(500).json({ error: 'Failed to generate analytics dashboard' });
  }
});

// Payment analytics
router.get('/payments', [
  checkJwt, 
  decodeUserInfo,
  checkFeatureAccess('analytics')
], async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const tenantId = req.tenant.id;
    const now = new Date();
    const { period = 'month' } = req.query;

    let startDate: Date;
    switch (period) {
      case 'day':
        startDate = startOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        break;
      case 'all':
        const earliestAppointment = await prisma.appointment.findFirst({
          where: { 
            tenantId,
            paymentAmount: { not: null }
          },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true }
        });
        
        startDate = earliestAppointment?.createdAt || new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = startOfMonth(now);
    }

    // Payment stats by status
    const paymentsByStatus = await prisma.appointment.groupBy({
      by: ['paymentStatus'],
      where: {
        tenantId,
        paymentStatus: { not: null },
        fulfillmentDate: {
          gte: startDate,
          lte: now,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        paymentAmount: true,
      },
    });

    // Format date as ISO string for consistent comparison
    const isoStartDate = formatISO(startDate);
    const isoEndDate = formatISO(endOfDay(now));

    // Payments by day for the chart
    const paymentsByDay = await prisma.$queryRaw`
      SELECT 
        DATE(fulfillmentDate) as date,
        SUM("paymentAmount") as amount,
        COUNT(*) as count,
        "paymentStatus"
      FROM "Appointment"
      WHERE 
        "tenantId" = ${tenantId}
        AND "paymentAmount" IS NOT NULL
        AND fulfillmentDate >= ${isoStartDate}::timestamp
        AND fulfillmentDate <= ${isoEndDate}::timestamp
      GROUP BY DATE(fulfillmentDate), "paymentStatus"
      ORDER BY date ASC
    `;

    // Payment stats by service
    const paymentsByService = await prisma.appointment.groupBy({
      by: ['serviceId'],
      where: {
        tenantId,
        paymentStatus: 'PAID',
        fulfillmentDate: {
          gte: startDate,
          lte: now,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        paymentAmount: true,
      },
      orderBy: {
        _sum: {
          paymentAmount: 'desc',
        },
      },
      take: 5,
    });

    // Get service details
    const serviceIds = paymentsByService.map(item => item.serviceId);
    const services = await prisma.service.findMany({
      where: {
        id: {
          in: serviceIds,
        },
      },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    // Map service names to the payment data
    const paymentsByServiceWithNames = paymentsByService.map(item => {
      const service = services.find(s => s.id === item.serviceId);
      return {
        serviceId: item.serviceId,
        serviceName: service?.name || 'Unknown Service',
        servicePrice: service?.price || 0,
        count: item._count.id,
        totalAmount: item._sum.paymentAmount || 0,
      };
    });

    const paymentData = {
      paymentStats: {
        total: paymentsByStatus.reduce((sum, item) => sum + (item._sum.paymentAmount || 0), 0),
        byStatus: paymentsByStatus.reduce((acc, item) => {
          acc[item.paymentStatus || 'UNKNOWN'] = {
            count: item._count.id,
            amount: item._sum.paymentAmount || 0,
          };
          return acc;
        }, {} as Record<string, { count: number, amount: number }>),
      },
      chartData: paymentsByDay,
      serviceRevenue: paymentsByServiceWithNames,
      period,
      dateRange: {
        start: startDate,
        end: now,
      },
    };

    return res.json(paymentData);
  } catch (error) {
    console.error('Error generating payment analytics:', error);
    return res.status(500).json({ error: 'Failed to generate payment analytics' });
  }
});

// Customer analytics
router.get('/customers', [
  checkJwt, 
  decodeUserInfo,
  checkFeatureAccess('analytics')
], async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const tenantId = req.tenant.id;
    const now = new Date();
    const { period = 'all' } = req.query;

    let startDate: Date;
    switch (period) {
      case 'day':
        startDate = startOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        break;
      case 'all':
      default:
        const earliestAppointment = await prisma.appointment.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true }
        });
        
        startDate = earliestAppointment?.createdAt || new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    }

    // Get unique customer count
    const uniqueCustomers = await prisma.appointment.groupBy({
      by: ['userId'],
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      _count: {
        id: true,
      },
    });

    // Get top customers by appointment count
    const topCustomersByCount = await prisma.appointment.groupBy({
      by: ['userId', 'bookedByName', 'bookedBy'],
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Get top customers by revenue
    const topCustomersByRevenue = await prisma.appointment.groupBy({
      by: ['userId', 'bookedByName', 'bookedBy'],
      where: {
        tenantId,
        paymentStatus: 'PAID',
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      _sum: {
        paymentAmount: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          paymentAmount: 'desc',
        },
      },
      take: 10,
    });

    // Get customer retention metrics - how many have more than one appointment
    const customersWithMultipleAppointments = uniqueCustomers.filter(c => c._count.id > 1);
    
    const customerData = {
      uniqueCustomers: uniqueCustomers.length,
      totalAppointments: uniqueCustomers.reduce((sum, c) => sum + c._count.id, 0),
      retention: {
        repeatCustomers: customersWithMultipleAppointments.length,
        repeatRate: uniqueCustomers.length > 0 
          ? (customersWithMultipleAppointments.length / uniqueCustomers.length) * 100 
          : 0,
      },
      topCustomersByCount: topCustomersByCount.map(c => ({
        userId: c.userId,
        name: c.bookedByName,
        email: c.bookedBy,
        appointmentCount: c._count.id,
      })),
      topCustomersByRevenue: topCustomersByRevenue.map(c => ({
        userId: c.userId,
        name: c.bookedByName,
        email: c.bookedBy,
        appointmentCount: c._count.id,
        totalSpend: c._sum.paymentAmount || 0,
      })),
      period,
      dateRange: {
        start: startDate,
        end: now,
      },
    };

    return res.json(customerData);
  } catch (error) {
    console.error('Error generating customer analytics:', error);
    return res.status(500).json({ error: 'Failed to generate customer analytics' });
  }
});

export default router;