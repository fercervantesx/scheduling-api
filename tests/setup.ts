import '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Mock Auth0 environment variables
process.env.AUTH0_DOMAIN = 'test-domain.auth0.com';
process.env.AUTH0_AUDIENCE = 'test-audience';

// Mock Prisma
jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

// Mock auth middleware for route handlers
// This creates a default export for auth middleware to use in route tests
jest.mock('../src/middleware/auth', () => ({
  checkJwt: (req: any, res: any, next: any) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Invalid token format' });
    }
    // Add mock user data to the request
    req.user = {
      sub: 'test-user-id',
      permissions: token.includes('admin') ? ['admin'] : ['user'],
    };
    next();
  },
  // Add decodeUserInfo middleware
  decodeUserInfo: (req: any, _res: any, next: any) => {
    if (req.auth?.payload) {
      req.user = {
        sub: req.auth.payload.sub,
        email: req.auth.payload.email,
        name: req.auth.payload.name || req.auth.payload.nickname || req.auth.payload.email?.split('@')[0],
        permissions: req.auth.payload.permissions || []
      };
    }
    next();
  },
  // Add checkRole middleware
  checkRole: (role: string) => (req: any, _res: any, next: any) => {
    if (!req.user || !req.user.permissions || !req.user.permissions.includes(role)) {
      return _res.status(403).json({
        error: 'Forbidden',
        message: `Required role: ${role}`
      });
    }
    next();
  }
}));

// Get the mock prisma instance
export const prismaMock = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>;

// Ensure mocks are cleared before each test
beforeEach(() => {
  mockReset(prismaMock);
});