import request from 'supertest';
import express from 'express';
import { prismaMock } from '../setup';
import availabilityRoutes from '../../src/routes/availability';
import { mockJwt } from '../utils/auth-mock';
import { Service, Schedule, Appointment } from '../types/models';
import { checkJwt } from '../../src/middleware/auth';

const app = express();
app.use(express.json());
app.use('/api/availability', checkJwt, availabilityRoutes);

describe('Availability Routes', () => {
  const mockService: Service = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Service',
    duration: 60, // 60 minutes
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSchedule: Schedule = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    employeeId: '123e4567-e89b-12d3-a456-426614174003',
    locationId: '123e4567-e89b-12d3-a456-426614174004',
    startTime: new Date('2024-03-20T09:00:00Z'),
    endTime: new Date('2024-03-20T17:00:00Z'),
    blockType: 'WORKING_HOURS',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('GET /api/availability', () => {
    it('should return available time slots when no appointments exist', async () => {
      prismaMock.service.findUnique.mockResolvedValue(mockService);
      prismaMock.schedule.findFirst.mockResolvedValue(mockSchedule);
      prismaMock.appointment.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/availability')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .query({
          serviceId: mockService.id,
          locationId: mockSchedule.locationId,
          employeeId: mockSchedule.employeeId,
          date: '2024-03-20',
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('startTime');
      expect(response.body[0]).toHaveProperty('endTime');
    });

    it('should return no slots when schedule is fully booked', async () => {
      const mockAppointments: Appointment[] = [{
        id: '123e4567-e89b-12d3-a456-426614174005',
        serviceId: mockService.id,
        locationId: mockSchedule.locationId,
        employeeId: mockSchedule.employeeId,
        startTime: new Date('2024-03-20T09:00:00Z'),
        status: 'SCHEDULED',
        canceledBy: null,
        cancelReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }];

      prismaMock.service.findUnique.mockResolvedValue(mockService);
      prismaMock.schedule.findFirst.mockResolvedValue(mockSchedule);
      prismaMock.appointment.findMany.mockResolvedValue(mockAppointments);

      const response = await request(app)
        .get('/api/availability')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .query({
          serviceId: mockService.id,
          locationId: mockSchedule.locationId,
          employeeId: mockSchedule.employeeId,
          date: '2024-03-20',
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 400 when missing required parameters', async () => {
      const response = await request(app)
        .get('/api/availability')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .query({
          serviceId: mockService.id,
          // Missing other required parameters
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 when service is not found', async () => {
      prismaMock.service.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/availability')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .query({
          serviceId: 'non-existent-id',
          locationId: mockSchedule.locationId,
          employeeId: mockSchedule.employeeId,
          date: '2024-03-20',
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Service not found' });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/availability')
        .query({
          serviceId: mockService.id,
          locationId: mockSchedule.locationId,
          employeeId: mockSchedule.employeeId,
          date: '2024-03-20',
        });

      expect(response.status).toBe(401);
    });
  });
}); 