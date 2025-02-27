import { ApiProperty } from '@nestjs/swagger';

export class AdminTenant {
  @ApiProperty({ description: 'Unique identifier for the tenant' })
  id: string;

  @ApiProperty({ description: 'Name of the tenant' })
  name: string;

  @ApiProperty({ description: 'Email address of the tenant admin', required: false })
  email?: string;

  @ApiProperty({ description: 'Subdomain for the tenant' })
  subdomain: string;

  @ApiProperty({ description: 'Custom domain for the tenant', required: false })
  customDomain?: string;

  @ApiProperty({ description: 'Status of the tenant (ACTIVE, SUSPENDED, TRIAL)' })
  status: string;

  @ApiProperty({ description: 'Plan of the tenant (FREE, BASIC, PRO)' })
  plan: string;

  @ApiProperty({ description: 'When the trial ends', required: false })
  trialEndsAt?: Date;

  @ApiProperty({ description: 'Usage statistics', required: false })
  usage?: {
    appointments: number;
    locations: number;
    employees: number;
    services: number;
  };

  @ApiProperty({ description: 'When the tenant was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the tenant was last updated' })
  updatedAt: Date;
}