import { Request, Response } from 'express';
import { requireAdmin } from '../../src/middleware/require-admin';
import { getAuth0ManagementClient } from '../../src/utils/auth0';

// Mock Auth0 management client
jest.mock('../../src/utils/auth0', () => ({
  getAuth0ManagementClient: jest.fn(),
}));

// Save original environment
const originalEnv = process.env.NODE_ENV;

describe('Require Admin Middleware', () => {
  // Mock request, response and next function
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: jest.Mock;
  let mockAuth0Client: any;

  beforeEach(() => {
    // Reset mocks before each test
    mockReq = {
      auth: {
        payload: {
          sub: 'auth0|123456789',
        },
      },
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    nextFunction = jest.fn();
    
    // Mock Auth0 management client
    mockAuth0Client = {
      users: {
        get: jest.fn(),
      },
    };
    
    (getAuth0ManagementClient as jest.Mock).mockResolvedValue(mockAuth0Client);
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  describe('In development mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should skip admin check in development mode', async () => {
      await requireAdmin(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(getAuth0ManagementClient).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('In production mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should return 401 if auth payload or user ID is missing', async () => {
      mockReq.auth = undefined;
      
      await requireAdmin(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized: No user ID found',
      });
    });

    it('should allow access if user has admin role', async () => {
      mockAuth0Client.users.get.mockResolvedValue({
        data: {
          app_metadata: {
            role: 'admin',
          },
        },
      });
      
      await requireAdmin(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockAuth0Client.users.get).toHaveBeenCalledWith({ id: 'auth0|123456789' });
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 403 if user does not have admin role', async () => {
      mockAuth0Client.users.get.mockResolvedValue({
        data: {
          app_metadata: {
            role: 'user',
          },
        },
      });
      
      await requireAdmin(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Forbidden: Admin access required',
      });
    });

    it('should return 403 if user has no roles', async () => {
      mockAuth0Client.users.get.mockResolvedValue({
        data: {
          app_metadata: {},
        },
      });
      
      await requireAdmin(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 if Auth0 API call fails', async () => {
      mockAuth0Client.users.get.mockRejectedValue(new Error('Auth0 API error'));
      
      await requireAdmin(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });
  });
});