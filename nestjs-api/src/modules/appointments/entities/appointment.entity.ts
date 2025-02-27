import { ApiProperty } from '@nestjs/swagger';

export class Appointment {
  @ApiProperty({ description: 'Unique identifier for the appointment' })
  id: string;

  @ApiProperty({ description: 'Tenant ID that owns this appointment' })
  tenantId: string;

  @ApiProperty({ description: 'Service ID for this appointment' })
  serviceId: string;

  @ApiProperty({ description: 'Location ID for this appointment' })
  locationId: string;

  @ApiProperty({ description: 'Employee ID assigned to this appointment' })
  employeeId: string;

  @ApiProperty({ description: 'Start time of the appointment' })
  startTime: Date;

  @ApiProperty({ description: 'Status of the appointment (SCHEDULED, CANCELLED, FULFILLED)' })
  status: string;

  @ApiProperty({ description: 'Who cancelled the appointment', required: false })
  canceledBy?: string;

  @ApiProperty({ description: 'Reason for cancellation', required: false })
  cancelReason?: string;

  @ApiProperty({ description: 'Email of the person who booked the appointment' })
  bookedBy: string;

  @ApiProperty({ description: 'Name of the person who booked the appointment' })
  bookedByName: string;

  @ApiProperty({ description: 'User ID of the person who booked the appointment' })
  userId: string;

  @ApiProperty({ description: 'When the appointment was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the appointment was last updated' })
  updatedAt: Date;
  
  @ApiProperty({ description: 'Flag indicating if appointment is past due', required: false })
  isPastDue?: boolean;
}