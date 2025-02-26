import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { checkJwt, decodeUserInfo } from '../middleware/auth';

const router = Router();

// Main dashboard analytics
router.get('/dashboard', [checkJwt, decodeUserInfo], async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    startDate.setMonth(now.getMonth() - 1);
    
    // Get all appointments within the date range, including those fulfilled in this period
    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        OR: [
          {
            startTime: {
              gte: startDate,
              lte: now,
            },
          },
          {
            status: 'FULFILLED',
            fulfillmentDate: {
              gte: startDate,
              lte: now,
            }
          }
        ]
      },
      include: {
        service: true,
        employee: true,
        location: true,
      },
    });

    // Calculate total revenue (from fulfilled appointments with service prices)
    const revenue = appointments.reduce((total, appointment) => {
      if (appointment.status === 'FULFILLED' && appointment.service.price) {
        return total + appointment.service.price;
      }
      return total;
    }, 0);

    return res.json({ 
      revenue: { total: revenue },
      appointmentCounts: { total: appointments.length }
    });
  } catch (error) {
    console.error('Error generating dashboard analytics:', error);
    return res.status(500).json({ error: 'Failed to generate analytics dashboard' });
  }
});

// Payment analytics 
router.get('/payments', [checkJwt, decodeUserInfo], async (_req: Request, res: Response) => {
  try {
    return res.json({ message: 'Payment analytics endpoint' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate payment analytics' });
  }
});

// Customer analytics
router.get('/customers', [checkJwt, decodeUserInfo], async (_req: Request, res: Response) => {
  try {
    return res.json({ message: 'Customer analytics endpoint' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate customer analytics' });
  }
});

export default router;