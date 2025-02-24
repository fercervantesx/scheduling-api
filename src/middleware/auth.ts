import { expressjwt as jwt } from 'express-jwt';
import { expressJwtSecret, GetVerificationKey } from 'jwks-rsa';
import { Request, Response, NextFunction } from 'express';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

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
  [key: string]: any;
}

// Custom interface to extend Express Request with Auth0 user
declare global {
  namespace Express {
    interface Request {
      user?: Auth0User & {
        permissions?: string[];
      };
    }
  }
}

// Function to fetch user info from Auth0
const fetchUserInfo = async (token: string): Promise<Auth0User | null> => {
  try {
    const response = await axios.get(`https://${domain}/userinfo`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user info from Auth0:', error);
    return null;
  }
};

// Helper function to extract and decode token
const extractAndDecodeToken = (authHeader: string | undefined): { token: string; decoded: Auth0User | null } | null => {
  if (!authHeader) {
    console.log('No auth header present');
    return null;
  }
  
  console.log('Raw Authorization header:', authHeader);
  
  if (!authHeader.includes('Bearer ')) {
    console.log('No Bearer scheme in authorization header');
    return null;
  }

  const token = authHeader.split('Bearer ')[1];
  if (!token) {
    console.log('No token found after Bearer scheme');
    return null;
  }

  console.log('Token extraction:', {
    tokenLength: token.length,
    tokenStart: token.substring(0, 20) + '...',
  });
  
  try {
    const decoded = jwtDecode<Auth0User>(token);
    return { token, decoded };
  } catch (error) {
    console.error('Failed to decode token:', error);
    if (error instanceof Error) {
      console.error('Decode error details:', error.message);
    }
    return null;
  }
};

export const checkJwt = jwt({
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
export const decodeUserInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const tokenInfo = extractAndDecodeToken(req.headers.authorization);
  if (tokenInfo) {
    // First try to get user info from Auth0
    const userInfo = await fetchUserInfo(tokenInfo.token);
    if (userInfo) {
      req.user = {
        ...userInfo,
        permissions: tokenInfo.decoded?.permissions || [],
      };
    } else if (tokenInfo.decoded) {
      // Fallback to decoded token if userinfo endpoint fails
      req.user = {
        ...tokenInfo.decoded,
        permissions: tokenInfo.decoded.permissions || [],
      };
    }
  }
  next();
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