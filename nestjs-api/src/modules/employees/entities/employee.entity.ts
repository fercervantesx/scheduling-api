import { ApiProperty } from '@nestjs/swagger';

export class Employee {
  @ApiProperty({ description: 'Unique identifier for the employee' })
  id: string;

  @ApiProperty({ description: 'Tenant ID that owns this employee' })
  tenantId: string;

  @ApiProperty({ description: 'Name of the employee' })
  name: string;

  @ApiProperty({ description: 'Employee email address', required: false })
  email?: string;

  @ApiProperty({ description: 'Employee phone number', required: false })
  phone?: string;

  @ApiProperty({ description: 'Job title or role', required: false })
  title?: string;

  @ApiProperty({ description: 'Biography or description', required: false })
  bio?: string;

  @ApiProperty({ description: 'URL to employee image', required: false })
  imageUrl?: string;

  @ApiProperty({ description: 'Locations this employee works at', type: 'array', required: false })
  locations?: any[];

  @ApiProperty({ description: 'When the employee was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the employee was last updated' })
  updatedAt: Date;
}