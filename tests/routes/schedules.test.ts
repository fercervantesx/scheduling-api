import request from 'supertest';
import express from 'express';
import { prismaMock } from '../setup';
import scheduleRoutes from '../../src/routes/schedules';
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
app.use('/api/schedules', checkJwt, scheduleRoutes);

describe('Schedule Routes', () => {
  describe('GET /api/schedules', () => {
    it('should return all schedules', async () => {
      const mockSchedules = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          employeeId: 'emp-123',
          locationId: 'loc-123',
          startTime: '09:00',
          endTime: '17:00',
          weekday: 'MONDAY',
          blockType: 'WORKING_HOURS',
          tenantId: 'tenant-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          employee: {
            id: 'emp-123',
            name: 'John Doe',
            tenantId: 'tenant-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          location: {
            id: 'loc-123',
            name: 'Downtown Office',
            address: '123 Main St',
            tenantId: 'tenant-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          employeeId: 'emp-123',
          locationId: 'loc-123',
          startTime: '09:00',
          endTime: '17:00',
          weekday: 'TUESDAY',
          blockType: 'WORKING_HOURS',
          tenantId: 'tenant-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          employee: {
            id: 'emp-123',
            name: 'John Doe',
            tenantId: 'tenant-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          location: {
            id: 'loc-123',
            name: 'Downtown Office',
            address: '123 Main St',
            tenantId: 'tenant-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        },
      ];

      prismaMock.schedule.findMany.mockResolvedValue(mockSchedules);

      const response = await request(app)
        .get('/api/schedules')
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSchedules);
    });

    it('should handle errors when fetching schedules', async () => {
      prismaMock.schedule.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/schedules')
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch schedules');
    });
  });

  describe('POST /api/schedules', () => {
    const mockScheduleData = {
      employeeId: 'emp-123',
      locationId: 'loc-123',
      startTime: '09:00',
      endTime: '17:00',
      weekday: 'WEDNESDAY',
      blockType: 'WORKING_HOURS',
    };

    const mockEmployeeResponse = {
      id: 'emp-123',
      name: 'John Doe',
      tenantId: 'tenant-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockLocationResponse = {
      id: 'loc-123',
      name: 'Downtown Office',
      address: '123 Main St',
      tenantId: 'tenant-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockCreatedSchedule = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      ...mockScheduleData,
      tenantId: 'tenant-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a new schedule with valid data', async () => {
      prismaMock.employee.findUnique.mockResolvedValue(mockEmployeeResponse);
      prismaMock.location.findUnique.mockResolvedValue(mockLocationResponse);
      prismaMock.schedule.findFirst.mockResolvedValue(null); // No overlapping schedules
      prismaMock.schedule.create.mockResolvedValue(mockCreatedSchedule);

      const response = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .send(mockScheduleData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockCreatedSchedule);
    });

    it('should reject creation with missing required fields', async () => {
      const response = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .send({
          employeeId: 'emp-123',
          // Missing other required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should reject creation with invalid time format', async () => {
      const response = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .send({
          ...mockScheduleData,
          startTime: '9:00', // Invalid format (should be 09:00)
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid time format');
    });

    it('should reject creation if employee does not exist', async () => {
      prismaMock.employee.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .send(mockScheduleData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Employee not found');
    });

    it('should reject creation if location does not exist', async () => {
      prismaMock.employee.findUnique.mockResolvedValue(mockEmployeeResponse);
      prismaMock.location.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .send(mockScheduleData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Location not found');
    });

    it('should reject creation if schedule overlaps with existing schedule', async () => {
      const existingSchedule = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        employeeId: 'emp-123',
        locationId: 'loc-123',
        startTime: '08:00',
        endTime: '12:00',
        weekday: 'WEDNESDAY',
        blockType: 'WORKING_HOURS',
        tenantId: 'tenant-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.employee.findUnique.mockResolvedValue(mockEmployeeResponse);
      prismaMock.location.findUnique.mockResolvedValue(mockLocationResponse);
      prismaMock.schedule.findFirst.mockResolvedValue(existingSchedule);

      const response = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .send(mockScheduleData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Schedule overlaps with existing schedule');
    });

    it('should handle errors when creating schedule', async () => {
      prismaMock.employee.findUnique.mockResolvedValue(mockEmployeeResponse);
      prismaMock.location.findUnique.mockResolvedValue(mockLocationResponse);
      prismaMock.schedule.findFirst.mockResolvedValue(null);
      prismaMock.schedule.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .send(mockScheduleData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create schedule');
    });

    it('should reject creation without auth token', async () => {
      const response = await request(app)
        .post('/api/schedules')
        .send(mockScheduleData);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/schedules/:id', () => {
    const scheduleId = '123e4567-e89b-12d3-a456-426614174000';

    it('should delete a schedule', async () => {
      prismaMock.schedule.delete.mockResolvedValue({
        id: scheduleId,
        employeeId: 'emp-123',
        locationId: 'loc-123',
        startTime: '09:00',
        endTime: '17:00',
        weekday: 'MONDAY',
        blockType: 'WORKING_HOURS',
        tenantId: 'tenant-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .delete(`/api/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Schedule deleted successfully' });
    });

    it('should handle errors when deleting schedule', async () => {
      prismaMock.schedule.delete.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/api/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete schedule');
    });

    it('should reject deletion without auth token', async () => {
      const response = await request(app)
        .delete(`/api/schedules/${scheduleId}`);

      expect(response.status).toBe(401);
    });
  });
});