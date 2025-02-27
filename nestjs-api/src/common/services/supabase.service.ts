import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private _supabase: SupabaseClient;
  
  constructor(private configService: ConfigService) {}
  
  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env variables.');
    }
    
    this._supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  get supabase(): SupabaseClient {
    return this._supabase;
  }
  
  // Function to set tenant ID in request context for RLS policy enforcement
  async setTenantContext(tenantId: string) {
    return this._supabase.rpc('set_tenant_id', { tenant_id: tenantId });
  }
  
  // Function to create a client scoped to a specific tenant
  getTenantScopedClient(tenantId: string) {
    // Set tenant ID in PostgreSQL session - this will make RLS work
    this.setTenantContext(tenantId);
    return this._supabase;
  }
  
  // File upload helpers - using Supabase Storage
  async uploadTenantFile(
    tenantId: string, 
    fileBuffer: Buffer, 
    filename: string,
    contentType: string
  ): Promise<string | null> {
    try {
      // Format path with tenant ID for isolation (uses RLS policies)
      const filePath = `${tenantId}/${filename}`;
      
      const { data, error } = await this._supabase.storage
        .from('tenant-uploads')
        .upload(filePath, fileBuffer, {
          contentType,
          upsert: true
        });
      
      if (error) {
        console.error('Error uploading file:', error);
        return null;
      }
      
      // Get public URL for the file
      const { data: { publicUrl } } = this._supabase.storage
        .from('tenant-uploads')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  }
  
  async deleteTenantFile(tenantId: string, filePath: string): Promise<boolean> {
    try {
      // Ensure path starts with tenant ID for isolation
      const pathParts = filePath.split('/');
      const path = pathParts[0] === tenantId 
        ? filePath 
        : `${tenantId}/${pathParts[pathParts.length - 1]}`;
      
      const { error } = await this._supabase.storage
        .from('tenant-uploads')
        .remove([path]);
      
      return !error;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }
}