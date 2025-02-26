/**
 * This is a simplified test just to check tenant isolation
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in .env file');
  console.error('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTenantIsolation() {
  console.log('===== TESTING TENANT ISOLATION =====');
  
  let tenant1Id = null;
  let tenant2Id = null;
  let location1Id = null;
  let location2Id = null;
  
  try {
    // Create first tenant
    const { data: tenant1, error: tenant1Error } = await supabase
      .from('tenants')
      .insert({
        name: 'Test Tenant 1',
        subdomain: 'test1',
        status: 'ACTIVE',
        plan: 'PRO',
        features: { locations: true }
      })
      .select()
      .single();
    
    if (tenant1Error) throw new Error(`Failed to create tenant 1: ${tenant1Error.message}`);
    tenant1Id = tenant1.id;
    console.log(`Created tenant 1: ${tenant1.name} (${tenant1.id})`);
    
    // Set tenant 1 context
    await supabase.rpc('set_tenant_id', { tenant_id: tenant1.id });
    console.log('Set context to tenant 1');
    
    // Create location for tenant 1
    const { data: location1, error: location1Error } = await supabase
      .from('locations')
      .insert({
        tenant_id: tenant1.id,
        name: 'Location 1',
        address: '123 Test St'
      })
      .select()
      .single();
    
    if (location1Error) throw new Error(`Failed to create location 1: ${location1Error.message}`);
    location1Id = location1.id;
    console.log(`Created location for tenant 1: ${location1.name} (${location1.id})`);
    
    // Read locations for tenant 1
    const { data: locations1, error: locations1Error } = await supabase
      .from('locations')
      .select('*');
    
    if (locations1Error) throw new Error(`Failed to read locations 1: ${locations1Error.message}`);
    console.log(`Tenant 1 sees ${locations1.length} locations:`, locations1.map(l => l.name));
    
    // Create second tenant
    const { data: tenant2, error: tenant2Error } = await supabase
      .from('tenants')
      .insert({
        name: 'Test Tenant 2',
        subdomain: 'test2',
        status: 'ACTIVE',
        plan: 'PRO',
        features: { locations: true }
      })
      .select()
      .single();
    
    if (tenant2Error) throw new Error(`Failed to create tenant 2: ${tenant2Error.message}`);
    tenant2Id = tenant2.id;
    console.log(`Created tenant 2: ${tenant2.name} (${tenant2.id})`);
    
    // Set tenant 2 context
    await supabase.rpc('set_tenant_id', { tenant_id: tenant2.id });
    console.log('Set context to tenant 2');
    
    // Create location for tenant 2
    const { data: location2, error: location2Error } = await supabase
      .from('locations')
      .insert({
        tenant_id: tenant2.id,
        name: 'Location 2',
        address: '456 Test Ave'
      })
      .select()
      .single();
    
    if (location2Error) throw new Error(`Failed to create location 2: ${location2Error.message}`);
    location2Id = location2.id;
    console.log(`Created location for tenant 2: ${location2.name} (${location2.id})`);
    
    // Read locations for tenant 2
    const { data: locations2, error: locations2Error } = await supabase
      .from('locations')
      .select('*');
    
    if (locations2Error) throw new Error(`Failed to read locations 2: ${locations2Error.message}`);
    console.log(`Tenant 2 sees ${locations2.length} locations:`, locations2.map(l => l.name));
    
    // Set back to tenant 1
    await supabase.rpc('set_tenant_id', { tenant_id: tenant1.id });
    console.log('Set context back to tenant 1');
    
    // Check if tenant 1 can see tenant 2's data
    const { data: locationsCheck, error: locationsCheckError } = await supabase
      .from('locations')
      .select('*');
    
    if (locationsCheckError) throw new Error(`Failed to read locations: ${locationsCheckError.message}`);
    
    console.log(`Tenant 1 sees ${locationsCheck.length} locations:`, locationsCheck.map(l => ({id: l.id, name: l.name})));
    
    // Verify tenant isolation
    const leakFound = locationsCheck.some(loc => loc.tenant_id === tenant2Id);
    if (leakFound) {
      console.error('❌ ISOLATION FAILED: Tenant 1 can see Tenant 2 data');
    } else {
      console.log('✅ ISOLATION SUCCESS: Tenant 1 cannot see Tenant 2 data');
    }
    
  } catch (error) {
    console.error('TEST FAILED:', error);
  } finally {
    console.log('\nCleaning up...');
    
    // Clean up resources
    if (location1Id) {
      await supabase.from('locations').delete().eq('id', location1Id);
      console.log('Deleted location 1');
    }
    
    if (location2Id) {
      await supabase.from('locations').delete().eq('id', location2Id);
      console.log('Deleted location 2');
    }
    
    if (tenant1Id) {
      await supabase.from('tenants').delete().eq('id', tenant1Id);
      console.log('Deleted tenant 1');
    }
    
    if (tenant2Id) {
      await supabase.from('tenants').delete().eq('id', tenant2Id);
      console.log('Deleted tenant 2');
    }
  }
}

testTenantIsolation();