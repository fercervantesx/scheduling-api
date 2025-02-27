import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../common/services/supabase.service';
import { CreateLocationDto } from '../dto/create-location.dto';
import { UpdateLocationDto } from '../dto/update-location.dto';
import { Location } from '../entities/location.entity';

@Injectable()
export class LocationsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(tenantId: string): Promise<Location[]> {
    const { data, error } = await this.supabase.supabase
      .from('locations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch locations: ${error.message}`);
    }

    return data.map(this.mapToLocation);
  }

  async findOne(id: string, tenantId: string): Promise<Location> {
    const { data, error } = await this.supabase.supabase
      .from('locations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return this.mapToLocation(data);
  }

  async create(createLocationDto: CreateLocationDto, tenantId: string): Promise<Location> {
    const { data, error } = await this.supabase.supabase
      .from('locations')
      .insert({
        tenant_id: tenantId,
        name: createLocationDto.name,
        address: createLocationDto.address,
        city: createLocationDto.city,
        state: createLocationDto.state,
        postal_code: createLocationDto.postalCode,
        country: createLocationDto.country,
        timezone: createLocationDto.timezone,
        phone: createLocationDto.phone,
        email: createLocationDto.email
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create location: ${error.message}`);
    }

    return this.mapToLocation(data);
  }

  async update(id: string, updateLocationDto: UpdateLocationDto, tenantId: string): Promise<Location> {
    // Check if location exists
    await this.findOne(id, tenantId);

    // Update location data
    const updateData: any = {};

    if (updateLocationDto.name) updateData.name = updateLocationDto.name;
    if (updateLocationDto.address) updateData.address = updateLocationDto.address;
    if (updateLocationDto.city !== undefined) updateData.city = updateLocationDto.city;
    if (updateLocationDto.state !== undefined) updateData.state = updateLocationDto.state;
    if (updateLocationDto.postalCode !== undefined) updateData.postal_code = updateLocationDto.postalCode;
    if (updateLocationDto.country !== undefined) updateData.country = updateLocationDto.country;
    if (updateLocationDto.timezone !== undefined) updateData.timezone = updateLocationDto.timezone;
    if (updateLocationDto.phone !== undefined) updateData.phone = updateLocationDto.phone;
    if (updateLocationDto.email !== undefined) updateData.email = updateLocationDto.email;

    const { data, error } = await this.supabase.supabase
      .from('locations')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update location: ${error.message}`);
    }

    return this.mapToLocation(data);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    // Check if location exists
    await this.findOne(id, tenantId);

    // Check if there are any appointments, schedules, or employees associated with this location
    const { count: appointmentCount, error: appointmentError } = await this.supabase.supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', id);

    if (appointmentError) {
      throw new Error(`Failed to check appointments: ${appointmentError.message}`);
    }

    if (appointmentCount && appointmentCount > 0) {
      throw new Error('Cannot delete location that has appointments');
    }

    // Delete location
    const { error } = await this.supabase.supabase
      .from('locations')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete location: ${error.message}`);
    }
  }

  async uploadImage(id: string, imageBuffer: Buffer, filename: string, tenantId: string): Promise<string> {
    // Check if location exists
    await this.findOne(id, tenantId);

    // Upload image to Supabase Storage
    const contentType = filename.endsWith('.png') ? 'image/png' : 
                         filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' : 
                         filename.endsWith('.gif') ? 'image/gif' : 'application/octet-stream';
    
    const imageUrl = await this.supabase.uploadTenantFile(
      tenantId, 
      imageBuffer,
      `locations/${id}/${filename}`,
      contentType
    );

    if (!imageUrl) {
      throw new Error('Failed to upload location image');
    }

    // Update location record with image URL
    const { error } = await this.supabase.supabase
      .from('locations')
      .update({ image_url: imageUrl })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to update location with image URL: ${error.message}`);
    }

    return imageUrl;
  }

  private mapToLocation(data: any): Location {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      postalCode: data.postal_code,
      country: data.country,
      timezone: data.timezone,
      phone: data.phone,
      email: data.email,
      imageUrl: data.image_url,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}