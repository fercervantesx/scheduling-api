import { Request, Response } from 'express';
import { resolveTenant, enforceTenantIsolation, checkFeatureAccess } from '../../src/middleware/tenant';
import { prisma } from '../../src/lib/prisma';

// Mock Prisma
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    tenant: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Save original environment
const originalEnv = process.env.NODE_ENV;

describe('Tenant Middleware', () => {
  // Mock request, response and next function
  let mockReq: any; // Using 'any' type to allow property assignment
  let mockRes: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    mockReq = {
      hostname: 'test-tenant.example.com',
      tenant: undefined,
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    nextFunction = jest.fn();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  describe('resolveTenant', () => {
    it('should skip tenant resolution for admin dashboard', async () => {
      mockReq.hostname = 'admin.example.com';
      
      await resolveTenant(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(prisma.tenant.findFirst).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    describe('In development mode', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should use existing default tenant for localhost', async () => {
        mockReq.hostname = 'localhost';
        
        const mockTenant = {
          id: 'tenant-123',
          name: 'Test Tenant',
          email: 'test@example.com',
          subdomain: 'test',
          customDomain: null,
          status: 'ACTIVE',
          plan: 'FREE',
          settings: {},
          branding: {},
          features: {},
          trialEndsAt: null,
        };
        
        (prisma.tenant.findFirst as jest.Mock).mockResolvedValue(mockTenant);
        
        await resolveTenant(mockReq as Request, mockRes as Response, nextFunction);
        
        expect(mockReq.tenant).toBeDefined();
        expect(mockReq.tenant!.id).toBe('tenant-123');
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should create default tenant if none exists for localhost', async () => {
        mockReq.hostname = 'localhost';
        
        (prisma.tenant.findFirst as jest.Mock).mockResolvedValue(null);
        
        const mockCreatedTenant = {
          id: 'new-tenant-123',
          name: 'Development Tenant',
          email: null,
          subdomain: 'dev',
          customDomain: null,
          status: 'ACTIVE',
          plan: 'PRO',
          settings: {},
          branding: {},
          features: { locations: true, employees: true },
          trialEndsAt: null,
        };
        
        (prisma.tenant.create as jest.Mock).mockResolvedValue(mockCreatedTenant);
        
        await resolveTenant(mockReq as Request, mockRes as Response, nextFunction);
        
        expect(prisma.tenant.create).toHaveBeenCalled();
        expect(mockReq.tenant).toBeDefined();
        expect(mockReq.tenant!.id).toBe('new-tenant-123');
        expect(nextFunction).toHaveBeenCalled();
      });
    });

    describe('In production mode', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should find tenant by subdomain', async () => {
        mockReq.hostname = 'test-tenant.example.com';
        
        const mockTenant = {
          id: 'tenant-123',
          name: 'Test Tenant',
          email: 'test@example.com',
          subdomain: 'test-tenant',
          customDomain: null,
          status: 'ACTIVE',
          plan: 'FREE',
          settings: {},
          branding: {},
          features: {},
          trialEndsAt: null,
        };
        
        (prisma.tenant.findFirst as jest.Mock).mockResolvedValue(mockTenant);
        
        await resolveTenant(mockReq as Request, mockRes as Response, nextFunction);
        
        expect(mockReq.tenant).toBeDefined();
        expect(mockReq.tenant!.id).toBe('tenant-123');
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should find tenant by custom domain', async () => {
        mockReq.hostname = 'custom-domain.com';
        
        const mockTenant = {
          id: 'tenant-123',
          name: 'Test Tenant',
          email: 'test@example.com',
          subdomain: 'test-tenant',
          customDomain: 'custom-domain.com',
          status: 'ACTIVE',
          plan: 'FREE',
          settings: {},
          branding: {},
          features: {},
          trialEndsAt: null,
        };
        
        (prisma.tenant.findFirst as jest.Mock).mockResolvedValue(mockTenant);
        
        await resolveTenant(mockReq as Request, mockRes as Response, nextFunction);
        
        expect(mockReq.tenant!.id).toBe('tenant-123');
        expect(mockReq.tenant!.customDomain).toBe('custom-domain.com');
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should return 404 if tenant not found', async () => {
        (prisma.tenant.findFirst as jest.Mock).mockResolvedValue(null);
        
        await resolveTenant(mockReq as Request, mockRes as Response, nextFunction);
        
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Tenant not found' });
      });

      it('should return 403 if tenant is not active', async () => {
        const mockTenant = {
          id: 'tenant-123',
          name: 'Test Tenant',
          email: 'test@example.com',
          subdomain: 'test-tenant',
          customDomain: null,
          status: 'SUSPENDED',
          plan: 'FREE',
          settings: {},
          branding: {},
          features: {},
          trialEndsAt: null,
        };
        
        (prisma.tenant.findFirst as jest.Mock).mockResolvedValue(mockTenant);
        
        await resolveTenant(mockReq as Request, mockRes as Response, nextFunction);
        
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Tenant access denied',
          status: 'SUSPENDED',
        });
      });

      it('should return 402 if trial has expired', async () => {
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() - 1); // Yesterday
        
        const mockTenant = {
          id: 'tenant-123',
          name: 'Test Tenant',
          email: 'test@example.com',
          subdomain: 'test-tenant',
          customDomain: null,
          status: 'ACTIVE',
          plan: 'FREE',
          settings: {},
          branding: {},
          features: {},
          trialEndsAt: trialEndDate,
        };
        
        (prisma.tenant.findFirst as jest.Mock).mockResolvedValue(mockTenant);
        
        await resolveTenant(mockReq as Request, mockRes as Response, nextFunction);
        
        expect(mockRes.status).toHaveBeenCalledWith(402);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Trial period has expired',
          trialEndDate: trialEndDate,
        });
      });

      it('should handle DB errors', async () => {
        const error = new Error('Database error');
        (prisma.tenant.findFirst as jest.Mock).mockRejectedValue(error);
        
        await resolveTenant(mockReq as Request, mockRes as Response, nextFunction);
        
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to resolve tenant' });
      });
    });
  });

  describe('enforceTenantIsolation', () => {
    it('should skip enforcement for admin dashboard', () => {
      mockReq.hostname = 'admin.example.com';
      
      enforceTenantIsolation(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should skip enforcement for localhost in development', () => {
      process.env.NODE_ENV = 'development';
      mockReq.hostname = 'localhost';
      
      enforceTenantIsolation(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 400 if tenant is not defined', () => {
      process.env.NODE_ENV = 'production';
      mockReq.tenant = undefined;
      
      enforceTenantIsolation(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Tenant context required' });
    });

    it('should call next() if tenant is defined', () => {
      mockReq.tenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        subdomain: 'test-tenant',
        customDomain: null,
        status: 'ACTIVE',
        plan: 'FREE',
        settings: {},
        branding: {},
        features: {},
        trialEndsAt: null,
      };
      
      enforceTenantIsolation(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('checkFeatureAccess', () => {
    it('should skip feature check for localhost in development', () => {
      process.env.NODE_ENV = 'development';
      mockReq.hostname = 'localhost';
      
      const middleware = checkFeatureAccess('analytics');
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should call next() if tenant is not defined', () => {
      mockReq.tenant = undefined;
      
      const middleware = checkFeatureAccess('analytics');
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should call next() if feature is available', () => {
      mockReq.tenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        subdomain: 'test-tenant',
        customDomain: null,
        status: 'ACTIVE',
        plan: 'PRO',
        settings: {},
        branding: {},
        features: { analytics: true },
        trialEndsAt: null,
      };
      
      const middleware = checkFeatureAccess('analytics');
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 403 if feature is not available', () => {
      mockReq.tenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        subdomain: 'test-tenant',
        customDomain: null,
        status: 'ACTIVE',
        plan: 'FREE',
        settings: {},
        branding: {},
        features: { analytics: false },
        trialEndsAt: null,
      };
      
      const middleware = checkFeatureAccess('analytics');
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Feature not available',
        feature: 'analytics',
        plan: 'FREE',
      });
    });
  });
});