import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { checkJwt, decodeUserInfo } from '../middleware/auth';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // NOTE: In production, use a cloud storage solution like AWS S3 or Google Cloud Storage
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const tenantId = req.tenant?.id || 'unknown';
    cb(null, `tenant-${tenantId}-logo-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 2 }, // 2MB limit
  fileFilter: (_req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed') as any);
    }
  }
});

// Get tenant plan information
router.get('/plan', [checkJwt, decodeUserInfo], async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    // Get tenant features as array
    const featuresObject = req.tenant.features as Record<string, boolean>;
    const features = Object.entries(featuresObject)
      .filter(([_, value]) => value)
      .map(([key]) => {
        // Convert camelCase to readable format
        return key.replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .trim();
      });

    return res.json({
      plan: req.tenant.plan,
      status: req.tenant.status,
      trialEndsAt: req.tenant.trialEndsAt,
      features
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get tenant plan' });
  }
});

// Get tenant features
router.get('/features', [checkJwt, decodeUserInfo], async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    // Get tenant features as array
    const featuresObject = req.tenant.features as Record<string, boolean>;
    const features = Object.entries(featuresObject)
      .filter(([_, value]) => value)
      .map(([key]) => key);

    return res.json({ features });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get tenant features' });
  }
});

// Get tenant branding
router.get('/branding', [checkJwt, decodeUserInfo], async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    // Get tenant features
    const featuresObject = req.tenant.features as Record<string, boolean>;
    const hasCustomBranding = featuresObject.customBranding === true;

    if (!hasCustomBranding) {
      return res.status(403).json({ error: 'Custom branding not available on current plan' });
    }

    return res.json(req.tenant.branding || {});
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get tenant branding' });
  }
});

// Update tenant branding
const brandingSchema = z.object({
  logo: z.union([
    z.string().url(),
    z.string().max(0),  // Empty string
    z.null()
  ]).optional(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
});

router.patch('/branding', [checkJwt, decodeUserInfo], async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    // Get tenant features
    const featuresObject = req.tenant.features as Record<string, boolean>;
    const hasCustomBranding = featuresObject.customBranding === true;

    if (!hasCustomBranding) {
      return res.status(403).json({ error: 'Custom branding not available on current plan' });
    }

    // Validate branding data
    const brandingData = brandingSchema.parse(req.body);

    // Update tenant branding
    await prisma.tenant.update({
      where: { id: req.tenant.id },
      data: {
        branding: brandingData
      }
    });

    return res.json({ message: 'Branding updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid branding data', details: error.errors });
    }
    return res.status(500).json({ error: 'Failed to update tenant branding' });
  }
});

// Logo upload endpoint
router.post('/branding/logo', [checkJwt, decodeUserInfo], upload.single('logo'), async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    // Get tenant features
    const featuresObject = req.tenant.features as Record<string, boolean>;
    const hasCustomBranding = featuresObject.customBranding === true;

    if (!hasCustomBranding) {
      return res.status(403).json({ error: 'Custom branding not available on current plan' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get server base URL
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    
    // Create the public URL for the uploaded file
    const relativePath = `/uploads/${path.basename(req.file.path)}`;
    const logoUrl = `${baseUrl}${relativePath}`;

    // Get existing branding or create new object
    const existingBranding = req.tenant.branding || {};
    
    // Update the tenant branding with the new logo URL
    await prisma.tenant.update({
      where: { id: req.tenant.id },
      data: {
        branding: {
          ...existingBranding,
          logo: logoUrl
        }
      }
    });

    return res.json({
      message: 'Logo uploaded successfully',
      logo: logoUrl
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return res.status(500).json({ error: 'Failed to upload logo' });
  }
});

export default router;