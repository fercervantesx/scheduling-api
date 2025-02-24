import { Request, Response, NextFunction } from 'express';
import { getAuth0ManagementClient } from '../utils/auth0';

// Extend Express Request to include Auth0 payload
declare global {
  namespace Express {
    interface Request {
      auth?: {
        payload: {
          sub: string;
          [key: string]: any;
        };
      };
    }
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  // In development, skip admin check
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: skipping admin check');
    return next();
  }
  
  try {
    if (!req.auth?.payload.sub) {
      res.status(401).json({
        error: 'Unauthorized: No user ID found',
      });
      return;
    }

    const auth0 = await getAuth0ManagementClient();
    const user = await auth0.users.get({ id: req.auth.payload.sub });

    // Check if user has admin role
    const isAdmin = user.data.app_metadata?.role === 'admin';

    if (!isAdmin) {
      res.status(403).json({
        error: 'Forbidden: Admin access required',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
} 