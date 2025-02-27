import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsUrl, MinLength, MaxLength, IsBoolean } from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({ description: 'Name of the employee' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Employee email address', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Employee phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Job title or role', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({ description: 'Biography or description', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiProperty({ description: 'Array of location IDs this employee works at', required: false })
  @IsOptional()
  @IsString({ each: true })
  locationIds?: string[];
  
  // Frontend-only property for editing state
  @ApiProperty({ description: 'Frontend-only editing state marker', required: false })
  @IsOptional()
  @IsBoolean()
  isEditing?: boolean;
}