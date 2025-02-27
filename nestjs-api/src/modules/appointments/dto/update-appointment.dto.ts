import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, IsEnum } from 'class-validator';

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  FULFILLED = 'FULFILLED',
}

export class UpdateAppointmentDto {
  @ApiProperty({ description: 'Status of the appointment', enum: AppointmentStatus })
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;

  @ApiProperty({ description: 'New start time of the appointment', required: false })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiProperty({ description: 'Who cancelled the appointment', required: false })
  @IsOptional()
  @IsString()
  canceledBy?: string;

  @ApiProperty({ description: 'Reason for cancellation', required: false })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}