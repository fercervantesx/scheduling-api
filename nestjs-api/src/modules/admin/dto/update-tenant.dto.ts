import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsEnum, IsOptional, MinLength, MaxLength, Matches, IsObject } from 'class-validator';
import { TenantStatus, TenantPlan } from './create-tenant.dto';

export class UpdateTenantDto {
  @ApiProperty({ description: 'Name of the tenant', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: 'Email address of the tenant admin', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Custom domain for the tenant', required: false })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(100)
  customDomain?: string;

  @ApiProperty({ description: 'Status of the tenant', enum: TenantStatus, required: false })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiProperty({ description: 'Plan of the tenant', enum: TenantPlan, required: false })
  @IsOptional()
  @IsEnum(TenantPlan)
  plan?: TenantPlan;

  @ApiProperty({ description: 'When the trial ends', required: false })
  @IsOptional()
  trialEndsAt?: Date;

  @ApiProperty({ description: 'Tenant settings', required: false })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiProperty({ description: 'Tenant branding', required: false })
  @IsOptional()
  @IsObject()
  branding?: Record<string, any>;

  @ApiProperty({ description: 'Tenant features', required: false })
  @IsOptional()
  @IsObject()
  features?: Record<string, any>;
}