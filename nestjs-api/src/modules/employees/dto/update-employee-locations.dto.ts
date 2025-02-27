import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, ArrayMinSize } from 'class-validator';

export class UpdateEmployeeLocationsDto {
  @ApiProperty({ 
    description: 'Array of location IDs this employee works at',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  locationIds: string[];
}