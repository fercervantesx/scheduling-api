import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../common/services/supabase.service';
import { CreateServiceDto } from '../dto/create-service.dto';
import { UpdateServiceDto } from '../dto/update-service.dto';
import { Service } from '../entities/service.entity';

@Injectable()
export class ServicesService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(tenantId: string): Promise<Service[]> {
    const { data, error } = await this.supabase.supabase
      .from('services')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch services: ${error.message}`);
    }

    return data.map(this.mapToService);
  }

  async findOne(id: string, tenantId: string): Promise<Service> {
    const { data, error } = await this.supabase.supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return this.mapToService(data);
  }

  async create(createServiceDto: CreateServiceDto, tenantId: string): Promise<Service> {
    const { data, error } = await this.supabase.supabase
      .from('services')
      .insert({
        tenant_id: tenantId,
        name: createServiceDto.name,
        description: createServiceDto.description,
        duration: createServiceDto.duration,
        price: createServiceDto.price,
        color: createServiceDto.color,
        buffer_time: createServiceDto.bufferTime
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create service: ${error.message}`);
    }

    return this.mapToService(data);
  }

  async update(id: string, updateServiceDto: UpdateServiceDto, tenantId: string): Promise<Service> {
    // Check if service exists
    await this.findOne(id, tenantId);

    // Update service data
    const updateData: any = {};

    if (updateServiceDto.name !== undefined) updateData.name = updateServiceDto.name;
    if (updateServiceDto.description !== undefined) updateData.description = updateServiceDto.description;
    if (updateServiceDto.duration !== undefined) updateData.duration = updateServiceDto.duration;
    if (updateServiceDto.price !== undefined) updateData.price = updateServiceDto.price;
    if (updateServiceDto.color !== undefined) updateData.color = updateServiceDto.color;
    if (updateServiceDto.bufferTime !== undefined) updateData.buffer_time = updateServiceDto.bufferTime;

    const { data, error } = await this.supabase.supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update service: ${error.message}`);
    }

    return this.mapToService(data);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    // Check if service exists
    await this.findOne(id, tenantId);

    // Check if there are any appointments associated with this service
    const { count: appointmentCount, error: appointmentError } = await this.supabase.supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('service_id', id);

    if (appointmentError) {
      throw new Error(`Failed to check appointments: ${appointmentError.message}`);
    }

    if (appointmentCount && appointmentCount > 0) {
      throw new Error('Cannot delete service that has appointments');
    }

    // Delete service
    const { error } = await this.supabase.supabase
      .from('services')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete service: ${error.message}`);
    }
  }

  private mapToService(data: any): Service {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      description: data.description,
      duration: data.duration,
      price: data.price,
      color: data.color,
      bufferTime: data.buffer_time,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}