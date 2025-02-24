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

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth?.payload.sub) {
      return res.status(401).json({
        error: 'Unauthorized: No user ID found',
      });
    }

    const auth0 = await getAuth0ManagementClient();
    const user = await auth0.getUser({ id: req.auth.payload.sub });

    // Check if user has admin role
    const isAdmin = user.app_metadata?.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({
        error: 'Forbidden: Admin access required',
      });
    }

    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
} 