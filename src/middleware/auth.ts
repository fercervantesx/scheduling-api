import { expressjwt as jwt } from 'express-jwt';
import { expressJwtSecret, GetVerificationKey } from 'jwks-rsa';
import { Request, Response, NextFunction } from 'express';

const domain = process.env.AUTH0_DOMAIN;
const audience = process.env.AUTH0_AUDIENCE;

if (!domain || !audience) {
  throw new Error('Please make sure that AUTH0_DOMAIN and AUTH0_AUDIENCE are set in your .env file');
}

interface Auth0User {
  email?: string;
  name?: string;
  nickname?: string;
  picture?: string;
  sub: string;
  email_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  logins_count?: number;
  permissions?: string[];
  [key: string]: any;
}

// Custom interface to extend Express Request with Auth0 user
declare global {
  namespace Express {
    interface Request {
      user?: Auth0User;
    }
  }
}

// Custom middleware for development mode
const devAuthMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.headers.authorization) {
    return next();
  }
  
  try {
    // Just check if Bearer token exists, don't need to use the value
    req.headers.authorization.split('Bearer ')[1];
    // Set a mock auth object
    (req as any).auth = {
      payload: {
        sub: 'dev-user',
        email: 'dev@example.com',
        name: 'Development User',
        permissions: ['admin']
      }
    };
    next();
  } catch (error) {
    console.error('Error in development auth middleware:', error);
    next();
  }
};

// Use JWT validation in production, but a more lenient approach in development
export const checkJwt = process.env.NODE_ENV === 'development' 
  ? devAuthMiddleware 
  : jwt({
      secret: expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${domain}/.well-known/jwks.json`,
      }) as GetVerificationKey,
      audience: audience,
      issuer: `https://${domain}/`,
      algorithms: ['RS256'],
      getToken: (req) => {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
          console.log('No authorization header present');
          return undefined;
        }

        if (!authHeader.includes('Bearer ')) {
          console.log('No Bearer scheme in authorization header');
          return undefined;
        }

        const token = authHeader.split('Bearer ')[1];
        if (!token) {
          console.log('No token found after Bearer scheme');
          return undefined;
        }
        
        return token;
      }
    });

// Middleware to decode user info
export const decodeUserInfo = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.auth?.payload) {
      next();
      return;
    }

    // Extract user info from JWT payload
    const { sub, email, name, nickname, permissions } = req.auth.payload;

    // Attach user info to request
    req.user = {
      sub,
      email,
      name: name || nickname || email?.split('@')[0],
      permissions: permissions || [],
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check for specific roles
export const checkRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const permissions = req.user?.permissions || [];
    
    if (permissions.includes(requiredRole)) {
      next();
      return;
    }

    res.status(403).json({
      error: 'Forbidden',
      message: `Required role: ${requiredRole}`,
    });
  };
}; 