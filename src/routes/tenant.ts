import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { checkJwt, decodeUserInfo } from '../middleware/auth';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { upload, getUploadedFileUrl } from '../middleware/tenant';

const router = Router();

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
  background: z.union([
    z.string().url(),
    z.string().max(0),  // Empty string
    z.null()
  ]).optional(),
  hero: z.union([
    z.string().url(),
    z.string().max(0),  // Empty string
    z.null()
  ]).optional(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  fontFamily: z.string().optional(),
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

    // Generate the URL for the uploaded file
    const filename = path.basename(req.file.path);
    const logoUrl = getUploadedFileUrl(req, filename);

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

// Background image upload endpoint
router.post('/branding/background', [checkJwt, decodeUserInfo], upload.single('background'), async (req: Request, res: Response) => {
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

    // Generate the URL for the uploaded file
    const filename = path.basename(req.file.path);
    const backgroundUrl = getUploadedFileUrl(req, filename);

    // Get existing branding or create new object
    const existingBranding = req.tenant.branding || {};
    
    // Update the tenant branding with the new background URL
    await prisma.tenant.update({
      where: { id: req.tenant.id },
      data: {
        branding: {
          ...existingBranding,
          background: backgroundUrl
        }
      }
    });

    return res.json({
      message: 'Background image uploaded successfully',
      background: backgroundUrl
    });
  } catch (error) {
    console.error('Error uploading background image:', error);
    return res.status(500).json({ error: 'Failed to upload background image' });
  }
});

// Hero image upload endpoint
router.post('/branding/hero', [checkJwt, decodeUserInfo], upload.single('hero'), async (req: Request, res: Response) => {
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

    // Generate the URL for the uploaded file
    const filename = path.basename(req.file.path);
    const heroUrl = getUploadedFileUrl(req, filename);

    // Get existing branding or create new object
    const existingBranding = req.tenant.branding || {};
    
    // Update the tenant branding with the new hero URL
    await prisma.tenant.update({
      where: { id: req.tenant.id },
      data: {
        branding: {
          ...existingBranding,
          hero: heroUrl
        }
      }
    });

    return res.json({
      message: 'Hero image uploaded successfully',
      hero: heroUrl
    });
  } catch (error) {
    console.error('Error uploading hero image:', error);
    return res.status(500).json({ error: 'Failed to upload hero image' });
  }
});

// Delete branding image endpoint
router.delete('/branding/:imageType', [checkJwt, decodeUserInfo], async (req: Request, res: Response) => {
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

    const { imageType } = req.params;
    
    // Make sure the requested image type is valid
    if (!['logo', 'background', 'hero'].includes(imageType)) {
      return res.status(400).json({ error: 'Invalid image type' });
    }

    // Get existing branding
    const existingBranding = req.tenant.branding || {};
    
    // If the image URL has a filename path, attempt to delete the file from disk
    const imageUrl = existingBranding[imageType as keyof typeof existingBranding] as string;
    
    if (imageUrl && typeof imageUrl === 'string') {
      try {
        // Extract the filename from the URL
        const urlObj = new URL(imageUrl);
        const filename = path.basename(urlObj.pathname);
        
        // Delete the file if it exists
        const filePath = path.join(process.cwd(), 'uploads', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        // If there's an error deleting the file, just log it and continue
        console.error('Error deleting image file:', error);
      }
    }
    
    // Update the tenant branding to remove the image
    await prisma.tenant.update({
      where: { id: req.tenant.id },
      data: {
        branding: {
          ...existingBranding,
          [imageType]: null
        }
      }
    });

    return res.json({
      message: `${imageType} image deleted successfully`
    });
  } catch (error) {
    console.error(`Error deleting ${req.params.imageType} image:`, error);
    return res.status(500).json({ error: `Failed to delete ${req.params.imageType} image` });
  }
});

export default router;