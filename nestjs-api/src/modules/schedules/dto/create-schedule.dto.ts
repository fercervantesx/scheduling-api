import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, Min, Max, Matches, IsOptional, IsBoolean } from 'class-validator';

export enum BlockType {
  WORK = 'WORK',
  BREAK = 'BREAK',
  UNAVAILABLE = 'UNAVAILABLE',
}

export class CreateScheduleDto {
  @ApiProperty({ description: 'Employee ID for this schedule' })
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Location ID for this schedule' })
  @IsString()
  locationId: string;

  @ApiProperty({ description: 'Day of the week (0-6, 0 = Sunday)' })
  @IsNumber()
  @Min(0)
  @Max(6)
  weekday: number;

  @ApiProperty({ description: 'Start time of the schedule in HH:MM format' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Start time must be in HH:MM format',
  })
  startTime: string;

  @ApiProperty({ description: 'End time of the schedule in HH:MM format' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'End time must be in HH:MM format',
  })
  endTime: string;

  @ApiProperty({ description: 'Block type (WORK, BREAK, UNAVAILABLE)', enum: BlockType })
  @IsEnum(BlockType)
  blockType: BlockType;
  
  // Frontend-only property for editing state
  @ApiProperty({ description: 'Frontend-only editing state marker', required: false })
  @IsOptional()
  @IsBoolean()
  isEditing?: boolean;
}