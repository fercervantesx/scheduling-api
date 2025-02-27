import { ApiProperty } from '@nestjs/swagger';

export class Schedule {
  @ApiProperty({ description: 'Unique identifier for the schedule' })
  id: string;

  @ApiProperty({ description: 'Tenant ID that owns this schedule' })
  tenantId: string;

  @ApiProperty({ description: 'Employee ID for this schedule' })
  employeeId: string;

  @ApiProperty({ description: 'Location ID for this schedule' })
  locationId: string;

  @ApiProperty({ description: 'Day of the week (0-6, 0 = Sunday)' })
  weekday: number;

  @ApiProperty({ description: 'Start time of the schedule in HH:MM format' })
  startTime: string;

  @ApiProperty({ description: 'End time of the schedule in HH:MM format' })
  endTime: string;

  @ApiProperty({ description: 'Block type (WORK, BREAK, UNAVAILABLE)' })
  blockType: string;

  @ApiProperty({ description: 'When the schedule was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the schedule was last updated' })
  updatedAt: Date;
}