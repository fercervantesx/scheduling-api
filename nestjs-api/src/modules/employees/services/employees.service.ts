import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../../common/services/supabase.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { UpdateEmployeeLocationsDto } from '../dto/update-employee-locations.dto';
import { Employee } from '../entities/employee.entity';

@Injectable()
export class EmployeesService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(tenantId: string): Promise<Employee[]> {
    const { data, error } = await this.supabase.supabase
      .from('employees')
      .select(`
        *,
        employee_locations (
          location_id,
          location:locations(*)
        )
      `)
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch employees: ${error.message}`);
    }

    // Group the results by employee to handle multiple locations
    const employeesMap = new Map();
    
    data.forEach(item => {
      if (!employeesMap.has(item.id)) {
        employeesMap.set(item.id, {
          id: item.id,
          tenantId: item.tenant_id,
          name: item.name,
          email: item.email,
          phone: item.phone,
          title: item.title, 
          bio: item.bio,
          imageUrl: item.image_url,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at),
          locations: []
        });
      }
      
      // Add locations if they exist
      if (item.employee_locations && item.employee_locations.length > 0) {
        item.employee_locations.forEach(el => {
          if (el.location) {
            employeesMap.get(item.id).locations.push(el.location);
          }
        });
      }
    });
    
    return Array.from(employeesMap.values());
  }

  async findOne(id: string, tenantId: string): Promise<Employee> {
    const { data, error } = await this.supabase.supabase
      .from('employees')
      .select(`
        *,
        employee_locations (
          location_id,
          location:locations(*)
        )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      title: data.title,
      bio: data.bio,
      imageUrl: data.image_url,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      locations: data.employee_locations?.map(el => el.location) || []
    };
  }

  async create(createEmployeeDto: CreateEmployeeDto, tenantId: string): Promise<Employee> {
    try {
      // Create employee using transaction
      const { data: employeeData, error: employeeError } = await this.supabase.supabase
        .from('employees')
        .insert({
          name: createEmployeeDto.name,
          email: createEmployeeDto.email,
          phone: createEmployeeDto.phone,
          title: createEmployeeDto.title,
          bio: createEmployeeDto.bio,
          tenant_id: tenantId
        })
        .select('id')
        .single();
  
      if (employeeError) {
        throw new Error(`Failed to create employee: ${employeeError.message}`);
      }
      
      const employeeId = employeeData.id;
      
      // Add employee locations if provided
      if (createEmployeeDto.locationIds && createEmployeeDto.locationIds.length > 0) {
        const employeeLocations = createEmployeeDto.locationIds.map(locationId => ({
          employee_id: employeeId,
          location_id: locationId
        }));
        
        const { error: locationsError } = await this.supabase.supabase
          .from('employee_locations')
          .insert(employeeLocations);
        
        if (locationsError) {
          // Rollback by deleting the employee
          await this.supabase.supabase
            .from('employees')
            .delete()
            .eq('id', employeeId);
            
          throw new Error(`Failed to assign employee to locations: ${locationsError.message}`);
        }
      }
  
      // Get the newly created employee with locations
      return this.findOne(employeeId, tenantId);
    } catch (error) {
      throw new Error(`Failed to create employee: ${error.message}`);
    }
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto, tenantId: string): Promise<Employee> {
    // Check if employee exists
    await this.findOne(id, tenantId);

    // Update employee data
    const { error } = await this.supabase.supabase
      .from('employees')
      .update({
        name: updateEmployeeDto.name,
        email: updateEmployeeDto.email,
        phone: updateEmployeeDto.phone,
        title: updateEmployeeDto.title,
        bio: updateEmployeeDto.bio
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to update employee: ${error.message}`);
    }

    // Get the updated employee
    return this.findOne(id, tenantId);
  }

  async updateLocations(id: string, updateLocationsDto: UpdateEmployeeLocationsDto, tenantId: string): Promise<Employee> {
    try {
      // Check if employee exists
      await this.findOne(id, tenantId);
  
      // Check if all locations exist and belong to the tenant
      const { data: locations, error: locationsError } = await this.supabase.supabase
        .from('locations')
        .select('id')
        .in('id', updateLocationsDto.locationIds)
        .eq('tenant_id', tenantId);
  
      if (locationsError) {
        throw new Error(`Failed to validate locations: ${locationsError.message}`);
      }
  
      const validLocationIds = locations.map(loc => loc.id);
      const invalidLocationIds = updateLocationsDto.locationIds.filter(id => !validLocationIds.includes(id));
  
      if (invalidLocationIds.length > 0) {
        throw new BadRequestException(`Invalid location IDs: ${invalidLocationIds.join(', ')}`);
      }
  
      // First, delete existing employee locations
      const { error: deleteError } = await this.supabase.supabase
        .from('employee_locations')
        .delete()
        .eq('employee_id', id);
  
      if (deleteError) {
        throw new Error(`Failed to clear existing employee locations: ${deleteError.message}`);
      }
  
      // Then, insert new employee locations
      if (updateLocationsDto.locationIds.length > 0) {
        const employeeLocations = updateLocationsDto.locationIds.map(locationId => ({
          employee_id: id,
          location_id: locationId
        }));
        
        const { error: insertError } = await this.supabase.supabase
          .from('employee_locations')
          .insert(employeeLocations);
        
        if (insertError) {
          throw new Error(`Failed to assign employee to locations: ${insertError.message}`);
        }
      }
  
      // Get the updated employee
      return this.findOne(id, tenantId);
    } catch (error) {
      throw new Error(`Failed to update employee locations: ${error.message}`);
    }
  }

  async remove(id: string, tenantId: string): Promise<void> {
    // Check if employee exists
    await this.findOne(id, tenantId);

    // Delete employee (cascade delete will handle employee_locations)
    const { error } = await this.supabase.supabase
      .from('employees')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete employee: ${error.message}`);
    }
  }

  async uploadImage(id: string, imageBuffer: Buffer, filename: string, tenantId: string): Promise<string> {
    // Check if employee exists
    await this.findOne(id, tenantId);

    // Upload image to Supabase Storage
    const contentType = filename.endsWith('.png') ? 'image/png' : 
                         filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' : 
                         filename.endsWith('.gif') ? 'image/gif' : 'application/octet-stream';
    
    const imageUrl = await this.supabase.uploadTenantFile(
      tenantId, 
      imageBuffer,
      `employees/${id}/${filename}`,
      contentType
    );

    if (!imageUrl) {
      throw new Error('Failed to upload employee image');
    }

    // Update employee record with image URL
    const { error } = await this.supabase.supabase
      .from('employees')
      .update({ image_url: imageUrl })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to update employee with image URL: ${error.message}`);
    }

    return imageUrl;
  }
}