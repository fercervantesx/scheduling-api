import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { checkJwt } from '../middleware/auth';

const router = Router();

// List all locations
router.get('/', async (_req: Request, res: Response) => {
  try {
    const locations = await prisma.location.findMany();
    return res.json(locations);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Create a new location (requires authentication)
router.post('/', checkJwt, async (req: Request, res: Response) => {
  const { name, address } = req.body;

  try {
    const location = await prisma.location.create({
      data: {
        name,
        address,
      },
    });
    return res.status(201).json(location);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create location' });
  }
});

// Get a specific location
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        employees: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    return res.json(location);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch location' });
  }
});

export default router; 