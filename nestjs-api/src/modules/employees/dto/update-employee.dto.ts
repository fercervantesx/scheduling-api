import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsUrl, MinLength, MaxLength } from 'class-validator';

export class UpdateEmployeeDto {
  @ApiProperty({ description: 'Name of the employee', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

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
}