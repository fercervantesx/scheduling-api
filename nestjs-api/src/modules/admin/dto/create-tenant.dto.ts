import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsEnum, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
}

export enum TenantPlan {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PRO = 'PRO',
}

export class CreateTenantDto {
  @ApiProperty({ description: 'Name of the tenant' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Email address of the tenant admin', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Subdomain for the tenant' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Subdomain can only contain lowercase letters, numbers, and hyphens',
  })
  subdomain: string;

  @ApiProperty({ description: 'Custom domain for the tenant', required: false })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(100)
  customDomain?: string;

  @ApiProperty({ description: 'Status of the tenant', enum: TenantStatus, default: TenantStatus.TRIAL })
  @IsEnum(TenantStatus)
  @IsOptional()
  status?: TenantStatus = TenantStatus.TRIAL;

  @ApiProperty({ description: 'Plan of the tenant', enum: TenantPlan, default: TenantPlan.FREE })
  @IsEnum(TenantPlan)
  @IsOptional()
  plan?: TenantPlan = TenantPlan.FREE;

  @ApiProperty({ description: 'Trial duration in days', required: false, default: 14 })
  @IsOptional()
  trialDays?: number = 14;
}