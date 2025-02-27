import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService } from './appointments.service';
import { SupabaseService } from '../../../common/services/supabase.service';
import { createMock } from '@golevelup/ts-jest';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let supabaseService: SupabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: SupabaseService,
          useValue: {
            supabase: {
              from: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              insert: jest.fn().mockReturnThis(),
              update: jest.fn().mockReturnThis(),
              delete: jest.fn().mockReturnThis(),
              single: jest.fn(),
              rpc: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all appointments for a tenant', async () => {
      const mockAppointments = [
        {
          id: '1',
          tenant_id: 'tenant-1',
          service_id: 'service-1',
          location_id: 'location-1',
          employee_id: 'employee-1',
          start_time: new Date().toISOString(),
          status: 'SCHEDULED',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockSupabase = supabaseService.supabase;
      mockSupabase.from().select().eq().order = jest.fn().mockReturnValue({
        data: mockAppointments,
        error: null,
      });

      const result = await service.findAll({ locationId: 'location-1' }, 'tenant-1');
      
      expect(result.length).toBe(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('appointments');
    });

    it('should throw an error if the supabase query fails', async () => {
      const mockSupabase = supabaseService.supabase;
      mockSupabase.from().select().eq().order = jest.fn().mockReturnValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(service.findAll({}, 'tenant-1')).rejects.toThrowError(
        'Failed to fetch appointments: Database error',
      );
    });
  });

  describe('findOne', () => {
    it('should return an appointment by id', async () => {
      const mockAppointment = {
        id: '1',
        tenant_id: 'tenant-1',
        service_id: 'service-1',
        location_id: 'location-1',
        employee_id: 'employee-1',
        start_time: new Date().toISOString(),
        status: 'SCHEDULED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockSupabase = supabaseService.supabase;
      mockSupabase.from().select().eq().eq().single = jest.fn().mockReturnValue({
        data: mockAppointment,
        error: null,
      });

      const result = await service.findOne('1', 'tenant-1');
      
      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(mockSupabase.from).toHaveBeenCalledWith('appointments');
    });

    it('should throw NotFoundException if appointment not found', async () => {
      const mockSupabase = supabaseService.supabase;
      mockSupabase.from().select().eq().eq().single = jest.fn().mockReturnValue({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(service.findOne('1', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  // Add more tests for other methods as needed
});