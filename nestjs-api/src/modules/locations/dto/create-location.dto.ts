import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MinLength, MaxLength, IsBoolean } from 'class-validator';

export class CreateLocationDto {
  @ApiProperty({ description: 'Name of the location' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Address of the location' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  address: string;

  @ApiProperty({ description: 'City of the location', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiProperty({ description: 'State or province of the location', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiProperty({ description: 'Postal code of the location', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiProperty({ description: 'Country of the location', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiProperty({ description: 'Timezone of the location', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ description: 'Phone number of the location', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Email address of the location', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
  
  // Frontend-only property for editing state
  @ApiProperty({ description: 'Frontend-only editing state marker', required: false })
  @IsOptional()
  @IsBoolean()
  isEditing?: boolean;
}