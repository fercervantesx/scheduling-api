import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, IsUUID, IsBoolean } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'Service ID for this appointment' })
  @IsUUID()
  @IsString()
  serviceId: string;

  @ApiProperty({ description: 'Location ID for this appointment' })
  @IsUUID()
  @IsString()
  locationId: string;

  @ApiProperty({ description: 'Employee ID assigned to this appointment' })
  @IsUUID()
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Start time of the appointment' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'Additional notes for the appointment', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
  
  // Frontend-only property for editing state
  @ApiProperty({ description: 'Frontend-only editing state marker', required: false })
  @IsOptional()
  @IsBoolean()
  isEditing?: boolean;
}