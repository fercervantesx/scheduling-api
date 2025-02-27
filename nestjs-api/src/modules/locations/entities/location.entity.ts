import { ApiProperty } from '@nestjs/swagger';

export class Location {
  @ApiProperty({ description: 'Unique identifier for the location' })
  id: string;

  @ApiProperty({ description: 'Tenant ID that owns this location' })
  tenantId: string;

  @ApiProperty({ description: 'Name of the location' })
  name: string;

  @ApiProperty({ description: 'Address of the location' })
  address: string;

  @ApiProperty({ description: 'City of the location', required: false })
  city?: string;

  @ApiProperty({ description: 'State or province of the location', required: false })
  state?: string;

  @ApiProperty({ description: 'Postal code of the location', required: false })
  postalCode?: string;

  @ApiProperty({ description: 'Country of the location', required: false })
  country?: string;

  @ApiProperty({ description: 'Timezone of the location', required: false })
  timezone?: string;

  @ApiProperty({ description: 'Phone number of the location', required: false })
  phone?: string;

  @ApiProperty({ description: 'Email address of the location', required: false })
  email?: string;

  @ApiProperty({ description: 'URL to location image', required: false })
  imageUrl?: string;

  @ApiProperty({ description: 'When the location was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the location was last updated' })
  updatedAt: Date;
}