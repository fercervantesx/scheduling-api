import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Express } from 'express';
import { LocationsService } from '../services/locations.service';
import { CreateLocationDto } from '../dto/create-location.dto';
import { UpdateLocationDto } from '../dto/update-location.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { Request } from 'express';

@ApiTags('locations')
@ApiBearerAuth()
@Controller('api/locations')
@UseGuards(AuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new location' })
  @ApiResponse({ status: 201, description: 'The location has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  create(@Body() createLocationDto: CreateLocationDto, @Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    return this.locationsService.create(createLocationDto, req.tenant.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all locations' })
  @ApiResponse({ status: 200, description: 'Returns all locations.' })
  findAll(@Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    return this.locationsService.findAll(req.tenant.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a location by ID' })
  @ApiResponse({ status: 200, description: 'Returns the location.' })
  @ApiResponse({ status: 404, description: 'Location not found.' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    return this.locationsService.findOne(id, req.tenant.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a location' })
  @ApiResponse({ status: 200, description: 'The location has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Location not found.' })
  update(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
    @Req() req: Request,
  ) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    return this.locationsService.update(id, updateLocationDto, req.tenant.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a location' })
  @ApiResponse({ status: 204, description: 'The location has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Location not found.' })
  @ApiResponse({ status: 400, description: 'Cannot delete location with appointments.' })
  async remove(@Param('id') id: string, @Req() req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    await this.locationsService.remove(id, req.tenant.id);
  }

  @Post(':id/image')
  @ApiOperation({ summary: 'Upload location image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Image uploaded successfully.' })
  @ApiResponse({ status: 404, description: 'Location not found.' })
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!req.tenant) {
      throw new Error('Tenant context required');
    }
    
    if (!file) {
      throw new Error('No image file provided');
    }
    
    const imageUrl = await this.locationsService.uploadImage(
      id,
      file.buffer,
      file.originalname,
      req.tenant.id
    );
    
    return { imageUrl };
  }
}