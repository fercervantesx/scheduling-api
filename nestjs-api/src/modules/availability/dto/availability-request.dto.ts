import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, IsUUID, IsNotEmpty } from 'class-validator';

export class AvailabilityRequestDto {
  @ApiProperty({ description: 'Date to check availability for (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Service ID to check availability for' })
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({ description: 'Location ID to check availability for', required: false })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiProperty({ description: 'Employee ID to check availability for', required: false })
  @IsOptional()
  @IsUUID()
  employeeId?: string;
}