import request from 'supertest';
import express from 'express';
import { prismaMock } from '../setup';
import appointmentRoutes from '../../src/routes/appointments';
import { mockJwt } from '../utils/auth-mock';
import { Appointment, Service } from '../types/models';
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
app.use('/api/appointments', checkJwt, appointmentRoutes);

describe('Appointment Routes', () => {
  const mockAppointment: Appointment = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    serviceId: '123e4567-e89b-12d3-a456-426614174001',
    locationId: '123e4567-e89b-12d3-a456-426614174002',
    employeeId: '123e4567-e89b-12d3-a456-426614174003',
    startTime: new Date('2024-03-20T10:00:00Z'),
    status: 'SCHEDULED',
    canceledBy: null,
    cancelReason: null,
    tenantId: 'tenant-123',
    bookedBy: 'auth0|123456',
    bookedByName: 'Test User',
    userId: 'auth0|123456',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('GET /api/appointments', () => {
    it('should return filtered appointments', async () => {
      const mockAppointments = [mockAppointment];

      prismaMock.appointment.findMany.mockResolvedValue(mockAppointments);

      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .query({
          locationId: mockAppointment.locationId,
          startDate: '2024-03-20',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAppointments);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/appointments');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/appointments', () => {
    const mockService: Service = {
      id: mockAppointment.serviceId,
      name: 'Test Service',
      duration: 60,
      tenantId: 'tenant-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a new appointment when slot is available', async () => {
      prismaMock.service.findUnique.mockResolvedValue(mockService);
      prismaMock.appointment.findFirst.mockResolvedValue(null);
      prismaMock.$transaction.mockImplementation((fn: any) => {
        if (typeof fn === 'function') {
          return fn(prismaMock);
        }
        return Promise.resolve([]);
      });
      prismaMock.appointment.create.mockResolvedValue(mockAppointment);

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .send({
          serviceId: mockAppointment.serviceId,
          locationId: mockAppointment.locationId,
          employeeId: mockAppointment.employeeId,
          startTime: mockAppointment.startTime,
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockAppointment);
    });

    it('should return 409 when slot is already booked', async () => {
      prismaMock.service.findUnique.mockResolvedValue(mockService);
      prismaMock.appointment.findFirst.mockResolvedValue(mockAppointment);
      prismaMock.$transaction.mockImplementation((fn: any) => {
        if (typeof fn === 'function') {
          return fn(prismaMock);
        }
        return Promise.resolve([]);
      });

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .send({
          serviceId: mockAppointment.serviceId,
          locationId: mockAppointment.locationId,
          employeeId: mockAppointment.employeeId,
          startTime: mockAppointment.startTime,
        });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ error: 'Time slot is already booked' });
    });
  });

  describe('PATCH /api/appointments/:id', () => {
    it('should update appointment status', async () => {
      const updatedAppointment: Appointment = {
        ...mockAppointment,
        status: 'CANCELLED',
        canceledBy: 'USER',
        cancelReason: 'Schedule conflict',
      };

      prismaMock.appointment.update.mockResolvedValue(updatedAppointment);

      const response = await request(app)
        .patch(`/api/appointments/${mockAppointment.id}`)
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .send({
          status: 'CANCELLED',
          canceledBy: 'USER',
          cancelReason: 'Schedule conflict',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedAppointment);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch(`/api/appointments/${mockAppointment.id}`)
        .send({ status: 'CANCELLED' });

      expect(response.status).toBe(401);
    });
  });
}); 