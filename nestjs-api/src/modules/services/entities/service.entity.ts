import { ApiProperty } from '@nestjs/swagger';

export class Service {
  @ApiProperty({ description: 'Unique identifier for the service' })
  id: string;

  @ApiProperty({ description: 'Tenant ID that owns this service' })
  tenantId: string;

  @ApiProperty({ description: 'Name of the service' })
  name: string;

  @ApiProperty({ description: 'Description of the service', required: false })
  description?: string;

  @ApiProperty({ description: 'Duration of the service in minutes' })
  duration: number;

  @ApiProperty({ description: 'Price of the service', required: false })
  price?: number;

  @ApiProperty({ description: 'Color code for the service', required: false })
  color?: string;

  @ApiProperty({ description: 'Buffer time after the service in minutes', required: false })
  bufferTime?: number;

  @ApiProperty({ description: 'When the service was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the service was last updated' })
  updatedAt: Date;
}