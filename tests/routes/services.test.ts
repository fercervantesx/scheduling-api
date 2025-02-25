import request from 'supertest';
import express from 'express';
import { prismaMock } from '../setup';
import serviceRoutes from '../../src/routes/services';
import { mockJwt } from '../utils/auth-mock';
import { checkJwt } from '../../src/middleware/auth';

// Mock tenant middleware
jest.mock('../../src/middleware/tenant', () => ({
  enforceTenantIsolation: (req: any, _res: any, next: any) => {
    req.tenant = { id: 'tenant-123' };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/api/services', checkJwt, serviceRoutes);

describe('Service Routes', () => {
  describe('GET /api/services', () => {
    it('should return all services', async () => {
      const mockServices = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Haircut',
          duration: 30,
          tenantId: 'tenant-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Manicure',
          duration: 45,
          tenantId: 'tenant-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaMock.service.findMany.mockResolvedValue(mockServices);

      const response = await request(app)
        .get('/api/services')
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockServices);
    });

    it('should handle errors when fetching services', async () => {
      prismaMock.service.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/services')
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch services' });
    });
  });

  describe('POST /api/services', () => {
    const mockService = {
      name: 'New Service',
      duration: 60,
    };

    it('should create a new service with valid data', async () => {
      const createdService = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        ...mockService,
        tenantId: 'tenant-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.service.create.mockResolvedValue(createdService);

      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .send(mockService);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdService);
    });

    it('should handle errors when creating service', async () => {
      prismaMock.service.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .send(mockService);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to create service' });
    });

    it('should reject creation without auth token', async () => {
      const response = await request(app)
        .post('/api/services')
        .send(mockService);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/services/:id', () => {
    const mockService = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Haircut',
      duration: 30,
      tenantId: 'tenant-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return a service by ID', async () => {
      prismaMock.service.findUnique.mockResolvedValue(mockService);

      const response = await request(app)
        .get(`/api/services/${mockService.id}`)
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockService);
    });

    it('should return 404 for non-existent service', async () => {
      prismaMock.service.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/services/non-existent-id')
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Service not found' });
    });

    it('should handle errors when fetching service', async () => {
      prismaMock.service.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/services/${mockService.id}`)
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch service' });
    });
  });

  describe('DELETE /api/services/:id', () => {
    const serviceId = '123e4567-e89b-12d3-a456-426614174000';

    it('should delete a service', async () => {
      // Mock the transaction
      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(prismaMock);
      });

      prismaMock.appointment.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.service.delete.mockResolvedValue({
        id: serviceId,
        name: 'Haircut',
        duration: 30,
        tenantId: 'tenant-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .delete(`/api/services/${serviceId}`)
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Service and related appointments deleted successfully' });
    });

    it('should handle errors when deleting service', async () => {
      prismaMock.$transaction.mockRejectedValue(new Error('Transaction failed'));

      const response = await request(app)
        .delete(`/api/services/${serviceId}`)
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to delete service' });
    });

    it('should reject deletion without auth token', async () => {
      const response = await request(app)
        .delete(`/api/services/${serviceId}`);

      expect(response.status).toBe(401);
    });
  });
});