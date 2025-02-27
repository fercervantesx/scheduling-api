import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, MinLength, MaxLength, IsBoolean } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ description: 'Name of the service' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Description of the service', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Duration of the service in minutes' })
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiProperty({ description: 'Price of the service', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ description: 'Color code for the service', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ description: 'Buffer time after the service in minutes', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bufferTime?: number;
  
  // Frontend-only property for editing state
  @ApiProperty({ description: 'Frontend-only editing state marker', required: false })
  @IsOptional()
  @IsBoolean()
  isEditing?: boolean;
}