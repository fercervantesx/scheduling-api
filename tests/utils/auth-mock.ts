import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Mock private key for testing
const MOCK_PRIVATE_KEY = 'test-private-key';

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  nickname: string;
  picture: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login: string;
  logins_count: number;
  permissions: string[];
  [key: string]: any;  // Allow additional claims
}

export const mockJwt = (role: string): string => {
  const payload: JwtPayload = {
    sub: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    nickname: 'testuser',
    picture: 'https://example.com/avatar.jpg',
    email_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
    logins_count: 1,
    permissions: [role],
  };

  return jwt.sign(payload, MOCK_PRIVATE_KEY);
};

// Mock express-jwt middleware
jest.mock('express-jwt', () => ({
  expressjwt: () => (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    try {
      req.user = jwt.verify(token, MOCK_PRIVATE_KEY) as JwtPayload;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
  },
}));

// Mock jwks-rsa
jest.mock('jwks-rsa', () => ({
  expressJwtSecret: () => MOCK_PRIVATE_KEY,
}));

// Mock auth middleware
jest.mock('../../src/middleware/auth', () => {
  const originalModule = jest.requireActual('../../src/middleware/auth');
  return {
    ...originalModule,
    checkJwt: (req: Request, res: Response, next: NextFunction) => {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }
      try {
        req.user = jwt.verify(token, MOCK_PRIVATE_KEY) as JwtPayload;
        next();
      } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
      }
    },
  };
}); 