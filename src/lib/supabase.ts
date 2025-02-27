import { createClient } from '@supabase/supabase-js';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Request } from 'express';
import { Database } from '../types/supabase';

// Create a single supabase client for the entire app
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env variables.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Function to set tenant ID in request context for RLS policy enforcement
export const setTenantContext = async (tenantId: string) => {
  return supabase.rpc('set_tenant_id', { tenant_id: tenantId });
};

// Function to create a client scoped to a specific tenant
export const getTenantScopedClient = async (tenantId: string) => {
  const { data, error } = await supabase.auth.setSession({
    access_token: '',
    refresh_token: '',
  });
  
  // Set tenant ID in PostgreSQL session - this will make RLS work
  if (!error && data?.session) {
    await setTenantContext(tenantId);
  }
  
  return supabase;
};

// Helper type for query responses
export type QueryResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

// Helper to extract tenant from hostname, headers, or query parameters
export const extractTenantFromRequest = async (req: Request): Promise<any> => {
  try {
    // First check for query parameter tenant_id (highest priority)
    const queryTenantId = req.query.tenant_id as string;
    
    if (queryTenantId) {
      // Try to find tenant by ID first if it looks like a UUID
      if (queryTenantId.includes('-')) {
        const { data: tenantById, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', queryTenantId)
          .single();
        
        if (!error && tenantById) {
          return tenantById;
        }
      }
      
      // If not found by ID or not a UUID format, try by subdomain
      const { data: tenantBySubdomain, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('subdomain', queryTenantId)
        .single();
      
      if (!error && tenantBySubdomain) {
        return tenantBySubdomain;
      }
    }
    
    // Next check for X-Tenant-ID header for mobile app support
    const tenantId = req.headers['x-tenant-id'] as string;
    if (tenantId) {
      // First check if the header contains a UUID
      if (tenantId.includes('-')) {
        const { data: tenantById, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantId)
          .single();
        
        if (!error && tenantById) {
          return tenantById;
        }
      }
      
      // Then try to find by subdomain
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('subdomain', tenantId)
        .single();
      
      if (!error && tenant) {
        return tenant;
      }
    }
    
    // Fall back to hostname-based resolution
    const hostname = req.hostname;
    
    // Extract subdomain from the hostname
    let subdomain = null;
    const parts = hostname.split('.');
    
    // Handle the "subdomain.localhost" case for development
    if (parts.length > 1) {
      // Remove any port part from the hostname (localhost:5173 -> localhost)
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].includes(':')) {
          parts[i] = parts[i].split(':')[0];
        }
      }
      
      if (parts[parts.length-1] === 'localhost' || parts[parts.length-1] === '127.0.0.1') {
        // In development with localhost, use the first part as subdomain
        subdomain = parts[0];
      } else if (parts[0] !== 'www' && parts[0] !== 'admin') {
        // Normal domain case
        subdomain = parts[0];
      }
    }
    
    // Handle custom domains and subdomains
    if (subdomain) {
      // Try to find by subdomain first
      const { data: tenantBySubdomain, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('subdomain', subdomain)
        .single();
      
      if (!error && tenantBySubdomain) {
        return tenantBySubdomain;
      }
    }
    
    // If not found by subdomain, try custom domain
    const { data: tenantByDomain, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('custom_domain', hostname)
      .single();
    
    if (!error && tenantByDomain) {
      return tenantByDomain;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting tenant:', error);
    return null;
  }
};

// File upload helpers - using Supabase Storage
export const uploadTenantFile = async (
  tenantId: string, 
  fileBuffer: Buffer, 
  filename: string,
  contentType: string
): Promise<string | null> => {
  try {
    // Format path with tenant ID for isolation (uses RLS policies)
    const filePath = `${tenantId}/${filename}`;
    
    const { error } = await supabase.storage
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
    const { data: { publicUrl } } = supabase.storage
      .from('tenant-uploads')
      .getPublicUrl(filePath);
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
};

export const deleteTenantFile = async (tenantId: string, filePath: string): Promise<boolean> => {
  try {
    // Ensure path starts with tenant ID for isolation
    const pathParts = filePath.split('/');
    const path = pathParts[0] === tenantId 
      ? filePath 
      : `${tenantId}/${pathParts[pathParts.length - 1]}`;
    
    const { error } = await supabase.storage
      .from('tenant-uploads')
      .remove([path]);
    
    return !error;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};