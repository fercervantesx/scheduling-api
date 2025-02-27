import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { checkJwt, decodeUserInfo } from '../middleware/auth';
import { z } from 'zod';
import { upload, uploadToSupabase, deleteFromSupabase } from '../middleware/tenant';
import { supabase } from '../lib/supabase';

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
  logo: z.string().url().optional().nullable(),
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
    console.error('Error updating tenant branding:', error);
    return res.status(500).json({ error: 'Failed to update tenant branding' });
  }
});

// Logo upload endpoint using Supabase storage
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

    // Upload file to Supabase storage
    const logoUrl = await uploadToSupabase(req, req.file.path);
    
    if (!logoUrl) {
      return res.status(500).json({ error: 'Failed to upload logo to storage' });
    }

    // Get existing branding or create new object
    const existingBranding = req.tenant.branding || {};
    
    // Update the tenant branding with the new logo URL
    const { error } = await supabase
      .from('tenants')
      .update({
        branding: {
          ...existingBranding,
          logo: logoUrl
        }
      })
      .eq('id', req.tenant.id);

    if (error) {
      throw error;
    }

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

    // Upload file to Supabase storage
    const backgroundUrl = await uploadToSupabase(req, req.file.path);
    
    if (!backgroundUrl) {
      return res.status(500).json({ error: 'Failed to upload background image to storage' });
    }

    // Get existing branding or create new object
    const existingBranding = req.tenant.branding || {};
    
    // Update the tenant branding with the new background URL
    const { error } = await supabase
      .from('tenants')
      .update({
        branding: {
          ...existingBranding,
          background: backgroundUrl
        }
      })
      .eq('id', req.tenant.id);

    if (error) {
      throw error;
    }

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

    // Upload file to Supabase storage
    const heroUrl = await uploadToSupabase(req, req.file.path);
    
    if (!heroUrl) {
      return res.status(500).json({ error: 'Failed to upload hero image to storage' });
    }

    // Get existing branding or create new object
    const existingBranding = req.tenant.branding || {};
    
    // Update the tenant branding with the new hero URL
    const { error } = await supabase
      .from('tenants')
      .update({
        branding: {
          ...existingBranding,
          hero: heroUrl
        }
      })
      .eq('id', req.tenant.id);

    if (error) {
      throw error;
    }

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
    
    // If the image URL exists, attempt to delete the file from Supabase storage
    const imageUrl = existingBranding[imageType as keyof typeof existingBranding] as string;
    
    if (imageUrl && typeof imageUrl === 'string') {
      await deleteFromSupabase(req, imageUrl);
    }
    
    // Update the tenant branding to remove the image
    const { error } = await supabase
      .from('tenants')
      .update({
        branding: {
          ...existingBranding,
          [imageType]: null
        }
      })
      .eq('id', req.tenant.id);

    if (error) {
      throw error;
    }

    return res.json({
      message: `${imageType} image deleted successfully`
    });
  } catch (error) {
    console.error(`Error deleting ${req.params.imageType} image:`, error);
    return res.status(500).json({ error: `Failed to delete ${req.params.imageType} image` });
  }
});

export default router;