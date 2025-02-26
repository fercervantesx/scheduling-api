/**
 * Supabase Migration Test Script
 * 
 * This script tests various aspects of the Supabase migration to ensure
 * everything is working correctly before fully switching from Prisma.
 * 
 * Run with: node test-supabase.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Create a Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in .env file');
  console.error('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test utility functions
const generateRandomId = () => crypto.randomUUID();
const generateRandomName = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// Testing colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.bright}${colors.blue}INFO:${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.bright}${colors.green}SUCCESS:${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.bright}${colors.red}ERROR:${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.bright}${colors.yellow}WARNING:${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.magenta}===== ${msg} =====${colors.reset}\n`),
  result: (test, passed, message = '') => {
    if (passed) {
      console.log(`${colors.green}✓ ${test}${colors.reset} ${message}`);
    } else {
      console.log(`${colors.red}✗ ${test}${colors.reset} ${message}`);
    }
  }
};

// Run all tests
async function runTests() {
  log.section('Starting Supabase Migration Tests');
  
  // Global state for created resources (to be cleaned up later)
  const testState = {
    tenantId: null,
    locationId: null,
    employeeId: null,
    serviceId: null,
    appointmentId: null
  };
  
  try {
    // Basic Connection Test
    await testConnection();
    
    // Create test tenant
    testState.tenantId = await testCreateTenant();
    
    // Test RLS with set_tenant_id function
    await testRowLevelSecurity(testState.tenantId);
    
    // Test CRUD operations on tenant resources
    await testResourceOperations(testState);
    
    // Test file uploads with storage
    await testFileUpload(testState.tenantId);
    
    // Test multi-tenant isolation
    await testMultiTenantIsolation(testState.tenantId);
    
    log.section('All Tests Completed');
  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    console.error(error);
  } finally {
    // Clean up resources
    await cleanupTestResources(testState);
  }
}

// Test 1: Basic connection test
async function testConnection() {
  log.section('Testing Supabase Connection');
  
  try {
    const { data, error } = await supabase.from('tenants').select('count');
    
    if (error) {
      throw new Error(`Connection failed: ${error.message}`);
    }
    
    log.result('Connection test', true);
    return true;
  } catch (error) {
    log.result('Connection test', false, error.message);
    throw error;
  }
}

// Test 2: Create a test tenant
async function testCreateTenant() {
  log.section('Testing Tenant Creation');
  
  const tenantName = generateRandomName('test-tenant');
  const tenantData = {
    name: tenantName,
    subdomain: tenantName.toLowerCase(),
    status: 'ACTIVE',
    plan: 'PRO',
    features: { 
      locations: true, 
      employees: true, 
      services: true,
      customBranding: true
    }
  };
  
  try {
    const { data, error } = await supabase
      .from('tenants')
      .insert(tenantData)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Tenant creation failed: ${error.message}`);
    }
    
    log.result('Tenant creation', true, `ID: ${data.id}`);
    log.info(`Created tenant: ${data.name} (${data.subdomain})`);
    
    return data.id;
  } catch (error) {
    log.result('Tenant creation', false, error.message);
    throw error;
  }
}

// Test 3: Row Level Security with set_tenant_id
async function testRowLevelSecurity(tenantId) {
  log.section('Testing Row Level Security');
  
  try {
    // First, try to set tenant context
    const { error: rpcError } = await supabase.rpc('set_tenant_id', { tenant_id: tenantId });
    
    if (rpcError) {
      throw new Error(`Failed to set tenant context: ${rpcError.message}`);
    }
    
    log.result('Set tenant context', true);
    
    // Test reading tenant data (should work with RLS since we set the context)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();
    
    if (tenantError) {
      throw new Error(`RLS tenant read failed: ${tenantError.message}`);
    }
    
    log.result('Read tenant data with RLS', true);
    
    // Create a test location to verify RLS write access
    const locationData = {
      tenant_id: tenantId,
      name: generateRandomName('test-location'),
      address: '123 Test Street'
    };
    
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .insert(locationData)
      .select()
      .single();
    
    if (locationError) {
      throw new Error(`RLS location creation failed: ${locationError.message}`);
    }
    
    log.result('Create location with RLS', true);
    
    // Test reading locations (should be filtered by tenant_id)
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('*');
    
    if (locationsError) {
      throw new Error(`RLS locations read failed: ${locationsError.message}`);
    }
    
    // Verify that all locations belong to our tenant
    const allBelongToTenant = locations.every(loc => loc.tenant_id === tenantId);
    
    log.result('RLS tenant isolation', allBelongToTenant, 
      `${locations.length} locations, all belonging to current tenant`);
    
    return true;
  } catch (error) {
    log.result('Row Level Security test', false, error.message);
    throw error;
  }
}

// Test 4: CRUD operations on various resources
async function testResourceOperations(testState) {
  log.section('Testing CRUD Operations');
  
  try {
    // Ensure tenant context is set
    await supabase.rpc('set_tenant_id', { tenant_id: testState.tenantId });
    
    // 1. Create a location
    const locationData = {
      tenant_id: testState.tenantId,
      name: generateRandomName('test-location'),
      address: '123 Test Street'
    };
    
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .insert(locationData)
      .select()
      .single();
    
    if (locationError) throw new Error(`Location creation failed: ${locationError.message}`);
    log.result('Create location', true, `ID: ${location.id}`);
    testState.locationId = location.id;
    
    // 2. Create an employee
    const employeeData = {
      tenant_id: testState.tenantId,
      name: generateRandomName('test-employee')
    };
    
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .insert(employeeData)
      .select()
      .single();
    
    if (employeeError) throw new Error(`Employee creation failed: ${employeeError.message}`);
    log.result('Create employee', true, `ID: ${employee.id}`);
    testState.employeeId = employee.id;
    
    // 3. Link employee to location
    const employeeLocationData = {
      employee_id: employee.id,
      location_id: location.id
    };
    
    const { error: linkError } = await supabase
      .from('employee_locations')
      .insert(employeeLocationData);
    
    if (linkError) throw new Error(`Employee-location link failed: ${linkError.message}`);
    log.result('Link employee to location', true);
    
    // 4. Create a service
    const serviceData = {
      tenant_id: testState.tenantId,
      name: generateRandomName('test-service'),
      duration: 60,
      price: 100.0
    };
    
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .insert(serviceData)
      .select()
      .single();
    
    if (serviceError) throw new Error(`Service creation failed: ${serviceError.message}`);
    log.result('Create service', true, `ID: ${service.id}`);
    testState.serviceId = service.id;
    
    // 5. Create a schedule
    const scheduleData = {
      tenant_id: testState.tenantId,
      employee_id: employee.id,
      location_id: location.id,
      start_time: '09:00',
      end_time: '17:00',
      weekday: 'MONDAY',
      block_type: 'WORKING_HOURS'
    };
    
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .insert(scheduleData)
      .select()
      .single();
    
    if (scheduleError) throw new Error(`Schedule creation failed: ${scheduleError.message}`);
    log.result('Create schedule', true, `ID: ${schedule.id}`);
    
    // 6. Create an appointment
    const appointmentData = {
      tenant_id: testState.tenantId,
      service_id: service.id,
      location_id: location.id,
      employee_id: employee.id,
      start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      status: 'SCHEDULED',
      booked_by: 'test@example.com',
      booked_by_name: 'Test User',
      user_id: 'auth0|test123'
    };
    
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single();
    
    if (appointmentError) throw new Error(`Appointment creation failed: ${appointmentError.message}`);
    log.result('Create appointment', true, `ID: ${appointment.id}`);
    testState.appointmentId = appointment.id;
    
    // 7. Read appointment with joins
    const { data: fullAppointment, error: readError } = await supabase
      .from('appointments')
      .select(`
        *,
        service:services(*),
        location:locations(*),
        employee:employees(*)
      `)
      .eq('id', appointment.id)
      .single();
    
    if (readError) throw new Error(`Reading appointment with joins failed: ${readError.message}`);
    log.result('Read appointment with joins', true);
    
    // 8. Update appointment
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'CONFIRMED' })
      .eq('id', appointment.id);
    
    if (updateError) throw new Error(`Updating appointment failed: ${updateError.message}`);
    log.result('Update appointment', true);
    
    return true;
  } catch (error) {
    log.result('CRUD Operations', false, error.message);
    throw error;
  }
}

// Test 5: File upload to Supabase Storage
async function testFileUpload(tenantId) {
  log.section('Testing File Upload');
  
  let testImagePath = null;
  
  try {
    // Ensure tenant context is set
    await supabase.rpc('set_tenant_id', { tenant_id: tenantId });
    
    // Create a temporary test image file
    testImagePath = path.join(__dirname, 'test-upload.png');
    const imageContent = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(testImagePath, imageContent);
    
    // Upload the file to Supabase storage
    const fileName = `${tenantId}/test-upload-${Date.now()}.png`;
    const { data, error } = await supabase.storage
      .from('tenant-uploads')
      .upload(fileName, fs.readFileSync(testImagePath), {
        contentType: 'image/png',
        upsert: true
      });
    
    if (error) throw new Error(`File upload failed: ${error.message}`);
    log.result('Upload file to storage', true, `Path: ${data.path}`);
    
    // Get public URL for the file
    const { data: { publicUrl } } = supabase.storage
      .from('tenant-uploads')
      .getPublicUrl(fileName);
    
    log.info(`File public URL: ${publicUrl}`);
    
    // Update tenant with the image URL
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        branding: { logo: publicUrl }
      })
      .eq('id', tenantId);
    
    if (updateError) throw new Error(`Updating tenant with logo failed: ${updateError.message}`);
    log.result('Update tenant with logo URL', true);
    
    // Read tenant to verify the update
    const { data: tenant, error: readError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();
    
    if (readError) throw new Error(`Reading tenant failed: ${readError.message}`);
    
    const hasLogo = tenant.branding && tenant.branding.logo === publicUrl;
    log.result('Verify tenant has logo URL', hasLogo);
    
    return true;
  } catch (error) {
    log.result('File Upload Test', false, error.message);
    throw error;
  } finally {
    // Clean up test image if it was created
    if (testImagePath && fs.existsSync(testImagePath)) {
      try {
        fs.unlinkSync(testImagePath);
      } catch (err) {
        console.error('Error removing test image:', err);
      }
    }
  }
}

// Test 6: Multi-tenant isolation
async function testMultiTenantIsolation(existingTenantId) {
  log.section('Testing Multi-Tenant Isolation');
  
  let tenant2Id = null;
  
  try {
    // Create a second test tenant
    const tenantName = generateRandomName('test-tenant-2');
    const tenantData = {
      name: tenantName,
      subdomain: tenantName.toLowerCase(),
      status: 'ACTIVE',
      plan: 'BASIC',
      features: { 
        locations: true, 
        employees: true, 
        services: true
      }
    };
    
    const { data: tenant2, error: tenant2Error } = await supabase
      .from('tenants')
      .insert(tenantData)
      .select()
      .single();
    
    if (tenant2Error) throw new Error(`Second tenant creation failed: ${tenant2Error.message}`);
    log.result('Create second tenant', true, `ID: ${tenant2.id}`);
    tenant2Id = tenant2.id;
    
    // Set context to second tenant for creating its location
    await supabase.rpc('set_tenant_id', { tenant_id: tenant2.id });
    
    // Create a location for the second tenant
    const locationData = {
      tenant_id: tenant2.id,
      name: generateRandomName('test-location-2'),
      address: '456 Test Avenue'
    };
    
    const { data: location2, error: location2Error } = await supabase
      .from('locations')
      .insert(locationData)
      .select()
      .single();
    
    if (location2Error) throw new Error(`Second location creation failed: ${location2Error.message}`);
    log.result('Create location for second tenant', true);
    
    // Set context to first tenant
    await supabase.rpc('set_tenant_id', { tenant_id: existingTenantId });
    
    // Try to read location from second tenant (should be filtered out by RLS)
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('*');
    
    if (locationsError) throw new Error(`Reading locations failed: ${locationsError.message}`);
    
    // Verify the second tenant's location is not included
    console.log('DEBUG - Locations found:', locations.map(l => ({ id: l.id, tenant_id: l.tenant_id, name: l.name })))
    const secondTenantLocationFound = locations.some(loc => loc.tenant_id === tenant2.id);
    
    if (secondTenantLocationFound) {
      throw new Error('Tenant isolation failed: found location from second tenant');
    }
    
    log.result('Tenant isolation test', !secondTenantLocationFound);
    
    return true;
  } catch (error) {
    log.result('Multi-Tenant Isolation Test', false, error.message);
    throw error;
  } finally {
    // Clean up the second tenant
    if (tenant2Id) {
      try {
        const { error: cleanupError } = await supabase
          .from('tenants')
          .delete()
          .eq('id', tenant2Id);
        
        if (cleanupError) log.warn(`Failed to clean up second tenant: ${cleanupError.message}`);
      } catch (err) {
        log.warn(`Error during second tenant cleanup: ${err.message}`);
      }
    }
  }
}

// Utility function to clean up test resources
async function cleanupTestResources(testState) {
  log.section('Cleaning Up Test Resources');
  
  try {
    
    if (testState.tenantId) {
      // Delete the test tenant (cascade delete should handle all child resources)
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', testState.tenantId);
      
      if (error) {
        log.warn(`Failed to clean up test tenant: ${error.message}`);
      } else {
        log.info('Cleaned up test tenant and all associated resources');
      }
    }
  } catch (error) {
    log.warn(`Cleanup error: ${error.message}`);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});