import request from 'supertest';
import express from 'express';
import { prismaMock } from '../setup';
import employeeRoutes from '../../src/routes/employees';
import { mockJwt } from '../utils/auth-mock';
import { checkJwt } from '../../src/middleware/auth';

// Mock quota-enforcement middleware
jest.mock('../../src/middleware/quota-enforcement', () => ({
  checkQuota: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock tenant middleware
jest.mock('../../src/middleware/tenant', () => ({
  enforceTenantIsolation: (req: any, _res: any, next: any) => {
    req.tenant = { id: 'tenant-123' };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/api/employees', checkJwt, employeeRoutes);

describe('Employee Routes', () => {
  describe('GET /api/employees', () => {
    it('should return all employees', async () => {
      const mockEmployees = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Employee 1',
          tenantId: 'tenant-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          locations: [],
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Test Employee 2',
          tenantId: 'tenant-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          locations: [],
        },
      ];

      prismaMock.employee.findMany.mockResolvedValue(mockEmployees);

      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEmployees);
    });

    it('should handle errors when fetching employees', async () => {
      prismaMock.employee.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch employees' });
    });
  });

  describe('POST /api/employees', () => {
    const mockEmployee = {
      name: 'New Employee',
      locationIds: ['loc-123', 'loc-456'],
    };

    it('should create a new employee with valid data', async () => {
      const createdEmployee = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        name: 'New Employee',
        tenantId: 'tenant-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        locations: [
          {
            locationId: 'loc-123',
            employeeId: '123e4567-e89b-12d3-a456-426614174002',
            createdAt: new Date(),
            location: {
              id: 'loc-123',
              name: 'Location 1',
              address: '123 Test St',
              tenantId: 'tenant-123',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          {
            locationId: 'loc-456',
            employeeId: '123e4567-e89b-12d3-a456-426614174002',
            createdAt: new Date(),
            location: {
              id: 'loc-456',
              name: 'Location 2',
              address: '456 Test Ave',
              tenantId: 'tenant-123',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      };

      prismaMock.employee.create.mockResolvedValue(createdEmployee);

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .send(mockEmployee);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdEmployee);
    });

    it('should handle errors when creating employee', async () => {
      prismaMock.employee.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .send(mockEmployee);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to create employee' });
    });

    it('should reject creation without auth token', async () => {
      const response = await request(app)
        .post('/api/employees')
        .send(mockEmployee);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/employees/:id', () => {
    const mockEmployee = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Employee',
      tenantId: 'tenant-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      locations: [],
      schedules: [],
    };

    it('should return an employee by ID', async () => {
      prismaMock.employee.findFirst.mockResolvedValue(mockEmployee);

      const response = await request(app)
        .get(`/api/employees/${mockEmployee.id}`)
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEmployee);
    });

    it('should return 404 for non-existent employee', async () => {
      prismaMock.employee.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/employees/non-existent-id')
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Employee not found' });
    });

    it('should handle errors when fetching employee', async () => {
      prismaMock.employee.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/employees/${mockEmployee.id}`)
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch employee' });
    });
  });

  describe('PATCH /api/employees/:id/locations', () => {
    const mockEmployee = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Employee',
      tenantId: 'tenant-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      locations: [
        {
          locationId: 'loc-789',
          employeeId: '123e4567-e89b-12d3-a456-426614174000',
          createdAt: new Date(),
          location: {
            id: 'loc-789',
            name: 'New Location',
            address: '789 Test Blvd',
            tenantId: 'tenant-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
    };

    it('should update employee locations', async () => {
      prismaMock.employeeLocation.deleteMany.mockResolvedValue({ count: 2 });
      prismaMock.employee.update.mockResolvedValue(mockEmployee);

      const response = await request(app)
        .patch(`/api/employees/${mockEmployee.id}/locations`)
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .send({ locationIds: ['loc-789'] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEmployee);
    });

    it('should handle errors when updating locations', async () => {
      prismaMock.employeeLocation.deleteMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .patch(`/api/employees/${mockEmployee.id}/locations`)
        .set('Authorization', `Bearer ${mockJwt('user')}`)
        .send({ locationIds: ['loc-789'] });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to update employee locations' });
    });

    it('should reject update without auth token', async () => {
      const response = await request(app)
        .patch(`/api/employees/${mockEmployee.id}/locations`)
        .send({ locationIds: ['loc-789'] });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/employees/:id', () => {
    const employeeId = '123e4567-e89b-12d3-a456-426614174000';

    it('should delete an employee', async () => {
      // Mock the transaction
      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(prismaMock);
      });

      prismaMock.employeeLocation.deleteMany.mockResolvedValue({ count: 2 });
      prismaMock.schedule.deleteMany.mockResolvedValue({ count: 3 });
      prismaMock.appointment.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.employee.delete.mockResolvedValue({
        id: employeeId,
        name: 'Test Employee',
        tenantId: 'tenant-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .delete(`/api/employees/${employeeId}`)
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Employee deleted successfully' });
    });

    it('should handle errors when deleting employee', async () => {
      prismaMock.$transaction.mockRejectedValue(new Error('Transaction failed'));

      const response = await request(app)
        .delete(`/api/employees/${employeeId}`)
        .set('Authorization', `Bearer ${mockJwt('user')}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to delete employee' });
    });

    it('should reject deletion without auth token', async () => {
      const response = await request(app)
        .delete(`/api/employees/${employeeId}`);

      expect(response.status).toBe(401);
    });
  });
});