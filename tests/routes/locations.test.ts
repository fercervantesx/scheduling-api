import request from 'supertest';
import express from 'express';
import { prismaMock } from '../setup';
import locationRoutes from '../../src/routes/locations';
import { mockJwt } from '../utils/auth-mock';
import { Location } from '../types/models';
import { checkJwt } from '../../src/middleware/auth';

const app = express();
app.use(express.json());
app.use('/api/locations', checkJwt, locationRoutes);

describe('Location Routes', () => {
  describe('GET /api/locations', () => {
    it('should return all locations', async () => {
      const mockLocations: Location[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Location 1',
          address: '123 Test St',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Test Location 2',
          address: '456 Test Ave',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaMock.location.findMany.mockResolvedValue(mockLocations);

      const response = await request(app)
        .get('/api/locations')
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockLocations);
    });

    it('should handle errors when fetching locations', async () => {
      prismaMock.location.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/locations')
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch locations' });
    });
  });

  describe('POST /api/locations', () => {
    const mockLocation = {
      name: 'New Location',
      address: '789 New St',
    };

    it('should create a new location with valid admin token', async () => {
      const createdLocation: Location = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        ...mockLocation,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.location.create.mockResolvedValue(createdLocation);

      const response = await request(app)
        .post('/api/locations')
        .set('Authorization', `Bearer ${mockJwt('admin')}`)
        .send(mockLocation);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdLocation);
    });

    it('should reject creation without admin role', async () => {
      const response = await request(app)
        .post('/api/locations')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .send(mockLocation);

      expect(response.status).toBe(403);
    });

    it('should reject creation without auth token', async () => {
      const response = await request(app)
        .post('/api/locations')
        .send(mockLocation);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/locations/:id', () => {
    const mockLocation: Location & { employees: any[] } = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Location',
      address: '123 Test St',
      createdAt: new Date(),
      updatedAt: new Date(),
      employees: [],
    };

    it('should return a location by ID', async () => {
      prismaMock.location.findUnique.mockResolvedValue(mockLocation);

      const response = await request(app)
        .get(`/api/locations/${mockLocation.id}`)
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockLocation);
    });

    it('should return 404 for non-existent location', async () => {
      prismaMock.location.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/locations/non-existent-id')
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Location not found' });
    });
  });
}); 